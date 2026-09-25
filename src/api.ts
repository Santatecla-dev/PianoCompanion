export type ApiUser = { id: string; name: string; email: string; level: string; createdAt: string }
export type AuthResponse = { accessToken: string; user: ApiUser }
export type ApiPiece = { id: string; title: string; composer: string; difficulty: string; era: string | null; key: string | null; yearComposed: number | null }
export type PracticeSession = { id: string; durationSeconds: number; startedAt: string; notes: string | null; piece: ApiPiece | null }
export type Milestone = { id: string; title: string; date: string; kind: 'exam' | 'concert' | 'audition' | 'event'; notes: string | null }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = window.localStorage.getItem('piano-companion-token')
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) } })
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null
  if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Something went wrong')
  return payload as T
}

export function registerUser(input: { name: string; email: string; password: string; level: string }) {
  return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export function loginUser(input: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export function getPieces() { return request<ApiPiece[]>('/pieces') }

export function createPracticeSession(input: { pieceId?: string; durationSeconds: number }) {
  return request<PracticeSession>('/practice/sessions', { method: 'POST', body: JSON.stringify(input) })
}

export function getPracticeSessions() { return request<PracticeSession[]>('/practice/sessions') }
export function updatePracticeSession(id: string, input: { durationSeconds?: number; date?: string; pieceId?: string | null }) { return request<PracticeSession>(`/practice/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }) }
export function deletePracticeSession(id: string) { return request<{ deleted: boolean }>(`/practice/sessions/${id}`, { method: 'DELETE' }) }
export function getMilestones() { return request<Milestone[]>('/milestones') }
export function createMilestone(input: { title: string; date: string; kind: Milestone['kind']; notes?: string }) { return request<Milestone>('/milestones', { method: 'POST', body: JSON.stringify(input) }) }
export function updateMilestone(id: string, input: Partial<Omit<Milestone, 'id'>>) { return request<Milestone>(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(input) }) }
export function deleteMilestone(id: string) { return request<{ deleted: boolean }>(`/milestones/${id}`, { method: 'DELETE' }) }
