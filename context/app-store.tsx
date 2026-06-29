import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabaseFetch } from '../supabaseConfig';

type AuthPayload = {
	username: string;
	password: string;
	name?: string;
};

type AppUser = {
	email: string;
	password: string;
	name?: string;
};

type AppStoreValue = {
	currentUserEmail: string | null;
	currentUserName: string | null;
	isAuthReady: boolean;
	login: (payload: AuthPayload) => Promise<void>;
	register: (payload: AuthPayload) => Promise<void>;
	logout: () => void;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);
const AUTH_STORAGE_KEY = 'mchat:auth-user';

type PersistedAuthUser = {
	email: string;
	name: string | null;
};

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
	const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
	const [currentUserName, setCurrentUserName] = useState<string | null>(null);
	const [isAuthReady, setIsAuthReady] = useState(false);

	const persistAuthUser = useCallback(async (user: PersistedAuthUser) => {
		const payload = JSON.stringify(user);
		await AsyncStorage.setItem(AUTH_STORAGE_KEY, payload);
		await AsyncStorage.setItem('userEmail', user.email);
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(AUTH_STORAGE_KEY, payload);
			window.localStorage.setItem('userEmail', user.email);
		}
	}, []);

	const clearPersistedAuthUser = useCallback(async () => {
		await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
		await AsyncStorage.removeItem('userEmail');
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem(AUTH_STORAGE_KEY);
			window.localStorage.removeItem('userEmail');
		}
	}, []);

	useEffect(() => {
		let isMounted = true;

		const hydrateAuthUser = async () => {
			try {
				let raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
				if (!raw && typeof window !== 'undefined') {
					raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
				}
				let legacyEmail = await AsyncStorage.getItem('userEmail');
				if (!legacyEmail && typeof window !== 'undefined') {
					legacyEmail = window.localStorage.getItem('userEmail');
				}

				if (raw) {
					const parsed = JSON.parse(raw) as PersistedAuthUser;
					if (parsed?.email) {
						if (!isMounted) return;
						setCurrentUserEmail(parsed.email);
						setCurrentUserName(parsed.name ?? parsed.email.split('@')[0]);
					}
				} else if (legacyEmail) {
					if (!isMounted) return;
					setCurrentUserEmail(legacyEmail);
					setCurrentUserName(legacyEmail.split('@')[0]);
					await persistAuthUser({ email: legacyEmail, name: legacyEmail.split('@')[0] });
				}
			} catch {
				// ignore malformed storage data and fall back to logged-out state
			} finally {
				if (isMounted) {
					setIsAuthReady(true);
				}
			}
		};

		void hydrateAuthUser();

		return () => {
			isMounted = false;
		};
	}, [persistAuthUser]);

	const register = useCallback(async ({ username, password, name }: AuthPayload) => {
		const normalizedEmail = username.trim().toLowerCase();
		const normalizedPassword = password.trim();

		if (!normalizedEmail || !normalizedPassword) {
			throw new Error('帳號與密碼不能為空。');
		}
		if (!normalizedEmail.includes('@')) {
			throw new Error('請輸入正確的 Email。');
		}

		const hasLetter = /[a-zA-Z]/.test(normalizedPassword);
		const hasNumber = /[0-9]/.test(normalizedPassword);
		if (normalizedPassword.length < 6 || !hasLetter || !hasNumber || normalizedPassword.includes(' ')) {
			throw new Error('密碼需至少 6 碼，且必須包含英文與數字，不能有空白。');
		}

		const existing = await supabaseFetch(`app_users?email=eq.${normalizedEmail}`, 'GET');
		if (Array.isArray(existing) && existing.length > 0) {
			throw new Error('該 Email 已經被註冊過。');
		}

		const newUser = {
			email: normalizedEmail,
			password: normalizedPassword,
			name: name?.trim() || normalizedEmail.split('@')[0],
			friends: [],
			avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(normalizedEmail)}`,
		};
		const created = await supabaseFetch('app_users', 'POST', newUser);
		if (!created) {
			throw new Error('註冊失敗，請稍後再試。');
		}

		setCurrentUserEmail(normalizedEmail);
		setCurrentUserName(newUser.name);
		await persistAuthUser({ email: normalizedEmail, name: newUser.name });
	}, [persistAuthUser]);

	const login = useCallback(
		async ({ username, password }: AuthPayload) => {
			const normalizedEmail = username.trim().toLowerCase();
			const normalizedPassword = password.trim();
			if (!normalizedEmail || !normalizedPassword) {
				throw new Error('請輸入 Email 與密碼。');
			}

			const users = await supabaseFetch(`app_users?email=eq.${normalizedEmail}`, 'GET');
			if (!Array.isArray(users) || users.length === 0) {
				throw new Error('找不到該帳號，請先註冊。');
			}

			const user = users[0] as AppUser & { email?: string; name?: string };
			if (user.password !== normalizedPassword) {
				throw new Error('帳號或密碼錯誤。');
			}

			setCurrentUserEmail(user.email ?? normalizedEmail);
			setCurrentUserName(user.name ?? normalizedEmail.split('@')[0]);
			await persistAuthUser({
				email: user.email ?? normalizedEmail,
				name: user.name ?? normalizedEmail.split('@')[0],
			});
		},
		[persistAuthUser]
	);

	const logout = useCallback(() => {
		setCurrentUserEmail(null);
		setCurrentUserName(null);
		void clearPersistedAuthUser();
	}, [clearPersistedAuthUser]);

	const value = useMemo(
		() => ({
			currentUserEmail,
			currentUserName,
			isAuthReady,
			login,
			register,
			logout,
		}),
		[currentUserEmail, currentUserName, isAuthReady, login, logout, register]
	);

	return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
	const context = useContext(AppStoreContext);
	if (!context) {
		throw new Error('useAppStore 必須在 AppStoreProvider 內使用。');
	}

	return context;
}
