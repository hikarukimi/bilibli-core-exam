import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type PermissionStateNative = {
  overlayGranted: boolean;
  screenCaptureGranted: boolean;
};

export type OcrResultNative = {
  rawText: string;
};

export interface Spec extends TurboModule {
  getPermissionState(): Promise<PermissionStateNative>;
  requestOverlayPermission(): Promise<PermissionStateNative>;
  showTopHint(message: string): Promise<void>;
  // 占位：B 切片实现 MediaProjection 截屏会话
  startScreenCaptureSession(): Promise<void>;
  // 占位：B 切片实现 ML Kit 端侧 OCR
  recognizeCurrentScreen(): Promise<OcrResultNative>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AssistantBridge');
