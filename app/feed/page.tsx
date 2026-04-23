'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import AudioPlayer from '@/components/AudioPlayer'
import LevelBadge from '@/components/LevelBadge'
import Link from 'next/link'
import type { Riff } from '@/lib/types'

const TAGS = ['Rock', 'Pop', 'Jazz', 'Funk', 'Samba', 'MPB', 'Eletrônico', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Voz']

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d atrás`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function FeedPage() {
  const [riffs, setRiffs] = useState<Riff[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', tags: [] as string[] })
  const supabase = createClient()

  useEffect(() => {
    getOrCreateProfile().then(p => { if (p) setMyProfileId(p.id) })
  }, [])

  useEffect(() => { fetchRiffs() }, [tagFilter])

  const fetchRiffs = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('riffs')
        .select('*, user:profiles(*), riff_likes(id, user_id)')
        .order('created_at', { ascending: false })
      if (tagFilter) query = query.contains('tags', [tagFilter])
      const { data } = await query
      setRiffs(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handlePostRiff = async () => {
    if (!form.title || !audioFile) return
    setSaving(true); setError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setError('Faça login primeiro'); return }
      const ext = audioFile.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('audio').upload(path, audioFile)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(path)
      await supabase.from('riffs').insert({
        title: form.title, description: form.description,
        audio_url: publicUrl, user_id: profile.id, tags: form.tags, plays: 0,
      })
      setShowModal(false)
      setForm({ title: '', description: '', tags: [] })
      setAudioFile(null)
      fetchRiffs()
    } catch (err: any) {
      setError(err?.message || 'Erro ao postar riff')
    } finally {
      setSaving(false)
    }
  }

  const handleLike = async (riffId: string) => {
    const profile = await getOrCreateProfile()
    if (!profile) return
    const riff = riffs.find(r => r.id === riffId)
    const liked = riff?.riff_likes?.some((l: any) => l.user_id === profile.id)
    // Optimistic update
    setRiffs(prev => prev.map(r => {
      if (r.id !== riffId) return r
      const likes = r.riff_likes || []
      return {
        ...r,
        riff_likes: liked
          ? likes.filter((l: any) => l.user_id !== profile.id)
          : [...likes, { id: 'temp', user_id: profile.id }]
      }
    }))
    if (liked) {
      await supabase.from('riff_likes').delete().eq('riff_id', riffId).eq('user_id', profile.id)
    } else {
      await supabase.from('riff_likes').insert({ riff_id: riffId, user_id: profile.id })
    }
  }

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }))
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Feed</h1>
            <p className="text-muted text-sm mt-0.5">{riffs.length} riffs compartilhados</p>
          </div>
          <button className="btn btn-primary gap-2 flex items-center" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Postar Riff
          </button>
        </div>

        {/* Tag filters */}
        <div className="flex gap-2 flex-wrap mb-8 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => setTagFilter('')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: tagFilter === '' ? 'var(--red)' : 'var(--card)',
              color: tagFilter === '' ? 'white' : 'var(--subtle)',
              border: `1px solid ${tagFilter === '' ? 'var(--red)' : 'var(--border)'}`,
            }}>
            Todos
          </button>
          {TAGS.map(t => (
            <button key={t} onClick={() => setTagFilter(t === tagFilter ? '' : t)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: tagFilter === t ? 'var(--red)' : 'var(--card)',
                color: tagFilter === t ? 'white' : 'var(--subtle)',
                border: `1px solid ${tagFilter === t ? 'var(--red)' : 'var(--border)'}`,
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Riffs grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full" style={{ background: 'var(--border)' }} />
                  <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
                </div>
                <div className="h-4 w-3/4 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-12 rounded-xl" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        ) : riffs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {riffs.map(riff => {
              const isLiked = riff.riff_likes?.some((l: any) => l.user_id === myProfileId)
              return (
                <div key={riff.id} className="card group flex flex-col gap-3"
                  style={{ transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as any).style.transform = 'translateY(-2px)'; (e.currentTarget as any).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)' }}
                  onMouseLeave={e => { (e.currentTarget as any).style.transform = ''; (e.currentTarget as any).style.boxShadow = '' }}>

                  {/* User */}
                  {riff.user && (
                    <Link href={`/profile/${riff.user.id}`} className="flex items-center gap-2.5 group/user">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ring-2 ring-transparent group-hover/user:ring-red transition"
                        style={{ backgroundColor: riff.user.avatar_color }}>
                        {riff.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover/user:text-red transition" style={{ color: 'var(--white)' }}>
                          {riff.user.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{timeAgo(riff.created_at)}</p>
                      </div>
                      <LevelBadge points={riff.user.points} size="sm" />
                    </Link>
                  )}

                  {/* Content */}
                  <div>
                    <h3 className="font-bold mb-1 leading-tight">{riff.title}</h3>
                    {riff.description && (
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--subtle)' }}>{riff.description}</p>
                    )}
                  </div>

                  {/* Player */}
                  <div className="rounded-xl overflow-hidden" style={{ background: 'var(--dark)' }}>
                    <AudioPlayer src={riff.audio_url} title={riff.title} />
                  </div>

                  {/* Tags */}
                  {riff.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {riff.tags.slice(0, 4).map((tag: string) => (
                        <button key={tag} onClick={() => setTagFilter(tag)}
                          className="text-xs px-2 py-0.5 rounded-full transition hover:opacity-80"
                          style={{ background: 'rgba(30,136,229,0.12)', color: 'var(--blue-light)', border: '1px solid rgba(30,136,229,0.2)' }}>
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t mt-auto" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => handleLike(riff.id)}
                      className="flex items-center gap-1.5 text-sm transition-all px-2 py-1 rounded-lg hover:bg-dark"
                      style={{ color: isLiked ? '#f87171' : 'var(--muted)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
                      <span className="font-medium">{riff.riff_likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-sm px-2 py-1" style={{ color: 'var(--muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      <span>{riff.plays || 0}</span>
                    </div>
                    {riff.user && (
                      <Link href={`/chat/${riff.user.id}`}
                        className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition hover:bg-dark"
                        style={{ color: 'var(--subtle)', border: '1px solid var(--border)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Mensagem
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state py-20">
            <div className="empty-state-icon">🎸</div>
            <p className="text-xl font-bold mb-2">Nenhum riff ainda</p>
            <p className="text-muted text-sm mb-5">Seja o primeiro a compartilhar!</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Compartilhar Riff</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Compartilhar Riff</h2>
                <p className="text-sm text-muted mt-0.5">Compartilhe seu som com a comunidade</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-dark transition text-xl leading-none">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Título *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="input" placeholder="Ex: Solo de guitarra em Am" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2} className="input resize-none" placeholder="Conte sobre o riff, equipamentos, contexto..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: form.tags.includes(tag) ? 'var(--red)' : 'var(--dark)',
                        color: form.tags.includes(tag) ? 'white' : 'var(--subtle)',
                        border: `1px solid ${form.tags.includes(tag) ? 'var(--red)' : 'var(--border)'}`,
                      }}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Arquivo de Áudio *</label>
                <div className="relative">
                  <input type="file" accept="audio/*" id="audio-upload" onChange={e => setAudioFile(e.target.files?.[0] || null)}
                    className="sr-only" />
                  <label htmlFor="audio-upload"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition hover:opacity-80"
                    style={{ background: 'var(--dark)', border: `2px dashed ${audioFile ? 'var(--blue)' : 'var(--border)'}` }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: audioFile ? 'var(--blue)' : 'var(--muted)', flexShrink: 0 }}>
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                    <span className="text-sm" style={{ color: audioFile ? 'var(--white)' : 'var(--muted)' }}>
                      {audioFile ? audioFile.name : 'Clique para selecionar MP3 ou WAV'}
                    </span>
                  </label>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', color: '#f87171' }}>
                  ⚠ {error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={handlePostRiff} disabled={saving || !form.title || !audioFile}
                  className="btn btn-primary flex-1">
                  {saving ? (
                    <span className="flex items-center gap-2 justify-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Postar Riff'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary px-5">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
