import React, { useCallback, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import {
  FOCUS_LABELS,
  formatDuration,
  getTotalShots,
  getTotalTimeMs,
  useAppContext,
  type CapturedShot,
  type FocusMode,
  type Session,
} from '@/context/AppContext';
import { CountdownRing } from '@/components/CountdownRing';
import CameraSection from '@/components/CameraSection';
import type { CameraHandle } from '@/components/CameraSection.types';

// ─── Focus mode badge ─────────────────────────────────────────────────────────

function FocusBadge({ mode, large = false }: { mode: FocusMode; large?: boolean }) {
  const colors = useColors();
  const bg =
    mode === 'infinity' ? '#1a2e1a' :
    mode === 'near-infinity' ? '#1a2536' : '#2a1f1a';
  const fg =
    mode === 'infinity' ? '#4ade80' :
    mode === 'near-infinity' ? '#60b4f8' : '#f5c842';
  return (
    <View style={[styles.focusBadge, { backgroundColor: bg }]}>
      <Ionicons name="lock-closed" size={large ? 11 : 9} color={fg} style={{ marginRight: 4 }} />
      <Text style={[styles.focusBadgeText, { color: fg, fontSize: large ? 12 : 10 }]}>
        {FOCUS_LABELS[mode]}
      </Text>
    </View>
  );
}

// ─── Main Controller Screen ───────────────────────────────────────────────────

export default function ControllerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    selectedSequence, activeMode, simulationSpeed,
    setActiveMode, setSimulationSpeed,
    addSession, updateSession,
  } = useAppContext();

  const cameraRef = useRef<CameraHandle>(null);

  // ── Sequence running state
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [currentShotIdx, setCurrentShotIdx] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [totalCountdownMs, setTotalCountdownMs] = useState(0);
  const [totalShotsFired, setTotalShotsFired] = useState(0);

  const isRunningRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>('');

  // ── Shoot flash
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const triggerFlash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  // ── Countdown
  const countdown = useCallback((ms: number): Promise<void> => {
    return new Promise(resolve => {
      const adjusted = Math.round(ms / simulationSpeed);
      if (adjusted <= 0) { setCountdownMs(0); resolve(); return; }
      let remaining = adjusted;
      setTotalCountdownMs(adjusted);
      setCountdownMs(remaining);
      const interval = setInterval(() => {
        if (!isRunningRef.current) { clearInterval(interval); resolve(); return; }
        remaining -= 100;
        if (remaining <= 0) { clearInterval(interval); setCountdownMs(0); resolve(); }
        else { setCountdownMs(remaining); }
      }, 100);
      countdownIntervalRef.current = interval;
    });
  }, [simulationSpeed]);

  // ── Run sequence
  const runSequence = useCallback(async () => {
    if (!selectedSequence) return;
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    sessionIdRef.current = id;
    isRunningRef.current = true;
    setIsRunning(true);
    setTotalShotsFired(0);

    const session: Session = {
      id, sequenceId: selectedSequence.id, sequenceName: selectedSequence.name,
      mode: selectedSequence.mode, startedAt: Date.now(), shots: [],
      status: 'running', totalSteps: selectedSequence.steps.length, completedSteps: 0,
    };
    addSession(session);
    const shots: CapturedShot[] = [];

    for (let si = 0; si < selectedSequence.steps.length; si++) {
      if (!isRunningRef.current) break;
      const step = selectedSequence.steps[si];
      setCurrentStepIdx(si);

      for (let pi = 0; pi < step.shotCount; pi++) {
        if (!isRunningRef.current) break;
        setCurrentShotIdx(pi);
        await countdown(step.intervalMs);
        if (!isRunningRef.current) break;

        triggerFlash();
        const photoUri = await cameraRef.current?.takePicture();

        const shot: CapturedShot = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          stepName: step.name, iso: step.iso, shutterSpeed: step.shutterSpeed,
          aperture: step.aperture, focusMode: step.focusMode, timestamp: Date.now(),
          uri: photoUri ?? undefined,
        };
        shots.push(shot);
        setTotalShotsFired(prev => prev + 1);
        updateSession(id, { shots: [...shots], completedSteps: pi + 1 >= step.shotCount ? si + 1 : si });
      }
    }

    const finalStatus = isRunningRef.current ? 'completed' : 'cancelled';
    updateSession(id, { status: finalStatus, completedAt: Date.now(), shots });
    isRunningRef.current = false;
    setIsRunning(false);
    setCurrentStepIdx(0); setCurrentShotIdx(0); setCountdownMs(0); setTotalShotsFired(0);
    if (finalStatus === 'completed') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedSequence, countdown, triggerFlash, addSession, updateSession]);

  const stopSequence = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    setCountdownMs(0);
    // Ne pas clearInterval ici — le setInterval vérifie isRunningRef à chaque tick (100ms)
    // et appelle resolve() lui-même. Tuer l'interval avant resolve() = Promise qui ne résout jamais = gel.
  }, []);

  // ── Derived
  const currentStep = selectedSequence?.steps[currentStepIdx] ?? null;
  const totalShots = selectedSequence ? getTotalShots(selectedSequence) : 0;
  const totalTime = selectedSequence ? getTotalTimeMs(selectedSequence) : 0;
  const stepTotal = selectedSequence?.steps.length ?? 0;
  const modeColor = activeMode === 'eclipse' ? colors.primary : colors.accent;
  const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 84 : 49;
  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  // ── Running overlay (shown on top of viewfinder)
  const runningOverlay = currentStep ? (
    <>
      <Text style={[styles.stepName, { color: '#fff' }]}>{currentStep.name}</Text>
      <CountdownRing totalMs={totalCountdownMs} remainingMs={countdownMs} size={180} />
      <View style={styles.settingsRow}>
        {[
          { label: 'ISO', value: String(currentStep.iso) },
          { label: 'VITESSE', value: currentStep.shutterSpeed },
          { label: 'OUVERTURE', value: currentStep.aperture },
        ].map(item => (
          <View key={item.label} style={styles.settingBox}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.settingValue}>{item.value}</Text>
          </View>
        ))}
      </View>
      <FocusBadge mode={currentStep.focusMode} large />
      {currentStep.notes && (
        <View style={[styles.noteBox, { backgroundColor: '#2a1f0a', borderColor: colors.corona + '44' }]}>
          <Ionicons name="warning-outline" size={14} color={colors.corona} style={{ marginRight: 6 }} />
          <Text style={[styles.noteText, { color: colors.corona }]}>{currentStep.notes}</Text>
        </View>
      )}
      <View style={styles.progressRow}>
        <Text style={styles.progressTextLight}>
          Étape <Text style={{ color: '#fff' }}>{currentStepIdx + 1}</Text>/{stepTotal}
        </Text>
        <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        <Text style={styles.progressTextLight}>
          Photo <Text style={{ color: modeColor }}>{totalShotsFired}</Text>/{totalShots}
        </Text>
      </View>
    </>
  ) : null;

  // ── Fallback (web or no camera permission) — static sequence info
  const fallback = selectedSequence ? (
    <View style={[styles.stepsPreview, { borderColor: colors.border }]}>
      {selectedSequence.steps.slice(0, 4).map((step, i) => (
        <View key={step.id} style={[styles.previewStep,
          i < 3 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.previewStepLeft}>
            <View style={[styles.stepNum, { backgroundColor: modeColor + '22' }]}>
              <Text style={[styles.stepNumText, { color: modeColor }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.previewStepName, { color: colors.foreground }]}>{step.name}</Text>
          </View>
          <View style={styles.previewStepRight}>
            <Text style={[styles.previewStepISO, { color: colors.mutedForeground }]}>ISO {step.iso}</Text>
            <FocusBadge mode={step.focusMode} />
          </View>
        </View>
      ))}
      {selectedSequence.steps.length > 4 && (
        <View style={styles.previewMore}>
          <Text style={[styles.previewMoreText, { color: colors.mutedForeground }]}>
            + {selectedSequence.steps.length - 4} étapes supplémentaires
          </Text>
        </View>
      )}
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Ionicons name="albums-outline" size={48} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucune séquence sélectionnée</Text>
      <Pressable style={[styles.emptyBtn, { borderColor: colors.primary }]}
        onPress={() => router.push('/(tabs)/sequences')}>
        <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Choisir une séquence</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Flash overlay */}
      <Reanimated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flashOverlay, { backgroundColor: colors.primary }, flashStyle]}
      />

      <View style={[styles.container, {
        paddingTop: insets.top + webTopPad + 8,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 12,
      }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={[styles.modeToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {(['eclipse', 'moon'] as const).map(m => {
              const active = activeMode === m;
              const col = m === 'eclipse' ? colors.primary : colors.accent;
              return (
                <Pressable key={m} onPress={() => !isRunning && setActiveMode(m)}
                  style={[styles.modeBtn, active && { backgroundColor: col + '22' }]}>
                  <MaterialCommunityIcons
                    name={m === 'eclipse' ? 'weather-sunny-alert' : 'moon-waning-crescent'}
                    size={14} color={active ? col : colors.mutedForeground} />
                  <Text style={[styles.modeBtnText, { color: active ? col : colors.mutedForeground }]}>
                    {m === 'eclipse' ? 'ÉCLIPSE' : 'LUNE'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!isRunning ? (
            <View style={[styles.speedRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              {([1, 60, 300] as const).map(spd => (
                <Pressable key={spd} onPress={() => setSimulationSpeed(spd)}
                  style={[styles.speedBtn, simulationSpeed === spd && { backgroundColor: colors.muted }]}>
                  <Text style={[styles.speedText, {
                    color: simulationSpeed === spd ? colors.foreground : colors.mutedForeground,
                  }]}>{spd === 1 ? '1×' : spd === 60 ? '60×' : '300×'}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.liveTag, { borderColor: colors.primary + '66' }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.liveText, { color: colors.primary }]}>EN COURS</Text>
            </View>
          )}
        </View>

        {/* ── Sequence selector ── */}
        {!isRunning && (
          <Pressable
            style={[styles.seqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/sequences')}>
            <View style={styles.seqCardLeft}>
              <MaterialCommunityIcons
                name={activeMode === 'eclipse' ? 'weather-sunny-alert' : 'moon-waning-crescent'}
                size={20} color={modeColor} style={{ marginRight: 10 }} />
              <View>
                <Text style={[styles.seqName, { color: colors.foreground }]}>
                  {selectedSequence?.name ?? 'Aucune séquence'}
                </Text>
                {selectedSequence && (
                  <Text style={[styles.seqMeta, { color: colors.mutedForeground }]}>
                    {selectedSequence.steps.length} étapes • {totalShots} photos • {formatDuration(totalTime)}
                    {simulationSpeed > 1 ? ` (${formatDuration(totalTime / simulationSpeed)} à ${simulationSpeed}×)` : ''}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* ── Camera / fallback ── */}
        <View style={styles.cameraWrapper}>
          <CameraSection
            ref={cameraRef}
            isRunning={isRunning}
            modeColor={modeColor}
            idleBadgeText={selectedSequence ? `${selectedSequence.name} • ${totalShots} photos` : undefined}
            runningOverlay={runningOverlay}
            fallback={fallback}
          />
        </View>

        {/* ── Bottom controls ── */}
        <View style={styles.bottomControls}>
          {!isRunning ? (
            <Pressable
              style={({ pressed }) => [styles.startBtn, {
                backgroundColor: selectedSequence ? modeColor : colors.muted,
                opacity: pressed ? 0.85 : 1,
              }]}
              onPress={() => selectedSequence && runSequence()}
              disabled={!selectedSequence}>
              <Ionicons name="play" size={20}
                color={selectedSequence ? colors.primaryForeground : colors.mutedForeground}
                style={{ marginRight: 8 }} />
              <Text style={[styles.startBtnText, {
                color: selectedSequence ? colors.primaryForeground : colors.mutedForeground,
              }]}>DÉMARRER LA SÉQUENCE</Text>
            </Pressable>
          ) : (
            <View style={styles.runningControls}>
              <Pressable
                style={({ pressed }) => [styles.stopBtn, {
                  backgroundColor: colors.destructive + (pressed ? 'cc' : 'ff'),
                  borderColor: colors.destructive,
                }]}
                onPress={stopSequence}>
                <Ionicons name="stop" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.stopBtnText}>ARRÊTER</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flashOverlay: { zIndex: 999 },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14, gap: 10,
  },
  modeToggle: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 5 },
  modeBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  speedRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  speedBtn: { paddingHorizontal: 10, paddingVertical: 7 },
  speedText: { fontSize: 11, fontWeight: '600' },
  liveTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  seqCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  seqCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  seqName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  seqMeta: { fontSize: 12 },
  cameraWrapper: { flex: 1, marginBottom: 14 },

  // Steps fallback
  stepsPreview: { width: '100%', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  previewStep: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  previewStepLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumText: { fontSize: 11, fontWeight: '700' },
  previewStepName: { fontSize: 13, fontWeight: '500', flex: 1 },
  previewStepRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewStepISO: { fontSize: 11 },
  previewMore: { padding: 10, alignItems: 'center' },
  previewMoreText: { fontSize: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyText: { fontSize: 15 },
  emptyBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '600' },

  // Running overlay internals
  stepName: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', paddingHorizontal: 16 },
  settingsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  settingBox: {
    flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.15)',
  },
  settingLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4, color: 'rgba(255,255,255,0.6)' },
  settingValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5, color: '#fff' },
  focusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  focusBadgeText: { fontWeight: '600', letterSpacing: 0.3 },
  noteBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, maxWidth: '90%',
  },
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTextLight: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  dot: { width: 4, height: 4, borderRadius: 2 },

  // Bottom
  bottomControls: { paddingTop: 12 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  startBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  runningControls: { flexDirection: 'row', justifyContent: 'center' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14, borderWidth: 1 },
  stopBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },
});
