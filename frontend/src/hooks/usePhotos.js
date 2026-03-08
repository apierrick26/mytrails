import { supabase } from '../lib/supabaseClient'

const BUCKET = 'photos'
const SIGNED_URL_TTL = 604800 // 7 days in seconds

export function usePhotos() {
  // Upload multiple files for a given activity.
  // Returns { photos: [...], error }
  async function uploadPhotos(activityId, files) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { photos: null, error: new Error('Not authenticated') }

    const uploaded = []
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      const timestamp = Date.now()
      const rand = Math.random().toString(36).slice(2, 7)
      const path = `${user.id}/${activityId}/${timestamp}_${rand}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false })

      if (uploadError) return { photos: null, error: uploadError }

      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert({
          activity_id: activityId,
          user_id: user.id,
          url: path, // store path, not a public URL
          position: uploaded.length,
        })
        .select()
        .single()

      if (dbError) return { photos: null, error: dbError }
      uploaded.push(photo)
    }

    return { photos: uploaded, error: null }
  }

  // Fetch all photos for a given activity, with signed URLs.
  async function fetchActivityPhotos(activityId) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('activity_id', activityId)
      .order('position', { ascending: true })

    if (error || !data?.length) return { photos: data || [], error }

    return resolveSignedUrls(data)
  }

  // Fetch all photos for the current user, joined with activity info.
  async function fetchAllPhotos() {
    const { data, error } = await supabase
      .from('photos')
      .select('*, activities(id, title, activity_type, date)')
      .order('created_at', { ascending: false })

    if (error || !data?.length) return { photos: data || [], error }

    return resolveSignedUrls(data)
  }

  // Fetch one cover photo per activity (first by position).
  // Returns a map: { [activityId]: signedUrl }
  async function fetchCoverPhotos(activityIds) {
    if (!activityIds.length) return { covers: {}, error: null }

    // Fetch all photos for those activities, ordered by position
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .in('activity_id', activityIds)
      .order('position', { ascending: true })

    if (error) return { covers: {}, error }

    // Keep only the first photo per activity
    const firstByActivity = {}
    for (const photo of data) {
      if (!firstByActivity[photo.activity_id]) {
        firstByActivity[photo.activity_id] = photo
      }
    }

    const coverPhotos = Object.values(firstByActivity)
    if (!coverPhotos.length) return { covers: {}, error: null }

    // Resolve signed URLs for cover photos
    const { photos: resolved, error: urlError } = await resolveSignedUrls(coverPhotos)
    if (urlError) return { covers: {}, error: urlError }

    const covers = {}
    for (const photo of resolved) {
      covers[photo.activity_id] = photo.signed_url
    }
    return { covers, error: null }
  }

  // Set a photo as cover (position 0) for its activity.
  async function setCoverPhoto(photoId, activityId) {
    const { data: photos, error: fetchError } = await supabase
      .from('photos')
      .select('id, position')
      .eq('activity_id', activityId)
      .order('position', { ascending: true })

    if (fetchError) return { error: fetchError }

    // Rebuild positions: chosen photo = 0, rest = 1, 2, ...
    const updates = [
      { id: photoId, position: 0 },
      ...photos.filter((p) => p.id !== photoId).map((p, i) => ({ id: p.id, position: i + 1 })),
    ]

    for (const { id, position } of updates) {
      const { error } = await supabase.from('photos').update({ position }).eq('id', id)
      if (error) return { error }
    }
    return { error: null }
  }

  // Delete a photo from storage and the DB.
  async function deletePhoto(photo) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([photo.url])

    if (storageError) return { error: storageError }

    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photo.id)

    return { error: dbError }
  }

  // Fetch photos in Storage that have no matching row in the photos table.
  async function fetchUnclassifiedPhotos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { photos: [], error: new Error('Not authenticated') }

    // 1. Collect all DB-tracked paths for this user
    const { data: dbRows } = await supabase
      .from('photos')
      .select('url')
      .eq('user_id', user.id)
    const dbPaths = new Set((dbRows || []).map((r) => r.url))

    // 2. Walk Storage tree: list top-level items under userId/
    const { data: topItems, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(user.id)
    if (listError) return { photos: [], error: listError }

    const storageFiles = []
    for (const item of topItems || []) {
      if (item.id === null) {
        // Folder — list its children
        const { data: subItems } = await supabase.storage
          .from(BUCKET)
          .list(`${user.id}/${item.name}`)
        for (const sub of subItems || []) {
          if (sub.id !== null) {
            storageFiles.push({ path: `${user.id}/${item.name}/${sub.name}`, metadata: sub.metadata })
          }
        }
      } else {
        // Top-level file (e.g. from mobile direct upload)
        storageFiles.push({ path: `${user.id}/${item.name}`, metadata: item.metadata })
      }
    }

    // 3. Keep only paths absent from the DB
    const orphans = storageFiles.filter((f) => !dbPaths.has(f.path))
    if (!orphans.length) return { photos: [], error: null }

    // 4. Resolve signed URLs
    const paths = orphans.map((f) => f.path)
    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL)
    if (signedError) return { photos: [], error: signedError }

    const urlMap = {}
    for (const entry of signed || []) {
      if (entry.signedUrl) urlMap[entry.path] = entry.signedUrl
    }

    const photos = orphans.map((f) => ({
      id: f.path,                            // no DB id, use path as stable key
      url: f.path,
      signed_url: urlMap[f.path] || null,
      created_at: f.metadata?.lastModified || null,
    }))

    return { photos, error: null }
  }

  // Link an unclassified Storage file to an existing activity.
  async function attachPhotoToActivity(storagePath, activityId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const { data: existing } = await supabase
      .from('photos')
      .select('position')
      .eq('activity_id', activityId)
      .order('position', { ascending: false })
      .limit(1)
    const nextPosition = existing?.[0]?.position != null ? existing[0].position + 1 : 0

    const { error } = await supabase
      .from('photos')
      .insert({ activity_id: activityId, user_id: user.id, url: storagePath, position: nextPosition })

    return { error }
  }

  return { uploadPhotos, fetchActivityPhotos, fetchAllPhotos, fetchCoverPhotos, deletePhoto, setCoverPhoto, fetchUnclassifiedPhotos, attachPhotoToActivity }
}

// ── Internal helper ──────────────────────────────────────────────────────────

async function resolveSignedUrls(photos) {
  const paths = photos.map((p) => p.url)

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL)

  if (error) return { photos, error }

  // Build a map path → signedUrl
  const urlMap = {}
  for (const entry of signed) {
    if (entry.signedUrl) urlMap[entry.path] = entry.signedUrl
  }

  const resolved = photos.map((p) => ({
    ...p,
    signed_url: urlMap[p.url] || null,
  }))

  return { photos: resolved, error: null }
}
