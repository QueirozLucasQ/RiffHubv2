'use client'

import { useState } from 'react'
import Link from 'next/link'
import AudioPlayer from './AudioPlayer'
import LevelBadge from './LevelBadge'
import type { Riff } from '@/lib/types'

interface RiffCardProps {
  riff: Riff & { user?: any; riff_likes?: any[] }
}

export default function RiffCard({ riff }: RiffCardProps) {
  const [liked, setLiked] = useState(
    riff.riff_likes && riff.riff_likes.length > 0
  )
  const [likes, setLikes] = useState(riff.riff_likes?.length || 0)

  const handleLike = async () => {
    // Like/unlike logic would be implemented here with Supabase
    setLiked(!liked)
    setLikes(liked ? likes - 1 : likes + 1)
  }

  return (
    <div className="card hover:border-blue transition-colors">
      {/* User Info */}
      {riff.user && (
        <Link href={`/profile/${riff.user.id}`} className="flex items-center gap-3 mb-4 group">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: riff.user.avatar_color }}
          >
            {riff.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold group-hover:text-red transition">{riff.user.name}</p>
            <p className="text-xs text-muted">{riff.user.city}</p>
          </div>
        </Link>
      )}

      {/* Riff Info */}
      <h3 className="text-lg font-bold mb-2">{riff.title}</h3>
      {riff.description && (
        <p className="text-sm text-muted mb-4 line-clamp-2">{riff.description}</p>
      )}

      {/* Audio Player */}
      <div className="mb-4">
        <AudioPlayer src={riff.audio_url} title={riff.title} />
      </div>

      {/* Tags */}
      {riff.tags && riff.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {riff.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge badge-blue text-xs">
              {tag}
            </span>
          ))}
          {riff.tags.length > 3 && (
            <span className="text-xs text-muted">+{riff.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>▶ {riff.plays}</span>
          <button
            onClick={handleLike}
            className="flex items-center gap-1 hover:text-red transition"
          >
            <span>{liked ? '♥' : '♡'}</span>
            {likes}
          </button>
        </div>
        <Link href={`/profile/${riff.user?.id}`} className="text-xs text-blue hover:text-blue-dark">
          Ver Perfil →
        </Link>
      </div>
    </div>
  )
}
