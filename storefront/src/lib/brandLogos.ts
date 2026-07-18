/**
 * Brand logos, sourced from Simple Icons (simpleicons.org, CC0) and Wikimedia Commons
 * official logo files, bundled under `src/assets/brands/`. Keyed by brand slug. Brands
 * without a reliably-sourced logo (e.g. house/regional brands) intentionally have no
 * entry here — callers should fall back to a text/letter avatar for those.
 */
import apple from '@/assets/brands/apple-logo.svg';
import samsung from '@/assets/brands/samsung-logo.svg';
import xiaomi from '@/assets/brands/xiaomi-logo.svg';
import oneplus from '@/assets/brands/oneplus-logo.svg';
import oppo from '@/assets/brands/oppo-logo.svg';
import vivo from '@/assets/brands/vivo-logo.svg';
import motorola from '@/assets/brands/motorola-logo.svg';
import nokia from '@/assets/brands/nokia-logo.svg';
import google from '@/assets/brands/google-logo.svg';
import asus from '@/assets/brands/asus-logo.svg';
import lg from '@/assets/brands/lg-logo.svg';
import honor from '@/assets/brands/honor-logo.svg';
import jio from '@/assets/brands/jio-logo.svg';
import redmi from '@/assets/brands/redmi-logo.svg';
import poco from '@/assets/brands/poco-logo.svg';
import realme from '@/assets/brands/realme-logo.svg';
import infinix from '@/assets/brands/infinix-logo.svg';
import tecno from '@/assets/brands/tecno-logo.svg';
import itel from '@/assets/brands/itel-logo.svg';
import iqoo from '@/assets/brands/iqoo-logo.svg';
import lava from '@/assets/brands/lava-logo.svg';
import karbonn from '@/assets/brands/karbonn-logo.svg';
import micromax from '@/assets/brands/micromax-logo.svg';

export const BRAND_LOGO_BY_SLUG: Record<string, string> = {
  apple,
  samsung,
  xiaomi,
  oneplus,
  oppo,
  vivo,
  motorola,
  nokia,
  google,
  asus,
  lg,
  honor,
  jio,
  redmi,
  poco,
  realme,
  infinix,
  tecno,
  itel,
  iqoo,
  lava,
  karbonn,
  micromax,
};

export function getBrandLogo(slug: string | undefined | null): string | undefined {
  if (!slug) return undefined;
  return BRAND_LOGO_BY_SLUG[slug.toLowerCase()];
}
