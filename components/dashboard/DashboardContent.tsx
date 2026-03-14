'use client'

import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import type { User } from '@supabase/supabase-js'

const stats = [
  {
    title: 'Total Balance',
    value: '$48,295',
    trend: '+4.5%',
    trendUp: true,
    icon: <DollarSign size={20} />,
    color: 'lavender' as const,
  },
  {
    title: 'Monthly Revenue',
    value: '$12,840',
    trend: '+12%',
    trendUp: true,
    icon: <TrendingUp size={20} />,
    color: 'mint' as const,
  },
  {
    title: 'Active Assets',
    value: '24',
    trend: '-2%',
    trendUp: false,
    icon: <Activity size={20} />,
    color: 'sky' as const,
  },
  {
    title: 'Transactions',
    value: '1,284',
    trend: '+8%',
    trendUp: true,
    icon: <CreditCard size={20} />,
    color: 'peach' as const,
  },
]

const quickActions = [
  { label: 'Send Money', icon: <ArrowUpRight size={20} />, color: 'lavender', desc: 'Transfer funds instantly' },
  { label: 'Quick Pay', icon: <Zap size={20} />, color: 'lemon', desc: 'Scan & pay in seconds' },
  { label: 'Secure Vault', icon: <ShieldCheck size={20} />, color: 'mint', desc: 'Manage your assets' },
  { label: 'Reports', icon: <BookOpen size={20} />, color: 'sky', desc: 'View analytics & exports' },
]

const recentTransactions = [
  { name: 'Netflix Subscription', amount: '-$15.99', date: 'Today', type: 'debit', icon: '🎬' },
  { name: 'Salary Deposit', amount: '+$5,200.00', date: 'Yesterday', type: 'credit', icon: '💼' },
  { name: 'Grocery Store', amount: '-$84.30', date: 'Mar 10', type: 'debit', icon: '🛒' },
  { name: 'Freelance Payment', amount: '+$1,200.00', date: 'Mar 9', type: 'credit', icon: '💻' },
  { name: 'Electric Bill', amount: '-$67.45', date: 'Mar 8', type: 'debit', icon: '⚡' },
]

interface DashboardContentProps {
  user: User | null
}

