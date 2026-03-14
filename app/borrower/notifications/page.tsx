import { createClient } from '@/lib/supabase/server'

export default async function BorrowerNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const notificationsRes = user
    ? await supabase
        .from('notifications')
        .select('id,title,message,type,read,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const notifications = notificationsRes.data || []

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>Notifications</h1>
      <p style={{ marginTop: 8, color: '#64748b' }}>In-app event updates for your SmartLend borrower journey.</p>
      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {notifications.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 14, background: '#fff', color: '#64748b' }}>
            No notifications yet.
          </div>
        )}
        {notifications.map((n: any) => (
          <div key={n.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff' }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{n.title}</p>
            <p style={{ margin: '6px 0', color: '#475569' }}>{n.message}</p>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
              {n.type} | {new Date(n.created_at).toLocaleString()} | {n.read ? 'Read' : 'Unread'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
