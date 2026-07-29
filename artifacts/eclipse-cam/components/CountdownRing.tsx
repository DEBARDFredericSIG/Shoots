import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

interface CountdownRingProps {
  totalMs: number;
  remainingMs: number;
  size?: number;
  strokeWidth?: number;
}

export function CountdownRing({
  totalMs,
  remainingMs,
  size = 220,
  strokeWidth = 8,
}: CountdownRingProps) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(totalMs > 0 ? remainingMs / totalMs : 1);

  useEffect(() => {
    const target = totalMs > 0 ? remainingMs / totalMs : 1;
    progress.value = withTiming(target, {
      duration: 120,
      easing: Easing.linear,
    });
  }, [remainingMs, totalMs]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = totalMs > 0 ? remainingMs / totalMs : 1;

  let ringColor = colors.primary; // orange
  if (ratio < 0.15) ringColor = colors.shootFlash; // red when almost done
  else if (ratio < 0.35) ringColor = colors.corona; // yellow

  const displayText =
    remainingMs <= 0
      ? '!'
      : seconds >= 60
      ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
      : String(seconds);

  const subText = remainingMs <= 0 ? 'DÉCLENCHEZ' : seconds >= 60 ? 'min' : 'sec';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // rotate so progress starts at top
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.inner}>
        <Text style={[styles.number, { color: colors.foreground }]}>
          {displayText}
        </Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {subText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 52,
    fontWeight: '700',
    fontFamily: Platform.OS !== 'web' ? 'Inter_700Bold' : undefined,
    lineHeight: 60,
    letterSpacing: -2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS !== 'web' ? 'Inter_600SemiBold' : undefined,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