export default function DashboardContent({ user: _user }: DashboardContentProps) {
  return (
    <div className="dash-content">
      {/* Stat Cards Grid */}
      <section aria-label="Financial overview">
        <div className="stats-grid">
          {stats.map((stat, i) => (
            <StatCard key={stat.title} {...stat} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* Main Bento Grid */}
      <div className="bento-grid">
        {/* Quick Actions */}
        <motion.section
          className="bento-card quick-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          aria-label="Quick actions"
        >
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action) => (
              <button key={action.label} className={`action-btn action-${action.color}`}>
                <span className={`action-icon icon-${action.color}`}>{action.icon}</span>
                <span className="action-label">{action.label}</span>
                <span className="action-desc">{action.desc}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Hellow Word Section — main feature card */}
        <motion.section
          className="bento-card hello-card"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          aria-label="Hello World"
        >
          <div className="hello-orb hello-orb-1" />
          <div className="hello-orb hello-orb-2" />
          <div className="hello-inner">
            <span className="hello-badge">🌟 SmartLend v1.0</span>
            <h2 className="hello-title">SmartLend is live.</h2>
            <p className="hello-desc">
              Your lending operations terminal is ready. Start reviewing applications,
              track servicing activity, and monitor borrower performance from one place.
            </p>
            <div className="hello-pills">
              <span className="pill pill-lavender">⚡ Real-time data</span>
              <span className="pill pill-mint">🔒 Bank-grade security</span>
              <span className="pill pill-peach">🤖 AI insights</span>
            </div>
          </div>
        </motion.section>

        {/* Recent Transactions */}
        <motion.section
          className="bento-card transactions-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          aria-label="Recent transactions"
        >
          <div className="section-header">
            <h2 className="section-title">Recent Transactions</h2>
            <button className="see-all-btn">See all →</button>
          </div>
          <div className="tx-list">
            {recentTransactions.map((tx, i) => (
              <div key={i} className="tx-item">
                <div className="tx-icon-wrap">{tx.icon}</div>
                <div className="tx-info">
                  <p className="tx-name">{tx.name}</p>
                  <p className="tx-date">{tx.date}</p>
                </div>
                <span className={`tx-amount ${tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Portfolio Mini Card */}
        <motion.section
          className="bento-card portfolio-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          aria-label="Portfolio overview"
        >
          <h2 className="section-title">Portfolio</h2>
          <div className="portfolio-visual">
            <div className="portfolio-ring">
              <div className="ring-inner">
                <p className="ring-value">72%</p>
                <p className="ring-label">in growth</p>
              </div>
            </div>
            <div className="portfolio-legend">
              {[
                { label: 'Stocks', pct: '42%', color: 'lavender' },
                { label: 'Crypto', pct: '28%', color: 'mint' },
                { label: 'Bonds', pct: '18%', color: 'sky' },
                { label: 'Cash', pct: '12%', color: 'lemon' },
              ].map((item) => (
                <div key={item.label} className="legend-item">
                  <span className={`legend-dot dot-${item.color}`} />
                  <span className="legend-label">{item.label}</span>
                  <span className="legend-pct">{item.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      <style jsx>{`
        .dash-content {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* ── Stats Grid ───────────────── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        /* ── Bento Grid ───────────────── */
        .bento-grid {
          display: grid;
          grid-template-columns: 1fr 1.6fr 1fr;
          grid-template-rows: auto auto;
          gap: 18px;
        }

        /* ── Shared Card ──────────────── */
        .bento-card {
          background: var(--white);
          border-radius: var(--radius-xl);
          padding: 24px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-md);
          transition: box-shadow var(--transition-base);
        }
        .bento-card:hover {
          box-shadow: var(--shadow-lg);
        }
        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 18px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .see-all-btn {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--brand-primary);
          background: none;
          border: none;
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .see-all-btn:hover { color: var(--pastel-lavender-dark); }

        /* ── Quick Actions ────────────── */
        .quick-actions {
          grid-column: 1;
          grid-row: 1 / 3;
        }
        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 14px 16px;
          border-radius: var(--radius-lg);
          background: var(--gray-50);
          border: 1px solid var(--color-border);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-base);
        }
        .action-btn:hover {
          transform: translateX(4px);
          box-shadow: var(--shadow-md);
        }
        .action-lavender:hover { background: var(--pastel-lavender-light); border-color: var(--pastel-lavender); }
        .action-lemon:hover { background: var(--pastel-lemon-light); border-color: var(--pastel-lemon); }
        .action-mint:hover { background: var(--pastel-mint-light); border-color: var(--pastel-mint); }
        .action-sky:hover { background: var(--pastel-sky-light); border-color: var(--pastel-sky); }
        .action-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2px;
        }
        .icon-lavender { background: var(--pastel-lavender-light); color: var(--brand-primary); }
        .icon-lemon { background: var(--pastel-lemon-light); color: #d97706; }
        .icon-mint { background: var(--pastel-mint-light); color: var(--pastel-mint-dark); }
        .icon-sky { background: var(--pastel-sky-light); color: #0284c7; }
        .action-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .action-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        /* ── Hello Card ───────────────── */
        .hello-card {
          grid-column: 2;
          grid-row: 1;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%);
          border: none;
          position: relative;
          overflow: hidden;
        }
        .hello-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.3;
        }
        .hello-orb-1 {
          width: 200px;
          height: 200px;
          background: var(--pastel-lavender);
          top: -60px;
          right: -40px;
        }
        .hello-orb-2 {
          width: 160px;
          height: 160px;
          background: var(--pastel-mint);
          bottom: -40px;
          left: 20px;
        }
        .hello-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .hello-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-full);
          padding: 5px 14px;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          width: fit-content;
        }
        .hello-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          color: white;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .hello-desc {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.65;
          max-width: 380px;
        }
        .hello-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pill {
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid transparent;
        }
        .pill-lavender {
          background: rgba(196, 181, 253, 0.2);
          color: var(--pastel-lavender);
          border-color: rgba(196, 181, 253, 0.3);
        }
        .pill-mint {
          background: rgba(110, 231, 183, 0.2);
          color: var(--pastel-mint);
          border-color: rgba(110, 231, 183, 0.3);
        }
        .pill-peach {
          background: rgba(252, 165, 165, 0.2);
          color: var(--pastel-peach);
          border-color: rgba(252, 165, 165, 0.3);
        }

        /* ── Transactions ─────────────── */
        .transactions-card {
          grid-column: 2;
          grid-row: 2;
        }
        .tx-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tx-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }
        .tx-item:hover { background: var(--gray-50); }
        .tx-icon-wrap {
          width: 40px;
          height: 40px;
          background: var(--gray-100);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          flex-shrink: 0;
        }
        .tx-info { flex: 1; min-width: 0; }
        .tx-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tx-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }
        .tx-amount {
          font-size: 0.875rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .amount-credit { color: var(--pastel-mint-dark); }
        .amount-debit { color: var(--pastel-peach-dark); }

        /* ── Portfolio ────────────────── */
        .portfolio-card {
          grid-column: 3;
          grid-row: 1 / 3;
        }
        .portfolio-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .portfolio-ring {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: conic-gradient(
            var(--pastel-lavender) 0deg 151deg,
            var(--pastel-mint) 151deg 252deg,
            var(--pastel-sky) 252deg 317deg,
            var(--pastel-lemon) 317deg 360deg
          );
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.2);
        }
        .ring-inner {
          width: 90px;
          height: 90px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ring-value {
          font-size: 1.375rem;
          font-weight: 800;
          color: var(--color-text-primary);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .ring-label {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }
        .portfolio-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .dot-lavender { background: var(--pastel-lavender); }
        .dot-mint { background: var(--pastel-mint); }
        .dot-sky { background: var(--pastel-sky); }
        .dot-lemon { background: var(--pastel-lemon); }
        .legend-label {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .legend-pct {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        /* ── Responsive ───────────────── */
        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .bento-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
          }
          .quick-actions { grid-column: 1; grid-row: auto; }
          .hello-card { grid-column: 2; grid-row: auto; }
          .transactions-card { grid-column: 1; grid-row: auto; }
          .portfolio-card { grid-column: 2; grid-row: auto; }
        }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .bento-grid { grid-template-columns: 1fr; }
          .quick-actions, .hello-card, .transactions-card, .portfolio-card {
            grid-column: 1;
            grid-row: auto;
          }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
