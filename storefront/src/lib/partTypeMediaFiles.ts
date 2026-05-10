/**
 * Basenames under `src/assets/parts/` — single source for:
 * - storefront `partImages.ts` (bundled assets)
 * - spare-parts-backend seed (Strapi media library uploads)
 *
 * Keys match `partImages.ts` / catalog part-type strings.
 */
export const PART_TYPE_MEDIA_FILENAME: Record<string, string> = {
  Battery: 'battery.png',
  'Display / Folder': 'display.png',
  'Charging / NFC Flex': 'charging-port.png',
  'Back Panel': 'back-panel.png',
  'Back Camera': 'camera.png',
  'Front Camera': 'front-camera.png',
  'Camera Lens': 'camera-lens.png',
  'Ringer / Speaker': 'speaker.png',
  Housing: 'housing.png',
  'Housing with Spare Parts': 'housing.png',
  'Middle Frame': 'housing.png',
  'SIM Tray': 'sim-tray.png',
  'Fingerprint Sensor': 'fingerprint.png',
  'On/Off Flex': 'on-off-flex.png',
  'Volume Flex': 'volume-flex.png',
  'Main Flex': 'on-off-flex.png',
  Other: 'charging-port.png',
};

export function mediaFilenameForPartType(partType: string | undefined): string {
  if (!partType) return PART_TYPE_MEDIA_FILENAME.Other;
  return PART_TYPE_MEDIA_FILENAME[partType] ?? PART_TYPE_MEDIA_FILENAME.Other;
}
