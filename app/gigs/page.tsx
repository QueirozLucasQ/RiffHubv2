'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import GigCard from '@/components/GigCard'
import type { Gig } from '@/lib/types'

const PAY_FILTERS = [
  { label: 'Qualquer valor', value: '' },
  { label: 'Até R$300', value: 'low' },
  { label: 'R$300–800', value: 'mid' },
  { label: 'Acima R$800', value: 'high' },
  { label: 'A combinar', value: 'negotiable' },
]

export default function GigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [appliedGigIds, setAppliedGigIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [instrumentFilter, setInstrumentFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<'all' | 'remote' | 'onsite'>('all')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [payFilter, setPayFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    instrument: '',
    type: '',
    dates: '',
    city: '',
    state: '',
    remote: false,
    pay: '',
    description: '',
  })
  const supabase = createClient()

  useEffect(() => { fetchGigs(); fetchApplied() }, [instrumentFilter, typeFilter, locationFilter, cityFilter])

  const fetchApplied = async () => {
    try {
      const profile = await getOrCreateProfile()
      if (!profile) return
      const { data } = await supabase.from('gig_applications').select('gig_id').eq('musician_id', profile.id)
      if (data) setAppliedGigIds(new Set(data.map(a => a.gig_id)))
    } catch (e) {
      // not logged in, no applied gigs
    }
  }

  const fetchGigs = async () => {
    try {
      setLoading(true)
      let query = supabase.from('gigs').select('*, poster:profiles(*)').eq('status', 'open').order('created_at', { ascending: false })
      if (instrumentFilter) query = query.eq('instrument', instrumentFilter)
      if (typeFilter) query = query.eq('type', typeFilter)
      if (locationFilter === 'remote') query = query.eq('remote', true)
      else if (locationFilter === 'onsite') query = query.eq('remote', false)
      if (cityFilter.trim()) query = query.ilike('city', `%${cityFilter.trim()}%`)
      const { data, error } = await query
      if (error) throw error
      setGigs(data || [])
    } catch (error) {
      console.error('Error fetching gigs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGig = async () => {
    if (!form.title || !form.instrument || !form.type || !form.dates || !form.city || !form.pay) return
    setSaving(true)
    setError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setError('Faça login para postar uma gig'); setSaving(false); return }

      const cityDisplay = form.state ? `${form.city}, ${form.state}` : form.city

      await supabase.from('gigs').insert({
        title: form.title,
        poster_id: profile.id,
        instrument: form.instrument,
        type: form.type,
        dates: form.dates,
        city: cityDisplay,
        remote: form.remote,
        pay: form.pay,
        description: form.description,
        status: 'open',
      })

      setShowModal(false)
      setForm({ title: '', instrument: '', type: '', dates: '', city: '', state: '', remote: false, pay: '', description: '' })
      fetchGigs()
    } catch (err: any) {
      console.error('Error creating gig:', err)
      setError(err?.message || 'Erro ao criar gig. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const instruments = ['Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Violão', 'Voz', 'Saxofone', 'Percussão', 'Outro']
  const types = [
    { value: 'show', label: 'Show' },
    { value: 'gravação', label: 'Gravação' },
    { value: 'turnê', label: 'Turnê' },
    { value: 'sessão', label: 'Sessão' },
  ]
  const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  // Filter gigs by pay client-side
  const filteredGigs = gigs.filter(gig => {
    if (!payFilter) return true
    const payStr = gig.pay?.toLowerCase() || ''
    if (payFilter === 'negotiable') return payStr.includes('combinar') || payStr.includes('negoc')
    const numMatch = payStr.match(/\d+/)
    const num = numMatch ? parseInt(numMatch[0]) : 0
    if (payFilter === 'low') return num > 0 && num <= 300
    if (payFilter === 'mid') return num > 300 && num <= 800
    if (payFilter === 'high') return num > 800
    return true
  })

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold">Oportunidades de Trabalho</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Postar Gig
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">

              {/* City search */}
              <div className="card">
                <h3 className="font-bold mb-3">Cidade / Estado</h3>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={e => { setCityFilter(e.target.value); }}
                  onKeyDown={e => e.key === 'Enter' && fetchGigs()}
                  placeholder="Ex: São Paulo, Rio..."
                  className="w-full px-3 py-2 bg-dark border border-border rounded text-white text-sm outline-none focus:border-blue"
                />
                {cityFilter && (
                  <button onClick={() => setCityFilter('')} className="text-xs text-muted mt-2 hover:text-red">✕ Limpar</button>
                )}
              </div>

              {/* Instruments */}
              <div className="card">
                <h3 className="font-bold mb-4">Instrumento</h3>
                <div className="space-y-1">
                  <button onClick={() => setInstrumentFilter('')} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${instrumentFilter === '' ? 'bg-red text-white' : 'hover:bg-dark'}`}>Todos</button>
                  {instruments.map((inst) => (
                    <button key={inst} onClick={() => setInstrumentFilter(inst)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${instrumentFilter === inst ? 'bg-red text-white' : 'hover:bg-dark'}`}>{inst}</button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="card">
                <h3 className="font-bold mb-4">Tipo</h3>
                <div className="space-y-1">
                  <button onClick={() => setTypeFilter('')} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${typeFilter === '' ? 'bg-red text-white' : 'hover:bg-dark'}`}>Todos</button>
                  {types.map((t) => (
                    <button key={t.value} onClick={() => setTypeFilter(t.value)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${typeFilter === t.value ? 'bg-red text-white' : 'hover:bg-dark'}`}>{t.label}</button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="card">
                <h3 className="font-bold mb-4">Local</h3>
                <div className="space-y-1">
                  {(['all', 'remote', 'onsite'] as const).map((loc) => (
                    <button key={loc} onClick={() => setLocationFilter(loc)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${locationFilter === loc ? 'bg-red text-white' : 'hover:bg-dark'}`}>
                      {loc === 'all' ? 'Todos' : loc === 'remote' ? '🌐 Remoto' : '📍 Presencial'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Cachê</h3>
                <div className="space-y-1">
                  {PAY_FILTERS.map(f => (
                    <button key={f.value} onClick={() => setPayFilter(f.value)} className={`block w-full text-left text-sm px-3 py-2 rounded transition ${payFilter === f.value ? 'bg-blue text-white' : 'hover:bg-dark'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gigs Grid */}
          <div className="lg:col-span-3">
            {appliedGigIds.size > 0 && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(30,136,229,0.1)', border: '1px solid rgba(30,136,229,0.3)', color: 'var(--blue)' }}>
                ✓ Você já se candidatou a {appliedGigIds.size} gig{appliedGigIds.size > 1 ? 's' : ''}
              </div>
            )}
            {loading ? (
              <div className="text-center py-12 text-muted"><p>Carregando gigs...</p></div>
            ) : filteredGigs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredGigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} isApplied={appliedGigIds.has(gig.id)}
                    onApplied={() => setAppliedGigIds(prev => new Set([...prev, gig.id]))} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted"><p>Nenhuma gig encontrada. Seja o primeiro a postar!</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Postar Gig */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Postar Gig</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Título *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="Ex: Preciso de guitarrista para show" />
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Instrumento *</label>
                <div className="flex flex-wrap gap-2">
                  {instruments.map((inst) => (
                    <button key={inst} onClick={() => setForm({ ...form, instrument: inst })} className={`px-3 py-1 rounded text-sm transition ${form.instrument === inst ? 'bg-red text-white' : 'bg-dark border border-border text-muted hover:border-red'}`}>{inst}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Tipo *</label>
                <div className="flex flex-wrap gap-2">
                  {types.map((t) => (
                    <button key={t.value} onClick={() => setForm({ ...form, type: t.value })} className={`px-3 py-1 rounded text-sm transition ${form.type === t.value ? 'bg-blue text-white' : 'bg-dark border border-border text-muted hover:border-blue'}`}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Data(s) *</label>
                <input type="text" value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="Ex: 20/05/2026" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Cidade *</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="São Paulo" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Estado</label>
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue">
                    <option value="">Selecione</option>
                    {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Cachê *</label>
                <input type="text" value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue" placeholder="Ex: R$ 500 / A combinar" />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Descrição</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue resize-none" placeholder="Detalhes adicionais..." />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm({ ...form, remote: !form.remote })}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${form.remote ? 'bg-blue' : 'bg-border'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${form.remote ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-muted">Trabalho remoto</span>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded p-3 mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreateGig} disabled={saving || !form.title || !form.instrument || !form.type || !form.dates || !form.city || !form.pay} className="btn btn-primary flex-1">
                {saving ? 'Postando...' : 'Postar Gig'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
