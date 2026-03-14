import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 10

// GET /api/notifications?page=1&limit=10
export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT))))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    // Paginated notifications
    const { data: notifications, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Unread count (separate lightweight query)
    const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

    const total   = count ?? 0
    const unread  = unreadCount ?? 0
    const hasMore = total > page * limit

    return NextResponse.json({
        notifications: notifications ?? [],
        total,
        unread,
        page,
        limit,
        hasMore,
    })
}
