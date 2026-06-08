import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAppStore } from '@/context/app-store';

export default function ChatDetailScreen() {
  const { friendId } = useLocalSearchParams<{ friendId?: string }>();
  const router = useRouter(); 
  const [inputText, setInputText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { currentUser, refresh, getUserById, getConversationWithFriend, sendMessage } = useAppStore();
  const friend = friendId ? getUserById(friendId) : undefined;
  const messages = friendId ? getConversationWithFriend(friendId)?.messages ?? [] : [];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function handleSendMessage() {
    if (!friendId) {
      return;
    }

    try {
      await sendMessage(friendId, inputText);
      setInputText('');
      setFeedback('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '訊息送出失敗。');
    }
  }

  if (!currentUser || !friendId || !friend) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>找不到聊天室</Text>
        <Text style={styles.emptyText}>請先建立好友，再從聊天列表進入對話。</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen options={{ 
        headerShown: true,
        headerTitle: "",
        headerLeft: () => (
          <View style={styles.headerLeftContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><FontAwesome name="chevron-left" size={20} color="#0084FF" /></TouchableOpacity>
            <Image source={{ uri: friend.avatarUri }} style={styles.headerAvatar} />
            <Text style={styles.headerNameText}>{friend.username}</Text>
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="call" size={22} color="#0084FF" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam" size={24} color="#0084FF" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="information-circle" size={24} color="#0084FF" /></TouchableOpacity>
          </View>
        ),
      }} />
      <ScrollView
        ref={scrollViewRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.chatArea}>
        {messages.length === 0 ? (
          <View style={styles.emptyConversationCard}>
            <Text style={styles.emptyConversationTitle}>還沒有訊息</Text>
            <Text style={styles.emptyConversationText}>現在送出第一則訊息，對方下次登入並下拉重新整理後就能看到。</Text>
          </View>
        ) : null}
        {messages.map((m) => (
          <View key={m.id} style={m.senderId === currentUser.id ? styles.outBubble : styles.inBubble}>
            <Text style={m.senderId === currentUser.id ? styles.outText : styles.inText}>{m.text}</Text>
            <Text style={m.senderId === currentUser.id ? styles.outMeta : styles.inMeta}>
              {new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(m.createdAt))}
            </Text>
          </View>
        ))}
      </ScrollView>
      {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="傳送訊息..." value={inputText} onChangeText={setInputText} onSubmitEditing={handleSendMessage} returnKeyType="send" />
        <TouchableOpacity onPress={handleSendMessage}><FontAwesome name="send" size={20} color="#0084FF" style={{ marginLeft: 15 }} /></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  emptyScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  emptyText: { marginTop: 10, fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#64748b' },
  headerLeftContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  backBtn: { paddingRight: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerNameText: { fontSize: 16, fontWeight: 'bold' },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  iconBtn: { paddingHorizontal: 8 },
  chatArea: { padding: 15, paddingBottom: 20 },
  emptyConversationCard: { backgroundColor: '#eff6ff', borderRadius: 22, padding: 18, marginBottom: 16 },
  emptyConversationTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  emptyConversationText: { fontSize: 14, lineHeight: 20, color: '#475569' },
  inBubble: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10, maxWidth: '80%' },
  outBubble: { backgroundColor: '#0084FF', padding: 12, borderRadius: 20, alignSelf: 'flex-end', marginBottom: 10, maxWidth: '80%' },
  inText: { fontSize: 16, color: '#000' },
  outText: { fontSize: 16, color: '#fff' },
  inMeta: { marginTop: 6, fontSize: 11, color: '#64748b' },
  outMeta: { marginTop: 6, fontSize: 11, color: '#dbeafe' },
  feedbackText: { paddingHorizontal: 14, paddingBottom: 6, color: '#dc2626', fontSize: 13 },
  inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#eee', paddingBottom: Platform.OS === 'ios' ? 30 : 10, backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16 },
});