/**
 * Web stub — camera is native-only.
 * On web the viewfinder is replaced by the static sequence info panel.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CameraSectionProps } from './CameraSection.types';

export default function CameraSection({ fallback }: CameraSectionProps) {
  return <View style={styles.root}>{fallback}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
