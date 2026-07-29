/**
 * Web stub — camera is native-only.
 * On web the viewfinder is replaced by the static sequence info panel.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CameraSectionProps } from './CameraSection.types';

// Web stub — ref ignoré, la caméra est native uniquement
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CameraSection({ fallback, ref: _ref, ..._ }: CameraSectionProps) {
  return <View style={styles.root}>{fallback}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
