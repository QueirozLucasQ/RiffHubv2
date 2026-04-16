import Link from 'next/link'
import type { Project } from '@/lib/types'

interface ProjectCardProps {
  project: Project & { owner?: any; tracks?: any[] }
}

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  completed: 'Concluído',
}

const statusColors: Record<string, string> = {
  open: '#1E88E5',
  in_progress: '#F57C00',
  completed: '#43A047',
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const filledTracks = project.tracks?.filter((t) => t.filled).length || 0
  const totalTracks = project.tracks?.length || 0
  const progressPercent = totalTracks > 0 ? (filledTracks / totalTracks) * 100 : 0

  return (
    <Link href={`/collab/${project.id}`}>
      <div className="card hover:border-blue transition-colors h-full cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">{project.title}</h3>
            {project.owner && (
              <p className="text-sm text-muted">
                por{' '}
                <span className="text-white hover:text-red">
                  {project.owner.name}
                </span>
              </p>
            )}
          </div>
          <div
            className="badge text-xs"
            style={{
              backgroundColor: `${statusColors[project.status]}20`,
              color: statusColors[project.status],
              borderColor: statusColors[project.status],
              border: '1px solid',
            }}
          >
            {statusLabels[project.status]}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Tech Details */}
        <div className="flex gap-3 text-xs text-subtle mb-4 pb-4 border-b border-border">
          <span>🎵 {project.style}</span>
          <span>⏱ {project.bpm} BPM</span>
          <span>🎼 {project.key}</span>
        </div>

        {/* Tracks Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted">Instrumentos</span>
            <span className="text-white">
              {filledTracks}/{totalTracks}
            </span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-blue transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Track Preview */}
        {project.tracks && project.tracks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.tracks.slice(0, 5).map((track, idx) => (
              <div
                key={track.id}
                className="text-xs px-2 py-1 rounded-sm"
                style={{
                  backgroundColor: track.filled ? '#43A04720' : '#2A2A3A',
                  color: track.filled ? '#43A047' : '#9CA3AF',
                }}
              >
                {track.instrument}
              </div>
            ))}
            {project.tracks.length > 5 && (
              <div className="text-xs text-muted px-2 py-1">
                +{project.tracks.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-sm text-blue hover:text-blue-dark">
          Saiba mais →
        </div>
      </div>
    </Link>
  )
}
