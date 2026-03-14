'use client'

import { motion } from 'framer-motion'
import type { User } from '@supabase/supabase-js'

interface WelcomeBannerProps {
    user: User | null
}

const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
}

export default function WelcomeBanner({ user }: WelcomeBannerProps) {
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
    const greeting = getGreeting()

    return (
        <motion.div
            className="welcome-banner"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
        >
            <div className="banner-left">
                <div className="banner-greeting">
                    <motion.span
                        className="wave-emoji"
                        animate={{ rotate: [0, 20, -10, 20, 0] }}
                        transition={{ duration: 1.2, delay: 0.6, ease: 'easeInOut' }}
                        aria-label="waving hand"
                    >
                        👋
                    </motion.span>
                    <h1 className="banner-title">
                        {greeting}, <span className="banner-name">{displayName}</span>!
                    </h1>
                </div>
                <p className="banner-subtitle">
                    Here&apos;s what&apos;s happening with your finances today.
                </p>
            </div>
            <div className="banner-right">
                <div className="date-chip">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })}
                </div>
            </div>

            <style jsx>{`
        .welcome-banner {
          background: linear-gradient(135deg, color-mix(in srgb, var(--pastel-lavender-light) 70%, var(--color-surface)) 0%, color-mix(in srgb, var(--pastel-mint-light) 70%, var(--color-surface)) 100%);
          border-radius: var(--radius-xl);
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--pastel-lavender);
          gap: 16px;
          flex-wrap: wrap;
        }
        .banner-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .banner-greeting {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .wave-emoji {
          font-size: 2rem;
          display: inline-block;
        }
        .banner-title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          color: var(--color-text-primary);
          letter-spacing: -0.03em;
        }
        .banner-name {
          background: linear-gradient(135deg, var(--brand-primary), var(--pastel-mint-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .banner-subtitle {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          padding-left: 52px;
        }
        .date-chip {
          background: var(--color-surface);
          border: 1px solid var(--pastel-lavender);
          border-radius: var(--radius-full);
          padding: 8px 18px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--brand-primary);
          white-space: nowrap;
          box-shadow: var(--shadow-sm);
        }
      `}</style>
        </motion.div>
    )
}
