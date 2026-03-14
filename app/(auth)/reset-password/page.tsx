import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
    title: 'Reset Password | SmartLend',
    description: 'Set a new password for your SmartLend account.',
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    )
}
