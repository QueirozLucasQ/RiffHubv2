'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfile } from '@/lib/getOrCreateProfile'
import AudioPlayer from '@/components/AudioPlayer'
import type { Project, ProjectTrack, ProjectDiscussion } from '@/lib/types'

interface ProjectDetailProps { params: { id: string } }

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const STYLES = ['Rock', 'Jazz', 'Pop', 'Samba', 'MPB', 'Funk', 'Blues', 'Metal', 'Eletrônica', 'Reggae', 'Forró', 'Outro']

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const router = useRouter()
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

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '', description: '', style: '', bpm: '', key: 'C', instruments: [''] as string[],
  })
  const [editSaving, setEditSaving] = useState(false)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Status
  const [statusSaving, setStatusSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => { fetchAll() }, [params.id])

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
        // Pre-fill edit form
        setEditForm({
          title: proj.title || '',
          description: proj.description || '',
          style: proj.style || '',
          bpm: String(proj.bpm || ''),
          key: proj.key || 'C',
          instruments: [''],
        })
      }
      if (trk) setTracks(trk)
      if (disc) setDiscussions(disc)

      if (me) {
        const { data: existingApp } = await supabase
          .from('project_applications').select('id')
          .eq('project_id', params.id).eq('applicant_id', me.id).maybeSingle()
        if (existingApp) setHasApplied(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    const { data } = await supabase
      .from('project_applications').select('*, applicant:profiles(*)')
      .eq('project_id', params.id).order('created_at', { ascending: false })
    setApplications(data || [])
  }

  const handlePropose = async () => {
    if (!proposeInstrument.trim() || !project || !myProfile) return
    setProposing(true); setProposeError('')
    try {
      let audioUrl: string | null = null
      if (proposeAudio) {
        const ext = proposeAudio.name.split('.').pop()
        const path = `applications/${project.id}/${myProfile.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('audio').upload(path, proposeAudio)
        if (uploadErr) throw uploadErr
        audioUrl = supabase.storage.from('audio').getPublicUrl(path).data.publicUrl
      }

      const { error } = await supabase.from('project_applications').insert({
        project_id: project.id, instrument: proposeInstrument,
        applicant_id: myProfile.id, message: proposeMessage,
        audio_url: audioUrl, status: 'pending',
      })
      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: project.owner_id, type: 'collab_request',
        title: `${myProfile.name} quer participar do seu projeto`,
        body: `Instrumento: ${proposeInstrument}${proposeMessage ? ` · "${proposeMessage}"` : ''}`,
        link: `/collab/${project.id}`, read: false,
      })

      setHasApplied(true); setProposeDone(true)
      setProposeInstrument(''); setProposeMessage(''); setProposeAudio(null)
    } catch (err: any) {
      if (err?.code === '23505') { setProposeError('Você já se candidatou a este projeto'); setHasApplied(true) }
      else setProposeError(err?.message || 'Erro ao enviar proposta')
    } finally {
      setProposing(false)
    }
  }

  const handleApplicationAction = async (app: any, action: 'accepted' | 'rejected') => {
    try {
      await supabase.from('project_applications').update({ status: action }).eq('id', app.id)
      await supabase.from('notifications').insert({
        user_id: app.applicant_id,
        type: action === 'accepted' ? 'collab_accepted' : 'collab_rejected',
        title: action === 'accepted' ? `✅ Proposta aceita em "${project!.title}"` : `❌ Proposta recusada em "${project!.title}"`,
        body: `Instrumento: ${app.instrument}`,
        link: `/collab/${project!.id}`, read: false,
      })
      if (action === 'accepted') {
        // Mark the matching track as filled, or insert new track
        const matchingTrack = tracks.find(t => !t.filled && t.instrument.toLowerCase() === app.instrument.toLowerCase())
        if (matchingTrack) {
          await supabase.from('project_tracks').update({ musician_id: app.applicant_id, filled: true }).eq('id', matchingTrack.id)
        } else {
          await supabase.from('project_tracks').insert({
            project_id: project!.id, instrument: app.instrument, musician_id: app.applicant_id, filled: true,
          })
        }
        const { data: trk } = await supabase.from('project_tracks').select('*, musician:profiles(*)').eq('project_id', project!.id)
        if (trk) setTracks(trk)
      }
      fetchApplications()
    } catch (err) { console.error(err) }
  }

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'completed') => {
    if (!project) return
    setStatusSaving(true)
    try {
      await supabase.from('projects').update({ status: newStatus }).eq('id', project.id)
      setProject(prev => prev ? { ...prev, status: newStatus } : prev)
    } finally {
      setStatusSaving(false)
    }
  }

  const handleEditProject = async () => {
    if (!project || !editForm.title || !editForm.style || !editForm.bpm) return
    setEditSaving(true)
    try {
      await supabase.from('projects').update({
        title: editForm.title,
        description: editForm.description,
        style: editForm.style,
        bpm: parseInt(editForm.bpm),
        key: editForm.key,
      }).eq('id', project.id)

      // Add new instruments
      const validNew = editForm.instruments.filter(i => i.trim())
      if (validNew.length > 0) {
        await supabase.from('project_tracks').insert(
          validNew.map(inst => ({ project_id: project.id, instrument: inst, filled: false }))
        )
        const { data: trk } = await supabase.from('project_tracks').select('*, musician:profiles(*)').eq('project_id', project.id)
        if (trk) setTracks(trk)
      }

      setProject(prev => prev ? {
        ...prev, title: editForm.title, description: editForm.description,
        style: editForm.style, bpm: parseInt(editForm.bpm), key: editForm.key,
      } : prev)
      setEditForm(f => ({ ...f, instruments: [''] }))
      setShowEditModal(false)
    } catch (err) { console.error(err) }
    finally { setEditSaving(false) }
  }

  const handleDeleteProject = async () => {
    if (!project) return
    setDeleting(true)
    try {
      await supabase.from('project_applications').delete().eq('project_id', project.id)
      await supabase.from('project_discussions').delete().eq('project_id', project.id)
      await supabase.from('project_tracks').delete().eq('project_id', project.id)
      await supabase.from('projects').delete().eq('id', project.id)
      router.push('/collab')
    } catch (err) { console.error(err) }
    finally { setDeleting(false) }
  }

  const handleRemoveTrack = async (trackId: string) => {
    await supabase.from('project_tracks').delete().eq('id', trackId)
    setTracks(prev => prev.filter(t => t.id !== trackId))
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !project || !myProfile) return
    setSendingMsg(true)
    try {
      const { data: newMsg, error } = await supabase
        .from('project_discussions').insert({ project_id: project.id, user_id: myProfile.id, text: messageText })
        .select('*, user:profiles(*)').single()
      if (error) throw error
      if (newMsg) { setDiscussions(prev => [newMsg, ...prev]); setMessageText('') }
    } finally { setSendingMsg(false) }
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
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold">{project.title}</h1>
              <span className="text-sm px-3 py-1 rounded-full font-medium flex-shrink-0"
                style={{ background: `${statusColors[project.status]}20`, color: statusColors[project.status] }}>
                {statusLabels[project.status]}
              </span>
            </div>

            {/* Owner controls */}
            {isOwner && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--subtle)' }}>
                  ✏️ Editar
                </button>

                {/* Status change */}
                {project.status !== 'in_progress' && project.status !== 'completed' && (
                  <button onClick={() => handleStatusChange('in_progress')} disabled={statusSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                    style={{ background: 'rgba(253,224,71,0.12)', border: '1px solid rgba(253,224,71,0.3)', color: '#FDE047' }}>
                    ▶ Em Andamento
                  </button>
                )}
                {project.status !== 'completed' && (
                  <button onClick={() => handleStatusChange('completed')} disabled={statusSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                    style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}>
                    ✓ Concluir
                  </button>
                )}
                {project.status === 'completed' && (
                  <button onClick={() => handleStatusChange('open')} disabled={statusSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    ↩ Reabrir
                  </button>
                )}

                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                  style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', color: '#f87171' }}>
                  🗑 Excluir
                </button>
              </div>
            )}
          </div>

          {project.description && <p className="text-lg text-muted mb-4">{project.description}</p>}
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

            {/* Owner: history */}
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
                    <div key={track.id} className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--dark)', border: '1px solid var(--border)' }}>
                      <div>
                        <p className="font-semibold">{track.instrument}</p>
                        {track.musician && <p className="text-sm text-muted">{track.musician.name}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${track.filled ? 'text-green-400' : 'text-yellow-400'}`}>
                          {track.filled ? '✓ Preenchido' : '○ Vago'}
                        </span>
                        {isOwner && !track.filled && (
                          <button onClick={() => handleRemoveTrack(track.id)}
                            className="text-xs px-2 py-0.5 rounded transition hover:opacity-80"
                            style={{ color: '#f87171', border: '1px solid rgba(229,57,53,0.3)' }}>
                            ✕
                          </button>
                        )}
                      </div>
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
            {!isOwner && project.status !== 'completed' && (
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
                          placeholder="Apresente-se brevemente..." rows={2}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition"
                          style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }} />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">🎵 Áudio de demonstração (opcional)</label>
                        <input type="file" accept="audio/*" onChange={e => setProposeAudio(e.target.files?.[0] || null)}
                          className="w-full text-xs" style={{ color: 'var(--muted)' }} />
                      </div>
                    </div>
                    {proposeError && (
                      <p className="text-xs mt-2 px-2 py-1.5 rounded" style={{ background: 'rgba(229,57,53,0.15)', color: '#f87171', border: '1px solid rgba(229,57,53,0.3)' }}>
                        ⚠ {proposeError}
                      </p>
                    )}
                    <button onClick={handlePropose} disabled={proposing || !proposeInstrument.trim()}
                      className="w-full btn btn-primary btn-sm mt-3"
                      style={{ opacity: (!proposeInstrument.trim() || proposing) ? 0.4 : 1 }}>
                      {proposing ? 'Enviando...' : 'Enviar Proposta'}
                    </button>
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
                      <p className="text-xs text-muted">Criador 👑</p>
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

            {!isOwner && project.owner && (
              <Link href={`/chat/${project.owner.id}`} className="block w-full btn btn-secondary text-center">
                💬 Falar com o criador
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Editar Projeto</h2>
              <button onClick={() => setShowEditModal(false)} className="text-muted hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1 font-medium uppercase">Título *</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1 font-medium uppercase">Descrição</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2} className="w-full px-4 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-2 font-medium uppercase">Estilo *</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setEditForm({ ...editForm, style: s })}
                      className="px-3 py-1 rounded text-sm transition"
                      style={{ background: editForm.style === s ? 'var(--red)' : 'var(--dark)', color: editForm.style === s ? 'white' : 'var(--muted)', border: `1px solid ${editForm.style === s ? 'var(--red)' : 'var(--border)'}` }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1 font-medium uppercase">BPM *</label>
                  <input type="number" value={editForm.bpm} onChange={e => setEditForm({ ...editForm, bpm: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }}
                    placeholder="120" min="40" max="300" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1 font-medium uppercase">Tonalidade</label>
                  <select value={editForm.key} onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }}>
                    {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-2 font-medium uppercase">Adicionar Instrumentos</label>
                {editForm.instruments.map((inst, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" value={inst}
                      onChange={e => { const u = [...editForm.instruments]; u[idx] = e.target.value; setEditForm({ ...editForm, instruments: u }) }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--dark)', border: '1px solid var(--border)', color: 'var(--white)' }}
                      placeholder="Ex: Guitarra, Baixo..." />
                    {idx > 0 && (
                      <button onClick={() => setEditForm({ ...editForm, instruments: editForm.instruments.filter((_, i) => i !== idx) })}
                        className="text-red-400 px-2">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEditForm({ ...editForm, instruments: [...editForm.instruments, ''] })}
                  className="text-sm" style={{ color: 'var(--blue-light)' }}>
                  + Adicionar instrumento
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleEditProject} disabled={editSaving || !editForm.title || !editForm.style || !editForm.bpm}
                className="btn btn-primary flex-1">
                {editSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
                style={{ background: 'rgba(229,57,53,0.12)' }}>🗑</div>
              <h2 className="text-xl font-bold mb-2">Excluir Projeto?</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Isso vai excluir <span className="font-semibold text-white">"{project.title}"</span> permanentemente, incluindo todas as candidaturas e discussões.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeleteProject} disabled={deleting}
                className="flex-1 btn btn-sm font-semibold"
                style={{ background: 'var(--red)', color: 'white' }}>
                {deleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn btn-secondary btn-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
