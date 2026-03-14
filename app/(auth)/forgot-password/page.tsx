import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
    title: 'Forgot Password | SmartLend',
    description: 'Reset your SmartLend account password.',
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />
}
