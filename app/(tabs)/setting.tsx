import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function SettingScreen() {
  const router = useRouter();
  const myEmail = "mengxue@gmail.com"; 
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const data = await supabaseFetch(`app_users?email=eq.${myEmail}`, 'GET');
      if (data && data.length > 0) {
        const user = data[0];
        setUserId(user.id);
        setName(user.name || '');
        setPassword(user.password || '');
        if (user.avatar) {
          setAvatar(user.avatar);
        }
      }
    };
    loadUserData();
  }, []);

  const handleUpdateProfile = async () => {
    if (!userId) {
      Alert.alert('錯誤', '找不到使用者資料');
      return;
    }

    const payload = {
      name: name.trim(),
      password: password.trim()
    };

    const res = await supabaseFetch(`app_users?id=eq.${userId}`, 'PATCH', payload);
    if (res) {
      Alert.alert('成功', '基本資料已同步更新至雲端！');
    } else {
      Alert.alert('失敗', '更新伺服器時發生錯誤');
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('拒絕存取', '需要相簿權限才能選擇照片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64 && userId) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      const payload = { avatar: base64Image };
      const res = await supabaseFetch(`app_users?id=eq.${userId}`, 'PATCH', payload);
      
      if (res) {
        setAvatar(base64Image);
        Alert.alert('成功', '大頭貼已成功從本機更換並同步雲端！');
      } else {
        Alert.alert('失敗', '上傳頭像至雲端時失敗');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('登出', '確定要登出此帳號嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定',
        style: 'destructive',
        onPress: () => {
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <Text style={styles.title}>帳號設定</Text>
          <Text style={styles.subtitle}>修改你在雲端資料庫上的個人檔案</Text>
        </View>
        <View style={styles.rightActions}>
          <Pressable onPress={handlePickImage}>
            <Image source={{ uri: avatar }} style={styles.topAvatar} />
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>登出</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>當前登入的 Email（不可修改）</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={myEmail}
          editable={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>變更全新暱稱</Text>
        <TextInput
          style={styles.input}
          placeholder="請輸入新暱稱"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>變更全新密碼</Text>
        <TextInput
          style={styles.input}
          placeholder="請輸入新密碼"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Pressable style={styles.saveButton} onPress={handleUpdateProfile}>
        <Text style={styles.saveButtonText}>儲存修改並同步雲端</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  titleArea: { flex: 1, marginRight: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  topAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee', marginRight: 12 },
  logoutButton: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  logoutButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#f0f0f2', height: 48, borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#000', borderWidth: 1, borderColor: '#e5e5ea' },
  disabledInput: { backgroundColor: '#e5e5ea', color: '#8e8e93', borderColor: '#d1d1d6' },
  saveButton: { backgroundColor: '#1c1c1e', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});