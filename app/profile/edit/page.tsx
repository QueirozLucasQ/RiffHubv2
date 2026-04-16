'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INSTRUMENTS = ['Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Violão', 'Voz', 'Saxofone', 'Trompete', 'Violino', 'Percussão', 'Outro']
const GENRES = ['Rock', 'Jazz', 'Pop', 'Samba', 'MPB', 'Funk', 'Blues', 'Metal', 'Eletrônica', 'Clássico', 'Reggae', 'Forró']
const EXPERIENCE_LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'profissional', label: 'Profissional' },
]

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileId, setProfileId] = useState<string>('')
  const [form, setForm] = useState({
    name: '',
    bio: '',
    city: '',
    experience: 'iniciante',
    instruments: [] as string[],
    genres: [] as string[],
  })

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProfileId(data.id)
        setForm({
          name: data.name || '',
          bio: data.bio || '',
          city: data.city || '',
          experience: data.experience || 'iniciante',
          instruments: data.instruments || [],
          genres: data.genres || [],
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const toggleItem = (list: string[], item: string, field: 'instruments' | 'genres') => {
    const updated = list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item]
    setForm({ ...form, [field]: updated })
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('profiles')
        .update({
          name: form.name,
          bio: form.bio,
          city: form.city,
          experience: form.experience,
          instruments: form.instruments,
          genres: form.genres,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      router.push(`/profile/${profileId}`)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Editar Perfil</h1>

        <div className="space-y-6">
          {/* Nome */}
          <div className="card">
            <label className="block text-sm text-muted mb-2">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue transition"
              placeholder="Seu nome artístico"
            />
          </div>

          {/* Bio */}
          <div className="card">
            <label className="block text-sm text-muted mb-2">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue transition resize-none"
              placeholder="Fale um pouco sobre você..."
            />
          </div>

          {/* Cidade */}
          <div className="card">
            <label className="block text-sm text-muted mb-2">Cidade</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue transition"
              placeholder="Ex: São Paulo, SP"
            />
          </div>

          {/* Experiência */}
          <div className="card">
            <label className="block text-sm text-muted mb-3">Nível de Experiência</label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setForm({ ...form, experience: level.value })}
                  className={`px-4 py-2 rounded text-sm font-semibold transition ${
                    form.experience === level.value
                      ? 'bg-blue text-white'
                      : 'bg-dark border border-border text-muted hover:border-blue'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instrumentos */}
          <div className="card">
            <label className="block text-sm text-muted mb-3">Instrumentos</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst}
                  onClick={() => toggleItem(form.instruments, inst, 'instruments')}
                  className={`px-3 py-1 rounded text-sm transition ${
                    form.instruments.includes(inst)
                      ? 'bg-red text-white'
                      : 'bg-dark border border-border text-muted hover:border-red'
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* Gêneros */}
          <div className="card">
            <label className="block text-sm text-muted mb-3">Gêneros Musicais</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleItem(form.genres, genre, 'genres')}
                  className={`px-3 py-1 rounded text-sm transition ${
                    form.genres.includes(genre)
                      ? 'bg-blue text-white'
                      : 'bg-dark border border-border text-muted hover:border-blue'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
            <button
              onClick={() => router.back()}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
