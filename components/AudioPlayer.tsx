'use client'

import { useRef, useEffect, useState } from 'react'

interface AudioPlayerProps {
  src: string
  title?: string
}

let currentAudio: HTMLAudioElement | null = null

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    const handlePlay = () => {
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause()
      }
      currentAudio = audio
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handlePause)
    }
  }, [])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const div = e.currentTarget
    const clickX = e.clientX - div.getBoundingClientRect().left
    const percentage = clickX / div.offsetWidth
    if (audioRef.current) {
      audioRef.current.currentTime = percentage * duration
    }
  }

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full">
      <audio ref={audioRef} src={src} />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-red hover:bg-red-dark flex items-center justify-center transition-colors flex-shrink-0"
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4v12h3V4H5zm7 0v12h3V4h-3z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.555 5.168L14.445 10 4.555 14.832V5.168z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="h-1 bg-border rounded-full cursor-pointer hover:bg-red transition-colors relative group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-red rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            {duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            )}
          </div>
        </div>

        <span className="text-xs text-muted whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {title && <p className="text-sm text-subtle mt-2">{title}</p>}
    </div>
  )
}
