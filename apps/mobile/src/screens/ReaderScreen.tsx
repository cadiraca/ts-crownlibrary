import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { api, Document, Bookmark } from '../api';
import MarkdownRenderer from '../components/MarkdownRenderer';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Reader'>;
  route: RouteProp<RootStackParamList, 'Reader'>;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReaderScreen({ navigation, route }: Props) {
  const { docId } = route.params;
  const scrollRef = useRef<ScrollView>(null);

  const [doc, setDoc] = useState<Document | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [docData, bmData] = await Promise.all([
          api.documents.get(docId),
          api.bookmarks.list(docId).catch(() => [] as Bookmark[]),
        ]);
        setDoc(docData);
        setBookmarks(bmData);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [docId]);

  const scrollPercent = contentHeight > 0
    ? Math.round((scrollY / (contentHeight - SCREEN_HEIGHT)) * 100)
    : 0;

  const saveBookmark = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const bm = await api.bookmarks.create({
        document_id: doc.id,
        position: { type: 'scroll', scrollPercent: Math.max(0, Math.min(100, scrollPercent)) },
        label: bookmarkLabel || undefined,
      });
      await api.reading.update(doc.id, { type: 'scroll', scrollPercent });
      setBookmarks(prev => [bm, ...prev]);
      setShowBookmarkModal(false);
      setBookmarkLabel('');
      Alert.alert('Bookmarked!', `Saved at ${scrollPercent}% through.`);
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9b7fd4" />
      </View>
    );
  }

  if (error || !doc) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Document not found'}</Text>
      </View>
    );
  }

  const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];

  return (
    <View style={styles.container}>
      {/* Reading progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, scrollPercent))}%` }]} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        onScroll={e => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={100}
        onContentSizeChange={(_, h) => setContentHeight(h)}
      >
        {/* Header */}
        <View style={styles.header}>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.title}>{doc.title}</Text>
          <Text style={styles.meta}>
            {doc.word_count.toLocaleString()} words · {doc.reading_time_min} min read
          </Text>
          <View style={styles.divider} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <MarkdownRenderer content={doc.content} />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating bookmark button */}
      <TouchableOpacity
        style={styles.bookmarkFab}
        onPress={() => setShowBookmarkModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>🔖</Text>
        <Text style={styles.fabText}>Bookmark</Text>
      </TouchableOpacity>

      {/* Bookmark modal */}
      <Modal
        visible={showBookmarkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookmarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Bookmark</Text>
            <Text style={styles.modalSubtitle}>At {Math.max(0, scrollPercent)}% through the document</Text>

            <TextInput
              style={styles.modalInput}
              value={bookmarkLabel}
              onChangeText={setBookmarkLabel}
              placeholder="Label (optional)"
              placeholderTextColor="#7a7a9a"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowBookmarkModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveBookmark}
                disabled={saving}
              >
                <Text style={styles.modalBtnSaveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 14 },
  progressBar: { height: 2, backgroundColor: '#1a1a24' },
  progressFill: { height: '100%', backgroundColor: '#9b7fd4' },
  scroll: { flex: 1 },
  header: { padding: 20, paddingBottom: 0 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: {
    backgroundColor: 'rgba(124, 92, 191, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 191, 0.4)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { color: '#9b7fd4', fontSize: 12 },
  title: {
    color: '#e2e2f0',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 8,
  },
  meta: { color: '#7a7a9a', fontSize: 13, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#2a2a3a', marginBottom: 20 },
  content: { paddingHorizontal: 20 },
  bookmarkFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7c5cbf',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#7c5cbf',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: { fontSize: 16 },
  fabText: { color: 'white', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#2a2a3a',
  },
  modalTitle: { color: '#e2e2f0', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: '#7a7a9a', fontSize: 13, marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0f0f13',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e2e2f0',
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#252535' },
  modalBtnCancelText: { color: '#9a9ab8', fontWeight: '600' },
  modalBtnSave: { backgroundColor: '#7c5cbf' },
  modalBtnSaveText: { color: 'white', fontWeight: '700' },
});
