// ─── Single-call audio Chat Completions (audio in → audio out) ──────────────
import Constants from 'expo-constants';

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
  const msgSummary = messages.map((m) => ({
    role: m.role,
    hasAudio: Array.isArray(m.content) && m.content.some((c) => c.type === 'input_audio'),
    textPreview: typeof m.content === 'string' ? m.content.substring(0, 80) : '(multipart)',
  }));
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
