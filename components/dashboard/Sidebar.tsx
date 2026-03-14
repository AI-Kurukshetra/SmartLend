'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, BarChart3, Wallet,
    ArrowUpDown, User, Settings, BookOpen, HelpCircle, ChevronUp, Users, FileSpreadsheet, Gavel, Briefcase, HandCoins, ClipboardList,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useTheme } from '@/components/ThemeProvider'
import { lightColors, darkColors } from '@/lib/theme'
import ProfilePopup from '@/components/dashboard/ProfilePopup'
import ProductIcon from '@/components/common/ProductIcon'

const navSections = [
    {
        label: 'General',
        items: [
            { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
            { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, permission: 'reports.view' },
            { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
            { href: '/dashboard/loan-products', label: 'Loan Products', icon: Briefcase, permission: 'pricing.manage' },
            { href: '/dashboard/applications', label: 'Applications', icon: ClipboardList },
            { href: '/dashboard/underwriting', label: 'Underwriting', icon: Gavel },
            { href: '/dashboard/risk', label: 'Risk', icon: BarChart3, permission: 'reports.view' },
            { href: '/dashboard/funding', label: 'Funding', icon: HandCoins },
            { href: '/dashboard/servicing', label: 'Servicing', icon: FileSpreadsheet },
            { href: '/dashboard/collections', label: 'Collections', icon: ArrowUpDown, permission: 'collections.manage' },
            { href: '/dashboard/communications', label: 'Communications', icon: HelpCircle, permission: 'communications.manage' },
            { href: '/dashboard/documents', label: 'Documents', icon: FileSpreadsheet },
            { href: '/dashboard/borrowers', label: 'Borrowers', icon: Users },
            { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowUpDown },
        ],
    },
    {
        label: 'Account',
        items: [
            { href: '/dashboard/profile', label: 'Profile', icon: User },
            { href: '/dashboard/settings', label: 'Settings', icon: Settings },
            { href: '/dashboard/settings/team', label: 'Team', icon: Users, permission: 'team.manage' },
        ],
    },
    {
        label: 'Resources',
        items: [
            { href: '/dashboard/reports', label: 'Reports', icon: BookOpen, permission: 'reports.view' },
            { href: '/dashboard/compliance', label: 'Compliance', icon: Gavel, permission: 'compliance.manage' },
            { href: '/dashboard/support', label: 'Support Inbox', icon: HelpCircle },
            { href: '/dashboard/help', label: 'Help Center', icon: HelpCircle },
        ],
    },
]

interface SidebarProps {
    user: SupabaseUser | null
}

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()
    const { theme } = useTheme()
    const c = theme === 'dark' ? darkColors : lightColors
    const [profileOpen, setProfileOpen] = useState(false)
    const [permissions, setPermissions] = useState<string[] | null>(null)

    useEffect(() => {
        async function loadPermissions() {
            const supabase = await (await import('@/lib/supabase/client')).createClient()
            const { data: auth } = await supabase.auth.getUser()
            if (!auth.user) return
            const { data } = await supabase
                .from('org_members')
                .select('role,permissions')
                .eq('user_id', auth.user.id)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle()
            const fallback = data?.role === 'admin'
                ? ['team.manage', 'pricing.manage', 'workflow.manage', 'communications.manage', 'collections.manage', 'compliance.manage', 'reports.view', 'audit.view']
                : ['communications.manage', 'collections.manage', 'reports.view']
            setPermissions(Array.isArray(data?.permissions) && data.permissions.length > 0 ? data.permissions : fallback)
        }
        loadPermissions()
    }, [])

    return (
        <>
            <aside style={{
                width: 220,
                flexShrink: 0,
                background: c.surface,
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${c.border}`,
                height: '100vh',
                position: 'relative',
                overflowY: 'hidden',
                zIndex: 10,
            }}>
                {/* Logo */}
                <div style={{ 
                    padding: '24px 20px 20px', 
                    borderBottom: `1px solid ${c.border}`, 
                    marginBottom: 16 
                }}>
                    <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ProductIcon size={30} />
                        <span style={{
                            fontWeight: 800, fontSize: '0.9375rem', color: c.textPrimary,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                            SmartLend
                        </span>
                    </Link>
                </div>

                {/* Nav sections */}
                <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
                    {navSections.map((section) => (
                        <div key={section.label} style={{ marginBottom: 24 }}>
                            <p style={{
                                fontSize: '0.6875rem', fontWeight: 600, color: c.textMuted,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                padding: '0 8px', marginBottom: 4,
                            }}>
                                {section.label}
                            </p>
                            {section.items.filter((item: any) => !item.permission || permissions === null || permissions.includes(item.permission)).map((item: any) => {
                                const isActive = pathname === item.href
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 10px', borderRadius: 8,
                                            textDecoration: 'none', fontSize: '0.875rem',
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ? c.textPrimary : c.textSecondary,
                                            background: isActive ? c.surfaceHover : 'transparent',
                                            margin: '1px 0',
                                            transition: 'background 0.15s, color 0.15s',
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isActive) (e.currentTarget as HTMLElement).style.background = c.surfaceMuted
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                                        }}
                                    >
                                        <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                {/* ── User profile button at bottom ── */}
                <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${c.border}`, marginTop: 'auto' }}>
                    <button
                        id="profile-toggle-btn"
                        onClick={() => setProfileOpen((o) => !o)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '8px 10px', borderRadius: 10,
                            background: profileOpen ? c.surfaceHover : c.surfaceMuted,
                            border: `1px solid ${profileOpen ? c.borderStrong : c.border}`,
                            cursor: 'pointer', width: '100%', textAlign: 'left',
                            transition: 'background 0.15s, border-color 0.15s',
                        }}
                    >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${c.border}` }}>
                            <Image src="/image.png" alt="User" width={30} height={30} style={{ objectFit: 'cover', display: 'block' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{
                                fontSize: '0.8rem', fontWeight: 600, color: c.textPrimary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 110,
                            }}>
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: c.textMuted, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                                {user?.email || ''}
                            </span>
                        </div>
                        <ChevronUp
                            size={14}
                            color={c.textMuted}
                            style={{
                                flexShrink: 0,
                                transition: 'transform 0.25s',
                                transform: profileOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                            }}
                        />
                    </button>
                </div>
            </aside>

            {/* Profile popup — rendered outside aside so it can overflow */}
            <AnimatePresence>
                {profileOpen && <ProfilePopup onClose={() => setProfileOpen(false)} />}
            </AnimatePresence>
        </>
    )
}
