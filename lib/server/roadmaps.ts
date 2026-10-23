import type { CurrentUser } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError } from '@/lib/server/http'
import { studentId } from '@/lib/server/skill-verification'

export type RoadmapStep = { skill: string; why: string }
export type Roadmap = {
  id: string
  role: string
  summary: string
  keywords: string[]
  steps: RoadmapStep[]
  marketRank?: number | null
  marketResearchVersion?: number
}

type SnapshotRow = {
  roadmaps: string | Roadmap[]
  sources: string | { title: string; url: string }[]
  market: string
  month: string
  updated_at: Date
}

type GeneratedSkill = { skill: string; why: string }
type GeneratedRole = {
  role: string
  summary: string
  keywords: string[]
  market_rank: number
  skills: GeneratedSkill[]
}
type GeneratedSet = { top_roles: GeneratedRole[] }

const MARKET_ROADMAP_VERSION = 2
const TOP_ROLE_COUNT = 25
const failedRefreshes = new Map<string, number>()
const failedRefreshMessages = new Map<string, string>()
const refreshLocks = new Map<string, Promise<void>>()

function refreshFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'ROADMAP_GEMINI_API_KEY is not configured for roadmap research.') {
    return 'Add ROADMAP_GEMINI_API_KEY to the project-root .env.local file and restart Next.js.'
  }
  if (error instanceof Error && error.message.startsWith('Gemini roadmap research failed with HTTP ')) {
    const status = Number(error.message.match(/HTTP (\d+)/)?.[1])
    if (status === 400) return 'Google rejected the roadmap request. Check the roadmap model and request settings.'
    if (status === 401 || status === 403) return 'Google rejected the roadmap key or its permissions. Check ROADMAP_GEMINI_API_KEY and API access.'
    if (status === 404) return 'The configured roadmap Gemini model is unavailable. Check ROADMAP_GEMINI_MODEL.'
    if (status === 429) return 'The roadmap Gemini key has reached its quota or rate limit.'
    if (status >= 500) return 'Google Gemini is temporarily unavailable. Try again later.'
  }
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return 'Market research timed out. Try again later.'
  }
  if (error instanceof Error && error.message === 'Gemini returned no verifiable market sources.') {
    return 'Gemini returned no source citations. Try again later.'
  }
  if (error instanceof SyntaxError || (error instanceof Error && /generated trending-role|Gemini must return exactly|duplicate trending roles|duplicate role identifiers|ranking was incomplete|too few technical skills/i.test(error.message))) {
    return 'Gemini returned an incomplete or invalid top-25 result. Try again later.'
  }
  return 'Market research failed unexpectedly. Check the Next.js terminal for details.'
}

function parseJson<T>(value: T | string): T {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as T
  } catch {
    throw new ApiError('Stored roadmap data is invalid.', 500)
  }
}

function snapshotResponse(snapshot: SnapshotRow, isCurrent: boolean) {
  return {
    roadmaps: parseJson(snapshot.roadmaps),
    sources: parseJson(snapshot.sources),
    market: snapshot.market,
    month: snapshot.month,
    updatedAt: `${new Date(snapshot.updated_at).toISOString().replace(/Z$/, '')}Z`,
    isCurrent,
  }
}

function isCurrentTopRoleSnapshot(value: Roadmap[]): boolean {
  return Array.isArray(value)
    && value.length === TOP_ROLE_COUNT
    && value.every((roadmap) => roadmap.marketResearchVersion === MARKET_ROADMAP_VERSION)
}

function cleanedSkill(value: unknown): GeneratedSkill | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.skill !== 'string' || !item.skill.trim() || item.skill.length > 120) return null
  return {
    skill: item.skill.trim(),
    why: typeof item.why === 'string' ? item.why.slice(0, 300) : '',
  }
}

