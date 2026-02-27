export default ({ config }) => ({
  ...config,
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    vapiPublicKey: process.env.VAPI_PUBLIC_KEY ?? '',
    ghananlpApiKey: process.env.GHANANLP_API_KEY ?? '',
    wsAudioProxyUrl: process.env.WS_AUDIO_PROXY_URL ?? '',
    // Firebase — set these in your .env file
    firebaseApiKey: process.env.FIREBASE_API_KEY ?? '',
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
    firebaseAppId: process.env.FIREBASE_APP_ID ?? '',
  },
});
