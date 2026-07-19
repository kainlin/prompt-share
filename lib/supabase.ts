import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

// Public client — for browser read-only access to Storage
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key'
)

// Service client — for server-side uploads (import script)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey || 'placeholder-key'
)

export const STORAGE_BUCKET = 'prompt-images'
export const SUPABASE_STORAGE_URL = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}`

export function getImageUrl(filename: string): string {
  return `${SUPABASE_STORAGE_URL}/${filename}`
}

/**
 * Map a full image filename (caseN_full.ext) to its corresponding thumbnail.
 * Thumbnails are stored as caseN_thumb.webp regardless of source format.
 */
function toThumbnailFilename(filename: string): string {
  const m = filename.match(/^(case\d+)_full\.\w+$/)
  return m ? `${m[1]}_thumb.webp` : filename
}

export function getThumbnailUrl(filename: string): string {
  return `${SUPABASE_STORAGE_URL}/thumbnails/${toThumbnailFilename(filename)}`
}

export function getFullImageUrl(filename: string): string {
  return `${SUPABASE_STORAGE_URL}/full/${filename}`
}
