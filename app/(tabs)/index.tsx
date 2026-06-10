import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function MessengerHomeScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const myEmail = "mengxue@gmail.com"; 

  const fetchChatList = async () => {
    const userData = await supabaseFetch(`app_users?email=eq.${myEmail}`, 'GET');
    if (!userData || userData.length === 0 || !userData[0].friends) return;

    const friendsList = userData[0].friends;
    if (friendsList.length === 0) return;

    const queryStr = friendsList.map((email: string) => `email.eq.${email}`).join(',');
    const friendsData = await supabaseFetch(`app_users?or=(${queryStr})`, 'GET');
    
    if (!friendsData) return;

    const chatListPromises = friendsData.map(async (friend: any) => {
      const chatId = [myEmail, friend.email].sort().join('_');
      const msgData = await supabaseFetch(`chat_messages?chat_id=eq.${chatId}&order=created_at.desc&limit=1`, 'GET');
      
      let lastMessage = "暫無訊息";
      let lastTime = "";
      
      if (msgData && msgData.length > 0) {
        lastMessage = msgData[0].text;
        const date = new Date(msgData[0].created_at);
        lastTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return {
        id: friend.id,
        name: friend.name || friend.email.split('@')[0],
        email: friend.email,
        avatar: friend.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        lastMessage,
        time: lastTime
      };
    });

    const resolvedChats = await Promise.all(chatListPromises);
    setChats(resolvedChats);
  };

  useEffect(() => {
    fetchChatList();
    const interval = setInterval(fetchChatList, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePressChat = (friendEmail: string) => {
    router.push({
      pathname: '/chat',
      params: { myEmail, friendEmail }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>聊天室</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="搜尋" 
          placeholderTextColor="#8e8e93"
        />
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>沒有對話紀錄</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Pressable style={styles.chatItem} onPress={() => handlePressChat(item.email)}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.profileName}>{item.name}</Text>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <Text style={styles.lastMessageText} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  searchBar: { paddingHorizontal: 16, marginVertical: 10 },
  searchInput: { backgroundColor: '#f0f0f2', height: 40, borderRadius: 20, paddingHorizontal: 16, fontSize: 16, color: '#000' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 16 },
  chatItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 14 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  profileName: { fontSize: 17, fontWeight: '600', color: '#000' },
  timeText: { fontSize: 14, color: '#8e8e93' },
  lastMessageText: { fontSize: 15, color: '#8e8e93', maxWidth: '85%' }
});