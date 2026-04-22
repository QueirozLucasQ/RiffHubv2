'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AudioPlayer from '@/components/AudioPlayer'
import LevelBadge from '@/components/LevelBadge'
import Link from 'next/link'
import { getLevelProgress } from '@/lib/levels'
import type { Profile, Riff } from '@/lib/types'

interface ProfilePageProps {
  params: { id: string }
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [riffs, setRiffs] = useState<Riff[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [gigs, setGigs] = useState<any[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'riffs' | 'projects' | 'gigs'>('riffs')
  const supabase = createClient()

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)

        const [{ data: profileData }, { data: { user } }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', params.id).single(),
          supabase.auth.getUser(),
        ])

        if (!profileData) { setLoading(false); return }
        setProfile(profileData)

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
          setIsOwner(myProfile?.id === params.id)
        }

        const [{ data: riffsData }, { data: projectsData }, { data: gigsData }] = await Promise.all([
          supabase.from('riffs').select('*, riff_likes(id)').eq('user_id', profileData.id).order('created_at', { ascending: false }),
          supabase.from('projects').select('*, tracks:project_tracks(*)').eq('owner_id', profileData.id).order('created_at', { ascending: false }),
          supabase.from('gigs').select('*').eq('poster_id', profileData.id).order('created_at', { ascending: false }),
        ])

        setRiffs(riffsData || [])
        setProjects(projectsData || [])
        setGigs(gigsData || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [params.id])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted">Carregando perfil...</p>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted">Perfil não encontrado</p>
    </div>
  )

  const levelProgress = getLevelProgress(profile.points)
  const statusColors: any = { open: '#4ADE80', in_progress: '#FDE047', completed: '#9CA3AF' }
  const statusLabels: any = { open: 'Aberto', in_progress: 'Em andamento', completed: 'Concluído' }

  return (
    <div className="min-h-screen bg-black">
      {/* Cover / Header */}
      <div className="h-32 md:h-48" style={{ background: `linear-gradient(135deg, ${profile.avatar_color}22 0%, transparent 100%)` }} />

      <div className="max-w-5xl mx-auto px-4 pb-16">
        {/* Profile Card */}
        <div className="card -mt-8 mb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white flex-shrink-0 border-4 border-black"
              style={{ backgroundColor: profile.avatar_color }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{profile.name}</h1>
                  {profile.city && <p className="text-muted text-sm">📍 {profile.city}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <LevelBadge points={profile.points} size="lg" />
                  {isOwner && (
                    <Link href="/profile/edit" className="btn btn-secondary btn-sm">✏️ Editar</Link>
                  )}
                </div>
              </div>

              {/* Level bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>{profile.points} pts</span>
                  {levelProgress.next && <span>{levelProgress.pointsToNext} para {levelProgress.next.name}</span>}
                </div>
                <div className="level-bar">
                  <div className="level-bar-fill" style={{ width: `${levelProgress.progress}%` }} />
                </div>
              </div>

              {profile.bio && <p className="text-subtle text-sm mb-3">{profile.bio}</p>}

              {/* Social links */}
              {(profile.youtube_url || profile.instagram_url || profile.tiktok_url || profile.kwai_url) && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.youtube_url && (
                    <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                      style={{ background: 'rgba(255,0,0,0.15)', color: '#ff4444', border: '1px solid rgba(255,0,0,0.3)' }}>
                      📺 YouTube
                    </a>
                  )}
                  {profile.instagram_url && (
                    <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                      style={{ background: 'rgba(225,48,108,0.15)', color: '#E1306C', border: '1px solid rgba(225,48,108,0.3)' }}>
                      📸 Instagram
                    </a>
                  )}
                  {profile.tiktok_url && (
                    <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                      style={{ background: 'rgba(105,201,208,0.15)', color: '#69C9D0', border: '1px solid rgba(105,201,208,0.3)' }}>
                      🎵 TikTok
                    </a>
                  )}
                  {profile.kwai_url && (
                    <a href={profile.kwai_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                      style={{ background: 'rgba(255,165,0,0.15)', color: '#FFA500', border: '1px solid rgba(255,165,0,0.3)' }}>
                      🎬 Kwai
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instruments & Genres */}
          {(profile.instruments?.length > 0 || profile.genres?.length > 0) && (
            <div className="mt-5 pt-5 border-t flex flex-wrap gap-4" style={{ borderColor: 'var(--border)' }}>
              {profile.instruments?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-2 font-medium">INSTRUMENTOS</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.instruments.map(i => <span key={i} className="badge badge-red text-xs">{i}</span>)}
                  </div>
                </div>
              )}
              {profile.genres?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-2 font-medium">GÊNEROS</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.genres.map(g => <span key={g} className="badge badge-blue text-xs">{g}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Riffs', count: riffs.length, tab: 'riffs' as const },
            { label: 'Projetos', count: projects.length, tab: 'projects' as const },
            { label: 'Gigs', count: gigs.length, tab: 'gigs' as const },
          ].map(s => (
            <button key={s.tab} onClick={() => setActiveTab(s.tab)}
              className={`card text-center transition-all cursor-pointer ${activeTab === s.tab ? 'border-red' : 'hover:border-border-light'}`}
              style={{ borderColor: activeTab === s.tab ? 'var(--red)' : undefined }}>
              <div className="text-2xl font-black mb-1" style={{ color: activeTab === s.tab ? 'var(--red)' : 'var(--white)' }}>{s.count}</div>
              <p className="text-sm text-muted">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'riffs' && (
          <div>
            {riffs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-5">
                {riffs.map(riff => (
                  <div key={riff.id} className="card">
                    <h3 className="font-bold mb-1">{riff.title}</h3>
                    {riff.description && <p className="text-sm text-muted mb-3 line-clamp-2">{riff.description}</p>}
                    <div className="mb-3"><AudioPlayer src={riff.audio_url} /></div>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>▶ {riff.plays || 0}</span>
                      <span>♥ {riff.riff_likes?.length || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">🎸</div><p>Nenhum riff compartilhado ainda</p></div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            {projects.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-5">
                {projects.map(proj => (
                  <Link key={proj.id} href={`/collab/${proj.id}`} className="card card-hover block">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold">{proj.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${statusColors[proj.status]}20`, color: statusColors[proj.status] }}>
                        {statusLabels[proj.status]}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted mb-3">
                      <span>{proj.style}</span>
                      <span>·</span>
                      <span>{proj.bpm} BPM</span>
                      <span>·</span>
                      <span>Tom {proj.key}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {proj.tracks?.filter((t: any) => t.filled).length || 0}/{proj.tracks?.length || 0} instrumentos
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">🎵</div><p>Nenhum projeto criado ainda</p></div>
            )}
          </div>
        )}

        {activeTab === 'gigs' && (
          <div>
            {gigs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-5">
                {gigs.map(gig => (
                  <div key={gig.id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold">{gig.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gig.status === 'open' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                        {gig.status === 'open' ? 'Aberto' : 'Preenchido'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted mb-2">
                      <span>🎸 {gig.instrument}</span>
                      <span>📍 {gig.city}</span>
                      <span>💰 {gig.pay}</span>
                    </div>
                    <p className="text-sm text-muted">{gig.dates}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">💼</div><p>Nenhuma gig postada ainda</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
