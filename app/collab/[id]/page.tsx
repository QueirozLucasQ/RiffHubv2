'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import AudioPlayer from '@/components/AudioPlayer'
import type { Project, ProjectTrack, ProjectDiscussion } from '@/lib/types'

interface ProjectDetailProps { params: { id: string } }

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [tracks, setTracks] = useState<ProjectTrack[]>([])
  const [discussions, setDiscussions] = useState<ProjectDiscussion[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [hasApplied, setHasApplied] = useState(false)

  // Propose form
  const [proposeInstrument, setProposeInstrument] = useState('')
  const [proposeMessage, setProposeMessage] = useState('')
  const [proposeAudio, setProposeAudio] = useState<File | null>(null)
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState('')
  const [proposeDone, setProposeDone] = useState(false)

  // Discussion
  const [messageText, setMessageText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchAll()
  }, [params.id])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const me = await getOrCreateProfile()
      if (me) setMyProfile(me)

      const [{ data: proj }, { data: trk }, { data: disc }] = await Promise.all([
        supabase.from('projects').select('*, owner:profiles(*)').eq('id', params.id).single(),
        supabase.from('project_tracks').select('*, musician:profiles(*)').eq('project_id', params.id),
        supabase.from('project_discussions').select('*, user:profiles(*)').eq('project_id', params.id).order('created_at', { ascending: false }),
      ])

      if (proj) {
        setProject(proj)
        if (me && proj.owner_id === me.id) {
          setIsOwner(true)
          fetchApplications()
        }
      }
      if (trk) setTracks(trk)
      if (disc) setDiscussions(disc)

      // Check if already applied
      if (me) {
        const { data: existingApp } = await supabase
          .from('project_applications')
          .select('id')
          .eq('project_id', params.id)
          .eq('applicant_id', me.id)
          .maybeSingle()
        if (existingApp) setHasApplied(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    const { data } = await supabase
      .from('project_applications')
      .select('*, applicant:profiles(*)')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
    setApplications(data || [])
  }

  const handlePropose = async () => {
    if (!proposeInstrument.trim() || !project || !myProfile) return
    setProposing(true)
    setProposeError('')
    try {
      let audioUrl: string | null = null

      if (proposeAudio) {
        const ext = proposeAudio.name.split('.').pop()
        const path = `applications/${project.id}/${myProfile.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('audio').upload(path, proposeAudio)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('audio').getPublicUrl(path)
        audioUrl = urlData.publicUrl
      }

      const { error } = await supabase.from('project_applications').insert({
        project_id: project.id,
        instrument: proposeInstrument,
        applicant_id: myProfile.id,
        message: proposeMessage,
        audio_url: audioUrl,
        status: 'pending',
      })

      if (error) throw error

      // Notify project owner
      await supabase.from('notifications').insert({
        user_id: project.owner_id,
        type: 'collab_request',
        title: `${myProfile.name} quer participar do seu projeto`,
        body: `Instrumento: ${proposeInstrument}${proposeMessage ? ` · "${proposeMessage}"` : ''}`,
        link: `/collab/${project.id}`,
        read: false,
      })

      setHasApplied(true)
      setProposeDone(true)
      setProposeInstrument('')
      setProposeMessage('')
      setProposeAudio(null)
    } catch (err: any) {
      if (err?.code === '23505') {
        setProposeError('Você já se candidatou a este projeto')
        setHasApplied(true)
      } else {
        setProposeError(err?.message || 'Erro ao enviar proposta')
      }
    } finally {
      setProposing(false)
    }
  }

  const handleApplicationAction = async (app: any, action: 'accepted' | 'rejected') => {
    try {
      await supabase.from('project_applications').update({ status: action }).eq('id', app.id)

      const title = action === 'accepted'
        ? `✅ Proposta aceita em "${project!.title}"`
        : `❌ Proposta recusada em "${project!.title}"`

      await supabase.from('notifications').insert({
        user_id: app.applicant_id,
        type: action === 'accepted' ? 'collab_accepted' : 'collab_rejected',
        title,
        body: `Instrumento: ${app.instrument}`,
        link: `/collab/${project!.id}`,
        read: false,
      })

      if (action === 'accepted') {
        await supabase.from('project_tracks').insert({
          project_id: project!.id,
          instrument: app.instrument,
          musician_id: app.applicant_id,
          filled: true,
        })
        // Refresh tracks
        const { data: trk } = await supabase.from('project_tracks').select('*, musician:profiles(*)').eq('project_id', project!.id)
        if (trk) setTracks(trk)
      }

      fetchApplications()
    } catch (err: any) {
      console.error('Error handling application:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !project || !myProfile) return
    setSendingMsg(true)
    try {
      const { data: newMsg, error } = await supabase
        .from('project_discussions')
        .insert({ project_id: project.id, user_id: myProfile.id, text: messageText })
        .select('*, user:profiles(*)')
        .single()
      if (error) throw error
      if (newMsg) {
        setDiscussions(prev => [newMsg, ...prev])
        setMessageText('')
      }
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted">Carregando projeto...</p>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted">Projeto não encontrado</p>
    </div>
  )

  const filledTracks = tracks.filter(t => t.filled).length
  const pendingApps = applications.filter(a => a.status === 'pending')
  const statusColors: any = { open: '#4ADE80', in_progress: '#FDE047', completed: '#9CA3AF' }
  const statusLabels: any = { open: 'Aberto', in_progress: 'Em andamento', completed: 'Concluído' }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-4xl font-bold">{project.title}</h1>
            <span className="text-sm px-3 py-1 rounded-full font-medium flex-shrink-0"
              style={{ background: `${statusColors[project.status]}20`, color: statusColors[project.status] }}>
              {statusLabels[project.status]}
            </span>
          </div>
          <p className="text-lg text-muted mb-4">{project.description}</p>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="badge badge-blue">{project.style}</span>
            <span className="badge badge-blue">{project.bpm} BPM</span>
            <span className="badge badge-blue">Tom: {project.key}</span>
            {project.owner && (
              <Link href={`/profile/${project.owner.id}`} className="flex items-center gap-2 text-sm text-muted hover:text-white transition">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: project.owner.avatar_color }}>
                  {project.owner.name.charAt(0).toUpperCase()}
                </div>
                {project.owner.name}
              </Link>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">

            {/* Owner: Pending Applications */}
            {isOwner && pendingApps.length > 0 && (
              <div className="card" style={{ borderColor: 'rgba(30,136,229,0.4)', borderWidth: 2 }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📬</span>
                  <h2 className="text-xl font-bold">Candidaturas Pendentes</h2>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'var(--blue)' }}>
                    {pendingApps.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {pendingApps.map(app => (
                    <div key={app.id} className="p-4 rounded-xl" style={{ background: 'var(--dark)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3 mb-3">
                        <Link href={`/profile/${app.applicant.id}`}>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 hover:opacity-80 transition"
                            style={{ backgroundColor: app.applicant.avatar_color }}>
                            {app.applicant.name.charAt(0).toUpperCase()}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${app.applicant.id}`} className="font-semibold hover:text-blue transition">{app.applicant.name}</Link>
                          <p className="text-sm text-muted">quer tocar: <span className="text-white font-medium">{app.instrument}</span></p>
                          {app.message && <p className="text-sm mt-1 italic text-subtle">"{app.message}"</p>}
                        </div>
                      </div>

                      {app.audio_url && (
                        <div className="mb-3">
                          <p className="text-xs text-muted mb-1">🎵 Áudio de demonstração:</p>
                          <AudioPlayer src={app.audio_url} title={`Demo de ${app.applicant.name}`} />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => handleApplicationAction(app, 'accepted')}
                          className="flex-1 btn btn-sm"
                          style={{ background: 'rgba(67,160,71,0.2)', color: '#4ADE80', border: '1px solid rgba(67,160,71,0.4)' }}>
                          ✓ Aceitar
                        </button>
                        <button onClick={() => handleApplicationAction(app, 'rejected')}
                          className="flex-1 btn btn-sm"
                          style={{ background: 'rgba(229,57,53,0.15)', color: '#f87171', border: '1px solid rgba(229,57,53,0.3)' }}>
                          ✕ Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Owner: All Applications history */}
            {isOwner && applications.filter(a => a.status !== 'pending').length > 0 && (
              <div className="card">
                <h3 className="font-bold mb-4">Histórico de Candidaturas</h3>
                <div className="space-y-2">
                  {applications.filter(a => a.status !== 'pending').map(app => (
                    <div key={app.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--dark)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: app.applicant.avatar_color }}>
                        {app.applicant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{app.applicant.name} — {app.instrument}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.status === 'accepted' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                        {app.status === 'accepted' ? '✓ Aceito' : '✕ Recusado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracks */}
            <div className="card">
              <h2 className="text-xl font-bold mb-5">Instrumentos do Projeto</h2>
              {tracks.length > 0 ? (
                <div className="space-y-3">
                  {tracks.map(track => (
                    <div key={track.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--dark)', border: '1px solid var(--border)' }}>
                      <div>
                        <p className="font-semibold">{track.instrument}</p>
                        {track.musician && <p className="text-sm text-muted">{track.musician.name}</p>}
                      </div>
                      <span className={`text-sm font-semibold ${track.filled ? 'text-green-400' : 'text-yellow-400'}`}>
                        {track.filled ? '✓ Preenchido' : '○ Vago'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm">Nenhum instrumento ainda</p>
              )}
              {tracks.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Progresso</span>
                    <span>{filledTracks}/{tracks.length}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${tracks.length > 0 ? (filledTracks / tracks.length) * 100 : 0}%`, background: 'var(--blue)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Discussion */}
            <div className="card">
              <h2 className="text-xl font-bold mb-5">Discussão</h2>
              <div className="space-y-3 mb-5 max-h-80 overflow-y-auto">
                {discussions.length === 0 ? (
                  <p className="text-muted text-sm">Sem mensagens ainda. Seja o primeiro!</p>
                ) : discussions.map(d => (
                  <div key={d.id} className="flex gap-3 p-3 rounded-lg" style={{ background: 'var(--dark)' }}>
                    {d.user && (
                      <>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: d.user.avatar_color }}>
                          {d.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{d.user.name}</p>
                          <p className="text-sm break-words">{d.text}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 px-4 py-2 rounded-lg text-sm outline-none transition"
                  style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }} />
                <button type="submit" disabled={sendingMsg || !messageText.trim()} className="btn btn-primary btn-sm">
                  {sendingMsg ? '...' : 'Enviar'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* Propose / Apply */}
            {!isOwner && (
              <div className="card">
                {proposeDone ? (
                  <div className="text-center py-4">
                    <p className="text-3xl mb-2">🎉</p>
                    <p className="font-bold text-green-400 mb-1">Proposta enviada!</p>
                    <p className="text-sm text-muted">O criador do projeto será notificado.</p>
                  </div>
                ) : hasApplied ? (
                  <div className="text-center py-4">
                    <p className="text-2xl mb-2">⏳</p>
                    <p className="font-semibold text-blue">Você já se candidatou</p>
                    <p className="text-sm text-muted mt-1">Aguarde a resposta do criador</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold mb-3">Quero Participar</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">Instrumento *</label>
                        <input type="text" value={proposeInstrument} onChange={e => setProposeInstrument(e.target.value)}
                          placeholder="Ex: Guitarra, Baixo..."
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none transition"
                          style={{ background: 'var(--dark)', border: `2px solid ${proposeInstrument.trim() ? 'var(--blue)' : 'var(--border)'}`, color: 'var(--white)' }}
                          onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Mensagem (opcional)</label>
                        <textarea value={proposeMessage} onChange={e => setProposeMessage(e.target.value)}
                          placeholder="Apresente-se brevemente..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition"
                          style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }} />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">🎵 Áudio de demonstração (opcional)</label>
                        <input type="file" accept="audio/*" onChange={e => setProposeAudio(e.target.files?.[0] || null)}
                          className="w-full text-xs"
                          style={{ color: 'var(--muted)' }} />
                        <p className="text-xs text-muted mt-1">MP3 ou WAV de até 10MB</p>
                      </div>
                    </div>
                    {proposeError && (
                      <p className="text-xs mt-2 px-2 py-1.5 rounded" style={{ background: 'rgba(229,57,53,0.15)', color: '#f87171', border: '1px solid rgba(229,57,53,0.3)' }}>
                        ⚠ {proposeError}
                      </p>
                    )}
                    <button onClick={handlePropose}
                      disabled={proposing || !proposeInstrument.trim()}
                      className="w-full btn btn-primary btn-sm mt-3"
                      style={{ opacity: (!proposeInstrument.trim() || proposing) ? 0.4 : 1 }}>
                      {proposing ? 'Enviando...' : 'Enviar Proposta'}
                    </button>
                    {!proposeInstrument.trim() && (
                      <p className="text-xs text-muted text-center mt-1">↑ Preencha o instrumento primeiro</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Músicos Envolvidos */}
            <div className="card">
              <h3 className="font-bold mb-4">Músicos Envolvidos</h3>
              <div className="space-y-2">
                {project.owner && (
                  <Link href={`/profile/${project.owner.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark transition">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: project.owner.avatar_color }}>
                      {project.owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{project.owner.name}</p>
                      <p className="text-xs text-muted">Criador</p>
                    </div>
                  </Link>
                )}
                {tracks.filter(t => t.musician && t.filled).map(track => (
                  <Link key={track.id} href={`/profile/${track.musician!.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark transition">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: track.musician!.avatar_color }}>
                      {track.musician!.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{track.musician!.name}</p>
                      <p className="text-xs text-muted">{track.instrument}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Tech Details */}
            <div className="card">
              <h3 className="font-bold mb-4">Detalhes Técnicos</h3>
              <div className="space-y-3 text-sm">
                {[['Estilo', project.style], ['BPM', String(project.bpm)], ['Tonalidade', project.key], ['Status', statusLabels[project.status]]].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-muted text-xs">{k}</p>
                    <p className="font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact owner */}
            {!isOwner && project.owner && (
              <Link href={`/chat/${project.owner.id}`}
                className="block w-full btn btn-secondary text-center">
                💬 Falar com o criador
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
