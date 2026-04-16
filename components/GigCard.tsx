'use client'

import { useState } from 'react'
import Link from 'next/link'
import LevelBadge from './LevelBadge'
import type { Gig } from '@/lib/types'

interface GigCardProps {
  gig: Gig & { poster?: any }
}

const typeLabels: Record<string, string> = {
  show: 'Show',
  gravação: 'Gravação',
  turnê: 'Turnê',
  sessão: 'Sessão',
}

const typeColors: Record<string, string> = {
  show: '#E53935',
  gravação: '#1E88E5',
  turnê: '#7B1FA2',
  sessão: '#43A047',
}

export default function GigCard({ gig }: GigCardProps) {
  const [applying, setApplying] = useState(false)

  const handleApply = async (e: React.MouseEvent) => {
    e.preventDefault()
    setApplying(true)
    // Application logic would be implemented here
    setTimeout(() => setApplying(false), 1000)
  }

  return (
    <div className="card hover:border-red transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1">{gig.title}</h3>
          {gig.poster && (
            <Link href={`/profile/${gig.poster.id}`} className="text-sm text-muted hover:text-red transition">
              {gig.poster.name}
            </Link>
          )}
        </div>
        <div
          className="badge text-xs"
          style={{
            backgroundColor: `${typeColors[gig.type]}20`,
            color: typeColors[gig.type],
            borderColor: typeColors[gig.type],
            border: '1px solid',
          }}
        >
          {typeLabels[gig.type]}
        </div>
      </div>

      {/* Details Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="badge badge-blue text-xs">{gig.instrument}</span>
        <span className="badge badge-blue text-xs">
          {gig.remote ? '🌐 Remoto' : '📍 ' + gig.city}
        </span>
      </div>

      {/* Description */}
      {gig.description && (
        <p className="text-sm text-muted mb-4 line-clamp-2">
          {gig.description}
        </p>
      )}

      {/* Meta Information */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-4 border-b border-border">
        <div>
          <span className="text-muted">Data</span>
          <p className="text-white">{gig.dates}</p>
        </div>
        <div>
          <span className="text-muted">Valor</span>
          <p className="text-red font-semibold">{gig.pay}</p>
        </div>
      </div>

      {/* Status & Apply */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded-sm ${
            gig.status === 'open'
              ? 'bg-green-900 text-green-200'
              : 'bg-red-900 text-red-200'
          }`}
        >
          {gig.status === 'open' ? 'Aberto' : 'Preenchido'}
        </span>
        <button
          onClick={handleApply}
          disabled={gig.status === 'filled' || applying}
          className="btn btn-sm btn-primary flex-1"
        >
          {applying ? 'Candidatando...' : 'Candidatar'}
        </button>
      </div>
    </div>
  )
}
