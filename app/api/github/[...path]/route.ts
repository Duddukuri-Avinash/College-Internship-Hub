import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'

import { NextResponse, type NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'

import evidenceRulesData from '@/lib/server/skill-evidence.json'
import { authenticate, signingKey, type CurrentUser } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'
import { getRoadmapSkills, isTechnicalSkill, rateLimit, studentId, checkSkill } from '@/lib/server/skill-verification'

const stateCookieName = 'internhub_github_oauth_state'
const maxTreeEntries = 5000
const maxFileBytes = 100 * 1024
const analyzeSchema = z.object({ repo_url: z.string().min(1).max(300) })
const verifySchema = z.object({
  skill: z.string().min(1).max(120),
  repo_url: z.string().url().max(300),
})

type GithubIdentity = { github_id: string; login: string }
type EvidenceRule = {
  languages?: string[]
  file_names?: string[]
  extensions?: string[]
  dependency_names?: string[]
  readme_keywords?: string[]
}
type SkillEvidence = { skill: string; detected: boolean; strength: 'strong' | 'weak' | null; evidence: string[] }
type CommitSummary = { count: number; days: number; first_date: string | null; last_date: string | null }
type RepoAnalysis = {
  repo_url: string
  languages: Record<string, number>
  skills: SkillEvidence[]
  commits: CommitSummary
  commit_requirement_met: boolean
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function githubRedirectUri(): string | undefined {
  return process.env.GITHUB_OAUTH_REDIRECT_URI ?? process.env.GITHUB_REDIRECT_URI
}

function requireGithubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = githubRedirectUri()
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET || !redirectUri) {
    throw new ApiError('GitHub sign-in is not configured.', 503)
  }
  return { clientId, clientSecret: process.env.GITHUB_CLIENT_SECRET, redirectUri }
}

function redirectToFrontend(message: string) {
  return NextResponse.redirect(`${frontendUrl()}/?github=${encodeURIComponent(message)}`)
}

function clearOAuthState(response: NextResponse) {
  response.cookies.set(stateCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/github/callback',
    maxAge: 0,
  })
  return response
}

async function startGithubLogin(request: NextRequest) {
  const user = await authenticate(request)
  if (user.role !== 'student' || user.student_id === null) {
    throw new ApiError('Skill verification is available to students only.', 403)
  }
  const config = requireGithubConfig()
  const nonce = randomUUID()
  const state = await new SignJWT({ nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuer('internhub')
    .setAudience('github-oauth')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(signingKey())
  const authorizationUrl = new URL('https://github.com/login/oauth/authorize')
  authorizationUrl.searchParams.set('client_id', config.clientId)
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUri)
  authorizationUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set(stateCookieName, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/github/callback',
    maxAge: 10 * 60,
  })
  return response
}

async function exchangeGithubCode(code: string) {
  const config = requireGithubConfig()
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  })
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  let result: { access_token?: string; error?: string; error_description?: string }
  try {
    result = await response.json() as typeof result
  } catch {
    throw new ApiError('GitHub sign-in failed during token exchange.', 502)
  }
  if (!response.ok || !result.access_token) {
    const detail = result.error_description ?? result.error
    throw new ApiError(detail ? `GitHub token exchange failed: ${detail}` : 'GitHub did not return an access token.', 400)
  }
  return result.access_token
}

async function githubApi(url: string, token?: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'InternHub',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    console.error('GitHub API request failed:', error)
    throw new ApiError('GitHub could not be reached.', 502)
  }
  if (response.status === 404) throw new ApiError('GitHub repository or README was not found.', 404)
  if ([401, 403].includes(response.status)) {
    throw new ApiError('GitHub rate limit or authorization prevented this check.', 503)
  }
  if (!response.ok) throw new ApiError('GitHub returned an error.', 502)
  try {
    return await response.json()
  } catch {
    throw new ApiError('GitHub returned an invalid response.', 502)
  }
}

