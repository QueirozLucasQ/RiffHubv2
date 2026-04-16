'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import type { Project, ProjectTrack, ProjectDiscussion } from '@/lib/types'

interface ProjectDetailProps {
  params: { id: string }
}

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [tracks, setTracks] = useState<ProjectTrack[]>([])
  const [discussions, setDiscussions] = useState<ProjectDiscussion[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [proposing, setProposing] = useState(false)
  const [proposeInstrument, setProposeInstrument] = useState('')
  const [proposeError, setProposeError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true)

        // Fetch project
        const { data: projectData } = await supabase
          .from('projects')
          .select('*, owner:profiles(*)')
          .eq('id', params.id)
          .single()

        if (projectData) setProject(projectData)

        // Fetch tracks
        const { data: tracksData } = await supabase
          .from('project_tracks')
          .select('*, musician:profiles(*)')
          .eq('project_id', params.id)

        if (tracksData) setTracks(tracksData)

        // Fetch discussions
        const { data: discussionsData } = await supabase
          .from('project_discussions')
          .select('*, user:profiles(*)')
          .eq('project_id', params.id)
          .order('created_at', { ascending: false })

        if (discussionsData) setDiscussions(discussionsData)
      } catch (error) {
        console.error('Error fetching project details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectDetails()
  }, [params.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !project) return

    try {
      const profile = await getOrCreateProfile()
      if (!profile) return

      const { data: newDiscussion, error } = await supabase
        .from('project_discussions')
        .insert({
          project_id: project.id,
          user_id: profile.id,
          text: messageText,
        })
        .select('*, user:profiles(*)')
        .single()

      if (error) throw error

      if (newDiscussion) {
        setDiscussions([newDiscussion, ...discussions])
        setMessageText('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleProposeInstrument = async () => {
    if (!proposeInstrument.trim() || !project) return
    setProposing(true)
    setProposeError('')
    try {
      const profile = await getOrCreateProfile()
      if (!profile) { setProposeError('Faça login primeiro'); setProposing(false); return }

      const { error } = await supabase
        .from('project_tracks')
        .insert({
          project_id: project.id,
          instrument: proposeInstrument,
          musician_id: profile.id,
          filled: false,
        })

      if (error) throw error

      // Refresh tracks
      const { data: tracksData } = await supabase
        .from('project_tracks')
        .select('*, musician:profiles(*)')
        .eq('project_id', project.id)
      if (tracksData) setTracks(tracksData)
      setProposeInstrument('')
    } catch (err: any) {
      setProposeError(err?.message || 'Erro ao propor instrumento')
    } finally {
      setProposing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted">Carregando projeto...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted">Projeto não encontrado</p>
      </div>
    )
  }

  const filledTracks = tracks.filter((t) => t.filled).length

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">{project.title}</h1>
          <p className="text-lg text-muted mb-4">{project.description}</p>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="badge badge-blue">{project.style}</span>
            <span className="badge badge-blue">{project.bpm} BPM</span>
            <span className="badge badge-blue">Chave: {project.key}</span>
            {project.owner && (
              <span className="text-sm text-muted">
                por <span className="text-white font-semibold">{project.owner.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side - Project Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tracks Section */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Instrumentos Necessários</h2>
              <div className="space-y-3">
                {tracks.length > 0 ? (
                  tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-4 bg-dark rounded border border-border"
                    >
                      <div>
                        <p className="font-semibold">{track.instrument}</p>
                        {track.musician && (
                          <p className="text-sm text-muted">{track.musician.name}</p>
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          track.filled ? 'text-green-500' : 'text-yellow-500'
                        }`}
                      >
                        {track.filled ? '✓ Preenchido' : '○ Vago'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">Nenhum instrumento adicionado ainda</p>
                )}
              </div>
              <div className="mt-6 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue transition-all"
                  style={{
                    width: `${tracks.length > 0 ? (filledTracks / tracks.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted mt-2">
                {filledTracks}/{tracks.length} instrumentos preenchidos
              </p>
            </div>

            {/* Chat Section */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Discussão</h2>
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {discussions.length > 0 ? (
                  discussions.map((discussion) => (
                    <div key={discussion.id} className="flex gap-3 p-3 bg-dark rounded">
                      {discussion.user && (
                        <>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: discussion.user.avatar_color }}
                          >
                            {discussion.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{discussion.user.name}</p>
                            <p className="text-sm text-white break-words">
                              {discussion.text}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-sm">Sem mensagens ainda. Seja o primeiro a comentar!</p>
                )}
              </div>

              {/* Message Form */}
              <form onSubmit={handleSendMessage} className="flex gap-3 border-t border-border pt-4">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 px-4 py-2 bg-dark border border-border rounded text-white placeholder-muted outline-none focus:border-blue transition"
                />
                <button type="submit" className="btn btn-sm btn-primary">
                  Enviar
                </button>
              </form>
            </div>
          </div>

          {/* Right Side - Musicians & Proposed Tracks */}
          <div className="space-y-8">
            {/* Propose Track */}
            <div className="card">
              <h3 className="font-bold mb-4">Contribuir</h3>
              <p className="text-sm text-muted mb-3">Qual instrumento você toca?</p>
              <input
                type="text"
                value={proposeInstrument}
                onChange={(e) => setProposeInstrument(e.target.value)}
                placeholder="Ex: Guitarra, Baixo..."
                className="w-full px-3 py-2 bg-dark border border-border rounded text-white text-sm outline-none focus:border-blue mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleProposeInstrument()}
              />
              {proposeError && <p className="text-red-400 text-xs mb-2">{proposeError}</p>}
              <button
                onClick={handleProposeInstrument}
                disabled={proposing || !proposeInstrument.trim()}
                className="w-full btn btn-primary btn-sm"
              >
                {proposing ? 'Enviando...' : 'Propor Instrumento'}
              </button>
            </div>

            {/* Músicos Envolvidos */}
            <div className="card">
              <h3 className="font-bold mb-4">Músicos Envolvidos</h3>
              <div className="space-y-3">
                {project.owner && (
                  <div className="flex items-center gap-3 p-3 bg-dark rounded">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: project.owner.avatar_color }}
                    >
                      {project.owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{project.owner.name}</p>
                      <p className="text-xs text-muted">Criador</p>
                    </div>
                  </div>
                )}
                {tracks
                  .filter((t) => t.musician)
                  .map((track) => (
                    <div key={track.id} className="flex items-center gap-3 p-3 bg-dark rounded">
                      {track.musician && (
                        <>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: track.musician.avatar_color }}
                          >
                            {track.musician.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">
                              {track.musician.name}
                            </p>
                            <p className="text-xs text-muted">{track.instrument}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Tech Details */}
            <div className="card">
              <h3 className="font-bold mb-4">Detalhes Técnicos</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted">Estilo</p>
                  <p className="text-white font-semibold">{project.style}</p>
                </div>
                <div>
                  <p className="text-muted">BPM</p>
                  <p className="text-white font-semibold">{project.bpm}</p>
                </div>
                <div>
                  <p className="text-muted">Chave</p>
                  <p className="text-white font-semibold">{project.key}</p>
                </div>
                <div>
                  <p className="text-muted">Status</p>
                  <p className="text-white font-semibold capitalize">{project.status}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
