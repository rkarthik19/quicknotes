import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ScrollView, RefreshControl, StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { theme, priorityColor, priorityBg } from '../theme';

const PRIORITY_CHIPS = ['all', 'high', 'medium', 'low'];
const STATUS_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [activePriority, setActivePriority] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [activeTag, setActiveTag] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (activeTag) params.tag = activeTag;
      if (['high','medium','low'].includes(activePriority)) params.priority = activePriority;
      if (activeStatus === 'completed') params.completed = 'true';
      if (activeStatus === 'active') params.completed = 'false';

      const [n, t] = await Promise.all([api.getNotes(params), api.getTags()]);
      setNotes(n);
      setTags(t);
    } catch (e) {
      console.error(e);
    }
  }, [search, activePriority, activeStatus, activeTag]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleComplete = async (id) => {
    await api.toggleComplete(id);
    loadData();
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteNote(id);
        loadData();
      }},
    ]);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (iso) => iso && new Date(iso) < new Date();

  const renderNote = ({ item: note }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: priorityColor[note.priority] }, note.completed && styles.cardDone]}
      onPress={() => navigation.navigate('NoteDetail', { noteId: note.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, note.completed && styles.titleDone]} numberOfLines={2}>
          {note.title}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => handleToggleComplete(note.id)} style={styles.actionBtn}>
            <Text style={{ color: theme.low, fontSize: 16 }}>{note.completed ? '↩' : '✓'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('EditNote', { noteId: note.id })} style={styles.actionBtn}>
            <Text style={{ color: theme.textMuted, fontSize: 14 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(note.id)} style={styles.actionBtn}>
            <Text style={{ color: theme.high, fontSize: 14 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!note.body && (
        <Text style={styles.cardBody} numberOfLines={2}>{note.body}</Text>
      )}

      <View style={styles.cardFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityBg[note.priority] }]}>
          <Text style={[styles.priorityText, { color: priorityColor[note.priority] }]}>
            {note.priority.toUpperCase()}
          </Text>
        </View>
        {note.tags.slice(0,2).map(t => (
          <View key={t.id} style={[styles.tagBadge, { backgroundColor: t.color }]}>
            <Text style={styles.tagText}>{t.name}</Text>
          </View>
        ))}
        {note.reminder_at && (
          <View style={[styles.reminderBadge, isOverdue(note.reminder_at) && styles.reminderOverdue]}>
            <Text style={[styles.reminderText, isOverdue(note.reminder_at) && { color: theme.high }]}>
              🔔 {formatDate(note.reminder_at)}
            </Text>
          </View>
        )}
        {note.attachments.length > 0 && (
          <Text style={styles.attachCount}>📎 {note.attachments.length}</Text>
        )}
        <Text style={styles.dateText}>{formatDate(note.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes…"
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: theme.textMuted }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {STATUS_CHIPS.map(c => (
          <TouchableOpacity key={c.key}
            style={[styles.chip, activeStatus === c.key && styles.chipActive]}
            onPress={() => { setActiveStatus(c.key); setTimeout(loadData, 0); }}
          >
            <Text style={[styles.chipText, activeStatus === c.key && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ width: 1, backgroundColor: theme.border, marginHorizontal: 4 }} />
        {PRIORITY_CHIPS.map(p => (
          <TouchableOpacity key={p}
            style={[styles.chip, activePriority === p && styles.chipActive, activePriority === p && p !== 'all' && { backgroundColor: priorityBg[p] }]}
            onPress={() => { setActivePriority(p); setTimeout(loadData, 0); }}
          >
            <Text style={[styles.chipText, activePriority === p && p !== 'all' && { color: priorityColor[p] }]}>
              {p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tags */}
      {tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity style={[styles.chip, !activeTag && styles.chipActive]} onPress={() => { setActiveTag(null); setTimeout(loadData, 0); }}>
            <Text style={[styles.chipText, !activeTag && styles.chipTextActive]}>All Tags</Text>
          </TouchableOpacity>
          {tags.map(t => (
            <TouchableOpacity key={t.id}
              style={[styles.chip, activeTag === t.name && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => { setActiveTag(activeTag === t.name ? null : t.name); setTimeout(loadData, 0); }}
            >
              <Text style={[styles.chipText, activeTag === t.name && { color: '#fff' }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={n => n.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No notes found</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('EditNote', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginBottom: 8,
    backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, color: theme.text, fontSize: 15 },
  chipsRow: { maxHeight: 44, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: theme.border,
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: theme.border,
  },
  cardDone: { opacity: 0.55 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.text, lineHeight: 22 },
  titleDone: { textDecorationLine: 'line-through', color: theme.textMuted },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: theme.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { fontSize: 13, color: theme.textMuted, lineHeight: 18, marginTop: 6 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  reminderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#1e3a5f' },
  reminderOverdue: { backgroundColor: theme.highBg },
  reminderText: { fontSize: 11, color: '#60a5fa' },
  attachCount: { fontSize: 11, color: theme.textMuted },
  dateText: { fontSize: 11, color: theme.textMuted, marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: theme.textMuted, fontSize: 16 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
