import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'messenger-hw-store-v1';

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

  async function refresh() {
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

    const currentState = getCurrentState();
    const existedUser = currentState.users.find(
      (item) => normalizeUsername(item.username) === normalizeUsername(username)
    );

    if (existedUser) {
      throw new Error('這個帳號名稱已被使用');
    }

    const newUser: AppUser = {
      id: createId('user'),
      username,
      password,
      avatarUri: createAvatar(username),
      friendIds: [],
      incomingFriendRequestIds: [],
      outgoingFriendRequestIds: [],
      createdAt: new Date().toISOString(),
    };

    await persist({
      ...currentState,
      currentUserId: newUser.id,
      users: [...currentState.users, newUser],
    });
  }

  async function login(input: RegisterInput) {
    const username = input.username.trim();
    const password = input.password.trim();
    const currentState = getCurrentState();
    const user = currentState.users.find(
      (item) =>
        normalizeUsername(item.username) === normalizeUsername(username) && item.password === password
    );

    if (!user) {
      throw new Error('帳號或密碼錯誤');
    }

    await persist({
      ...currentState,
      currentUserId: user.id,
    });
  }

  async function logout() {
    const currentState = getCurrentState();
    await persist({
      ...currentState,
      currentUserId: null,
    });
  }

  async function updateAvatar(avatarUri: string) {
    const currentUser = getRequiredCurrentUser();
    const currentState = getCurrentState();

    await persist({
      ...currentState,
      users: currentState.users.map((user) =>
        user.id === currentUser.id ? { ...user, avatarUri } : user
      ),
    });
  }

  async function addFriendByUsername(username: string) {
    const currentUser = getRequiredCurrentUser();
    const targetName = username.trim();
    const currentState = getCurrentState();

    if (!targetName) {
      throw new Error('請輸入要加入的好友帳號');
    }

    const targetUser = currentState.users.find(
      (item) => normalizeUsername(item.username) === normalizeUsername(targetName)
    );

    if (!targetUser) {
      throw new Error('找不到這個帳號');
    }

    if (targetUser.id === currentUser.id) {
      throw new Error('不能把自己加入好友');
    }

    if (currentUser.friendIds.includes(targetUser.id)) {
      throw new Error('你們已經是好友了');
    }

    if (targetUser.incomingFriendRequestIds.includes(currentUser.id)) {
      throw new Error('你已經送出好友邀請，請等候對方同意');
    }

    if (currentUser.incomingFriendRequestIds.includes(targetUser.id)) {
      await acceptFriendRequest(targetUser.id);
      return;
    }

    const updatedUsers = currentState.users.map((user) => {
      if (user.id === currentUser.id) {
        return {
          ...user,
          outgoingFriendRequestIds: [...user.outgoingFriendRequestIds, targetUser.id],
        };
      }

      if (user.id === targetUser.id) {
        return {
          ...user,
          incomingFriendRequestIds: [...user.incomingFriendRequestIds, currentUser.id],
        };
      }

      return user;
    });

    await persist({
      ...currentState,
      users: updatedUsers,
    });
  }

  async function acceptFriendRequest(fromUserId: string) {
    const currentUser = getRequiredCurrentUser();
    const currentState = getCurrentState();
    const fromUser = currentState.users.find((user) => user.id === fromUserId);

    if (!fromUser) {
      throw new Error('找不到該邀請者');
    }

    if (!currentUser.incomingFriendRequestIds.includes(fromUserId)) {
      throw new Error('沒有這個好友邀請');
    }

    if (currentUser.friendIds.includes(fromUserId)) {
      throw new Error('你們已經是好友了');
    }

    const updatedUsers = currentState.users.map((user) => {
      if (user.id === currentUser.id) {
        return {
          ...user,
          friendIds: [...user.friendIds, fromUserId],
          incomingFriendRequestIds: user.incomingFriendRequestIds.filter((id) => id !== fromUserId),
        };
      }

      if (user.id === fromUserId) {
        return {
          ...user,
          friendIds: [...user.friendIds, currentUser.id],
          outgoingFriendRequestIds: user.outgoingFriendRequestIds.filter((id) => id !== currentUser.id),
        };
      }

      return user;
    });

    const existingConversation = findConversation(
      currentState.conversations,
      currentUser.id,
      fromUserId
    );

    const nextConversations = existingConversation
      ? currentState.conversations
      : [
          ...currentState.conversations,
          {
            id: createId('conversation'),
            participantIds: [currentUser.id, fromUserId] as [string, string],
            messages: [],
          },
        ];

    await persist({
      ...currentState,
      users: updatedUsers,
      conversations: nextConversations,
    });
  }

  async function rejectFriendRequest(fromUserId: string) {
    const currentUser = getRequiredCurrentUser();
    const currentState = getCurrentState();
    const fromUser = currentState.users.find((user) => user.id === fromUserId);

    if (!fromUser) {
      throw new Error('找不到該邀請者');
    }

    if (!currentUser.incomingFriendRequestIds.includes(fromUserId)) {
      throw new Error('沒有這個好友邀請');
    }

    const updatedUsers = currentState.users.map((user) => {
      if (user.id === currentUser.id) {
        return {
          ...user,
          incomingFriendRequestIds: user.incomingFriendRequestIds.filter((id) => id !== fromUserId),
        };
      }

      if (user.id === fromUserId) {
        return {
          ...user,
          outgoingFriendRequestIds: user.outgoingFriendRequestIds.filter((id) => id !== currentUser.id),
        };
      }

      return user;
    });

    await persist({
      ...currentState,
      users: updatedUsers,
    });
  }

  function getIncomingFriendRequests() {
    const currentUser = getRequiredCurrentUser();
    const currentState = getCurrentState();

    return currentState.users.filter((user) =>
      currentUser.incomingFriendRequestIds.includes(user.id)
    );
  }

  async function sendMessage(friendId: string, text: string) {
    const currentUser = getRequiredCurrentUser();
    const messageText = text.trim();
    const currentState = getCurrentState();

    if (!messageText) {
      throw new Error('訊息不能是空白');
    }

    if (!currentUser.friendIds.includes(friendId)) {
      throw new Error('對方還不是你的好友');
    }

    const conversation =
      findConversation(currentState.conversations, currentUser.id, friendId) ?? {
        id: createId('conversation'),
        participantIds: [currentUser.id, friendId] as [string, string],
        messages: [],
      };

    const nextMessage: AppMessage = {
      id: createId('message'),
      senderId: currentUser.id,
      text: messageText,
      createdAt: new Date().toISOString(),
    };

    const conversationsWithoutCurrent = currentState.conversations.filter(
      (item) => item.id !== conversation.id
    );

    await persist({
      ...currentState,
      conversations: [
        ...conversationsWithoutCurrent,
        { ...conversation, messages: [...conversation.messages, nextMessage] },
      ],
    });
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