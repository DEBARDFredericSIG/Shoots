import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { CameraHandle, CameraSectionProps } from './CameraSection.types';

// Convertit le focusMode en paramètres CameraView
// focusDistance : 0 = infini, 1 = très proche
function toFocusProps(mode?: string) {
  if (mode === 'infinity')      return { autofocus: 'off' as const, focusDepth: 0 };
  if (mode === 'near-infinity') return { autofocus: 'off' as const, focusDepth: 0.05 };
  return { autofocus: 'on' as const };  // hyperfocal → autofocus
}

const CameraSection = forwardRef<CameraHandle, CameraSectionProps>(
  function CameraSection(
    { fallback, runningOverlay, isRunning, onPermissionGranted, modeColor, idleBadgeText, appliedExposure },
    ref,
  ) {
    const colors = useColors();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [mediaGranted, setMediaGranted] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    const focusProps = toFocusProps(appliedExposure?.focusMode);

    // Request media permission safely — avoids AUDIO crash in Expo Go by catching it
    const requestMediaSafe = async () => {
      try {
        const result = await MediaLibrary.requestPermissionsAsync();
        setMediaGranted(result.granted);
      } catch {
        // expo-media-library v18+ crashes in Expo Go due to AUDIO permission not in manifest.
        // In a proper APK build (eas build) this works correctly.
        setMediaGranted(false);
      }
    };

    useEffect(() => {
      if (cameraPermission?.granted) {
        onPermissionGranted?.();
        requestMediaSafe();
      }
    }, [cameraPermission?.granted]);

    // Expose takePicture to parent
    useImperativeHandle(ref, () => ({
      takePicture: async () => {
        if (!cameraRef.current || !cameraPermission?.granted) return null;
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.92,
            exif: true,
            skipProcessing: true,
          });
          if (photo?.uri && mediaGranted) {
            // Fire-and-forget: save to "Eclipse Cam" album without blocking sequence
            const uri = photo.uri;
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
          return photo?.uri ?? null;
        } catch {
          return null;
        }
      },
    }));

    // Permission not yet granted
    if (!cameraPermission?.granted) {
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
              onPress={async () => {
                const result = await requestCameraPermission();
                if (result.granted) onPermissionGranted?.();
              }}
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
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          flash="off"
          iso={appliedExposure?.iso}
          {...focusProps}
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
