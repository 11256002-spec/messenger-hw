import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 這裡直接寫入預設摘要，確保一打開 App 就能看到
  const [dynamicMessages, setDynamicMessages] = useState<any>({
    '林語安': '沒問題，明天圖書館見！',
    '吳奕辰': '那我先去訂位喔。',
    '陳米雅': '這張照片拍得超好看！',
    '王大同': '笑死我了，這梗圖哪來的？',
    '李若依': '那今天晚上八點見。',
    '張家瑋': 'Repo 我更新好了，你再看下。',
    '徐子涵': '作業記得要在期限前交喔。',
    '周杰倫': '期待我的新作品吧！',
    '蔡依林': '沒問題，明天圖書館見！',
    '助教本人': '這次期中作業很有水準，加分！',
  });

  const [myAvatar, setMyAvatar] = useState((params.userAvatar as string) || 'https://i.pravatar.cc/150?u=me_self');

  useEffect(() => {
    const avatarSub = DeviceEventEmitter.addListener('updateAvatar', (uri) => setMyAvatar(uri));
    const msgSub = DeviceEventEmitter.addListener('updateLastMsg', ({ name, msg }) => {
      setDynamicMessages((prev: any) => ({ ...prev, [name]: msg }));
    });
    return () => { avatarSub.remove(); msgSub.remove(); };
  }, []);

  const USERS = [
    { id: '1', name: '林語安', time: '14:00', img: 'https://i.pravatar.cc/100?u=1' },
    { id: '2', name: '吳奕辰', time: '12:30', img: 'https://i.pravatar.cc/100?u=2' },
    { id: '3', name: '陳米雅', time: '11:00', img: 'https://i.pravatar.cc/100?u=3' },
    { id: '4', name: '王大同', time: '10:15', img: 'https://i.pravatar.cc/100?u=4' },
    { id: '5', name: '李若依', time: '09:45', img: 'https://i.pravatar.cc/100?u=5' },
    { id: '6', name: '張家瑋', time: '08:20', img: 'https://i.pravatar.cc/100?u=6' },
    { id: '7', name: '徐子涵', time: '昨天', img: 'https://i.pravatar.cc/100?u=7' },
    { id: '8', name: '周杰倫', time: '昨天', img: 'https://i.pravatar.cc/100?u=8' },
    { id: '9', name: '蔡依林', time: '星期日', img: 'https://i.pravatar.cc/100?u=9' },
    { id: '10', name: '助教本人', time: '星期日', img: 'https://i.pravatar.cc/100?u=10' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Image source={{ uri: myAvatar }} style={styles.myAvatar} />
        <Text style={styles.headerTitle}>聊天</Text>
      </View>
      <View style={styles.horizontalArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {USERS.map(user => (
            <TouchableOpacity key={user.id} style={styles.storyItem} onPress={() => router.push({ pathname: '/chat', params: { name: user.name } })}>
              <Image source={{ uri: user.img }} style={styles.storyAvatar} />
              <Text style={styles.storyName} numberOfLines={1}>{user.name}</Text>
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={USERS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => router.push({ pathname: '/chat', params: { name: item.name } })}>
            <Image source={{ uri: item.img }} style={styles.listAvatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>{dynamicMessages[item.name]}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  myAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', marginRight: 12 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  horizontalArea: { paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  storyItem: { alignItems: 'center', width: 75, marginRight: 10, position: 'relative', marginTop: 10 },
  storyAvatar: { width: 65, height: 65, borderRadius: 32.5, marginBottom: 5, borderWidth: 2, borderColor: '#0084FF' },
  storyName: { fontSize: 12, color: '#333' },
  onlineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CAF50', position: 'absolute', right: 5, bottom: 20, borderWidth: 2, borderColor: '#fff' },
  chatItem: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  listAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  name: { fontSize: 17, fontWeight: '600' },
  time: { fontSize: 13, color: '#999' },
  lastMsg: { fontSize: 15, color: '#666', marginTop: 2 },
});