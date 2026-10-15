// lib/ats-score.ts
// Job-description-driven ATS score.
//   55 keyword match | 10 job title | 10 experience years | 5 education | 20 readability

export type AtsOptions = {
  jobTitle?: string
  /** Skills that must be present (e.g. the selected role's roadmap skills). */
  requiredSkills?: string[]
}

export type AtsResult = {
  score: number
  breakdown: Record<string, { score: number; max: number }>
  matchedKeywords: string[]
  missingKeywords: { term: string; required: boolean }[]
  issues: string[]
}

type Keyword = { term: string; required: boolean; weight: number }

const STOP = new Set(
  ('a an the and or of to in for with on at by from as is are be will you we our your this that have has can must ' +
    'should about into over their they it its such other more than also not but who what which experience work team ' +
    'ability strong skills skill years year role job candidate company looking required preferred responsibilities ' +
    'requirements qualifications including etc using use new good great well able working knowledge understanding ' +
    'position join help across within need needs seeking ideal plus bonus degree related relevant equivalent ' +
    'excellent proven demonstrated opportunity benefits salary apply senior junior lead bachelor bachelors master ' +
    'masters phd development scalable ' +
    'technical critical collaboration communication teamwork analytical problem solving passionate motivated eager ' +
    'willing learner learn learning fast detail oriented attention self independent environment fresher intern ' +
    'interns internship stipend duration month months location remote hybrid eligibility graduate students student ' +
    'final key responsible ownership collaborate collaborative strong good excellent basic advanced hands practical ' +
    'understand ensure deliver support assist various multiple analysis analyst analysts teams cross functional stakeholders insights business').split(' '),
)

const SYNONYMS: Record<string, string[]> = {
  javascript: ['js'], typescript: ['ts'], kubernetes: ['k8s'], 'machine learning': ['ml'],
  'artificial intelligence': ['ai'], postgresql: ['postgres'], 'node.js': ['nodejs', 'node'],
  'react.js': ['react'], 'amazon web services': ['aws'], 'power bi': ['powerbi'],
  statistical: ['statistics', 'statistic'], visualization: ['visualisation', 'visualizations'], visualisation: ['visualization'],
  analytics: ['analysis', 'analytical'],
}

const stem = (w: string) => w.toLowerCase().replace(/\.+$/, '').replace(/(ing|ed|es|s)$/, '')

