'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
    title: string
    value: string
    trend: string
    trendUp: boolean
    icon: React.ReactNode
    color: 'lavender' | 'mint' | 'peach' | 'sky' | 'lemon'
    delay?: number
}

export default function StatCard({
    title,
    value,
    trend,
    trendUp,
    icon,
    color,
    delay = 0,
}: StatCardProps) {
    return (
        <motion.div
            className={`stat-card stat-card-${color}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
            <div className="card-top">
                <div className={`card-icon icon-${color}`}>{icon}</div>
                <span className={`card-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend}
                </span>
            </div>
            <div className="card-value">{value}</div>
            <div className="card-title">{title}</div>

            <style jsx>{`
        .stat-card {
          background: var(--white);
          border-radius: var(--radius-xl);
          padding: 22px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: default;
          transition: box-shadow var(--transition-base);
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          opacity: 0.08;
          transform: translate(20px, -20px);
        }
        .stat-card-lavender::before { background: var(--pastel-lavender); }
        .stat-card-mint::before { background: var(--pastel-mint); }
        .stat-card-peach::before { background: var(--pastel-peach); }
        .stat-card-sky::before { background: var(--pastel-sky); }
        .stat-card-lemon::before { background: var(--pastel-lemon); }

        .stat-card:hover {
          box-shadow: var(--shadow-xl);
        }
        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .icon-lavender { background: var(--pastel-lavender-light); color: var(--brand-primary); }
        .icon-mint { background: var(--pastel-mint-light); color: var(--pastel-mint-dark); }
        .icon-peach { background: var(--pastel-peach-light); color: var(--pastel-peach-dark); }
        .icon-sky { background: var(--pastel-sky-light); color: #0284c7; }
        .icon-lemon { background: var(--pastel-lemon-light); color: #d97706; }

        .card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }
        .trend-up {
          background: var(--pastel-mint-light);
          color: var(--pastel-mint-dark);
        }
        .trend-down {
          background: var(--pastel-peach-light);
          color: var(--pastel-peach-dark);
        }
        .card-value {
          font-size: 1.875rem;
          font-weight: 800;
          color: var(--color-text-primary);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .card-title {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }
      `}</style>
        </motion.div>
    )
}
