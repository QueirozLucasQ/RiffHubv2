'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AudioPlayer from '@/components/AudioPlayer'
import LevelBadge from '@/components/LevelBadge'
import { getLevelProgress } from '@/lib/levels'
import type { Profile, Riff } from '@/lib/types'

interface ProfilePageProps {
  params: { id: string }
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [riffs, setRiffs] = useState<Riff[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true)

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', params.id)
          .single()

        if (profileData) {
          setProfile(profileData)

          // Fetch user's riffs
          const { data: riffsData } = await supabase
            .from('riffs')
            .select('*, user:profiles(*), riff_likes(id)')
            .eq('user_id', profileData.id)
            .order('created_at', { ascending: false })

          if (riffsData) {
            setRiffs(riffsData)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted">Carregando perfil...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted">Perfil não encontrado</p>
      </div>
    )
  }

  const levelProgress = getLevelProgress(profile.points)

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Avatar & Basic Info */}
          <div className="md:col-span-1 flex flex-col items-center text-center">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-white mb-6"
              style={{ backgroundColor: profile.avatar_color }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
            <p className="text-lg text-muted mb-4">{profile.city}</p>
            <LevelBadge points={profile.points} size="lg" />
          </div>

          {/* Level Progress & Stats */}
          <div className="md:col-span-2">
            {/* Level Progress Bar */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">{levelProgress.current.name}</span>
                {levelProgress.next && (
                  <span className="text-sm text-muted">
                    {levelProgress.pointsToNext} para {levelProgress.next.name}
                  </span>
                )}
              </div>
              <div className="h-3 bg-border rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-blue to-red transition-all"
                  style={{ width: `${levelProgress.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>{profile.points} pontos</span>
                <span>{levelProgress.progress}%</span>
              </div>
            </div>

            {/* Bio & Details */}
            {profile.bio && (
              <div className="card mb-6">
                <h3 className="font-bold mb-2">Bio</h3>
                <p className="text-muted">{profile.bio}</p>
              </div>
            )}

            {/* Instruments & Genres */}
            {(profile.instruments.length > 0 || profile.genres.length > 0) && (
              <div className="card">
                {profile.instruments.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">Instrumentos</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.instruments.map((inst) => (
                        <span key={inst} className="badge badge-blue text-xs">
                          {inst}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.genres.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Gêneros</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.genres.map((genre) => (
                        <span key={genre} className="badge badge-blue text-xs">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Experience & Availability */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {profile.experience && (
            <div className="card">
              <h3 className="font-bold mb-3">Experiência</h3>
              <p className="text-muted capitalize">{profile.experience}</p>
            </div>
          )}

          {profile.availability.length > 0 && (
            <div className="card">
              <h3 className="font-bold mb-3">Disponibilidade</h3>
              <div className="flex gap-2 flex-wrap">
                {profile.availability.map((day) => (
                  <span key={day} className="badge badge-blue text-xs">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Riffs Section */}
        <div>
          <h2 className="text-2xl font-bold mb-8">
            Riffs Compartilhados ({riffs.length})
          </h2>

          {riffs.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {riffs.map((riff) => (
                <div key={riff.id} className="card">
                  <h3 className="text-lg font-bold mb-2">{riff.title}</h3>
                  {riff.description && (
                    <p className="text-sm text-muted mb-4 line-clamp-2">
                      {riff.description}
                    </p>
                  )}

                  <div className="mb-4">
                    <AudioPlayer src={riff.audio_url} />
                  </div>

                  {riff.tags && riff.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {riff.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge badge-blue text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-4 border-t border-border text-sm text-muted">
                    <span>▶ {riff.plays}</span>
                    <span>♥ {riff.riff_likes?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <p>Nenhum riff compartilhado ainda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
