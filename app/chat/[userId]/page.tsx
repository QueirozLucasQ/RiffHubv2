'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'

interface ChatPageProps { params: { userId: string } }

export default function ChatConversationPage({ params }: ChatPageProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [myProfile, setMyProfile] = useState<any>(null)
  const [otherProfile, setOtherProfile] = useState<any>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const me = await getOrCreateProfile()
      if (!me) return
      setMyProfile(me)

      // Get other profile
      const { data: other } = await supabase.from('profiles').select('*').eq('id', params.userId).single()
      if (other) setOtherProfile(other)

      // Load messages
      await loadMessages(me.id)
      setLoading(false)

      // Mark as read
      await supabase.from('messages').update({ read: true })
        .eq('sender_id', params.userId)
        .eq('receiver_id', me.id)
        .eq('read', false)

      // Real-time
      const channel = supabase
        .channel(`chat-${me.id}-${params.userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${me.id}`,
        }, (payload) => {
          const msg = payload.new as any
          if (msg.sender_id === params.userId) {
            setMessages(prev => [...prev, msg])
            supabase.from('messages').update({ read: true }).eq('id', msg.id)
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [params.userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async (myId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${params.userId}),and(sender_id.eq.${params.userId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !myProfile || sending) return
    setSending(true)
    try {
      await supabase.from('messages').insert({
        sender_id: myProfile.id,
        receiver_id: params.userId,
        content: text.trim(),
        read: false,
      })

      // Notify receiver
      await supabase.from('notifications').insert({
        user_id: params.userId,
        type: 'new_message',
        title: `Nova mensagem de ${myProfile.name}`,
        body: text.trim().slice(0, 60),
        link: `/chat/${myProfile.id}`,
        read: false,
      })

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_id: myProfile.id,
        receiver_id: params.userId,
        content: text.trim(),
        created_at: new Date().toISOString(),
      }])
      setText('')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (date: string) => new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted">Carregando conversa...</p>
    </div>
  )

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <Link href="/chat" className="text-muted hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        {otherProfile && (
          <Link href={`/profile/${otherProfile.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: otherProfile.avatar_color }}>
              {otherProfile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{otherProfile.name}</p>
              {otherProfile.city && <p className="text-xs text-muted">{otherProfile.city}</p>}
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👋</p>
            <p className="text-muted text-sm">Comece a conversa!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === myProfile?.id
          const showDate = i === 0 || formatDate(messages[i-1].created_at) !== formatDate(msg.created_at)
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-4">
                  <span className="text-xs text-muted px-3 py-1 rounded-full" style={{ background: 'var(--card)' }}>
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={{
                    background: isMe ? 'var(--red)' : 'var(--card)',
                    color: isMe ? 'white' : 'var(--white)',
                  }}>
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-muted'}`}>{formatTime(msg.created_at)}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage}
        className="flex items-end gap-3 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--dark)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any) } }}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-xl resize-none text-sm outline-none transition"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--white)', maxHeight: '120px' }}
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition"
          style={{ background: text.trim() ? 'var(--red)' : 'var(--border)', color: 'white' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
