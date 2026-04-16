import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: latestRiffs } = await supabase
    .from('riffs')
    .select('*, user:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(3)

  const { count: musiciansCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: gigsCount } = await supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'open')
  const { count: samplesCount } = await supabase.from('samples').select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">

      {/* Hero */}
      <section className="relative px-4 pt-24 pb-20 md:pt-36 md:pb-32 text-center overflow-hidden">
        <div className="hero-glow top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{top: '50%', left: '50%', transform: 'translate(-50%,-50%)'}} />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red/10 border border-red/20 text-red text-sm font-medium mb-6">
            <span>🎵</span> Plataforma para Músicos
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
            A rede social dos <span className="gradient-text">músicos</span>
          </h1>
          <p className="text-lg md:text-xl text-subtle max-w-2xl mx-auto mb-10">
            Colabore em projetos, compartilhe samples, encontre gigs e conecte-se com músicos de todo o Brasil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/feed" className="btn btn-primary btn-lg">
              Explorar Riffs →
            </Link>
            <Link href="/collab" className="btn btn-secondary btn-lg">
              Ver Colaborações
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-10 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-black text-red mb-1">{musiciansCount || 0}+</div>
            <p className="text-muted text-sm">Músicos</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-black text-blue mb-1">{samplesCount || 0}+</div>
            <p className="text-muted text-sm">Samples</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-black text-red mb-1">{gigsCount || 0}</div>
            <p className="text-muted text-sm">Gigs Abertas</p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-4 py-20" style={{background: 'var(--dark)'}}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Tudo que você precisa</h2>
            <p className="text-muted">Em uma única plataforma</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/collab" className="card card-hover group cursor-pointer block">
              <div className="w-12 h-12 rounded-xl bg-blue/10 border border-blue/20 flex items-center justify-center text-2xl mb-5">🎵</div>
              <h3 className="text-xl font-bold mb-2">Colaborar</h3>
              <p className="text-muted text-sm leading-relaxed">
                Crie projetos musicais e convide músicos para cada instrumento. Chat integrado, progresso em tempo real.
              </p>
              <div className="mt-4 text-blue text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Ver projetos →
              </div>
            </Link>

            <Link href="/riffstore" className="card card-hover group cursor-pointer block border-red/20 hover:border-red/40">
              <div className="w-12 h-12 rounded-xl bg-red/10 border border-red/20 flex items-center justify-center text-2xl mb-5">🎸</div>
              <h3 className="text-xl font-bold mb-2">Riff Store</h3>
              <p className="text-muted text-sm leading-relaxed">
                Samples, loops e beats royalty-free. Baixe gratuitamente ou suba seus próprios e ganhe pontos.
              </p>
              <div className="mt-4 text-red text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Explorar samples →
              </div>
            </Link>

            <Link href="/gigs" className="card card-hover group cursor-pointer block">
              <div className="w-12 h-12 rounded-xl bg-blue/10 border border-blue/20 flex items-center justify-center text-2xl mb-5">💼</div>
              <h3 className="text-xl font-bold mb-2">Gigs</h3>
              <p className="text-muted text-sm leading-relaxed">
                Shows, gravações, turnês e sessões. Encontre trabalho ou contrate o músico ideal para seu projeto.
              </p>
              <div className="mt-4 text-blue text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Ver oportunidades →
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Por que o RiffHub?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: '⭐', title: 'Sistema de Níveis', desc: 'Ganhe pontos colaborando, subindo samples e participando de gigs. Suba de Novato até Lenda.' },
              { icon: '🔐', title: 'Login Seguro', desc: 'Autenticação via Google com dados protegidos e criptografados pelo Supabase.' },
              { icon: '🎧', title: 'Player Integrado', desc: 'Ouça samples e riffs diretamente na plataforma sem sair da página.' },
              { icon: '🌍', title: 'Comunidade Nacional', desc: 'Conecte-se com músicos de todo o Brasil e expanda sua rede profissional.' },
            ].map((f) => (
              <div key={f.title} className="card flex gap-4 items-start">
                <div className="w-11 h-11 rounded-xl bg-card-hover flex items-center justify-center text-xl flex-shrink-0 border border-border">
                  {f.icon}
                </div>
                <div>
                  <h4 className="font-bold mb-1">{f.title}</h4>
                  <p className="text-muted text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24 text-center" style={{background: 'linear-gradient(180deg, var(--black) 0%, #0F0010 100%)'}}>
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-6">🎸</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-subtle mb-8 text-lg">Junte-se à comunidade e faça parte da revolução musical</p>
          <Link href="/feed" className="btn btn-primary btn-lg">
            Entrar no RiffHub →
          </Link>
        </div>
      </section>

    </div>
  )
}