function extractKeywords(jd: string, limit = 30): Keyword[] {
  let sectionW = 1
  let sectionReq = false
  const found = new Map<string, { count: number; weight: number; required: boolean; bigram: boolean; strong: boolean }>()
  const add = (term: string, w: number, req: boolean, bigram = false, strong = false) => {
    const e = found.get(term) ?? { count: 0, weight: 0, required: false, bigram, strong }
    e.count++
    e.weight = Math.max(e.weight, w)
    e.required = e.required || req
    found.set(term, e)
  }

  for (const raw of jd.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.length <= 45 && !/[.;]$/.test(line)) {
      if (/nice to have|preferred|bonus|plus|good to have/i.test(line)) { sectionW = 0.5; sectionReq = false; continue }
      if (/required|requirements|must|qualifications|what you.?ll need|skills/i.test(line)) { sectionW = 1.5; sectionReq = true; continue }
      if (/responsibilit|about|benefits|perks|what we offer/i.test(line)) { sectionW = 1; sectionReq = false; continue }
    }
    const lineW = /\b(preferred|nice to have|bonus)\b/i.test(line) ? 0.5
      : /\b(required|must have|must)\b/i.test(line) ? 1.5 : sectionW
    const req = lineW >= 1.5 || (sectionReq && lineW >= 1)
    const toks = [...line.matchAll(/[A-Za-z][A-Za-z0-9+#.]*[A-Za-z0-9+#]|[A-Za-z]/g)].map((m) => ({
      t: m[0].toLowerCase().replace(/\.$/, ''), raw: m[0], idx: m.index ?? 0,
    }))
    toks.forEach((tk, i) => {
      if (tk.t.length < 2 || STOP.has(tk.t)) return
      const skillish = (raw: string, pos: number) =>
        (/^[A-Z]/.test(raw) && pos > 0) || /^[A-Z0-9+#.]{2,}$/.test(raw) || /[+#.\d]/.test(raw)
      const looksSkill = skillish(tk.raw, i)
      add(tk.t, lineW + (looksSkill ? 0.75 : 0), req)
      const n = toks[i + 1]
      if (n && n.t.length >= 2 && !STOP.has(n.t) && n.idx === tk.idx + tk.raw.length + 1) {
        // e.g. "Power BI", "Machine Learning": both words look like part of a skill name
        const strong = looksSkill && skillish(n.raw, i + 1)
        add(`${tk.t} ${n.t}`, lineW + (strong ? 0.75 : 0), req, true, strong)
      }
    })
  }

  // drop single words that only ever appear inside a strong skill phrase ("power", "bi" -> "power bi")
  for (const [term, e] of [...found.entries()]) {
    if (!e.bigram || !e.strong) continue
    for (const part of term.split(' ')) {
      const u = found.get(part)
      if (u && !u.bigram && u.count <= e.count) found.delete(part)
    }
  }

  return [...found.entries()]
    .filter(([, e]) => !e.bigram || e.count >= 2 || e.strong)
    .map(([term, e]) => ({ term, required: e.required, weight: e.weight * Math.min(e.count, 3) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
}

function requiredYears(jd: string): number {
  const m = jd.match(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?[^.\n]{0,40}experience|experience[^.\n]{0,40}?(\d{1,2})\s*\+?\s*years?/i)
  return m ? parseInt(m[1] ?? m[2] ?? '0', 10) : 0
}

function resumeYears(text: string): number {
  const explicit = [...text.matchAll(/(\d{1,2})\s*\+?\s*years?/gi)].map((m) => Number(m[1])).filter((n) => n < 40)
  const nowY = new Date().getFullYear()
  const spans: [number, number][] = []
  for (const line of text.split('\n')) {
    if (/b\.?tech|b\.?e\b|bachelor|master|m\.?s\b|university|college|school|diploma|degree/i.test(line)) continue
    for (const m of line.matchAll(/((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now)/gi)) {
      const s = Number(m[1])
      const e = /^\d/.test(m[2]) ? Number(m[2]) : nowY
      if (e >= s) spans.push([s, e])
    }
  }
  spans.sort((a, b) => a[0] - b[0])
  let total = 0
  let cur: [number, number] | null = null
  for (const [s, e] of spans) {
    if (!cur || s > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [s, e] }
    else cur[1] = Math.max(cur[1], e)
  }
  if (cur) total += cur[1] - cur[0]
  return Math.max(total, ...explicit, 0)
}

function eduLevel(t: string): number {
  const s = t.toLowerCase()
  if (/ph\.?d|doctorate/.test(s)) return 3
  if (/master|m\.?tech|m\.?s\b|mba|m\.?sc/.test(s)) return 2
  if (/bachelor|b\.?tech|b\.?e\b|b\.?s\b|b\.?sc|b\.?a\b|undergraduate/.test(s)) return 1
  return 0
}

export function atsScoreJD(resumeText: string, jobDescription = '', options: AtsOptions = {}): AtsResult {
  const text = (resumeText || '').replace(/\r/g, '')
  const jd = (jobDescription || '').replace(/\r/g, '')
  const requiredSkills = options.requiredSkills ?? []
  const hasJd = jd.trim().length >= 30
  if (!hasJd && !requiredSkills.length) throw new Error('Provide a job description or required skills to score against.')

  const lower = text.toLowerCase()
  const words = lower.match(/[a-z0-9+#.]+/g) ?? []
  const stems = new Set(words.map(stem))
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const issues: string[] = []
  const breakdown: AtsResult['breakdown'] = {}

  // 1. Keyword match (55)
  const kwMap = new Map<string, Keyword>()
  if (hasJd) for (const k of extractKeywords(jd)) kwMap.set(k.term, k)
  for (const s of requiredSkills) kwMap.set(s.toLowerCase(), { term: s.toLowerCase(), required: true, weight: 3 })
  const keywords = [...kwMap.values()]

  const has = (term: string) =>
    lower.includes(term) ||
    term.split(' ').every((t) => stems.has(stem(t))) ||
    (SYNONYMS[term] ?? []).some((s) => stems.has(stem(s)))

  let got = 0
  let total = 0
  const matchedKeywords: string[] = []
  const missingKeywords: AtsResult['missingKeywords'] = []
  for (const k of keywords) {
    total += k.weight
    if (has(k.term)) { got += k.weight; matchedKeywords.push(k.term) }
    else missingKeywords.push({ term: k.term, required: k.required })
  }
  breakdown.keywords = { score: Math.round((total ? got / total : 0) * 55), max: 55 }
  const missingReq = missingKeywords.filter((k) => k.required).map((k) => k.term)
  if (missingReq.length) issues.push(`Missing required terms: ${missingReq.slice(0, 8).join(', ')}.`)

  // 2. Job title (10)
  const title = (options.jobTitle || (jd.split('\n').find((l) => l.trim()) ?? '')).trim()
  let titleScore = 10
  if (title && title.length <= 80) {
    const tw = (title.toLowerCase().match(/[a-z][a-z0-9+#.]*/g) ?? []).filter((w) => !STOP.has(w) && w.length > 1)
    if (tw.length) {
      const inAll = tw.filter((w) => stems.has(stem(w))).length / tw.length
      const head = lower.slice(0, 500)
      const inHead = tw.filter((w) => head.includes(w)).length / tw.length
      titleScore = Math.round(inAll * 7 + inHead * 3)
      if (inAll < 0.5) issues.push(`The title "${title}" barely appears in your resume.`)
    }
  }
  breakdown.title = { score: titleScore, max: 10 }

  // 3. Experience years (10)
  const needYears = hasJd ? requiredYears(jd) : 0
  const haveYears = resumeYears(text)
  breakdown.experience = { score: needYears ? Math.round(Math.min(1, haveYears / needYears) * 10) : 10, max: 10 }
  if (needYears && haveYears < needYears) issues.push(`The job asks for ${needYears}+ years; about ${haveYears} found.`)

  // 4. Education (5)
  const needEdu = hasJd ? eduLevel(jd) : 0
  const haveEdu = eduLevel(text)
  let eduScore = 5
  if (needEdu > haveEdu) { eduScore = haveEdu > 0 ? 2 : 0; issues.push('Education level may be below what the job asks for.') }
  breakdown.education = { score: eduScore, max: 5 }

  // 5. Readability (20)
  let read = 0
  const alnum = text.length ? (text.match(/[a-z0-9\s]/gi) ?? []).length / text.length : 0
  read += words.length >= 150 ? (alnum >= 0.85 ? 8 : 4) : 0
  if (words.length < 150) issues.push('Very little text could be read. Is the PDF scanned or image-based?')
  const email = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text)
  const phone = /\+?\d[\d\s().-]{8,}\d/.test(text)
  read += (email ? 3 : 0) + (phone ? 3 : 0)
  const heads = lines.filter((l) => l.length <= 40).map((l) => l.toLowerCase().replace(/[^a-z\s]/g, '').trim())
  const secHit = [/experience|employment|work history|internship/, /education|academic/, /skills|technologies|competencies/]
    .filter((re) => heads.some((h) => re.test(h))).length
  read += secHit * 2
  if (secHit < 3) issues.push('Add clear Experience, Education and Skills headings.')
  breakdown.readability = { score: Math.min(20, read), max: 20 }

  const score = Math.min(100, Object.values(breakdown).reduce((s, c) => s + c.score, 0))
  return { score, breakdown, issues, matchedKeywords, missingKeywords: missingKeywords.slice(0, 15) }
}