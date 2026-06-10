import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function ChatScreen() {
  const router = useRouter();
  // 接收首頁傳過來的好友參數
  const { friendEmail, friendName, friendAvatar, myEmail } = useLocalSearchParams() as any;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // 決定此二人的專屬獨立聊天室唯一 ID (排序防呆，確保 A_B 與 B_A 在同一個對話群)
  const chatId = myEmail < friendEmail ? `${myEmail}_${friendEmail}` : `${friendEmail}_${myEmail}`;

  // 半即時效果：每 1.5 秒高速向雲端獲取最新對話訊息
  useEffect(() => {
    async function fetchChatMessages() {
      try {
        const data = await supabaseFetch(`chat_messages?chat_id=eq.${chatId}&order=created_at.asc`);
        if (data && Array.isArray(data)) {
          setMessages(data);
        }
      } catch (e) {
        console.error("抓取聊天訊息失敗", e);
      }
    }

    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 1500);
    return () => clearInterval(interval);
  }, [chatId]);

  // 送出訊息至 Supabase
  async function handleSendMessage() {
    if (!inputText.trim()) return;
    const sendText = inputText.trim();
    setInputText('');

    try {
      await supabaseFetch('chat_messages', 'POST', {
        chat_id: chatId,
        sender_email: myEmail,
        text: sendText
      });
      
      // 送出後立即重新抓取一次
      const data = await supabaseFetch(`chat_messages?chat_id=eq.${chatId}&order=created_at.asc`);
      if (data && Array.isArray(data)) {
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error("發送訊息失敗", err);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 聊天室頂部導覽列 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>⬅ 返回</Text>
        </Pressable>
        <Image source={{ uri: friendAvatar }} style={styles.headerAvatar} />
        <Text style={styles.headerTitle}>{friendName}</Text>
      </View>

      {/* 訊息對話列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item: any) => item.id?.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.sender_email === myEmail;
          const timeString = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          return (
            <View style={[styles.msgRow, isMe ? styles.myRow : styles.friendRow]}>
              {!isMe && <Image source={{ uri: friendAvatar }} style={styles.msgAvatar} />}
              <View style={styles.msgBody}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.friendBubble]}>
                  <Text style={[styles.bubbleText, isMe ? styles.myText : styles.friendText]}>{item.text}</Text>
                </View>
                <Text style={[styles.timeText, isMe ? { textAlign: 'right' } : { textAlign: 'left' }]}>{timeString}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* 底部文字輸入欄位 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="請輸入訊息..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
        />
        <Pressable style={styles.sendBtn} onPress={handleSendMessage}>
          <Text style={styles.sendBtnText}>發送</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { paddingTop: 50, pb: 12, px: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingBottom: 12 },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 16, color: '#0084FF', fontWeight: '600' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  msgRow: { flexDirection: 'row', marginBottom: 16, maxWidth: '80%' },
  myRow: { alignSelf: 'end', flexDirection: 'row-reverse' },
  friendRow: { alignSelf: 'start' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginTop: 4 },
  msgBody: { mx: 6 },
  bubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  myBubble: { backgroundColor: '#0084FF', borderBottomRightRadius: 4 },
  friendBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  bubbleText: { fontSize: 15 },
  myText: { color: '#fff' },
  friendText: { color: '#0f172a' },
  timeText: { fontSize: 10, color: '#94a3b8', marginTop: 4, paddingHorizontal: 4 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginRight: 10 },
  sendBtn: { backgroundColor: '#0084FF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});