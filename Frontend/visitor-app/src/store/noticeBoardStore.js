const STORAGE_KEY = 'vm_notice_board_notices_v1'

const defaultNotices = [
  {
    id: 401,
    title: 'New visitor registration policy',
    category: 'Policy',
    postedBy: 'Admin',
    date: 'Apr 12, 2026',
    status: 'published',
    description: '',
  },
  {
    id: 402,
    title: 'Emergency contact update',
    category: 'Alert',
    postedBy: 'Security',
    date: 'Apr 11, 2026',
    status: 'draft',
    description: '',
  },
]

export function loadNotices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultNotices
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : defaultNotices
  } catch {
    return defaultNotices
  }
}

export function saveNotices(notices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(notices) ? notices : []))
  } catch {
    // ignore
  }
}

export function getLatestNotice(notices) {
  const list = Array.isArray(notices) ? notices : []
  if (list.length === 0) return null

  const withDates = list
    .map((n) => ({ n, t: Date.parse(n?.date ?? '') }))
    .sort((a, b) => {
      if (Number.isNaN(a.t) && Number.isNaN(b.t)) return 0
      if (Number.isNaN(a.t)) return 1
      if (Number.isNaN(b.t)) return -1
      return b.t - a.t
    })

  return withDates[0]?.n ?? list[0] ?? null
}