async function finishGithubCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookieNonce = request.cookies.get(stateCookieName)?.value
  if (!state || !code || !cookieNonce) {
    return clearOAuthState(redirectToFrontend('error'))
  }

  let userId: number
  try {
    const verifiedState = await jwtVerify(state, signingKey(), {
      algorithms: ['HS256'],
      issuer: 'internhub',
      audience: 'github-oauth',
    })
    const nonce = verifiedState.payload.nonce
    userId = Number(verifiedState.payload.sub)
    if (typeof nonce !== 'string' || nonce !== cookieNonce || !Number.isSafeInteger(userId) || userId < 1) {
      throw new Error('OAuth state binding was invalid.')
    }
  } catch {
    return clearOAuthState(redirectToFrontend('error'))
  }

  try {
    const accessToken = await exchangeGithubCode(code)
    const profile = await githubApi('https://api.github.com/user', accessToken) as { id?: number; login?: string }
    if (!profile || !profile.id || !profile.login) throw new ApiError('GitHub returned an invalid profile.', 502)

    const pool = await getPool()
    const existing = await pool
      .request()
      .input('githubId', sql.VarChar(80), String(profile.id))
      .query<{ user_id: number }>('SELECT user_id FROM github_identities WHERE github_id = @githubId')
    if (existing.recordset[0] && existing.recordset[0].user_id !== userId) {
      return clearOAuthState(redirectToFrontend('already-linked'))
    }

    const current = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query<{ user_id: number }>('SELECT user_id FROM github_identities WHERE user_id = @userId')
    if (current.recordset.length) {
      await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('githubId', sql.VarChar(80), String(profile.id))
        .input('login', sql.VarChar(120), profile.login)
        .query(`
          UPDATE github_identities
          SET github_id = @githubId, login = @login, updated_at = GETUTCDATE()
          WHERE user_id = @userId
        `)
    } else {
      await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('githubId', sql.VarChar(80), String(profile.id))
        .input('login', sql.VarChar(120), profile.login)
        .query(`
          INSERT INTO github_identities (user_id, github_id, login, created_at, updated_at)
          VALUES (@userId, @githubId, @login, GETUTCDATE(), GETUTCDATE())
        `)
    }
    return clearOAuthState(redirectToFrontend('connected'))
  } catch (error) {
    console.error('GitHub OAuth callback failed:', error)
    return clearOAuthState(redirectToFrontend('error'))
  }
}

function parseRepositoryUrl(value: string) {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new ApiError('Enter a repository URL in the form https://github.com/owner/repository.', 422)
  }
  const parts = url.pathname.split('/')
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.search || url.hash
    || parts.length !== 3 || !parts[1] || !parts[2] || parts[2].endsWith('.git')) {
    throw new ApiError('Enter a repository URL in the form https://github.com/owner/repository.', 422)
  }
  return { owner: parts[1], repo: parts[2], canonical: `https://github.com/${parts[1]}/${parts[2]}` }
}

function wordPresent(keywords: string[], text: string) {
  return keywords.some((keyword) => {
    const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
  })
}

function globMatch(name: string, pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i').test(name)
}

function fileEvidence(paths: string[], rule: EvidenceRule) {
  const evidence: string[] = []
  const ruleNames = (rule.file_names ?? []).map((value) => value.toLowerCase())
  const extensions = (rule.extensions ?? []).map((value) => value.toLowerCase())
  for (const path of paths) {
    const normalized = path.toLowerCase()
    const name = normalized.split('/').at(-1) ?? normalized
    if (ruleNames.some((value) => normalized === value || globMatch(name, value) || normalized.startsWith(`${value.replace(/\/$/, '')}/`))) {
      evidence.push(`${path} found`)
    } else {
      const extension = extensions.find((value) => normalized.endsWith(value))
      if (extension) evidence.push(`${path} matches ${extension}`)
    }
  }
  return evidence
}

function analyzeEvidence(paths: string[], contents: Record<string, string>, languages: Record<string, number>): SkillEvidence[] {
  const evidenceRules = evidenceRulesData as { skills: Record<string, EvidenceRule> }
  const languageNames = new Set(Object.keys(languages).map((language) => language.toLowerCase()))
  return Object.entries(evidenceRules.skills).map(([skill, rule]) => {
    const evidence = fileEvidence(paths, rule)
    for (const [path, content] of Object.entries(contents)) {
      const name = path.toLowerCase().split('/').at(-1)
      if (['readme.md', 'readme', 'readme.txt'].includes(name ?? '')) continue
      for (const dependency of rule.dependency_names ?? []) {
        if (wordPresent([dependency], content)) evidence.push(`${path} has ${dependency.toLowerCase()}`)
      }
    }
    for (const language of rule.languages ?? []) {
      if (languageNames.has(language.toLowerCase())) evidence.push(`GitHub reports ${language} language`)
    }
    const readme = Object.entries(contents)
      .filter(([path]) => (path.toLowerCase().split('/').at(-1) ?? '').startsWith('readme'))
      .map(([, content]) => content)
      .join(' ')
    for (const keyword of rule.readme_keywords ?? []) {
      if (wordPresent([keyword], readme)) evidence.push(`README mentions ${keyword}`)
    }
    const strong = evidence.some((item) => item.includes(' found') || item.includes(' has ') || item.includes(' matches '))
    return { skill, detected: evidence.length > 0, strength: strong ? 'strong' : evidence.length ? 'weak' : null, evidence }
  })
}

