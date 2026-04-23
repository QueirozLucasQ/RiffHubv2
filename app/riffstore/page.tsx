'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import SampleCard from '@/components/SampleCard'
import type { Sample, Profile } from '@/lib/types'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const STYLES = ['Rock', 'Jazz', 'Pop', 'Samba', 'MPB', 'Funk', 'Blues', 'Metal', 'Eletrônica', 'Reggae', 'Forró', 'Clássico']

export default function RiffStorePage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [topCreators, setTopCreators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [styleFilter, setStyleFilter] = useState<string>('')
  const [licenseFilter, setLicenseFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '',
    category: '',
    style: '',
    bpm: '',
    key: 'C',
    license: 'free',
    tags: '',
  })
  const supabase = createClient()

  useEffect(() => { fetchSamples() }, [categoryFilter, styleFilter, licenseFilter])
  useEffect(() => { fetchTopCreators() }, [])

  const fetchSamples = async () => {
    try {
      setLoading(true)
      let query = supabase.from('samples').select('*, creator:profiles(*)').order('created_at', { ascending: false })
      if (categoryFilter) query = query.eq('category', categoryFilter)
      if (styleFilter) query = query.eq('style', styleFilter)
      if (licenseFilter) query = query.eq('license', licenseFilter)
      const { data, error } = await query
      if (error) throw error
      setSamples(data || [])
    } catch (error) {
      console.error('Error fetching samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTopCreators = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').order('points', { ascending: false }).limit(5)
      setTopCreators(data || [])
    } catch (error) {
      console.error('Error fetching top creators:', error)
    }
  }

  const handleCreateSample = async () => {
    if (!form.title || !form.category || !form.bpm || !audioFile) return
    setSaving(true)
    setError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setError('Faça login para subir um sample'); setSaving(false); return }

      const fileExt = audioFile.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('audio').upload(fileName, audioFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('samples').insert({
        title: form.title,
        creator_id: profile.id,
        category: form.category,
        style: form.style || null,
        bpm: parseInt(form.bpm),
        key: form.key,
        license: form.license,
        audio_url: publicUrl,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        downloads: 0,
      })

      if (insertError) throw insertError

      await supabase.from('profiles').update({ points: (profile.points || 0) + 10 }).eq('id', profile.id)

      setShowModal(false)
      setForm({ title: '', category: '', style: '', bpm: '', key: 'C', license: 'free', tags: '' })
      setAudioFile(null)
      fetchSamples()
      fetchTopCreators()
    } catch (err: any) {
      console.error('Error creating sample:', err)
      setError(err?.message || 'Erro ao subir sample. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const categories = ['Drums', 'Bass', 'Synth', 'Guitar', 'Vocals', 'Pads', 'Effects']
  const licenses = [
    { value: 'free', label: 'Grátis' },
    { value: 'credit', label: 'Com Créditos' },
    { value: 'non-commercial', label: 'Não Comercial' },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold">Riff Store</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Subir Sample
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              <div className="card">
                <h3 className="font-bold mb-4">Categorias</h3>
                <div className="space-y-1">
                  <button onClick={() => setCategoryFilter('')} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${categoryFilter === '' ? 'bg-red text-white' : 'hover:bg-card'}`}>Todas</button>
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${categoryFilter === cat ? 'bg-red text-white' : 'hover:bg-card'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold mb-4">Estilo Musical</h3>
                <div className="space-y-1">
                  <button onClick={() => setStyleFilter('')} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${styleFilter === '' ? 'bg-blue text-white' : 'hover:bg-card'}`}>Todos</button>
                  {STYLES.map((s) => (
                    <button key={s} onClick={() => setStyleFilter(s)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${styleFilter === s ? 'bg-blue text-white' : 'hover:bg-card'}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold mb-4">Licença</h3>
                <div className="space-y-1">
                  <button onClick={() => setLicenseFilter('')} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${licenseFilter === '' ? 'bg-red text-white' : 'hover:bg-card'}`}>Todas</button>
                  {licenses.map((lic) => (
                    <button key={lic.value} onClick={() => setLicenseFilter(lic.value)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${licenseFilter === lic.value ? 'bg-red text-white' : 'hover:bg-card'}`}>{lic.label}</button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold mb-4">Top Criadores</h3>
                <div className="space-y-3">
                  {topCreators.map((creator) => (
                    <div key={creator.id} className="flex items-center gap-2 p-2 hover:bg-dark rounded transition">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: creator.avatar_color }}>
                        {creator.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{creator.name}</p>
                        <p className="text-xs text-muted">{creator.points} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Samples Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12 text-muted"><p>Carregando samples...</p></div>
            ) : samples.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {samples.map((sample) => <SampleCard key={sample.id} sample={sample} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted"><p>Nenhum sample encontrado. Seja o primeiro a subir!</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Subir Sample */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Subir Sample</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Título *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="Nome do sample" />
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Categoria *</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setForm({ ...form, category: cat })} className={`px-3 py-1 rounded text-sm transition ${form.category === cat ? 'bg-red text-white' : 'bg-dark border border-border text-muted hover:border-red'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Estilo Musical</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button key={s} onClick={() => setForm({ ...form, style: form.style === s ? '' : s })} className={`px-3 py-1 rounded text-sm transition ${form.style === s ? 'bg-blue text-white' : 'bg-dark border border-border text-muted hover:border-blue'}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">BPM *</label>
                  <input type="number" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="120" min="40" max="300" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Tom</label>
                  <select value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue">
                    {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Licença</label>
                <div className="flex gap-2">
                  {licenses.map((lic) => (
                    <button key={lic.value} onClick={() => setForm({ ...form, license: lic.value })} className={`px-3 py-1 rounded text-sm transition ${form.license === lic.value ? 'bg-blue text-white' : 'bg-dark border border-border text-muted hover:border-blue'}`}>{lic.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Tags (separadas por vírgula)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="groove, hard, lofi..." />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Arquivo de Áudio * (MP3, WAV)</label>
                <label className="flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'var(--dark)', border: '2px dashed var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = audioFile ? 'var(--red)' : 'var(--border)')}>
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                  <span className="text-lg">🎵</span>
                  <span className="text-sm" style={{ color: audioFile ? 'var(--white)' : 'var(--muted)' }}>
                    {audioFile ? audioFile.name : 'Clique para escolher MP3 ou WAV'}
                  </span>
                </label>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded p-3 mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreateSample} disabled={saving || !form.title || !form.category || !form.bpm || !audioFile} className="btn btn-primary flex-1">
                {saving ? 'Enviando...' : 'Subir Sample'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
