'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (data) {
            setProfile(data)
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const handleSignIn = async () => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
  }

  return (
    <nav className="border-b border-border bg-dark sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-red">♪</span>
          <span>RiffHub</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/feed" className="hover:text-red transition">
            Feed
          </Link>
          <Link href="/collab" className="hover:text-red transition">
            Colaborar
          </Link>
          <Link href="/riffstore" className="hover:text-red transition">
            Samples
          </Link>
          <Link href="/gigs" className="hover:text-red transition">
            Gigs
          </Link>
          <Link href="/search" className="hover:text-red transition">
            Músicos
          </Link>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {!loading && (user && profile ? (
            <>
              <div className="relative group">
                <button className="flex items-center gap-2 hover:opacity-80 transition">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: profile.avatar_color }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm hidden md:inline">{profile.name}</span>
                </button>
                <div className="absolute right-0 top-10 bg-card border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 min-w-[160px]">
                  <Link href={`/profile/${profile.id}`} className="block px-4 py-2 text-sm hover:bg-dark transition">
                    Ver Perfil
                  </Link>
                  <Link href="/profile/edit" className="block px-4 py-2 text-sm hover:bg-dark transition">
                    Editar Perfil
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red hover:bg-dark transition"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="btn btn-sm btn-primary"
            >
              Entrar
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
