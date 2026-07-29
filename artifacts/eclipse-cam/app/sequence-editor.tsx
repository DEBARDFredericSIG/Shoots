import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  FOCUS_DESCRIPTIONS,
  FOCUS_LABELS,
  useAppContext,
  type AppMode,
  type ExposureStep,
  type FocusMode,
  type Sequence,
} from '@/context/AppContext';

const ISO_OPTIONS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800];
const SHUTTER_OPTIONS = [
  '1/4000', '1/2000', '1/1000', '1/750', '1/500', '1/400',
  '1/320', '1/250', '1/200', '1/160', '1/125', '1/100',
  '1/80', '1/60', '1/50', '1/40', '1/30', '1/20', '1/15',
  '1/10', '1/8', '1/6', '1/5', '1/4', '1/3', '1/2',
  '0.7s', '1s', '1.5s', '2s', '3s', '5s', '8s', '10s', '15s', '20s', '30s',
];
const APERTURE_OPTIONS = [
  'f/1.4', 'f/1.8', 'f/2', 'f/2.8', 'f/3.5', 'f/4', 'f/5', 'f/5.6',
  'f/6.3', 'f/7.1', 'f/8', 'f/9', 'f/10', 'f/11', 'f/13', 'f/14', 'f/16',
];
const FOCUS_MODES: FocusMode[] = ['infinity', 'near-infinity', 'hyperfocal'];

function makeStep(overrides?: Partial<ExposureStep>): ExposureStep {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: 'Nouvelle étape',
    iso: 100,
    shutterSpeed: '1/500',
    aperture: 'f/8',
    shotCount: 3,
    intervalMs: 10000,
    focusMode: 'infinity',
    ...overrides,
  };
}

// ─── Picker row ────────────────────────────────────────────────────────────

