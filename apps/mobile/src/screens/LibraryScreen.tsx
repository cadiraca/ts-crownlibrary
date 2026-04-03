import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { api, Document } from '../api';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Library'>;
};

export default function LibraryScreen({ navigation }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [filtered, setFiltered] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.documents.list();
      setDocs(data);
      setFiltered(data);
    } catch (err) {
      setError('Could not connect to server.\nMake sure CrownLibrary is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(docs);
    } else {
      const q = search.toLowerCase();
      setFiltered(docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.tags.toLowerCase().includes(q)
      ));
    }
  }, [search, docs]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9b7fd4" />
        <Text style={styles.loadingText}>Connecting to library...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search documents..."
          placeholderTextColor="#7a7a9a"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Count */}
      <Text style={styles.countText}>
        {filtered.length} document{filtered.length !== 1 ? 's' : ''}
      </Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9b7fd4" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.docCard}
            onPress={() => navigation.navigate('Reader', { docId: item.id, title: item.title })}
            activeOpacity={0.7}
          >
            {/* Tags */}
            {item.tags ? (
              <View style={styles.tagsRow}>
                {item.tags.split(',').filter(Boolean).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>

            <View style={styles.docMeta}>
              <Text style={styles.metaText}>{item.reading_time_min} min read</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{item.word_count.toLocaleString()} words</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No documents found</Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.flex1 : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  flex1: { flex: 1 },
  listContent: { padding: 12 },
  loadingText: { color: '#7a7a9a', marginTop: 12, fontSize: 14 },
  errorText: { color: '#f87171', textAlign: 'center', fontSize: 14, lineHeight: 22 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#7c5cbf', borderRadius: 10 },
  retryText: { color: 'white', fontWeight: '600' },
  searchContainer: { padding: 12, paddingBottom: 0 },
  searchInput: {
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#e2e2f0',
    fontSize: 15,
  },
  countText: { color: '#7a7a9a', fontSize: 12, paddingHorizontal: 14, paddingVertical: 8 },
  docCard: {
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: {
    backgroundColor: 'rgba(124, 92, 191, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 191, 0.4)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { color: '#9b7fd4', fontSize: 11 },
  docTitle: { color: '#e2e2f0', fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 8 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#7a7a9a', fontSize: 12 },
  metaDot: { color: '#3a3a5a', fontSize: 12 },
  emptyText: { color: '#7a7a9a', fontSize: 15 },
});
