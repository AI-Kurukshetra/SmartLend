'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, LogOut, Moon, Sun } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useTheme } from '@/components/ThemeProvider'
import { darkColors, lightColors } from '@/lib/theme'

type Notification = {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
}

function timeAgo(value: string | null) {
  if (!value) return 'Just now'
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardTopBar() {
  const { theme, toggleTheme } = useTheme()
  const c = theme === 'dark' ? darkColors : lightColors
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async (nextPage = 1, append = false) => {
    setNotifLoading(true)
    try {
      const res = await fetch(`/api/notifications?page=${nextPage}&limit=8`)
      const payload = await res.json()
      setNotifications((prev) => append ? [...prev, ...payload.notifications] : payload.notifications)
      setUnreadCount(payload.unread)
      setHasMore(payload.hasMore)
      setPage(nextPage)
    } catch {
      // ignore
    } finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/notifications?page=1&limit=1')
      .then((res) => res.json())
      .then((payload) => setUnreadCount(payload.unread ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    fetchNotifications(1, false)
  }, [notifOpen, fetchNotifications])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item))
    setUnreadCount((value) => Math.max(0, value - 1))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications/read-all', { method: 'POST' })
  }
    
  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      alignItems: 'center',
      padding: '0 0 12px',
      marginBottom: 0,
      background: c.pageBg,
    }}>
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setNotifOpen((value) => !value)}
          style={iconButton(c, theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'var(--color-surface)')}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && <span style={notifBadge(c)}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {notifOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 360,
            maxHeight: 460,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 18,
            border: `1px solid ${c.border}`,
            background: c.surface,
            boxShadow: theme === 'dark' ? '0 24px 64px rgba(0,0,0,0.55)' : '0 28px 64px rgba(15,23,42,0.16)',
          }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 900, color: c.textPrimary }}>Notifications</p>
                <p style={{ margin: '4px 0 0', color: c.textMuted, fontSize: '0.76rem' }}>{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ border: 'none', background: 'transparent', color: c.brand, fontWeight: 800, cursor: 'pointer' }}>
                  <CheckCheck size={14} style={{ verticalAlign: 'middle' }} /> Mark all
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto' }}>
              {notifLoading && notifications.length === 0 && <div style={emptyBox(c)}>Loading notifications…</div>}
              {!notifLoading && notifications.length === 0 && <div style={emptyBox(c)}>No notifications yet.</div>}
              {notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { if (!item.read) markRead(item.id) }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: `1px solid ${c.border}`,
                    background: item.read ? 'transparent' : (theme === 'dark' ? 'rgba(15,118,110,0.08)' : '#f0fdfa'),
                    padding: 14,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ margin: 0, color: c.textPrimary, fontWeight: item.read ? 700 : 900 }}>{item.title}</p>
                    <span style={{ color: c.textMuted, fontSize: '0.75rem' }}>{timeAgo(item.created_at)}</span>
                  </div>
                  <p style={{ margin: '6px 0 0', color: c.textSecondary, fontSize: '0.82rem', lineHeight: 1.55 }}>{item.message}</p>
                </button>
              ))}
              {hasMore && (
                <button onClick={() => fetchNotifications(page + 1, true)} style={{ width: '100%', border: 'none', background: 'transparent', padding: 12, color: c.brand, fontWeight: 800, cursor: 'pointer' }}>
                  Load more
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={toggleTheme} style={iconButton(c, theme === 'dark' ? 'rgba(251,191,36,0.1)' : 'var(--color-surface)')} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} />}
      </button>

      <form action={logout}>
        <button type="submit" style={iconButton(c, theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'var(--color-surface)')} aria-label="Logout">
          <LogOut size={16} />
        </button>
      </form>
    </div>
  )
}

function iconButton(c: typeof lightColors, background: string) {
  return {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: `1px solid ${c.border}`,
    background,
    color: c.textPrimary,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--color-shadow-soft)',
  } as const
}

function notifBadge(c: typeof lightColors) {
  return {
    position: 'absolute',
    top: 7,
    right: 7,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    background: c.brand,
    color: c.brandFg,
    fontSize: '0.65rem',
    fontWeight: 900,
    display: 'grid',
    placeItems: 'center',
  } as const
}

function emptyBox(c: typeof lightColors) {
  return {
    padding: 16,
    color: c.textMuted,
    fontSize: '0.84rem',
  } as const
}
