import { useAppStore } from '@/context/app-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, Image, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View
} from 'react-native';
import { supabaseFetch } from '../supabaseConfig';

// ✅ 修 AsyncStorage（唯一邏輯修改）
const setStorageItem = async (key: string, value: string) => {
  try {
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch {}
};

const getLastReadKey = (ownerEmail: string, chatId: string) =>
  `mchat:lastRead:${ownerEmail}:${chatId}`;

async function markChatsAsRead(ownerEmail: string, chatIds: string[]) {
  if (!ownerEmail || !chatIds.length) return;

  const now = String(Date.now());

  for (const chatId of chatIds) {
    const key = getLastReadKey(ownerEmail, chatId);
    await setStorageItem(key, now);
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const { friendEmail, myEmail: myEmailParam } = useLocalSearchParams() as any;
  const { currentUserEmail } = useAppStore();

  const myEmail =
    typeof (currentUserEmail ?? myEmailParam) === 'string'
      ? (currentUserEmail ?? myEmailParam)
      : '';

  const rawFriendEmail = typeof friendEmail === 'string' ? friendEmail : '';
  const normalizedMyEmail = myEmail.trim().toLowerCase();
  const normalizedFriendEmail = rawFriendEmail.trim().toLowerCase();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [friendInfo, setFriendInfo] = useState({ name: '', avatar: '' });

  const flatListRef = useRef<FlatList>(null);

  const canonicalChatId =
    normalizedMyEmail && normalizedFriendEmail
      ? [normalizedMyEmail, normalizedFriendEmail].sort().join('_')
      : '';

  const chatIdCandidates = (() => {
    if (!normalizedMyEmail || !normalizedFriendEmail) return [];
    const ids = new Set<string>();

    ids.add([normalizedMyEmail, normalizedFriendEmail].sort().join('_'));
    ids.add(`${normalizedMyEmail}_${normalizedFriendEmail}`);
    ids.add(`${normalizedFriendEmail}_${normalizedMyEmail}`);

    return Array.from(ids);
  })();

  const isMemoMode = normalizedMyEmail === normalizedFriendEmail;

  useFocusEffect(
    useCallback(() => {
      setInputText('');
    }, [])
  );

  useEffect(() => {
    async function fetchFriendInfo() {
      if (!normalizedFriendEmail) return;

      if (isMemoMode) {
        setFriendInfo({ name: 'Keep Memo', avatar: '' });
        return;
      }

      const data = await supabaseFetch(
        `app_users?email=ilike.${encodeURIComponent(normalizedFriendEmail)}`
      );

      if (data?.length > 0) {
        setFriendInfo({
          name: data[0].name || normalizedFriendEmail.split('@')[0],
          avatar:
            data[0].avatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        });
      }
    }

    fetchFriendInfo();
  }, [normalizedFriendEmail, isMemoMode]);

  useEffect(() => {
    if (!normalizedMyEmail || !chatIdCandidates.length) return;
    void markChatsAsRead(normalizedMyEmail, chatIdCandidates);
  }, [normalizedMyEmail, canonicalChatId]);

  useEffect(() => {
    async function fetchChatMessages() {
      if (!chatIdCandidates.length) return;

      const orFilter = chatIdCandidates.map(id => `chat_id.eq.${id}`).join(',');
      const data = await supabaseFetch(
        `chat_messages?or=(${orFilter})&order=created_at.asc`
      );

      if (Array.isArray(data)) {
        setMessages(data);

        if (normalizedMyEmail && data.length > 0) {
          const latest = new Date(data[data.length - 1].created_at).getTime();

          if (!isNaN(latest)) {
            for (const id of chatIdCandidates) {
              const key = getLastReadKey(normalizedMyEmail, id);
              await setStorageItem(key, String(latest));
            }
          }
        }

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }

    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 2000);
    return () => clearInterval(interval);
  }, [chatIdCandidates, normalizedMyEmail]);

  const handleSend = async () => {
    if (!inputText.trim() || !canonicalChatId) return;

    const text = inputText;
    setInputText('');

    try {
      await supabaseFetch('chat_messages', 'POST', {
        chat_id: canonicalChatId,
        sender_email: normalizedMyEmail,
        text: text.trim(),
      });

      void markChatsAsRead(normalizedMyEmail, chatIdCandidates);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.mainContainer}
    >
      <View style={styles.innerContainer}>

        {/* Header */}
        <View style={styles.chatHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← 列表</Text>
          </Pressable>
          <Text style={styles.headerName}>{friendInfo.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={{ padding: 14 }}
          renderItem={({ item }) => {
            const isMe =
              String(item.sender_email || '').toLowerCase() === normalizedMyEmail;

            const date = new Date(item.created_at);
            const timeString = isNaN(date.getTime())
              ? ''
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View style={[styles.msgRow, isMe ? styles.myRow : styles.friendRow]}>
                {!isMe && (
                  <Image source={{ uri: friendInfo.avatar }} style={styles.avatar} />
                )}

                <View style={styles.msgWrapper}>
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.friendBubble]}>
                    <Text style={isMe ? styles.myText : styles.friendText}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{timeString}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="輸入訊息..."
            value={inputText}
            onChangeText={setInputText}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
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

  chatHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 10,
    backgroundColor: '#1d2a36',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  backButton: { width: 60 },
  backText: { color: '#fff' },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  msgRow: { flexDirection: 'row', marginBottom: 14 },
  myRow: { justifyContent: 'flex-end' },
  friendRow: { justifyContent: 'flex-start' },

  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },

  msgWrapper: { maxWidth: '75%' },

  bubble: { padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: '#1d2a36' },
  friendBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },

  myText: { color: '#fff' },
  friendText: { color: '#000' },

  timeText: { fontSize: 11, color: '#888', marginTop: 3 },

  inputBar: { flexDirection: 'row', padding: 10, backgroundColor: '#fff' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 12 },
  sendBtn: { marginLeft: 10, justifyContent: 'center' },
  sendBtnText: { color: '#7b2530', fontWeight: 'bold' }
});