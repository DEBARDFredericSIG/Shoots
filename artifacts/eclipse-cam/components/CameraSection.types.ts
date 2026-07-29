import type { ReactNode, RefObject } from 'react';

export type CameraHandle = {
  takePicture: () => Promise<string | null>;
};

export type CameraSectionProps = {
  /** Ref forwarded so the parent can call takePicture() */
  cameraRef?: RefObject<CameraHandle | null>;
  /** Rendered when camera permission is missing or on web */
  fallback: ReactNode;
  /** Overlay rendered on top of the viewfinder while running */
  runningOverlay?: ReactNode;
  /** Overlay rendered on top of the viewfinder while idle */
  idleOverlay?: ReactNode;
  /** Whether the sequence is currently running */
  isRunning: boolean;
  /** Called after the component successfully requests & receives permission */
  onPermissionGranted?: () => void;
  /** Accent colour for the crosshair / idle badge */
  modeColor: string;
  /** Short label shown on the idle badge */
  idleBadgeText?: string;
};
