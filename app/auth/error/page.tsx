import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Erro no login</h1>
        <p className="text-muted mb-8">
          Ocorreu um problema ao fazer login. Isso pode acontecer se você está
          criando uma conta pela primeira vez. Tente novamente.
        </p>
        <Link href="/" className="btn btn-primary">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
