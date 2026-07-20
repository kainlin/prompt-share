import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../app/api/upload/route'

// Mock Supabase server (auth)
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}))

// Mock supabase-js admin client
const mockUpload = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
      })),
    },
  })),
}))

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when no file is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } }, error: null })

    const formData = new FormData()
    // No file appended

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No file provided')
  })

  it('returns 400 for invalid file type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } }, error: null })

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid file type')
  })

  it('returns 400 for file too large', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } }, error: null })

    // Create a Blob larger than 10MB
    const largeBuffer = new Uint8Array(11 * 1024 * 1024).fill(65) // 'A' x 11MB
    const formData = new FormData()
    formData.append('file', new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' }))

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('File too large')
  })

  it('successfully uploads a valid image and returns URL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } }, error: null })
    mockUpload.mockResolvedValue({ error: null })

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

    const formData = new FormData()
    formData.append('file', new File(['fake-image-data'], 'cover.jpg', { type: 'image/jpeg' }))

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.url).toContain('https://test.supabase.co/storage/v1/object/public/prompt-images/uploads/user-1/')
    expect(body.path).toContain('uploads/user-1/')
    expect(mockUpload).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when upload to storage fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } }, error: null })
    mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } })

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

    const formData = new FormData()
    formData.append('file', new File(['data'], 'img.png', { type: 'image/png' }))

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Bucket not found')
  })

  it('returns 500 when service key is not configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } }, error: null })
    // Unset service role key
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const formData = new FormData()
    formData.append('file', new File(['data'], 'img.jpg', { type: 'image/jpeg' }))

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Server not configured for uploads')
  })
})
