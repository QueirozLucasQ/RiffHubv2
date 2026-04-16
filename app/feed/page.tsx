'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import RiffCard from '@/components/RiffCard'
import type { Riff } from '@/lib/types'

export default function FeedPage() {
  const [riffs, setRiffs] = useState<Riff[]>([])
  const [loading, setLoading] = useState(true)
  const [instrumentFilter, setInstrumentFilter] = useState<string>('')
  const [genreFilter, setGenreFilter] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const fetchRiffs = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('riffs')
          .select('*, user:profiles(*), riff_likes(id)')
          .order('created_at', { ascending: false })

        if (instrumentFilter) {
          query = query.filter('tags', 'cs', `["${instrumentFilter}"]`)
        }

        if (genreFilter) {
          query = query.filter('tags', 'cs', `["${genreFilter}"]`)
        }

        const { data, error } = await query

        if (error) throw error

        setRiffs(data || [])
      } catch (error) {
        console.error('Error fetching riffs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRiffs()
  }, [instrumentFilter, genreFilter])

  const instruments = [
    'Guitarra',
    'Baixo',
    'Bateria',
    'Teclado',
    'Violão',
    'Voz',
    'Saxofone',
  ]
  const genres = ['Rock', 'Pop', 'Jazz', 'Funk', 'Samba', 'MPB', 'Eletrônico']

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold">Feed de Riffs</h1>
          <button className="btn btn-primary">
            Compartilhar Riff
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

              {/* Genre Filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Gêneros</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setGenreFilter('')}
                    className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                      genreFilter === ''
                        ? 'bg-red text-white'
                        : 'hover:bg-card'
                    }`}
                  >
                    Todos
                  </button>
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setGenreFilter(genre)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                        genreFilter === genre
                          ? 'bg-red text-white'
                          : 'hover:bg-card'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Riffs Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12 text-muted">
                <p>Carregando riffs...</p>
              </div>
            ) : riffs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {riffs.map((riff) => (
                  <RiffCard key={riff.id} riff={riff} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <p>Nenhum riff encontrado. Tente ajustar os filtros.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
