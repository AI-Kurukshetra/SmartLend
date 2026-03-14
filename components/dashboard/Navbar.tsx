'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Settings,
  Bell,
  Search,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useTheme } from '@/components/ThemeProvider'
import ProductIcon from '@/components/common/ProductIcon'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface NavbarProps {
  user: User | null
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/dashboard" className="nav-logo">
          <ProductIcon size={34} />
          <span className="nav-logo-text">SmartLend</span>
        </Link>

        {/* Nav Links Bento Group */}
        <nav className="nav-links-group" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="nav-active-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="nav-link-label">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Search */}
          <div className={`search-box ${searchFocused ? 'focused' : ''}`}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              placeholder="Search..."
              className="search-input"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label="Search"
            />
          </div>

          {/* Theme Toggle */}
          <button
            className={`icon-btn theme-btn${theme === 'dark' ? ' theme-dark' : ''}`}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <div className="notif-wrapper">
            <button
              className="icon-btn"
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="notif-dot" />
            </button>
            {notifOpen && (
              <div className="notif-dropdown">
                <p className="notif-title">Notifications</p>
                <div className="notif-item">
                  <span className="notif-dot-item lavender" />
                  <div>
                    <p className="notif-msg">Portfolio up 4.5% today</p>
                    <p className="notif-time">2 min ago</p>
                  </div>
                </div>
                <div className="notif-item">
                  <span className="notif-dot-item mint" />
                  <div>
                    <p className="notif-msg">New transaction recorded</p>
                    <p className="notif-time">1 hour ago</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User + Logout */}
          <div className="user-section">
            <div className="avatar-wrap">
              <Image src="/avatar.png" alt={displayName} width={34} height={34} className="avatar" />
            </div>
            <span className="user-name">{displayName}</span>
            <form action={logout}>
              <button type="submit" className="logout-btn" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ── Navbar Shell ─────────────────── */
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: color-mix(in srgb, var(--color-surface) 88%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--color-border);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 0 28px;
          height: 64px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ── Logo ─────────────────────────── */
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nav-logo-img {
          border-radius: 10px;
          object-fit: cover;
        }
        .nav-logo-text {
          font-weight: 800;
          font-size: 1.0625rem;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
        }

        /* ── Nav Links Bento ─────────────── */
        .nav-links-group {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--gray-100);
          border-radius: var(--radius-full);
          padding: 4px;
          margin-left: 8px;
        }
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 16px;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color var(--transition-fast);
          z-index: 1;
        }
        .nav-link:hover {
          color: var(--color-text-primary);
        }
        .nav-link.active {
          color: var(--brand-primary);
          font-weight: 600;
        }
        .nav-active-pill {
          position: absolute;
          inset: 0;
          background: var(--color-surface);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-md);
          z-index: -1;
        }

        /* ── Right Actions ────────────────── */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-left: auto;
        }

        /* Search */
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--gray-100);
          border: 1.5px solid transparent;
          border-radius: var(--radius-full);
          padding: 7px 16px;
          transition: all var(--transition-fast);
        }
        .search-box.focused {
          background: var(--color-surface);
          border-color: var(--pastel-lavender);
          box-shadow: 0 0 0 3px var(--pastel-lavender-light);
        }
        .search-icon {
          color: var(--gray-400);
          flex-shrink: 0;
        }
        .search-input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          width: 140px;
        }
        .search-input::placeholder {
          color: var(--gray-400);
        }

        /* Notifications */
        .notif-wrapper {
          position: relative;
        }
        .icon-btn {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-100);
          border: none;
          border-radius: var(--radius-md);
          color: var(--gray-600);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .icon-btn:hover {
          background: var(--pastel-lavender-light);
          color: var(--brand-primary);
        }
        .notif-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: var(--pastel-peach-dark);
          border-radius: 50%;
          border: 1.5px solid var(--color-surface);
        }
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 280px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .notif-title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--gray-100);
        }
        .notif-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }
        .notif-item:hover {
          background: var(--gray-50);
        }
        .notif-dot-item {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .notif-dot-item.lavender { background: var(--pastel-lavender); }
        .notif-dot-item.mint { background: var(--pastel-mint); }
        .notif-msg {
          font-size: 0.8125rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .notif-time {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        /* User Section */
        .user-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 4px 4px 4px;
          background: var(--gray-100);
          border-radius: var(--radius-full);
        }
        .avatar-wrap {
          flex-shrink: 0;
        }
        .avatar {
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }
        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
          padding-right: 4px;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface);
          border: none;
          border-radius: 50%;
          color: var(--gray-500);
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-right: 2px;
        }
        .logout-btn:hover {
          background: var(--pastel-peach-light);
          color: var(--pastel-peach-dark);
        }

        /* Theme Toggle */
        .theme-btn {
          position: relative;
          overflow: hidden;
        }
        .theme-btn svg {
          transition: transform 0.4s ease, opacity 0.25s ease;
        }
        .theme-btn:hover svg {
          transform: rotate(20deg) scale(1.15);
        }
        .theme-dark:hover {
          background: rgba(251,191,36,0.15) !important;
          color: #fbbf24 !important;
        }

        /* ── Responsive ──────────────────── */
        @media (max-width: 900px) {
          .nav-link-label { display: none; }
          .nav-link { padding: 8px 12px; }
          .search-input { width: 100px; }
          .user-name { display: none; }
        }
        @media (max-width: 640px) {
          .search-box { display: none; }
          .navbar-inner { padding: 0 16px; gap: 12px; }
        }
      `}</style>
    </header>
  )
}
