-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  city TEXT DEFAULT '',
  instruments TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  experience TEXT DEFAULT 'iniciante',
  availability TEXT[] DEFAULT '{}',
  points INTEGER DEFAULT 0,
  avatar_color TEXT DEFAULT '#1E88E5',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create riffs table
CREATE TABLE IF NOT EXISTS riffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  audio_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  style TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  key TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_tracks table
CREATE TABLE IF NOT EXISTS project_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  musician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  filled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_discussions table
CREATE TABLE IF NOT EXISTS project_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create samples table
CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  key TEXT NOT NULL,
  license TEXT DEFAULT 'free' CHECK (license IN ('free', 'credit', 'non-commercial')),
  audio_url TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gigs table
CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  poster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('show', 'gravação', 'turnê', 'sessão')),
  dates TEXT NOT NULL,
  city TEXT NOT NULL,
  remote BOOLEAN DEFAULT FALSE,
  pay TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gig_applications table
CREATE TABLE IF NOT EXISTS gig_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gig_id, musician_id)
);

-- Create riff_likes table
CREATE TABLE IF NOT EXISTS riff_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  riff_id UUID NOT NULL REFERENCES riffs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(riff_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE riffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE riff_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for riffs
CREATE POLICY "Riffs are viewable by everyone" ON riffs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own riffs" ON riffs
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can update own riffs" ON riffs
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can delete own riffs" ON riffs
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- RLS Policies for projects
CREATE POLICY "Projects are viewable by everyone" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can insert projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = owner_id));

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = owner_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = owner_id));

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = owner_id));

-- RLS Policies for project_tracks
CREATE POLICY "Project tracks are viewable by everyone" ON project_tracks
  FOR SELECT USING (true);

CREATE POLICY "Project owners can manage tracks" ON project_tracks
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM profiles WHERE id IN (
      SELECT owner_id FROM projects WHERE id = project_id
    ))
  );

CREATE POLICY "Project owners can update tracks" ON project_tracks
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM profiles WHERE id IN (
      SELECT owner_id FROM projects WHERE id = project_id
    ))
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM profiles WHERE id IN (
      SELECT owner_id FROM projects WHERE id = project_id
    ))
  );

-- RLS Policies for project_discussions
CREATE POLICY "Discussions are viewable by everyone" ON project_discussions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert discussions" ON project_discussions
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can delete own discussions" ON project_discussions
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- RLS Policies for samples
CREATE POLICY "Samples are viewable by everyone" ON samples
  FOR SELECT USING (true);

CREATE POLICY "Users can insert samples" ON samples
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = creator_id));

CREATE POLICY "Users can update own samples" ON samples
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = creator_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = creator_id));

CREATE POLICY "Users can delete own samples" ON samples
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = creator_id));

-- RLS Policies for gigs
CREATE POLICY "Gigs are viewable by everyone" ON gigs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert gigs" ON gigs
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = poster_id));

CREATE POLICY "Users can update own gigs" ON gigs
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = poster_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = poster_id));

CREATE POLICY "Users can delete own gigs" ON gigs
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = poster_id));

-- RLS Policies for gig_applications
CREATE POLICY "Applications are viewable by everyone" ON gig_applications
  FOR SELECT USING (true);

CREATE POLICY "Users can insert applications" ON gig_applications
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = musician_id));

CREATE POLICY "Users can delete own applications" ON gig_applications
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = musician_id));

-- RLS Policies for riff_likes
CREATE POLICY "Likes are viewable by everyone" ON riff_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like riffs" ON riff_likes
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can unlike riffs" ON riff_likes
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = user_id));

-- Create indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_points ON profiles(points DESC);
CREATE INDEX idx_riffs_user_id ON riffs(user_id);
CREATE INDEX idx_riffs_created_at ON riffs(created_at DESC);
CREATE INDEX idx_riffs_tags ON riffs USING GIN(tags);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_tracks_project_id ON project_tracks(project_id);
CREATE INDEX idx_project_discussions_project_id ON project_discussions(project_id);
CREATE INDEX idx_samples_creator_id ON samples(creator_id);
CREATE INDEX idx_samples_category ON samples(category);
CREATE INDEX idx_samples_downloads ON samples(downloads DESC);
CREATE INDEX idx_gigs_poster_id ON gigs(poster_id);
CREATE INDEX idx_gigs_status ON gigs(status);
CREATE INDEX idx_gig_applications_gig_id ON gig_applications(gig_id);
CREATE INDEX idx_riff_likes_riff_id ON riff_likes(riff_id);
CREATE INDEX idx_riff_likes_user_id ON riff_likes(user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, bio, city, points)
  VALUES (
    NEW.id,
    COALESCE(NEW.user_metadata->>'name', NEW.email),
    '',
    '',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
