import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/profile — fetch current user's profile
export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) {
        // If no row yet, return defaults from auth metadata
        if (error.code === 'PGRST116') {
            return NextResponse.json({
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name ?? '',
                last_name:  user.user_metadata?.last_name ?? '',
                avatar_url: null,
                bio:   null,
                phone: null,
            })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(profile)
}

// PATCH /api/profile — update current user's profile
export async function PATCH(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { first_name, last_name, bio, phone, avatar_url } = body

    // Upsert profile row
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            first_name,
            last_name,
            bio,
            phone,
            avatar_url,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Keep auth metadata in sync
    await supabase.auth.updateUser({
        data: {
            first_name,
            last_name,
            full_name: [first_name, last_name].filter(Boolean).join(' '),
        },
    })

    return NextResponse.json(data)
}
