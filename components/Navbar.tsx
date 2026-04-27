'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
          if (data) {
            setProfile(data)
            const { count } = await supabase.from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', data.id).eq('read', false)
            setUnreadCount(count || 0)
            supabase.channel('navbar-notifs')
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.id}` },
                () => setUnreadCount(prev => prev + 1))
              .subscribe()
          }
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setUser(null); setProfile(null); setUnreadCount(0) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut(); setUser(null); setProfile(null); setMenuOpen(false)
  }
  const markNotificationsRead = async () => {
    if (unreadCount > 0 && profile) {
      setUnreadCount(0)
      await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    }
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const desktopLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/collab', label: 'Colaborar' },
    { href: '/riffstore', label: 'Samples' },
    { href: '/gigs', label: 'Gigs' },
    { href: '/search', label: 'Músicos' },
  ]

  const bottomNavItems = [
    { href: '/feed', label: 'Feed', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { href: '/collab', label: 'Collab', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )},
    { href: '/search', label: 'Buscar', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )},
    { href: '/gigs', label: 'Gigs', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    )},
    ...(user ? [{ href: '/notifications', label: 'Alertas', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ), badge: unreadCount }] : []),
  ]

  return (
    <>
      {/* ── Desktop / Top Navbar ── */}
      <nav className="border-b sticky top-0 z-50 hidden md:block"
        style={{ background: 'rgba(6,6,8,0.88)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-black text-lg flex-shrink-0 hover:opacity-80 transition-opacity">
            <LogoSVG />
            <span style={{ letterSpacing: '-0.02em' }}>RiffHub</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            {desktopLinks.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: isActive(link.href) ? 'var(--white)' : 'var(--muted)',
                  background: isActive(link.href) ? 'var(--card)' : 'transparent',
                  fontWeight: isActive(link.href) ? 600 : 400,
                }}>
                {link.href === '/leaderboard' ? '🏆' : link.label}
              </Link>
            ))}
            <Link href="/leaderboard"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: isActive('/leaderboard') ? 'var(--white)' : 'var(--muted)', background: isActive('/leaderboard') ? 'var(--card)' : 'transparent' }}>
              🏆
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {!loading && user && (
              <>
                {/* Bell */}
                <Link href="/notifications" onClick={markNotificationsRead}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-card"
                  style={{ color: isActive('/notifications') ? 'var(--white)' : 'var(--muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-xs flex items-center justify-center text-white font-bold"
                      style={{ background: 'var(--red)', fontSize: '10px' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Chat */}
                <Link href="/chat"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-card"
                  style={{ color: isActive('/chat') ? 'var(--white)' : 'var(--muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </Link>
              </>
            )}

            {!loading && (
              user && profile ? (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition hover:bg-card">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: profile.avatar_color }}>
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>
                      {profile.name.split(' ')[0]}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ color: 'var(--faint)', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : '' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-11 rounded-2xl shadow-2xl z-50 py-1.5 min-w-[200px] animate-scale-in"
                      style={{ background: 'var(--card-raised)', border: '1px solid var(--border-light)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                      {/* User info */}
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <p className="font-semibold text-sm">{profile.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{profile.points} pts</p>
                      </div>
                      {[
                        { href: `/profile/${profile.id}`, icon: '👤', label: 'Ver Perfil' },
                        { href: '/profile/edit', icon: '✏️', label: 'Editar Perfil' },
                        { href: '/chat', icon: '💬', label: 'Mensagens' },
                        { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
                      ].map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-dark"
                          style={{ color: 'var(--subtle)' }}>
                          <span>{item.icon}</span> {item.label}
                        </Link>
                      ))}
                      <Link href="/notifications" onClick={async () => { setMenuOpen(false); await markNotificationsRead() }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-dark"
                        style={{ color: 'var(--subtle)' }}>
                        <span>🔔</span> Notificações
                        {unreadCount > 0 && (
                          <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: 'var(--red)' }}>
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <div className="h-px mx-3 my-1" style={{ background: 'var(--border)' }} />
                      <button onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition hover:bg-dark"
                        style={{ color: '#f87171' }}>
                        🚪 Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth" className="btn btn-primary btn-sm">
                  Entrar
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Top Bar (logo + auth only) ── */}
      <nav className="md:hidden sticky top-0 z-50 border-b"
        style={{ background: 'rgba(6,6,8,0.92)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="px-4 h-13 flex items-center justify-between" style={{ height: 52 }}>
          <Link href="/" className="flex items-center gap-2 font-black text-base">
            <LogoSVG size={28} />
            <span style={{ letterSpacing: '-0.02em' }}>RiffHub</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {!loading && user && (
              <>
                <Link href="/chat"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-card"
                  style={{ color: 'var(--muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </Link>
                {profile && (
                  <Link href={`/profile/${profile.id}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: profile.avatar_color }}>
                    {profile.name.charAt(0).toUpperCase()}
                  </Link>
                )}
              </>
            )}
            {!loading && !user && (
              <Link href="/auth" className="btn btn-primary btn-sm">Entrar</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav md:hidden">
        {bottomNavItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              onClick={item.href === '/notifications' ? markNotificationsRead : undefined}
              className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <div className="relative">
                <div style={{ color: active ? 'var(--white)' : 'var(--muted)', transition: 'color 0.15s' }}>
                  {item.icon}
                </div>
                {'badge' in item && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full text-white font-bold flex items-center justify-center"
                    style={{ background: 'var(--red)', fontSize: '9px' }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span style={{ color: active ? 'var(--white)' : 'var(--muted)' }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function LogoSVG({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="9" fill="#E8403A"/>
      <path d="M8 6h10a6 6 0 0 1 0 12H8V6z" fill="white" opacity="0.95"/>
      <path d="M8 18h7l5 8H8v-8z" fill="white" opacity="0.72"/>
      <path d="M10 12 Q13 9 16 12 Q19 15 22 12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}
