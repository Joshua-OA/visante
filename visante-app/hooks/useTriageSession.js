/**
 * Toggle between AI voice backends by changing PROVIDER below.
 *
 *   'openai-rest'      — single Chat Completions call with audio in/out (gpt-4o-audio-preview)
 *   'openai-realtime'  — direct WebSocket to OpenAI Realtime API (gpt-4o-mini-realtime)
 *   'vapi'             — Vapi managed voice pipeline (gpt-4o-mini via Vapi)
 */
const PROVIDER = 'openai-rest'; // ← change to 'openai-realtime' or 'vapi' to switch

import { useRealtimeSession } from './useRealtimeSession';
import { useRestSession } from './useRestSession';

export function useTriageSession(options) {
  if (PROVIDER === 'openai-rest') return useRestSession(options);
  // 'vapi' requires a native dev build (not Expo Go).
  return useRealtimeSession(options);
}
