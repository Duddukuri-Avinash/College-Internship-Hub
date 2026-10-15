// lib/resume-feedback.ts
// Builds resume-specific content for three panels:
//   improvements    -> "Areas to improve"
//   formatting      -> "Formatting feedback"
//   recommendations -> "Recommendations"
// Items quote the student's own bullets, skills and headings, and include
// before/after examples where possible. Fully rule-based: no data leaves the browser.
import type { AtsResult } from './ats-score'

export type Priority = 'high' | 'medium' | 'low'
export type FeedbackItem = {
  priority: Priority
  title: string
  detail: string
  /** The student's own text (quoted) */
  before?: string
  /** A suggested rewrite or template */
  after?: string
}
export type ResumeFeedback = {
  improvements: FeedbackItem[]
  formatting: FeedbackItem[]
  recommendations: FeedbackItem[]
}
type Input = {
  text: string
  roleName: string
  /** Skills detected in the resume (e.g. from extractSkillsFromText) */
  skills: string[]
  /** Roadmap skills for the target role that are missing from the resume */
  missingRoleSkills: string[]
  sections: string[]
  atsResult: AtsResult | null
}

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const BULLET_RE = /^[-•*▪●◦–·➢►]\s*/
const ACTION_VERBS = new Set(
  ('achieved analyzed analysed automated built collaborated created delivered designed developed directed drove ' +
    'enhanced established executed generated implemented improved increased integrated launched led managed migrated ' +
    'mentored optimized optimised organized organised owned planned reduced refactored resolved scaled shipped ' +
    'streamlined supported trained transformed wrote deployed maintained coordinated negotiated presented tested ' +
    'cleaned prepared analysed visualized visualised collected monitored updated configured').split(' '),
)
const GERUND_TO_PAST: Record<string, string> = {
  building: 'Built', leading: 'Led', running: 'Ran', writing: 'Wrote', making: 'Made', managing: 'Managed',
  creating: 'Created', developing: 'Developed', designing: 'Designed', analyzing: 'Analysed', analysing: 'Analysed',
  testing: 'Tested', cleaning: 'Cleaned', preparing: 'Prepared', maintaining: 'Maintained',
  implementing: 'Implemented', coordinating: 'Coordinated', handling: 'Handled', supporting: 'Supported',
  organizing: 'Organised', organising: 'Organised', training: 'Trained', monitoring: 'Monitored',
  collecting: 'Collected', updating: 'Updated', deploying: 'Deployed', automating: 'Automated',
}
const HEADINGS: [string, RegExp][] = [
  ['summary', /^(professional\s+|career\s+)?(summary|objective|profile|about)/i],
  ['education', /^(education|academic)/i],
  ['skills', /^(technical\s+|key\s+|core\s+)?skills|^technologies|^competencies/i],
  ['projects', /^(academic\s+|personal\s+)?projects?/i],
  ['experience', /^(work\s+|professional\s+)?(experience|employment|work\s+history)|^internships?/i],
  ['certifications', /^certifications?|^courses/i],
  ['achievements', /^(achievements|awards|accomplishments)/i],
]
const CREATIVE_HEADINGS = /^(my journey|about me|what i do|my story|toolbox|my toolbox|expertise|background|strengths|interests|hobbies|let'?s connect)$/i

const ACRONYMS = new Set('sql aws bi api css html ci cd etl nlp ml ai gcp ui ux qa seo crm erp sap php sdk jwt rest json xml ios vba dax gis kpi'.split(' '))
const SPECIAL: Record<string, string> = {
  postgresql: 'PostgreSQL', javascript: 'JavaScript', typescript: 'TypeScript', github: 'GitHub', mysql: 'MySQL',
  mongodb: 'MongoDB', tensorflow: 'TensorFlow', pytorch: 'PyTorch', nodejs: 'Node.js', 'node.js': 'Node.js',
  'react.js': 'React', powerbi: 'Power BI', numpy: 'NumPy', 'scikit-learn': 'scikit-learn', graphql: 'GraphQL',
}
const pretty = (term: string) =>
  term.split(' ').map((w) => SPECIAL[w] ?? (ACRONYMS.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ')

// qualities, not tools: show these through bullets instead of adding them to a Skills line
const SOFT = new Set(('communication collaboration teamwork leadership critical thinking problem solving analytical ' +
  'technical statistical adaptability creativity time management ownership initiative').split(' '))

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)
const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

function headingOf(line: string): string | null {
  if (line.length > 40 || BULLET_RE.test(line) || /[.;,]$/.test(line)) return null
  const clean = line.replace(/[^A-Za-z&\s]/g, '').trim()
  if (!clean || clean.split(/\s+/).length > 4) return null
  for (const [name, re] of HEADINGS) if (re.test(clean)) return name
  return null
}

function splitSections(lines: string[]) {
  const body: Record<string, string[]> = { _header: [] }
  const order: string[] = []
  let current = '_header'
  for (const line of lines) {
    const h = headingOf(line)
    if (h) { current = h; if (!body[h]) { body[h] = []; order.push(h) } continue }
    ;(body[current] ??= []).push(line)
  }
  return { body, order }
}

function metricHint(b: string): string {
  const s = b.toLowerCase()
  if (/model|machine learning|prediction|classif|regression/.test(s)) return 'the accuracy or score you reached and the dataset size'
  if (/dashboard|report|power bi|tableau|visuali/.test(s)) return 'how many people used it, or how much reporting time it saved'
  if (/clean|dataset|data|excel|analy|sql/.test(s)) return 'how many rows, records or datasets you handled, or the % time saved'
  if (/api|backend|server|database/.test(s)) return 'requests, users or records handled, or how much faster it became'
  if (/website|web app|frontend|react|app\b|interface/.test(s)) return 'how many users, pages or features it covered'
  if (/test|qa|bug/.test(s)) return 'how many bugs or test cases you handled'
  if (/team|led|mentor|event|club|organi[sz]/.test(s)) return 'the team size or number of participants'
  return 'how many, how much, or how fast'
}

function rewriteWeak(b: string): string {
  const s = b.replace(/[.\s]+$/, '')
  const m = s.match(/^(responsible for|worked on|helped with|helped in|involved in|duties included|assisted with|assisted in|handled)\s+(.*)$/i)
  const tail = `, [add a result: ${metricHint(s)}]`
  if (m) {
    const parts = m[2].split(/\s+/)
    const past = GERUND_TO_PAST[parts[0].toLowerCase()]
    if (past) return `${past} ${parts.slice(1).join(' ')}${tail}`
    const lead = /worked on/i.test(m[1]) ? 'Built' : /helped|assisted/i.test(m[1]) ? 'Supported' : 'Handled'
    return `${lead} ${lowerFirst(m[2])}${tail}`
  }
  return `Developed ${lowerFirst(s)}${tail}`
}

const startsWeak = (b: string) => /^(responsible for|worked on|helped (with|in)|involved in|duties included|assisted (with|in)|handled)\b/i.test(b)
const hasNumber = (b: string) => /\d+\s*%|[$₹]\s?\d|\b\d{2,}\b|\b\d+x\b|lakh|crore|\b\d+\+?\s*(users?|clients?|projects?|hours?|records?|rows?)/i.test(b)

export function buildResumeFeedback(input: Input): ResumeFeedback {
  const { text, roleName, skills, missingRoleSkills, sections, atsResult } = input
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const { body } = splitSections(lines)
  const words = text.match(/[a-z0-9+#.]+/gi)?.length ?? 0
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
  const hasPhone = /(?:\+?\d[\d\s().-]{8,}\d)/.test(text)
  const hasLinkedIn = /linkedin\.com/i.test(text)
  const hasGithub = /github\.com/i.test(text)

  const evidenceLines = [...(body.projects ?? []), ...(body.experience ?? [])]
  const evidenceBullets = (evidenceLines.length ? evidenceLines : lines)
    .filter((l) => BULLET_RE.test(l) || l.length > 45)
    .map((l) => l.replace(BULLET_RE, ''))
    .filter((l) => l.length > 15 && l.length < 260)
  const evidenceText = evidenceLines.join(' ').toLowerCase()

  const improvements: FeedbackItem[] = []
  const formatting: FeedbackItem[] = []
  const recommendations: FeedbackItem[] = []

  // =============== AREAS TO IMPROVE ===============
  if (!hasEmail || !hasPhone) {
    improvements.push({
      priority: 'high',
      title: `No ${[!hasEmail && 'email address', !hasPhone && 'phone number'].filter(Boolean).join(' or ')} found`,
      detail: 'Recruiters cannot contact you and ATS software cannot create your profile without it. Put it in plain text in the first lines of the resume.',
    })
  }
  if (!sections.includes('experience') && !sections.includes('projects')) {
    improvements.push({
      priority: 'high',
      title: 'No projects or experience to back up your skills',
      detail: `A ${roleName} recruiter looks for proof, not just a skills list. Add 2-3 projects (or an internship), each with 2 bullets: what you built with which tool, and what it achieved.`,
    })
  }

  // skills listed but never used in a project/experience bullet
  if (evidenceLines.length) {
    const unproven = skills.filter((s) => !evidenceText.includes(s.toLowerCase()))
    if (unproven.length >= 2) {
      improvements.push({
        priority: 'high',
        title: `${unproven.length} skills are listed but never used in a project or job`,
        detail: `${list(unproven.slice(0, 5))} appear in your resume but not in any project or experience bullet. Recruiters trust skills that are shown in use. Mention each in a bullet, or remove the ones you cannot talk about in an interview.`,
        after: `Example: "Built a [project] using ${unproven[0]}${unproven[1] ? ` and ${unproven[1]}` : ''} to [result]"`,
      })
    }
  }

  // weak bullets (quote up to 2)
  const weak = evidenceBullets.filter(
    (b) => startsWeak(b) || !ACTION_VERBS.has((b.split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z]/g, '')),
  )
  const weakSorted = [...weak.filter(startsWeak), ...weak.filter((b) => !startsWeak(b))].slice(0, 2)
  weakSorted.forEach((b) => {
    improvements.push({
      priority: startsWeak(b) ? 'high' : 'medium',
      title: startsWeak(b) ? 'This bullet describes a duty, not a result' : 'This bullet does not start with an action verb',
      detail: 'Start with a strong verb and end with the outcome so the reader sees impact in the first three words.',
      before: cut(b, 140),
      after: cut(rewriteWeak(b), 280),
    })
  })

  // bullets without numbers (exclude ones already quoted)
  const quoted = new Set(weakSorted)
  const noNumbers = evidenceBullets.filter((b) => !hasNumber(b) && !quoted.has(b))
  if (evidenceBullets.length >= 3 && noNumbers.length / evidenceBullets.length > 0.6) {
    const ex = noNumbers[0]
    improvements.push({
      priority: 'medium',
      title: `${noNumbers.length} of ${evidenceBullets.length} bullets have no numbers`,
      detail: `Numbers make achievements believable. For example, for the bullet below, add ${metricHint(ex)}. If you are unsure of exact numbers, an honest estimate ("~20", "over 1,000 rows") is fine.`,
      before: cut(ex, 140),
    })
  }

  // repeated verbs
  const verbCount = new Map<string, number>()
  for (const b of evidenceBullets) {
    const v = (b.split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z]/g, '')
    if (ACTION_VERBS.has(v)) verbCount.set(v, (verbCount.get(v) ?? 0) + 1)
  }
  const [topVerb, topCount] = [...verbCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  if (topCount >= 3) {
    improvements.push({
      priority: 'low',
      title: `${topCount} bullets start with "${topVerb[0].toUpperCase()}${topVerb.slice(1)}"`,
      detail: 'Repeating the same opening verb makes the resume read flat. Vary it: built, automated, designed, analysed, reduced, presented.',
    })
  }

  if (!sections.includes('summary') && skills.length >= 2) {
    const top = skills.slice(0, 3)
    improvements.push({
      priority: 'medium',
      title: 'No summary at the top',
      detail: 'A 2-line summary tells the recruiter in five seconds that you fit the role. Here is a draft built from the skills detected in your resume. Edit it so it is true to you.',
      after: `Aspiring ${roleName} with hands-on experience in ${list(top)}. Seeking an opportunity to apply [your strongest project or result] in a ${roleName} role.`,
    })
  }
  if (skills.length > 0 && skills.length < 5) {
    improvements.push({
      priority: 'medium',
      title: `Only ${skills.length} skill${skills.length === 1 ? '' : 's'} detected: ${list(skills)}`,
      detail: 'List every tool, language and library you have really used, spelled the way job postings spell them (for example "Power BI", not "PowerBI").',
    })
  }

  // =============== FORMATTING FEEDBACK ===============
  const pages = Math.max(1, Math.round((words / 500) * 10) / 10)
  if (words >= 150 && words < 300) {
    formatting.push({ priority: 'medium', title: `Resume is short: about ${words} words`, detail: 'Early-career resumes work best at roughly 350-700 words. Add project details, coursework or certifications rather than filler.' })
  } else if (words > 900) {
    formatting.push({ priority: 'medium', title: `Resume is long: about ${words} words (~${pages} pages)`, detail: 'Keep it to one page for internships and entry-level roles. Cut older or less relevant items first.' })
  }

  const longLines = lines.filter((l) => l.length > 140)
  if (longLines.length) {
    formatting.push({
      priority: 'medium',
      title: `${longLines.length} line${longLines.length === 1 ? ' is' : 's are'} too long to scan`,
      detail: 'Recruiters skim. Split each long line into separate bullets with one idea each (what you did, then the result).',
      before: cut(longLines[0], 110),
    })
  }

  const bulletLines = lines.filter((l) => BULLET_RE.test(l))
  const bulletChars = [...new Set(bulletLines.map((l) => l[0]))]
  if (bulletChars.length >= 2) {
    formatting.push({ priority: 'low', title: `Mixed bullet styles: ${bulletChars.map((c) => `"${c}"`).join(' and ')}`, detail: 'Use one bullet style throughout so the resume looks consistent and parses cleanly.' })
  }
  if (words > 150 && bulletLines.length < 4) {
    formatting.push({
      priority: 'high',
      title: `Only ${bulletLines.length} bullet point${bulletLines.length === 1 ? '' : 's'} found`,
      detail: 'Your content is mostly paragraphs. Turn each project or job into 2-4 short bullets: action + tool + result. If you already use bullets, they may be lost when the PDF is read, so export as a text-based PDF.',
    })
  }

  const dateStyles: string[] = []
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}/i.test(text)) dateStyles.push('"Jan 2023"')
  if (/\b\d{1,2}\/\d{4}\b/.test(text)) dateStyles.push('"01/2023"')
  if (/\b(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current)\b/i.test(text)) dateStyles.push('"2021 - 2023"')
  if (dateStyles.length >= 2) {
    formatting.push({ priority: 'medium', title: `Dates use ${dateStyles.length} different styles: ${dateStyles.join(', ')}`, detail: 'ATS tools calculate your experience from dates. Pick one format, such as "Jan 2023 - Mar 2024", and use it everywhere.' })
  }

  const icons = text.match(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu)
  if (icons?.length) {
    formatting.push({ priority: 'high', title: `Icons or emojis found (${[...new Set(icons)].slice(0, 4).join(' ')})`, detail: 'Symbols often turn into garbled characters in ATS software. Use plain words like "Phone:" and "Email:" instead of icons.' })
  }

  const contactTop = lines.slice(0, 6).join(' ')
  const emailTop = /[\w.+-]+@[\w-]+\.[\w.]+/.test(contactTop)
  const phoneTop = /\+?\d[\d\s().-]{8,}\d/.test(contactTop)
  if ((hasEmail && !emailTop) || (hasPhone && !phoneTop)) {
    formatting.push({ priority: 'medium', title: 'Contact details are not at the top', detail: 'Place your name, email, phone and links in the first 2-3 lines. Many ATS tools only look there for contact information.' })
  }

  const creative = lines.filter((l) => l.length <= 30 && CREATIVE_HEADINGS.test(l.replace(/[^A-Za-z'\s]/g, '').trim()))
  if (creative.length) {
    formatting.push({ priority: 'medium', title: `Non-standard heading: "${creative[0]}"`, detail: 'ATS software looks for standard headings. Rename it to Summary, Experience, Projects or Skills so the content is sorted into the right field.' })
  }

  const missingHeadings = (['experience', 'education', 'skills'] as const).filter((s) => !sections.includes(s) && !(s === 'experience' && sections.includes('projects')))
  if (missingHeadings.length) {
    const found = sections.length ? list(sections.map((s) => s[0].toUpperCase() + s.slice(1))) : 'none'
    formatting.push({ priority: 'high', title: `Standard headings missing: ${list(missingHeadings.map((s) => s[0].toUpperCase() + s.slice(1)))}`, detail: `Headings detected: ${found}. Add the missing ones exactly as named so ATS software can sort your content.` })
  }

  if (lines.filter((l) => /\S\s{4,}\S/.test(l)).length >= 5) {
    formatting.push({ priority: 'high', title: 'Resume looks like it uses columns or a table', detail: 'Multi-column layouts often get read out of order. Use a single-column layout for the version you upload to job sites.' })
  }

  // =============== RECOMMENDATIONS ===============
  const missingReq = atsResult?.missingKeywords.filter((k) => k.required).map((k) => k.term) ?? []
  // only extend a line that is clearly a tools line; never edit "Languages: ..." or other category lines
  const toolsLine = (body.skills ?? []).find((l) => /^(tools|technologies|software|platforms|frameworks)[^:]{0,25}:/i.test(l))
  const missingHard = missingReq.filter((t) => !t.split(' ').every((w) => SOFT.has(w)))
  const missingSoft = missingReq.filter((t) => t.split(' ').every((w) => SOFT.has(w)))
  if (missingHard.length) {
    const add = missingHard.slice(0, 4).map(pretty)
    recommendations.push({
      priority: 'high',
      title: `Add ${list(add)} for this job`,
      detail: 'These are listed as requirements in the job description but are missing from your resume. Add them only if you have really used them, and use at least one in a project bullet so it is backed by evidence.',
      before: toolsLine ? `Your line: ${cut(toolsLine, 100)}` : undefined,
      after: toolsLine
        ? `${cut(toolsLine.replace(/[,\s]+$/, ''), 120)}, ${add.join(', ')}`
        : `Add a separate line under Skills: "Tools & Technologies: ${add.join(', ')}"`,
    })
  } else if (!atsResult) {
    recommendations.push({
      priority: 'medium',
      title: 'Paste a job description to see what you are missing',
      detail: `Right now the resume is checked against general ${roleName} skills. Paste a real job posting to see which exact keywords, years of experience and qualifications to add.`,
    })
  }
  if (missingSoft.length) {
    recommendations.push({
      priority: 'low',
      title: `The job also values ${list(missingSoft.slice(0, 3).map(pretty))}`,
      detail: 'These are qualities, not tools, so do not add them to your Skills line. Show them through a bullet instead, for example a team project, a presentation, or a problem you solved.',
      after: 'Example: "Collaborated with a team of 4 to build [project], presenting results to [audience]"',
    })
  }
  for (const issue of atsResult?.issues ?? []) {
    if (/years/i.test(issue)) {
      recommendations.push({ priority: 'medium', title: issue, detail: 'Show start and end dates for internships, freelance work and long projects so the time adds up, and say so in your summary if it is true.' })
    }
  }

  const nextSkill = missingRoleSkills.find((s) => !missingReq.map((m) => m.toLowerCase()).includes(s.toLowerCase()))
  if (nextSkill) {
    const strong = skills[0]
    recommendations.push({
      priority: missingRoleSkills.length > 3 ? 'medium' : 'low',
      title: `Next skill to learn for ${roleName}: ${nextSkill}`,
      detail: strong
        ? `You already show ${strong}. Build one small project that uses ${strong} together with ${nextSkill}, then add it under Projects. ${missingRoleSkills.length > 1 ? `After that: ${list(missingRoleSkills.filter((s) => s !== nextSkill).slice(0, 3))}.` : ''}`
        : `Learn it from your roadmap, build one small project with it, and add the project to your resume.`,
      after: `Projects → "${nextSkill} project": [what you built] using ${[strong, nextSkill].filter(Boolean).join(' + ')}, [result]`,
    })
  }

  const missingLinks = [!hasLinkedIn && 'LinkedIn', !hasGithub && 'GitHub'].filter(Boolean) as string[]
  if (missingLinks.length) {
    recommendations.push({
      priority: 'low',
      title: `Add your ${list(missingLinks)} link`,
      detail: hasGithub
        ? 'Put the full profile URL next to your email so recruiters can open it in one click.'
        : `For ${roleName} roles, recruiters like to open the code or work behind your projects. Put the links next to your email.`,
      after: `${hasEmail ? '' : 'you@email.com | '}linkedin.com/in/your-name | github.com/your-username`,
    })
  }

  const strongResume = improvements.filter((i) => i.priority === 'high').length === 0 && recommendations.length <= 1
  if (strongResume) {
    recommendations.push({
      priority: 'low',
      title: 'Your resume is in good shape: tailor it per application',
      detail: 'The biggest remaining gain is matching each job. Copy 3-5 exact keywords from the posting into your Skills line and the top two bullets of your most relevant project.',
    })
  }

  const finish = (arr: FeedbackItem[], n: number) => [...arr].sort((a, b) => RANK[a.priority] - RANK[b.priority]).slice(0, n)
  return { improvements: finish(improvements, 5), formatting: finish(formatting, 5), recommendations: finish(recommendations, 5) }
}