import { useAppStore } from '@/context/app-store';
import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
// 👑 引入首頁，用來在未登入時直接當作全螢幕畫面渲染
import MessengerHomeScreen from './index';

export default function TabLayout() {
  const { currentUserEmail } = useAppStore();

  // 👑 核心安全防護機制：如果檢測到使用者「尚未登入」，直接渲染首頁的登入/註冊表單
  // 這樣一來，畫面就不會被包裹在 <Tabs> 內，底部的導覽列（LAYOUT）就會完全消失！
  if (!currentUserEmail) {
    return <MessengerHomeScreen />;
  }

  // 👑 只有在「已登入」的狀態下，才會載入並顯示底部的 Tab 導覽列
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f4' }}>
      <Tabs screenOptions={{ tabBarActiveTintColor: '#1d2a36', tabBarInactiveTintColor: '#7f8a94', tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#d3c7bb' }, headerShown: false }}>
        {/* Tab 1: 聊天室列表 */}
        <Tabs.Screen
          name="index"
          options={{
            title: '聊天列表',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="comments" color={color} />,
          }}
        />
        {/* Tab 2: 增添好友 */}
        <Tabs.Screen
          name="explore" 
          options={{
            title: '增添好友',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="user-plus" color={color} />,
          }}
        />
        {/* Tab 3: 帳號設定 */}
        <Tabs.Screen
          name="setting" 
          options={{
            title: '帳號設定',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="gear" color={color} />,
          }}
        />
        {/* 獨立聊天室頁面 (在 Tab 導覽列中隱藏) */}
        <Tabs.Screen
          name="chat"
          options={{
            href: null, 
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}