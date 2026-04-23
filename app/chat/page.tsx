'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getOrCreateProfile()
      if (!profile) return
      setMyProfileId(profile.id)

      // Fetch all messages involving this user
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      if (!messages || messages.length === 0) {
        setLoading(false)
        return
      }

      // Collect unique partner IDs
      const partnerIds = new Set<string>()
      for (const msg of messages) {
        const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id
        partnerIds.add(partnerId)
      }

      // Fetch partner profiles separately (avoids FK hint issues)
      const { data: partnerProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(partnerIds))

      const profileMap: Record<string, any> = {}
      for (const p of (partnerProfiles || [])) {
        profileMap[p.id] = p
      }

      // Group by conversation partner (one entry per partner, latest message)
      const seen = new Set<string>()
      const convos: any[] = []
      for (const msg of messages) {
        const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id
        if (!seen.has(partnerId)) {
          seen.add(partnerId)
          const partner = profileMap[partnerId]
          if (!partner) continue
          const unread = messages.filter(m =>
            m.sender_id === partnerId &&
            m.receiver_id === profile.id &&
            !m.read
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
    return `${Math.floor(h / 24)}d`
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Mensagens</h1>
        {loading ? (
          <div className="text-center py-12 text-muted">Carregando...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">💬</p>
            <p className="text-lg font-semibold mb-2">Nenhuma conversa ainda</p>
            <p className="text-muted text-sm">Visite o perfil de um músico e inicie uma conversa</p>
            <Link href="/search" className="btn btn-primary mt-6 inline-block">Encontrar Músicos</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(({ partner, lastMessage, unread }) => (
              <Link key={partner.id} href={`/chat/${partner.id}`}
                className="flex items-center gap-4 p-4 rounded-xl transition hover:bg-card"
                style={{ border: '1px solid var(--border)', background: unread > 0 ? 'rgba(30,136,229,0.05)' : 'transparent' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                  style={{ backgroundColor: partner.avatar_color }}>
                  {partner.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold">{partner.name}</p>
                    <span className="text-xs text-muted">{timeAgo(lastMessage.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted truncate">
                    {lastMessage.sender_id === myProfileId ? 'Você: ' : ''}{lastMessage.content}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: 'var(--blue)' }}>{unread}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
