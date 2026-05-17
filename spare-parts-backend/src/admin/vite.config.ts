import { mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig) => {
  // Keep local project alias and allow dynamic ngrok hosts for admin preview.
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      allowedHosts: true,
    },
  });
};
