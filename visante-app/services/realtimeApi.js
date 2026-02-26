import Constants from 'expo-constants';
import { TRIAGE_SYSTEM_PROMPT, TRIAGE_COMPLETE_TOOL } from '../utils/triagePrompt';

const WS_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview';

/**
 * RealtimeApiClient
 *
 * Wraps the OpenAI Realtime WebSocket for a single triage session.
 *
 * Usage:
 *   const client = new RealtimeApiClient();
 *   client.on('session_ready',     () => { ... start mic ... });
 *   client.on('audio_delta',       (base64) => { ... buffer chunk ... });
 *   client.on('audio_segment_done',() => { ... play buffered audio ... });
 *   client.on('transcript',        ({ role, text }) => { ... });
 *   client.on('text_delta',        (delta) => { ... });
 *   client.on('triage_complete',   (summary) => { ... navigate ... });
 *   client.on('error',             ({ code, message }) => { ... });
 *   client.on('close',             ({ code, reason }) => { ... });
 *   await client.connect();
 *   client.sendAudioChunk(base64PcmString);
 *   client.disconnect();
 */
export class RealtimeApiClient {
  constructor() {
    this._ws = null;
    this._handlers = {};
    this._sessionConfigured = false;
    this._resolveConnect = null;
  }

  // ── Event registration ────────────────────────────────────────────────────

  on(event, handler) {
    this._handlers[event] = handler;
  }

  _emit(event, data) {
    if (this._handlers[event]) {
      try {
        this._handlers[event](data);
      } catch (e) {
        console.warn(`[RealtimeApiClient] handler error for "${event}":`, e);
      }
    }
  }

  // ── Connection ────────────────────────────────────────────────────────────

