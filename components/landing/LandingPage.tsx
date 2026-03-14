'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  Landmark,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Wallet,
  X,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import ProductIcon from '@/components/common/ProductIcon'

const darkTheme = {
  pageBg: '#08111f',
  altBg: '#0d1728',
  surface: 'rgba(15, 23, 42, 0.82)',
  navBg: 'rgba(8, 17, 31, 0.8)',
  border: 'rgba(148, 163, 184, 0.18)',
  text: '#f8fafc',
  textSub: 'rgba(226, 232, 240, 0.78)',
  muted: 'rgba(148, 163, 184, 0.78)',
  primary: '#0f766e',
  primaryHover: '#115e59',
  secondary: '#1d4ed8',
  badgeBg: 'rgba(20, 184, 166, 0.14)',
  badgeBorder: 'rgba(45, 212, 191, 0.28)',
  heroBg:
    'radial-gradient(circle at top, rgba(29, 78, 216, 0.24), transparent 34%), radial-gradient(circle at 85% 20%, rgba(20, 184, 166, 0.18), transparent 28%), linear-gradient(180deg, #08111f 0%, #0a1220 100%)',
  cardShadow: '0 24px 80px rgba(2, 6, 23, 0.35)',
  chipBg: 'rgba(30, 41, 59, 0.7)',
}

const lightTheme = {
  pageBg: '#f7fafc',
  altBg: '#edf4f7',
  surface: 'rgba(255, 255, 255, 0.88)',
  navBg: 'rgba(247, 250, 252, 0.82)',
  border: 'rgba(15, 23, 42, 0.1)',
  text: '#0f172a',
  textSub: '#334155',
  muted: '#64748b',
  primary: '#0f766e',
  primaryHover: '#115e59',
  secondary: '#1d4ed8',
  badgeBg: 'rgba(20, 184, 166, 0.08)',
  badgeBorder: 'rgba(15, 118, 110, 0.18)',
  heroBg:
    'radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 34%), radial-gradient(circle at 85% 20%, rgba(20, 184, 166, 0.12), transparent 28%), linear-gradient(180deg, #f8fbfd 0%, #eef5f7 100%)',
  cardShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
  chipBg: 'rgba(255, 255, 255, 0.9)',
}

const platformPillars = [
  {
    icon: FileCheck,
    title: 'Origination workflow',
    description: 'Launch borrower applications, collect documents, and move each file from intake to funding with configurable stages.',
  },
  {
    icon: ShieldCheck,
    title: 'Automated compliance',
    description: 'Keep lending operations aligned with underwriting rules, audit trails, and policy checks across every decision.',
  },
  {
    icon: BarChart3,
    title: 'Portfolio analytics',
    description: 'Track approval rates, delinquency exposure, repayment behavior, and servicing performance from one dashboard.',
  },
  {
    icon: Wallet,
    title: 'Servicing and payments',
    description: 'Manage payment schedules, borrower balances, ACH collection flows, and account changes without context switching.',
  },
]

const valueCards = [
  {
    title: 'Built for lenders, not generic CRMs',
    text: 'SmartLend is positioned as a loan origination and servicing operating system for community banks, credit unions, and fintech lending teams.',
  },
  {
    title: 'Fast decisions with risk visibility',
    text: 'Bring underwriting, credit inputs, risk scoring, and funding readiness into one decision pipeline so teams move faster with better control.',
  },
  {
    title: 'Self-service for borrowers',
    text: 'Give borrowers a clean portal for applications, document upload, statements, balances, payment actions, and account support.',
  },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Capture applications',
    text: 'Borrowers submit personal-loan applications, upload documents, and complete verification in a branded intake flow.',
  },
  {
    step: '02',
    title: 'Underwrite automatically',
    text: 'Apply credit, income, and policy rules to route approvals, reviews, and declines with a transparent audit trail.',
  },
  {
    step: '03',
    title: 'Fund, service, and monitor',
    text: 'Activate repayment schedules, monitor delinquencies, manage collections, and report on portfolio health from the same system.',
  },
]

