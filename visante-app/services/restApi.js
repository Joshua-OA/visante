// ─── Single-call audio Chat Completions (audio in → audio out) ──────────────
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'https://api.openai.com/v1';

function getApiKey() {
  const key = Constants.expoConfig?.extra?.openaiApiKey ?? '';
  if (!key || key === 'your-openai-api-key-here') {
    throw new Error('OPENAI_API_KEY is not configured. Add it to your .env file.');
  }
  return key;
}

/**
 * Send a conversation (with optional audio) to Chat Completions and get audio back.
 *
 * @param {Array}  messages  Standard messages array [{role, content}, …]
 * @param {Array}  tools     Tool definitions (e.g. [TRIAGE_COMPLETE_TOOL])
 * @param {string} voice     TTS voice ('alloy' | 'ash' | 'coral' | 'echo' | 'nova' | 'shimmer')
 * @returns {Promise<{ audioBase64: string|null, transcript: string|null, toolCall: object|null, audioId: string|null }>}
 */
export async function audioChat(messages, tools, voice = 'alloy') {
  const apiKey = getApiKey();

  const body = {
    model: 'gpt-audio',
    modalities: ['text', 'audio'],
    audio: { voice, format: 'wav' },
    messages,
  };

  if (tools?.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    body.tool_choice = 'auto';
  }

  // Log request (without audio data to avoid flooding console)
  const msgSummary = messages.map((m) => {
    const hasAudio = Array.isArray(m.content) && m.content.some((c) => c.type === 'input_audio');
    const audioInfo = hasAudio
      ? m.content
          .filter((c) => c.type === 'input_audio')
          .map((c) => ({
            format: c.input_audio?.format,
            dataLen: c.input_audio?.data?.length ?? 0,
            dataPreview: c.input_audio?.data?.substring(0, 20),
          }))
      : undefined;
    return {
      role: m.role,
      hasAudio,
      ...(audioInfo && { audioInfo }),
      textPreview: typeof m.content === 'string' ? m.content.substring(0, 80) : '(multipart)',
    };
  });
  console.log('[restApi] audioChat: sending request — messages:', JSON.stringify(msgSummary));
  console.log('[restApi] audioChat: model =', body.model, 'tools =', tools?.length ?? 0);

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[restApi] audioChat: response status =', res.status);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[restApi] audioChat: API error:', JSON.stringify(err));
    throw new Error(err.error?.message ?? `Chat API error: ${res.status}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;

  console.log('[restApi] audioChat: response —',
    'hasAudio:', !!msg?.audio?.data,
    'audioDataLen:', msg?.audio?.data?.length ?? 0,
    'hasTranscript:', !!msg?.audio?.transcript,
    'hasContent:', !!msg?.content,
    'toolCalls:', msg?.tool_calls?.length ?? 0,
    'finishReason:', data.choices?.[0]?.finish_reason,
  );

  if (msg?.audio?.transcript) {
    console.log('[restApi] audioChat: transcript preview:', msg.audio.transcript.substring(0, 100));
  }
  if (msg?.content) {
    console.log('[restApi] audioChat: content preview:', msg.content.substring(0, 100));
  }

  let toolCall = null;
  if (msg?.tool_calls?.length > 0) {
    const tc = msg.tool_calls[0];
    toolCall = { id: tc.id, name: tc.function.name, arguments: tc.function.arguments };
    console.log('[restApi] audioChat: tool call:', tc.function.name);
  }

  return {
    audioBase64: msg?.audio?.data ?? null,
    transcript: msg?.audio?.transcript ?? msg?.content ?? null,
    toolCall,
    audioId: msg?.audio?.id ?? null,
  };
}

/**
 * Text-only Chat Completions call (no audio in/out).
 * Used when the user types their symptoms instead of speaking.
 *
 * @param {Array}  messages  Standard messages array [{role, content}, …]
 * @param {Array}  tools     Tool definitions
 * @returns {Promise<{ transcript: string|null, toolCall: object|null }>}
 */
export async function textChat(messages, tools) {
  const apiKey = getApiKey();

  const body = {
    model: 'gpt-4o-mini',
    messages,
  };

  if (tools?.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    body.tool_choice = 'auto';
  }

  console.log('[restApi] textChat: sending request — messages:', messages.length, 'tools:', tools?.length ?? 0);

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[restApi] textChat: response status =', res.status);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[restApi] textChat: API error:', JSON.stringify(err));
    throw new Error(err.error?.message ?? `Chat API error: ${res.status}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;

  let toolCall = null;
  if (msg?.tool_calls?.length > 0) {
    const tc = msg.tool_calls[0];
    toolCall = { id: tc.id, name: tc.function.name, arguments: tc.function.arguments };
    console.log('[restApi] textChat: tool call:', tc.function.name);
  }

  return {
    transcript: msg?.content ?? null,
    toolCall,
  };
}

