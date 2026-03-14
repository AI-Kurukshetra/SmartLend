'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpenCheck,
  CheckCheck,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Gavel,
  HandCoins,
  LineChart,
  LogOut,
  Moon,
  ShieldAlert,
  Sun,
  Users,
  Wallet,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
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

type OverviewProps = {
  user: User | null
  data: {
    orgName: string
    approvalRate: string
    metrics: {
      activeBorrowers: number
      activeAccounts: number
      pendingApplications: number
      outstandingPrincipal: number
      monthlyCollections: number
      delinquentAccounts: number
      highRiskApplications: number
      complianceFailures: number
      fundingReadyCount: number
      dueSoonCount: number
    }
    pipeline: Array<{ label: string; count: number; tone: 'neutral' | 'good' | 'warning' | 'danger' }>
    recentApplications: Array<{
      id: string
      borrowerName: string
      amount: number
      status: string
      currentStage: string
      recommendation: string | null
      createdAt: string
    }>
    activeAccounts: Array<{
      id: string
      borrowerName: string
      balance: number
      status: string
      nextDue: string | null
      scheduledPayment: number | null
      autopayEnabled: boolean
    }>
    recentEvents: Array<{
      id: string
      title: string
      detail: string
      createdAt: string
    }>
  }
}

export default function DashboardHome({ user, data }: OverviewProps) {
  const { theme, toggleTheme } = useTheme()
  const c = theme === 'dark' ? darkColors : lightColors
  const isDark = theme === 'dark'
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operator'

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
      // ignore notification fetch failures in dashboard shell
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

  const spotlight = useMemo(() => {
    const risk = data.metrics.highRiskApplications
    const collections = data.metrics.delinquentAccounts
    const compliance = data.metrics.complianceFailures
    if (compliance > 0) {
      return {
        title: 'Compliance review needs attention',
        detail: `${compliance} failed compliance checks need remediation before files move cleanly through the pipeline.`,
        icon: ShieldAlert,
        accent: '#b91c1c',
        bg: isDark ? 'rgba(185,28,28,0.18)' : '#fef2f2',
      }
    }
    if (risk > 0) {
      return {
        title: 'High-risk applications are waiting',
        detail: `${risk} applications are currently rated high risk and should be reviewed by underwriting.`,
        icon: Gavel,
        accent: '#b45309',
        bg: isDark ? 'rgba(180,83,9,0.18)' : '#fffbeb',
      }
    }
    if (collections > 0) {
      return {
        title: 'Delinquency workflow is active',
        detail: `${collections} loan accounts are delinquent and collections actions are running.`,
        icon: AlertTriangle,
        accent: '#b45309',
        bg: isDark ? 'rgba(180,83,9,0.18)' : '#fff7ed',
      }
    }
    return {
      title: 'Portfolio is operating normally',
      detail: 'Applications, servicing, and compliance are all moving without urgent exceptions.',
      icon: CheckCircle2,
      accent: '#15803d',
      bg: isDark ? 'rgba(21,128,61,0.2)' : '#f0fdf4',
    }
  }, [data.metrics.complianceFailures, data.metrics.delinquentAccounts, data.metrics.highRiskApplications, isDark])

  const overviewTheme = isDark
    ? {
        background: 'linear-gradient(135deg, #050816 0%, #0b1220 34%, #0f4c4a 100%)',
        foreground: '#ffffff',
        secondary: 'rgba(255,255,255,0.82)',
        muted: 'rgba(255,255,255,0.75)',
        overlay: 'rgba(255,255,255,0.08)',
        panelBg: 'rgba(255,255,255,0.08)',
        panelBorder: '1px solid rgba(255,255,255,0.14)',
        rowBg: 'rgba(255,255,255,0.06)',
        chipBg: 'rgba(255,255,255,0.10)',
        chipBorder: '1px solid rgba(255,255,255,0.12)',
      }
    : {
        background: 'linear-gradient(135deg, #f8fafc 0%, #ecfdf5 38%, #ccfbf1 100%)',
        foreground: '#0f172a',
        secondary: '#334155',
        muted: '#475569',
        overlay: 'rgba(16,185,129,0.12)',
        panelBg: 'rgba(255,255,255,0.86)',
        panelBorder: '1px solid rgba(15,23,42,0.10)',
        rowBg: 'rgba(240,253,250,0.95)',
        chipBg: 'rgba(255,255,255,0.96)',
        chipBorder: '1px solid rgba(15,23,42,0.10)',
      }

  const spotlightTitleColor = isDark
    ? '#ffffff'
    : spotlight.title === 'Portfolio is operating normally'
      ? '#065f46'
      : overviewTheme.foreground

  const spotlightDetailColor = isDark
    ? '#ffffff'
    : spotlight.title === 'Portfolio is operating normally'
      ? '#047857'
      : overviewTheme.secondary

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: c.textMuted, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {data.orgName}
          </p>
          <h1 style={{ margin: '8px 0 0', color: c.textPrimary, fontSize: '2.2rem', lineHeight: 1.05, fontWeight: 950, letterSpacing: '-0.04em' }}>
            Lending operations overview
          </h1>
          <p style={{ margin: '10px 0 0', color: c.textSecondary, maxWidth: 760, lineHeight: 1.7 }}>
            {displayName}, this workspace tracks origination throughput, funding readiness, servicing health, compliance exceptions, and borrower portfolio activity in one place.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen((value) => !value)}
              style={iconButton(c, theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff')}
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
                zIndex: 60,
              }}>
                <div style={{ padding: 14, borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 900, color: c.textPrimary }}>Notifications</p>
                    <p style={{ margin: '4px 0 0', color: c.textMuted, fontSize: '0.76rem' }}>{unreadCount} unread</p>
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ border: 'none', background: 'transparent', color: '#0f766e', fontWeight: 800, cursor: 'pointer' }}>
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
                    <button onClick={() => fetchNotifications(page + 1, true)} style={{ width: '100%', border: 'none', background: 'transparent', padding: 12, color: '#0f766e', fontWeight: 800, cursor: 'pointer' }}>
                      Load more
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={toggleTheme} style={iconButton(c, theme === 'dark' ? 'rgba(251,191,36,0.1)' : '#fff')} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} />}
          </button>

          <form action={logout}>
            <button type="submit" style={iconButton(c, isDark ? 'rgba(255,255,255,0.04)' : '#fff')} aria-label="Logout">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          borderRadius: 28,
          padding: 24,
          background: overviewTheme.background,
          color: overviewTheme.foreground,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -6% -45% auto', width: 320, height: 320, borderRadius: '50%', background: overviewTheme.overlay, filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78 }}>
              Portfolio Command Center
            </p>
            <h2 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.02, fontWeight: 950, letterSpacing: '-0.04em', color: spotlightTitleColor }}>
              {spotlight.title}
            </h2>
            <p style={{ margin: '12px 0 0', maxWidth: 560, lineHeight: 1.7, color: spotlightDetailColor }}>
              {spotlight.detail}
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={HandCoins} label={`${data.metrics.fundingReadyCount} ready for funding`} theme={theme} />
              <HeroChip icon={Clock3} label={`${data.metrics.dueSoonCount} payments due soon`} theme={theme} />
              <HeroChip icon={BookOpenCheck} label={`${data.approvalRate}% approval rate`} theme={theme} />
            </div>
          </div>

          <div style={{
            alignSelf: 'stretch',
            borderRadius: 22,
            background: overviewTheme.panelBg,
            border: overviewTheme.panelBorder,
            padding: 18,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: spotlight.bg, display: 'grid', placeItems: 'center' }}>
                <spotlight.icon size={20} color={spotlight.accent} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900 }}>Live exception snapshot</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: overviewTheme.muted }}>Issues that need operational attention now</p>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {data.pipeline.map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: overviewTheme.rowBg }}>
                  <span style={{ fontWeight: 700 }}>{item.label}</span>
                  <span style={{
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    background: pipelineTone(item.tone, isDark).bg,
                    color: pipelineTone(item.tone, isDark).fg,
                  }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard theme={theme} icon={Users} label="Active borrowers" value={String(data.metrics.activeBorrowers)} tone="slate" />
        <MetricCard theme={theme} icon={Wallet} label="Outstanding principal" value={`$${formatCompact(data.metrics.outstandingPrincipal)}`} tone="teal" />
        <MetricCard theme={theme} icon={LineChart} label="Monthly collections" value={`$${formatCompact(data.metrics.monthlyCollections)}`} tone="green" />
        <MetricCard theme={theme} icon={AlertTriangle} label="Delinquent accounts" value={String(data.metrics.delinquentAccounts)} tone="amber" />
        <MetricCard theme={theme} icon={ShieldAlert} label="Compliance failures" value={String(data.metrics.complianceFailures)} tone="red" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16 }}>
        <Panel theme={theme} title="Origination Pipeline" subtitle="Recent applications with underwriting and workflow state">
          <div style={{ display: 'grid', gap: 10 }}>
            {data.recentApplications.length === 0 && <div style={emptyBox(c)}>No applications yet.</div>}
            {data.recentApplications.map((item) => (
              <div key={item.id} style={listRow(c)}>
                <div>
                  <p style={{ margin: 0, color: c.textPrimary, fontWeight: 900 }}>{item.borrowerName}</p>
                  <p style={{ margin: '6px 0 0', color: c.textSecondary, fontSize: '0.84rem' }}>
                    ${Number(item.amount).toLocaleString()} | {item.currentStage.replaceAll('_', ' ')} | {timeAgo(item.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                  <span style={statusPill(item.status)}>{item.status}</span>
                  <span style={{ color: c.textMuted, fontSize: '0.76rem', fontWeight: 800 }}>{item.recommendation || 'awaiting engine'}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel theme={theme} title="Active Servicing" subtitle="Accounts requiring collections or payment attention">
          <div style={{ display: 'grid', gap: 10 }}>
            {data.activeAccounts.length === 0 && <div style={emptyBox(c)}>No loan accounts yet.</div>}
            {data.activeAccounts.map((item) => (
              <div key={item.id} style={listRow(c)}>
                <div>
                  <p style={{ margin: 0, color: c.textPrimary, fontWeight: 900 }}>{item.borrowerName}</p>
                  <p style={{ margin: '6px 0 0', color: c.textSecondary, fontSize: '0.84rem' }}>
                    ${Number(item.balance).toLocaleString()} balance | next due {item.nextDue || 'n/a'}
                  </p>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                  <span style={statusPill(item.status)}>{item.status}</span>
                  <span style={{ color: item.autopayEnabled ? '#15803d' : '#b45309', fontSize: '0.76rem', fontWeight: 800 }}>
                    {item.autopayEnabled ? 'autopay on' : 'manual pay'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 16 }}>
        <Panel theme={theme} title="Operational Priorities" subtitle="Where lender teams should spend time next">
          <div style={{ display: 'grid', gap: 10 }}>
            <PriorityRow theme={theme} icon={HandCoins} title="Funding queue" detail={`${data.metrics.fundingReadyCount} approved applications are ready to convert into active loan accounts.`} />
            <PriorityRow theme={theme} icon={Gavel} title="Risk and underwriting" detail={`${data.metrics.highRiskApplications} applications are flagged high-risk and need manual review or policy adjustment.`} />
            <PriorityRow theme={theme} icon={FileSpreadsheet} title="Servicing follow-up" detail={`${data.metrics.dueSoonCount} upcoming dues and ${data.metrics.delinquentAccounts} delinquent accounts are in the payment follow-up window.`} />
            <PriorityRow theme={theme} icon={BookOpenCheck} title="Compliance readiness" detail={`${data.metrics.complianceFailures} active failures are blocking clean audit posture and should be remediated.`} />
          </div>
        </Panel>

        <Panel theme={theme} title="Recent Audit Activity" subtitle="Live actions across origination, servicing, collections, and support">
          <div style={{ display: 'grid', gap: 10 }}>
            {data.recentEvents.length === 0 && <div style={emptyBox(c)}>No audit activity recorded yet.</div>}
            {data.recentEvents.map((item) => (
              <div key={item.id} style={{ ...listRow(c), alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: isDark ? '#111827' : '#f8fafc', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <ArrowRight size={16} color={c.textSecondary} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: c.textPrimary, fontWeight: 900 }}>{item.title}</p>
                  <p style={{ margin: '6px 0 0', color: c.textSecondary, fontSize: '0.84rem', lineHeight: 1.6 }}>{item.detail}</p>
                </div>
                <span style={{ color: c.textMuted, fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{timeAgo(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <style jsx>{`
        @media (max-width: 1180px) {
          section[style*='grid-template-columns: 1.3fr 0.9fr'],
          section[style*='grid-template-columns: repeat(5'],
          section[style*='grid-template-columns: 1.15fr 0.85fr'],
          section[style*='grid-template-columns: 0.9fr 1.1fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(5'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 520px) {
          section[style*='grid-template-columns: repeat(5'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Panel({
  theme,
  title,
  subtitle,
  children,
}: {
  theme: 'light' | 'dark'
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const c = theme === 'dark' ? darkColors : lightColors
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 24, background: c.surface, padding: 18, boxShadow: theme === 'dark' ? '0 18px 40px rgba(0,0,0,0.24)' : '0 10px 30px rgba(15,23,42,0.06)' }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, color: c.textPrimary, fontSize: '1.05rem', fontWeight: 950 }}>{title}</h3>
        <p style={{ margin: '6px 0 0', color: c.textSecondary, fontSize: '0.85rem', lineHeight: 1.6 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function MetricCard({
  theme,
  icon: Icon,
  label,
  value,
  tone,
}: {
  theme: 'light' | 'dark'
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  tone: 'slate' | 'teal' | 'green' | 'amber' | 'red'
}) {
  const c = theme === 'dark' ? darkColors : lightColors
  const isDark = theme === 'dark'
  const palette = {
    slate: { bg: isDark ? 'rgba(148,163,184,0.12)' : '#f8fafc', fg: isDark ? '#f8fafc' : '#0f172a' },
    teal: { bg: isDark ? 'rgba(20,184,166,0.14)' : '#ecfeff', fg: isDark ? '#99f6e4' : '#155e75' },
    green: { bg: isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4', fg: isDark ? '#bbf7d0' : '#166534' },
    amber: { bg: isDark ? 'rgba(245,158,11,0.16)' : '#fffbeb', fg: isDark ? '#fde68a' : '#92400e' },
    red: { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2', fg: isDark ? '#fecaca' : '#991b1b' },
  }[tone]

  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 22, background: c.surface, padding: 16, boxShadow: isDark ? '0 18px 36px rgba(0,0,0,0.2)' : '0 10px 24px rgba(15,23,42,0.05)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, background: palette.bg, display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '16px 0 0', color: c.textSecondary, fontWeight: 700, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: c.textPrimary, fontWeight: 950, fontSize: '1.6rem', letterSpacing: '-0.03em' }}>{value}</p>
    </div>
  )
}

function PriorityRow({ theme, icon: Icon, title, detail }: { theme: 'light' | 'dark'; icon: React.ComponentType<{ size?: number; color?: string }>; title: string; detail: string }) {
  const c = theme === 'dark' ? darkColors : lightColors
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, alignItems: 'start', padding: '10px 0' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: theme === 'dark' ? 'rgba(20,184,166,0.12)' : '#f0fdfa', display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={theme === 'dark' ? '#5eead4' : '#0f766e'} />
      </div>
      <div>
        <p style={{ margin: 0, color: c.textPrimary, fontWeight: 900 }}>{title}</p>
        <p style={{ margin: '6px 0 0', color: c.textSecondary, fontSize: '0.84rem', lineHeight: 1.6 }}>{detail}</p>
      </div>
    </div>
  )
}

function HeroChip({ icon: Icon, label, theme }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 999,
      background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.82)',
      border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.08)',
      fontWeight: 800,
      fontSize: '0.82rem',
      color: isDark ? '#ffffff' : '#0f172a',
    }}>
      <Icon size={14} color={isDark ? '#ffffff' : '#0f172a'} />
      {label}
    </span>
  )
}

function iconButton(c: typeof lightColors, background: string) {
  return {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: `1px solid ${c.borderStrong}`,
    background,
    color: c.textSecondary,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    position: 'relative' as const,
  }
}

function notifBadge(c: typeof lightColors) {
  return {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    background: '#ef4444',
    color: '#fff',
    border: `2px solid ${c.pageBg}`,
    fontSize: '0.64rem',
    fontWeight: 900,
    display: 'grid',
    placeItems: 'center',
  }
}

function listRow(c: typeof lightColors) {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    background: c.surfaceMuted,
    padding: 14,
  }
}

function emptyBox(c: typeof lightColors) {
  return {
    border: `1px dashed ${c.border}`,
    borderRadius: 16,
    padding: 16,
    color: c.textMuted,
    background: c.surfaceMuted,
  }
}

function statusPill(status: string) {
  const key = status.toLowerCase()
  const palette: Record<string, { bg: string; fg: string }> = {
    approved: { bg: '#dcfce7', fg: '#166534' },
    funded: { bg: '#dcfce7', fg: '#166534' },
    active: { bg: '#dcfce7', fg: '#166534' },
    submitted: { bg: '#dbeafe', fg: '#1d4ed8' },
    under_review: { bg: '#fef3c7', fg: '#92400e' },
    draft: { bg: '#e2e8f0', fg: '#334155' },
    delinquent: { bg: '#fee2e2', fg: '#991b1b' },
    declined: { bg: '#fee2e2', fg: '#991b1b' },
    forbearance: { bg: '#ffedd5', fg: '#9a3412' },
  }
  const colors = palette[key] || { bg: '#e2e8f0', fg: '#334155' }
  return {
    borderRadius: 999,
    padding: '6px 10px',
    background: colors.bg,
    color: colors.fg,
    fontWeight: 900,
    fontSize: '0.78rem',
    whiteSpace: 'nowrap' as const,
  }
}

function pipelineTone(tone: 'neutral' | 'good' | 'warning' | 'danger', isDark: boolean) {
  if (tone === 'good') return { bg: isDark ? 'rgba(34,197,94,0.18)' : '#dcfce7', fg: isDark ? '#dcfce7' : '#166534' }
  if (tone === 'warning') return { bg: isDark ? 'rgba(245,158,11,0.22)' : '#fef3c7', fg: isDark ? '#fef3c7' : '#92400e' }
  if (tone === 'danger') return { bg: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', fg: isDark ? '#fee2e2' : '#991b1b' }
  return { bg: isDark ? 'rgba(148,163,184,0.2)' : '#e2e8f0', fg: isDark ? '#e2e8f0' : '#334155' }
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
  }).format(value)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
