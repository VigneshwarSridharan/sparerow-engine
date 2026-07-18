import { BRANDS, CATEGORY_RULES, HOUSE_BRANDS, UNCATEGORIZED, slugify } from './product-import-taxonomy';

export interface ParsedModelRef {
  brandSlug: string;
  brandName: string;
  modelSlug: string;
  modelName: string;
}

export interface ParsedItemName {
  categorySlug: string;
  categoryName: string;
  models: ParsedModelRef[]; // models[0] is the primary/display model
  isHouseBrand: boolean;
  warnings: string[];
}

// Parenthetical/bracketed noise that isn't part of the brand/model text:
// grade markers, RAM+storage combos, colors, "100% OG" style qualifiers.
const NOISE_PATTERNS: RegExp[] = [
  /\(\s*100%\s*OG[^)]*\)/gi,
  /\(\s*(?:UV|GX|KD|OG|Copy|Care\s*OG|Service\s*Pack)\s*\)/gi,
  /\(\s*\d+\s*\/\s*\d+\s*\)/g, // (3/64) RAM/storage
  /\[[^\]]*\]/g, // [White], [Pondicherry Blue]
];

function stripNoise(text: string): string {
  let out = text;
  for (const pattern of NOISE_PATTERNS) {
    out = out.replace(pattern, ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

function detectCategory(rawName: string): { slug: string; name: string; matchedText: string } {
  for (const rule of CATEGORY_RULES) {
    const match = rawName.match(rule.pattern);
    if (match) {
      return { slug: rule.slug, name: rule.name, matchedText: match[0] };
    }
  }
  return { slug: UNCATEGORIZED.slug, name: UNCATEGORIZED.name, matchedText: '' };
}

function matchBrandAtStart(segment: string): { brand: (typeof BRANDS)[number]; rest: string; consumed: boolean } | null {
  for (const brand of BRANDS) {
    for (const kw of brand.keywords) {
      const re = new RegExp(`^${kw.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = segment.match(re);
      if (match) {
        const rest = kw.strip ? segment.slice(match[0].length).trim() : segment.trim();
        return { brand, rest, consumed: kw.strip };
      }
    }
  }
  return null;
}

export function parseItemName(rawItemName: string): ParsedItemName {
  const warnings: string[] = [];
  const name = String(rawItemName || '').replace(/\s+/g, ' ').trim();

  const category = detectCategory(name);
  if (category.slug === UNCATEGORIZED.slug) warnings.push('no-category-detected');

  // Remove the matched category phrase (first occurrence only) then strip other noise.
  const withoutCategory = category.matchedText ? name.replace(category.matchedText, ' ') : name;
  const compatibilityClause = stripNoise(withoutCategory);

  const segments = compatibilityClause
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  const models: ParsedModelRef[] = [];
  const seen = new Set<string>();
  let currentBrand: (typeof BRANDS)[number] | null = null;
  let isHouseBrand = false;

  for (const segment of segments) {
    const houseBrandMatch = [...HOUSE_BRANDS].find((hb) =>
      new RegExp(`^${hb}\\b`, 'i').test(segment)
    );
    if (houseBrandMatch) {
      isHouseBrand = true;
      continue; // house-brand generic accessories don't get a phone model
    }

    const matched = matchBrandAtStart(segment);
    let modelText: string;
    if (matched) {
      currentBrand = matched.brand;
      modelText = matched.rest;
    } else if (currentBrand) {
      modelText = segment;
    } else {
      warnings.push(`no-brand-for-segment:${segment}`);
      continue;
    }

    if (!modelText) continue;
    const modelSlug = slugify(modelText);
    if (!modelSlug) continue;
    const key = `${currentBrand.slug}::${modelSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    models.push({
      brandSlug: currentBrand.slug,
      brandName: currentBrand.name,
      modelSlug,
      modelName: modelText,
    });
  }

  if (models.length === 0 && !isHouseBrand) warnings.push('no-model-detected');

  return {
    categorySlug: category.slug,
    categoryName: category.name,
    models,
    isHouseBrand,
    warnings,
  };
}
