import { createClient } from '@/lib/supabase/client'

export async function getOrCreateProfile() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Try to get existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (existing) return existing

  // Create profile if it doesn't exist
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Músico'

  const { data: created } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, name, bio: '', city: '', points: 0 })
    .select()
    .single()

  return created
}
