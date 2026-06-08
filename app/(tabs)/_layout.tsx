import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs screenOptions={{ tabBarActiveTintColor: '#0084FF', headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            title: '聊天',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="comments" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore" 
          options={{
            title: '帳號',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} />,
          }}
        />
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