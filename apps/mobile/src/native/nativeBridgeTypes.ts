export type PermissionState = {
  overlayGranted: boolean;
  screenCaptureGranted: boolean;
};

export type OcrResult = {
  rawText: string;
};

export type NativeBridge = {
  getPermissionState(): Promise<PermissionState>;
  startScreenCaptureSession(): Promise<void>;
  recognizeCurrentScreen(): Promise<OcrResult>;
  showTopHint(message: string): Promise<void>;
};
