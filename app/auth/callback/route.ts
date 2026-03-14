import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next')
    const nextPath = next && next.startsWith('/') ? next : '/reset-password'

    if (!code) {
        return NextResponse.redirect(`${origin}${nextPath}${nextPath.includes('?') ? '&' : '?'}error=expired`)
    }

    // Build a response first so we can attach cookies to it
    const response = NextResponse.redirect(`${origin}${nextPath}`)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Write auth session cookies onto the redirect response
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return NextResponse.redirect(`${origin}${nextPath}${nextPath.includes('?') ? '&' : '?'}error=expired`)
    }

    // Session cookies are now on the response — redirect to the password form
    return response
}
