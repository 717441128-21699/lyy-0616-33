import { create } from 'zustand';
import type { Notification } from '@/types';
import * as api from '@/api';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (userId?: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (userId) => {
    try {
      const params: Record<string, string> = {};
      if (userId) params.user_id = userId;
      const notifications = await api.fetchNotifications(params);
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount });
    } catch {
      set({ notifications: [], unreadCount: 0 });
    }
  },

  markRead: async (id) => {
    try {
      const updated = await api.markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
        unreadCount: state.notifications.filter((n) => (n.id === id ? false : !n.is_read)).length,
      }));
    } catch {
      const current = get().notifications;
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unreadCount: current.filter((n) => (n.id === id ? false : !n.is_read)).length,
      }));
    }
  },
}));
