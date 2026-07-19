const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

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
