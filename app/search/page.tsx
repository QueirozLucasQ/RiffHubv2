'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import MusicianCard from '@/components/MusicianCard'
import type { Profile } from '@/lib/types'

export default function SearchPage() {
  const [musicians, setMusicians] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchCity, setSearchCity] = useState('')
  const [instrumentFilter, setInstrumentFilter] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const searchMusicians = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('profiles')
          .select('*')
          .order('points', { ascending: false })

        if (searchName) {
          query = query.ilike('name', `%${searchName}%`)
        }

        if (searchCity) {
          query = query.ilike('city', `%${searchCity}%`)
        }

        if (instrumentFilter) {
          query = query.contains('instruments', [instrumentFilter])
        }

        const { data, error } = await query

        if (error) throw error

        setMusicians(data || [])
      } catch (error) {
        console.error('Error searching musicians:', error)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
      searchMusicians()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchName, searchCity, instrumentFilter])

  const instruments = [
    'Guitarra',
    'Baixo',
    'Bateria',
    'Teclado',
    'Violão',
    'Voz',
    'Saxofone',
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-12">Encontre Músicos</h1>

        {/* Search & Filters */}
        <div className="mb-12 space-y-6">
          {/* Name Search */}
          <div>
            <label className="block text-sm font-semibold mb-3">Nome do Músico</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Procure por nome..."
              className="w-full px-4 py-3 bg-card border border-border rounded text-white placeholder-muted outline-none focus:border-blue transition"
            />
          </div>

          {/* City Search */}
          <div>
            <label className="block text-sm font-semibold mb-3">Cidade</label>
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Digite a cidade..."
              className="w-full px-4 py-3 bg-card border border-border rounded text-white placeholder-muted outline-none focus:border-blue transition"
            />
          </div>

          {/* Instrument Quick Filter */}
          <div>
            <label className="block text-sm font-semibold mb-3">Instrumentos</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setInstrumentFilter('')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  instrumentFilter === ''
                    ? 'bg-red text-white'
                    : 'bg-card border border-border hover:border-blue'
                }`}
              >
                Todos
              </button>
              {instruments.map((inst) => (
                <button
                  key={inst}
                  onClick={() => setInstrumentFilter(inst)}
                  className={`px-4 py-2 rounded text-sm font-semibold transition ${
                    instrumentFilter === inst
                      ? 'bg-red text-white'
                      : 'bg-card border border-border hover:border-blue'
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-muted">
            <p>Procurando músicos...</p>
          </div>
        ) : musicians.length > 0 ? (
          <div>
            <p className="text-muted mb-6">
              {musicians.length} músico{musicians.length !== 1 ? 's' : ''} encontrado{musicians.length !== 1 ? 's' : ''}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {musicians.map((musician) => (
                <MusicianCard key={musician.id} musician={musician} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>Nenhum músico encontrado. Tente ajustar sua busca.</p>
          </div>
        )}
      </div>
    </div>
  )
}
