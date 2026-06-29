import { useAppStore } from '@/context/app-store';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

const FRIEND_REQUEST_PREFIX = 'friend_request_';

type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

type FriendRequestPayload = {
  type: 'friend_request';
  from: string;
  to: string;
  status: FriendRequestStatus;
  createdAt: string;
  actedAt?: string;
};

type FriendRequestItem = FriendRequestPayload & {
  id: string;
};

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const { currentUserEmail } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      setSearchQuery('');
      setSearchResults([]);
      void loadRequests();
    }, [currentUserEmail])
  );

  function parseRequestRow(row: any): FriendRequestItem | null {
    if (!row?.chat_id || typeof row?.text !== 'string') return null;
    if (!String(row.chat_id).startsWith(FRIEND_REQUEST_PREFIX)) return null;

    try {
      const payload = JSON.parse(row.text) as FriendRequestPayload;
      if (payload.type !== 'friend_request') return null;
      if (!payload.from || !payload.to || !payload.status) return null;
      return { id: String(row.id), ...payload };
    } catch {
      return null;
    }
  }

  async function getLatestRequests(): Promise<FriendRequestItem[]> {
    const rows = await supabaseFetch(`chat_messages?chat_id=like.${FRIEND_REQUEST_PREFIX}*&order=created_at.desc`);
    if (!Array.isArray(rows)) return [];

    const latestByDirection = new Map<string, FriendRequestItem>();
    for (const row of rows) {
      const parsed = parseRequestRow(row);
      if (!parsed) continue;
      const key = `${parsed.from}->${parsed.to}`;
      if (!latestByDirection.has(key)) latestByDirection.set(key, parsed);
    }

    return Array.from(latestByDirection.values());
  }

  async function loadRequests() {
    const me = (currentUserEmail ?? '').trim().toLowerCase();
    if (!me) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    const latestRequests = await getLatestRequests();
    setIncomingRequests(latestRequests.filter((req) => req.to === me && req.status === 'pending'));
    setOutgoingRequests(latestRequests.filter((req) => req.from === me && req.status === 'pending'));
  }

  // 🚀 關鍵修正：完全拿掉 ID，專注於姓名（Name）與 Email/Gmail 的模糊比對
  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) {
      if (Platform.OS === 'web') window.alert('提示：請輸入搜尋關鍵字！');
      else Alert.alert('提示', '請輸入搜尋關鍵字！');
      return;
    }

    setLoading(true);
    try {
      // 使用 ilike 進行不分大小寫的包含搜尋 (%關鍵字%)
      // 這樣無論輸入 11256016 (如果是名字)、姓名、或者是 Gmail 任何片段都能撈出來
      const filters = [
        `email.ilike.%${query}%`,
        `name.ilike.%${query}%`
      ];

      const filterString = encodeURIComponent(filters.join(','));
      const users = await supabaseFetch(`app_users?or=(${filterString})`);
      
      if (users && Array.isArray(users)) {
        // 過濾掉自己，避免搜尋到自己加自己
        const filtered = users.filter((u: any) => u.email?.toLowerCase() !== currentUserEmail?.toLowerCase());
        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('搜尋發生錯誤:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  // 🚀 關鍵修正：按加好友時，直接抓取搜尋結果裡該名用戶的精確 email，不再管他當初是用什麼關鍵字搜到的
  async function handleAddFriend(targetUser: any) {
    const me = (currentUserEmail ?? '').trim().toLowerCase();
    if (!targetUser || !targetUser.email) {
      if (Platform.OS === 'web') window.alert('使用者資料異常，加好友失敗。');
      else Alert.alert('失敗', '使用者資料異常，加好友失敗。');
      return;
    }
    const friend = targetUser.email.trim().toLowerCase();

    if (!me) {
      if (Platform.OS === 'web') window.alert('請先登入後再加好友。');
      else Alert.alert('提示', '請先登入後再加好友。');
      return;
    }

    setLoading(true);
    try {
      const latestRequests = await getLatestRequests();
      const pendingOutgoing = latestRequests.find((req) => req.from === me && req.to === friend && req.status === 'pending');
      if (pendingOutgoing) {
        if (Platform.OS === 'web') window.alert('你已送出邀請，請等待對方回覆。');
        else Alert.alert('提示', '你已送出邀請，請等待對方回覆。');
        return;
      }

      const pendingIncoming = latestRequests.find((req) => req.from === friend && req.to === me && req.status === 'pending');
      if (pendingIncoming) {
        if (Platform.OS === 'web') window.alert('對方已邀請你，請到下方待處理邀請點同意。');
        else Alert.alert('提示', '對方已邀請你，請到下方待處理邀請點同意。');
        return;
      }

      const myUsers = await supabaseFetch(`app_users?email=eq.${encodeURIComponent(me)}`);
      if (!myUsers || myUsers.length === 0) {
        if (Platform.OS === 'web') window.alert('找不到您的使用者資料，加好友失敗。');
        else Alert.alert('失敗', '找不到您的使用者資料，加好友失敗。');
        return;
      }

      const myData = myUsers[0];
      const myFriends: string[] = myData.friends || [];

      const isAlreadyFriend = myFriends.some(email => email.toLowerCase() === friend.toLowerCase());
      if (isAlreadyFriend) {
        if (Platform.OS === 'web') window.alert('你們已經是好友囉！');
        else Alert.alert('提示', '你們已經是好友囉！');
        return;
      }

      const requestPayload: FriendRequestPayload = {
        type: 'friend_request',
        from: myData.email.toLowerCase(),
        to: friend,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await supabaseFetch('chat_messages', 'POST', {
        chat_id: `${FRIEND_REQUEST_PREFIX}${myData.email.toLowerCase()}_${friend}`,
        sender_email: myData.email,
        text: JSON.stringify(requestPayload),
      });

      if (Platform.OS === 'web') window.alert(`已送出好友邀請給 ${targetUser.name || friend}！`);
      else Alert.alert('成功', `已送出好友邀請給 ${targetUser.name || friend}！`);

      setSearchQuery('');
      setSearchResults([]);
      await loadRequests();
    } catch (err) {
      console.error('加好友失敗:', err);
      if (Platform.OS === 'web') window.alert('網路連線失敗，請稍後再試。');
      else Alert.alert('錯誤', '網路連線失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  async function updateRequestStatus(request: FriendRequestItem, status: Exclude<FriendRequestStatus, 'pending'>) {
    const nextPayload: FriendRequestPayload = { ...request, status, actedAt: new Date().toISOString() };
    await supabaseFetch(`chat_messages?id=eq.${request.id}`, 'PATCH', { text: JSON.stringify(nextPayload) });
  }

  async function handleAcceptRequest(request: FriendRequestItem) {
    const me = (currentUserEmail ?? '').trim().toLowerCase();
    if (!me) return;

    setProcessingRequestId(request.id);
    try {
      const [myUsers, friendUsers] = await Promise.all([
        supabaseFetch(`app_users?email=eq.${me}`),
        supabaseFetch(`app_users?email=eq.${request.from}`),
      ]);

      if (!Array.isArray(myUsers) || !myUsers.length || !Array.isArray(friendUsers) || !friendUsers.length) {
        throw new Error('找不到使用者資料');
      }

      const myData = myUsers[0];
      const friendData = friendUsers[0];
      const myFriends: string[] = Array.isArray(myData.friends) ? myData.friends : [];
      const friendFriends: string[] = Array.isArray(friendData.friends) ? friendData.friends : [];

      if (!myFriends.some((email) => email.toLowerCase() === request.from)) {
        await supabaseFetch(`app_users?id=eq.${myData.id}`, 'PATCH', { friends: [...myFriends, friendData.email] });
      }
      if (!friendFriends.some((email) => email.toLowerCase() === me)) {
        await supabaseFetch(`app_users?id=eq.${friendData.id}`, 'PATCH', { friends: [...friendFriends, myData.email] });
      }

      await updateRequestStatus(request, 'accepted');
      if (Platform.OS === 'web') window.alert('已同意好友邀請。');
      else Alert.alert('成功', '已同意好友邀請。');
      await loadRequests();
    } catch {
      if (Platform.OS === 'web') window.alert('同意邀請失敗，請稍後再試。');
      else Alert.alert('錯誤', '同意邀請失敗，請稍後再試。');
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectRequest(request: FriendRequestItem) {
    setProcessingRequestId(request.id);
    try {
      await updateRequestStatus(request, 'rejected');
      if (Platform.OS === 'web') window.alert('已拒絕好友邀請。');
      else Alert.alert('完成', '已拒絕好友邀請。');
      await loadRequests();
    } catch {
      if (Platform.OS === 'web') window.alert('拒絕邀請失敗，請稍後再試。');
      else Alert.alert('錯誤', '拒絕邀請失敗，請稍後再試。');
    } finally {
      setProcessingRequestId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>探索與增添好友</Text>
        <Text style={styles.subtitle}>目前登入：{currentUserEmail ?? '尚未登入'}</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="輸入好友的姓名、Gmail或Email..."
            placeholderTextColor="#7f8a94"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            blurOnSubmit={false}
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
            {loading ? <ActivityIndicator color="#f8f8f6" /> : <Text style={styles.btnText}>搜尋</Text>}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={searchResults}
        contentContainerStyle={styles.resultListContent}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.userName}>{item.name || '未命名使用者'}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => handleAddFriend(item)}>
              <Text style={styles.addBtnText}>加好友</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={searchQuery && !loading ? <Text style={styles.emptyText}>找不到相符的使用者</Text> : null}
      />

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>待處理邀請</Text>
        {incomingRequests.length === 0 ? (
          <Text style={styles.emptySmallText}>目前沒有待處理邀請</Text>
        ) : (
          incomingRequests.map((request) => (
            <View style={styles.requestRow} key={request.id}>
              <Text style={styles.requestEmail}>{request.from}</Text>
              <View style={styles.requestActions}>
                <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleAcceptRequest(request)} disabled={processingRequestId === request.id}>
                  <Text style={styles.actionText}>同意</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectRequest(request)} disabled={processingRequestId === request.id}>
                  <Text style={styles.actionText}>拒絕</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>你送出的邀請</Text>
        {outgoingRequests.length === 0 ? (
          <Text style={styles.emptySmallText}>目前沒有待回覆邀請</Text>
        ) : (
          outgoingRequests.map((request) => (
            <View style={styles.requestRow} key={request.id}>
              <Text style={styles.requestEmail}>{request.to}</Text>
              <Text style={styles.pendingText}>等待回覆</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f4', paddingTop: 60, paddingHorizontal: 16 },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d3c7bb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#1d2a36',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#1d2a36' },
  subtitle: { fontSize: 14, color: '#7f8a94', marginTop: 4 },
  searchCard: {
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d3c7bb',
    padding: 12,
  },
  searchBox: { flexDirection: 'row' },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#fbfbf8',
    borderWidth: 1,
    borderColor: '#d3c7bb',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginRight: 8,
    color: '#1d2a36',
  },
  searchBtn: { backgroundColor: '#1d2a36', height: 46, width: 80, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#f7f7f4', fontSize: 15, fontWeight: 'bold' },
  resultListContent: { paddingBottom: 8 },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d3c7bb',
  },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1d2a36' },
  userEmail: { fontSize: 13, color: '#7f8a94', marginTop: 2 },
  addBtn: { backgroundColor: '#7b2530', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#f7f7f4', fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#7f8a94', marginTop: 30, fontSize: 15 },
  sectionBox: { marginTop: 8, marginBottom: 16, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#d3c7bb', padding: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1d2a36', marginBottom: 10 },
  emptySmallText: { color: '#7f8a94', fontSize: 13 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d3c7bb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  requestEmail: { flex: 1, marginRight: 10, color: '#1d2a36', fontSize: 13 },
  requestActions: { flexDirection: 'row' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginLeft: 8 },
  acceptBtn: { backgroundColor: '#1d2a36' },
  rejectBtn: { backgroundColor: '#7b2530' },
  actionText: { color: '#f7f7f4', fontSize: 12, fontWeight: '700' },
  pendingText: { color: '#7f8a94', fontSize: 12, fontWeight: '700' },
});