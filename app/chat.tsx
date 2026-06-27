import { useAppStore } from '@/context/app-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
// 👑 引入 useFocusEffect 確保每次切換分頁、進出聊天室時都能自動重置清空輸入框
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
// 👑 關鍵修正：因為檔案移到了最外層，相對路徑從 ../../ 改為 ../ 才能正確引入配置
import { supabaseFetch } from '../supabaseConfig';

const getLastReadKey = (ownerEmail: string, chatId: string) => `mchat:lastRead:${ownerEmail}:${chatId}`;

async function markChatsAsRead(ownerEmail: string, chatIds: string[]) {
  if (!ownerEmail || !chatIds.length) return;

  const now = String(Date.now());
  for (const chatId of chatIds) {
    const key = getLastReadKey(ownerEmail, chatId);
    try {
      await AsyncStorage.setItem(key, now);
    } catch {
      // noop
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, now);
    }
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const { friendEmail, myEmail: myEmailParam } = useLocalSearchParams() as any;
  const { currentUserEmail } = useAppStore();
  const myEmail = typeof (currentUserEmail ?? myEmailParam) === 'string' ? (currentUserEmail ?? myEmailParam) : '';
  const rawFriendEmail = typeof friendEmail === 'string' ? friendEmail : '';
  const normalizedMyEmail = myEmail.trim().toLowerCase();
  const normalizedFriendEmail = rawFriendEmail.trim().toLowerCase();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [friendInfo, setFriendInfo] = useState({ name: '', avatar: '' });
  const flatListRef = useRef<FlatList>(null);

  const canonicalChatId = normalizedMyEmail && normalizedFriendEmail
    ? [normalizedMyEmail, normalizedFriendEmail].sort().join('_')
    : '';
  const chatIdCandidates = (() => {
    if (!normalizedMyEmail || !normalizedFriendEmail) return [] as string[];
    const ids = new Set<string>();
    ids.add([normalizedMyEmail, normalizedFriendEmail].sort().join('_'));
    ids.add(`${normalizedMyEmail}_${normalizedFriendEmail}`);
    ids.add(`${normalizedFriendEmail}_${normalizedMyEmail}`);
    if (myEmail && rawFriendEmail) {
      ids.add([myEmail, rawFriendEmail].sort().join('_'));
      ids.add(`${myEmail}_${rawFriendEmail}`);
      ids.add(`${rawFriendEmail}_${myEmail}`);
    }
    return Array.from(ids).filter(Boolean);
  })();
  const isMemoMode = normalizedMyEmail === normalizedFriendEmail;

  // 👑 換頁/進入聊天室時，自動清空輸入框內文字
  useFocusEffect(
    useCallback(() => {
      setInputText('');
    }, [])
  );

  // 取得好友個人資料（包含頭像）
  useEffect(() => {
    async function fetchFriendInfo() {
      if (!normalizedFriendEmail) return;
      if (isMemoMode) {
        setFriendInfo({ name: "Keep Memo", avatar: "" });
        return;
      }
      const data = await supabaseFetch(`app_users?email=ilike.${encodeURIComponent(normalizedFriendEmail)}`);
      if (data && data.length > 0) {
        setFriendInfo({
          name: data[0].name || normalizedFriendEmail.split('@')[0],
          avatar: data[0].avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
        });
      }
    }
    fetchFriendInfo();
  }, [normalizedFriendEmail, isMemoMode]);

  // 輪詢取得最新聊天訊息
  useEffect(() => {
    if (!normalizedMyEmail || !chatIdCandidates.length) return;
    void markChatsAsRead(normalizedMyEmail, chatIdCandidates);
  }, [normalizedMyEmail, canonicalChatId]);

  useEffect(() => {
    async function fetchChatMessages() {
      if (!chatIdCandidates.length) return;
      const orFilter = chatIdCandidates.map((id) => `chat_id.eq.${id}`).join(',');
      const data = await supabaseFetch(`chat_messages?or=(${orFilter})&order=created_at.asc`);
      if (data && Array.isArray(data)) {
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }
    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 2000); // 每2秒自動向網路資料庫刷新對話
    return () => clearInterval(interval);
  }, [chatIdCandidates]);

  // 發送訊息
  const handleSend = async () => {
    if (!inputText.trim() || !canonicalChatId) return;
    const currentText = inputText;
    
    // 👑 發送完訊息後，立刻清空輸入框內容
    setInputText('');

    try {
      await supabaseFetch('chat_messages', 'POST', {
        chat_id: canonicalChatId,
        sender_email: normalizedMyEmail,
        text: currentText.trim(),
      });
      // 發送完畢後，立即撈取最新對話更新畫面並滾動到底部
      const orFilter = chatIdCandidates.map((id) => `chat_id.eq.${id}`).join(',');
      const updated = await supabaseFetch(`chat_messages?or=(${orFilter})&order=created_at.asc`);
      if (updated) {
        setMessages(updated);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch (e) {
      console.error("發送訊息失敗：", e);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContainer}>
      <View style={styles.innerContainer}>
        {/* 👑 頂欄設計：完全不擺放任何登出按鈕，只有左側的「ㄑ 列表」與中央好友名稱 */}
        <View style={styles.chatHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>ㄑ 列表</Text>
          </Pressable>
          <Text style={styles.headerName}>{friendInfo.name}</Text>
          {/* 右側保留等寬空白塊做完美置中對齊 */}
          <View style={{ width: 60 }} />
        </View>

        {/* 訊息歷史列表 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled" // 👑 徹底解決「需要長按才能打字」的 Bug，單擊直接聚焦
          renderItem={({ item }) => {
            const isMe = String(item.sender_email || '').toLowerCase() === normalizedMyEmail;
            const date = new Date(item.created_at);
            const timeString = isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            return (
              <View style={[styles.msgRow, isMe ? styles.myRow : styles.friendRow]}>
                {!isMe && (
                  isMemoMode ? (
                    <View style={[styles.msgAvatar, styles.memoAvatarInner]}><Text style={styles.memoAvatarTextInner}>Keep</Text></View>
                  ) : (
                    <Image source={{ uri: friendInfo.avatar }} style={styles.msgAvatar} />
                  )
                )}
                <View style={styles.msgContentWrapper}>
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.friendBubble]}>
                    <Text style={[styles.bubbleText, isMe ? styles.myText : styles.friendText]}>{item.text}</Text>
                  </View>
                  <View style={styles.timeWrapper}><Text style={styles.timeText}>{timeString}</Text></View>
                </View>
              </View>
            );
          }}
        />

        {/* 底部輸入欄 🚀 */}
        <View style={styles.inputBar}>
          <TextInput 
            style={styles.chatInput} 
            placeholder="輸入訊息..." 
            placeholderTextColor="#7f8a94"
            value={inputText} 
            onChangeText={setInputText} 
            multiline={Platform.OS !== 'web'}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend} disabled={!inputText.trim()}>
            <Text style={styles.sendBtnText}>傳送</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f7f7f4' },
  innerContainer: { flex: 1 },
  chatHeader: { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 10, backgroundColor: '#1d2a36', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 60, paddingLeft: 5 },
  backText: { color: '#f7f7f4', fontSize: 16, fontWeight: '600' },
  headerName: { fontSize: 18, fontWeight: 'bold', color: '#f7f7f4' },
  msgRow: { flexDirection: 'row', marginBottom: 14, width: '100%' },
  myRow: { justifyContent: 'flex-end' },
  friendRow: { justifyContent: 'flex-start' },
  msgAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, marginTop: 2 },
  memoAvatarInner: { backgroundColor: '#7b2530', justifyContent: 'center', alignItems: 'center' },
  memoAvatarTextInner: { color: '#f7f7f4', fontSize: 10, fontWeight: 'bold' },
  msgContentWrapper: { maxWidth: '75%', flexDirection: 'row', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, maxWidth: '100%' },
  myBubble: { backgroundColor: '#1d2a36', marginRight: 4 },
  friendBubble: { backgroundColor: '#ffffff', marginLeft: 4, borderWidth: 1, borderColor: '#d3c7bb' },
  bubbleText: { fontSize: 16, lineHeight: 21, color: '#1d2a36' },
  myText: { color: '#f7f7f4' },
  friendText: { color: '#1d2a36' },
  timeWrapper: { marginHorizontal: 6, marginBottom: 2 },
  timeText: { fontSize: 11, color: '#7f8a94' },
  inputBar: { 
    flexDirection: 'row', 
    paddingHorizontal: 12, 
    paddingTop: 10, 
    // 👑 修正：因為沒有底部導覽列了，為了不讓輸入框貼緊 iPhone 或滿版 Android 的底部安全線，iOS 給予 25 留白，其餘給 12
    paddingBottom: Platform.OS === 'ios' ? 25 : 12, 
    backgroundColor: '#ffffff', 
    borderTopWidth: 1,
    borderTopColor: '#d3c7bb',
    alignItems: 'center' 
  },
  chatInput: { flex: 1, minHeight: 38, maxHeight: 80, backgroundColor: '#fbfbf8', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, marginRight: 10, color: '#1d2a36', borderWidth: 1, borderColor: '#d3c7bb' },
  sendBtn: { backgroundColor: '#7b2530', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18 },
  sendBtnText: { color: '#f7f7f4', fontSize: 15, fontWeight: 'bold' }
});