function selectedContentPaths(paths: string[]) {
  const names = new Set(['package.json', 'requirements.txt', 'pyproject.toml', 'pom.xml', 'build.gradle', 'dockerfile', 'docker-compose.yml'])
  return paths.filter((filePath) => {
    const normalized = filePath.toLowerCase()
    const name = normalized.split('/').at(-1) ?? normalized
    return names.has(name) || normalized.startsWith('.github/workflows/') || name.startsWith('readme')
  })
}

async function analyzeRepository(repoUrl: string, identity: GithubIdentity): Promise<RepoAnalysis> {
  const { owner, repo, canonical } = parseRepositoryUrl(repoUrl)
  if (identity.login.toLowerCase() !== owner.toLowerCase()) {
    throw new ApiError('Repository owner must match your linked GitHub login.', 403)
  }
  const apiToken = process.env.GITHUB_API_TOKEN
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const repoData = await githubApi(base, apiToken) as { fork?: boolean }
  if (repoData.fork) throw new ApiError('Forked repositories cannot be verified.', 400)
  const languages = await githubApi(`${base}/languages`, apiToken) as Record<string, number>
  const tree = await githubApi(`${base}/git/trees/HEAD?recursive=1`, apiToken) as { tree?: { path?: string }[] }
  const paths = (tree.tree ?? []).slice(0, maxTreeEntries)
    .flatMap((item) => item.path ? [item.path] : [])
  const contents: Record<string, string> = {}
  for (const filePath of selectedContentPaths(paths)) {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
    const file = await githubApi(`${base}/contents/${encodedPath}`, apiToken) as { encoding?: string; content?: string }
    if (file.encoding === 'base64' && file.content) {
      contents[filePath] = Buffer.from(file.content, 'base64').subarray(0, maxFileBytes).toString('utf8')
    }
  }
  const commits = await githubApi(`${base}/commits?author=${encodeURIComponent(identity.login)}&per_page=100`, apiToken)
  const commitRows = Array.isArray(commits) ? commits : []
  const dates = Array.from(new Set(commitRows.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('commit' in item)) return []
    const commit = item.commit
    if (!commit || typeof commit !== 'object' || !('author' in commit)) return []
    const author = commit.author
    if (!author || typeof author !== 'object' || !('date' in author) || typeof author.date !== 'string') return []
    return [author.date.slice(0, 10)]
  }))).sort()
  const commitSummary = {
    count: commitRows.length,
    days: dates.length,
    first_date: dates[0] ?? null,
    last_date: dates[dates.length - 1] ?? null,
  }
  return {
    repo_url: canonical,
    languages,
    skills: analyzeEvidence(paths, contents, languages),
    commits: commitSummary,
    commit_requirement_met: commitSummary.count >= 5 && commitSummary.days >= 2,
  }
}

async function linkedGithubIdentity(userId: number): Promise<GithubIdentity | undefined> {
  const pool = await getPool()
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query<GithubIdentity>('SELECT github_id, login FROM github_identities WHERE user_id = @userId')
  return result.recordset[0]
}

async function githubStatus(request: NextRequest) {
  const user = await authenticate(request)
  studentId(user)
  const identity = await linkedGithubIdentity(user.id)
  return NextResponse.json({ connected: !!identity, login: identity?.login ?? null })
}

async function githubDisconnect(request: NextRequest) {
  const user = await authenticate(request)
  studentId(user)
  const pool = await getPool()
  await pool.request().input('userId', sql.Int, user.id).query('DELETE FROM github_identities WHERE user_id = @userId')
  return NextResponse.json({ connected: false })
}

