'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import SampleCard from '@/components/SampleCard'
import type { Sample, Profile } from '@/lib/types'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export default function RiffStorePage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [topCreators, setTopCreators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [licenseFilter, setLicenseFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '',
    category: '',
    bpm: '',
    key: 'C',
    license: 'free',
    tags: '',
  })
  const supabase = createClient()

  useEffect(() => { fetchSamples() }, [categoryFilter, licenseFilter])
  useEffect(() => { fetchTopCreators() }, [])

  const fetchSamples = async () => {
    try {
      setLoading(true)
      let query = supabase.from('samples').select('*, creator:profiles(*)').order('created_at', { ascending: false })
      if (categoryFilter) query = query.eq('category', categoryFilter)
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

      // Upload audio file
      const fileExt = audioFile.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('audio').upload(fileName, audioFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName)

      await supabase.from('samples').insert({
        title: form.title,
        creator_id: profile.id,
        category: form.category,
        bpm: parseInt(form.bpm),
        key: form.key,
        license: form.license,
        audio_url: publicUrl,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        downloads: 0,
      })

      // Add points to creator
      await supabase.from('profiles').update({ points: (await supabase.from('profiles').select('points').eq('id', profile.id).single()).data?.points + 10 }).eq('id', profile.id)

      setShowModal(false)
      setForm({ title: '', category: '', bpm: '', key: 'C', license: 'free', tags: '' })
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
                <div className="space-y-2">
                  <button onClick={() => setCategoryFilter('')} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${categoryFilter === '' ? 'bg-red text-white' : 'hover:bg-card'}`}>Todas</button>
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${categoryFilter === cat ? 'bg-red text-white' : 'hover:bg-card'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold mb-4">Licença</h3>
                <div className="space-y-2">
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

              <div className="card">
                <h3 className="font-bold mb-4">Níveis</h3>
                <div className="space-y-2 text-xs">
                  {[['🎸','Novato (0+)'],['🎹','Sideman (100+)'],['🎤','Session (500+)'],['⭐','Referência (1500+)'],['👑','Lenda (5000+)']].map(([icon, label]) => (
                    <div key={label} className="flex gap-2 items-center"><span>{icon}</span><span>{label}</span></div>
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
                <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 bg-dark border border-border rounded text-white text-sm" />
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
