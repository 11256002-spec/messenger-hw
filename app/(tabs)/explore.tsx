import { useAppStore } from '@/context/app-store';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function ExploreScreen() {
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUserEmail } = useAppStore();

  async function handleAddFriend() {
    const me = (currentUserEmail ?? '').trim().toLowerCase();
    const friend = searchEmail.trim().toLowerCase();

    if (!me) {
      alert('請先登入後再加好友。');
      return;
    }
    if (!friend) {
      alert('請輸入要加入的好友 Email！');
      return;
    }
    if (me === friend) {
      alert('不能加自己為好友喔！');
      return;
    }

    setLoading(true);
    try {
      // 1. 檢查好友帳號是否存在網路上
      const friendUsers = await supabaseFetch(`app_users?email=eq.${friend}`);
      if (!friendUsers || friendUsers.length === 0) {
        alert('找不到該好友帳號，請確認 Email 是否輸入正確！');
        setLoading(false);
        return;
      }
      const friendData = friendUsers[0];

      // 2. 撈取我自己的資料
      const myUsers = await supabaseFetch(`app_users?email=eq.${me}`);
      if (!myUsers || myUsers.length === 0) {
        alert('找不到你的主要登入帳號，請確認你自己的 Email！');
        setLoading(false);
        return;
      }
      const myData = myUsers[0];

      // 3. 檢查是不是早就加過好友了
      const myFriendsList = Array.isArray(myData.friends) ? myData.friends : [];
      if (myFriendsList.includes(friend)) {
        alert('你們已經是好友囉！');
        setLoading(false);
        return;
      }

      // 4. 雙向綁定好友：把我加入他的列表，把他加入我的列表
      const newMyFriends = [...myFriendsList, friend];
      const friendFriendsList = Array.isArray(friendData.friends) ? friendData.friends : [];
      const newFriendFriends = [...friendFriendsList, me];

      // 更新我的雲端資料
      await supabaseFetch(`app_users?email=eq.${me}`, 'PATCH', { friends: newMyFriends });
      // 更新對方的雲端資料
      await supabaseFetch(`app_users?email=eq.${friend}`, 'PATCH', { friends: newFriendFriends });

      alert(`成功將 ${friendData.name || friend} 加為好友！請回首頁查看聊天列表。`);
      setSearchEmail('');
    } catch (err) {
      alert('加好友失敗，請檢查網路連線。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>探索與加好友</Text>
      <Text style={styles.subtitle}>目前登入：{currentUserEmail ?? '尚未登入'}</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="請輸入組員或好友的 Email"
          value={searchEmail}
          onChangeText={setSearchEmail}
          autoCapitalize="none"
        />

        <Pressable style={styles.btn} onPress={handleAddFriend} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>增添雲端好友</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 14 },
  btn: { backgroundColor: '#0084FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});