function buildTopMarketRoadmaps(generated: GeneratedSet): Roadmap[] {
  if (!generated || !Array.isArray(generated.top_roles) || generated.top_roles.length !== TOP_ROLE_COUNT) {
    throw new Error(`Gemini must return exactly ${TOP_ROLE_COUNT} trending roles.`)
  }

  const ranks = new Set<number>()
  const roles = new Set<string>()
  const ids = new Set<string>()
  const roadmaps = generated.top_roles.map((item) => {
    if (!item || typeof item.role !== 'string' || !item.role.trim() || item.role.length > 160
      || typeof item.summary !== 'string' || !item.summary.trim()
      || !Array.isArray(item.keywords) || !Array.isArray(item.skills)
      || !Number.isInteger(item.market_rank) || item.market_rank < 1 || item.market_rank > TOP_ROLE_COUNT
      || ranks.has(item.market_rank)) {
      throw new Error('The generated trending-role data was invalid.')
    }

    const role = item.role.trim()
    const roleKey = role.toLowerCase()
    if (roles.has(roleKey)) throw new Error('Gemini returned duplicate trending roles.')
    roles.add(roleKey)
    ranks.add(item.market_rank)

    const idBase = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65)
    const id = `${idBase || 'trending-role'}-${item.market_rank}`
    if (ids.has(id)) throw new Error('Gemini returned duplicate role identifiers.')
    ids.add(id)

    const steps: RoadmapStep[] = []
    const seenSkills = new Set<string>()
    for (const suggestion of item.skills) {
      const step = cleanedSkill(suggestion)
      if (step && !seenSkills.has(step.skill.toLowerCase())) {
        steps.push(step)
        seenSkills.add(step.skill.toLowerCase())
      }
    }
    if (steps.length < 5) throw new Error(`Gemini returned too few technical skills for ${role}.`)

    return {
      id,
      role,
      summary: item.summary.trim().slice(0, 500),
      keywords: item.keywords
        .filter((value): value is string => typeof value === 'string' && !!value.trim())
        .map((value) => value.trim().slice(0, 80))
        .slice(0, 30),
      steps,
      marketRank: item.market_rank,
      marketResearchVersion: MARKET_ROADMAP_VERSION,
    }
  })

  if (ranks.size !== TOP_ROLE_COUNT
    || Array.from({ length: TOP_ROLE_COUNT }, (_, index) => index + 1).some((rank) => !ranks.has(rank))) {
    throw new Error('The generated trending-role ranking was incomplete.')
  }
  return roadmaps.sort((left, right) => (left.marketRank ?? Number.MAX_SAFE_INTEGER) - (right.marketRank ?? Number.MAX_SAFE_INTEGER))
}

async function generateMarketRoadmaps(market: string) {
  const apiKey = process.env.ROADMAP_GEMINI_API_KEY
  if (!apiKey) throw new Error('ROADMAP_GEMINI_API_KEY is not configured for roadmap research.')
  const model = process.env.ROADMAP_GEMINI_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-3.8-flash'
  const prompt = `Research current internship and entry-level hiring demand in ${market}. Using Google Search, identify exactly 25 distinct technical roles with strong current demand in real recent job postings. Rank them from 1 (highest observed demand) to 25. For every role, provide a concise summary, search keywords, and 5 to 20 role-specific technical skills explicitly requested in recent postings. Include only technical skills such as programming languages, frameworks, platforms, tools, technical methods, and domain technologies; do not include soft skills. Avoid duplicate or overly broad role titles. Use recent evidence, and do not claim the results are exhaustive. Return JSON only in the required schema.`

  const responseSchema = {
    type: 'object',
    properties: {
      top_roles: {
        type: 'array',
        minItems: TOP_ROLE_COUNT,
        maxItems: TOP_ROLE_COUNT,
        items: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            summary: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            market_rank: { type: 'integer', minimum: 1, maximum: TOP_ROLE_COUNT },
            skills: {
              type: 'array',
              minItems: 5,
              maxItems: 20,
              items: {
                type: 'object',
                properties: { skill: { type: 'string' }, why: { type: 'string' } },
                required: ['skill', 'why'],
              },
            },
          },
          required: ['role', 'summary', 'keywords', 'market_rank', 'skills'],
        },
      },
    },
    required: ['top_roles'],
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model,
      input: prompt,
      system_instruction: 'Research carefully and return valid JSON that matches the supplied schema. Ground findings in recent job listings from the requested market.',
      tools: [{ type: 'google_search' }],
      response_format: [{ type: 'text', mime_type: 'application/json', schema: responseSchema }],
      generation_config: { temperature: 0.2, max_output_tokens: 12000 },
      store: false,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) throw new Error(`Gemini roadmap research failed with HTTP ${response.status}.`)

  const payload = await response.json() as {
    steps?: {
      type?: string
      content?: {
        type?: string
        text?: string
        annotations?: { url_citation?: { url?: string; uri?: string; title?: string }; url?: string; uri?: string; title?: string }[]
      }[]
    }[]
  }
  const text: string[] = []
  const sources = new Map<string, { title: string; url: string }>()
  for (const step of payload.steps ?? []) {
    if (step.type !== 'model_output') continue
    for (const content of step.content ?? []) {
      if (content.type !== 'text') continue
      text.push(content.text ?? '')
      for (const annotation of content.annotations ?? []) {
        const citation = annotation.url_citation ?? annotation
        const url = citation.url ?? citation.uri
        if (url?.startsWith('https://') || url?.startsWith('http://')) {
          sources.set(url, { title: citation.title || url, url })
        }
      }
    }
  }
  if (!sources.size) throw new Error('Gemini returned no verifiable market sources.')
  const generated = JSON.parse(text.join('')) as GeneratedSet
  return { roadmaps: buildTopMarketRoadmaps(generated), sources: Array.from(sources.values()).slice(0, 30) }
}