/**
 * Transcribe audio using OpenAI's Whisper API.
 * Used on Android where expo-av cannot produce valid WAV files.
 *
 * @param {string} fileUri   Local file:// URI of the recorded audio
 * @param {string} extension File extension without dot (e.g. 'aac', 'm4a')
 * @returns {Promise<string>} The transcribed text
 */
export async function transcribeAudio(fileUri, extension = 'aac') {
  const apiKey = getApiKey();

  const mimeMap = { aac: 'audio/aac', m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' };
  const mime = mimeMap[extension] || 'audio/aac';

  // React Native FormData accepts {uri, type, name} objects
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: mime,
    name: `recording.${extension}`,
  });
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  // Prompt hint: guide Whisper with vocabulary it will likely encounter
  // (Ghanaian names, medical terms, common triage words, gender options).
  formData.append('prompt',
    'Visante telehealth triage. Patient profile: name, age, gender (male, female). ' +
    'Common Ghanaian names: Kwame, Ama, Kofi, Akua, Yaa, Joshua, Obeng, Agyemang, Asante, Mensah. ' +
    'Medical: headache, fever, malaria, stomach pain, cough, diarrhea, vomiting, chest pain.'
  );

  console.log('[restApi] transcribeAudio: sending', extension, 'from', fileUri);

  const res = await fetch(`${API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  console.log('[restApi] transcribeAudio: response status =', res.status);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[restApi] transcribeAudio: API error:', JSON.stringify(err));
    throw new Error(err.error?.message ?? `Transcription API error: ${res.status}`);
  }

  const data = await res.json();
  console.log('[restApi] transcribeAudio: transcript =', data.text?.substring(0, 100));
  return data.text ?? '';
}

// ─── WebSocket Audio Proxy (Android m4a → server converts → GPT) ─────────────

const WS_AUTH_CODE = 'visante-test-2024';

/**
 * Send m4a audio to the WebSocket proxy server for conversion + GPT processing.
 * The server converts m4a → wav, sends to OpenAI, and returns audio + transcript.
 *
 * @param {string} wsUrl        WebSocket URL (wss://…/ws/audio-proxy)
 * @param {string} audioBase64  Base64-encoded m4a audio data
 * @param {Array}  messages     Text-only conversation messages [{role, content}, …]
 * @param {Array}  tools        Tool definitions
 * @param {string} voice        TTS voice
 * @returns {Promise<{ audioBase64: string|null, transcript: string|null, toolCall: object|null }>}
 */
export function audioProxyChat(wsUrl, audioBase64, messages, tools, voice = 'alloy') {
  return new Promise((resolve, reject) => {
    console.log('[restApi] audioProxyChat: connecting to', wsUrl);
    const ws = new WebSocket(wsUrl);
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        reject(new Error('WebSocket audio proxy timed out (30s)'));
      }
    }, 30000);

    ws.onopen = () => {
      console.log('[restApi] audioProxyChat: connected, sending auth...');
      ws.send(JSON.stringify({ type: 'auth', code: WS_AUTH_CODE }));
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.warn('[restApi] audioProxyChat: non-JSON message:', event.data?.substring?.(0, 100));
        return;
      }
      console.log('[restApi] audioProxyChat: received message type =', data.type);

      if (data.type === 'auth_success') {
        // Authenticated — now send the audio payload
        const toolDefs = (tools || []).map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }));

        const payload = {
          type: 'audio_submit',
          audio_base64: audioBase64,
          audio_format: 'm4a',
          messages,
          tools: toolDefs,
          voice,
        };

        console.log('[restApi] audioProxyChat: sending audio_submit —',
          'audioLen:', audioBase64?.length,
          'messages:', messages.length,
          'tools:', toolDefs.length,
        );
        ws.send(JSON.stringify(payload));
      }

      if (data.type === 'audio_response') {
        clearTimeout(timeout);
        settled = true;
        console.log('[restApi] audioProxyChat: audio_response —',
          'hasAudio:', !!data.audio_base64,
          'audioLen:', data.audio_base64?.length ?? 0,
          'transcript:', data.transcript?.substring(0, 80),
          'toolCall:', data.tool_call?.name ?? null,
        );
        ws.close();
        resolve({
          audioBase64: data.audio_base64 ?? null,
          transcript: data.transcript ?? null,
          toolCall: data.tool_call ?? null,
        });
      }

      if (data.type === 'error') {
        clearTimeout(timeout);
        settled = true;
        console.error('[restApi] audioProxyChat: server error:', data.message, data.code);
        ws.close();
        reject(new Error(data.message ?? 'Audio proxy error'));
      }
    };

    ws.onerror = (err) => {
      console.error('[restApi] audioProxyChat: WebSocket error:', err.message);
      if (!settled) {
        clearTimeout(timeout);
        settled = true;
        reject(new Error('WebSocket connection failed'));
      }
    };

    ws.onclose = (event) => {
      console.log('[restApi] audioProxyChat: closed — code:', event.code, 'reason:', event.reason);
      if (!settled) {
        clearTimeout(timeout);
        settled = true;
        reject(new Error(event.reason || `WebSocket closed with code ${event.code}`));
      }
    };
  });
}

// ─── GhanaNLP ASR — Twi transcription ───────────────────────────────────────

const GHANANLP_ASR_BASE = 'https://translation-api.ghananlp.org/asr/v2';

/**
 * Transcribe audio using the GhanaNLP ASR API (Twi / Akan).
 * Accepts a local file URI recorded by expo-av at 16 kHz mono AAC (.m4a).
 *
 * API docs:
 *   POST /transcribe?language={language}
 *   Content-Type: audio/mpeg
 *   Ocp-Apim-Subscription-Key: <key>
 *   Body: <binary audio>
 *
 * @param {string} fileUri     Local file URI (e.g. file:///…/recording.m4a)
 * @param {string} language    BCP-47-style code accepted by GhanaNLP (e.g. 'tw' for Twi)
 * @returns {Promise<string>}  The transcribed text in Twi
 */
export async function transcribeTwiAudio(fileUri, language = 'tw') {
  const apiKey = Constants.expoConfig?.extra?.ghananlpApiKey ?? '';
  if (!apiKey || apiKey === 'your-ghananlp-subscription-key-here') {
    throw new Error(
      'GHANANLP_API_KEY is not configured. Add your subscription key to .env.'
    );
  }

  console.log('[restApi] transcribeTwiAudio: reading file', fileUri);

  // Read the recorded file as base64, then convert to a binary Uint8Array
  // so we can POST it as a raw binary body (audio/mpeg).
  const base64Data = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 → binary string → Uint8Array
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  console.log(
    '[restApi] transcribeTwiAudio: sending',
    bytes.length,
    'bytes to GhanaNLP — language =',
    language
  );

  const res = await fetch(
    `${GHANANLP_ASR_BASE}/transcribe?language=${encodeURIComponent(language)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: bytes.buffer, // ArrayBuffer — React Native fetch accepts this
    }
  );

  console.log('[restApi] transcribeTwiAudio: response status =', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[restApi] transcribeTwiAudio: API error:', text);
    throw new Error(`GhanaNLP ASR error ${res.status}: ${text}`);
  }

  // The API returns a plain string or JSON with the transcription
  const raw = await res.text();
  console.log('[restApi] transcribeTwiAudio: raw response =', raw?.substring(0, 200));

  // Try to parse JSON first (some endpoints wrap the text)
  let transcript = raw;
  try {
    const parsed = JSON.parse(raw);
    // Common shapes: { transcription: "…" } or { text: "…" } or bare string
    transcript = parsed?.transcription ?? parsed?.text ?? parsed ?? raw;
  } catch (_) {
    // Response was already a plain string — keep it
  }

  const result = String(transcript).trim();
  console.log('[restApi] transcribeTwiAudio: transcript =', result.substring(0, 100));
  return result;
}

