import type { ReactNode, Ref } from 'react';
import type { FocusMode } from '@/context/AppContext';

export type CameraHandle = {
  takePicture: () => Promise<string | null>;
};

/** Paramètres d'exposition appliqués réellement à la caméra */
export type AppliedExposure = {
  iso: number;
  shutterSpeed: string; // ex. "1/1000", "2s"
  focusMode: FocusMode;
};

export type CameraSectionProps = {
  /** React 19 — ref passé comme prop ordinaire (pas forwardRef) */
  ref?: Ref<CameraHandle | null>;
  fallback: ReactNode;
  runningOverlay?: ReactNode;
  isRunning: boolean;
  onPermissionGranted?: () => void;
  modeColor: string;
  idleBadgeText?: string;
  /** Réglages de l'étape courante appliqués à la caméra (ISO, vitesse, focus) */
  appliedExposure?: AppliedExposure;
};
