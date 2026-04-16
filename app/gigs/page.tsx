'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import GigCard from '@/components/GigCard'
import type { Gig } from '@/lib/types'

export default function GigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [instrumentFilter, setInstrumentFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<'all' | 'remote' | 'onsite'>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('gigs')
          .select('*, poster:profiles(*)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })

        if (instrumentFilter) {
          query = query.eq('instrument', instrumentFilter)
        }

        if (typeFilter) {
          query = query.eq('type', typeFilter)
        }

        if (locationFilter === 'remote') {
          query = query.eq('remote', true)
        } else if (locationFilter === 'onsite') {
          query = query.eq('remote', false)
        }

        const { data, error } = await query

        if (error) throw error

        setGigs(data || [])
      } catch (error) {
        console.error('Error fetching gigs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGigs()
  }, [instrumentFilter, typeFilter, locationFilter])

  const instruments = [
    'Guitarra',
    'Baixo',
    'Bateria',
    'Teclado',
    'Violão',
    'Voz',
    'Saxofone',
  ]
  const types = [
    { value: 'show', label: 'Show' },
    { value: 'gravação', label: 'Gravação' },
    { value: 'turnê', label: 'Turnê' },
    { value: 'sessão', label: 'Sessão' },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold">Oportunidades de Trabalho</h1>
          <button className="btn btn-primary">
            Postar Gig
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Instrument Filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Instrumentos</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setInstrumentFilter('')}
                    className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                      instrumentFilter === ''
                        ? 'bg-red text-white'
                        : 'hover:bg-card'
                    }`}
                  >
                    Todos
                  </button>
                  {instruments.map((inst) => (
                    <button
                      key={inst}
                      onClick={() => setInstrumentFilter(inst)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                        instrumentFilter === inst
                          ? 'bg-red text-white'
                          : 'hover:bg-card'
                      }`}
                    >
                      {inst}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Tipo</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setTypeFilter('')}
                    className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                      typeFilter === ''
                        ? 'bg-red text-white'
                        : 'hover:bg-card'
                    }`}
                  >
                    Todos
                  </button>
                  {types.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTypeFilter(t.value)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                        typeFilter === t.value
                          ? 'bg-red text-white'
                          : 'hover:bg-card'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Local</h3>
                <div className="space-y-2">
                  {(['all', 'remote', 'onsite'] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocationFilter(loc)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                        locationFilter === loc
                          ? 'bg-red text-white'
                          : 'hover:bg-card'
                      }`}
                    >
                      {loc === 'all' ? 'Todos' : loc === 'remote' ? '🌐 Remoto' : '📍 Presencial'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gigs Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12 text-muted">
                <p>Carregando gigs...</p>
              </div>
            ) : gigs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {gigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <p>Nenhuma gig encontrada. Tente ajustar os filtros.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
