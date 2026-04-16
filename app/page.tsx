import { createClient } from '@/lib/supabase/server'
import RiffCard from '@/components/RiffCard'

export default async function Home() {
  const supabase = createClient()

  const { data: latestRiffs } = await supabase
    .from('riffs')
    .select('*, user:profiles(*), riff_likes(id)')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Bem-vindo ao <span className="text-red">RiffHub</span>
          </h1>
          <p className="text-xl text-subtle mb-8">
            Colabore com músicos, compartilhe riffs, acesse samples e encontre suas próximas gigs
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <a href="/feed" className="btn btn-primary">
              Explorar Riffs
            </a>
            <a href="/collab" className="btn btn-secondary">
              Colaborações
            </a>
          </div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="px-4 py-16 bg-dark">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Nossas Plataformas</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Colaborar */}
            <a href="/collab" className="card group hover:border-blue transition-colors">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="text-xl font-bold mb-3">Colaborar</h3>
              <p className="text-muted">
                Crie projetos musicais colaborativos e trabalhe com outros músicos em tempo real
              </p>
            </a>

            {/* Riff Store */}
            <a href="/riffstore" className="card group hover:border-red transition-colors">
              <div className="text-4xl mb-4">🎸</div>
              <h3 className="text-xl font-bold mb-3">Riff Store</h3>
              <p className="text-muted">
                Acesse milhares de samples royalty-free, loops e instrumentais de qualidade
              </p>
            </a>

            {/* Gigs */}
            <a href="/gigs" className="card group hover:border-blue transition-colors">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-bold mb-3">Gigs</h3>
              <p className="text-muted">
                Encontre oportunidades de trabalho: shows, gravações, turnês e sessões
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Por que escolher RiffHub?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="text-3xl">⭐</div>
              <div>
                <h4 className="font-bold mb-2">Sistema de Níveis</h4>
                <p className="text-muted">
                  Ganhe pontos colaborando e suba de nível: Novato → Lenda
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🔐</div>
              <div>
                <h4 className="font-bold mb-2">Segurança & Privacidade</h4>
                <p className="text-muted">
                  Seus dados estão protegidos com autenticação e criptografia de ponta
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🌍</div>
              <div>
                <h4 className="font-bold mb-2">Comunidade Global</h4>
                <p className="text-muted">
                  Conecte-se com músicos de todo o mundo e expanda suas redes
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">📊</div>
              <div>
                <h4 className="font-bold mb-2">Análise & Insights</h4>
                <p className="text-muted">
                  Acompanhe o desempenho de suas riffs e amostras em tempo real
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🎹</div>
              <div>
                <h4 className="font-bold mb-2">Ferramentas Musicais</h4>
                <p className="text-muted">
                  Player de áudio integrado, organizador de projetos e muito mais
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">💰</div>
              <div>
                <h4 className="font-bold mb-2">Oportunidades</h4>
                <p className="text-muted">
                  Monetize seus samples e encontre trabalho como freelancer
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Riffs Preview */}
      <section className="px-4 py-16 bg-dark">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold">Riffs Recentes</h2>
            <a href="/feed" className="text-blue hover:text-blue-dark">
              Ver Tudo →
            </a>
          </div>

          {latestRiffs && latestRiffs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestRiffs.map((riff) => (
                <RiffCard key={riff.id} riff={riff} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <p>Nenhum riff compartilhado ainda. Seja o primeiro!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Pronto para começar?</h2>
        <p className="text-xl text-subtle mb-8">
          Junte-se à comunidade RiffHub e faça parte da revolução musical
        </p>
        <a href="/feed" className="btn btn-primary text-lg px-8 py-3">
          Explorar Agora
        </a>
      </section>
    </div>
  )
}
