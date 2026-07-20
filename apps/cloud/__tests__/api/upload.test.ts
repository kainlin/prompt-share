import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../app/api/upload/route'
import { mockGetSession, mockStorageUpload } from '../setup'

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

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
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })

    const formData = new FormData()

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
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })

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
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })

    const largeBuffer = new Uint8Array(11 * 1024 * 1024).fill(65)
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
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })
    mockStorageUpload.mockResolvedValue({ error: null })

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
    expect(mockStorageUpload).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when upload to storage fails', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })
    mockStorageUpload.mockResolvedValue({ error: { message: 'Bucket not found' } })

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
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })
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
