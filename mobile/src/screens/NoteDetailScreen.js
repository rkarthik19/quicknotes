import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { theme, priorityColor, priorityBg } from '../theme';

export default function NoteDetailScreen({ route, navigation }) {
  const { noteId } = route.params;
  const [note, setNote] = useState(null);

  useFocusEffect(useCallback(() => {
    api.getNote(noteId).then(setNote).catch(console.error);
  }, [noteId]));

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('EditNote', { noteId })} style={{ marginRight: 16 }}>
          <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Edit</Text>
        </TouchableOpacity>
      )
    });
  }, []);

  if (!note) return null;

  const handleDelete = () => {
    Alert.alert('Delete', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteNote(noteId);
        navigation.goBack();
      }}
    ]);
  };

  const handleToggle = async () => {
    const updated = await api.toggleComplete(noteId);
    setNote(updated);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {/* Title */}
      <Text style={[styles.title, note.completed && styles.titleDone]}>{note.title}</Text>

      {/* Badges */}
      <View style={styles.badges}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityBg[note.priority] }]}>
          <Text style={[styles.priorityText, { color: priorityColor[note.priority] }]}>
            {note.priority.toUpperCase()}
          </Text>
        </View>
        {note.completed && (
          <View style={[styles.priorityBadge, { backgroundColor: '#1e293b' }]}>
            <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '700' }}>✓ DONE</Text>
          </View>
        )}
        {note.tags.map(t => (
          <View key={t.id} style={[styles.tagBadge, { backgroundColor: t.color }]}>
            <Text style={styles.tagText}>{t.name}</Text>
          </View>
        ))}
      </View>

      {/* Reminder */}
      {note.reminder_at && (
        <View style={styles.reminderBox}>
          <Text style={styles.reminderText}>
            🔔 Reminder: {new Date(note.reminder_at).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Body */}
      {!!note.body && (
        <Text style={styles.body}>{note.body}</Text>
      )}

      {/* Attachments */}
      {note.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          {note.attachments.map(a => (
            <TouchableOpacity key={a.id} style={styles.attachItem}
              onPress={() => Linking.openURL(api.getFileUrl(a.filename))}
            >
              <Text style={styles.attachName}>📎 {a.original_name}</Text>
              <Text style={styles.attachSize}>{(a.size / 1024).toFixed(1)} KB</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Meta */}
      <Text style={styles.meta}>Created: {new Date(note.created_at).toLocaleString()}</Text>
      <Text style={styles.meta}>Updated: {new Date(note.updated_at).toLocaleString()}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#153b23' }]} onPress={handleToggle}>
          <Text style={{ color: '#22c55e', fontWeight: '700' }}>
            {note.completed ? '↩ Mark Active' : '✓ Mark Done'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.highBg }]} onPress={handleDelete}>
          <Text style={{ color: theme.high, fontWeight: '700' }}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Fix: useEffect wasn't imported
const { useEffect } = require('react');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 22, fontWeight: '800', color: theme.text, lineHeight: 30, marginBottom: 12 },
  titleDone: { textDecorationLine: 'line-through', color: theme.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  priorityText: { fontSize: 11, fontWeight: '800' },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  tagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  reminderBox: {
    backgroundColor: '#1e3a5f', borderRadius: 8,
    padding: 12, marginBottom: 16,
  },
  reminderText: { color: '#60a5fa', fontSize: 14 },
  body: { fontSize: 16, color: theme.text, lineHeight: 24, marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  attachItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.border,
    padding: 12, marginBottom: 6,
  },
  attachName: { color: theme.accent, fontSize: 14, flex: 1 },
  attachSize: { color: theme.textMuted, fontSize: 12 },
  meta: { fontSize: 12, color: theme.textMuted, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
