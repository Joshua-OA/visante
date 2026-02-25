export default ({ config }) => ({
  ...config,
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    vapiPublicKey: process.env.VAPI_PUBLIC_KEY ?? '',
  },
});
