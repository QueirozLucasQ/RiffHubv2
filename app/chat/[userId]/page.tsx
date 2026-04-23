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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const me = await getOrCreateProfile()
      if (!me) return
      setMyProfile(me)

      const { data: other } = await supabase.from('profiles').select('*').eq('id', params.userId).single()
      if (other) setOtherProfile(other)

      await loadMessages(me.id)
      setLoading(false)

      await supabase.from('messages').update({ read: true })
        .eq('sender_id', params.userId)
        .eq('receiver_id', me.id)
        .eq('read', false)

      const channel = supabase
        .channel(`chat-${me.id}-${params.userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
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

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || !myProfile || sending) return
    const content = text.trim()
    setSending(true)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: myProfile.id,
      receiver_id: params.userId,
      content,
      created_at: new Date().toISOString(),
      read: false,
      pending: true,
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data } = await supabase.from('messages').insert({
        sender_id: myProfile.id,
        receiver_id: params.userId,
        content,
        read: false,
      }).select().single()

      if (data) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
      }

      await supabase.from('notifications').insert({
        user_id: params.userId,
        type: 'new_message',
        title: `Nova mensagem de ${myProfile.name}`,
        body: content.slice(0, 60),
        link: `/chat/${myProfile.id}`,
        read: false,
      })
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setText(content)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const formatTime = (date: string) => new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hoje'
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  }

  // Group consecutive messages from the same sender
  const groupedMessages = messages.reduce((acc: any[], msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const isFirst = !prev || prev.sender_id !== msg.sender_id
    const isLast = !next || next.sender_id !== msg.sender_id
    acc.push({ ...msg, isFirst, isLast })
    return acc
  }, [])

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--dark)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: 'var(--red)' }} />
        <p className="text-muted text-sm">Carregando conversa...</p>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0A0A0F' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
        style={{ background: 'rgba(12,12,20,0.98)', backdropFilter: 'blur(16px)', borderColor: 'var(--border)' }}>
        <Link href="/chat"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-card"
          style={{ color: 'var(--subtle)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>

        {otherProfile && (
          <Link href={`/profile/${otherProfile.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: otherProfile.avatar_color }}>
                {otherProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black" style={{ background: '#4ADE80' }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{otherProfile.name}</p>
              <p className="text-xs" style={{ color: '#4ADE80' }}>Online</p>
            </div>
          </Link>
        )}

        {otherProfile && (
          <Link href={`/profile/${otherProfile.id}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-card"
            style={{ color: 'var(--subtle)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: '#0A0A0F' }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
            {otherProfile && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl"
                  style={{ backgroundColor: otherProfile.avatar_color }}>
                  {otherProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{otherProfile.name}</p>
                  {otherProfile.city && <p className="text-sm text-muted">{otherProfile.city}</p>}
                  {otherProfile.instruments?.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-2">
                      {otherProfile.instruments.slice(0, 3).map((i: string) => (
                        <span key={i} className="badge badge-red text-xs">{i}</span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-muted text-sm">Inicie a conversa com {otherProfile.name.split(' ')[0]} 👋</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 max-w-2xl mx-auto">
            {groupedMessages.map((msg, i) => {
              const isMe = msg.sender_id === myProfile?.id
              const prev = groupedMessages[i - 1]
              const showDate = i === 0 || formatDate(messages[i - 1]?.created_at) !== formatDate(msg.created_at)

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                      <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'var(--card)', color: 'var(--muted)' }}>
                        {formatDate(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${msg.isFirst ? 'mt-3' : 'mt-0.5'}`}>
                    {/* Avatar (only for received, only on last in group) */}
                    {!isMe && (
                      <div className="w-7 flex-shrink-0 flex items-end">
                        {msg.isLast && otherProfile && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: otherProfile.avatar_color }}>
                            {otherProfile.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className="px-3.5 py-2 text-sm leading-relaxed"
                        style={{
                          background: isMe
                            ? 'linear-gradient(135deg, var(--red) 0%, #c62828 100%)'
                            : 'var(--card)',
                          color: 'var(--white)',
                          borderRadius: isMe
                            ? msg.isFirst ? '18px 18px 4px 18px' : msg.isLast ? '18px 4px 18px 18px' : '18px 4px 4px 18px'
                            : msg.isFirst ? '18px 18px 18px 4px' : msg.isLast ? '4px 18px 18px 18px' : '4px 18px 18px 4px',
                          boxShadow: isMe ? '0 2px 8px rgba(229,57,53,0.25)' : '0 1px 4px rgba(0,0,0,0.3)',
                          opacity: msg.pending ? 0.6 : 1,
                        }}>
                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Time + read receipt */}
                      {msg.isLast && (
                        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs" style={{ color: 'var(--muted)', fontSize: '10px' }}>
                            {formatTime(msg.created_at)}
                          </span>
                          {isMe && (
                            <span style={{ color: msg.read ? '#4ADE80' : 'var(--muted)', fontSize: '10px' }}>
                              {msg.pending ? '○' : msg.read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t"
        style={{ background: 'rgba(12,12,20,0.98)', borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <div className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{ background: 'var(--card)', border: '1px solid var(--border-light)' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none resize-none"
              style={{ color: 'var(--white)', maxHeight: '120px', lineHeight: '1.5' }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: text.trim() && !sending ? 'var(--red)' : 'var(--border)',
              color: 'white',
              transform: text.trim() ? 'scale(1)' : 'scale(0.9)',
              boxShadow: text.trim() ? '0 2px 12px rgba(229,57,53,0.4)' : 'none',
            }}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-center mt-1.5" style={{ color: 'var(--muted)', fontSize: '10px' }}>
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
