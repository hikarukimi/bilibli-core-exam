import {NativeBridge} from './nativeBridgeTypes';

const mockRawText = [
  '下列哪一部作品的主角是鲁路修？',
  'A 火影忍者',
  'B Code Geass 反叛的鲁路修',
  'C 银魂',
  'D CLANNAD',
].join('\n');

export const mockNativeBridge: NativeBridge = {
  async getPermissionState() {
    return {
      overlayGranted: true,
      screenCaptureGranted: true,
    };
  },
  async startScreenCaptureSession() {},
  async recognizeCurrentScreen() {
    return {
      rawText: mockRawText,
    };
  },
  async showTopHint() {},
};
