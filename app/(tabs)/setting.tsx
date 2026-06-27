import { useAppStore } from '@/context/app-store';
import { FontAwesome } from '@expo/vector-icons'; // 👑 引入圖標庫用來做眼睛切換
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseFetch } from '../../supabaseConfig';

export default function SettingScreen() {
  const router = useRouter();
  const { logout, currentUserEmail } = useAppStore();
  
  const [myEmail, setMyEmail] = useState<string>(''); 
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 👑 新增狀態：用來掌控密碼是否處於隱藏狀態 (true 代表隱藏/暗碼，false 代表顯示/明碼)
  const [isPasswordSecure, setIsPasswordSecure] = useState(true);

  // 核心邏輯：動態載入登入使用者的 Gmail 及其專屬雲端資料
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // 優先從全域狀態獲取，若無則從本地快取 (AsyncStorage / localStorage) 讀取
        let savedEmail = currentUserEmail;
        if (!savedEmail) {
          savedEmail = await AsyncStorage.getItem('userEmail');
        }
        if (!savedEmail && typeof window !== 'undefined') {
          savedEmail = window.localStorage.getItem('userEmail');
        }
        
        // 若完全找不到 Email，代表使用者尚未登入
        if (!savedEmail) {
          setIsLoading(false);
          return;
        }

        setMyEmail(savedEmail);

        // 依據登入的專屬 Gmail，至 Supabase 資料庫撈取對應的個人設定
        const data = await supabaseFetch(`app_users?email=eq.${savedEmail}`, 'GET');
        if (data && data.length > 0) {
          const user = data[0];
          setUserId(user.id);
          setName(user.name || '');
          setPassword(user.password || ''); // 載入資料庫內目前的密碼
          if (user.avatar) {
            setAvatar(user.avatar);
          }
        }
      } catch (error) {
        console.error("載入專屬個人檔案失敗:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [currentUserEmail]);

  // 修改頭像功能 (相容手機相簿與網頁端)
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      if (Platform.OS === 'web') {
        window.alert('需要相簿權限才能選擇照片');
      } else {
        Alert.alert('拒絕存取', '需要相簿權限才能選擇照片');
      }
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
        if (Platform.OS === 'web') {
          window.alert('大頭貼已更新並同步至雲端！');
        } else {
          Alert.alert('成功', '大頭貼已更新並同步至雲端！');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert('上傳大頭貼至雲端失敗');
        } else {
          Alert.alert('失敗', '上傳大頭貼至雲端失敗');
        }
      }
    }
  };

  // 儲存修改內容至雲端資料庫 🚀
  const handleUpdateProfile = async () => {
    if (!userId) {
      if (Platform.OS === 'web') window.alert('錯誤：找不到使用者資料，請重新登入');
      else Alert.alert('錯誤', '找不到使用者資料，請重新登入');
      return;
    }
    if (!name.trim()) {
      if (Platform.OS === 'web') window.alert('提示：顯示名稱不能為空！');
      else Alert.alert('提示', '顯示名稱不能為空！');
      return;
    }
    if (!password.trim()) {
      if (Platform.OS === 'web') window.alert('提示：密碼不能為空！');
      else Alert.alert('提示', '密碼不能為空！');
      return;
    }

    // 封裝即將送入 Supabase 資料庫的欄位
    const payload = {
      name: name.trim(),
      password: password.trim() // 將新輸入的密碼傳送上去
    };

    // 執行 PATCH 發送至 Supabase
    const res = await supabaseFetch(`app_users?id=eq.${userId}`, 'PATCH', payload);
    if (res) {
      if (Platform.OS === 'web') {
        window.alert('個人資料及密碼已成功修改，並已確實儲存至雲端資料庫！');
      } else {
        Alert.alert('成功', '個人資料及密碼已成功修改，並已確實儲存至雲端資料庫！');
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert('更新伺服器資料時發生錯誤，請檢查資料庫連線');
      } else {
        Alert.alert('失敗', '更新伺服器資料時發生錯誤，請檢查資料庫連線');
      }
    }
  };

  const handleProfileSubmit = () => {
    void handleUpdateProfile();
  };

  // 登出流程
  const handleLogout = () => {
    const doLogoutProcess = async () => {
      await AsyncStorage.removeItem('userEmail');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('userEmail');
      }
      logout(); 
      router.replace('/');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('確定要登出此帳號嗎？')) {
        doLogoutProcess();
      }
    } else {
      Alert.alert('登出', '確定要登出此帳號嗎？', [
        { text: '取消', style: 'cancel' },
        { text: '確定', style: 'destructive', onPress: doLogoutProcess },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#06C755" />
      </View>
    );
  }

  // 防錯處理：如果檢測到沒有人登入，則顯示提示並導回登入頁面
  if (!userId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>您尚未登入帳號</Text>
        <Text style={styles.errorSubtitle}>請先前往登入或註冊帳號，以顯示專屬設定頁面。</Text>
        <Pressable style={styles.registerButton} onPress={() => router.replace('/')}>
          <Text style={styles.registerButtonText}>前往 登入 / 註冊</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 上方頂欄 */}
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <Text style={styles.title}>帳號設定</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>登出</Text>
        </Pressable>
      </View>

      {/* 中央大頭貼區塊 (比照截圖設計) */}
      <View style={styles.avatarSection}>
        <Image source={{ uri: avatar }} style={styles.largeAvatar} />
        <Pressable style={styles.changeAvatarBtn} onPress={handlePickImage}>
          <Text style={styles.changeAvatarText}>變更大頭貼</Text>
        </Pressable>
      </View>

      {/* 欄位表單群組 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>顯示名稱 (名字)</Text>
        <TextInput
          style={styles.input}
          placeholder="請輸入您的暱稱"
          placeholderTextColor="#a1a1a1"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />
      </View>

      {/* 👑 密碼欄位群組（右側附加眼睛圖標切換） */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>修改密碼</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="請輸入新密碼"
            placeholderTextColor="#a1a1a1"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={isPasswordSecure} // 👑 true為暗碼，false為明碼
            onSubmitEditing={handleProfileSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Pressable 
            style={styles.eyeButton} 
            onPress={() => setIsPasswordSecure(!isPasswordSecure)}
          >
            <FontAwesome 
              name={isPasswordSecure ? "eye-slash" : "eye"} 
              size={20} 
              color="#8e8e93" 
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>電子郵件 (帳號無法變更)</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={myEmail} 
          editable={false}
        />
      </View>

      {/* 綠色儲存修改按鈕 */}
      <Pressable style={styles.saveButton} onPress={handleUpdateProfile}>
        <Text style={styles.saveButtonText}>儲存修改</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 60 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titleArea: { flex: 1 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#000' },
  logoutButton: { backgroundColor: '#ff3b30', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  logoutButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  // 大頭貼區塊樣式
  avatarSection: { alignItems: 'center', marginBottom: 25 },
  largeAvatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#eee', marginBottom: 12 },
  changeAvatarBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  changeAvatarText: { fontSize: 13, color: '#333', fontWeight: '500' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#f0f0f2', height: 48, borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#000', borderWidth: 1, borderColor: '#e5e5ea' },
  disabledInput: { backgroundColor: '#e5e5ea', color: '#8e8e93', borderColor: '#d1d1d6' },
  
  // 👑 密碼專用眼睛包覆層與佈局
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f2',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#000',
  },
  eyeButton: {
    paddingLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  // 綠色儲存按鈕
  saveButton: { backgroundColor: '#06C755', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  errorText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  errorSubtitle: { fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  registerButton: { backgroundColor: '#06C755', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  registerButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});