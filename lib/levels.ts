import { Level } from './types'

export const LEVELS: Level[] = [
  {
    name: 'Novato',
    minPoints: 0,
    color: '#6B7280',
    emoji: '🎸',
  },
  {
    name: 'Sideman',
    minPoints: 100,
    color: '#1E88E5',
    emoji: '🎹',
  },
  {
    name: 'Session Player',
    minPoints: 500,
    color: '#7B1FA2',
    emoji: '🎤',
  },
  {
    name: 'Referência',
    minPoints: 1500,
    color: '#E53935',
    emoji: '⭐',
  },
  {
    name: 'Lenda',
    minPoints: 5000,
    color: '#F57C00',
    emoji: '👑',
  },
]

export function getUserLevel(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

export function getNextLevel(points: number): Level | null {
  const currentLevel = getUserLevel(points)
  const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name)

  if (currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1]
  }

  return null
}

export function getLevelProgress(points: number): {
  current: Level
  next: Level | null
  progress: number
  pointsToNext: number
} {
  const current = getUserLevel(points)
  const next = getNextLevel(points)

  const currentMinPoints = current.minPoints
  const nextMinPoints = next ? next.minPoints : current.minPoints + 1000

  const progress = Math.min(
    100,
    Math.round(
      ((points - currentMinPoints) / (nextMinPoints - currentMinPoints)) * 100
    )
  )

  const pointsToNext = Math.max(0, nextMinPoints - points)

  return { current, next, progress, pointsToNext }
}
