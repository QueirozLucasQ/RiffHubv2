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
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [deletingRiffId, setDeletingRiffId] = useState<string | null>(null)

  // Follow
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  // Followers/following modal
  const [followModal, setFollowModal] = useState<null | 'followers' | 'following'>(null)
  const [followList, setFollowList] = useState<any[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set())
  const [modalFollowLoading, setModalFollowLoading] = useState<Set<string>>(new Set())

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

        let myId: string | null = null
        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
          myId = myProfile?.id || null
          setMyProfileId(myId)
          setIsOwner(myId === params.id)

          // Load my following IDs for modal buttons
          if (myId) {
            const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', myId)
            setMyFollowingIds(new Set((myFollows || []).map((f: any) => f.following_id)))
          }
        }

        const [{ data: riffsData }, { data: projectsData }, { data: gigsData }, followersRes, followingRes] = await Promise.all([
          supabase.from('riffs').select('*, riff_likes(id)').eq('user_id', profileData.id).order('created_at', { ascending: false }),
          supabase.from('projects').select('*, tracks:project_tracks(*)').eq('owner_id', profileData.id).order('created_at', { ascending: false }),
          supabase.from('gigs').select('*').eq('poster_id', profileData.id).order('created_at', { ascending: false }),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', params.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', params.id),
        ])

        setRiffs(riffsData || [])
        setProjects(projectsData || [])
        setGigs(gigsData || [])
        setFollowersCount(followersRes.count || 0)
        setFollowingCount(followingRes.count || 0)

        if (myId && myId !== params.id) {
          const { data: followData } = await supabase
            .from('follows').select('id')
            .eq('follower_id', myId).eq('following_id', params.id).maybeSingle()
          setIsFollowing(!!followData)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [params.id])

  const openFollowModal = async (type: 'followers' | 'following') => {
    setFollowModal(type)
    setFollowListLoading(true)
    setFollowList([])
    try {
      if (type === 'followers') {
        // People who follow this profile
        const { data } = await supabase
          .from('follows')
          .select('follower:profiles!follows_follower_id_fkey(*)')
          .eq('following_id', params.id)
        setFollowList((data || []).map((d: any) => d.follower).filter(Boolean))
      } else {
        // People this profile follows
        const { data } = await supabase
          .from('follows')
          .select('following:profiles!follows_following_id_fkey(*)')
          .eq('follower_id', params.id)
        setFollowList((data || []).map((d: any) => d.following).filter(Boolean))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFollowListLoading(false)
    }
  }

  const handleModalFollow = async (targetId: string) => {
    if (!myProfileId || modalFollowLoading.has(targetId)) return
    setModalFollowLoading(prev => new Set(prev).add(targetId))
    try {
      const isCurrentlyFollowing = myFollowingIds.has(targetId)
      if (isCurrentlyFollowing) {
        await supabase.from('follows').delete().eq('follower_id', myProfileId).eq('following_id', targetId)
        setMyFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s })
        // If we're viewing our own following list, remove from list
        if (followModal === 'following' && isOwner) {
          setFollowList(prev => prev.filter(p => p.id !== targetId))
          setFollowingCount(prev => Math.max(0, prev - 1))
        }
      } else {
        await supabase.from('follows').insert({ follower_id: myProfileId, following_id: targetId })
        setMyFollowingIds(prev => new Set(prev).add(targetId))
        await supabase.from('notifications').insert({
          user_id: targetId,
          type: 'new_follower',
          title: 'Novo seguidor',
          body: 'Alguém começou a te seguir',
          link: `/profile/${myProfileId}`,
          read: false,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setModalFollowLoading(prev => { const s = new Set(prev); s.delete(targetId); return s })
    }
  }

  const handleDeleteRiff = async (riffId: string) => {
    setDeletingRiffId(riffId)
    try {
      await supabase.from('riff_likes').delete().eq('riff_id', riffId)
      await supabase.from('riffs').delete().eq('id', riffId)
      setRiffs(prev => prev.filter(r => r.id !== riffId))
    } catch (err) { console.error(err) }
    finally { setDeletingRiffId(null) }
  }

  const handleFollow = async () => {
    if (!myProfileId || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', myProfileId).eq('following_id', params.id)
        setIsFollowing(false)
        setFollowersCount(prev => Math.max(0, prev - 1))
        setMyFollowingIds(prev => { const s = new Set(prev); s.delete(params.id); return s })
      } else {
        await supabase.from('follows').insert({ follower_id: myProfileId, following_id: params.id })
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
        setMyFollowingIds(prev => new Set(prev).add(params.id))
        await supabase.from('notifications').insert({
          user_id: params.id,
          type: 'new_follower',
          title: `${profile?.name || 'Alguém'} começou a te seguir`,
          body: 'Clique para ver o perfil',
          link: `/profile/${myProfileId}`,
          read: false,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFollowLoading(false)
    }
  }

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
      {/* Cover */}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <LevelBadge points={profile.points} size="lg" />
                  {isOwner ? (
                    <Link href="/profile/edit" className="btn btn-secondary btn-sm">✏️ Editar</Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      {myProfileId && (
                        <button onClick={handleFollow} disabled={followLoading}
                          className="btn btn-sm transition-all"
                          style={{
                            background: isFollowing ? 'transparent' : 'var(--red)',
                            color: isFollowing ? 'var(--subtle)' : 'white',
                            border: isFollowing ? '1px solid var(--border-light)' : '1px solid var(--red)',
                            minWidth: 100,
                          }}>
                          {followLoading
                            ? <span className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /></span>
                            : isFollowing ? '✓ Seguindo' : '+ Seguir'}
                        </button>
                      )}
                      <Link href={`/chat/${profile.id}`} className="btn btn-secondary btn-sm">💬 Mensagem</Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Followers / Following — clickable */}
              <div className="flex items-center gap-4 mb-3">
                <button onClick={() => openFollowModal('followers')}
                  className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity">
                  <span className="font-bold">{followersCount}</span>
                  <span style={{ color: 'var(--muted)' }}>seguidores</span>
                </button>
                <button onClick={() => openFollowModal('following')}
                  className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity">
                  <span className="font-bold">{followingCount}</span>
                  <span style={{ color: 'var(--muted)' }}>seguindo</span>
                </button>
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
              className="card text-center transition-all cursor-pointer"
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
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold leading-tight">{riff.title}</h3>
                      {isOwner && (
                        <button onClick={() => handleDeleteRiff(riff.id)} disabled={deletingRiffId === riff.id}
                          className="text-xs px-2 py-0.5 rounded transition flex-shrink-0 hover:opacity-80"
                          style={{ color: '#f87171', border: '1px solid rgba(229,57,53,0.3)', background: 'rgba(229,57,53,0.08)' }}>
                          {deletingRiffId === riff.id ? '...' : '🗑'}
                        </button>
                      )}
                    </div>
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
                      <span>{proj.style}</span><span>·</span>
                      <span>{proj.bpm} BPM</span><span>·</span>
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

      {/* Followers / Following Modal */}
      {followModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50 px-4 pb-0 md:pb-4"
          onClick={e => e.target === e.currentTarget && setFollowModal(null)}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '80vh' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--dark)' }}>
                <button onClick={() => openFollowModal('followers')}
                  className="px-3 py-1 rounded-md text-sm font-semibold transition-all"
                  style={{ background: followModal === 'followers' ? 'var(--card)' : 'transparent', color: followModal === 'followers' ? 'var(--white)' : 'var(--muted)' }}>
                  {followersCount} Seguidores
                </button>
                <button onClick={() => openFollowModal('following')}
                  className="px-3 py-1 rounded-md text-sm font-semibold transition-all"
                  style={{ background: followModal === 'following' ? 'var(--card)' : 'transparent', color: followModal === 'following' ? 'var(--white)' : 'var(--muted)' }}>
                  {followingCount} Seguindo
                </button>
              </div>
              <button onClick={() => setFollowModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-dark transition text-lg leading-none">
                ×
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
              {followListLoading ? (
                <div className="space-y-3 py-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl animate-pulse">
                      <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: 'var(--border)' }} />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 rounded" style={{ background: 'var(--border)' }} />
                        <div className="h-2 w-16 rounded" style={{ background: 'var(--border)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">{followModal === 'followers' ? '👥' : '🎵'}</p>
                  <p className="font-semibold mb-1">
                    {followModal === 'followers' ? 'Nenhum seguidor ainda' : 'Não está seguindo ninguém'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {followModal === 'followers' ? 'Compartilhe seu perfil para ganhar seguidores' : 'Explore músicos na página de busca'}
                  </p>
                </div>
              ) : (
                followList.map(person => {
                  const isMe = person.id === myProfileId
                  const amFollowing = myFollowingIds.has(person.id)
                  const pending = modalFollowLoading.has(person.id)
                  return (
                    <div key={person.id} className="flex items-center gap-3 p-2 rounded-xl transition hover:bg-dark group">
                      <Link href={`/profile/${person.id}`} onClick={() => setFollowModal(null)}
                        className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black text-white flex-shrink-0"
                          style={{ backgroundColor: person.avatar_color }}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{person.name}</p>
                          {person.city
                            ? <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>📍 {person.city}</p>
                            : <p className="text-xs" style={{ color: 'var(--muted)' }}>{person.points} pts</p>
                          }
                        </div>
                      </Link>
                      {myProfileId && !isMe && (
                        <button onClick={() => handleModalFollow(person.id)} disabled={pending}
                          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                          style={{
                            background: amFollowing ? 'transparent' : 'rgba(229,57,53,0.15)',
                            color: amFollowing ? 'var(--subtle)' : 'var(--red)',
                            border: `1px solid ${amFollowing ? 'var(--border)' : 'rgba(229,57,53,0.4)'}`,
                            minWidth: 80,
                          }}>
                          {pending
                            ? <span className="flex justify-center"><div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /></span>
                            : amFollowing ? '✓ Seguindo' : '+ Seguir'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
