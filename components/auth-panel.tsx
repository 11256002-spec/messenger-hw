import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppStore } from '@/context/app-store';

export function AuthPanel() {
  const { login, register } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('建立帳號後，就可以用另一個帳號互加好友。');

  async function handleSubmit() {
    try {
      if (mode === 'login') {
        await login({ username, password });
      } else {
        await register({ username, password });
      }

      setUsername('');
      setPassword('');
      setMessage(mode === 'login' ? '登入成功。' : '帳號建立成功，已自動登入。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失敗。');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{mode === 'login' ? '登入帳號' : '建立帳號'}</Text>
      <Text style={styles.subtitle}>註冊兩個帳號後，可互相加好友並保留對話紀錄。</Text>

      <View style={styles.switchRow}>
        <Pressable
          style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]}
          onPress={() => setMode('login')}>
          <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>登入</Text>
        </Pressable>
        <Pressable
          style={[styles.switchButton, mode === 'register' && styles.switchButtonActive]}
          onPress={() => setMode('register')}>
          <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>註冊</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="帳號"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="密碼"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>{mode === 'login' ? '登入' : '建立帳號'}</Text>
      </Pressable>

      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#001433',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  switchButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#0ea5e9',
  },
  switchText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  switchTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 6,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
});