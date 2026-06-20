import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type PermissionStateNative = {
  overlayGranted: boolean;
};

export type OcrResultNative = {
  rawText: string;
};

export interface Spec extends TurboModule {
  getPermissionState(): Promise<PermissionStateNative>;
  requestOverlayPermission(): Promise<PermissionStateNative>;
  showTopHint(message: string): Promise<void>;
  startScreenCaptureSession(): Promise<void>;
  recognizeCurrentScreen(): Promise<OcrResultNative>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AssistantBridge');
