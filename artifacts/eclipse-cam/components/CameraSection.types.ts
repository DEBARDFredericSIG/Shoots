import type { ReactNode, RefObject } from 'react';
import type { FocusMode } from '@/context/AppContext';

export type CameraHandle = {
  takePicture: () => Promise<string | null>;
};

/** Paramètres d'exposition réellement applicables à la caméra */
export type AppliedExposure = {
  iso: number;
  focusMode: FocusMode;
  // shutterSpeed et aperture sont affichés mais non applicables via expo-camera
};

export type CameraSectionProps = {
  /** Ref forwarded so the parent can call takePicture() */
  cameraRef?: RefObject<CameraHandle | null>;
  /** Rendered when camera permission is missing or on web */
  fallback: ReactNode;
  /** Overlay rendered on top of the viewfinder while running */
  runningOverlay?: ReactNode;
  /** Whether the sequence is currently running */
  isRunning: boolean;
  /** Called after the component successfully requests & receives permission */
  onPermissionGranted?: () => void;
  /** Accent colour for the crosshair / idle badge */
  modeColor: string;
  /** Short label shown on the idle badge */
  idleBadgeText?: string;
  /** Paramètres de l'étape courante — appliqués réellement à la caméra (ISO + focus) */
  appliedExposure?: AppliedExposure;
};
