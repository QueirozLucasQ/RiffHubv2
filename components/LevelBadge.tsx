import { getUserLevel } from '@/lib/levels'

interface LevelBadgeProps {
  points: number
  size?: 'sm' | 'md' | 'lg'
}

export default function LevelBadge({ points, size = 'md' }: LevelBadgeProps) {
  const level = getUserLevel(points)

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  }

  return (
    <div
      className={`badge ${sizeClasses[size]} inline-flex gap-2`}
      style={{
        backgroundColor: `${level.color}20`,
        color: level.color,
        borderColor: level.color,
        border: '1px solid',
      }}
    >
      <span>{level.emoji}</span>
      <span className="font-semibold">{level.name}</span>
    </div>
  )
}
