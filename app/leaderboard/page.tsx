'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LevelBadge from '@/components/LevelBadge'
import { getLevelProgress } from '@/lib/levels'

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']
const medals = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [musicians, setMusicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getMe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
        if (p) setMyProfileId(p.id)
      }
    }
    getMe()
  }, [])

  useEffect(() => { fetchLeaderboard() }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('points', { ascending: false })
        .limit(50)
      setMusicians(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const myRank = musicians.findIndex(m => m.id === myProfileId) + 1

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black mb-2">🏆 Leaderboard</h1>
          <p className="text-muted">Os músicos mais ativos do RiffHub</p>
        </div>

        {/* My rank banner */}
        {myRank > 0 && (
          <div className="mb-6 px-4 py-3 rounded-xl flex items-center justify-between"
            style={{ background: 'rgba(123,63,228,0.12)', border: '1px solid rgba(123,63,228,0.35)' }}>
            <span className="text-sm font-semibold" style={{ color: '#a78bfa' }}>Sua posição atual</span>
            <span className="text-2xl font-black" style={{ color: '#a78bfa' }}>#{myRank}</span>
          </div>
        )}

        {/* Top 3 podium */}
        {!loading && musicians.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {/* 2nd */}
            <div className="flex flex-col items-center flex-1">
              <Link href={`/profile/${musicians[1].id}`} className="flex flex-col items-center hover:opacity-80 transition">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white mb-2 ring-4"
                  style={{ backgroundColor: musicians[1].avatar_color, ringColor: medalColors[1] }}>
                  {musicians[1].name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xl mb-1">🥈</span>
                <p className="text-sm font-bold text-center leading-tight">{musicians[1].name.split(' ')[0]}</p>
                <p className="text-xs text-muted">{musicians[1].points} pts</p>
              </Link>
              <div className="w-full mt-3 rounded-t-lg flex items-center justify-center text-white font-black text-lg"
                style={{ background: 'rgba(192,192,192,0.15)', border: '1px solid rgba(192,192,192,0.25)', height: 60 }}>
                2
              </div>
            </div>

            {/* 1st */}
            <div className="flex flex-col items-center flex-1">
              <Link href={`/profile/${musicians[0].id}`} className="flex flex-col items-center hover:opacity-80 transition">
                <span className="text-3xl mb-1">👑</span>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mb-2 ring-4"
                  style={{ backgroundColor: musicians[0].avatar_color, ringColor: medalColors[0] }}>
                  {musicians[0].name.charAt(0).toUpperCase()}
                </div>
                <span className="text-2xl mb-1">🥇</span>
                <p className="text-sm font-bold text-center leading-tight">{musicians[0].name.split(' ')[0]}</p>
                <p className="text-xs text-muted">{musicians[0].points} pts</p>
              </Link>
              <div className="w-full mt-3 rounded-t-lg flex items-center justify-center text-white font-black text-xl"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', height: 80 }}>
                1
              </div>
            </div>

            {/* 3rd */}
            <div className="flex flex-col items-center flex-1">
              <Link href={`/profile/${musicians[2].id}`} className="flex flex-col items-center hover:opacity-80 transition">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white mb-2 ring-4"
                  style={{ backgroundColor: musicians[2].avatar_color, ringColor: medalColors[2] }}>
                  {musicians[2].name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xl mb-1">🥉</span>
                <p className="text-sm font-bold text-center leading-tight">{musicians[2].name.split(' ')[0]}</p>
                <p className="text-xs text-muted">{musicians[2].points} pts</p>
              </Link>
              <div className="w-full mt-3 rounded-t-lg flex items-center justify-center text-white font-black text-lg"
                style={{ background: 'rgba(205,127,50,0.12)', border: '1px solid rgba(205,127,50,0.25)', height: 45 }}>
                3
              </div>
            </div>
          </div>
        )}

        {/* Full list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card animate-pulse flex items-center gap-4">
                <div className="w-8 h-5 rounded" style={{ background: 'var(--border)' }} />
                <div className="w-10 h-10 rounded-full" style={{ background: 'var(--border)' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
                  <div className="h-2 w-20 rounded" style={{ background: 'var(--border)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {musicians.map((musician, idx) => {
              const isMe = musician.id === myProfileId
              const rank = idx + 1
              const levelProgress = getLevelProgress(musician.points)
              return (
                <Link key={musician.id} href={`/profile/${musician.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl transition-all group"
                  style={{
                    background: isMe ? 'rgba(123,63,228,0.08)' : 'var(--card)',
                    border: `1px solid ${isMe ? 'rgba(123,63,228,0.3)' : 'var(--border)'}`,
                  }}
                  onMouseEnter={e => { if (!isMe) (e.currentTarget as any).style.borderColor = 'var(--border-light)' }}
                  onMouseLeave={e => { if (!isMe) (e.currentTarget as any).style.borderColor = 'var(--border)' }}>

                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {rank <= 3 ? (
                      <span className="text-xl">{medals[rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                    style={{ backgroundColor: musician.avatar_color }}>
                    {musician.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate text-sm">{musician.name}</p>
                      {isMe && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(123,63,228,0.2)', color: '#a78bfa' }}>você</span>}
                    </div>
                    {musician.city && <p className="text-xs" style={{ color: 'var(--muted)' }}>📍 {musician.city}</p>}
                  </div>

                  {/* Level + Points */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <LevelBadge points={musician.points} size="sm" />
                    <div className="text-right">
                      <p className="text-sm font-bold">{musician.points}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>pts</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!loading && musicians.length === 0 && (
          <div className="empty-state py-20">
            <div className="empty-state-icon">🏆</div>
            <p className="text-xl font-bold mb-2">Nenhum músico ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}
