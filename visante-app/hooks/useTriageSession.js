/**
 * Toggle between the two AI voice backends by changing PROVIDER below.
 *
 *   'openai-realtime'  — direct WebSocket to OpenAI Realtime API (gpt-4o-mini-realtime)
 *   'vapi'             — Vapi managed voice pipeline (gpt-4o-mini via Vapi)
 */
const PROVIDER = 'openai-realtime'; // ← change to 'vapi' to switch (requires native build, not Expo Go)

import { useRealtimeSession } from './useRealtimeSession';

export function useTriageSession(options) {
  // PROVIDER === 'vapi' requires a native dev build (not Expo Go).
  // Swap this import for useVapiSession once you have a custom dev client.
  return useRealtimeSession(options);
}
