import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [userAvatar, setUserAvatar] = useState('https://i.pravatar.cc/150?u=me_self');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs screenOptions={{ tabBarActiveTintColor: '#0084FF', headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            title: '聊天',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="comments" color={color} />,
          }}
          initialParams={{ userAvatar }}
        />
        <Tabs.Screen
          name="explore" 
          options={{
            title: '設定',
            tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}