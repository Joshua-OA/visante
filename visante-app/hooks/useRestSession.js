import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { audioChat, transcribeAudio } from '../services/restApi';
import { TRIAGE_SYSTEM_PROMPT, TRIAGE_COMPLETE_TOOL } from '../utils/triagePrompt';
import {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  pcmToWav,
} from '../utils/pcmUtils';

/**
 * Session states (same as useRealtimeSession):
 *   'idle'        — not started
 *   'connecting'  — initial greeting loading
 *   'listening'   — waiting for user to tap mic
 *   'recording'   — mic is active, user is speaking
 *   'processing'  — API call in flight
 *   'ai_speaking' — playing AI audio response
 *   'complete'    — triage done
 *   'error'       — failure
 */

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const TTS_VOICE = 'alloy';

// Extend the system prompt to handle Twi
const SYSTEM_PROMPT = TRIAGE_SYSTEM_PROMPT + `\n
LANGUAGE
- If the patient speaks Twi (or any Akan language), respond in Twi.
- If the patient speaks English, respond in English.
- Match the language the patient uses.`;

// Record raw PCM, then wrap with WAV header before sending to the API
const RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: 2,      // MPEG_4 container — Whisper accepts m4a
    audioEncoder: 3,      // AAC
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.caf',
    outputFormat: 'lpcm',
    audioQuality: 96,
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 384000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export function useRestSession({ onTriageComplete }) {
  const [sessionState, setSessionState]  = useState('idle');
  const [error, setError]               = useState(null);
  const [transcriptLines, setTranscript] = useState([]);
  const [permissionDenied, setPermDenied] = useState(false);
  const [isRecording, setIsRecording]    = useState(false);

  const recordingRef       = useRef(null);
  const currentSoundRef    = useRef(null);
  const sessionTimeoutRef  = useRef(null);
  const sessionStateRef    = useRef('idle');
  const conversationRef    = useRef([]);   // Chat Completions messages
  const abortRef           = useRef(false);

  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(async () => {
    console.log('[useRestSession] cleanup: starting');
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      } catch (_) {}
    }
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch (_) {}
      currentSoundRef.current = null;
    }
    setIsRecording(false);
    console.log('[useRestSession] cleanup: done');
  }, []);

  /** Play base64 WAV audio data and wait for playback to finish. */
  const playAudio = useCallback(async (base64Wav) => {
    console.log('[useRestSession] playAudio: starting, data length =', base64Wav?.length);

    // Switch audio mode for playback (iOS needs allowsRecordingIOS: false)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    console.log('[useRestSession] playAudio: audio mode set for playback');

    const fileUri = `${FileSystem.cacheDirectory}visante_ai_${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(fileUri, base64Wav, { encoding: 'base64' });
    console.log('[useRestSession] playAudio: WAV written to', fileUri);

    return new Promise(async (resolve) => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true },
          (status) => {
            if (status.didJustFinish) {
              console.log('[useRestSession] playAudio: playback finished');
              sound.unloadAsync().catch(() => {});
              FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
              if (currentSoundRef.current === sound) currentSoundRef.current = null;
              resolve();
            }
          }
        );
        currentSoundRef.current = sound;
        console.log('[useRestSession] playAudio: playback started');
      } catch (e) {
        console.warn('[useRestSession] playAudio error:', e);
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
        resolve(); // Don't block on playback failure
      }
    });
  }, []);

  // ── Start Session ─────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    const current = sessionStateRef.current;
    console.log('[useRestSession] startSession: current state =', current);
    if (current !== 'idle' && current !== 'error') {
      console.log('[useRestSession] startSession: blocked — not idle/error');
      return;
    }

    setError(null);
    setTranscript([]);
    setPermDenied(false);
    abortRef.current = false;

    // 1. Mic permission
    console.log('[useRestSession] startSession: requesting mic permission');
    const { status } = await Audio.requestPermissionsAsync();
    console.log('[useRestSession] startSession: mic permission =', status);
    if (status !== 'granted') {
      setPermDenied(true);
      setError('Microphone access is required. Please enable it in Settings.');
      return;
    }

    // 2. Get AI greeting
    setSessionState('connecting');
    conversationRef.current = [{ role: 'system', content: SYSTEM_PROMPT }];
    console.log('[useRestSession] startSession: fetching AI greeting...');

    try {
      const { audioBase64, transcript, toolCall } = await audioChat(
        conversationRef.current,
        [TRIAGE_COMPLETE_TOOL],
        TTS_VOICE,
      );
      console.log('[useRestSession] startSession: greeting received — audio:', !!audioBase64, 'transcript:', !!transcript, 'toolCall:', !!toolCall);

      if (abortRef.current) {
        console.log('[useRestSession] startSession: aborted after greeting');
        return;
      }

      // Add AI response to conversation
      if (transcript) {
        conversationRef.current.push({ role: 'assistant', content: transcript });
        console.log('[useRestSession] startSession: greeting transcript:', transcript.substring(0, 100));
      }

      // Play greeting audio
      if (audioBase64) {
        console.log('[useRestSession] startSession: playing greeting audio');
        setSessionState('ai_speaking');
        await playAudio(audioBase64);
        console.log('[useRestSession] startSession: greeting audio finished');
      }

      if (abortRef.current) return;
      console.log('[useRestSession] startSession: → listening');
      setSessionState('listening');

      // Safety timeout
      sessionTimeoutRef.current = setTimeout(async () => {
        console.warn('[useRestSession] Session timeout');
        await endSession();
      }, SESSION_TIMEOUT_MS);
    } catch (e) {
      console.error('[useRestSession] startSession error:', e);
      if (!abortRef.current) {
        setError(e.message ?? 'Failed to start session.');
        setSessionState('error');
      }
    }
  }, [playAudio]);

  // ── Recording toggle ──────────────────────────────────────────────────────

  const toggleRecording = useCallback(async () => {
    console.log('[useRestSession] toggleRecording: isRecording =', isRecording, 'sessionState =', sessionStateRef.current);

    if (isRecording) {
      // ── Stop recording & process ──
      console.log('[useRestSession] toggleRecording: STOPPING recording');
      setIsRecording(false);

      if (!recordingRef.current) {
        console.warn('[useRestSession] toggleRecording: no recordingRef — bailing');
        return;
      }

      setSessionState('processing');

      try {
        console.log('[useRestSession] toggleRecording: stopping recorder...');
        await recordingRef.current.stopAndUnloadAsync();
        const fileUri = recordingRef.current.getURI();
        recordingRef.current = null;
        console.log('[useRestSession] toggleRecording: recording stopped, fileUri =', fileUri);

        if (!fileUri) throw new Error('Recording failed — no file produced.');

        if (abortRef.current) {
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          console.log('[useRestSession] toggleRecording: aborted after recording');
          return;
        }

        // Build user message — Android uses Whisper transcription, iOS sends WAV audio
        let userMessage;
        if (Platform.OS === 'android') {
          // Android records AAC — transcribe with Whisper, then send as text
          console.log('[useRestSession] toggleRecording: Android — transcribing with Whisper...');
          const transcript = await transcribeAudio(fileUri, 'm4a');
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          console.log('[useRestSession] toggleRecording: Whisper transcript =', transcript?.substring(0, 100));

          if (!transcript || !transcript.trim()) {
            console.warn('[useRestSession] toggleRecording: empty transcript — back to listening');
            setSessionState('listening');
            return;
          }
          userMessage = { role: 'user', content: transcript };
        } else {
          // iOS records raw PCM in .caf — wrap in WAV header for input_audio
          console.log('[useRestSession] toggleRecording: iOS — reading file as base64...');
          const rawBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          console.log('[useRestSession] toggleRecording: raw base64 length =', rawBase64?.length);

          if (!rawBase64) {
            console.warn('[useRestSession] toggleRecording: empty file — back to listening');
            setSessionState('listening');
            return;
          }

          const pcmBuf = base64ToArrayBuffer(rawBase64);
          console.log('[useRestSession] toggleRecording: iOS PCM size =', pcmBuf.byteLength);
          const wav = pcmToWav(pcmBuf, 24000, 1);
          const wavBase64 = arrayBufferToBase64(wav);
          console.log('[useRestSession] toggleRecording: WAV base64 length =', wavBase64?.length);

          userMessage = {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: { data: wavBase64, format: 'wav' },
              },
            ],
          };
        }
        conversationRef.current.push(userMessage);
        console.log('[useRestSession] toggleRecording: conversation length =', conversationRef.current.length);

        // Single API call — audio in, audio out
        console.log('[useRestSession] toggleRecording: calling audioChat...');
        const { audioBase64: responseAudio, transcript, toolCall } = await audioChat(
          conversationRef.current,
          [TRIAGE_COMPLETE_TOOL],
          TTS_VOICE,
        );
        console.log('[useRestSession] toggleRecording: API response — audio:', !!responseAudio, 'transcript:', !!transcript, 'toolCall:', !!toolCall);

        if (abortRef.current) {
          console.log('[useRestSession] toggleRecording: aborted after API call');
          return;
        }

        // Handle tool call (triage complete)
        if (toolCall && toolCall.name === 'complete_triage') {
          console.log('[useRestSession] toggleRecording: TRIAGE COMPLETE');
          let args;
          try {
            args = JSON.parse(toolCall.arguments);
          } catch (_) {
            throw new Error('Could not parse triage summary from AI.');
          }
          console.log('[useRestSession] toggleRecording: triage args =', JSON.stringify(args).substring(0, 200));

          if (transcript) {
            conversationRef.current.push({ role: 'assistant', content: transcript });
          }

          if (responseAudio) {
            console.log('[useRestSession] toggleRecording: playing final audio before completing');
            setSessionState('ai_speaking');
            await playAudio(responseAudio);
          }

          setSessionState('complete');
          await cleanup();
          onTriageComplete?.(args);
          return;
        }

        // Normal response
        if (transcript) {
          console.log('[useRestSession] toggleRecording: AI transcript:', transcript.substring(0, 100));
          conversationRef.current.push({ role: 'assistant', content: transcript });
        }

        if (responseAudio && !abortRef.current) {
          console.log('[useRestSession] toggleRecording: playing AI response audio');
          setSessionState('ai_speaking');
          await playAudio(responseAudio);
          console.log('[useRestSession] toggleRecording: AI audio playback finished');
        } else {
          console.warn('[useRestSession] toggleRecording: NO audio in response!');
        }

        if (!abortRef.current) {
          console.log('[useRestSession] toggleRecording: → listening');
          setSessionState('listening');
        }
      } catch (e) {
        console.error('[useRestSession] toggleRecording: ERROR:', e);
        if (!abortRef.current) {
          setError(e.message ?? 'An error occurred.');
          setSessionState('error');
        }
      }
    } else if (sessionStateRef.current === 'listening') {
      // ── Start recording ──
      console.log('[useRestSession] toggleRecording: STARTING recording');
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('[useRestSession] toggleRecording: audio mode set for recording');

        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(RECORDING_OPTIONS);
        await rec.startAsync();
        recordingRef.current = rec;
        setIsRecording(true);
        setSessionState('recording');
        console.log('[useRestSession] toggleRecording: recording started successfully');
      } catch (e) {
        console.error('[useRestSession] toggleRecording: start recording error:', e);
        setError('Failed to start recording.');
        setSessionState('error');
      }
    } else {
      console.warn('[useRestSession] toggleRecording: ignored — state is', sessionStateRef.current);
    }
  }, [isRecording, playAudio, cleanup, onTriageComplete]);

  // ── End Session ───────────────────────────────────────────────────────────

  const endSession = useCallback(async () => {
    console.log('[useRestSession] endSession: tearing down');
    abortRef.current = true;
    await cleanup();
    setSessionState('idle');
    setError(null);
    console.log('[useRestSession] endSession: → idle');
  }, [cleanup]);

  // ── Background / unmount handling ─────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      console.log('[useRestSession] AppState changed to:', nextState, 'session:', sessionStateRef.current);
      if (
        (nextState === 'background' || nextState === 'inactive') &&
        ['listening', 'recording', 'ai_speaking', 'connecting', 'processing'].includes(
          sessionStateRef.current,
        )
      ) {
        await endSession();
      }
    });
    return () => sub.remove();
  }, [endSession]);

  useEffect(() => {
    return () => { cleanup(); };
  }, []);

  return {
    sessionState,
    error,
    transcriptLines,
    permissionDenied,
    startSession,
    endSession,
    toggleRecording,
    isRecording,
  };
}
