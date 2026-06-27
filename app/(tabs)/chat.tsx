import { useAppStore } from '@/context/app-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function ChatScreen() {
  const router = useRouter();
  const { friendEmail, myEmail: myEmailParam } = useLocalSearchParams() as any;
  const { currentUserEmail } = useAppStore();
  const myEmail = typeof (currentUserEmail ?? myEmailParam) === 'string' ? (currentUserEmail ?? myEmailParam) : '';
  const normalizedFriendEmail = typeof friendEmail === 'string' ? friendEmail : '';
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [friendInfo, setFriendInfo] = useState({ name: '', avatar: '' });
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  const chatId = myEmail && normalizedFriendEmail
    ? (myEmail < normalizedFriendEmail ? `${myEmail}_${normalizedFriendEmail}` : `${normalizedFriendEmail}_${myEmail}`)
    : '';
  const isMemoMode = myEmail === normalizedFriendEmail;

  useEffect(() => {
    async function fetchFriendInfo() {
      if (!normalizedFriendEmail) return;
      if (isMemoMode) {
        setFriendInfo({ name: 'Keep Memo', avatar: '' });
        return;
      }
      const data = await supabaseFetch(`app_users?email=eq.${normalizedFriendEmail}`, 'GET');
      if (data && data.length > 0) {
        setFriendInfo({
          name: data[0].name || normalizedFriendEmail.split('@')[0],
          avatar: data[0].avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
        });
      }
    }
    fetchFriendInfo();
  }, [normalizedFriendEmail, isMemoMode]);

  useEffect(() => {
    async function fetchChatMessages() {
      if (!chatId) {
        setMessages([]);
        return;
      }
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

  useEffect(() => {
    if (!myEmail) return;
    const timer = setTimeout(() => textInputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [myEmail, normalizedFriendEmail]);

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
      
      const data = await supabaseFetch(`chat_messages?chat_id=eq.${chatId}&order=created_at.asc`);
      if (data && Array.isArray(data)) {
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
      textInputRef.current?.focus();
    } catch (err) {
      console.error("發送訊息失敗", err);
    }
  }

  const content = (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} >
      {!myEmail ? (
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn}><Text style={styles.backText}>返回</Text></Pressable>
          <Text style={styles.headerTitle}>請先登入</Text>
          <View style={{ width: 60 }} />
        </View>
      ) : (
        <>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>ㄑ 聊天</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{friendInfo.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item: any) => item.id?.toString()}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16, paddingBottom: 30 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.sender_email === myEmail;
          const date = new Date(item.created_at);
          const timeString = isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          return (
            <View style={[styles.msgRow, isMe ? styles.myRow : styles.friendRow]}>
              {!isMe && (isMemoMode ? (
                <View style={[styles.msgAvatar, styles.memoAvatarInner]}><Text style={styles.memoAvatarTextInner}>Keep</Text></View>
              ) : (
                <Image source={{ uri: friendInfo.avatar }} style={styles.msgAvatar} />
              ))}
              <View style={[styles.msgContentWrapper, isMe ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.friendBubble]}><Text style={[styles.bubbleText, isMe ? styles.myText : styles.friendText]}>{item.text}</Text></View>
                <View style={styles.timeWrapper}><Text style={styles.timeText}>{timeString}</Text></View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          placeholder="輸入訊息..."
          placeholderTextColor="#a1a1a1"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage} 
          returnKeyType="send"
          enablesReturnKeyAutomatically={true}
          autoFocus={Platform.OS === 'web'}
        />
        <Pressable style={styles.sendBtn} onPress={handleSendMessage}><Text style={styles.sendBtnText}>傳送</Text></Pressable>
      </View>
        </>
      )}
    </KeyboardAvoidingView>
  );

  return (
    Platform.OS === 'web' ? content : <TouchableWithoutFeedback onPress={Keyboard.dismiss}>{content}</TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8499B1' },
  header: { paddingTop: 60, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#06C755', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 60 },
  backText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center', flex: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 14, width: '100%' },
  myRow: { justifyContent: 'flex-end' },
  friendRow: { justifyContent: 'flex-start' },
  msgAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, marginTop: 2 },
  memoAvatarInner: { backgroundColor: '#004A26', justifyContent: 'center', alignItems: 'center' },
  memoAvatarTextInner: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  msgContentWrapper: { maxWidth: '75%', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, maxWidth: '100%' },
  myBubble: { backgroundColor: '#7ECE55', marginRight: 4, borderBottomRightRadius: 4 },
  friendBubble: { backgroundColor: '#fff', marginLeft: 4, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 16, lineHeight: 21 },
  myText: { color: '#000' },
  friendText: { color: '#000' },
  timeWrapper: { justifyContent: 'flex-end', paddingBottom: 2, marginHorizontal: 4 },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  inputBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, marginRight: 10, color: '#000', maxHeight: 100 },
  sendBtn: { backgroundColor: '#06C755', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18 },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});