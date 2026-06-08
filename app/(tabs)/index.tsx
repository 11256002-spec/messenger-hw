import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AuthPanel } from '@/components/auth-panel';
import { useAppStore } from '@/context/app-store';

function formatTimeLabel(value?: string) {
  if (!value) {
    return '尚無訊息';
  }

  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ChatListScreen() {
  const router = useRouter();
  const { currentUser, users, isHydrating, refresh, getFriends, getConversationWithFriend } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>載入帳號與訊息中...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.authShell}>
        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Messenger HW</Text>
          <Text style={styles.heroSubtitle}>建立帳號後，可以新增好友、互傳訊息，並把對話紀錄留在本機。</Text>
        </View>
        <AuthPanel />
        {users.length > 0 ? (
          <View style={styles.accountHintCard}>
            <Text style={styles.accountHintTitle}>目前已建立的帳號</Text>
            <View style={styles.accountChipWrap}>
              {users.map((user) => (
                <View key={user.id} style={styles.accountChip}>
                  <Text style={styles.accountChipText}>{user.username}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  const items = getFriends()
    .map((friend) => {
      const conversation = getConversationWithFriend(friend.id);
      const lastMessage = conversation?.messages[conversation.messages.length - 1];

      return {
        id: friend.id,
        name: friend.username,
        avatar: friend.avatarUri,
        preview: lastMessage?.text ?? '還沒有訊息，先聊點什麼吧。',
        updatedAt: lastMessage?.createdAt,
      };
    })
    .sort((left, right) => {
      if (!left.updatedAt && !right.updatedAt) {
        return left.name.localeCompare(right.name, 'zh-Hant');
      }

      if (!left.updatedAt) {
        return 1;
      }

      if (!right.updatedAt) {
        return -1;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Image source={{ uri: currentUser.avatarUri }} style={styles.myAvatar} />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>聊天</Text>
          <Text style={styles.headerSubtitle}>目前登入：{currentUser.username}</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>到帳號頁新增好友；好友建立後，雙方登入都能看到同一段對話。</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={items.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>還沒有好友</Text>
            <Text style={styles.emptyText}>先到「帳號」頁建立第二個帳號並互加好友，聊天列表就會出現。</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.chatItem}
            onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id } })}>
            <Image source={{ uri: item.avatar }} style={styles.listAvatar} />
            <View style={styles.chatBody}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{formatTimeLabel(item.updatedAt)}</Text>
              </View>
              <Text style={styles.lastMsg} numberOfLines={2}>{item.preview}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 18, paddingTop: 10 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { fontSize: 16, color: '#475569' },
  authShell: { flex: 1, backgroundColor: '#eff6ff', paddingHorizontal: 20, paddingVertical: 30, alignItems: 'center' },
  heroBlock: { width: '100%', maxWidth: 420, marginBottom: 20 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#082f49' },
  heroSubtitle: { marginTop: 10, fontSize: 16, lineHeight: 24, color: '#334155' },
  accountHintCard: { width: '100%', maxWidth: 420, marginTop: 18, backgroundColor: '#ffffff', borderRadius: 24, padding: 20 },
  accountHintTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  accountChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountChip: { backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  accountChipText: { color: '#075985', fontWeight: '600' },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 24, padding: 18 },
  myAvatar: { width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#dbeafe' },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { marginTop: 2, fontSize: 14, color: '#475569' },
  infoBanner: { marginTop: 14, marginBottom: 14, backgroundColor: '#e0f2fe', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  infoText: { fontSize: 14, lineHeight: 20, color: '#075985' },
  listContainer: { paddingBottom: 20 },
  emptyListContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  emptyText: { marginTop: 10, fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#64748b' },
  chatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 22, padding: 16, marginBottom: 12 },
  listAvatar: { width: 58, height: 58, borderRadius: 29, marginRight: 14, backgroundColor: '#dbeafe' },
  chatBody: { flex: 1 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0f172a' },
  time: { fontSize: 12, color: '#64748b' },
  lastMsg: { marginTop: 6, fontSize: 14, lineHeight: 20, color: '#475569' },
});