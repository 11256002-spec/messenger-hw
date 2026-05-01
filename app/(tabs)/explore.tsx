import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Button, DeviceEventEmitter, Image, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const [avatar, setAvatar] = useState('https://i.pravatar.cc/150?u=me_self');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      setAvatar(newUri);
      // 發射一個名為 "updateAvatar" 的信號，帶上新的圖片路徑
      DeviceEventEmitter.emit('updateAvatar', newUri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>個人設定</Text>
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <Button title="更換頭像" onPress={pickImage} color="#0084FF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  avatar: { width: 150, height: 150, borderRadius: 75, marginBottom: 25, borderWidth: 1, borderColor: '#eee' },
});