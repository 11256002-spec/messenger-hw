import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function MessengerHomeScreen() {
  const router = useRouter();
  
  // 登入狀態管理
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [myEmail, setMyEmail] = useState<string>("");
  const [chats, setChats] = useState<any[]>([]);

  // 登入/註冊表單輸入欄位
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [inputEmail, setInputEmail] = useState<string>("");
  const [inputPassword, setInputPassword] = useState<string>("");
  const [inputName, setInputName] = useState<string>("");

  // 👑 細節優化：搜尋與過濾狀態
  const [searchText, setSearchText] = useState<string>("");

  // 取得聊天列表與好友資料
  const fetchChatList = async () => {
    if (!myEmail) return;
    
    try {
      const userData = await supabaseFetch(`app_users?email=eq.${myEmail}`, 'GET');
      if (!userData || userData.length === 0) return;

      const myInfo = userData[0];
      const friendsList = myInfo.friends || [];
      
      let resolvedChats: any[] = [];

      // Keep Memo (個人備忘錄) 邏輯
      const memoChatId = `${myEmail}_${myEmail}`;
      const memoMsgData = await supabaseFetch(`chat_messages?chat_id=eq.${memoChatId}&order=created_at.desc&limit=1`, 'GET');
      
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
        name: 'Keep Memo',
        email: myEmail, 
        avatar: "", 
        lastMessage: memoLastMessage,
        time: memoLastTime,
        isMemo: true,
        hasUnread: false // 自己跟自己聊不會有未讀紅點
      });

      // 2. 如果有其他好友，撈取好友聊天資料
      if (friendsList.length > 0) {
        const queryStr = friendsList.map((email: string) => `email.eq.${email}`).join(',');
        const friendsData = await supabaseFetch(`app_users?or=(${queryStr})`, 'GET');
        
        if (friendsData) {
          const friendListPromises = friendsData.map(async (friend: any) => {
            const chatId = [myEmail, friend.email].sort().join('_');
            const msgData = await supabaseFetch(`chat_messages?chat_id=eq.${chatId}&order=created_at.desc&limit=1`, 'GET');
            
            let lastMessage = "暫無訊息";
            let lastTime = "";
            let hasUnread = false;
            
            if (msgData && msgData.length > 0) {
              lastMessage = msgData[0].text;
              const date = new Date(msgData[0].created_at);
              if (!isNaN(date.getTime())) {
                lastTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              }
              // 👑 細節優化：如果最後一筆訊息是對方傳的，就標記為「有未讀紅點」
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

      friendItems.sort((a: any, b: any) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return b.time.localeCompare(a.time);
      });

      setChats(memoItem ? [memoItem, ...friendItems] : friendItems);
    } catch (error) {
      console.error("撈取聊天列表失敗:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn && myEmail) {
      fetchChatList();
      const interval = setInterval(fetchChatList, 3000);
      return () => clearInterval(interval);
    } else {
      setChats([]);
    }
  }, [isLoggedIn, myEmail]);

  // 登入與註冊邏輯維持不變
  const handleLogin = async () => {
    if (!inputEmail || !inputPassword) {
      Alert.alert("提示", "請輸入 Email 與密碼");
      return;
    }
    const users = await supabaseFetch(`app_users?email=eq.${inputEmail.trim().toLowerCase()}`, 'GET');
    if (users && users.length > 0) {
      const user = users[0];
      if (user.password === inputPassword.trim()) {
        setMyEmail(user.email);
        setIsLoggedIn(true);
        setInputEmail("");
        setInputPassword("");
      } else {
        Alert.alert("錯誤", "密碼不正確");
      }
    } else {
      Alert.alert("錯誤", "找不到該帳號，請先註冊");
    }
  };

  const handleRegister = async () => {
    const formattedEmail = inputEmail.trim().toLowerCase();
    const formattedPassword = inputPassword.trim();
    if (!formattedEmail || !inputPassword || !inputName) {
      Alert.alert("提示", "請填寫所有欄位");
      return;
    }
    if (!formattedEmail.includes('@')) {
      Alert.alert("格式錯誤", "請輸入正確的電子郵件格式！\n例如：kting002@gmail.com");
      return;
    }
    if (formattedPassword.length < 6) {
      Alert.alert("密碼安全度不足", "密碼長度必須「至少 6 位數」以上！");
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(formattedPassword);
    const hasNumber = /[0-9]/.test(formattedPassword);
    if (!hasLetter || !hasNumber) {
      Alert.alert("密碼格式錯誤", "密碼必須是「英文與數字的組合」！");
      return;
    }
    if (inputPassword.includes(" ")) {
      Alert.alert("密碼格式錯誤", "密碼內不能包含空白字元！");
      return;
    }

    try {
      const existing = await supabaseFetch(`app_users?email=eq.${formattedEmail}`, 'GET');
      if (existing && existing.length > 0) {
        Alert.alert("錯誤", "該 Email 已經被註冊過");
        return;
      }
      const newUser = {
        email: formattedEmail,
        password: formattedPassword, 
        name: inputName.trim(),
        friends: [],
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(formattedEmail)}`
      };
      const res = await supabaseFetch('app_users', 'POST', newUser);
      if (res) {
        Alert.alert("成功", "註冊成功！已自動登入");
        setMyEmail(newUser.email);
        setIsLoggedIn(true);
        setInputEmail("");
        setInputPassword("");
        setInputName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async () => {
    const targetEmail = searchText.trim().toLowerCase();
    if (!targetEmail) return;
    if (targetEmail === myEmail.toLowerCase()) {
      Alert.alert("提示", "不能加自己為好友喔！如果要記事情可以用 Keep Memo");
      setSearchText("");
      return;
    }
    const targetUser = await supabaseFetch(`app_users?email=eq.${targetEmail}`, 'GET');
    if (!targetUser || targetUser.length === 0) {
      Alert.alert("錯誤", "找不到該使用者，請確認 Email 是否正確");
      return;
    }
    const me = await supabaseFetch(`app_users?email=eq.${myEmail}`, 'GET');
    if (!me || me.length === 0) return;

    const currentFriends = me[0].friends || [];
    if (currentFriends.includes(targetEmail)) {
      Alert.alert("提示", "對方已經在您的好友名單中囉！");
      setSearchText("");
      return;
    }

    const updatedMyFriends = [...currentFriends, targetEmail];
    await supabaseFetch(`app_users?email=eq.${myEmail}`, 'PATCH', { friends: updatedMyFriends });

    const targetFriends = targetUser[0].friends || [];
    if (!targetFriends.includes(myEmail)) {
      const updatedTargetFriends = [...targetFriends, myEmail];
      await supabaseFetch(`app_users?email=eq.${targetEmail}`, 'PATCH', { friends: updatedTargetFriends });
    }

    Alert.alert("成功", `已成功將 ${targetUser[0].name || targetEmail} 加入好友！`);
    setSearchText("");
    fetchChatList();
  };

  const handlePressChat = (friendEmail: string) => {
    router.push({
      pathname: '/chat',
      params: { myEmail: myEmail, friendEmail: friendEmail }
    });
  };

  // 👑 核心優化：即時前端關鍵字過濾
  const filteredChats = chats.filter(chat => {
    if (!searchText.trim()) return true;
    // 如果搜尋欄有字，同時比對名稱與 Email，包含關鍵字的才留下
    return (
      chat.name.toLowerCase().includes(searchText.toLowerCase()) ||
      chat.email.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  if (!isLoggedIn) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>{isRegisterMode ? "建立 M-Chat 帳號" : "M-Chat"}</Text>
        {isRegisterMode && <TextInput style={styles.authInput} placeholder="顯示名稱" value={inputName} onChangeText={setInputName} />}
        <TextInput style={styles.authInput} placeholder="電子郵件帳號 (Email)" autoCapitalize="none" keyboardType="email-address" value={inputEmail} onChangeText={setInputEmail} />
        <TextInput style={styles.authInput} placeholder="密碼 (最少6位英文+數字組合)" secureTextEntry value={inputPassword} onChangeText={setInputPassword} />
        <Pressable style={styles.authButton} onPress={isRegisterMode ? handleRegister : handleLogin}><Text style={styles.authButtonText}>{isRegisterMode ? "註冊" : "登入"}</Text></Pressable>
        <Pressable onPress={() => setIsRegisterMode(!isRegisterMode)} style={{ marginTop: 25 }}><Text style={{ color: '#06C755', fontSize: 15, fontWeight: '600' }}>{isRegisterMode ? "切換至登入" : "建立新帳號"}</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>聊天</Text>
        <Pressable style={styles.logoutButton} onPress={() => { setIsLoggedIn(false); setMyEmail(""); }}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>登出</Text></Pressable>
      </View>

      <View style={styles.searchBar}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="搜尋好友名稱 / 輸入 Email 按 Enter 新增..." 
          placeholderTextColor="#a1a1a1"
          value={searchText}
          onChangeText={setSearchText} // 👑 打字時會立刻觸發即時搜尋過濾
          onSubmitEditing={handleAddFriend} // 👑 按下 Enter 鍵時才會執行新增好友
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filteredChats} // 👑 改用過濾後的資料
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Pressable style={styles.chatItem} onPress={() => handlePressChat(item.email)}>
            
            <View>
              {item.isMemo ? (
                <View style={[styles.avatar, styles.memoAvatar]}><Text style={styles.memoAvatarText}>Keep</Text></View>
              ) : (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              )}
              {/* 👑 核心優化：未讀小綠點（比照 LINE 風格綠點） */}
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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#06C755', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.2)' },
  searchBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  searchInput: { backgroundColor: '#f5f5f5', height: 38, borderRadius: 8, paddingHorizontal: 14, fontSize: 14, color: '#000' },
  chatItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#f7f7f7' },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  memoAvatar: { backgroundColor: '#004A26', justifyContent: 'center', alignItems: 'center' },
  memoAvatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  // 👑 未讀小紅點樣式（卡在頭像右上方，完全比照 LINE）
  unreadBadge: { position: 'absolute', right: 12, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#06C755', borderWidth: 1.5, borderColor: '#fff' },

  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  profileName: { fontSize: 16, fontWeight: '600', color: '#111' },
  timeText: { fontSize: 12, color: '#a1a1a1' },
  lastMessageText: { fontSize: 14, color: '#8e8e93', maxWidth: '85%' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  authTitle: { fontSize: 36, fontWeight: 'bold', marginBottom: 40, color: '#06C755', letterSpacing: 1 },
  authInput: { width: '100%', height: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingHorizontal: 5, fontSize: 16, marginBottom: 20, color: '#000' },
  authButton: { width: '100%', height: 48, backgroundColor: '#06C755', borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  authButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});