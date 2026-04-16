'use client'

import Link from 'next/link'
import LevelBadge from './LevelBadge'
import type { Profile } from '@/lib/types'

interface MusicianCardProps {
  musician: Profile & { riffs_count?: number }
}

export default function MusicianCard({ musician }: MusicianCardProps) {
  return (
    <Link href={`/profile/${musician.id}`}>
      <div className="card hover:border-red transition-colors h-full cursor-pointer">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: musician.avatar_color }}
          >
            {musician.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Name & Location */}
        <h3 className="text-lg font-bold text-center mb-1">{musician.name}</h3>
        <p className="text-sm text-muted text-center mb-3">{musician.city}</p>

        {/* Level Badge */}
        <div className="flex justify-center mb-4">
          <LevelBadge points={musician.points} size="sm" />
        </div>

        {/* Bio */}
        {musician.bio && (
          <p className="text-sm text-subtle text-center mb-4 line-clamp-2">
            {musician.bio}
          </p>
        )}

        {/* Instruments */}
        {musician.instruments && musician.instruments.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {musician.instruments.slice(0, 3).map((instrument) => (
              <span key={instrument} className="badge badge-blue text-xs">
                {instrument}
              </span>
            ))}
          </div>
        )}

        {/* Availability Dots */}
        {musician.availability && musician.availability.length > 0 && (
          <div className="flex gap-2 justify-center mb-4 text-lg">
            {musician.availability.map((day) => (
              <span key={day} title={day}>
                ●
              </span>
            ))}
          </div>
        )}

        {/* Riffs Count */}
        <div className="text-center text-xs text-muted border-t border-border pt-3">
          <p>{musician.riffs_count || 0} riffs compartilhados</p>
        </div>
      </div>
    </Link>
  )
}
