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
  const [mobileOpen, setMobileOpen] = useState(false)
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
            // Load unread notifications count
            const { count } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', data.id)
              .eq('read', false)
            setUnreadCount(count || 0)

            // Real-time unread count
            supabase.channel('navbar-notifs')
              .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${data.id}`,
              }, () => setUnreadCount(prev => prev + 1))
              .subscribe()
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setProfile(null); setUnreadCount(0) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMenuOpen(false)
  }

  const handleSignIn = async () => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  const navLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/collab', label: 'Colaborar' },
    { href: '/riffstore', label: 'Samples' },
    { href: '/gigs', label: 'Gigs' },
    { href: '/search', label: 'Músicos' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="border-b sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-black text-xl flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="RiffHub" width={32} height={32} style={{ flexShrink: 0 }} />
          <span>RiffHub</span>
        </Link>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                color: isActive(link.href) ? 'var(--white)' : 'var(--subtle)',
                background: isActive(link.href) ? 'var(--card)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {!loading && user && (
            <>
              {/* Notifications bell */}
              <Link href="/notifications"
                className="relative p-2 rounded-lg transition hover:bg-card flex items-center justify-center"
                style={{ color: isActive('/notifications') ? 'var(--white)' : 'var(--subtle)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-xs flex items-center justify-center text-white font-bold"
                    style={{ background: 'var(--red)', fontSize: '10px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Chat icon */}
              <Link href="/chat"
                className="p-2 rounded-lg transition hover:bg-card flex items-center justify-center"
                style={{ color: isActive('/chat') ? 'var(--white)' : 'var(--subtle)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </Link>
            </>
          )}

          {!loading && (
            user && profile ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-card"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: profile.avatar_color }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden md:inline" style={{ color: 'var(--subtle)' }}>
                    {profile.name.split(' ')[0]}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 rounded-xl shadow-2xl z-50 py-1 min-w-[180px] animate-fade-in"
                    style={{ background: 'var(--card)', border: '1px solid var(--border-light)' }}>
                    <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-semibold">{profile.name}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{profile.points} pts</p>
                    </div>
                    <Link href={`/profile/${profile.id}`} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-dark">
                      👤 Ver Perfil
                    </Link>
                    <Link href="/profile/edit" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-dark">
                      ✏️ Editar Perfil
                    </Link>
                    <Link href="/chat" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-dark">
                      💬 Mensagens
                    </Link>
                    <Link href="/notifications" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-dark">
                      🔔 Notificações{unreadCount > 0 && <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: 'var(--red)' }}>{unreadCount}</span>}
                    </Link>
                    <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                    <button onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors hover:bg-dark"
                      style={{ color: 'var(--red)' }}>
                      🚪 Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={handleSignIn} className="btn btn-primary btn-sm">
                Entrar
              </button>
            )
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-card"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1" style={{ borderColor: 'var(--border)', background: 'var(--dark)' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: isActive(link.href) ? 'var(--white)' : 'var(--subtle)', background: isActive(link.href) ? 'var(--card)' : 'transparent' }}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link href="/chat" onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ color: isActive('/chat') ? 'var(--white)' : 'var(--subtle)', background: isActive('/chat') ? 'var(--card)' : 'transparent' }}>
                💬 Mensagens
              </Link>
              <Link href="/notifications" onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ color: isActive('/notifications') ? 'var(--white)' : 'var(--subtle)', background: isActive('/notifications') ? 'var(--card)' : 'transparent' }}>
                🔔 Notificações {unreadCount > 0 && `(${unreadCount})`}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
