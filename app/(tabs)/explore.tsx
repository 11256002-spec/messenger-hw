import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppStore } from '@/context/app-store';
export default function ProfileScreen() {
  const {
    currentUser,
    users,
    getFriends,
    logout,
    updateAvatar,
    addFriendByUsername,
    acceptFriendRequest,
    rejectFriendRequest,
    getIncomingFriendRequests,
    isHydrating,
  } = useAppStore();
  const [friendUsername, setFriendUsername] = useState('');
  const [message, setMessage] = useState('輸入帳號名稱後，會直接建立雙向好友關係。');
  const incomingRequests = currentUser ? getIncomingFriendRequests() : [];

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      await updateAvatar(result.assets[0].uri);
      setMessage('頭像已更新。');
    }
  }

  async function handleAddFriend() {
    try {
      await addFriendByUsername(friendUsername);
      setMessage(`已新增 ${friendUsername.trim()} 為好友。`);
      setFriendUsername('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '新增好友失敗。');
    }
  }

  async function handleLogout() {
    await logout();
  }

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>載入帳號資料中...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.loggedOutShell}>
        <Text style={styles.authTitle}>帳號中心</Text>
        <Text style={styles.authSubtitle}>請先到「聊天」頁登入或註冊帳號，登入後再回來管理好友與頭像。</Text>
      </View>
    );
  }

  const availableUsers = users.filter(
    (user) =>
      user.id !== currentUser.id &&
      !currentUser.friendIds.includes(user.id) &&
      !currentUser.incomingFriendRequestIds.includes(user.id) &&
      !currentUser.outgoingFriendRequestIds.includes(user.id)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileCard}>
        <Image source={{ uri: currentUser.avatarUri }} style={styles.avatar} />
        <Text style={styles.title}>{currentUser.username}</Text>
        <Text style={styles.subtitle}>你可以登出後切換到其他帳號，模擬好友互傳訊息。</Text>

        <Pressable style={styles.primaryButton} onPress={pickImage}>
          <Text style={styles.primaryButtonText}>更換頭像</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleLogout}>
          <Text style={styles.secondaryButtonText}>登出</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>新增好友</Text>
        <Text style={styles.sectionText}>輸入另一個已存在的帳號名稱，系統會同步幫雙方建立好友。</Text>
        <TextInput
          style={styles.input}
          placeholder="輸入好友帳號"
          autoCapitalize="none"
          value={friendUsername}
          onChangeText={setFriendUsername}
        />
        <Pressable style={styles.primaryButton} onPress={handleAddFriend}>
          <Text style={styles.primaryButtonText}>加入好友</Text>
        </Pressable>
        <Text style={styles.feedbackText}>{message}</Text>
      </View>

      <View style={styles.sectionCard}>
        {incomingRequests.length === 0 ? (
          <Text style={styles.sectionText}>暫時沒有新的邀請。</Text>
        ) : (
          incomingRequests.map((requester) => (
            <View key={requester.id} style={styles.requestRow}>
              <Text style={styles.requestText}>{requester.username} 想加你為好友</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={[styles.requestButton, styles.acceptButton]}
                  onPress={async () => {
                    try {
                      await acceptFriendRequest(requester.id);
                      setMessage(`已接受 ${requester.username} 的好友邀請。`);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : '同意好友邀請失敗。');
                    }
                  }}>
                  <Text style={styles.requestButtonText}>同意</Text>
                </Pressable>
                <Pressable
                  style={[styles.requestButton, styles.rejectButton]}
                  onPress={async () => {
                    try {
                      await rejectFriendRequest(requester.id);
                      setMessage(`已拒絕 ${requester.username} 的邀請。`);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : '拒絕好友邀請失敗。');
                    }
                  }}>
                  <Text style={styles.rejectButtonText}>拒絕</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
        <Text style={styles.sectionTitle}>我的好友</Text>
        {getFriends().length === 0 ? (
          <Text style={styles.sectionText}>目前還沒有好友。</Text>
        ) : (
          getFriends().map((friend) => (
            <View key={friend.id} style={styles.friendRow}>
              <Image source={{ uri: friend.avatarUri }} style={styles.friendAvatar} />
              <Text style={styles.friendName}>{friend.username}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>可加入的帳號</Text>
        {availableUsers.length === 0 ? (
          <Text style={styles.sectionText}>目前沒有其他可加入的帳號，先登出再建立另一個帳號。</Text>
        ) : (
          availableUsers.map((user) => (
            <Pressable key={user.id} style={styles.suggestionChip} onPress={() => setFriendUsername(user.username)}>
              <Text style={styles.suggestionChipText}>{user.username}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 18, gap: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { fontSize: 16, color: '#475569' },
  loggedOutShell: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#f8fafc' },
  authTitle: { width: '100%', maxWidth: 420, fontSize: 32, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  authSubtitle: { width: '100%', maxWidth: 420, fontSize: 15, lineHeight: 22, color: '#475569', marginBottom: 18 },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, alignItems: 'center' },
  avatar: { width: 140, height: 140, borderRadius: 70, marginBottom: 18, backgroundColor: '#dbeafe' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 8, marginBottom: 18, fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#475569' },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  sectionText: { fontSize: 14, lineHeight: 21, color: '#64748b', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  primaryButton: { backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 10, backgroundColor: '#e2e8f0', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  secondaryButtonText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  feedbackText: { marginTop: 12, fontSize: 14, lineHeight: 20, color: '#475569' },
  friendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  friendAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12, backgroundColor: '#dbeafe' },
  friendName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  requestRow: { marginBottom: 14, padding: 14, backgroundColor: '#f8fafc', borderRadius: 18 },
  requestText: { fontSize: 15, color: '#0f172a', marginBottom: 10 },
  requestActions: { flexDirection: 'row', gap: 10 },
  requestButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  acceptButton: { backgroundColor: '#22c55e' },
  rejectButton: { backgroundColor: '#ef4444' },
  requestButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  rejectButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  suggestionChip: { alignSelf: 'flex-start', backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, marginTop: 8 },
  suggestionChipText: { color: '#075985', fontWeight: '600' },
});