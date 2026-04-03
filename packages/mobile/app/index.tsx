import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, Switch, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const COLORS = {
  bg: '#0f0f1a',
  surface: '#1a1a2e',
  accent: '#e94560',
  text: '#e4e4e4',
  muted: '#888',
  border: '#2a2a3e',
};

interface Doc {
  id: string;
  title: string;
  tags: string;
  created_at: string;
  content_length?: number;
}

export default function Library() {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://192.168.1.56:3011');
  const [wifiOnly, setWifiOnly] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem('serverUrl').then(url => url && setServerUrl(url));
    AsyncStorage.getItem('wifiOnly').then(v => v !== null && setWifiOnly(v === 'true'));
    AsyncStorage.getItem('downloaded').then(v => v && setDownloaded(new Set(JSON.parse(v))));
  }, []);

  const canSync = useCallback(async () => {
    if (!wifiOnly) return true;
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI;
  }, [wifiOnly]);

  const loadDocs = useCallback(async () => {
    try {
      if (!(await canSync())) {
        // Load from cache
        const cached = await AsyncStorage.getItem('cachedDocs');
        if (cached) setDocs(JSON.parse(cached));
        return;
      }

      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${serverUrl}/api/docs${qs}`);
      const data = await res.json();
      setDocs(data.docs);
      await AsyncStorage.setItem('cachedDocs', JSON.stringify(data.docs));
    } catch (err) {
      // Fallback to cache
      const cached = await AsyncStorage.getItem('cachedDocs');
      if (cached) setDocs(JSON.parse(cached));
    }
  }, [serverUrl, search, canSync]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocs();
    setRefreshing(false);
  };

  const saveServerUrl = async (url: string) => {
    setServerUrl(url);
    await AsyncStorage.setItem('serverUrl', url);
  };

  const toggleWifiOnly = async (value: boolean) => {
    setWifiOnly(value);
    await AsyncStorage.setItem('wifiOnly', String(value));
  };

  const downloadDoc = async (docId: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/docs/${docId}`);
      const doc = await res.json();
      await AsyncStorage.setItem(`doc_${docId}`, JSON.stringify(doc));
      const newDownloaded = new Set(downloaded);
      newDownloaded.add(docId);
      setDownloaded(newDownloaded);
      await AsyncStorage.setItem('downloaded', JSON.stringify([...newDownloaded]));
      Alert.alert('Downloaded', `"${doc.title}" saved for offline reading`);
    } catch {
      Alert.alert('Error', 'Failed to download document');
    }
  };

  const renderDoc = ({ item }: { item: Doc }) => (
    <TouchableOpacity
      style={styles.docCard}
      onPress={() => router.push({ pathname: '/doc/[id]', params: { id: item.id, serverUrl } })}
      onLongPress={() => downloadDoc(item.id)}
    >
      <View style={styles.docHeader}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
        {downloaded.has(item.id) && <Text style={styles.downloadedBadge}>📥</Text>}
      </View>
      <View style={styles.docMeta}>
        <Text style={styles.docDate}>{new Date(item.created_at + 'Z').toLocaleDateString()}</Text>
        {item.tags ? (
          <View style={styles.tagRow}>
            {item.tags.split(',').filter(Boolean).map(tag => (
              <Text key={tag} style={styles.tag}>{tag.trim()}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadDocs}
        />
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsBtn}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Settings */}
      {showSettings && (
        <View style={styles.settings}>
          <Text style={styles.settingsLabel}>Server URL</Text>
          <TextInput
            style={styles.settingsInput}
            value={serverUrl}
            onChangeText={saveServerUrl}
            placeholderTextColor={COLORS.muted}
          />
          <View style={styles.switchRow}>
            <Text style={styles.settingsLabel}>WiFi-only sync</Text>
            <Switch
              value={wifiOnly}
              onValueChange={toggleWifiOnly}
              trackColor={{ true: COLORS.accent }}
            />
          </View>
        </View>
      )}

      {/* Document List */}
      <FlatList
        data={docs}
        keyExtractor={item => item.id}
        renderItem={renderDoc}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📚</Text>
            <Text style={styles.emptyText}>
              {search ? `No results for "${search}"` : 'No documents yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 16,
  },
  settingsBtn: { justifyContent: 'center', paddingHorizontal: 8 },
  settings: {
    marginHorizontal: 16, padding: 16, backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  settingsLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  settingsInput: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 10, color: COLORS.text, marginBottom: 12,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  docCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, marginBottom: 8,
  },
  docHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', flex: 1 },
  downloadedBadge: { fontSize: 14, marginLeft: 8 },
  docMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  docDate: { color: COLORS.muted, fontSize: 12 },
  tagRow: { flexDirection: 'row', gap: 4 },
  tag: {
    color: COLORS.muted, fontSize: 11, backgroundColor: COLORS.bg,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.muted, marginTop: 12, fontSize: 16 },
});
