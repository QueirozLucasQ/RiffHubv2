'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getOrCreateProfile()
      if (!profile) { setLoading(false); return }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data || [])

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false)

      setLoading(false)
    }
    init()
  }, [])

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'agora'
    if (m < 60) return `${m}m atrás`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h atrás`
    return `${Math.floor(h / 24)}d atrás`
  }

  const typeIcon: Record<string, string> = {
    new_message: '💬',
    collab_request: '🎵',
    collab_accepted: '✅',
    collab_rejected: '❌',
    riff_like: '♥',
    new_follower: '👤',
    default: '🔔',
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Notificações</h1>

        {loading ? (
          <div className="text-center py-12 text-muted">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔔</p>
            <p className="text-lg font-semibold mb-2">Nenhuma notificação</p>
            <p className="text-muted text-sm">Você verá suas notificações aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const icon = typeIcon[n.type] || typeIcon.default
              const content = (
                <div
                  className="flex items-start gap-4 p-4 rounded-xl transition"
                  style={{
                    border: '1px solid var(--border)',
                    background: !n.read ? 'rgba(30,136,229,0.06)' : 'transparent',
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'var(--card)' }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{n.title}</p>
                    {n.body && <p className="text-muted text-sm mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--blue)' }} />
                  )}
                </div>
              )

              return n.link ? (
                <Link key={n.id} href={n.link} className="block hover:opacity-90 transition">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