async function githubAnalyze(request: NextRequest) {
  const user = await authenticate(request)
  rateLimit(user.id, 'github-analyze', 5)
  const student = studentId(user)
  const input = analyzeSchema.parse(await readJson(request))
  const identity = await linkedGithubIdentity(user.id)
  if (!identity) throw new ApiError('Sign in with GitHub first.', 400)
  const analysis = await analyzeRepository(input.repo_url, identity)
  const eligible = analysis.skills
    .filter((item) => item.detected && item.strength === 'strong' && analysis.commit_requirement_met)
    .map((item) => item.skill)
  const pool = await getPool()
  const stored = await pool
    .request()
    .input('studentId', sql.Int, student)
    .input('repoUrl', sql.VarChar(500), analysis.repo_url)
    .query<{ skill: string | null }>(`
      SELECT skill FROM verifications
      WHERE student_id = @studentId AND method = 'github' AND detail = @repoUrl
    `)
  return NextResponse.json({ ...analysis, eligible, verified: stored.recordset.flatMap((row) => row.skill ? [row.skill] : []) })
}

async function githubVerify(request: NextRequest) {
  const user = await authenticate(request)
  rateLimit(user.id, 'github-verify', 5)
  const student = studentId(user)
  const input = verifySchema.parse(await readJson(request))
  const skill = checkSkill(input.skill, await getRoadmapSkills())
  if (!isTechnicalSkill(skill)) throw new ApiError('GitHub verification is unavailable for this skill.', 400)
  const identity = await linkedGithubIdentity(user.id)
  if (!identity) throw new ApiError('Sign in with GitHub first.', 400)
  const analysis = await analyzeRepository(input.repo_url, identity)
  const skillResult = analysis.skills.find((item) => item.skill === skill)
  if (!skillResult) throw new ApiError('Skill evidence is unavailable.', 500)
  const passed = skillResult.strength === 'strong' && analysis.commit_requirement_met

  if (passed) {
    const pool = await getPool()
    const reused = await pool
      .request()
      .input('skill', sql.VarChar(120), skill)
      .input('repoUrl', sql.VarChar(500), analysis.repo_url)
      .input('studentId', sql.Int, student)
      .query<{ id: number }>(`
        SELECT TOP (1) id FROM verifications
        WHERE skill = @skill AND detail = @repoUrl AND student_id <> @studentId
      `)
    if (reused.recordset.length) {
      throw new ApiError('This repository was already used for this skill by another account.', 409)
    }

    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    try {
      const existing = await transaction
        .request()
        .input('studentId', sql.Int, student)
        .input('skill', sql.VarChar(120), skill)
        .query<{ id: number }>('SELECT TOP (1) id FROM verifications WHERE student_id = @studentId AND skill = @skill')
      if (existing.recordset.length) {
        await transaction
          .request()
          .input('studentId', sql.Int, student)
          .input('skill', sql.VarChar(120), skill)
          .input('repoUrl', sql.VarChar(500), analysis.repo_url)
          .query(`
            UPDATE verifications
            SET method = 'github', detail = @repoUrl, verified_at = GETUTCDATE(), decision = 'verified'
            WHERE student_id = @studentId AND skill = @skill
          `)
      } else {
        await transaction
          .request()
          .input('studentId', sql.Int, student)
          .input('skill', sql.VarChar(120), skill)
          .input('repoUrl', sql.VarChar(500), analysis.repo_url)
          .query(`
            INSERT INTO verifications (student_id, skill, method, detail, verified_at, decision, created_at)
            VALUES (@studentId, @skill, 'github', @repoUrl, GETUTCDATE(), 'verified', GETUTCDATE())
          `)
      }
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  return NextResponse.json({
    passed,
    skill,
    detected: skillResult.detected,
    strength: skillResult.strength,
    evidence: skillResult.evidence,
    commits: analysis.commits,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params
    if (path.join('/') === 'login') return await startGithubLogin(request)
    if (path.join('/') === 'callback') return await finishGithubCallback(request)
    if (path.join('/') === 'status') return await githubStatus(request)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js GitHub request failed')
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params
    if (path.join('/') === 'analyze') return await githubAnalyze(request)
    if (path.join('/') === 'verify') return await githubVerify(request)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid GitHub request.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js GitHub request failed')
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params
    if (path.join('/') === 'disconnect') return await githubDisconnect(request)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js GitHub disconnect failed')
  }
}
