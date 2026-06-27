import { useAppStore } from '@/context/app-store';
import React, { useCallback, useState } from 'react';
// 👑 useFocusEffect：保證切換分頁、搜尋完或離開再進來時，都會自動清空輸入框與搜尋列表
import { useFocusEffect } from '@react-navigation/native';
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

  // 👑 換頁切換 Tab 進來時，自動重置並徹底清空搜尋狀態與結果
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
      return {
        id: String(row.id),
        ...payload,
      };
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
      if (!latestByDirection.has(key)) {
        latestByDirection.set(key, parsed);
      }
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

  // 搜尋雲端使用者
  async function handleSearch() {
    const query = searchQuery.trim(); 
    if (!query) {
      if (Platform.OS === 'web') window.alert('提示：請輸入搜尋關鍵字！');
      else Alert.alert('提示', '請輸入搜尋關鍵字！');
      return;
    }

    setLoading(true);
    try {
      // 👑 終極修正：將 `%` 與搜尋關鍵字透過 encodeURIComponent 進行網址安全編碼 (例如 % 變成 %25)
      // 如此一來 Supabase 才能正確解析 or 裡面的模糊比對，不論大小寫都能成功撈出！
      const encodedEmailFilter = encodeURIComponent(`email.ilike.%${query}%`);
      const encodedNameFilter = encodeURIComponent(`name.ilike.%${query}%`);
      
      let filter = `${encodedEmailFilter},${encodedNameFilter}`;
      
      // 如果輸入的是純數字（代表可能是 ID），額外加上 id 的等值查詢條件
      if (!isNaN(Number(query))) {
        filter += `,id.eq.${query}`;
      }
      
      const users = await supabaseFetch(`app_users?or=(${filter})`);
      if (users && Array.isArray(users)) {
        // 過濾掉目前登入的自己（比對時轉小寫防呆）
        const filtered = users.filter((u: any) => u.email.toLowerCase() !== currentUserEmail?.toLowerCase());
        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("搜尋發生錯誤:", err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  // 加好友功能 🚀
  async function handleAddFriend(friendEmail: string) {
    const me = (currentUserEmail ?? '').trim().toLowerCase();
    const friend = friendEmail.trim().toLowerCase();

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

      // 使用 ilike 機制撈取資料庫內最正確的大小寫使用者資料
      const myUsers = await supabaseFetch(`app_users?email=ilike.${encodeURIComponent(me)}`);
      const friendUsers = await supabaseFetch(`app_users?email=ilike.${encodeURIComponent(friend)}`);
      
      if (!myUsers || myUsers.length === 0 || !friendUsers || friendUsers.length === 0) {
        if (Platform.OS === 'web') window.alert('找不到該使用者資料，加好友失敗。');
        else Alert.alert('失敗', '找不到該使用者資料，加好友失敗。');
        return;
      }

      const myData = myUsers[0];
      const friendData = friendUsers[0];

      // 取得現有的好友陣列
      const myFriends: string[] = myData.friends || [];
      const friendFriends: string[] = friendData.friends || [];

      // 檢查是否已經是好友（統一轉小寫比對防呆）
      const isAlreadyFriend = myFriends.some(email => email.toLowerCase() === friend.toLowerCase());
      if (isAlreadyFriend) {
        if (Platform.OS === 'web') window.alert('你們已經是好友囉！');
        else Alert.alert('提示', '你們已經是好友囉！');
        return;
      }

      const requestPayload: FriendRequestPayload = {
        type: 'friend_request',
        from: myData.email.toLowerCase(),
        to: friendData.email.toLowerCase(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await supabaseFetch('chat_messages', 'POST', {
        chat_id: `${FRIEND_REQUEST_PREFIX}${myData.email.toLowerCase()}_${friendData.email.toLowerCase()}`,
        sender_email: myData.email,
        text: JSON.stringify(requestPayload),
      });

      if (Platform.OS === 'web') {
        window.alert(`已送出好友邀請給 ${friendData.name || friendData.email}！`);
      } else {
        Alert.alert('成功', `已送出好友邀請給 ${friendData.name || friendData.email}！`);
      }

      // 👑 儲存成功後，立刻重置清空輸入框與搜尋結果，保持畫面乾淨
      setSearchQuery('');
      setSearchResults([]);
      await loadRequests();

    } catch (err) {
      console.error("加好友失敗:", err);
      if (Platform.OS === 'web') window.alert('網路連線失敗，請稍後再試。');
      else Alert.alert('錯誤', '網路連線失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  async function updateRequestStatus(request: FriendRequestItem, status: Exclude<FriendRequestStatus, 'pending'>) {
    const nextPayload: FriendRequestPayload = {
      ...request,
      status,
      actedAt: new Date().toISOString(),
    };

    await supabaseFetch(`chat_messages?id=eq.${request.id}`, 'PATCH', {
      text: JSON.stringify(nextPayload),
    });
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

      {/* 搜尋組件 */}
      <View style={styles.searchCard}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="輸入好友的 ID、姓名 或 Email..."
            placeholderTextColor="#669bbc"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            blurOnSubmit={false}
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>搜尋</Text>}
          </Pressable>
        </View>
      </View>

      {/* 搜尋結果列表 */}
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
            <Pressable style={styles.addBtn} onPress={() => handleAddFriend(item.email)}>
              <Text style={styles.addBtnText}>加好友</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          searchQuery && !loading ? <Text style={styles.emptyText}>找不到相符的使用者</Text> : null
        }
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
                <Pressable
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() => handleAcceptRequest(request)}
                  disabled={processingRequestId === request.id}>
                  <Text style={styles.actionText}>同意</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleRejectRequest(request)}
                  disabled={processingRequestId === request.id}>
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
  container: { flex: 1, backgroundColor: '#fdf0d5', paddingTop: 60, paddingHorizontal: 16 },
  headerCard: {
    backgroundColor: '#fdf0d5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#669bbc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#003049',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#003049' },
  subtitle: { fontSize: 14, color: '#669bbc', marginTop: 4 },
  searchCard: {
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#fdf0d5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#669bbc',
    padding: 12,
  },
  searchBox: { flexDirection: 'row' },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#fdf0d5',
    borderWidth: 1,
    borderColor: '#669bbc',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginRight: 8,
    color: '#003049',
  },
  searchBtn: { backgroundColor: '#003049', height: 46, width: 80, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fdf0d5', fontSize: 15, fontWeight: 'bold' },
  resultListContent: { paddingBottom: 8 },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fdf0d5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#669bbc',
  },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#003049' },
  userEmail: { fontSize: 13, color: '#669bbc', marginTop: 2 },
  addBtn: { backgroundColor: '#669bbc', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#fdf0d5', fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#669bbc', marginTop: 30, fontSize: 15 },
  sectionBox: { marginTop: 8, marginBottom: 16, backgroundColor: '#fdf0d5', borderRadius: 14, borderWidth: 1, borderColor: '#669bbc', padding: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#003049', marginBottom: 10 },
  emptySmallText: { color: '#669bbc', fontSize: 13 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#669bbc',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  requestEmail: { flex: 1, marginRight: 10, color: '#003049', fontSize: 13 },
  requestActions: { flexDirection: 'row' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginLeft: 8 },
  acceptBtn: { backgroundColor: '#003049' },
  rejectBtn: { backgroundColor: '#c1121f' },
  actionText: { color: '#fdf0d5', fontSize: 12, fontWeight: '700' },
  pendingText: { color: '#780000', fontSize: 12, fontWeight: '700' },
});