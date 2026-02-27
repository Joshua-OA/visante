import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { audioChat, audioProxyChat, transcribeTwiAudio } from '../services/restApi';
import Constants from 'expo-constants';
import { buildTriageSystemPrompt, TRIAGE_COMPLETE_TOOL, SAVE_USER_PROFILE_TOOL } from '../utils/triagePrompt';
import { saveUserProfile } from '../services/firestoreService';
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

// Silence detection config
const SILENCE_THRESHOLD_DB = -40;       // dB below which we consider "silence"
const SILENCE_DURATION_MS = 1500;       // how long silence must last to auto-stop
const METERING_INTERVAL_MS = 250;       // how often we check audio level
const MIN_RECORDING_MS = 500;           // minimum recording length before silence detection kicks in

const LANGUAGE_ADDENDUM = `\n
LANGUAGE
- If the patient speaks Twi (or any Akan language), respond in Twi.
- If the patient speaks English, respond in English.
- Match the language the patient uses.`;

// Record raw PCM, then wrap with WAV header before sending to the API
const RECORDING_OPTIONS = {
  isMeteringEnabled: true,   // needed for silence detection
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

/**
 * @param {{ onTriageComplete: Function, language?: 'en'|'tw', userProfile?: object|null, phoneNumber?: string }} options
 *   language — 'en' (default) uses OpenAI Whisper for transcription.
 *              'tw' uses GhanaNLP ASR v2 for Twi transcription and
 *               instructs the AI to respond in Twi.
 *   userProfile — if set, AI greets by name and skips profile collection.
 *   phoneNumber — used to save user profile to Firestore.
 */
export function useRestSession({ onTriageComplete, language = 'en', userProfile = null, phoneNumber = null }) {
  const [sessionState, setSessionState] = useState('idle');
  const [error, setError] = useState(null);
  const [transcriptLines, setTranscript] = useState([]);
  const [permissionDenied, setPermDenied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const recordingRef = useRef(null);
  const currentSoundRef = useRef(null);
  const sessionTimeoutRef = useRef(null);
  const sessionStateRef = useRef('idle');
  const conversationRef = useRef([]);   // Chat Completions messages
  const toolsRef = useRef([TRIAGE_COMPLETE_TOOL]);
  const abortRef = useRef(false);

  // Silence detection refs
  const meteringRef = useRef(null);       // setInterval ID for polling metering
  const silenceStartRef = useRef(null);   // timestamp when silence started
  const recordingStartRef = useRef(null); // timestamp when recording started
  const autoProcessingRef = useRef(false); // guard to prevent double-processing

  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const stopSilenceDetection = useCallback(() => {
    if (meteringRef.current) {
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }
    silenceStartRef.current = null;
    recordingStartRef.current = null;
  }, []);

  const cleanup = useCallback(async () => {
    console.log('[useRestSession] cleanup: starting');
    stopSilenceDetection();
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => { });
      } catch (_) { }
    }
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch (_) { }
      currentSoundRef.current = null;
    }
    setIsRecording(false);
    autoProcessingRef.current = false;
    console.log('[useRestSession] cleanup: done');
  }, [stopSilenceDetection]);

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
              sound.unloadAsync().catch(() => { });
              FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => { });
              if (currentSoundRef.current === sound) currentSoundRef.current = null;
              resolve();
            }
          }
        );
        currentSoundRef.current = sound;
        console.log('[useRestSession] playAudio: playback started');
      } catch (e) {
        console.warn('[useRestSession] playAudio error:', e);
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => { });
        resolve(); // Don't block on playback failure
      }
    });
  }, []);

  // ── Auto-recording with silence detection ────────────────────────────────

  /** Start recording + silence detection. Called automatically after AI speaks. */
  const startAutoRecording = useCallback(async () => {
    if (abortRef.current) return;
    if (sessionStateRef.current !== 'listening') {
      console.log('[useRestSession] startAutoRecording: skipped — state is', sessionStateRef.current);
      return;
    }
    console.log('[useRestSession] startAutoRecording: starting mic...');
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(RECORDING_OPTIONS);
      await rec.startAsync();
      recordingRef.current = rec;
      recordingStartRef.current = Date.now();
      silenceStartRef.current = null;
      autoProcessingRef.current = false;
      setIsRecording(true);
      setSessionState('recording');
      console.log('[useRestSession] startAutoRecording: recording started');

      // Start polling metering for silence detection
      meteringRef.current = setInterval(async () => {
        if (!recordingRef.current || autoProcessingRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (!status.isRecording) return;

          const db = status.metering ?? -160;
          const elapsed = Date.now() - (recordingStartRef.current ?? Date.now());

          // Don't check for silence until we've been recording at least MIN_RECORDING_MS
          if (elapsed < MIN_RECORDING_MS) return;

          if (db < SILENCE_THRESHOLD_DB) {
            // Below threshold — track silence duration
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION_MS) {
              // Silence long enough — auto-stop
              console.log('[useRestSession] silence detected: db =', db.toFixed(1),
                'silence for', Date.now() - silenceStartRef.current, 'ms — auto-stopping');
              autoProcessingRef.current = true;
              stopSilenceDetection();
              // Trigger the stop-and-process flow
              setIsRecording(false);
              setSessionState('processing');

              try {
                await recordingRef.current.stopAndUnloadAsync();
                const fileUri = recordingRef.current.getURI();
                recordingRef.current = null;
                if (fileUri) {
                  processRecordedAudio(fileUri);
                }
              } catch (e) {
                console.error('[useRestSession] auto-stop recording error:', e);
                if (!abortRef.current) {
                  setError(e.message ?? 'Recording error');
                  setSessionState('error');
                }
              }
            }
          } else {
            // Sound detected — reset silence timer
            silenceStartRef.current = null;
          }
        } catch (_) {
          // getStatusAsync can fail if recording was already stopped
        }
      }, METERING_INTERVAL_MS);
    } catch (e) {
      console.error('[useRestSession] startAutoRecording error:', e);
      if (!abortRef.current) {
        setError('Failed to start recording.');
        setSessionState('error');
      }
    }
  }, [stopSilenceDetection]);

  /**
   * Process a recorded audio file — handles all paths (Twi, Android WS proxy, iOS direct).
   * Called by both silence auto-stop and manual toggleRecording stop.
   * After processing, auto-starts the next recording.
   */
  const processRecordedAudio = useCallback(async (fileUri) => {
    console.log('[useRestSession] processRecordedAudio: fileUri =', fileUri);

    try {
      if (!fileUri) throw new Error('Recording failed — no file produced.');
      if (abortRef.current) {
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => { });
        return;
      }

      let userMessage;

      if (language === 'tw') {
        // ── Twi path — GhanaNLP ASR ──
        console.log('[useRestSession] processRecordedAudio: Twi mode — GhanaNLP ASR...');
        let transcribeUri = fileUri;
        if (Platform.OS === 'ios') {
          const rawBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => { });
          const pcmBuf = base64ToArrayBuffer(rawBase64);
          const wav = pcmToWav(pcmBuf, 24000, 1);
          const wavBase64 = arrayBufferToBase64(wav);
          transcribeUri = `${FileSystem.cacheDirectory}visante_twi_${Date.now()}.m4a`;
          await FileSystem.writeAsStringAsync(transcribeUri, wavBase64, { encoding: 'base64' });
        }

        const twiTranscript = await transcribeTwiAudio(transcribeUri, 'tw');
        FileSystem.deleteAsync(transcribeUri, { idempotent: true }).catch(() => { });
        console.log('[useRestSession] processRecordedAudio: GhanaNLP transcript =', twiTranscript?.substring(0, 100));

        if (!twiTranscript || !twiTranscript.trim()) {
          console.warn('[useRestSession] processRecordedAudio: empty Twi transcript — auto-restarting');
          setSessionState('listening');
          startAutoRecording();
          return;
        }
        userMessage = { role: 'user', content: twiTranscript };

      } else if (Platform.OS === 'android') {
        // ── English / Android path — WebSocket proxy ──
        console.log('[useRestSession] processRecordedAudio: Android WS proxy...');
        const m4aBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => { });

        if (!m4aBase64) {
          console.warn('[useRestSession] processRecordedAudio: empty file — auto-restarting');
          setSessionState('listening');
          startAutoRecording();
          return;
        }

        // Send only text messages to the proxy (strip any prior audio blobs)
        const textMessages = conversationRef.current.map((msg) => {
          if (Array.isArray(msg.content)) return null;
          return msg;
        }).filter(Boolean);

        const wsUrl = Constants.expoConfig?.extra?.wsAudioProxyUrl;
        if (!wsUrl) throw new Error('WS_AUDIO_PROXY_URL is not configured in .env');

        console.log('[useRestSession] processRecordedAudio: calling audioProxyChat...');
        const proxyResult = await audioProxyChat(wsUrl, m4aBase64, textMessages, toolsRef.current, TTS_VOICE);
        console.log('[useRestSession] processRecordedAudio: WS response —',
          'audio:', !!proxyResult.audioBase64, 'transcript:', !!proxyResult.transcript, 'toolCall:', !!proxyResult.toolCall);

        if (abortRef.current) return;

        conversationRef.current.push({ role: 'user', content: proxyResult.transcript ? '[user audio]' : '[user audio]' });

        // Handle tool calls
        if (proxyResult.toolCall) {
          const toolCall = proxyResult.toolCall;

          if (toolCall.name === 'save_user_profile') {
            console.log('[useRestSession] processRecordedAudio: SAVE_USER_PROFILE');
            let profileArgs;
            try {
              profileArgs = typeof toolCall.arguments === 'string'
                ? JSON.parse(toolCall.arguments) : toolCall.arguments;
            } catch (_) { console.warn('[useRestSession] Could not parse save_user_profile args'); }

            if (profileArgs && phoneNumber) {
              try {
                await saveUserProfile({ phoneNumber, ...profileArgs });
                console.log('[useRestSession] User profile saved for', phoneNumber);
              } catch (e) { console.warn('[useRestSession] Failed to save user profile:', e); }
            }

            if (proxyResult.transcript) conversationRef.current.push({ role: 'assistant', content: proxyResult.transcript });
            if (proxyResult.audioBase64 && !abortRef.current) {
              setSessionState('ai_speaking');
              await playAudio(proxyResult.audioBase64);
            }
            toolsRef.current = [TRIAGE_COMPLETE_TOOL];

            // If the AI only returned a tool call with no audio, we need to
            // send a follow-up so it continues with triage questions.
            // Use audioChat (REST) instead of WS proxy since the proxy requires audio.
            if (!proxyResult.audioBase64 && !abortRef.current) {
              console.log('[useRestSession] save_user_profile: no audio — sending follow-up via REST to continue triage');
              conversationRef.current.push({ role: 'user', content: '[profile saved — continue with symptom assessment]' });
              const followUp = await audioChat(conversationRef.current, toolsRef.current, TTS_VOICE);
              if (abortRef.current) return;
              if (followUp.transcript) conversationRef.current.push({ role: 'assistant', content: followUp.transcript });
              if (followUp.audioBase64 && !abortRef.current) {
                setSessionState('ai_speaking');
                await playAudio(followUp.audioBase64);
              }
            }

            if (!abortRef.current) {
              setSessionState('listening');
            }
            return;
          }

          if (toolCall.name === 'complete_triage') {
            console.log('[useRestSession] processRecordedAudio: TRIAGE COMPLETE');
            let args;
            try {
              args = typeof toolCall.arguments === 'string'
                ? JSON.parse(toolCall.arguments) : toolCall.arguments;
            } catch (_) { throw new Error('Could not parse triage summary from AI.'); }

            if (proxyResult.transcript) conversationRef.current.push({ role: 'assistant', content: proxyResult.transcript });
            if (proxyResult.audioBase64) {
              setSessionState('ai_speaking');
              await playAudio(proxyResult.audioBase64);
            }
            setSessionState('complete');
            await cleanup();
            onTriageComplete?.(args);
            return;
          }
        }

        // Normal response
        if (proxyResult.transcript) {
          conversationRef.current.push({ role: 'assistant', content: proxyResult.transcript });
        }
        if (proxyResult.audioBase64 && !abortRef.current) {
          setSessionState('ai_speaking');
          await playAudio(proxyResult.audioBase64);
        }
        if (!abortRef.current) {
          setSessionState('listening');
        }
        return;

      } else {
        // ── English / iOS path — raw PCM → WAV ──
        console.log('[useRestSession] processRecordedAudio: iOS WAV path...');
        const rawBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => { });

        if (!rawBase64) {
          console.warn('[useRestSession] processRecordedAudio: empty file — auto-restarting');
          setSessionState('listening');
          startAutoRecording();
          return;
        }

        const pcmBuf = base64ToArrayBuffer(rawBase64);
        const wav = pcmToWav(pcmBuf, 24000, 1);
        const wavBase64 = arrayBufferToBase64(wav);

        userMessage = {
          role: 'user',
          content: [{ type: 'input_audio', input_audio: { data: wavBase64, format: 'wav' } }],
        };
      }

      // ── Twi and iOS paths reach here — send via audioChat ──
      conversationRef.current.push(userMessage);
      console.log('[useRestSession] processRecordedAudio: calling audioChat, conv len =', conversationRef.current.length);

      const { audioBase64: responseAudio, transcript, toolCall } = await audioChat(
        conversationRef.current, toolsRef.current, TTS_VOICE,
      );

      if (abortRef.current) return;

      // Handle tool calls
      if (toolCall) {
        if (toolCall.name === 'save_user_profile') {
          console.log('[useRestSession] processRecordedAudio: SAVE_USER_PROFILE');
          let profileArgs;
          try { profileArgs = JSON.parse(toolCall.arguments); } catch (_) { }

          if (profileArgs && phoneNumber) {
            try {
              await saveUserProfile({ phoneNumber, ...profileArgs });
            } catch (e) { console.warn('[useRestSession] Failed to save user profile:', e); }
          }

          if (transcript) conversationRef.current.push({ role: 'assistant', content: transcript });
          if (responseAudio && !abortRef.current) {
            setSessionState('ai_speaking');
            await playAudio(responseAudio);
          }
          toolsRef.current = [TRIAGE_COMPLETE_TOOL];

          // If the AI only returned a tool call with no audio, send a
          // follow-up so it continues with triage questions.
          if (!responseAudio && !abortRef.current) {
            console.log('[useRestSession] save_user_profile: no audio — sending follow-up to continue triage');
            conversationRef.current.push({ role: 'user', content: '[profile saved — continue with symptom assessment]' });
            const followUp = await audioChat(conversationRef.current, toolsRef.current, TTS_VOICE);
            if (abortRef.current) return;
            if (followUp.transcript) conversationRef.current.push({ role: 'assistant', content: followUp.transcript });
            if (followUp.audioBase64 && !abortRef.current) {
              setSessionState('ai_speaking');
              await playAudio(followUp.audioBase64);
            }
          }

          if (!abortRef.current) {
            setSessionState('listening');
          }
          return;
        }

        if (toolCall.name === 'complete_triage') {
          console.log('[useRestSession] processRecordedAudio: TRIAGE COMPLETE');
          let args;
          try { args = JSON.parse(toolCall.arguments); } catch (_) {
            throw new Error('Could not parse triage summary from AI.');
          }

          if (transcript) conversationRef.current.push({ role: 'assistant', content: transcript });
          if (responseAudio) {
            setSessionState('ai_speaking');
            await playAudio(responseAudio);
          }
          setSessionState('complete');
          await cleanup();
          onTriageComplete?.(args);
          return;
        }
      }

      // Normal response
      if (transcript) conversationRef.current.push({ role: 'assistant', content: transcript });
      if (responseAudio && !abortRef.current) {
        setSessionState('ai_speaking');
        await playAudio(responseAudio);
      }

      // Wait for user to tap mic to start next recording
      if (!abortRef.current) {
        setSessionState('listening');
      }
    } catch (e) {
      console.error('[useRestSession] processRecordedAudio: ERROR:', e);
      if (!abortRef.current) {
        setError(e.message ?? 'An error occurred.');
        setSessionState('error');
      }
    }
  }, [language, playAudio, cleanup, onTriageComplete, phoneNumber]);

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
    const systemPrompt = buildTriageSystemPrompt(userProfile) + LANGUAGE_ADDENDUM;
    conversationRef.current = [{ role: 'system', content: systemPrompt }];
    // Tools: always include complete_triage; include save_user_profile only for new users
    const tools = userProfile
      ? [TRIAGE_COMPLETE_TOOL]
      : [TRIAGE_COMPLETE_TOOL, SAVE_USER_PROFILE_TOOL];
    toolsRef.current = tools;
    console.log('[useRestSession] startSession: fetching AI greeting...');

    try {
      const { audioBase64, transcript, toolCall } = await audioChat(
        conversationRef.current,
        tools,
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
      console.log('[useRestSession] startSession: → listening, auto-starting recording');
      setSessionState('listening');
      startAutoRecording();

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
  }, [playAudio, startAutoRecording]);

  // ── Recording toggle (manual override — user can still tap to stop early) ──

  const toggleRecording = useCallback(async () => {
    console.log('[useRestSession] toggleRecording: isRecording =', isRecording, 'sessionState =', sessionStateRef.current);

    if (isRecording) {
      // ── Manual stop — user tapped to send early ──
      console.log('[useRestSession] toggleRecording: MANUAL STOP');
      stopSilenceDetection();
      autoProcessingRef.current = true;
      setIsRecording(false);
      setSessionState('processing');

      if (!recordingRef.current) {
        console.warn('[useRestSession] toggleRecording: no recordingRef — bailing');
        return;
      }

      try {
        await recordingRef.current.stopAndUnloadAsync();
        const fileUri = recordingRef.current.getURI();
        recordingRef.current = null;
        console.log('[useRestSession] toggleRecording: stopped, fileUri =', fileUri);
        processRecordedAudio(fileUri);
      } catch (e) {
        console.error('[useRestSession] toggleRecording: stop error:', e);
        if (!abortRef.current) {
          setError(e.message ?? 'Recording error');
          setSessionState('error');
        }
      }
    } else if (sessionStateRef.current === 'listening') {
      // ── Manual start (fallback — normally auto-starts) ──
      startAutoRecording();
    } else {
      console.warn('[useRestSession] toggleRecording: ignored — state is', sessionStateRef.current);
    }
  }, [isRecording, stopSilenceDetection, startAutoRecording, processRecordedAudio]);

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