  /**
   * Opens the WebSocket and waits for the session to be configured.
   * Resolves when 'session.updated' arrives (i.e. the session is ready
   * to accept audio).
   *
   * React Native's WebSocket accepts a third `options` argument for headers,
   * which is how we pass the Bearer token without a custom HTTP upgrade.
   */
  connect() {
    return new Promise((resolve, reject) => {
      const apiKey = Constants.expoConfig?.extra?.openaiApiKey ?? '';
      console.log('[RealtimeApiClient] connect: starting, apiKey present =', !!apiKey);

      if (!apiKey || apiKey === 'your-openai-api-key-here') {
        const err = new Error('OPENAI_API_KEY is not configured. Add it to your .env file.');
        console.error('[RealtimeApiClient] connect: missing API key');
        reject(err);
        return;
      }

      this._resolveConnect = resolve;

      // Use subprotocol-based auth as recommended for browser/mobile clients.
      // The "realtime" subprotocol is required; the key is passed as a protocol token.
      this._ws = new WebSocket(WS_URL, [
        'realtime',
        `openai-insecure-api-key.${apiKey}`,
      ]);

      this._ws.onopen = () => {
        console.log('[RealtimeApiClient] WebSocket onopen: connection established');
      };

      this._ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          console.warn('[RealtimeApiClient] onmessage: failed to parse JSON', event.data);
          return;
        }
        console.log('[RealtimeApiClient] onmessage type:', msg.type);
        this._handleServerEvent(msg);
      };

      this._ws.onerror = (e) => {
        const message = e?.message ?? 'WebSocket connection error';
        console.error('[RealtimeApiClient] WebSocket onerror:', message, e);
        this._emit('error', { code: 'WS_ERROR', message });
        reject(new Error(message));
      };

      this._ws.onclose = (e) => {
        console.log('[RealtimeApiClient] WebSocket onclose: code =', e.code, 'reason =', e.reason);
        this._emit('close', { code: e.code, reason: e.reason ?? '' });
      };
    });
  }

  // ── Server event dispatcher ───────────────────────────────────────────────

  _handleServerEvent(msg) {
    switch (msg.type) {

      case 'session.created':
        console.log('[RealtimeApiClient] session.created — configuring session');
        this._configureSession();
        break;

      case 'session.updated':
        console.log('[RealtimeApiClient] session.updated — configured:', this._sessionConfigured);
        if (!this._sessionConfigured) {
          this._sessionConfigured = true;
          console.log('[RealtimeApiClient] session_ready — emitting, then triggering AI greeting');
          this._emit('session_ready', {});
          if (this._resolveConnect) {
            this._resolveConnect();
            this._resolveConnect = null;
          }
          // AI speaks first
          this.triggerGreeting();
        }
        break;

      // GA API event name
      case 'response.output_audio.delta':
      // Beta API event name (keep for backwards compatibility)
      case 'response.audio.delta':
        if (msg.delta) {
          console.log('[RealtimeApiClient] audio delta: chunk length =', msg.delta.length);
          this._emit('audio_delta', msg.delta);
        }
        break;

      // GA API event name
      case 'response.output_audio.done':
      // Beta API event name (keep for backwards compatibility)
      case 'response.audio.done':
        console.log('[RealtimeApiClient] audio done — segment finished');
        this._emit('audio_segment_done', {});
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('[RealtimeApiClient] user transcript:', msg.transcript);
        this._emit('transcript', { role: 'user', text: msg.transcript ?? '' });
        break;

      // GA API event name
      case 'response.output_text.delta':
      // Beta API event name (keep for backwards compatibility)
      case 'response.text.delta':
        if (msg.delta) {
          console.log('[RealtimeApiClient] text delta:', msg.delta);
          this._emit('text_delta', msg.delta);
        }
        break;

      case 'response.done':
        console.log('[RealtimeApiClient] response.done');
        this._emit('response_done', msg.response ?? {});
        break;

      case 'response.function_call_arguments.done':
        console.log('[RealtimeApiClient] function_call_arguments.done: name =', msg.name, 'args =', msg.arguments);
        if (msg.name === 'complete_triage') {
          let args;
          try {
            args = JSON.parse(msg.arguments);
          } catch (e) {
            console.error('[RealtimeApiClient] failed to parse triage args:', e);
            this._emit('error', {
              code: 'BAD_TOOL_ARGS',
              message: 'Could not parse triage summary from AI response.',
            });
            break;
          }
          console.log('[RealtimeApiClient] triage_complete args:', args);
          // Acknowledge the tool call so the AI knows we received it
          this._send({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: msg.call_id,
              output: JSON.stringify({ status: 'received' }),
            },
          });
          this._emit('triage_complete', args);
        }
        break;

      case 'error':
        console.error('[RealtimeApiClient] API error event:', msg.error);
        this._emit('error', {
          code: msg.error?.code ?? 'API_ERROR',
          message: msg.error?.message ?? 'An unexpected error occurred.',
        });
        break;

      default:
        console.log('[RealtimeApiClient] unhandled event type:', msg.type);
        break;
    }
  }

  // ── Session configuration ─────────────────────────────────────────────────

  _configureSession() {
    console.log('[RealtimeApiClient] _configureSession: sending session.update');
    this._send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: TRIAGE_SYSTEM_PROMPT,
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
          output: {
            format: { type: 'audio/pcm', rate: 24000 },
            voice: 'alloy',
          },
        },
        tools: [TRIAGE_COMPLETE_TOOL],
        tool_choice: 'auto',
        max_output_tokens: 800,
      },
    });
  }

  /** Trigger the AI to speak first (greeting) immediately after session is ready. */
  triggerGreeting() {
    console.log('[RealtimeApiClient] triggerGreeting: sending response.create');
    this._send({ type: 'response.create' });
  }

  // ── Audio sending ─────────────────────────────────────────────────────────

  /**
   * Sends a base64-encoded PCM16 mono 24kHz audio chunk to the API buffer.
   * The server VAD will automatically detect speech end and trigger a response.
   *
   * @param {string} base64Pcm
   */
  sendAudioChunk(base64Pcm) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    this._send({
      type: 'input_audio_buffer.append',
      audio: base64Pcm,
    });
  }

  /**
   * Sends a text message (transcribed from audio) and triggers a response.
   * Used on Android where we can't produce raw PCM for streaming.
   *
   * @param {string} text  The transcribed user speech
   */
  sendTextAndRespond(text) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    console.log('[RealtimeApiClient] sendTextAndRespond:', text?.substring(0, 80));
    this._send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this._send({ type: 'response.create' });
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  disconnect() {
    if (this._ws) {
      this._ws.onclose = null; // suppress the close handler on intentional close
      this._ws.onerror = null;
      try { this._ws.close(); } catch (_) {}
      this._ws = null;
    }
    this._sessionConfigured = false;
    this._resolveConnect = null;
  }

  // ── Internal send ─────────────────────────────────────────────────────────

  _send(payload) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    try {
      this._ws.send(JSON.stringify(payload));
    } catch (e) {
      console.warn('[RealtimeApiClient] send error:', e);
    }
  }
}
