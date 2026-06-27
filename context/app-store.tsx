import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
	login: (payload: AuthPayload) => Promise<void>;
	register: (payload: AuthPayload) => Promise<void>;
	logout: () => void;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
	const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
	const [currentUserName, setCurrentUserName] = useState<string | null>(null);

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
	}, []);

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
		},
		[]
	);

	const logout = useCallback(() => {
		setCurrentUserEmail(null);
		setCurrentUserName(null);
	}, []);

	const value = useMemo(
		() => ({
			currentUserEmail,
			currentUserName,
			login,
			register,
			logout,
		}),
		[currentUserEmail, currentUserName, login, logout, register]
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
