'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'

interface Notification {
  id: string
  title: string
  body: string
  link?: string
  read: boolean
  type: string
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getOrCreateProfile()
      if (!profile) return
      setProfileId(profile.id)
      loadNotifications(profile.id)

      // Real-time subscription
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnread(prev => prev + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const loadNotifications = async (pid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', pid)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setUnread(data?.filter(n => !n.read).length || 0)
  }

  const handleOpen = async () => {
    setOpen(!open)
    if (!open && profileId && unread > 0) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', profileId).eq('read', false)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
    }
  }

  const typeIcon: Record<string, string> = {
    collab_request: '🎵',
    collab_accepted: '✅',
    collab_rejected: '❌',
    new_message: '💬',
    default: '🔔',
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'agora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  if (!profileId) return null

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className="relative p-2 rounded-lg transition hover:bg-card flex items-center justify-center"
        style={{ color: open ? 'var(--white)' : 'var(--subtle)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-xs flex items-center justify-center text-white font-bold"
            style={{ background: 'var(--red)', fontSize: '10px' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 rounded-xl shadow-2xl z-50 w-80 animate-fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border-light)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <p className="font-bold text-sm">Notificações</p>
            {notifications.length > 0 && (
              <span className="text-xs text-muted">{notifications.length}</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-muted">Nenhuma notificação ainda</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id}
                  className={`px-4 py-3 border-b transition hover:bg-dark cursor-pointer ${!n.read ? '' : ''}`}
                  style={{ borderColor: 'var(--border)', borderLeft: !n.read ? '3px solid var(--red)' : '3px solid transparent' }}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => setOpen(false)} className="block">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] || typeIcon.default}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight">{n.title}</p>
                          {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] || typeIcon.default}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">{n.title}</p>
                        {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-blue hover:underline">
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
