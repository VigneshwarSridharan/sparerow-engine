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

const PART_IMAGES: Record<string, string> = {
  'Battery': batteryImg,
  'Display / Folder': displayImg,
  'Charging / NFC Flex': chargingPortImg,
  'Back Panel': backPanelImg,
  'Back Camera': cameraImg,
  'Front Camera': frontCameraImg,
  'Camera Lens': cameraLensImg,
  'Ringer / Speaker': speakerImg,
  'Housing': housingImg,
  'Housing with Spare Parts': housingImg,
  'Middle Frame': housingImg,
  'SIM Tray': simTrayImg,
  'Fingerprint Sensor': fingerprintImg,
  'On/Off Flex': onOffFlexImg,
  'Volume Flex': volumeFlexImg,
  'Main Flex': onOffFlexImg,
  'Other': chargingPortImg,
};

export function getPartImage(partType: string): string | undefined {
  return PART_IMAGES[partType];
}
