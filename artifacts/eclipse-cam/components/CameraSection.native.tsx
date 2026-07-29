import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import {
  Camera,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
} from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { CameraHandle, CameraSectionProps } from './CameraSection.types';

// ── Shutter speed string → seconds ──────────────────────────────────────────
// "1/1000" → 0.001   "1/500" → 0.002   "2s" → 2   "30s" → 30
function parseShutter(s: string): number {
  if (!s) return 1 / 125;
  const trimmed = s.trim();
  if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/').map(Number);
    if (isNaN(num) || isNaN(den) || den === 0) return 1 / 125;
    return num / den;
  }
  const val = parseFloat(trimmed.replace(/s$/i, ''));
  return isNaN(val) ? 1 / 125 : val;
}

// EV bias relative to 1/125 s (neutral daylight reference)
// Negative = faster/darker, positive = slower/brighter
function shutterToEV(shutterSpeed: string): number {
  const target = parseShutter(shutterSpeed);
  const reference = 1 / 125;
  const ev = Math.log2(target / reference);
  // Clamp to typical device range ±8
  return Math.max(-8, Math.min(8, ev));
}

// ── Component ────────────────────────────────────────────────────────────────

const CameraSection = forwardRef<CameraHandle, CameraSectionProps>(
  function CameraSection(
    { fallback, runningOverlay, isRunning, onPermissionGranted, modeColor, idleBadgeText, appliedExposure },
    ref,
  ) {
    const colors = useColors();
    const { width: screenW, height: screenH } = useWindowDimensions();
    const { hasPermission, requestPermission } = useCameraPermission();
    const [mediaGranted, setMediaGranted] = useState(false);
    const cameraRef = useRef<CameraRef>(null);

    // Photo output — connected to <Camera outputs={[photoOutput]} />
    const photoOutput = usePhotoOutput({ quality: 0.92, containerFormat: 'jpeg' });

    // EV bias derived from shutter speed (pushes auto-exposure toward target)
    const evBias = appliedExposure ? shutterToEV(appliedExposure.shutterSpeed) : 0;

    // Media library permission (safe — fails silently in Expo Go)
    useEffect(() => {
      if (hasPermission) {
        onPermissionGranted?.();
        MediaLibrary.requestPermissionsAsync()
          .then(r => setMediaGranted(r.granted))
          .catch(() => setMediaGranted(false));
      }
    }, [hasPermission]);

    // Apply focus when step changes
    useEffect(() => {
      const cam = cameraRef.current;
      if (!cam || !appliedExposure) return;
      const mode = appliedExposure.focusMode;
      if (mode === 'infinity') {
        // Focus to top-center (sky/infinity) and lock
        cam.focusTo(
          { x: screenW / 2, y: screenH * 0.12 },
          { adaptiveness: 'locked', autoResetAfter: null },
        ).catch(() => {});
      } else if (mode === 'near-infinity') {
        // Focus to center and lock
        cam.focusTo(
          { x: screenW / 2, y: screenH * 0.35 },
          { adaptiveness: 'locked', autoResetAfter: null },
        ).catch(() => {});
      } else {
        // hyperfocal → continuous autofocus
        cam.resetFocus().catch(() => {});
      }
    }, [appliedExposure?.focusMode, screenW, screenH]);

    // Expose takePicture to sequence controller
    useImperativeHandle(ref, () => ({
      takePicture: async () => {
        if (!hasPermission) return null;
        try {
          const file = await photoOutput.capturePhotoToFile(
            { flashMode: 'off' },
            {},
          );
          const uri = `file://${file.filePath}`;
          if (mediaGranted) {
            // Fire-and-forget: save to "Eclipse Cam" album
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

    // Permission not yet granted
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

    return (
      <View style={styles.root}>
        {/* VisionCamera viewfinder
            - exposure: EV bias calculé depuis la vitesse d'obturation de l'étape
            - outputs: photoOutput pour capturePhotoToFile()
            La mise au point (focus) est appliquée via ref.focusTo() / ref.resetFocus()
            quand l'étape change (useEffect ci-dessus).
        */}
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device="back"
          isActive={true}
          outputs={[photoOutput]}
          exposure={evBias}
        />

        {/* Running overlay */}
        {isRunning && runningOverlay && (
          <View style={styles.runningOverlay}>{runningOverlay}</View>
        )}

        {/* Idle overlay — crosshair + badge */}
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
  },
);

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
