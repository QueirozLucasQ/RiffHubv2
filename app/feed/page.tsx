'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import AudioPlayer from '@/components/AudioPlayer'
import LevelBadge from '@/components/LevelBadge'
import Link from 'next/link'
import type { Riff } from '@/lib/types'

const TAGS = ['Rock', 'Pop', 'Jazz', 'Funk', 'Samba', 'MPB', 'Eletrônico', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Voz']

export default function FeedPage() {
  const [riffs, setRiffs] = useState<Riff[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', description: '', tags: '' })
  const supabase = createClient()

  useEffect(() => { fetchRiffs() }, [tagFilter])

  const fetchRiffs = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('riffs')
        .select('*, user:profiles(*), riff_likes(id, user_id)')
        .order('created_at', { ascending: false })
      if (tagFilter) query = query.contains('tags', [tagFilter])
      const { data, error } = await query
      if (error) throw error
      setRiffs(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePostRiff = async () => {
    if (!form.title || !audioFile) return
    setSaving(true)
    setError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setError('Faça login primeiro'); setSaving(false); return }

      const fileExt = audioFile.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('audio').upload(fileName, audioFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName)

      await supabase.from('riffs').insert({
        title: form.title,
        description: form.description,
        audio_url: publicUrl,
        user_id: profile.id,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        plays: 0,
      })

      setShowModal(false)
      setForm({ title: '', description: '', tags: '' })
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
    const alreadyLiked = riffs.find(r => r.id === riffId)?.riff_likes?.some((l: any) => l.user_id === profile.id)
    if (alreadyLiked) {
      await supabase.from('riff_likes').delete().eq('riff_id', riffId).eq('user_id', profile.id)
    } else {
      await supabase.from('riff_likes').insert({ riff_id: riffId, user_id: profile.id })
    }
    fetchRiffs()
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Feed de Riffs</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Compartilhar Riff
          </button>
        </div>

        {/* Tag filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button onClick={() => setTagFilter('')} className={`chip ${tagFilter === '' ? 'chip-active-red' : ''}`}>Todos</button>
          {TAGS.map(t => (
            <button key={t} onClick={() => setTagFilter(t)} className={`chip ${tagFilter === t ? 'chip-active-red' : ''}`}>{t}</button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="lg:col-span-3 empty-state"><div className="animate-pulse">Carregando riffs...</div></div>
          ) : riffs.length > 0 ? riffs.map(riff => (
            <div key={riff.id} className="card card-hover">
              {riff.user && (
                <Link href={`/profile/${riff.user.id}`} className="flex items-center gap-2 mb-4 group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: riff.user.avatar_color }}>
                    {riff.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-red transition">{riff.user.name}</p>
                    {riff.user.city && <p className="text-xs text-muted">{riff.user.city}</p>}
                  </div>
                  <div className="ml-auto"><LevelBadge points={riff.user.points} size="sm" /></div>
                </Link>
              )}
              <h3 className="font-bold text-lg mb-1">{riff.title}</h3>
              {riff.description && <p className="text-sm text-muted mb-3 line-clamp-2">{riff.description}</p>}
              <div className="mb-4"><AudioPlayer src={riff.audio_url} title={riff.title} /></div>
              {riff.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {riff.tags.slice(0, 4).map((tag: string) => (
                    <span key={tag} className="badge badge-blue text-xs">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 pt-3 border-t text-sm text-muted" style={{ borderColor: 'var(--border)' }}>
                <span>▶ {riff.plays || 0}</span>
                <button onClick={() => handleLike(riff.id)} className="flex items-center gap-1 hover:text-red transition">
                  ♥ {riff.riff_likes?.length || 0}
                </button>
              </div>
            </div>
          )) : (
            <div className="lg:col-span-3 empty-state">
              <div className="empty-state-icon">🎸</div>
              <p className="text-lg font-semibold mb-2">Nenhum riff ainda</p>
              <p className="text-sm mb-4">Seja o primeiro a compartilhar!</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Compartilhar Riff</button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Compartilhar Riff</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Título *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="input" placeholder="Nome do riff" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2} className="input resize-none" placeholder="Fale sobre seu riff..." />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Tags (separadas por vírgula)</label>
                <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                  className="input" placeholder="rock, guitarra, solo..." />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Arquivo de Áudio * (MP3, WAV)</label>
                <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)}
                  className="input text-sm" />
              </div>
              {error && <p className="text-sm bg-red-900/20 border border-red-800/30 text-red-400 rounded p-3">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={handlePostRiff} disabled={saving || !form.title || !audioFile} className="btn btn-primary flex-1">
                  {saving ? 'Postando...' : 'Postar Riff'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
