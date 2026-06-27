import { useAppStore } from '@/context/app-store';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
// 👑 引入 useFocusEffect 確保換頁切換 Tab 進來時，能立刻清空搜尋框
import { useFocusEffect } from '@react-navigation/native';
import { supabaseFetch } from '../../supabaseConfig';

export default function MessengerHomeScreen() {
  const router = useRouter();
  const { currentUserEmail, login, register } = useAppStore(); // 👑 移除不用到的 logout
  const myEmail = currentUserEmail ?? '';
  
  const [chats, setChats] = useState<any[]>([]);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [inputEmail, setInputEmail] = useState<string>("");
  const [inputPassword, setInputPassword] = useState<string>("");
  const [inputName, setInputName] = useState<string>("");
  const [authMessage, setAuthMessage] = useState<string>('');
  
  // 搜尋與過濾狀態
  const [searchText, setSearchText] = useState<string>("");

  // 👑 核心重置機制：每次換頁、切換 Tab 回到聊天列表首頁時，強制清空搜尋欄位
  useFocusEffect(
    useCallback(() => {
      setSearchText("");
    }, [])
  );

  // 取得聊天列表與好友資料
  const buildChatIdCandidates = (firstEmail: string, secondEmail: string) => {
    const first = (firstEmail ?? '').trim();
    const second = (secondEmail ?? '').trim();
    const lowerFirst = first.toLowerCase();
    const lowerSecond = second.toLowerCase();
    const ids = new Set<string>();

    if (lowerFirst && lowerSecond) {
      ids.add([lowerFirst, lowerSecond].sort().join('_'));
      ids.add(`${lowerFirst}_${lowerSecond}`);
      ids.add(`${lowerSecond}_${lowerFirst}`);
    }
    if (first && second) {
      ids.add([first, second].sort().join('_'));
      ids.add(`${first}_${second}`);
      ids.add(`${second}_${first}`);
    }

    return Array.from(ids).filter(Boolean);
  };

  const fetchChatList = async () => {
    if (!myEmail) return;
    
    try {
      const userData = await supabaseFetch(`app_users?email=eq.${myEmail}`, 'GET');
      if (!userData || userData.length === 0) return;

      const myInfo = userData[0];
      const friendsList = myInfo.friends || [];
      let resolvedChats: any[] = [];

      // 1. Keep Memo (備忘錄)
      const memoChatIds = buildChatIdCandidates(myEmail, myEmail);
      const memoOrFilter = memoChatIds.map((id) => `chat_id.eq.${id}`).join(',');
      const memoMsgData = await supabaseFetch(`chat_messages?or=(${memoOrFilter})&order=created_at.desc&limit=1`, 'GET');
      let memoLastMessage = "傳送訊息給自己吧！";
      let memoLastTime = "";
      
      if (memoMsgData && memoMsgData.length > 0) {
        memoLastMessage = memoMsgData[0].text;
        const date = new Date(memoMsgData[0].created_at);
        if (!isNaN(date.getTime())) {
          memoLastTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
      }

      resolvedChats.push({
        id: 'keep_memo',
        name: 'Keep Memo (備忘錄)',
        email: myEmail, 
        avatar: "", 
        lastMessage: memoLastMessage,
        time: memoLastTime,
        isMemo: true,
        hasUnread: false
      });

      // 2. 雲端好友列表
      if (friendsList.length > 0) {
        const queryStr = friendsList.map((email: string) => `email.eq.${email}`).join(',');
        const friendsData = await supabaseFetch(`app_users?or=(${queryStr})`, 'GET');
        
        if (friendsData) {
          const friendListPromises = friendsData.map(async (friend: any) => {
            const chatIds = buildChatIdCandidates(myEmail, friend.email);
            const orFilter = chatIds.map((id) => `chat_id.eq.${id}`).join(',');
            const msgData = await supabaseFetch(`chat_messages?or=(${orFilter})&order=created_at.desc&limit=1`, 'GET');
            
            let lastMessage = "暫無訊息，開始聊天吧！";
            let lastTime = "";
            let hasUnread = false;
            
            if (msgData && msgData.length > 0) {
              lastMessage = msgData[0].text;
              const date = new Date(msgData[0].created_at);
              if (!isNaN(date.getTime())) {
                lastTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              }
              if (msgData[0].sender_email !== myEmail) {
                hasUnread = true; 
              }
            }

            return {
              id: friend.id,
              name: friend.name || friend.email.split('@')[0],
              email: friend.email,
              avatar: friend.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
              lastMessage,
              time: lastTime,
              isMemo: false,
              hasUnread: hasUnread
            };
          });

          const fetchedFriendsChats = await Promise.all(friendListPromises);
          resolvedChats = [...resolvedChats, ...fetchedFriendsChats];
        }
      }

      const memoItem = resolvedChats.find(c => c.isMemo);
      const friendItems = resolvedChats.filter(c => !c.isMemo);
      friendItems.sort((a: any, b: any) => (b.time || '').localeCompare(a.time || ''));
      setChats(memoItem ? [memoItem, ...friendItems] : friendItems);
    } catch (error) {
      console.error("撈取聊天列表失敗:", error);
    }
  };

  useEffect(() => {
    if (currentUserEmail && myEmail) {
      fetchChatList();
      const interval = setInterval(fetchChatList, 4000);
      return () => clearInterval(interval);
    } else {
      setChats([]);
    }
  }, [currentUserEmail, myEmail]);

  const handleLogin = async () => {
    try {
      await login({ username: inputEmail.trim().toLowerCase(), password: inputPassword });
      setInputEmail('');
      setInputPassword('');
      setAuthMessage('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '登入失敗，請稍後再試。');
    }
  };

  const handleRegister = async () => {
    if (!inputName.trim() || !inputEmail.trim() || !inputPassword.trim()) {
      setAuthMessage('所有欄位皆為必填項目！');
      return;
    }
    try {
      await register({ name: inputName.trim(), username: inputEmail.trim().toLowerCase(), password: inputPassword });
      setIsRegisterMode(false);
      setInputEmail('');
      setInputPassword('');
      setInputName('');
      setAuthMessage('註冊成功，請登入您的帳號。');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '註冊失敗，該 Email 可能已被註冊。');
    }
  };

  const handleAuthSubmit = () => {
    if (isRegisterMode) {
      void handleRegister();
      return;
    }
    void handleLogin();
  };

  // 依據搜尋框關鍵字進行動態過濾
  const filteredChats = chats.filter(chat => {
    if (!searchText.trim()) return true;
    return (
      chat.name.toLowerCase().includes(searchText.toLowerCase()) ||
      chat.email.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  // 未登入狀態下的歡迎畫面
  if (!currentUserEmail) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>{isRegisterMode ? "建立 M-Chat 帳號" : "M-Chat"}</Text>
        {isRegisterMode && (
          <TextInput
            style={styles.authInput}
            placeholder="顯示名稱"
            value={inputName}
            onChangeText={setInputName}
            returnKeyType="next"
          />
        )}
        <TextInput
          style={styles.authInput}
          placeholder="電子郵件帳號 (Email)"
          autoCapitalize="none"
          keyboardType="email-address"
          value={inputEmail}
          onChangeText={setInputEmail}
          returnKeyType="next"
        />
        <TextInput
          style={styles.authInput}
          placeholder="密碼 (最少6位)"
          secureTextEntry
          value={inputPassword}
          onChangeText={setInputPassword}
          onSubmitEditing={handleAuthSubmit}
          returnKeyType={isRegisterMode ? 'done' : 'send'}
          blurOnSubmit={false}
        />
        {!!authMessage && <Text style={styles.authMessage}>{authMessage}</Text>}
        <Pressable style={styles.authButton} onPress={isRegisterMode ? handleRegister : handleLogin}><Text style={styles.authButtonText}>{isRegisterMode ? "註冊" : "登入"}</Text></Pressable>
        <Pressable onPress={() => { setIsRegisterMode(!isRegisterMode); setAuthMessage(''); }} style={{ marginTop: 25 }}>
          <Text style={{ color: '#06C755', fontSize: 15, fontWeight: '600' }}>{isRegisterMode ? "切換至登入" : "建立新帳號"}</Text>
        </Pressable>
      </View>
    );
  }

  // 已登入狀態下的主畫面
  return (
    <View style={styles.container}>
      {/* 👑 頂欄優化：完全移除了原本右上角突兀的「登出系統」綠色按鈕，只保留乾淨的標題 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>聊天室列表</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="搜尋好友名稱或 Email..." 
          placeholderTextColor="#a1a1a1"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.chatItem} 
            onPress={() => {
              // 👑 點擊聊天對象準備換頁進入對話框前，先把首頁的搜尋狀態清空
              setSearchText("");
              router.push({ pathname: '/chat', params: { friendEmail: item.email } });
            }}
          >
            <View>
              {item.isMemo ? (
                <View style={[styles.avatar, styles.memoAvatar]}><Text style={styles.memoAvatarText}>Keep</Text></View>
              ) : (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              )}
              {item.hasUnread && <View style={styles.unreadBadge} />}
            </View>

            <View style={styles.chatInfo}>
              <View style={styles.chatHeaderRow}>
                <Text style={[styles.profileName, item.isMemo && { color: '#004A26' }]}>{item.name}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.lastMessageText} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // 👑 調整 Header 的結構樣式，使其保持簡潔並將標題維持在好看的位置
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#06C755', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  searchBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  searchInput: { backgroundColor: '#f5f5f5', height: 38, borderRadius: 8, paddingHorizontal: 14, fontSize: 14, color: '#000' },
  chatItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#f7f7f7' },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  memoAvatar: { backgroundColor: '#004A26', justifyContent: 'center', alignItems: 'center' },
  memoAvatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  unreadBadge: { position: 'absolute', right: 12, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#06C755', borderWidth: 1.5, borderColor: '#fff' },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  profileName: { fontSize: 16, fontWeight: '600', color: '#111' },
  timeText: { fontSize: 12, color: '#a1a1a1' },
  lastMessageText: { fontSize: 14, color: '#8e8e93', maxWidth: '85%' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  authTitle: { fontSize: 36, fontWeight: 'bold', marginBottom: 40, color: '#06C755', letterSpacing: 1 },
  authInput: { width: '100%', height: 48, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingHorizontal: 5, fontSize: 16, marginBottom: 20, color: '#000' },
  authMessage: { width: '100%', color: '#dc2626', fontSize: 14, marginBottom: 8 },
  authButton: { width: '100%', height: 48, backgroundColor: '#06C755', borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  authButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});