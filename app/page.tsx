import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: latestRiffs } = await supabase
    .from('riffs').select('*, user:profiles(*)').order('created_at', { ascending: false }).limit(3)
  const { count: musiciansCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: gigsCount }      = await supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'open')
  const { count: samplesCount }   = await supabase.from('samples').select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--black)' }}>

      {/* ── HERO ── */}
      <section className="relative px-4 pt-20 pb-24 md:pt-32 md:pb-36 text-center overflow-hidden">
        {/* Background glows */}
        <div className="hero-glow" style={{ top: '40%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.9 }} />
        <div className="hero-glow-blue" style={{ top: '30%', right: '-10%', opacity: 0.6 }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7 animate-fade-in"
            style={{ background: 'var(--red-glow)', color: 'var(--red-light)', border: '1px solid rgba(232,64,58,0.3)' }}>
            <span>🎵</span> Plataforma social para músicos brasileiros
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-5 leading-[1.05] tracking-tight animate-fade-in stagger-1">
            Sua rede social<br />
            <span className="gradient-text">musical</span>
          </h1>

          <p className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed animate-fade-in stagger-2"
            style={{ color: 'var(--subtle)' }}>
            Colabore em projetos, compartilhe riffs, acesse samples e encontre gigs com músicos de todo o Brasil.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in stagger-3">
            <Link href="/feed" className="btn btn-primary btn-xl">
              Entrar no Feed
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/collab" className="btn btn-secondary btn-xl">
              Ver Colaborações
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 mt-12 animate-fade-in stagger-4">
            {[
              { n: musiciansCount || 0, label: 'Músicos' },
              { n: samplesCount || 0, label: 'Samples' },
              { n: gigsCount || 0, label: 'Gigs abertas' },
            ].map(s => (
              <div key={s.label} className="text-center px-4">
                <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--white)' }}>{s.n}+</div>
                <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="px-4 py-20 md:py-28" style={{ background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Plataforma completa</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Tudo que você precisa</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                href: '/feed', color: 'var(--red)', glow: 'var(--red-glow)',
                icon: '🎸', title: 'Feed de Riffs',
                desc: 'Compartilhe seus riffs, descubra novos sons e curta o trabalho de outros músicos em tempo real.',
                cta: 'Ver riffs',
              },
              {
                href: '/collab', color: 'var(--blue)', glow: 'var(--blue-glow)',
                icon: '🎵', title: 'Projetos Colaborativos',
                desc: 'Crie bandas virtuais, preencha vagas por instrumento e construa músicas com quem nunca conheceu pessoalmente.',
                cta: 'Ver projetos',
              },
              {
                href: '/riffstore', color: 'var(--purple)', glow: 'var(--purple-glow)',
                icon: '🎛', title: 'Riff Store',
                desc: 'Samples, loops e beats prontos para usar. Suba os seus e ganhe pontos na comunidade.',
                cta: 'Explorar samples',
              },
              {
                href: '/gigs', color: 'var(--green)', glow: 'var(--green-glow)',
                icon: '💼', title: 'Gigs & Shows',
                desc: 'Encontre shows, gravações e turnês. Ou contrate o músico ideal para o seu projeto.',
                cta: 'Ver oportunidades',
              },
              {
                href: '/search', color: 'var(--blue)', glow: 'var(--blue-glow)',
                icon: '🔍', title: 'Músicos',
                desc: 'Busque por instrumento, cidade ou estilo. Siga quem você admira e construa sua rede.',
                cta: 'Buscar músicos',
              },
              {
                href: '/leaderboard', color: '#FDE047', glow: 'rgba(253,224,71,0.1)',
                icon: '🏆', title: 'Leaderboard',
                desc: 'Suba de Novato até Lenda. Ganhe pontos colaborando, subindo samples e participando de gigs.',
                cta: 'Ver ranking',
              },
            ].map(f => (
              <Link key={f.href} href={f.href}
                className="card group flex flex-col gap-4 hover-lift cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: f.glow, border: `1px solid ${f.color}22` }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1.5">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5"
                  style={{ color: f.color }}>
                  {f.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Simples assim</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Como funciona</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Crie sua conta', desc: 'Login com Google em um clique. Seu perfil é criado automaticamente.' },
              { step: '02', title: 'Complete seu perfil', desc: 'Adicione seus instrumentos, estilo musical e links das suas redes.' },
              { step: '03', title: 'Conecte e colabore', desc: 'Publique riffs, entre em projetos, candidate-se a gigs e suba na comunidade.' },
            ].map((s, i) => (
              <div key={s.step} className="card relative overflow-hidden">
                <div className="absolute top-4 right-4 font-black text-5xl leading-none select-none"
                  style={{ color: 'var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.step}
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white mb-5 relative"
                  style={{ background: 'var(--red)' }}>
                  {i + 1}
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT RIFFS (if any) ── */}
      {latestRiffs && latestRiffs.length > 0 && (
        <section className="px-4 py-16" style={{ background: 'var(--surface)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">Últimos Riffs</h2>
              <Link href="/feed" className="text-sm font-semibold" style={{ color: 'var(--red)' }}>Ver todos →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {latestRiffs.map(riff => (
                <div key={riff.id} className="card hover-lift">
                  {riff.user && (
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
                        style={{ backgroundColor: riff.user.avatar_color }}>
                        {riff.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{riff.user.name}</p>
                      </div>
                    </div>
                  )}
                  <h3 className="font-bold mb-1 leading-tight">{riff.title}</h3>
                  {riff.description && (
                    <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--subtle)' }}>{riff.description}</p>
                  )}
                  <Link href="/feed" className="text-xs font-semibold" style={{ color: 'var(--blue-light)' }}>
                    Ouvir no Feed →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="px-4 py-24 text-center relative overflow-hidden">
        <div className="hero-glow" style={{ bottom: '-30%', left: '50%', transform: 'translateX(-50%)', opacity: 0.6 }} />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl text-3xl mb-6"
            style={{ background: 'var(--red-glow)', border: '1px solid rgba(232,64,58,0.3)' }}>
            🎸
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
            Pronto para tocar?
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--subtle)' }}>
            Junte-se à comunidade e faça parte da revolução musical brasileira.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/feed" className="btn btn-primary btn-xl">
              Começar agora — é grátis
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
