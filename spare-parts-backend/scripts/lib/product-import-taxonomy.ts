/**
 * Editable dictionaries used by parse-item-name.ts to turn free-text billing-software
 * item names into (brand, model, category) structure. Refine these based on the
 * --dry-run CSV output — this is expected to be an iterative process.
 */

export function slugify(value: string, fallback = ''): string {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export interface BrandKeyword {
  /** Text to match at the start of a compatibility segment (word-boundary, case-insensitive). */
  keyword: string;
  /** Whether to strip this keyword from the remaining text once matched (false keeps it as part of the model name, e.g. "iPhone"). */
  strip: boolean;
}

export interface BrandDef {
  name: string;
  slug: string;
  keywords: BrandKeyword[];
}

// Ordered roughly by frequency in the Indian mobile-repair spare-parts market.
// Longer/more-specific keywords should come before shorter ones that could be prefixes.
export const BRANDS: BrandDef[] = [
  { name: 'Samsung', slug: 'samsung', keywords: [{ keyword: 'Samsung', strip: true }] },
  {
    name: 'Apple',
    slug: 'apple',
    keywords: [
      { keyword: 'Apple', strip: true },
      { keyword: 'iPhone', strip: false },
      { keyword: 'Airpods', strip: false },
      { keyword: 'iPad', strip: false },
    ],
  },
  { name: 'Vivo', slug: 'vivo', keywords: [{ keyword: 'Vivo', strip: true }] },
  { name: 'Oppo', slug: 'oppo', keywords: [{ keyword: 'Oppo', strip: true }] },
  { name: 'Redmi', slug: 'redmi', keywords: [{ keyword: 'Redmi', strip: true }] },
  {
    name: 'Mi',
    slug: 'mi',
    keywords: [
      { keyword: 'Mi', strip: true },
      { keyword: 'Xiaomi', strip: true },
    ],
  },
  { name: 'Poco', slug: 'poco', keywords: [{ keyword: 'Poco', strip: true }] },
  {
    name: 'Realme',
    slug: 'realme',
    keywords: [
      { keyword: 'Realme', strip: true },
      { keyword: 'Narzo', strip: false },
    ],
  },
  {
    name: 'OnePlus',
    slug: 'oneplus',
    keywords: [
      { keyword: 'OnePlus', strip: true },
      { keyword: 'Oneplus', strip: true },
      { keyword: 'One Plus', strip: true },
    ],
  },
  { name: 'Infinix', slug: 'infinix', keywords: [{ keyword: 'Infinix', strip: true }] },
  { name: 'Tecno', slug: 'tecno', keywords: [{ keyword: 'Tecno', strip: true }] },
  { name: 'Itel', slug: 'itel', keywords: [{ keyword: 'Itel', strip: true }] },
  { name: 'Nothing', slug: 'nothing', keywords: [{ keyword: 'Nothing', strip: true }] },
  { name: 'Nokia', slug: 'nokia', keywords: [{ keyword: 'Nokia', strip: true }] },
  {
    name: 'Motorola',
    slug: 'motorola',
    keywords: [
      { keyword: 'Motorola', strip: true },
      { keyword: 'Moto', strip: true },
    ],
  },
  { name: 'Honor', slug: 'honor', keywords: [{ keyword: 'Honor', strip: true }] },
  { name: 'iQOO', slug: 'iqoo', keywords: [{ keyword: 'iQOO', strip: true }] },
  { name: 'Micromax', slug: 'micromax', keywords: [{ keyword: 'Micromax', strip: true }] },
  { name: 'Lava', slug: 'lava', keywords: [{ keyword: 'Lava', strip: true }] },
  { name: 'Karbonn', slug: 'karbonn', keywords: [{ keyword: 'Karbonn', strip: true }] },
  { name: 'Gionee', slug: 'gionee', keywords: [{ keyword: 'Gionee', strip: true }] },
  { name: 'Asus', slug: 'asus', keywords: [{ keyword: 'Asus', strip: true }] },
  {
    name: 'Google',
    slug: 'google',
    keywords: [
      { keyword: 'Google', strip: true },
      { keyword: 'Pixel', strip: false },
    ],
  },
  { name: 'LG', slug: 'lg', keywords: [{ keyword: 'LG', strip: true }] },
  { name: 'Coolpad', slug: 'coolpad', keywords: [{ keyword: 'Coolpad', strip: true }] },
  { name: 'Huawei', slug: 'huawei', keywords: [{ keyword: 'Huawei', strip: true }] },
  { name: 'Sony', slug: 'sony', keywords: [{ keyword: 'Sony', strip: true }] },
  { name: 'HTC', slug: 'htc', keywords: [{ keyword: 'HTC', strip: true }] },
  { name: 'ZTE', slug: 'zte', keywords: [{ keyword: 'ZTE', strip: true }] },
  { name: 'Alcatel', slug: 'alcatel', keywords: [{ keyword: 'Alcatel', strip: true }] },
  { name: 'Meizu', slug: 'meizu', keywords: [{ keyword: 'Meizu', strip: true }] },
  { name: 'BlackBerry', slug: 'blackberry', keywords: [{ keyword: 'BlackBerry', strip: true }] },
  { name: 'Intex', slug: 'intex', keywords: [{ keyword: 'Intex', strip: true }] },
  { name: 'Celkon', slug: 'celkon', keywords: [{ keyword: 'Celkon', strip: true }] },
  { name: 'Spice', slug: 'spice', keywords: [{ keyword: 'Spice', strip: true }] },
  { name: 'Panasonic', slug: 'panasonic', keywords: [{ keyword: 'Panasonic', strip: true }] },
  { name: 'Jio', slug: 'jio', keywords: [{ keyword: 'Jio', strip: true }] },
  { name: 'Lyf', slug: 'lyf', keywords: [{ keyword: 'Lyf', strip: true }] },
];

// House brands: generic accessories that never carry a specific phone model.
export const HOUSE_BRANDS = new Set(['bolte'].map((s) => s.toLowerCase()));

export interface CategoryRule {
  slug: string;
  name: string;
  pattern: RegExp;
}

// Order matters: more specific / longer phrases first so they win over generic substrings
// (e.g. "Battery Back Cover" must be checked before "Back Cover" and before "Battery").
export const CATEGORY_RULES: CategoryRule[] = [
  { slug: 'battery-back-cover', name: 'Battery Back Cover', pattern: /battery\s*back\s*cover/i },
  {
    slug: 'tempered-glass',
    name: 'Tempered Glass',
    pattern: /(?:\d{1,2}D\s+|2\.5D\s+|HD\s+|UV\s+)*(?:temper(?:ed)?\s*glass|privacy\s*glass|screen\s*guard)/i,
  },
  { slug: 'glass-with-oca', name: 'Display Glass with OCA', pattern: /glass\s*with\s*oca/i },
  { slug: 'flip-cover', name: 'Flip Cover', pattern: /flip\s*cover/i },
  { slug: 'back-cover', name: 'Back Cover', pattern: /back\s*(?:cover|panel|door)/i },
  { slug: 'service-pack', name: 'Service Pack', pattern: /service\s*pack/i },
  { slug: 'cc-board', name: 'Motherboard / CC Board', pattern: /\bcc\s*board\b|mother\s*board|\bpcb\b|\bic\s*board\b/i },
  { slug: 'charging-port', name: 'Charging Port', pattern: /charg(?:ing)?\s*(?:port|connector)/i },
  { slug: 'charger', name: 'Charger', pattern: /charger/i },
  { slug: 'sim-tray', name: 'Sim Tray', pattern: /sim\s*(?:card\s*)?tray/i },
  { slug: 'flex-cable', name: 'Flex Cable', pattern: /(?:on[- ]?off|power|volume|network)?\s*flex(?:\s*cable)?/i },
  { slug: 'display', name: 'Display', pattern: /\b(?:lcd|display|touch|folder|combo)\b/i },
  { slug: 'camera', name: 'Camera', pattern: /camera/i },
  { slug: 'speaker', name: 'Speaker', pattern: /(?:loud\s*|ear\s*|ringer\s*)?speaker/i },
  { slug: 'microphone', name: 'Microphone', pattern: /\bmic(?:rophone)?\b/i },
  { slug: 'vibrator-motor', name: 'Vibrator Motor', pattern: /vibrat(?:or|ion)(?:\s*motor)?/i },
  { slug: 'frame', name: 'Frame', pattern: /\bframe\b/i },
  { slug: 'housing', name: 'Housing', pattern: /\bhousing\b/i },
  { slug: 'bezel', name: 'Bezel', pattern: /\bbezel\b/i },
  { slug: 'antenna', name: 'Antenna', pattern: /\bantenna\b/i },
  { slug: 'home-button', name: 'Home Button', pattern: /home\s*button/i },
  { slug: 'buttons-keys', name: 'Buttons / Keys', pattern: /(?:power|volume|side)\s*(?:button|key)|\bout\s*key\b/i },
  { slug: 'fingerprint-sensor', name: 'Fingerprint Sensor', pattern: /finger\s*print(?:\s*sensor)?/i },
  { slug: 'battery', name: 'Battery', pattern: /\bbattery\b/i },
  { slug: 'earphones', name: 'Earphones', pattern: /\bear(?:pods|phones?|buds)\b|headphone|airdopes|\btws\b/i },
  { slug: 'memory-card', name: 'Memory Card', pattern: /\b(?:sd|memory)\s*card\b/i },
  { slug: 'cable', name: 'Cable', pattern: /\bcable\b/i },
  { slug: 'otg-adapter', name: 'OTG / Adapter', pattern: /\botg\b|adapter|connector|splitter/i },
  { slug: 'tools', name: 'Tools', pattern: /tool\s*kit|screw\s*driver|\bdriver\b/i },
  { slug: 'adhesive', name: 'Adhesive', pattern: /adhesive|\btape\b|\bpaste\b|\bglue\b/i },
  { slug: 'stylus', name: 'Stylus', pattern: /stylus|\bpen\b/i },
  // Lowest priority: India repair-market grade codes (UV/GX/KD/...) that appear alone
  // almost always denote a graded display/folder assembly with no other category keyword.
  {
    slug: 'display-grade-part',
    name: 'Display (graded)',
    pattern: /\((?:UV|GX|KD|WD|KDM|HIKO|CROWN|CHECK\s*MATE)\)/i,
  },
];

export const UNCATEGORIZED = { slug: 'uncategorized', name: 'Uncategorized' };