const operatingStats = [
  { value: 'End-to-end', label: 'lending lifecycle coverage' },
  { value: 'API-first', label: 'integration model for banking and credit data' },
  { value: 'Personal loans', label: 'recommended MVP starting point' },
  { value: 'Compliance-ready', label: 'audit and policy workflow foundation' },
]

const sections = [
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#platform', label: 'Platform' },
  { href: '#contact', label: 'Contact' },
]

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay }}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  const palette = theme === 'dark' ? darkTheme : lightTheme
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      style={{
        background: palette.pageBg,
        color: palette.text,
        minHeight: '100vh',
        overflowX: 'hidden',
        fontFamily: "'Manrope', 'Segoe UI', sans-serif",
      }}
    >
      <header
        style={{
          position: 'fixed',
          inset: '0 0 auto 0',
          zIndex: 50,
          background: scrolled ? palette.navBg : 'transparent',
          backdropFilter: scrolled ? 'blur(18px)' : 'none',
          borderBottom: scrolled ? `1px solid ${palette.border}` : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: palette.text }}
          >
            <ProductIcon size={34} />
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.03em' }}>SmartLend</span>
          </Link>

          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {sections.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{ color: palette.muted, textDecoration: 'none', fontWeight: 700, fontSize: '0.92rem' }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                border: `1px solid ${palette.border}`,
                background: palette.chipBg,
                color: palette.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              href="/login"
              className="desktop-nav"
              style={{ color: palette.text, textDecoration: 'none', fontWeight: 700, fontSize: '0.92rem' }}
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="desktop-nav"
              style={{
                padding: '11px 18px',
                borderRadius: 999,
                background: palette.primary,
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
              }}
            >
              Request demo
            </Link>
            <button
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen((open) => !open)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: `1px solid ${palette.border}`,
                background: palette.chipBg,
                color: palette.text,
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                overflow: 'hidden',
                background: palette.pageBg,
                borderBottom: `1px solid ${palette.border}`,
              }}
            >
              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sections.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: palette.text, textDecoration: 'none', fontWeight: 700 }}
                  >
                    {item.label}
                  </a>
                ))}
                <Link href="/login" style={{ color: palette.text, textDecoration: 'none', fontWeight: 700 }}>
                  Sign in
                </Link>
                <Link
                  href="/login?mode=signup"
                  style={{
                    padding: '13px 16px',
                    borderRadius: 14,
                    background: palette.primary,
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 800,
                    textAlign: 'center',
                  }}
                >
                  Request demo
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <section
        style={{
          background: palette.heroBg,
          padding: '132px 24px 88px',
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.08fr 0.92fr',
            gap: 28,
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 999,
                background: palette.badgeBg,
                border: `1px solid ${palette.badgeBorder}`,
                color: palette.primary,
                fontWeight: 800,
                fontSize: '0.82rem',
                marginBottom: 22,
              }}
            >
              <Sparkles size={14} />
              SmartLend for modern loan origination and servicing
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              style={{
                fontSize: 'clamp(2.8rem, 7vw, 5.4rem)',
                lineHeight: 0.98,
                letterSpacing: '-0.05em',
                fontWeight: 900,
                marginBottom: 24,
              }}
            >
              Lending infrastructure
              <br />
              for faster decisions.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              style={{
                maxWidth: 640,
                fontSize: '1.05rem',
                lineHeight: 1.8,
                color: palette.textSub,
                marginBottom: 30,
              }}
            >
              SmartLend helps lending teams manage applications, underwriting, compliance, servicing, payments, and borrower
              self-service in one platform. The product is designed around the full loan lifecycle, starting with a focused MVP for
              personal loans.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 34 }}
            >
              <Link
                href="/login?mode=signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '15px 24px',
                  borderRadius: 16,
                  background: palette.primary,
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 800,
                }}
              >
                Get SmartLend access
                <ArrowRight size={17} />
              </Link>
              <a
                href="#platform"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '15px 24px',
                  borderRadius: 16,
                  background: palette.chipBg,
                  color: palette.text,
                  textDecoration: 'none',
                  border: `1px solid ${palette.border}`,
                  fontWeight: 800,
                }}
              >
                Explore the platform
                <ChevronRight size={17} />
              </a>
            </motion.div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['Loan applications', 'Automated underwriting', 'Borrower portal', 'Servicing dashboard'].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 999,
                    background: palette.chipBg,
                    border: `1px solid ${palette.border}`,
                    color: palette.muted,
                    fontWeight: 700,
                    fontSize: '0.88rem',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 28,
              padding: 24,
              boxShadow: palette.cardShadow,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div style={{ background: palette.pageBg, borderRadius: 20, padding: 18, border: `1px solid ${palette.border}` }}>
                <p style={{ color: palette.muted, fontSize: '0.8rem', marginBottom: 8 }}>Decision engine</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>2m 14s</h3>
                <p style={{ color: palette.textSub, lineHeight: 1.6, fontSize: '0.9rem' }}>Average application review window for pre-qualified files.</p>
              </div>
              <div style={{ background: palette.pageBg, borderRadius: 20, padding: 18, border: `1px solid ${palette.border}` }}>
                <p style={{ color: palette.muted, fontSize: '0.8rem', marginBottom: 8 }}>Portfolio alerts</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Live</h3>
                <p style={{ color: palette.textSub, lineHeight: 1.6, fontSize: '0.9rem' }}>Track delinquencies, exceptions, and payment risk from one queue.</p>
              </div>
            </div>

            <div style={{ background: palette.pageBg, borderRadius: 24, padding: 22, border: `1px solid ${palette.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                  <p style={{ color: palette.muted, fontSize: '0.8rem', marginBottom: 8 }}>SmartLend operating layer</p>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>From borrower intake to repayment</h3>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 999,
                    background: palette.badgeBg,
                    color: palette.primary,
                    fontWeight: 800,
                    fontSize: '0.84rem',
                  }}
                >
                  <Landmark size={16} />
                  Built for lenders
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  'Loan application portal with document intake',
                  'Rules-based underwriting and risk review',
                  'Compliance checks, audit logs, and account controls',
                  'Servicing workflows, ACH payments, and borrower support',
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    <CheckCircle2 size={18} color={palette.secondary} />
                    <span style={{ color: palette.textSub, fontWeight: 700 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '24px 24px 72px' }}>
        <div
          className="stats-grid"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}
        >
          {operatingStats.map((stat, index) => (
            <FadeIn key={stat.label} delay={index * 0.08}>
              <div
                style={{
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  borderRadius: 22,
                  padding: 22,
                  boxShadow: palette.cardShadow,
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 6 }}>{stat.value}</div>
                <div style={{ color: palette.textSub, lineHeight: 1.6 }}>{stat.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section id="features" style={{ padding: '72px 24px', background: palette.altBg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ maxWidth: 720, marginBottom: 42 }}>
              <p style={{ color: palette.primary, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 12 }}>
                Core capabilities
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
                The SmartLend platform covers the highest-priority lending workflows.
              </h2>
              <p style={{ color: palette.textSub, lineHeight: 1.8, fontSize: '1rem' }}>
                Your product brief emphasizes must-have lending functions such as origination, underwriting, credit integrations,
                payment processing, servicing, compliance, risk management, reporting, and borrower self-service. The landing page
                now reflects that actual product direction.
              </p>
            </div>
          </FadeIn>

          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
            {platformPillars.map((item, index) => {
              const Icon = item.icon
              return (
                <FadeIn key={item.title} delay={index * 0.08}>
                  <div
                    style={{
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                      borderRadius: 24,
                      padding: 24,
                      minHeight: 220,
                      boxShadow: palette.cardShadow,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: palette.badgeBg,
                        color: palette.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 18,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>{item.title}</h3>
                    <p style={{ color: palette.textSub, lineHeight: 1.75 }}>{item.description}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section id="workflow" style={{ padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 42 }}>
              <p style={{ color: palette.secondary, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 12 }}>
                Workflow
              </p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.1rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
                A lending journey built around speed, control, and visibility.
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gap: 18 }}>
            {workflowSteps.map((item, index) => (
              <FadeIn key={item.step} delay={index * 0.08}>
                <div
                  className="workflow-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr',
                    gap: 18,
                    background: palette.surface,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 22,
                    padding: 24,
                    boxShadow: palette.cardShadow,
                  }}
                >
                  <div style={{ color: palette.primary, fontWeight: 900, fontSize: '2rem', letterSpacing: '-0.05em' }}>{item.step}</div>
                  <div>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: 10 }}>{item.title}</h3>
                    <p style={{ color: palette.textSub, lineHeight: 1.75 }}>{item.text}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" style={{ padding: '72px 24px', background: palette.altBg }}>
        <div className="platform-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <FadeIn>
            <div
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 26,
                padding: 28,
                height: '100%',
                boxShadow: palette.cardShadow,
              }}
            >
              <p style={{ color: palette.primary, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' }}>
                Product direction
              </p>
              <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
                SmartLend is positioned as a modern loan management and origination platform.
              </h2>
              <p style={{ color: palette.textSub, lineHeight: 1.8, marginBottom: 22 }}>
                The current message now aligns with your product research: community banks, credit unions, and fintech lenders that
                need a digital lending stack without stitching together disconnected tools.
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {valueCards.map((card) => (
                  <div
                    key={card.title}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 18,
                      border: `1px solid ${palette.border}`,
                      background: palette.pageBg,
                    }}
                  >
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 8 }}>{card.title}</h3>
                    <p style={{ color: palette.textSub, lineHeight: 1.7, fontSize: '0.95rem' }}>{card.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 26,
                padding: 28,
                height: '100%',
                boxShadow: palette.cardShadow,
              }}
            >
              <p style={{ color: palette.secondary, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' }}>
                MVP focus
              </p>
              <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
                The first release should emphasize personal-loan operations.
              </h2>
              <p style={{ color: palette.textSub, lineHeight: 1.8, marginBottom: 20 }}>
                That means borrower onboarding, underwriting logic, risk checks, document storage, payment scheduling, and borrower
                account servicing. This is enough to communicate a credible fintech product instead of a generic dashboard.
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  'Borrower application portal and document management',
                  'Credit and risk decision support',
                  'Payment processing and account servicing',
                  'Compliance controls and audit visibility',
                  'Reporting on origination and portfolio performance',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <CheckCircle2 size={18} color={palette.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: palette.textSub, lineHeight: 1.65 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="contact" style={{ padding: '72px 24px 96px' }}>
        <FadeIn>
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 30,
              padding: '34px 28px',
              boxShadow: palette.cardShadow,
              textAlign: 'center',
            }}
          >
            <p style={{ color: palette.primary, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' }}>
              Ready for SmartLend
            </p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
              Replace fragmented lending operations with one SmartLend workflow.
            </h2>
            <p style={{ color: palette.textSub, lineHeight: 1.8, maxWidth: 720, margin: '0 auto 26px' }}>
              The project now presents SmartLend as a serious lending product with origination, underwriting, servicing, compliance,
              analytics, and borrower self-service at the center of the story.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link
                href="/login?mode=signup"
                style={{
                  padding: '15px 24px',
                  borderRadius: 16,
                  background: palette.primary,
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 800,
                }}
              >
                Start with SmartLend
              </Link>
              <Link
                href="/login"
                style={{
                  padding: '15px 24px',
                  borderRadius: 16,
                  background: palette.pageBg,
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                  textDecoration: 'none',
                  fontWeight: 800,
                }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      <footer style={{ padding: '0 24px 36px' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            color: palette.muted,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProductIcon size={28} />
            <span style={{ fontWeight: 800, color: palette.text }}>SmartLend</span>
          </div>
          <p style={{ margin: 0 }}>SmartLend loan origination and servicing platform.</p>
        </div>
      </footer>

      <style jsx>{`
        @media (max-width: 980px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: inline-flex !important;
          }
          .hero-grid,
          .platform-grid,
          .feature-grid {
            grid-template-columns: 1fr !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 720px) {
          .stats-grid,
          .feature-grid {
            grid-template-columns: 1fr !important;
          }
          .workflow-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
