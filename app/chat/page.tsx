'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getOrCreateProfile()
      if (!profile) return
      setMyProfileId(profile.id)

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      if (!messages || messages.length === 0) { setLoading(false); return }

      const partnerIds = new Set<string>()
      for (const msg of messages) {
        const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id
        partnerIds.add(partnerId)
      }

      const { data: partnerProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(partnerIds))

      const profileMap: Record<string, any> = {}
      for (const p of (partnerProfiles || [])) profileMap[p.id] = p

      const seen = new Set<string>()
      const convos: any[] = []
      for (const msg of messages) {
        const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id
        if (!seen.has(partnerId)) {
          seen.add(partnerId)
          const partner = profileMap[partnerId]
          if (!partner) continue
          const unread = messages.filter(m =>
            m.sender_id === partnerId && m.receiver_id === profile.id && !m.read
          ).length
          convos.push({ partner, lastMessage: msg, unread })
        }
      }
      setConversations(convos)
      setLoading(false)
    }
    init()
  }, [])

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'agora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d`
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const filtered = conversations.filter(c =>
    c.partner.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="px-4 pt-8 pb-4 sticky top-16 z-10" style={{ background: '#0A0A0F' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mensagens</h1>
              {totalUnread > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {totalUnread} não {totalUnread === 1 ? 'lida' : 'lidas'}
                </p>
              )}
            </div>
            <Link href="/search"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition hover:bg-card"
              style={{ color: 'var(--subtle)', border: '1px solid var(--border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Nova conversa
            </Link>
          </div>

          {/* Search */}
          {conversations.length > 3 && (
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--white)' }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-8">
          {loading ? (
            <div className="space-y-3 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse" style={{ background: 'var(--card)' }}>
                  <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: 'var(--border)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-1/3" style={{ background: 'var(--border)' }} />
                    <div className="h-3 rounded w-2/3" style={{ background: 'var(--border)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: 'var(--card)' }}>
                💬
              </div>
              <p className="font-semibold text-lg mb-1">
                {search ? 'Nenhuma conversa encontrada' : 'Nenhuma mensagem ainda'}
              </p>
              <p className="text-muted text-sm mb-6">
                {search ? 'Tente outro nome' : 'Conecte-se com músicos e comece a trocar ideias'}
              </p>
              {!search && (
                <Link href="/search" className="btn btn-primary btn-sm">
                  Encontrar Músicos
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-1 mt-2">
              {filtered.map(({ partner, lastMessage, unread }) => (
                <Link key={partner.id} href={`/chat/${partner.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all group"
                  style={{
                    background: unread > 0 ? 'rgba(229,57,53,0.06)' : 'transparent',
                    border: `1px solid ${unread > 0 ? 'rgba(229,57,53,0.15)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = unread > 0 ? 'rgba(229,57,53,0.1)' : 'var(--card)')}
                  onMouseLeave={e => (e.currentTarget.style.background = unread > 0 ? 'rgba(229,57,53,0.06)' : 'transparent')}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white shadow"
                      style={{ backgroundColor: partner.avatar_color }}>
                      {partner.name.charAt(0).toUpperCase()}
                    </div>
                    {unread > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: 'var(--red)', borderColor: '#0A0A0F' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                        {partner.name}
                      </p>
                      <span className="text-xs flex-shrink-0" style={{ color: unread > 0 ? 'var(--red)' : 'var(--muted)' }}>
                        {timeAgo(lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {lastMessage.sender_id === myProfileId && (
                        <span className="text-xs flex-shrink-0" style={{ color: lastMessage.read ? '#4ADE80' : 'var(--muted)' }}>
                          {lastMessage.read ? '✓✓' : '✓'}
                        </span>
                      )}
                      <p className={`text-sm truncate ${unread > 0 ? 'font-medium' : ''}`}
                        style={{ color: unread > 0 ? 'var(--white)' : 'var(--muted)' }}>
                        {lastMessage.sender_id === myProfileId ? 'Você: ' : ''}{lastMessage.content}
                      </p>
                    </div>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'var(--red)', fontSize: '10px' }}>
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
