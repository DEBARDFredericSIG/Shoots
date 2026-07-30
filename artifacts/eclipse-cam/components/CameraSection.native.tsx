/**
 * CameraSection — implémentation native (Android/iOS)
 *
 * Utilise react-native-vision-camera v5 pour accéder au Camera2 API Android :
 * - setExposureLocked(durationSec, iso) : temps de pose ET ISO réels
 * - focusTo({ x, y }, { adaptiveness: 'locked' }) : mise au point infini verrouillée
 * - resetFocus() : autofocus continu (mode hyperfocal)
 *
 * La clé de l'architecture : <Camera ref={cameraRef} ... /> expose
 * `(ref.current as any).controller` qui donne le CameraController complet,
 * incluant setExposureLocked — non exposé dans les types TypeScript mais
 * présent à l'exécution (confirmé dans Camera.js v5.2.0).
 */
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import {
  Camera,
  usePhotoOutput,
  useCameraPermission,
  type CameraRef,
  type CameraController,
} from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { CameraHandle, CameraSectionProps } from './CameraSection.types';

// ── Parseur vitesse d'obturation ─────────────────────────────────────────────
// "1/1000" → 0.001   "1/500" → 0.002   "2s" → 2   "30s" → 30
function parseShutter(s: string): number {
  if (!s) return 1 / 125;
  const t = s.trim();
  if (t.includes('/')) {
    const [num, den] = t.split('/').map(Number);
    if (isNaN(num) || isNaN(den) || den === 0) return 1 / 125;
    return num / den;
  }
  const val = parseFloat(t.replace(/s$/i, ''));
  return isNaN(val) ? 1 / 125 : val;
}

// Accède au CameraController complet via le getter `controller` du ref Camera.
// (non exposé dans les types TS de CameraRef mais présent à l'exécution)
function getController(ref: React.RefObject<CameraRef | null>): CameraController | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ref.current as any)?.controller as CameraController | undefined;
}

// ── Composant ─────────────────────────────────────────────────────────────────

