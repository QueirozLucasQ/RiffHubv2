'use client'

import { useState } from 'react'
import Link from 'next/link'
import AudioPlayer from './AudioPlayer'
import LevelBadge from './LevelBadge'
import { createClient } from '@/lib/supabase/client'
import type { Sample } from '@/lib/types'

interface SampleCardProps {
  sample: Sample & { creator?: any }
}

const licenseLabels: Record<string, string> = {
  free: 'Grátis', credit: 'Com Créditos', 'non-commercial': 'Não Comercial',
}
const licenseColors: Record<string, string> = {
  free: '#43A047', credit: '#F57C00', 'non-commercial': '#E53935',
}

export default function SampleCard({ sample }: SampleCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const supabase = createClient()

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Increment downloads count
      await supabase.from('samples').update({ downloads: (sample.downloads || 0) + 1 }).eq('id', sample.id)

      // Trigger browser download
      const response = await fetch(sample.audio_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sample.title}.${sample.audio_url.split('.').pop()?.split('?')[0] || 'mp3'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloaded(true)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="card card-hover">
      {/* Creator */}
      {sample.creator && (
        <Link href={`/profile/${sample.creator.id}`} className="flex items-center justify-between mb-4 group">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: sample.creator.avatar_color }}>
              {sample.creator.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-semibold group-hover:text-red transition">{sample.creator.name}</p>
          </div>
          <LevelBadge points={sample.creator.points} size="sm" />
        </Link>
      )}

      {/* Category & Title */}
      <span className="badge badge-blue text-xs mb-2">{sample.category}</span>
      <h3 className="text-lg font-bold mb-3">{sample.title}</h3>

      {/* Player */}
      <div className="mb-4"><AudioPlayer src={sample.audio_url} title={sample.title} /></div>

      {/* Meta */}
      <div className="flex gap-4 text-xs text-muted mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <span>⏱ {sample.bpm} BPM</span>
        <span>🎼 {sample.key}</span>
        <span>⬇ {sample.downloads + (downloaded ? 1 : 0)}</span>
      </div>

      {/* License & Tags */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="badge text-xs" style={{
          backgroundColor: `${licenseColors[sample.license]}18`,
          color: licenseColors[sample.license],
          border: `1px solid ${licenseColors[sample.license]}40`,
        }}>
          {licenseLabels[sample.license]}
        </div>
        {sample.tags?.length > 0 && (
          <div className="flex gap-1">
            {sample.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-xs text-muted">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Download */}
      <button onClick={handleDownload} disabled={downloading}
        className={`w-full btn btn-sm ${downloaded ? 'btn-secondary' : 'btn-ghost'}`}>
        {downloading ? 'Baixando...' : downloaded ? '✓ Baixado' : '⬇ Baixar'}
      </button>
    </div>
  )
}
