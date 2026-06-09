import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'messenger-hw-store-v1';
const TOKEN_KEY = 'messenger-hw-token';
const SERVER_URL = 'http://localhost:4000';

export type AppUser = {
  id: string;
  username: string;
  password: string;
  avatarUri: string;
  friendIds: string[];
  incomingFriendRequestIds: string[];
  outgoingFriendRequestIds: string[];
  createdAt: string;
};

export type AppMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type AppConversation = {
  id: string;
  participantIds: [string, string];
  messages: AppMessage[];
};

type AppState = {
  currentUserId: string | null;
  users: AppUser[];
  conversations: AppConversation[];
};

type RegisterInput = {
  username: string;
  password: string;
};

type AppStoreContextValue = {
  isHydrating: boolean;
  currentUser: AppUser | null;
  users: AppUser[];
  conversations: AppConversation[];
  register: (input: RegisterInput) => Promise<void>;
  login: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<void>;
  addFriendByUsername: (username: string) => Promise<void>;
  acceptFriendRequest: (fromUserId: string) => Promise<void>; // Expose new method
  rejectFriendRequest: (fromUserId: string) => Promise<void>; // Expose new method
  getIncomingFriendRequests: () => AppUser[]; // Expose new method
  sendMessage: (friendId: string, text: string) => Promise<void>;
  refresh: () => Promise<void>;
  getUserById: (userId: string) => AppUser | undefined;
  getFriends: () => AppUser[];
  getConversationWithFriend: (friendId: string) => AppConversation | undefined;
};

