'use client'

import { useState } from 'react'
import Link from 'next/link'
import LevelBadge from './LevelBadge'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import type { Gig } from '@/lib/types'

interface GigCardProps {
  gig: Gig & { poster?: any }
  isApplied?: boolean
  onApplied?: () => void
}

const typeLabels: Record<string, string> = {
  show: 'Show', gravação: 'Gravação', turnê: 'Turnê', sessão: 'Sessão',
}
const typeColors: Record<string, string> = {
  show: '#E53935', gravação: '#1E88E5', turnê: '#7B1FA2', sessão: '#43A047',
}

export default function GigCard({ gig, isApplied = false, onApplied }: GigCardProps) {
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(isApplied)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleApply = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (applied) return
    setApplying(true)
    setError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setError('Faça login primeiro'); setApplying(false); return }

      const { error: err } = await supabase.from('gig_applications').insert({
        gig_id: gig.id,
        musician_id: profile.id,
        status: 'pending',
      })

      if (err) {
        if (err.code === '23505') {
          setApplied(true)
          onApplied?.()
        } else {
          throw err
        }
      } else {
        setApplied(true)
        onApplied?.()
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao candidatar')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="card card-hover" style={{ transition: 'all 0.2s ease' }}>
      {/* Applied badge */}
      {applied && (
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-3 px-2 py-1 rounded-full w-fit"
          style={{ background: 'rgba(30,136,229,0.15)', color: 'var(--blue)', border: '1px solid rgba(30,136,229,0.3)' }}>
          ✓ Candidatura enviada
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-lg font-bold mb-1 leading-tight">{gig.title}</h3>
          {gig.poster && (
            <Link href={`/profile/${gig.poster.id}`} className="text-sm text-muted hover:text-red transition flex items-center gap-1">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: gig.poster.avatar_color }}>
                {gig.poster.name.charAt(0).toUpperCase()}
              </div>
              {gig.poster.name}
            </Link>
          )}
        </div>
        <div className="badge text-xs flex-shrink-0" style={{
          backgroundColor: `${typeColors[gig.type]}18`,
          color: typeColors[gig.type],
          border: `1px solid ${typeColors[gig.type]}40`,
        }}>
          {typeLabels[gig.type]}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="badge badge-blue text-xs">🎸 {gig.instrument}</span>
        <span className="badge badge-blue text-xs">
          {gig.remote ? '🌐 Remoto' : `📍 ${gig.city}`}
        </span>
      </div>

      {/* Description */}
      {gig.description && (
        <p className="text-sm text-muted mb-3 line-clamp-2">{gig.description}</p>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-muted mb-0.5">Data</p>
          <p className="text-white font-medium">{gig.dates}</p>
        </div>
        <div>
          <p className="text-muted mb-0.5">Cachê</p>
          <p className="font-bold" style={{ color: 'var(--red)' }}>{gig.pay}</p>
        </div>
      </div>

      {/* Status & Apply */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${gig.status === 'open' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
          {gig.status === 'open' ? '● Aberto' : '● Preenchido'}
        </span>
        <div className="flex-1">
          {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
          <button
            onClick={handleApply}
            disabled={gig.status === 'filled' || applying || applied}
            className={`w-full btn btn-sm ${applied ? 'btn-secondary' : 'btn-primary'}`}
          >
            {applied ? '✓ Candidatado' : applying ? 'Enviando...' : 'Candidatar'}
          </button>
        </div>
      </div>
    </div>
  )
}