function CameraSection({
  ref,
  fallback,
  runningOverlay,
  isRunning,
  onPermissionGranted,
  modeColor,
  idleBadgeText,
  appliedExposure,
}: CameraSectionProps) {
  const colors = useColors();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaGranted, setMediaGranted] = useState(false);

  // ref vers le composant Camera VisionCamera v5
  const cameraRef = useRef<CameraRef>(null);

  // sortie photo connectée via outputs prop sur <Camera>
  const photoOutput = usePhotoOutput({ quality: 0.92, containerFormat: 'jpeg' });

  // ── Permissions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasPermission) {
      onPermissionGranted?.();
      MediaLibrary.requestPermissionsAsync()
        .then(r => setMediaGranted(r.granted))
        .catch(() => setMediaGranted(false));
    }
  }, [hasPermission]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exposition manuelle réelle (setExposureLocked) ───────────────────────
  // Appliquée à chaque changement d'étape de séquence.
  // setExposureLocked(durationSec, iso) → Camera2 MANUAL mode sur Android.
  useEffect(() => {
    if (!appliedExposure) return;

    const applyExposure = async () => {
      const ctrl = getController(cameraRef);
      if (!ctrl) return;

      try {
        // Vérifier si le device supporte le verrouillage d'exposition
        const device = ctrl.device;
        if (!device || !device.supportsExposureLocking) return;

        const targetDuration = parseShutter(appliedExposure.shutterSpeed);
        // Contraindre aux limites physiques du capteur
        const duration = Math.max(
          ctrl.minExposureDuration,
          Math.min(ctrl.maxExposureDuration, targetDuration),
        );
        const iso = Math.max(ctrl.minISO, Math.min(ctrl.maxISO, appliedExposure.iso));

        await ctrl.setExposureLocked(duration, iso);
      } catch {
        // Device non compatible → exposition automatique continue
      }
    };

    // Petit délai pour laisser le temps au controller d'être prêt après rendu
    const t = setTimeout(applyExposure, 150);
    return () => clearTimeout(t);
  }, [appliedExposure?.shutterSpeed, appliedExposure?.iso]);

  // ── Focus ────────────────────────────────────────────────────────────────
  // focusTo() utilise les coordonnées écran du PreviewView.
  // Le Camera ref convertit en MeteringPoint natif automatiquement.
  useEffect(() => {
    if (!appliedExposure) return;

    const applyFocus = async () => {
      const cam = cameraRef.current;
      if (!cam) return;
      try {
        if (appliedExposure.focusMode === 'infinity') {
          // Coin supérieur du viseur → infini (ciel, horizon)
          await cam.focusTo(
            { x: screenW / 2, y: screenH * 0.1 },
            { adaptiveness: 'locked', autoResetAfter: null },
          );
        } else if (appliedExposure.focusMode === 'near-infinity') {
          await cam.focusTo(
            { x: screenW / 2, y: screenH * 0.3 },
            { adaptiveness: 'locked', autoResetAfter: null },
          );
        } else {
          // hyperfocal → autofocus continu
          await cam.resetFocus();
        }
      } catch {}
    };

    applyFocus();
  }, [appliedExposure?.focusMode, screenW, screenH]);

  // ── takePicture exposé au contrôleur de séquence ─────────────────────────
  useImperativeHandle(ref, () => ({
    takePicture: async () => {
      if (!hasPermission) return null;
      try {
        const file = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
        const uri = `file://${file.filePath}`;
        if (mediaGranted) {
          // Sauvegarde dans l'album "Eclipse Cam" (fire-and-forget)
          MediaLibrary.createAssetAsync(uri)
            .then(async asset => {
              const album = await MediaLibrary.getAlbumAsync('Eclipse Cam');
              if (!album) {
                await MediaLibrary.createAlbumAsync('Eclipse Cam', asset, false);
              } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              }
            })
            .catch(() => {});
        }
        return uri;
      } catch {
        return null;
      }
    },
  }));

  // ── Écran de permission ───────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.root}>
        <View style={[styles.permCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons
            name="camera-off"
            size={32}
            color={colors.mutedForeground}
            style={{ marginBottom: 10 }}
          />
          <Text style={[styles.permTitle, { color: colors.foreground }]}>Accès caméra requis</Text>
          <Text style={[styles.permDesc, { color: colors.mutedForeground }]}>
            Pour afficher le viseur en direct et capturer les photos automatiquement.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.permBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={requestPermission}
          >
            <Text style={[styles.permBtnText, { color: colors.primaryForeground }]}>
              Autoriser la caméra
            </Text>
          </Pressable>
        </View>
        {fallback}
      </View>
    );
  }

  // ── Viseur ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/*
        <Camera> de VisionCamera v5 :
        - Gère session, preview et outputs en interne via useCamera()
        - outputs={[photoOutput]} connecte la sortie photo pour capturePhotoToFile()
        - ref → accès à focusTo, resetFocus (CameraRef) et controller (getter runtime)
        - Pas de prop iso/shutter ici : contrôle via controller.setExposureLocked()
      */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device="back"
        isActive={true}
        outputs={[photoOutput]}
      />

      {/* Overlay séquence en cours */}
      {isRunning && runningOverlay && (
        <View style={styles.runningOverlay}>{runningOverlay}</View>
      )}

      {/* Overlay repos — réticule + badge */}
      {!isRunning && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.crosshairWrap}>
            <View style={[styles.crosshairH, { backgroundColor: modeColor + '99' }]} />
            <View style={[styles.crosshairV, { backgroundColor: modeColor + '99' }]} />
          </View>
          {idleBadgeText && (
            <View style={[styles.idleBadge, { borderColor: modeColor + '66' }]}>
              <Text style={[styles.idleBadgeText, { color: modeColor }]}>{idleBadgeText}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default CameraSection;

const styles = StyleSheet.create({
  root: { flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  runningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  crosshairWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairH: { position: 'absolute', width: 60, height: 1 },
  crosshairV: { position: 'absolute', width: 1, height: 60 },
  idleBadge: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  idleBadgeText: { fontSize: 13, fontWeight: '600' },
  permCard: {
    borderRadius: 16, borderWidth: 1,
    padding: 20, alignItems: 'center', gap: 8, marginBottom: 14,
  },
  permTitle: { fontSize: 15, fontWeight: '700' },
  permDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  permBtn: { marginTop: 8, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  permBtnText: { fontSize: 14, fontWeight: '700' },
});
