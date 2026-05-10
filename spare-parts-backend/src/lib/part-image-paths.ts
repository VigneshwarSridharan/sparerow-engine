/**
 * Public URL paths for part images served by Strapi (`public/parts/*`).
 * Keys mirror storefront/src/lib/partImages.ts PART_IMAGES (same part-type strings).
 */
export const PRIMARY_IMAGE_PATH_BY_PART_TYPE: Record<string, string> = {
  Battery: '/parts/battery.png',
  'Display / Folder': '/parts/display.png',
  'Charging / NFC Flex': '/parts/charging-port.png',
  'Back Panel': '/parts/back-panel.png',
  'Back Camera': '/parts/camera.png',
  'Front Camera': '/parts/front-camera.png',
  'Camera Lens': '/parts/camera-lens.png',
  'Ringer / Speaker': '/parts/speaker.png',
  Housing: '/parts/housing.png',
  'Housing with Spare Parts': '/parts/housing.png',
  'Middle Frame': '/parts/housing.png',
  'SIM Tray': '/parts/sim-tray.png',
  'Fingerprint Sensor': '/parts/fingerprint.png',
  'On/Off Flex': '/parts/on-off-flex.png',
  'Volume Flex': '/parts/volume-flex.png',
  'Main Flex': '/parts/on-off-flex.png',
  Other: '/parts/charging-port.png',
};

export function primaryImagePathForPartType(partType: string | undefined): string {
  if (!partType) return PRIMARY_IMAGE_PATH_BY_PART_TYPE.Other;
  return PRIMARY_IMAGE_PATH_BY_PART_TYPE[partType] ?? PRIMARY_IMAGE_PATH_BY_PART_TYPE.Other;
}