async function findSnapshot(market: string, month?: string): Promise<SnapshotRow | undefined> {
  const pool = await getPool()
  const request = pool.request().input('market', sql.VarChar(80), market)
  if (month) {
    request.input('month', sql.VarChar(7), month)
    const result = await request.query<SnapshotRow>(`
      SELECT TOP (1) roadmaps, sources, market, month, updated_at
      FROM roadmap_snapshots WHERE market = @market AND month = @month
    `)
    return result.recordset[0]
  }
  const result = await request.query<SnapshotRow>(`
    SELECT TOP (1) roadmaps, sources, market, month, updated_at
    FROM roadmap_snapshots WHERE market = @market ORDER BY month DESC
  `)
  return result.recordset[0]
}

export async function refreshRoadmaps(user: CurrentUser, roadmaps: Roadmap[]) {
  studentId(user)
  const now = new Date()
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const market = process.env.ROADMAP_MARKET ?? 'India'
  const current = await findSnapshot(market, month)
  if (current && isCurrentTopRoleSnapshot(parseJson(current.roadmaps))) return snapshotResponse(current, true)

  const fallbackRoadmaps = roadmaps
  const key = `${market}:${month}`
  if (!refreshLocks.has(key)) {
    const task = (async () => {
      const retryAfter = failedRefreshes.get(key) ?? 0
      if (Date.now() < retryAfter) return
      try {
        const generated = await generateMarketRoadmaps(market)
        const pool = await getPool()
        await pool
          .request()
          .input('market', sql.VarChar(80), market)
          .input('month', sql.VarChar(7), month)
          .input('roadmaps', sql.NVarChar(sql.MAX), JSON.stringify(generated.roadmaps))
          .input('sources', sql.NVarChar(sql.MAX), JSON.stringify(generated.sources))
          .query(`
            MERGE roadmap_snapshots WITH (HOLDLOCK) AS target
            USING (SELECT @market AS market, @month AS month) AS source
              ON target.market = source.market AND target.month = source.month
            WHEN MATCHED THEN
              UPDATE SET roadmaps = @roadmaps, sources = @sources, updated_at = GETUTCDATE()
            WHEN NOT MATCHED THEN
              INSERT (market, month, roadmaps, sources, updated_at)
              VALUES (@market, @month, @roadmaps, @sources, GETUTCDATE());
          `)
        failedRefreshes.delete(key)
        failedRefreshMessages.delete(key)
      } catch (error) {
        failedRefreshes.set(key, Date.now() + 15 * 60 * 1000)
        failedRefreshMessages.set(key, refreshFailureMessage(error))
        console.error(`Monthly roadmap refresh failed for ${market}:`, error)
      }
    })()
    refreshLocks.set(key, task)
  }
  await refreshLocks.get(key)
  refreshLocks.delete(key)

  const updated = await findSnapshot(market, month)
  if (updated && isCurrentTopRoleSnapshot(parseJson(updated.roadmaps))) return snapshotResponse(updated, true)
  const refreshError = failedRefreshMessages.get(key)
  const latest = await findSnapshot(market)
  if (latest) return { ...snapshotResponse(latest, false), refreshError }
  return { roadmaps: fallbackRoadmaps, sources: [], market, month, updatedAt: null, isCurrent: false, refreshError }
}
