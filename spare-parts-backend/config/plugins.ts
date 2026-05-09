import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',
      playgroundAlways: env.bool('GRAPHQL_PLAYGROUND', true),
      shadowCRUD: false,
      defaultLimit: 50,
      maxLimit: 200,
      apolloServer: {
        introspection: env.bool('GRAPHQL_INTROSPECTION', true),
      },
    },
  },
});

export default config;
