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

/** Prefer catalog image from Strapi media (`/uploads/...`); fallback to bundled partImages map. */
export function resolveProductImageUrl(
  primaryImageUrl: string | null | undefined,
  partType: string
): string {
  if (primaryImageUrl) {
    if (/^https?:\/\//i.test(primaryImageUrl)) {
      return primaryImageUrl;
    }
    const path = primaryImageUrl.startsWith('/') ? primaryImageUrl : `/${primaryImageUrl}`;
    return `${getStrapiOrigin()}${path}`;
  }
  return getPartImage(partType) ?? '/placeholder.svg';
}
