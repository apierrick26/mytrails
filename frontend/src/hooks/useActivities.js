import { supabase } from '../lib/supabaseClient'

export function useActivities() {
  async function createActivity(data) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: activity, error } = await supabase
      .from('activities')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    return { activity, error }
  }

  async function fetchActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('date', { ascending: false })
    return { data, error }
  }

  async function deleteActivity(id) {
    const { error } = await supabase.from('activities').delete().eq('id', id)
    return { error }
  }

  async function updateActivity(id, data) {
    const { data: activity, error } = await supabase
      .from('activities')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    return { activity, error }
  }

  return { createActivity, fetchActivities, deleteActivity, updateActivity }
}
