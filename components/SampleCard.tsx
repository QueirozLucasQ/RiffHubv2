'use client'

import { useState } from 'react'
import AudioPlayer from './AudioPlayer'
import LevelBadge from './LevelBadge'
import type { Sample } from '@/lib/types'

interface SampleCardProps {
  sample: Sample & { creator?: any }
}

const licenseLabels: Record<string, string> = {
  free: 'Grátis',
  credit: 'Créditos',
  'non-commercial': 'Não Comercial',
}

const licenseColors: Record<string, string> = {
  free: '#43A047',
  credit: '#F57C00',
  'non-commercial': '#E53935',
}

export default function SampleCard({ sample }: SampleCardProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    setDownloading(true)
    // Download logic would be implemented here with Supabase
    setTimeout(() => setDownloading(false), 1000)
  }

  return (
    <div className="card">
      {/* Creator Info */}
      {sample.creator && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: sample.creator.avatar_color }}
            >
              {sample.creator.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{sample.creator.name}</p>
            </div>
          </div>
          <LevelBadge points={sample.creator.points} size="sm" />
        </div>
      )}

      {/* Category */}
      <span className="badge badge-blue text-xs mb-3">{sample.category}</span>

      {/* Title */}
      <h3 className="text-lg font-bold mb-2">{sample.title}</h3>

      {/* Audio Player */}
      <div className="mb-4">
        <AudioPlayer src={sample.audio_url} />
      </div>

      {/* Details */}
      <div className="flex gap-4 text-xs text-subtle mb-4 pb-4 border-b border-border">
        <span>⏱ {sample.bpm} BPM</span>
        <span>🎼 {sample.key}</span>
        <span>⬇ {sample.downloads}</span>
      </div>

      {/* License & Tags */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div
          className="badge text-xs"
          style={{
            backgroundColor: `${licenseColors[sample.license]}20`,
            color: licenseColors[sample.license],
            borderColor: licenseColors[sample.license],
            border: '1px solid',
          }}
        >
          {licenseLabels[sample.license]}
        </div>
        {sample.tags && sample.tags.length > 0 && (
          <div className="flex gap-1">
            {sample.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs text-muted">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full btn btn-secondary btn-sm"
      >
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
    </div>
  )
}
