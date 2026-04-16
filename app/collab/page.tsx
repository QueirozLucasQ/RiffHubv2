'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProjectCard from '@/components/ProjectCard'
import type { Project } from '@/lib/types'

export default function CollabPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all')
  const supabase = createClient()

  useEffect(() => {
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

    fetchProjects()
  }, [statusFilter])

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
          <button className="btn btn-primary">
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
              className={`btn btn-sm whitespace-nowrap ${
                statusFilter === status ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'open' ? 'Abertos' : status === 'in_progress' ? 'Em Andamento' : 'Concluídos'}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted">
            <p>Carregando projetos...</p>
          </div>
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
    </div>
  )
}
