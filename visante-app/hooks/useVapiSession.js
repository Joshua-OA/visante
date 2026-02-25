import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import Vapi from '@vapi-ai/react-native';
import Constants from 'expo-constants';
import { TRIAGE_SYSTEM_PROMPT, TRIAGE_COMPLETE_TOOL } from '../utils/triagePrompt';

/**
 * useVapiSession
 *
 * Vapi-based triage session. Exposes the same interface as useRealtimeSession
 * so either hook can be swapped in via useTriageSession.
 *
 * Session states (same as useRealtimeSession):
 *   'idle' | 'connecting' | 'listening' | 'ai_speaking' | 'complete' | 'error'
 */
export function useVapiSession({ onTriageComplete }) {
  const [sessionState, setSessionState]   = useState('idle');
  const [error, setError]                 = useState(null);
  const [transcriptLines, setTranscript]  = useState([]);
  const [permissionDenied, setPermDenied] = useState(false);

  const vapiRef          = useRef(null);
  const sessionStateRef  = useRef('idle');

  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  // ── Teardown ───────────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.removeAllListeners();
      try { vapiRef.current.stop(); } catch (_) {}
      vapiRef.current = null;
    }
  }, []);

  // ── Start session ──────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    const current = sessionStateRef.current;
    if (current !== 'idle' && current !== 'error') return;

    setError(null);
    setTranscript([]);
    setPermDenied(false);

    const vapiKey = Constants.expoConfig?.extra?.vapiPublicKey ?? '';
    if (!vapiKey || vapiKey === 'your-vapi-public-key-here') {
      setError('VAPI_PUBLIC_KEY is not configured. Add it to your .env file.');
      setSessionState('error');
      return;
    }

    setSessionState('connecting');

    const vapi = new Vapi(vapiKey);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      console.log('[useVapiSession] call-start');
      setSessionState('listening');
    });

    vapi.on('call-end', () => {
      console.log('[useVapiSession] call-end');
      if (sessionStateRef.current !== 'complete') {
        setSessionState('idle');
      }
    });

    vapi.on('speech-start', () => {
      console.log('[useVapiSession] AI speech-start');
      setSessionState('ai_speaking');
    });

    vapi.on('speech-end', () => {
      console.log('[useVapiSession] AI speech-end');
      if (sessionStateRef.current === 'ai_speaking') {
        setSessionState('listening');
      }
    });

    vapi.on('message', (msg) => {
      // Transcript lines
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        const role = msg.role === 'assistant' ? 'ai' : 'user';
        console.log('[useVapiSession] transcript', role, msg.transcript);
        if (msg.transcript?.trim()) {
          setTranscript((prev) => [...prev, { role, text: msg.transcript }]);
        }
      }

      // Tool call — triage complete
      if (
        msg.type === 'function-call' &&
        msg.functionCall?.name === 'complete_triage'
      ) {
        let args = msg.functionCall.parameters ?? {};
        console.log('[useVapiSession] triage_complete', args);
        setSessionState('complete');
        teardown();
        onTriageComplete?.(args);
      }
    });

    vapi.on('error', (err) => {
      console.error('[useVapiSession] error', err);
      setError(err?.message ?? 'Vapi error occurred.');
      setSessionState('error');
      teardown();
    });

    try {
      await vapi.start({
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: TRIAGE_SYSTEM_PROMPT }],
          tools: [
            {
              type: 'function',
              function: {
                name: TRIAGE_COMPLETE_TOOL.name,
                description: TRIAGE_COMPLETE_TOOL.description,
                parameters: TRIAGE_COMPLETE_TOOL.parameters,
              },
            },
          ],
        },
        voice: {
          provider: 'openai',
          voiceId: 'alloy',
        },
        firstMessage:
          'Hello! I\'m Visante, your medical assistant. What brings you in today?',
      });
    } catch (e) {
      console.error('[useVapiSession] start failed:', e);
      setError(e?.message ?? 'Failed to start Vapi session.');
      setSessionState('error');
      vapiRef.current = null;
    }
  }, [teardown, onTriageComplete]);

  // ── End session (user-initiated) ───────────────────────────────────────────

  const endSession = useCallback(() => {
    teardown();
    setSessionState('idle');
    setError(null);
  }, [teardown]);

  // ── Background handling ────────────────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        (nextState === 'background' || nextState === 'inactive') &&
        (sessionStateRef.current === 'listening' ||
         sessionStateRef.current === 'ai_speaking' ||
         sessionStateRef.current === 'connecting')
      ) {
        endSession();
      }
    });
    return () => sub.remove();
  }, [endSession]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => { teardown(); };
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
