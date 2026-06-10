import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs screenOptions={{ tabBarActiveTintColor: '#0084FF', headerShown: false }}>
        {/* Tab 1: 聊天室列表 (原本的 index) */}
        <Tabs.Screen
          name="index"
          options={{
            title: '聊天列表',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="comments" color={color} />,
          }}
        />
        {/* Tab 2: 帳號設定與好友 (原本的 explore) */}
        <Tabs.Screen
          name="explore" 
          options={{
            title: '帳號與好友',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} />,
          }}
        />
        {/* 獨立聊天室頁面 (隱藏 Tab，點擊列表後才跳轉) */}
        <Tabs.Screen
          name="chat"
          options={{
            href: null, // 隱藏底部標籤
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}