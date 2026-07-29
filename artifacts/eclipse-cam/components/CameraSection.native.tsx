import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { CameraHandle, CameraSectionProps } from './CameraSection.types';

const CameraSection = forwardRef<CameraHandle, CameraSectionProps>(
  function CameraSection(
    { fallback, runningOverlay, isRunning, onPermissionGranted, modeColor, idleBadgeText },
    ref,
  ) {
    const colors = useColors();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

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
          // Note: saving to gallery from Expo Go requires a development build
          // (expo-media-library v18+ is not compatible with Expo Go on Android)
          return photo?.uri ?? null;
        } catch {
          return null;
        }
      },
    }));

    // Permission not yet granted — show request card + static fallback below
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
              Pour afficher le viseur en direct pendant la séquence.
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
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash="off" />

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
