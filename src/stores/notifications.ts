import { create } from "zustand"

export interface Notification {
  id: string
  title: string
  message: string
  readAt?: string | null
  requiresAction: boolean
  createdAt: string
}

interface NotificationState {
  items: Notification[]
  unreadCount: number

  setNotifications: (n: Notification[]) => void
  addNotification: (n: Notification) => void
  markAsRead: (id: string) => void
}

export const useNotificationStore =
  create<NotificationState>((set) => ({
    items: [],
    unreadCount: 0,

    setNotifications: (items) =>
      set({
        items,
        unreadCount: items.filter((n) => !n.readAt).length,
      }),

    addNotification: (n) =>
      set((state) => {
        const items = [n, ...state.items]
        return {
          items,
          unreadCount: items.filter((i) => !i.readAt).length,
        }
      }),

    markAsRead: (id) =>
      set((state) => {
        const items = state.items.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
        return {
          items,
          unreadCount: items.filter((n) => !n.readAt).length,
        }
      }),
  }))
