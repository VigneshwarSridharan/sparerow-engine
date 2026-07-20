import * as Sentry from '@sentry/react';

const GRAPHQL_ENDPOINT =
  import.meta.env.VITE_STOREFRONT_GRAPHQL_ENDPOINT ?? 'http://localhost:1337/graphql';

export type GraphQLErrorShape = {
  message: string;
  extensions?: {
    code?: string;
    details?: unknown;
    http?: { status?: number };
  };
};

export class StorefrontGraphQLError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly status?: number;

  constructor(error: GraphQLErrorShape) {
    super(error.message);
    this.name = 'StorefrontGraphQLError';
    this.code = error.extensions?.code;
    this.details = error.extensions?.details;
    this.status = error.extensions?.http?.status;
  }
}

export async function graphqlRequest<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
  token?: string
): Promise<TData> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as {
    data?: TData;
    errors?: GraphQLErrorShape[];
  };

  if (!response.ok) {
    const first = payload.errors?.[0];
    const error = first ? new StorefrontGraphQLError(first) : new Error(`GraphQL request failed with status ${response.status}`);
    Sentry.captureException(error, { extra: { query, variables } });
    throw error;
  }

  if (payload.errors?.length) {
    const error = new StorefrontGraphQLError(payload.errors[0]);
    Sentry.captureException(error, { extra: { query, variables } });
    throw error;
  }

  if (!payload.data) {
    const error = new Error('GraphQL response did not include data');
    Sentry.captureException(error, { extra: { query, variables } });
    throw error;
  }

  return payload.data;
}