const defaultState: AppState = {
  currentUserId: null,
  users: [],
  conversations: [],
};

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function createAvatar(username: string) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(normalizeUsername(username) || 'user')}`;
}

function findConversation(conversations: AppConversation[], firstUserId: string, secondUserId: string) {
  return conversations.find((conversation) => {
    const [left, right] = conversation.participantIds;
    return (
      (left === firstUserId && right === secondUserId) ||
      (left === secondUserId && right === firstUserId)
    );
  });
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isHydrating, setIsHydrating] = useState(true);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    refresh().finally(() => setIsHydrating(false));
  }, []);

  async function persist(nextState: AppState) {
    stateRef.current = nextState;
    setState(nextState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }
  async function apiFetch(path: string, options: any = {}) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || 'API error');
    return body;
  }

  async function loadFromServer() {
    // fetch current user, users, conversations
    const me = await apiFetch('/api/me');
    const users = await apiFetch('/api/users');
    const conversations = await apiFetch('/api/conversations');

    const next: AppState = {
      currentUserId: me.id,
      users: users.map((u: any) => ({ ...u })),
      conversations: conversations || [],
    };

    await persist(next);
  }

  async function refresh() {
    // if a token exists, hydrate from server; otherwise fallback to local storage
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await loadFromServer();
        return;
      } catch (e) {
        // if server fetch fails, continue to fall back to local state
        console.warn('Failed to load from server:', e.message);
      }
    }

    // Development helper: if running in dev and no token, fetch a dev token and store it
    // @ts-ignore
    if (!token && typeof __DEV__ !== 'undefined' && __DEV__) {
      try {
        const dev = await fetch(`${SERVER_URL}/api/dev/get-token`);
        if (dev.ok) {
          const body = await dev.json();
          if (body?.token) {
            await AsyncStorage.setItem(TOKEN_KEY, body.token);
            await loadFromServer();
            return;
          }
        }
      } catch (err) {
        console.warn('dev token fetch failed', err?.message || err);
      }
    }

    const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      stateRef.current = defaultState;
      setState(defaultState);
      return;
    }

    const parsed = JSON.parse(rawValue) as AppState;
    const safeState: AppState = {
      currentUserId: parsed.currentUserId ?? null,
      users: (parsed.users ?? []).map((user) => ({
        ...user,
        friendIds: user.friendIds ?? [],
        incomingFriendRequestIds: user.incomingFriendRequestIds ?? [],
        outgoingFriendRequestIds: user.outgoingFriendRequestIds ?? [],
      })),
      conversations: parsed.conversations ?? [],
    };

    stateRef.current = safeState;
    setState(safeState);
  }

  function getCurrentState() {
    return stateRef.current;
  }

  function getRequiredCurrentUser() {
    const currentState = getCurrentState();
    const user = currentState.users.find((item) => item.id === currentState.currentUserId);
    if (!user) {
      throw new Error('請先登入帳號');
    }
    return user;
  }

  async function register(input: RegisterInput) {
    const username = input.username.trim();
    const password = input.password.trim();

    if (!username || !password) {
      throw new Error('請輸入帳號與密碼');
    }

    // call server register
    const body = await apiFetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // store token and load from server
    if (body.token) await AsyncStorage.setItem(TOKEN_KEY, body.token);
    await loadFromServer();
  }

  async function login(input: RegisterInput) {
    const username = input.username.trim();
    const password = input.password.trim();

    if (!username || !password) {
      throw new Error('請輸入帳號與密碼');
    }

    const body = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (body.token) await AsyncStorage.setItem(TOKEN_KEY, body.token);
    await loadFromServer();
  }

  async function logout() {
    const currentState = getCurrentState();
    await AsyncStorage.removeItem(TOKEN_KEY);
    await persist({
      ...currentState,
      currentUserId: null,
    });
  }

  async function updateAvatar(avatarUri: string) {
    // call server to update avatar, then refresh
    await apiFetch('/api/me/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatarUri }),
    });
    await loadFromServer();
  }

  async function addFriendByUsername(username: string) {
    const targetName = username.trim();
    if (!targetName) throw new Error('請輸入要加入的好友帳號');
    await apiFetch('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ username: targetName }),
    });
    await loadFromServer();
  }

  async function acceptFriendRequest(fromUserId: string) {
    await apiFetch('/api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ fromUserId }),
    });
    await loadFromServer();
  }

  async function rejectFriendRequest(fromUserId: string) {
    await apiFetch('/api/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ fromUserId }),
    });
    await loadFromServer();
  }

  function getIncomingFriendRequests() {
    const currentUser = getRequiredCurrentUser();
    const currentState = getCurrentState();

    return currentState.users.filter((user) =>
      currentUser.incomingFriendRequestIds.includes(user.id)
    );
  }

  async function sendMessage(friendId: string, text: string) {
    const messageText = text.trim();
    if (!messageText) throw new Error('訊息不能是空白');

    // need a conversation id: find or create by accepting friend; we assume conversations exist after accept
    const convs: any[] = await apiFetch('/api/conversations');
    const conv = convs.find(c => c.participantIds.includes(friendId));
    if (!conv) throw new Error('找不到會話');

    await apiFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId: conv.id, text: messageText }),
    });
    await loadFromServer();
  }

  function getUserById(userId: string) {
    return state.users.find((user) => user.id === userId);
  }

  function getFriends() {
    if (!state.currentUserId) {
      return [];
    }

    const currentUser = state.users.find((user) => user.id === state.currentUserId);
    if (!currentUser) {
      return [];
    }

    return currentUser.friendIds
      .map((friendId) => state.users.find((user) => user.id === friendId))
      .filter((user): user is AppUser => Boolean(user));
  }

  function getConversationWithFriend(friendId: string) {
    if (!state.currentUserId) {
      return undefined;
    }

    return findConversation(state.conversations, state.currentUserId, friendId);
  }

  const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? null;

  return (
    <AppStoreContext.Provider
      value={{
        isHydrating,
        currentUser,
        users: state.users,
        conversations: state.conversations,
        register,
        login,
        logout,
        updateAvatar,
        addFriendByUsername,
        acceptFriendRequest,
        rejectFriendRequest,
        getIncomingFriendRequests,
        sendMessage,
        refresh,
        getUserById,
        getFriends,
        getConversationWithFriend,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }

  return context;
}