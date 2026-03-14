import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
    title: 'Sign In',
    description: 'Sign in to SmartLend to access your lending operations workspace.',
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>Loading...</div>}>
            <LoginForm />
        </Suspense>
    )
}
