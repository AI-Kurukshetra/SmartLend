import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'

export const metadata: Metadata = {
    title: 'SmartLend | Modern Lending Infrastructure',
    description: 'SmartLend is a loan origination and servicing platform built for applications, underwriting, borrower management, payments, and compliance.',
    openGraph: {
        title: 'SmartLend | Modern Lending Infrastructure',
        description: 'A modern lending platform for loan origination, underwriting, servicing, payments, and borrower self-service.',
        type: 'website',
    },
}

export default function HomePage() {
    return <LandingPage />
}
