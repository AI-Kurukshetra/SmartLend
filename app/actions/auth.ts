'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/siteUrl'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const credentials = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/post-login')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const firstName = (formData.get('first_name') as string)?.trim() ?? ''
    const lastName = (formData.get('last_name') as string)?.trim() ?? ''
    const fullName = [firstName, lastName].filter(Boolean).join(' ')
    const inviteToken = (formData.get('invite') as string | null)?.trim() ?? ''

    const credentials = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                ...(inviteToken ? { invite_token: inviteToken } : {}),
            },
        },
    }

    const { data, error } = await supabase.auth.signUp(credentials)

    if (error) {
        // Supabase may explicitly say the user already exists
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
            return { alreadyRegistered: true }
        }
        return { error: error.message }
    }

    // When email confirmation is ON, Supabase silently "succeeds" for
    // existing emails but returns a user with an empty identities array.
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        return { alreadyRegistered: true }
    }

    // New user created — the client will show the "Confirm your email" screen.
    return { success: true }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Please enter your email address.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/callback`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirm  = formData.get('confirm_password') as string

    if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters.' }
    }
    if (password !== confirm) {
        return { error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/post-login')
}
