'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import ProjectCard from '@/components/ProjectCard'
import type { Project } from '@/lib/types'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const STYLES = ['Rock', 'Jazz', 'Pop', 'Samba', 'MPB', 'Funk', 'Blues', 'Metal', 'Eletrônica', 'Reggae', 'Forró', 'Outro']

export default function CollabPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    style: '',
    bpm: '',
    key: 'C',
    instruments: [''] as string[],
  })
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [statusFilter])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('projects')
        .select('*, owner:profiles(*), project_tracks(*)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!form.title || !form.style || !form.bpm) return
    setSaving(true)
    setError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setError('Faça login para criar um projeto'); setSaving(false); return }

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: form.title,
          description: form.description,
          owner_id: profile.id,
          style: form.style,
          bpm: parseInt(form.bpm),
          key: form.key,
          status: 'open',
        })
        .select()
        .single()

      if (error) throw error

      // Insert tracks
      const validInstruments = form.instruments.filter(i => i.trim())
      if (validInstruments.length > 0) {
        await supabase.from('project_tracks').insert(
          validInstruments.map(inst => ({ project_id: project.id, instrument: inst, filled: false }))
        )
      }

      setShowModal(false)
      setForm({ title: '', description: '', style: '', bpm: '', key: 'C', instruments: [''] })
      fetchProjects()
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err?.message || 'Erro ao criar projeto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    total: projects.length,
    open: projects.filter((p) => p.status === 'open').length,
    active: projects.filter((p) => p.status === 'in_progress').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold">Projetos Colaborativos</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Criar Projeto
          </button>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="card text-center">
            <div className="text-3xl font-bold text-red mb-2">{stats.total}</div>
            <p className="text-sm text-muted">Projetos Totais</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue mb-2">{stats.open}</div>
            <p className="text-sm text-muted">Abertos</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-yellow-500 mb-2">{stats.active}</div>
            <p className="text-sm text-muted">Em Andamento</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">{stats.completed}</div>
            <p className="text-sm text-muted">Concluídos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-8 overflow-x-auto">
          {(['all', 'open', 'in_progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-sm whitespace-nowrap ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
            >
              {status === 'all' ? 'Todos' : status === 'open' ? 'Abertos' : status === 'in_progress' ? 'Em Andamento' : 'Concluídos'}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted"><p>Carregando projetos...</p></div>
        ) : projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>Nenhum projeto encontrado. Seja o primeiro a criar um!</p>
          </div>
        )}
      </div>

      {/* Modal Criar Projeto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Projeto</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue"
                  placeholder="Nome do projeto"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue resize-none"
                  placeholder="Descreva o projeto..."
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Estilo *</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, style: s })}
                      className={`px-3 py-1 rounded text-sm transition ${form.style === s ? 'bg-red text-white' : 'bg-dark border border-border text-muted hover:border-red'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">BPM *</label>
                  <input
                    type="number"
                    value={form.bpm}
                    onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue"
                    placeholder="120"
                    min="40" max="300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Tonalidade</label>
                  <select
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    className="w-full px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue"
                  >
                    {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Instrumentos necessários</label>
                {form.instruments.map((inst, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={inst}
                      onChange={(e) => {
                        const updated = [...form.instruments]
                        updated[idx] = e.target.value
                        setForm({ ...form, instruments: updated })
                      }}
                      className="flex-1 px-4 py-2 bg-dark border border-border rounded text-white outline-none focus:border-blue"
                      placeholder="Ex: Guitarra, Baixo..."
                    />
                    {idx > 0 && (
                      <button onClick={() => setForm({ ...form, instruments: form.instruments.filter((_, i) => i !== idx) })} className="text-red px-2">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, instruments: [...form.instruments, ''] })} className="text-sm text-blue hover:underline">
                  + Adicionar instrumento
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded p-3">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreateProject} disabled={saving || !form.title || !form.style || !form.bpm} className="btn btn-primary flex-1">
                {saving ? 'Criando...' : 'Criar Projeto'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
