import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  formatDuration,
  getTotalShots,
  getTotalTimeMs,
  useAppContext,
  type Sequence,
} from '@/context/AppContext';

function SequenceItem({
  seq,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  seq: Sequence;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const modeColor = seq.mode === 'eclipse' ? colors.primary : colors.accent;
  const totalShots = getTotalShots(seq);
  const totalTime = getTotalTimeMs(seq);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.seqItem,
        {
          backgroundColor: isSelected ? modeColor + '14' : colors.card,
          borderColor: isSelected ? modeColor : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={onSelect}
    >
      <View style={styles.seqItemHeader}>
        <View style={styles.seqItemLeft}>
          <MaterialCommunityIcons
            name={
              seq.mode === 'eclipse'
                ? 'weather-sunny-alert'
                : 'moon-waning-crescent'
            }
            size={18}
            color={modeColor}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.seqNameRow}>
              <Text style={[styles.seqName, { color: colors.foreground }]}>
                {seq.name}
              </Text>
              {seq.isDefault && (
                <View
                  style={[
                    styles.defaultBadge,
                    { backgroundColor: modeColor + '22' },
                  ]}
                >
                  <Text style={[styles.defaultBadgeText, { color: modeColor }]}>
                    DÉFAUT
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.seqDesc, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {seq.description}
            </Text>
          </View>
        </View>

        <View style={styles.seqItemActions}>
          {!seq.isDefault && (
            <>
              <Pressable
                style={styles.iconBtn}
                hitSlop={8}
                onPress={onEdit}
              >
                <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                hitSlop={8}
                onPress={onDelete}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.destructive}
                />
              </Pressable>
            </>
          )}
          {seq.isDefault && (
            <Pressable style={styles.iconBtn} hitSlop={8} onPress={onEdit}>
              <Ionicons name="copy-outline" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.seqStats, { borderTopColor: colors.border }]}>
        {[
          {
            icon: 'layers-outline' as const,
            value: `${seq.steps.length} étapes`,
          },
          {
            icon: 'camera-outline' as const,
            value: `${totalShots} photos`,
          },
          {
            icon: 'time-outline' as const,
            value: formatDuration(totalTime),
          },
        ].map(item => (
          <View key={item.icon} style={styles.statItem}>
            <Ionicons
              name={item.icon}
              size={12}
              color={colors.mutedForeground}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {item.value}
            </Text>
          </View>
        ))}

        {isSelected && (
          <View
            style={[styles.selectedTag, { backgroundColor: modeColor + '22' }]}
          >
            <Ionicons name="checkmark" size={11} color={modeColor} />
            <Text style={[styles.selectedText, { color: modeColor }]}>
              ACTIVE
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function SequencesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    sequences,
    activeMode,
    selectedSequenceId,
    setSelectedSequenceId,
    setActiveMode,
    deleteSequence,
  } = useAppContext();

  const [filter, setFilter] = useState<'eclipse' | 'moon'>(activeMode);

  const filtered = sequences.filter(s => s.mode === filter);
  const modeColor = filter === 'eclipse' ? colors.primary : colors.accent;

  const handleDelete = (seq: Sequence) => {
    Alert.alert(
      'Supprimer la séquence',
      `Supprimer « ${seq.name} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            deleteSequence(seq.id);
          },
        },
      ],
    );
  };

  const handleEdit = (seq: Sequence) => {
    // If default, duplicate into editor
    if (seq.isDefault) {
      router.push({
        pathname: '/sequence-editor',
        params: { duplicateId: seq.id },
      });
    } else {
      router.push({
        pathname: '/sequence-editor',
        params: { editId: seq.id },
      });
    }
  };

  const handleSelect = (seq: Sequence) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSequenceId(seq.id);
    setActiveMode(seq.mode);
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTopPad + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Séquences
        </Text>
        <Pressable
          style={[styles.newBtn, { backgroundColor: modeColor }]}
          onPress={() =>
            router.push({
              pathname: '/sequence-editor',
              params: { mode: filter },
            })
          }
        >
          <Ionicons name="add" size={18} color={colors.primaryForeground} />
          <Text
            style={[styles.newBtnText, { color: colors.primaryForeground }]}
          >
            Nouvelle
          </Text>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View
        style={[
          styles.filterRow,
          { borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        {(['eclipse', 'moon'] as const).map(m => {
          const active = filter === m;
          const col = m === 'eclipse' ? colors.primary : colors.accent;
          return (
            <Pressable
              key={m}
              style={[
                styles.filterTab,
                active && {
                  borderBottomColor: col,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setFilter(m)}
            >
              <MaterialCommunityIcons
                name={
                  m === 'eclipse'
                    ? 'weather-sunny-alert'
                    : 'moon-waning-crescent'
                }
                size={15}
                color={active ? col : colors.mutedForeground}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterTabText,
                  { color: active ? col : colors.mutedForeground },
                ]}
              >
                {m === 'eclipse' ? 'Éclipse' : 'Lune'}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: active ? col + '22' : colors.muted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: active ? col : colors.mutedForeground },
                  ]}
                >
                  {sequences.filter(s => s.mode === m).length}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + webBottomPad + 16 },
        ]}
        scrollEnabled={filtered.length > 0}
        renderItem={({ item }) => (
          <SequenceItem
            seq={item}
            isSelected={item.id === selectedSequenceId}
            onSelect={() => handleSelect(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="albums-outline"
              size={44}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Aucune séquence
            </Text>
            <Pressable
              style={[styles.emptyBtn, { borderColor: modeColor }]}
              onPress={() =>
                router.push({
                  pathname: '/sequence-editor',
                  params: { mode: filter },
                })
              }
            >
              <Text style={[styles.emptyBtnText, { color: modeColor }]}>
                Créer la première séquence
              </Text>
            </Pressable>
          </View>
        }
      />
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
  title: { fontSize: 26, fontWeight: '700' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  newBtnText: { fontSize: 14, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabText: { fontSize: 14, fontWeight: '600' },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: { fontSize: 11, fontWeight: '600' },
  list: { padding: 14, gap: 12 },
  seqItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seqItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  seqItemLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  seqNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  seqName: { fontSize: 15, fontWeight: '600' },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  seqDesc: { fontSize: 12, lineHeight: 17 },
  seqItemActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  iconBtn: { padding: 4 },
  seqStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 14,
  },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 11 },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  selectedText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 14,
  },
  emptyText: { fontSize: 15 },
  emptyBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600' },
});