// ─── OTP Verification (backend.skot.school) ─────────────────────────────────

const OTP_BASE = 'https://backend.skot.school';

/**
 * Send an OTP code to the given phone number.
 * @param {string} phoneNumber  e.g. "0551234567"
 * @returns {Promise<object>}   API response body
 */
export async function sendOtp(phoneNumber) {
  console.log('[restApi] sendOtp: sending to', phoneNumber);

  const res = await fetch(`${OTP_BASE}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });

  console.log('[restApi] sendOtp: response status =', res.status);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[restApi] sendOtp: error:', JSON.stringify(data));
    throw new Error(data.message ?? `OTP send failed: ${res.status}`);
  }

  console.log('[restApi] sendOtp: success');
  return data;
}

/**
 * Verify an OTP code for the given phone number.
 * @param {string} phoneNumber  e.g. "0551234567"
 * @param {string} otp          e.g. "1234"
 * @returns {Promise<object>}   API response body
 */
export async function verifyOtp(phoneNumber, otp) {
  console.log('[restApi] verifyOtp: verifying for', phoneNumber);

  const res = await fetch(`${OTP_BASE}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, otp }),
  });

  console.log('[restApi] verifyOtp: response status =', res.status);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[restApi] verifyOtp: error:', JSON.stringify(data));
    throw new Error(data.message ?? `OTP verification failed: ${res.status}`);
  }

  console.log('[restApi] verifyOtp: success');
  return data;
}

