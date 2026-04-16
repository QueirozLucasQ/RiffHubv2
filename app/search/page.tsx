'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LevelBadge from '@/components/LevelBadge'
import type { Profile } from '@/lib/types'

const INSTRUMENTS = ['Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Violão', 'Voz', 'Saxofone']

export default function SearchPage() {
  const [musicians, setMusicians] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [searchCity, setSearchCity] = useState('')
  const [instrumentFilter, setInstrumentFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const timer = setTimeout(() => searchMusicians(), 300)
    return () => clearTimeout(timer)
  }, [searchName, searchCity, instrumentFilter])

  const searchMusicians = async () => {
    try {
      setLoading(true)
      let query = supabase.from('profiles').select('*').order('points', { ascending: false })
      if (searchName) query = query.ilike('name', `%${searchName}%`)
      if (searchCity) query = query.ilike('city', `%${searchCity}%`)
      if (instrumentFilter) query = query.contains('instruments', [instrumentFilter])
      const { data, error } = await query
      if (error) throw error
      setMusicians(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-2">Encontrar Músicos</h1>
        <p className="text-muted mb-8">Conecte-se com músicos do Brasil inteiro</p>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted font-medium mb-2">NOME</label>
              <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)}
                placeholder="Buscar por nome..." className="input" />
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-2">CIDADE</label>
              <input type="text" value={searchCity} onChange={e => setSearchCity(e.target.value)}
                placeholder="São Paulo, Rio..." className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted font-medium mb-2">INSTRUMENTO</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setInstrumentFilter('')}
                className={`chip ${instrumentFilter === '' ? 'chip-active-red' : ''}`}>Todos</button>
              {INSTRUMENTS.map(inst => (
                <button key={inst} onClick={() => setInstrumentFilter(inst)}
                  className={`chip ${instrumentFilter === inst ? 'chip-active-red' : ''}`}>{inst}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="empty-state"><div className="animate-pulse text-muted">Procurando músicos...</div></div>
        ) : musicians.length > 0 ? (
          <>
            <p className="text-sm text-muted mb-5">
              {musicians.length} músico{musicians.length !== 1 ? 's' : ''} encontrado{musicians.length !== 1 ? 's' : ''}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {musicians.map(musician => (
                <Link key={musician.id} href={`/profile/${musician.id}`} className="card card-hover block">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                      style={{ backgroundColor: musician.avatar_color }}>
                      {musician.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{musician.name}</p>
                      {musician.city && <p className="text-sm text-muted">📍 {musician.city}</p>}
                    </div>
                    <LevelBadge points={musician.points} size="sm" />
                  </div>

                  {musician.bio && (
                    <p className="text-sm text-muted mb-3 line-clamp-2">{musician.bio}</p>
                  )}

                  {musician.instruments?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {musician.instruments.slice(0, 3).map((inst: string) => (
                        <span key={inst} className="badge badge-blue text-xs">{inst}</span>
                      ))}
                      {musician.instruments.length > 3 && (
                        <span className="text-xs text-muted">+{musician.instruments.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted"
                    style={{ borderColor: 'var(--border)' }}>
                    <span>{musician.points} pts</span>
                    <span className="text-blue">Ver perfil →</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p className="text-lg font-semibold mb-1">Nenhum músico encontrado</p>
            <p className="text-sm">Tente ajustar os filtros de busca</p>
          </div>
        )}
      </div>
    </div>
  )
}
