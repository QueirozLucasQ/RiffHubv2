export interface Profile {
  id: string
  name: string
  bio: string
  city: string
  instruments: string[]
  genres: string[]
  experience: string
  availability: string[]
  points: number
  avatar_color: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Riff {
  id: string
  title: string
  description: string
  audio_url: string
  tags: string[]
  user_id: string
  plays: number
  created_at: string
  updated_at: string
  user?: Profile
  likes_count?: number
  is_liked?: boolean
}

export interface Project {
  id: string
  title: string
  description: string
  owner_id: string
  style: string
  bpm: number
  key: string
  status: 'open' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  owner?: Profile
  tracks?: ProjectTrack[]
  discussions?: ProjectDiscussion[]
}

export interface ProjectTrack {
  id: string
  project_id: string
  instrument: string
  musician_id: string | null
  filled: boolean
  created_at: string
  musician?: Profile
}

export interface ProjectDiscussion {
  id: string
  project_id: string
  user_id: string
  text: string
  created_at: string
  user?: Profile
}

export interface Sample {
  id: string
  title: string
  creator_id: string
  category: string
  bpm: number
  key: string
  license: 'free' | 'credit' | 'non-commercial'
  audio_url: string
  downloads: number
  tags: string[]
  created_at: string
  updated_at: string
  creator?: Profile
}

export interface Gig {
  id: string
  title: string
  poster_id: string
  instrument: string
  type: 'show' | 'gravação' | 'turnê' | 'sessão'
  dates: string
  city: string
  remote: boolean
  pay: string
  description: string
  status: 'open' | 'filled'
  created_at: string
  updated_at: string
  poster?: Profile
  applications_count?: number
}

export interface GigApplication {
  id: string
  gig_id: string
  musician_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  musician?: Profile
}

export interface RiffLike {
  id: string
  riff_id: string
  user_id: string
  created_at: string
}

export interface Level {
  name: string
  minPoints: number
  color: string
  emoji: string
}
