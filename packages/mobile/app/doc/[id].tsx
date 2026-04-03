import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

const COLORS = {
  bg: '#0f0f1a',
  surface: '#1a1a2e',
  accent: '#e94560',
  text: '#e4e4e4',
  muted: '#888',
  border: '#2a2a3e',
};

interface FullDoc {
  id: string;
  title: string;
  content_md: string;
  tags: string;
  bookmarks: Array<{
    id: string;
    section: string;
    scroll_pos: number;
    note: string;
    created_at: string;
  }>;
}

export default function DocReader() {
  const { id, serverUrl } = useLocalSearchParams<{ id: string; serverUrl: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<FullDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookmark, setShowBookmark] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    loadDoc();
  }, [id]);

  const loadDoc = async () => {
    setLoading(true);
    try {
      // Try online first
      const res = await fetch(`${serverUrl}/api/docs/${id}`);
      const data = await res.json();
      setDoc(data);
      // Cache it
      await AsyncStorage.setItem(`doc_${id}`, JSON.stringify(data));
    } catch {
      // Try cached
      const cached = await AsyncStorage.getItem(`doc_${id}`);
      if (cached) {
        setDoc(JSON.parse(cached));
      } else {
        Alert.alert('Error', 'Document not available offline');
        router.back();
      }
    }
    setLoading(false);
  };

  const saveBookmark = async () => {
    if (!doc) return;
    try {
      await fetch(`${serverUrl}/api/docs/${id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scroll_pos: scrollPosRef.current,
          note: bookmarkNote || 'Mobile bookmark',
        }),
      });
      setShowBookmark(false);
      setBookmarkNote('');
      Alert.alert('📌 Bookmarked', 'Position saved');
      loadDoc();
    } catch {
      Alert.alert('Error', 'Could not save bookmark');
    }
  };

  const resumeReading = () => {
    if (!doc?.bookmarks?.length) return;
    const latest = doc.bookmarks.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latest.scroll_pos > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: latest.scroll_pos, animated: true });
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  if (!doc) return null;

  const markdownStyles = {
    body: { color: COLORS.text, fontSize: 16, lineHeight: 24 },
    heading1: { color: '#fff', fontSize: 28, fontWeight: '700' as const, marginVertical: 12, borderBottomWidth: 2, borderBottomColor: COLORS.accent, paddingBottom: 8 },
    heading2: { color: COLORS.text, fontSize: 22, fontWeight: '600' as const, marginVertical: 10 },
    heading3: { color: '#ccc', fontSize: 18, fontWeight: '600' as const, marginVertical: 8 },
    paragraph: { marginVertical: 6 },
    code_inline: { backgroundColor: '#252540', color: COLORS.accent, paddingHorizontal: 4, borderRadius: 4, fontSize: 14 },
    fence: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 8 },
    code_block: { color: COLORS.text, fontSize: 13 },
    blockquote: { borderLeftWidth: 4, borderLeftColor: COLORS.accent, paddingLeft: 12, marginVertical: 8, backgroundColor: 'rgba(233,69,96,0.05)' },
    link: { color: COLORS.accent },
    table: { borderColor: COLORS.border },
    tr: { borderBottomColor: COLORS.border },
    th: { backgroundColor: COLORS.surface, padding: 8 },
    td: { padding: 8 },
    strong: { color: '#fff' },
    hr: { borderColor: COLORS.border },
    list_item: { marginVertical: 2 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
  };

  return (
    <View style={styles.container}>
      {/* Action bar */}
      <View style={styles.actionBar}>
        {doc.tags ? (
          <View style={styles.tagRow}>
            {doc.tags.split(',').filter(Boolean).map(tag => (
              <Text key={tag} style={styles.tag}>{tag.trim()}</Text>
            ))}
          </View>
        ) : <View />}
        <View style={styles.actions}>
          {doc.bookmarks?.length > 0 && (
            <TouchableOpacity onPress={resumeReading} style={styles.actionBtn}>
              <Text style={styles.actionText}>▶️ Resume</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowBookmark(!showBookmark)} style={styles.actionBtn}>
            <Text style={styles.actionText}>📌</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showBookmark && (
        <View style={styles.bookmarkForm}>
          <TextInput
            style={styles.bookmarkInput}
            placeholder="Note..."
            placeholderTextColor={COLORS.muted}
            value={bookmarkNote}
            onChangeText={setBookmarkNote}
          />
          <TouchableOpacity onPress={saveBookmark} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        onScroll={(e) => { scrollPosRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={100}
      >
        <Markdown style={markdownStyles}>{doc.content_md}</Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingText: { color: COLORS.muted, textAlign: 'center', marginTop: 40, fontSize: 16 },
  actionBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tagRow: { flexDirection: 'row', gap: 4, flex: 1 },
  tag: {
    color: COLORS.muted, fontSize: 11, backgroundColor: COLORS.surface,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  actionText: { color: COLORS.text, fontSize: 14 },
  bookmarkForm: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  bookmarkInput: {
    flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40 },
});
