import batteryImg from '@/assets/parts/battery.png';
import displayImg from '@/assets/parts/display.png';
import chargingPortImg from '@/assets/parts/charging-port.png';
import backPanelImg from '@/assets/parts/back-panel.png';
import cameraImg from '@/assets/parts/camera.png';
import frontCameraImg from '@/assets/parts/front-camera.png';
import cameraLensImg from '@/assets/parts/camera-lens.png';
import speakerImg from '@/assets/parts/speaker.png';
import housingImg from '@/assets/parts/housing.png';
import simTrayImg from '@/assets/parts/sim-tray.png';
import fingerprintImg from '@/assets/parts/fingerprint.png';
import onOffFlexImg from '@/assets/parts/on-off-flex.png';
import volumeFlexImg from '@/assets/parts/volume-flex.png';
import { mediaFilenameForPartType } from '@/lib/partTypeMediaFiles';

const IMAGE_BY_FILENAME: Record<string, string> = {
  'battery.png': batteryImg,
  'display.png': displayImg,
  'charging-port.png': chargingPortImg,
  'back-panel.png': backPanelImg,
  'camera.png': cameraImg,
  'front-camera.png': frontCameraImg,
  'camera-lens.png': cameraLensImg,
  'speaker.png': speakerImg,
  'housing.png': housingImg,
  'sim-tray.png': simTrayImg,
  'fingerprint.png': fingerprintImg,
  'on-off-flex.png': onOffFlexImg,
  'volume-flex.png': volumeFlexImg,
};

export function getPartImage(partType: string): string | undefined {
  const filename = mediaFilenameForPartType(partType);
  return IMAGE_BY_FILENAME[filename];
}
