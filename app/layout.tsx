import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: {
    template: '%s | SmartLend',
    default: 'SmartLend | Loan Origination and Servicing Platform',
  },
  description:
    'SmartLend is a modern loan origination and servicing platform for lenders that need borrower onboarding, underwriting, compliance, payments, and portfolio analytics.',
  keywords: ['smartlend', 'loan origination', 'loan servicing', 'fintech', 'lending platform'],
  authors: [{ name: 'SmartLend Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'SmartLend | Loan Origination and Servicing Platform',
    description: 'SmartLend helps lending teams manage applications, underwriting, servicing, compliance, and borrower operations.',
    type: 'website',
    siteName: 'SmartLend',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
