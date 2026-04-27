'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register' | 'confirm'

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')

  // Confirm field
  const [code, setCode] = useState('')

  const supabase = createClient()
  const router = useRouter()

  // ── Google OAuth ──────────────────────────────────────────────
  const handleGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  // ── Login ─────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!loginEmail || !loginPassword) { setError('Preencha todos os campos.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) {
        if (error.message.includes('Invalid login')) setError('E-mail ou senha incorretos.')
        else if (error.message.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.')
        else setError(error.message)
      } else {
        router.push('/feed')
      }
    } catch {
      setError('Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Register ──────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!regName || !regEmail || !regPassword || !regPasswordConfirm) { setError('Preencha todos os campos.'); return }
    if (regPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (regPassword !== regPasswordConfirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: { full_name: regName },
        },
      })
      if (error) {
        setError(error.message)
      } else if (data.user?.identities?.length === 0) {
        // Supabase não retorna erro para e-mail duplicado — detecta pelo identities vazio
        setError('Este e-mail já está cadastrado. Se você entrou com Google antes, use o botão "Continuar com Google".')
      } else {
        setPendingEmail(regEmail)
        setTab('confirm')
      }
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirm OTP ───────────────────────────────────────────────
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (code.trim().length < 6) { setError('Digite o código completo.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code.trim(),
        type: 'signup',
      })
      if (error) {
        if (error.message.includes('expired')) setError('Código expirado. Tente criar a conta novamente.')
        else setError('Código inválido. Verifique e tente novamente.')
      } else {
        router.push('/feed')
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Reenviar código ───────────────────────────────────────────
  const handleResend = async () => {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail })
      if (error) setError('Não foi possível reenviar. Tente novamente.')
      else setError('✓ Código reenviado! Verifique sua caixa de entrada.')
    } catch {
      setError('Erro ao reenviar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--black)' }}>

      {/* Glow bg */}
      <div className="hero-glow" style={{ top: '30%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.5, pointerEvents: 'none' }} />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{ background: 'var(--red-glow)', border: '1px solid rgba(232,64,58,0.4)' }}>
            🎸
          </div>
          <h1 className="text-2xl font-black tracking-tight">RiffHub</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Sua rede profissional musical</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

          {/* ── CONFIRM SCREEN ── */}
          {tab === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="text-center mb-2">
                <div className="text-4xl mb-3">📬</div>
                <h2 className="text-lg font-bold mb-1">Confirme seu e-mail</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Enviamos um código de confirmação para<br />
                  <span className="font-semibold" style={{ color: 'var(--white)' }}>{pendingEmail}</span>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={8}
                  placeholder="- - - - - - - -"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-xl outline-none transition"
                  style={{
                    background: 'var(--dark)',
                    border: '2px solid var(--border)',
                    color: 'var(--white)',
                    letterSpacing: '0.4em',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-center py-2 px-3 rounded-lg"
                  style={{
                    background: error.startsWith('✓') ? 'rgba(67,160,71,0.1)' : 'rgba(232,64,58,0.1)',
                    color: error.startsWith('✓') ? '#4caf50' : '#f87171',
                    border: `1px solid ${error.startsWith('✓') ? 'rgba(67,160,71,0.3)' : 'rgba(232,64,58,0.3)'}`,
                  }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading || code.trim().length < 6}
                className="btn btn-primary w-full">
                {loading ? 'Verificando...' : 'Confirmar e entrar'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button type="button" onClick={() => { setTab('register'); setError(''); setCode('') }}
                  className="transition" style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  ← Voltar
                </button>
                <button type="button" onClick={handleResend} disabled={loading}
                  className="transition" style={{ color: 'var(--red-light)' }}>
                  Reenviar código
                </button>
              </div>
            </form>
          )}

          {/* ── LOGIN / REGISTER ── */}
          {tab !== 'confirm' && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl mb-5"
                style={{ background: 'var(--dark)', border: '1px solid var(--border)' }}>
                {(['login', 'register'] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); setError('') }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: tab === t ? 'var(--red)' : 'transparent',
                      color: tab === t ? 'white' : 'var(--muted)',
                    }}>
                    {t === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>

              {/* ── LOGIN FORM ── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>E-mail</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Senha</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                      autoComplete="current-password"
                    />
                  </div>

                  {error && (
                    <p className="text-xs py-2 px-3 rounded-lg"
                      style={{ background: 'rgba(232,64,58,0.1)', color: '#f87171', border: '1px solid rgba(232,64,58,0.3)' }}>
                      {error}
                    </p>
                  )}

                  <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
              )}

              {/* ── REGISTER FORM ── */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Nome</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Seu nome artístico"
                      className="auth-input"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>E-mail</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Senha</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="auth-input"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Confirmar senha</label>
                    <input
                      type="password"
                      value={regPasswordConfirm}
                      onChange={e => setRegPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                      autoComplete="new-password"
                    />
                  </div>

                  {error && (
                    <p className="text-xs py-2 px-3 rounded-lg"
                      style={{ background: 'rgba(232,64,58,0.1)', color: '#f87171', border: '1px solid rgba(232,64,58,0.3)' }}>
                      {error}
                    </p>
                  )}

                  <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>ou</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
