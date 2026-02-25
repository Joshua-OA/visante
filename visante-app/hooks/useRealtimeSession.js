import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  pcmToWav,
  concatArrayBuffers,
} from '../utils/pcmUtils';
import { RealtimeApiClient } from '../services/realtimeApi';

/**
 * Session states:
 *   'idle'        — not started
 *   'connecting'  — WebSocket connecting + session configuring
 *   'listening'   — mic active, server VAD listening
 *   'ai_speaking' — AI audio response is playing back
 *   'complete'    — triage_complete tool fired, session done
 *   'error'       — unrecoverable failure
 */

const CHUNK_INTERVAL_MS = 250; // How often we flush mic audio to the API (ms)
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10-minute safety cutoff

/** iOS recording options: raw PCM16 mono at 24kHz — exactly what the API needs */
const IOS_PCM_OPTIONS = {
  isMeteringEnabled: false,
  android: {
    // Android cannot produce raw PCM via expo-av. Voice mode silently skips
    // audio sending. The text-input fallback is the production path on Android
    // until a native PCM module (react-native-audio-record) is added.
    extension: '.m4a',
    outputFormat: 2,    // MPEG_4
    audioEncoder: 3,    // AAC
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.caf',
    outputFormat: 'lpcm',         // Linear PCM — raw samples, no encoding
    audioQuality: 96,             // High
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 384000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

/**
 * useRealtimeSession
 *
 * Orchestrates a full OpenAI Realtime API triage session:
 *   - Requests mic permission
 *   - Manages the WebSocket connection via RealtimeApiClient
 *   - Records audio in 250ms segments, sends raw PCM16 to the API
 *   - Plays back AI audio responses (PCM delta chunks → WAV → expo-av Sound)
 *   - Accumulates a live transcript
 *   - Calls onTriageComplete(summary) when the AI fires the complete_triage tool
 *
 * @param {{ onTriageComplete: (summary: object) => void }} options
 */
export function useRealtimeSession({ onTriageComplete }) {
  const [sessionState, setSessionState]   = useState('idle');
  const [error, setError]                 = useState(null);
  const [transcriptLines, setTranscript]  = useState([]);
  const [permissionDenied, setPermDenied] = useState(false);

  const clientRef        = useRef(null);
  const recordingRef     = useRef(null);
  const chunkTimerRef    = useRef(null);
  const audioDeltaBuf    = useRef([]);   // ArrayBuffer[] — AI response chunks
  const currentSoundRef  = useRef(null);
  const sessionTimeoutRef= useRef(null);
  const sessionStateRef  = useRef('idle'); // mirror for use inside closures

  // Keep the ref in sync with state
  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  // ── Audio mode ────────────────────────────────────────────────────────────

  const setupAudioMode = useCallback(async () => {
    console.log('[useRealtimeSession] setupAudioMode: setting audio mode');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    console.log('[useRealtimeSession] setupAudioMode: done');
  }, []);

  // ── Mic recording — 250ms segment loop ───────────────────────────────────

  const startMicSegment = useCallback(async () => {
    console.log('[useRealtimeSession] startMicSegment: preparing new recording');
    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(IOS_PCM_OPTIONS);
      await rec.startAsync();
      recordingRef.current = rec;
      console.log('[useRealtimeSession] startMicSegment: recording started');
    } catch (e) {
      console.warn('[useRealtimeSession] startMicSegment error:', e);
    }
  }, []);

  const flushAndSendSegment = useCallback(async () => {
    if (!recordingRef.current || !clientRef.current) {
      console.log('[useRealtimeSession] flushAndSendSegment: skipped (no recording or client)');
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      console.log('[useRealtimeSession] flushAndSendSegment: stopped segment, uri =', uri);

      if (!uri) {
        console.warn('[useRealtimeSession] flushAndSendSegment: no URI — restarting mic');
        await startMicSegment();
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      console.log('[useRealtimeSession] flushAndSendSegment: read base64, length =', base64?.length);
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      // Android: expo-av records AAC, not raw PCM — skip sending audio
      if (Platform.OS !== 'android' && base64) {
        console.log('[useRealtimeSession] flushAndSendSegment: sending audio chunk to API');
        clientRef.current.sendAudioChunk(base64);
      } else if (Platform.OS === 'android') {
        console.log('[useRealtimeSession] flushAndSendSegment: Android — skipping audio send (not raw PCM)');
      }
    } catch (e) {
      console.warn('[useRealtimeSession] flushAndSendSegment error:', e);
    }

    // Start the next 250ms segment
    await startMicSegment();
  }, [startMicSegment]);

  const scheduleChunk = useCallback(() => {
    chunkTimerRef.current = setTimeout(async () => {
      await flushAndSendSegment();
      if (clientRef.current) scheduleChunk();
    }, CHUNK_INTERVAL_MS);
  }, [flushAndSendSegment]);

  const stopMicRecording = useCallback(async () => {
    console.log('[useRealtimeSession] stopMicRecording: stopping mic and clearing timer');
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        console.log('[useRealtimeSession] stopMicRecording: done');
      } catch (e) {
        console.warn('[useRealtimeSession] stopMicRecording error:', e);
      }
    }
  }, []);

  const startMicRecording = useCallback(async () => {
    console.log('[useRealtimeSession] startMicRecording: beginning segment loop');
    await startMicSegment();
    scheduleChunk();
  }, [startMicSegment, scheduleChunk]);

  // ── AI audio playback ─────────────────────────────────────────────────────

  const onAudioDelta = useCallback((base64Chunk) => {
    console.log('[useRealtimeSession] onAudioDelta: buffering chunk, total chunks =', audioDeltaBuf.current.length + 1);
    audioDeltaBuf.current.push(base64ToArrayBuffer(base64Chunk));
  }, []);

  const onAudioSegmentDone = useCallback(async () => {
    const chunkCount = audioDeltaBuf.current.length;
    console.log('[useRealtimeSession] onAudioSegmentDone: chunk count =', chunkCount);
    if (chunkCount === 0) {
      console.warn('[useRealtimeSession] onAudioSegmentDone: no chunks to play, skipping');
      return;
    }

    const pcmBuffer = concatArrayBuffers(audioDeltaBuf.current);
    audioDeltaBuf.current = [];
    console.log('[useRealtimeSession] onAudioSegmentDone: PCM buffer size =', pcmBuffer.byteLength);

    try {
      const wavBuffer = pcmToWav(pcmBuffer, 24000, 1);
      const wavBase64 = arrayBufferToBase64(wavBuffer);
      const fileUri = `${FileSystem.cacheDirectory}visante_ai_${Date.now()}.wav`;
      console.log('[useRealtimeSession] onAudioSegmentDone: writing WAV to', fileUri);

      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: 'base64',
      });

      console.log('[useRealtimeSession] onAudioSegmentDone: WAV written, creating Sound');
      setSessionState('ai_speaking');

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            console.log('[useRealtimeSession] Sound: playback finished, unloading');
            sound.unloadAsync().catch(() => {});
            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
            if (currentSoundRef.current === sound) {
              currentSoundRef.current = null;
            }
            if (sessionStateRef.current === 'ai_speaking') {
              console.log('[useRealtimeSession] Sound: returning to listening state');
              setSessionState('listening');
            }
          }
        }
      );
      currentSoundRef.current = sound;
      console.log('[useRealtimeSession] onAudioSegmentDone: playback started');
    } catch (e) {
      console.warn('[useRealtimeSession] playback error:', e);
      if (sessionStateRef.current === 'ai_speaking') {
        setSessionState('listening');
      }
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    console.log('[useRealtimeSession] stopPlayback: stopping any active playback');
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        console.log('[useRealtimeSession] stopPlayback: sound unloaded');
      } catch (e) {
        console.warn('[useRealtimeSession] stopPlayback error:', e);
      }
      currentSoundRef.current = null;
    }
    audioDeltaBuf.current = [];
  }, []);

  // ── Session teardown helper ───────────────────────────────────────────────

  const teardown = useCallback(async () => {
    console.log('[useRealtimeSession] teardown: starting');
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    await stopMicRecording();
    await stopPlayback();
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      console.log('[useRealtimeSession] teardown: client disconnected');
    }
    console.log('[useRealtimeSession] teardown: complete');
  }, [stopMicRecording, stopPlayback]);

  // ── Start session ─────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    const current = sessionStateRef.current;
    console.log('[useRealtimeSession] startSession: current state =', current);
    if (current !== 'idle' && current !== 'error') {
      console.log('[useRealtimeSession] startSession: blocked — not idle/error, returning');
      return;
    }

    setError(null);
    setTranscript([]);
    setPermDenied(false);

    // 1. Microphone permission
    console.log('[useRealtimeSession] startSession: requesting mic permission');
    const { status } = await Audio.requestPermissionsAsync();
    console.log('[useRealtimeSession] startSession: mic permission status =', status);
    if (status !== 'granted') {
      setPermDenied(true);
      setError('Microphone access is required. Please enable it in Settings.');
      return;
    }

    // 2. Audio mode
    await setupAudioMode();

    // 3. Create client and wire events
    console.log('[useRealtimeSession] startSession: creating RealtimeApiClient, state → connecting');
    setSessionState('connecting');

    const client = new RealtimeApiClient();
    clientRef.current = client;

    client.on('session_ready', async () => {
      console.log('[useRealtimeSession] event: session_ready — state → listening, starting mic');
      setSessionState('listening');
      await startMicRecording();
    });

    client.on('audio_delta', onAudioDelta);
    client.on('audio_segment_done', onAudioSegmentDone);

    client.on('transcript', ({ role, text }) => {
      console.log('[useRealtimeSession] event: transcript role =', role, 'text =', text);
      if (text.trim()) {
        setTranscript((prev) => [...prev, { role, text }]);
      }
    });

    client.on('text_delta', (delta) => {
      console.log('[useRealtimeSession] event: text_delta =', delta);
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'ai') {
          return [...prev.slice(0, -1), { role: 'ai', text: last.text + delta }];
        }
        return [...prev, { role: 'ai', text: delta }];
      });
    });

    client.on('triage_complete', async (summary) => {
      console.log('[useRealtimeSession] event: triage_complete', summary);
      setSessionState('complete');
      await teardown();
      onTriageComplete?.(summary);
    });

    client.on('error', async ({ code, message }) => {
      console.error('[useRealtimeSession] event: error code =', code, 'message =', message);
      setError(message);
      setSessionState('error');
      await teardown();
    });

    client.on('close', async ({ code, reason }) => {
      console.log('[useRealtimeSession] event: close code =', code, 'reason =', reason);
      if (sessionStateRef.current !== 'complete') {
        const msg = code === 1000
          ? 'Session ended.'
          : `Connection lost (${code}). Please check your network and try again.`;
        setError(msg);
        setSessionState('error');
        await teardown();
      }
    });

    // 4. Connect
    console.log('[useRealtimeSession] startSession: calling client.connect()');
    try {
      await client.connect();
      console.log('[useRealtimeSession] startSession: client.connect() resolved');
    } catch (e) {
      console.error('[useRealtimeSession] startSession: connect failed —', e.message);
      setError(e.message ?? 'Failed to connect to Visante AI.');
      setSessionState('error');
      clientRef.current = null;
      return;
    }

    // 5. Safety session timeout (10 min)
    console.log('[useRealtimeSession] startSession: session timeout set for', SESSION_TIMEOUT_MS, 'ms');
    sessionTimeoutRef.current = setTimeout(async () => {
      console.warn('[useRealtimeSession] Session timeout — ending session');
      await endSession();
    }, SESSION_TIMEOUT_MS);
  }, [
    setupAudioMode,
    startMicRecording,
    onAudioDelta,
    onAudioSegmentDone,
    teardown,
    onTriageComplete,
  ]);

  // ── End session (user-initiated) ──────────────────────────────────────────

  const endSession = useCallback(async () => {
    console.log('[useRealtimeSession] endSession: tearing down session');
    await teardown();
    setSessionState('idle');
    setError(null);
    console.log('[useRealtimeSession] endSession: state → idle');
  }, [teardown]);

  // ── Background / foreground handling ─────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (
        (nextState === 'background' || nextState === 'inactive') &&
        (sessionStateRef.current === 'listening' ||
         sessionStateRef.current === 'ai_speaking' ||
         sessionStateRef.current === 'connecting')
      ) {
        await endSession();
      }
    });
    return () => sub.remove();
  }, [endSession]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      teardown();
    };
  }, []);

  return {
    sessionState,
    error,
    transcriptLines,
    permissionDenied,
    startSession,
    endSession,
  };
}
