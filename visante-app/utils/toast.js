import Toast from 'react-native-toast-message';

/**
 * Show a user-friendly error toast.
 * Maps raw error messages to warm, conversational descriptions
 * that always include a resolution path so the user never feels stuck.
 */
export function showErrorToast(error, fallbackTitle) {
  const message = typeof error === 'string' ? error : error?.message ?? '';
  const friendly = getFriendlyMessage(message, fallbackTitle);

  Toast.show({
    type: 'error',
    text1: friendly.title,
    text2: friendly.body,
    visibilityTime: 5000,
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
 * Every message includes a resolution path so the user always knows what to do next.
 */
function getFriendlyMessage(message, fallbackTitle) {
  const lower = message.toLowerCase();

  // Network errors
  if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
    return {
      title: 'Connection Issue',
      body: 'It looks like you may have lost connection. Please check your internet — we\'ll reconnect automatically once you\'re back online.',
    };
  }

  // Timeout errors
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return {
      title: 'Taking Too Long',
      body: 'The server is taking a bit longer than usual. We\'re retrying in the background — please wait a moment or try again.',
    };
  }

  // Microphone permission
  if (lower.includes('microphone') || lower.includes('mic')) {
    return {
      title: 'Microphone Access Needed',
      body: 'We need microphone access for your consultation. Tap "Settings" on the banner above to enable it, then come back.',
    };
  }

  // Recording failures
  if (lower.includes('recording') || lower.includes('record')) {
    return {
      title: 'Audio Issue',
      body: 'We couldn\'t capture your voice this time. Don\'t worry — just tap the mic again and we\'ll try once more.',
    };
  }

  // Video / Jitsi / WebRTC errors
  if (lower.includes('video') || lower.includes('jitsi') || lower.includes('webrtc') || lower.includes('webview')) {
    return {
      title: 'Video Connection Issue',
      body: 'We\'re having trouble with the video feed. Please check your internet connection — we\'re working to reconnect you automatically.',
    };
  }

  // API key / config errors
  if (lower.includes('not configured') || lower.includes('api_key')) {
    return {
      title: 'Setup Issue',
      body: 'Something isn\'t configured correctly on our end. Our team has been notified and is already working on it. Please try again shortly.',
    };
  }

  // OpenAI / Chat API errors
  if (lower.includes('chat api error') || lower.includes('api error')) {
    return {
      title: 'AI Unavailable',
      body: 'Our AI assistant is temporarily unavailable. This is being resolved automatically — please try again in a moment.',
    };
  }

  // WebSocket errors
  if (lower.includes('websocket')) {
    return {
      title: 'Connection Lost',
      body: 'We lost the connection briefly. Please check your internet — we\'ll reconnect automatically once it\'s stable.',
    };
  }

  // OTP errors
  if (lower.includes('otp') || lower.includes('verification')) {
    return {
      title: 'Verification Issue',
      body: 'We couldn\'t verify your number this time. Please double-check the code and try again. You can also request a new code below.',
    };
  }

  // Transcription errors
  if (lower.includes('transcri')) {
    return {
      title: 'Couldn\'t Hear You',
      body: 'We had trouble understanding your voice. Please try speaking again clearly in a quieter environment — the mic is ready.',
    };
  }

  // Parse errors from triage
  if (lower.includes('parse') || lower.includes('triage summary')) {
    return {
      title: 'Processing Issue',
      body: 'Something went wrong processing your results. We\'re retrying automatically — if it persists, you can type your symptoms instead.',
    };
  }

  // Payment errors
  if (lower.includes('payment') || lower.includes('pay') || lower.includes('momo') || lower.includes('mobile money')) {
    return {
      title: 'Payment Issue',
      body: 'We couldn\'t process your payment right now. Please check your mobile money balance and try again. Your booking is saved.',
    };
  }

  // Firestore / save errors
  if (lower.includes('save') || lower.includes('firestore') || lower.includes('firebase')) {
    return {
      title: 'Couldn\'t Save',
      body: 'We couldn\'t save your data just now. Please check your internet — your progress is safe and we\'ll retry automatically.',
    };
  }

  // Appointment / booking errors
  if (lower.includes('appointment') || lower.includes('booking')) {
    return {
      title: 'Booking Issue',
      body: 'We hit a snag with your booking. Don\'t worry — your session is saved. Please try again or return to your dashboard.',
    };
  }

  // Dashboard / load errors
  if (lower.includes('load') || lower.includes('fetch') || lower.includes('dashboard')) {
    return {
      title: 'Couldn\'t Load Data',
      body: 'We couldn\'t load your information right now. Please check your internet and pull down to refresh — your data is safe.',
    };
  }

  // PDF / download errors
  if (lower.includes('pdf') || lower.includes('download') || lower.includes('print') || lower.includes('share')) {
    return {
      title: 'Download Issue',
      body: 'We couldn\'t generate your document right now. Please try again — your medical summary is saved and you can download it anytime.',
    };
  }

  // Generic fallback — always friendly with a resolution
  return {
    title: fallbackTitle ?? 'Something Went Wrong',
    body: 'We ran into an unexpected issue, but our team is on it. Please try again — if this continues, restart the app or check your connection.',
  };
}
