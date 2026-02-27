import Toast from 'react-native-toast-message';

/**
 * Show a user-friendly error toast.
 * Maps raw error messages to warm, conversational descriptions.
 */
export function showErrorToast(error, fallbackTitle) {
  const message = typeof error === 'string' ? error : error?.message ?? '';
  const friendly = getFriendlyMessage(message, fallbackTitle);

  Toast.show({
    type: 'error',
    text1: friendly.title,
    text2: friendly.body,
    visibilityTime: 4000,
    topOffset: 60,
  });
}

export function showSuccessToast(title, body) {
  Toast.show({
    type: 'success',
    text1: title,
    text2: body,
    visibilityTime: 3000,
    topOffset: 60,
  });
}

export function showInfoToast(title, body) {
  Toast.show({
    type: 'info',
    text1: title,
    text2: body,
    visibilityTime: 3000,
    topOffset: 60,
  });
}

/**
 * Map raw error strings to warm, conversational messages for the user.
 */
function getFriendlyMessage(message, fallbackTitle) {
  const lower = message.toLowerCase();

  // Network errors
  if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
    return {
      title: 'Connection Issue',
      body: 'It looks like you may have lost connection. Kindly check your internet and try again.',
    };
  }

  // Timeout errors
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return {
      title: 'Taking Too Long',
      body: 'Sorry, the server is taking too long to respond. Please try again in a moment.',
    };
  }

  // Microphone permission
  if (lower.includes('microphone') || lower.includes('mic')) {
    return {
      title: 'Microphone Access Needed',
      body: 'We need microphone access for voice consultations. Please enable it in your device settings.',
    };
  }

  // Recording failures
  if (lower.includes('recording') || lower.includes('record')) {
    return {
      title: 'Audio Issue',
      body: 'Sorry, we couldn\'t capture your voice. Please tap the mic and try again.',
    };
  }

  // API key / config errors
  if (lower.includes('not configured') || lower.includes('api_key')) {
    return {
      title: 'Setup Issue',
      body: 'Sorry, the app is missing a required setting. Please contact support for help.',
    };
  }

  // OpenAI / Chat API errors
  if (lower.includes('chat api error') || lower.includes('api error')) {
    return {
      title: 'AI Unavailable',
      body: 'Sorry, we\'re facing some challenges with our AI assistant. Please try again shortly.',
    };
  }

  // WebSocket errors
  if (lower.includes('websocket')) {
    return {
      title: 'Connection Lost',
      body: 'We lost connection to the server. Kindly check your internet and try again.',
    };
  }

  // OTP errors
  if (lower.includes('otp') || lower.includes('verification')) {
    return {
      title: 'Verification Issue',
      body: 'Sorry, we couldn\'t verify your number. Please double-check and try again.',
    };
  }

  // Transcription errors
  if (lower.includes('transcri')) {
    return {
      title: 'Couldn\'t Hear You',
      body: 'Sorry, we had trouble understanding your voice. Please try speaking again clearly.',
    };
  }

  // Parse errors from triage
  if (lower.includes('parse') || lower.includes('triage summary')) {
    return {
      title: 'Processing Issue',
      body: 'Sorry, something went wrong processing your consultation. Please try again.',
    };
  }

  // Firestore / save errors
  if (lower.includes('save') || lower.includes('firestore') || lower.includes('firebase')) {
    return {
      title: 'Couldn\'t Save',
      body: 'Sorry, we couldn\'t save your data. Kindly check your internet connection.',
    };
  }

  // Dashboard / load errors
  if (lower.includes('load') || lower.includes('fetch') || lower.includes('dashboard')) {
    return {
      title: 'Couldn\'t Load Data',
      body: 'Sorry, we couldn\'t load your information. Kindly check your internet and try again.',
    };
  }

  // Generic fallback
  return {
    title: fallbackTitle ?? 'Oops, Something Went Wrong',
    body: 'Sorry, we\'re facing some challenges. Please try again.',
  };
}
