'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SampleCard from '@/components/SampleCard'
import LevelBadge from '@/components/LevelBadge'
import type { Sample, Profile } from '@/lib/types'

export default function RiffStorePage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [topCreators, setTopCreators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [licenseFilter, setLicenseFilter] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('samples')
          .select('*, creator:profiles(*)')
          .order('created_at', { ascending: false })

        if (categoryFilter) {
          query = query.eq('category', categoryFilter)
        }

        if (licenseFilter) {
          query = query.eq('license', licenseFilter)
        }

        const { data, error } = await query

        if (error) throw error

        setSamples(data || [])
      } catch (error) {
        console.error('Error fetching samples:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSamples()
  }, [categoryFilter, licenseFilter])

  useEffect(() => {
    const fetchTopCreators = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('points', { ascending: false })
          .limit(5)

        if (error) throw error

        setTopCreators(data || [])
      } catch (error) {
        console.error('Error fetching top creators:', error)
      }
    }

    fetchTopCreators()
  }, [])

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
          <button className="btn btn-primary">
            Subir Sample
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Category Filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Categorias</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setCategoryFilter('')}
                    className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                      categoryFilter === ''
                        ? 'bg-red text-white'
                        : 'hover:bg-card'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                        categoryFilter === cat
                          ? 'bg-red text-white'
                          : 'hover:bg-card'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* License Filter */}
              <div className="card">
                <h3 className="font-bold mb-4">Licença</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setLicenseFilter('')}
                    className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                      licenseFilter === ''
                        ? 'bg-red text-white'
                        : 'hover:bg-card'
                    }`}
                  >
                    Todas
                  </button>
                  {licenses.map((lic) => (
                    <button
                      key={lic.value}
                      onClick={() => setLicenseFilter(lic.value)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition ${
                        licenseFilter === lic.value
                          ? 'bg-red text-white'
                          : 'hover:bg-card'
                      }`}
                    >
                      {lic.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Creators */}
              <div className="card">
                <h3 className="font-bold mb-4">Top Criadores</h3>
                <div className="space-y-3">
                  {topCreators.map((creator) => (
                    <div key={creator.id} className="flex items-center gap-2 p-2 hover:bg-dark rounded transition">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: creator.avatar_color }}
                      >
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

              {/* Level Guide */}
              <div className="card">
                <h3 className="font-bold mb-4">Níveis</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <span>🎸</span>
                    <span>Novato (0+)</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>🎹</span>
                    <span>Sideman (100+)</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>🎤</span>
                    <span>Session (500+)</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>⭐</span>
                    <span>Referência (1500+)</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>👑</span>
                    <span>Lenda (5000+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Samples Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12 text-muted">
                <p>Carregando samples...</p>
              </div>
            ) : samples.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {samples.map((sample) => (
                  <SampleCard key={sample.id} sample={sample} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <p>Nenhum sample encontrado. Tente ajustar os filtros.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
