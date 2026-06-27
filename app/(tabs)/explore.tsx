import { useAppStore } from '@/context/app-store';
import React, { useCallback, useState } from 'react';
// 👑 useFocusEffect：保證切換分頁、搜尋完或離開再進來時，都會自動清空輸入框與搜尋列表
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { currentUserEmail } = useAppStore();

  // 👑 換頁切換 Tab 進來時，自動重置並徹底清空搜尋狀態與結果
  useFocusEffect(
    useCallback(() => {
      setSearchQuery('');
      setSearchResults([]);
    }, [])
  );

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
    const me = (currentUserEmail ?? '').trim();
    const friend = friendEmail.trim();

    if (!me) {
      if (Platform.OS === 'web') window.alert('請先登入後再加好友。');
      else Alert.alert('提示', '請先登入後再加好友。');
      return;
    }

    setLoading(true);
    try {
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

      // 雙向加入好友列表（存入對方的正確大小寫 Email）
      const updatedMyFriends = [...myFriends, friendData.email];
      const updatedFriendFriends = [...friendFriends, myData.email];

      // 確實更新雲端資料庫
      await supabaseFetch(`app_users?id=eq.${myData.id}`, 'PATCH', { friends: updatedMyFriends });
      await supabaseFetch(`app_users?id=eq.${friendData.id}`, 'PATCH', { friends: updatedFriendFriends });

      if (Platform.OS === 'web') {
        window.alert(`已成功與 ${friendData.name || friendData.email} 互加為好友！`);
      } else {
        Alert.alert('成功', `已成功與 ${friendData.name || friendData.email} 互加為好友！`);
      }

      // 👑 儲存成功後，立刻重置清空輸入框與搜尋結果，保持畫面乾淨
      setSearchQuery('');
      setSearchResults([]);

    } catch (err) {
      console.error("加好友失敗:", err);
      if (Platform.OS === 'web') window.alert('網路連線失敗，請稍後再試。');
      else Alert.alert('錯誤', '網路連線失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>探索與增添好友</Text>
      <Text style={styles.subtitle}>目前登入：{currentUserEmail ?? '尚未登入'}</Text>

      {/* 搜尋組件 */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="輸入好友的 ID、姓名 或 Email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>搜尋</Text>}
        </Pressable>
      </View>

      {/* 搜尋結果列表 */}
      <FlatList
        data={searchResults}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 24 },
  searchBox: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, height: 46, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 16, fontSize: 15, marginRight: 10, color: '#000' },
  searchBtn: { backgroundColor: '#06C755', height: 46, width: 80, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  userCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#0084FF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 30, fontSize: 15 }
});