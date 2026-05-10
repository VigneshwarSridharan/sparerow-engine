import { getPartImage } from '@/lib/partImages';

/** Strapi API origin (same host as GraphQL without `/graphql`). */
export function getStrapiOrigin(): string {
  const endpoint = import.meta.env.VITE_STOREFRONT_GRAPHQL_ENDPOINT ?? 'http://localhost:1337/graphql';
  try {
    return new URL(endpoint).origin;
  } catch {
    return 'http://localhost:1337';
  }
}

/** Prefer catalog image from Strapi (`/parts/...`); fallback to bundled partImages map. */
export function resolveProductImageUrl(
  primaryImageUrl: string | null | undefined,
  partType: string
): string {
  if (primaryImageUrl) {
    return `${getStrapiOrigin()}${primaryImageUrl}`;
  }
  return getPartImage(partType) ?? '/placeholder.svg';
}
