import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';
import { theme, priorityColor, priorityBg } from '../theme';

const PRIORITIES = ['high', 'medium', 'low'];

export default function EditNoteScreen({ route, navigation }) {
  const { noteId } = route.params || {};
  const isEdit = !!noteId;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('medium');
  const [reminderDate, setReminderDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tags, setTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Note' : 'New Note' });
    loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);
    try {
      const allTags = await api.getTags();
      setTags(allTags);
      if (isEdit) {
        const note = await api.getNote(noteId);
        setTitle(note.title);
        setBody(note.body || '');
        setPriority(note.priority);
        setReminderDate(note.reminder_at ? new Date(note.reminder_at) : null);
        setSelectedTagIds(new Set(note.tags.map(t => t.id)));
        setAttachments(note.attachments || []);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleTag = (id) => {
    const next = new Set(selectedTagIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTagIds(next);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        body,
        priority,
        reminder_at: reminderDate ? reminderDate.toISOString() : null,
        tag_ids: [...selectedTagIds],
      };
      if (isEdit) {
        await api.updateNote(noteId, data);
      } else {
        await api.createNote(data);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickFile = async () => {
    if (!isEdit) {
      Alert.alert('Save first', 'Please save the note first, then add attachments.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
      if (!result.canceled) {
        for (const file of result.assets) {
          await api.uploadAttachment(noteId, file);
        }
        const updated = await api.getNote(noteId);
        setAttachments(updated.attachments);
      }
    } catch (e) {
      Alert.alert('Upload Error', e.message);
    }
  };

  const handleDeleteAttachment = (id) => {
    Alert.alert('Delete', 'Remove this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.deleteAttachment(id);
        setAttachments(prev => prev.filter(a => a.id !== id));
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Note title…"
        placeholderTextColor={theme.textMuted}
        value={title}
        onChangeText={setTitle}
        autoFocus={!isEdit}
      />

      {/* Body */}
      <Text style={styles.label}>Body</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Write your note here…"
        placeholderTextColor={theme.textMuted}
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />

      {/* Priority */}
      <Text style={styles.label}>Priority</Text>
      <View style={styles.row}>
        {PRIORITIES.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityBtn, priority === p && { backgroundColor: priorityBg[p], borderColor: priorityColor[p] }]}
            onPress={() => setPriority(p)}
          >
            <Text style={[styles.priorityBtnText, priority === p && { color: priorityColor[p] }]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reminder */}
      <Text style={styles.label}>Reminder</Text>
      <TouchableOpacity style={styles.reminderRow} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: reminderDate ? theme.text : theme.textMuted, fontSize: 15 }}>
          {reminderDate ? reminderDate.toLocaleString() : 'Set a reminder…'}
        </Text>
        {reminderDate && (
          <TouchableOpacity onPress={() => setReminderDate(null)}>
            <Text style={{ color: theme.high }}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={reminderDate || new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(e, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setReminderDate(date);
          }}
          themeVariant="dark"
        />
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagsWrap}>
            {tags.map(t => {
              const sel = selectedTagIds.has(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tagOption, sel && { backgroundColor: t.color, borderColor: t.color }]}
                  onPress={() => toggleTag(t.id)}
                >
                  <Text style={[styles.tagOptionText, sel && { color: '#fff' }]}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Attachments */}
      <Text style={styles.label}>Attachments</Text>
      {attachments.map(a => (
        <View key={a.id} style={styles.attachItem}>
          <Text style={styles.attachName} numberOfLines={1}>📎 {a.original_name}</Text>
          <Text style={styles.attachSize}>{(a.size / 1024).toFixed(1)}KB</Text>
          <TouchableOpacity onPress={() => handleDeleteAttachment(a.id)}>
            <Text style={{ color: theme.high }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.attachBtn} onPress={handlePickFile}>
        <Text style={{ color: theme.accent, fontWeight: '600' }}>📎 Attach File</Text>
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Update Note' : 'Create Note'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  label: { fontSize: 12, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, padding: 12, color: theme.text, fontSize: 15,
  },
  textarea: { minHeight: 120 },
  row: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: theme.border,
    alignItems: 'center',
  },
  priorityBtnText: { color: theme.textMuted, fontWeight: '700', fontSize: 13 },
  reminderRow: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOption: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: theme.border,
  },
  tagOptionText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  attachItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 8, padding: 10, marginBottom: 6,
  },
  attachName: { flex: 1, color: theme.text, fontSize: 13 },
  attachSize: { color: theme.textMuted, fontSize: 11 },
  attachBtn: {
    borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed',
    borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 6,
  },
  saveBtn: {
    backgroundColor: theme.accent, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