function PickerRow<T extends string | number>({
  value,
  options,
  label,
  renderLabel,
  onChange,
}: {
  value: T;
  options: T[];
  label: string;
  renderLabel?: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={pStyles.pickerGroup}>
      <Text style={[pStyles.pickerLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pStyles.pickerScroll}>
        {options.map(opt => {
          const active = opt === value;
          return (
            <Pressable
              key={String(opt)}
              onPress={() => onChange(opt)}
              style={[
                pStyles.chip,
                {
                  backgroundColor: active ? colors.primary + '22' : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  pStyles.chipText,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {renderLabel ? renderLabel(opt) : String(opt)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Focus Picker ──────────────────────────────────────────────────────────

function FocusPicker({ value, onChange }: { value: FocusMode; onChange: (v: FocusMode) => void }) {
  const colors = useColors();
  return (
    <View style={pStyles.pickerGroup}>
      <Text style={[pStyles.pickerLabel, { color: colors.mutedForeground }]}>
        MISE AU POINT
      </Text>
      {FOCUS_MODES.map(mode => {
        const active = mode === value;
        const fg =
          mode === 'infinity'
            ? '#4ade80'
            : mode === 'near-infinity'
            ? '#60b4f8'
            : '#f5c842';
        const bg =
          mode === 'infinity'
            ? '#1a2e1a'
            : mode === 'near-infinity'
            ? '#1a2536'
            : '#2a1f1a';
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[
              pStyles.focusOption,
              {
                backgroundColor: active ? bg : colors.secondary,
                borderColor: active ? fg + '80' : colors.border,
              },
            ]}
          >
            <View style={styles.focusOptionLeft}>
              <Ionicons
                name="lock-closed"
                size={14}
                color={active ? fg : colors.mutedForeground}
                style={{ marginRight: 8 }}
              />
              <View>
                <Text style={[pStyles.focusLabel, { color: active ? fg : colors.foreground }]}>
                  {FOCUS_LABELS[mode]}
                </Text>
                <Text style={[pStyles.focusDesc, { color: colors.mutedForeground }]}>
                  {FOCUS_DESCRIPTIONS[mode]}
                </Text>
              </View>
            </View>
            {active && (
              <Ionicons name="checkmark-circle" size={18} color={fg} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Step editor card ──────────────────────────────────────────────────────

function StepEditor({
  step,
  index,
  expanded,
  onToggle,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  modeColor,
}: {
  step: ExposureStep;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (s: ExposureStep) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  modeColor: string;
}) {
  const colors = useColors();
  const [nameEdit, setNameEdit] = useState(step.name);
  const [notesEdit, setNotesEdit] = useState(step.notes ?? '');

  const commit = useCallback(
    (updates: Partial<ExposureStep>) => onChange({ ...step, ...updates }),
    [step, onChange],
  );

  return (
    <View
      style={[
        styles.stepCard,
        { backgroundColor: colors.card, borderColor: expanded ? modeColor + '60' : colors.border },
      ]}
    >
      {/* Step header */}
      <Pressable style={styles.stepHeader} onPress={onToggle}>
        <View style={[styles.stepNum, { backgroundColor: modeColor + '22' }]}>
          <Text style={[styles.stepNumText, { color: modeColor }]}>{index + 1}</Text>
        </View>
        <View style={styles.stepHeaderMid}>
          <Text style={[styles.stepName, { color: colors.foreground }]}>{step.name}</Text>
          <Text style={[styles.stepSummary, { color: colors.mutedForeground }]}>
            ISO {step.iso} · {step.shutterSpeed}s · {step.aperture} · {step.shotCount} photos
          </Text>
        </View>
        <View style={styles.stepHeaderRight}>
          <Pressable onPress={onMoveUp} disabled={isFirst} style={styles.moveBtn} hitSlop={6}>
            <Ionicons name="chevron-up" size={16} color={isFirst ? colors.border : colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={isLast} style={styles.moveBtn} hitSlop={6}>
            <Ionicons name="chevron-down" size={16} color={isLast ? colors.border : colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.moveBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={15} color={colors.destructive} />
          </Pressable>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.stepBody, { borderTopColor: colors.border }]}>
          {/* Name */}
          <View style={pStyles.pickerGroup}>
            <Text style={[pStyles.pickerLabel, { color: colors.mutedForeground }]}>NOM DE L'ÉTAPE</Text>
            <TextInput
              value={nameEdit}
              onChangeText={setNameEdit}
              onBlur={() => commit({ name: nameEdit })}
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              placeholderTextColor={colors.mutedForeground}
              placeholder="ex. Totalité — Couronne"
            />
          </View>

          {/* ISO */}
          <PickerRow
            label="ISO"
            value={step.iso}
            options={ISO_OPTIONS}
            onChange={v => commit({ iso: v })}
          />

          {/* Shutter */}
          <PickerRow
            label="VITESSE"
            value={step.shutterSpeed}
            options={SHUTTER_OPTIONS}
            onChange={v => commit({ shutterSpeed: v })}
          />

          {/* Aperture */}
          <PickerRow
            label="OUVERTURE"
            value={step.aperture}
            options={APERTURE_OPTIONS}
            onChange={v => commit({ aperture: v })}
          />

          {/* Shot count */}
          <View style={pStyles.pickerGroup}>
            <Text style={[pStyles.pickerLabel, { color: colors.mutedForeground }]}>NOMBRE DE PHOTOS</Text>
            <View style={styles.counterRow}>
              <Pressable
                style={[styles.counterBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => step.shotCount > 1 && commit({ shotCount: step.shotCount - 1 })}
              >
                <Ionicons name="remove" size={18} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.counterVal, { color: colors.foreground }]}>{step.shotCount}</Text>
              <Pressable
                style={[styles.counterBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => commit({ shotCount: step.shotCount + 1 })}
              >
                <Ionicons name="add" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Interval */}
          <View style={pStyles.pickerGroup}>
            <Text style={[pStyles.pickerLabel, { color: colors.mutedForeground }]}>INTERVALLE ENTRE PHOTOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pStyles.pickerScroll}>
              {[
                { label: '1s', ms: 1000 }, { label: '2s', ms: 2000 },
                { label: '3s', ms: 3000 }, { label: '5s', ms: 5000 },
                { label: '8s', ms: 8000 }, { label: '10s', ms: 10000 },
                { label: '15s', ms: 15000 }, { label: '20s', ms: 20000 },
                { label: '30s', ms: 30000 }, { label: '1min', ms: 60000 },
                { label: '2min', ms: 120000 }, { label: '3min', ms: 180000 },
                { label: '5min', ms: 300000 }, { label: '10min', ms: 600000 },
              ].map(opt => {
                const active = step.intervalMs === opt.ms;
                return (
                  <Pressable
                    key={opt.ms}
                    onPress={() => commit({ intervalMs: opt.ms })}
                    style={[
                      pStyles.chip,
                      {
                        backgroundColor: active ? modeColor + '22' : colors.secondary,
                        borderColor: active ? modeColor : colors.border,
                      },
                    ]}
                  >
                    <Text style={[pStyles.chipText, { color: active ? modeColor : colors.mutedForeground }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Focus */}
          <FocusPicker value={step.focusMode} onChange={v => commit({ focusMode: v })} />

          {/* Notes */}
          <View style={pStyles.pickerGroup}>
            <Text style={[pStyles.pickerLabel, { color: colors.mutedForeground }]}>NOTE (optionnel)</Text>
            <TextInput
              value={notesEdit}
              onChangeText={setNotesEdit}
              onBlur={() => commit({ notes: notesEdit || undefined })}
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              placeholderTextColor={colors.mutedForeground}
              placeholder="ex. Retirer le filtre solaire !"
              multiline
            />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Editor Screen ────────────────────────────────────────────────────

export default function SequenceEditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string; duplicateId?: string; mode?: string }>();
  const { sequences, addSequence, updateSequence } = useAppContext();

  const isEdit = !!params.editId;
  const isDuplicate = !!params.duplicateId;
  const sourceId = params.editId ?? params.duplicateId;
  const source = sequences.find(s => s.id === sourceId);

  const [name, setName] = useState<string>(
    isDuplicate ? `Copie de ${source?.name ?? ''}` : source?.name ?? 'Nouvelle séquence',
  );
  const [mode, setMode] = useState<AppMode>(
    (source?.mode ?? params.mode ?? 'eclipse') as AppMode,
  );
  const [description, setDescription] = useState<string>(
    isDuplicate ? source?.description ?? '' : source?.description ?? '',
  );
  const [steps, setSteps] = useState<ExposureStep[]>(
    source
      ? source.steps.map(s => ({ ...s, id: isDuplicate ? makeStep().id : s.id }))
      : [makeStep()],
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  const modeColor = mode === 'eclipse' ? colors.primary : colors.accent;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir un nom pour la séquence.');
      return;
    }
    if (steps.length === 0) {
      Alert.alert('Étapes requises', 'Ajoutez au moins une étape à la séquence.');
      return;
    }

    const payload: Omit<Sequence, 'id' | 'createdAt'> = {
      name: name.trim(),
      mode,
      description: description.trim(),
      steps,
    };

    if (isEdit && params.editId) {
      updateSequence(params.editId, payload);
    } else {
      addSequence(payload);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const addStep = () => {
    const newStep = makeStep({ focusMode: 'infinity' });
    setSteps(prev => [...prev, newStep]);
    setExpandedIdx(steps.length);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deleteStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const updateStep = (idx: number, updated: ExposureStep) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? updated : s)));
  };

  const moveStep = (from: number, direction: 1 | -1) => {
    const to = from + direction;
    if (to < 0 || to >= steps.length) return;
    setSteps(prev => {
      const arr = [...prev];
      [arr[from], arr[to]] = [arr[to], arr[from]];
      return arr;
    });
    setExpandedIdx(to);
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTopPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEdit ? 'Modifier' : 'Nouvelle séquence'}
        </Text>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: modeColor }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            Enregistrer
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomPad + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Metadata */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Mode */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MODE</Text>
          <View style={[styles.modeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {(['eclipse', 'moon'] as const).map(m => {
              const active = mode === m;
              const col = m === 'eclipse' ? colors.primary : colors.accent;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeOption,
                    active && { backgroundColor: col + '22' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={m === 'eclipse' ? 'weather-sunny-alert' : 'moon-waning-crescent'}
                    size={16}
                    color={active ? col : colors.mutedForeground}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.modeOptionText, { color: active ? col : colors.mutedForeground }]}>
                    {m === 'eclipse' ? 'Éclipse' : 'Lune'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Name */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>NOM</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            placeholderTextColor={colors.mutedForeground}
            placeholder="ex. Éclipse Totale 2026"
          />

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>DESCRIPTION (optionnel)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, minHeight: 64 }]}
            placeholderTextColor={colors.mutedForeground}
            placeholder="Description de la séquence..."
            multiline
          />
        </View>

        {/* Steps */}
        <Text style={[styles.stepsTitle, { color: colors.foreground }]}>
          Étapes ({steps.length})
        </Text>

        {steps.map((step, idx) => (
          <StepEditor
            key={step.id}
            step={step}
            index={idx}
            expanded={expandedIdx === idx}
            onToggle={() => setExpandedIdx(prev => prev === idx ? null : idx)}
            onChange={s => updateStep(idx, s)}
            onDelete={() => deleteStep(idx)}
            onMoveUp={() => moveStep(idx, -1)}
            onMoveDown={() => moveStep(idx, 1)}
            isFirst={idx === 0}
            isLast={idx === steps.length - 1}
            modeColor={modeColor}
          />
        ))}

        {/* Add step */}
        <Pressable
          style={[styles.addStepBtn, { borderColor: modeColor, backgroundColor: modeColor + '0e' }]}
          onPress={addStep}
        >
          <Ionicons name="add-circle-outline" size={20} color={modeColor} style={{ marginRight: 8 }} />
          <Text style={[styles.addStepText, { color: modeColor }]}>Ajouter une étape</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  scroll: { padding: 14, gap: 12 },
  section: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeOptionText: { fontSize: 14, fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  stepsTitle: { fontSize: 17, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '700' },
  stepHeaderMid: { flex: 1 },
  stepName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  stepSummary: { fontSize: 11 },
  stepHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveBtn: { padding: 3 },
  stepBody: {
    borderTopWidth: 1,
    padding: 14,
    gap: 0,
  },
  focusOptionLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  counterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterVal: { fontSize: 22, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addStepText: { fontSize: 15, fontWeight: '600' },
});

const pStyles = StyleSheet.create({
  pickerGroup: { marginBottom: 16 },
  pickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pickerScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 7,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  focusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  focusLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  focusDesc: { fontSize: 11, lineHeight: 15 },
});
