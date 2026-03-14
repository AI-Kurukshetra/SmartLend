import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const isSupabaseConfigured =
    SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 10

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // If Supabase is not configured, allow all routes through (dev mode)
    if (!isSupabaseConfigured) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                supabaseResponse = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    const {
        data: { user },
    } = await supabase.auth.getUser()
    let hasLenderMembership = false
    let hasBorrowerProfile = false
    let borrowerOnboardingComplete = false
    let activeActor: 'lender' | 'borrower' | 'none' = 'none'
    if (user) {
        const [membershipRes, borrowerRes, profileRes] = await Promise.all([
            supabase
                .from('org_members')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle(),
            supabase
                .from('borrower_profiles')
                .select('id,onboarding_completed_at')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle(),
            supabase
                .from('profiles')
                .select('last_actor')
                .eq('id', user.id)
                .limit(1)
                .maybeSingle(),
        ])
        hasLenderMembership = Boolean(membershipRes.data?.id)
        hasBorrowerProfile = Boolean(borrowerRes.data?.id)
        borrowerOnboardingComplete = Boolean(borrowerRes.data?.onboarding_completed_at)

        const lastActor = profileRes.data?.last_actor as 'lender' | 'borrower' | undefined
        if (hasLenderMembership && hasBorrowerProfile) {
            activeActor = lastActor === 'borrower' ? 'borrower' : 'lender'
        } else if (hasLenderMembership) {
            activeActor = 'lender'
        } else if (hasBorrowerProfile) {
            activeActor = 'borrower'
        }
    }

    // Redirect authenticated users away from auth routes
    if (user && (pathname === '/login' || pathname === '/')) {
        const url = request.nextUrl.clone()
        url.pathname = '/post-login'
        return NextResponse.redirect(url)
    }

    // Redirect unauthenticated users away from protected routes
    if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding') || pathname.startsWith('/borrower') || pathname.startsWith('/post-login'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Lender area requires org membership
    if (user && pathname.startsWith('/dashboard') && !hasLenderMembership) {
        const url = request.nextUrl.clone()
        url.pathname = hasBorrowerProfile ? '/borrower' : '/onboarding'
        return NextResponse.redirect(url)
    }

    // Active borrower workspace cannot access org area until actor is switched.
    if (user && pathname.startsWith('/dashboard') && activeActor === 'borrower') {
        const url = request.nextUrl.clone()
        url.pathname = '/borrower'
        return NextResponse.redirect(url)
    }

    // Borrower area requires borrower profile
    if (user && pathname.startsWith('/borrower') && pathname !== '/borrower/onboarding' && !hasBorrowerProfile) {
        const url = request.nextUrl.clone()
        url.pathname = hasLenderMembership ? '/dashboard' : '/borrower/onboarding'
        return NextResponse.redirect(url)
    }

    // Active lender workspace cannot access borrower area until actor is switched.
    if (user && pathname.startsWith('/borrower') && pathname !== '/borrower/onboarding' && activeActor === 'lender') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Borrower onboarding completion gate
    if (user && pathname.startsWith('/borrower') && pathname !== '/borrower/onboarding' && hasBorrowerProfile && !borrowerOnboardingComplete) {
        const url = request.nextUrl.clone()
        url.pathname = '/borrower/onboarding'
        return NextResponse.redirect(url)
    }

    // If actor exists, keep user out of org onboarding
    if (user && pathname === '/onboarding' && (hasLenderMembership || hasBorrowerProfile)) {
        const url = request.nextUrl.clone()
        url.pathname = activeActor === 'borrower' ? '/borrower' : '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
