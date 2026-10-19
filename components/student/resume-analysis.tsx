'use client'

import { useState, type ChangeEvent } from 'react'
import { FileText, Info, Lightbulb, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Bar, Chip, PageHeader, Panel, selectClass } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { useStudentAccount } from '@/components/student/student-account-provider'
import { atsScoreJD } from '@/lib/ats-score'
import { classifyResumeText, extractResumeText, extractSkillsFromText } from '@/lib/resume-skills'
import { buildResumeFeedback, type FeedbackItem } from '@/lib/resume-feedback'
import { roadmaps, type Roadmap } from '@/components/student/roadmap'

const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_FILE_SIZE = 5 * 1024 * 1024

type Analysis = {
  overall: number
  ats: number | null
  skills: string[]
  missing: string[]
  sections: string[]
  matches: { role: string; score: number }[]
  targetRoleMatch: { role: string; score: number }
  strengths: string[]
  weaknesses: FeedbackItem[]
  formatting: FeedbackItem[]
  recommendations: FeedbackItem[]
}

const sectionRules = [
  ['summary', /(^|\n)\s*(professional\s+summary|summary|objective)\b/i],
  ['education', /(^|\n)\s*education\b/i],
  ['skills', /(^|\n)\s*(technical\s+)?skills\b/i],
  ['projects', /(^|\n)\s*projects?\b/i],
  ['experience', /(^|\n)\s*(experience|internships?|work\s+history)\b/i],
  ['certifications', /(^|\n)\s*certifications?\b/i],
] as const

function analyseResume(text: string, selectedRole: Roadmap, jobDescription = ''): Analysis {
  const skills = extractSkillsFromText(text)
  const sections = sectionRules.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
  const lower = text.toLowerCase()
  const roleMatches = roadmaps
    .map((role) => {
      const found = role.steps.filter((step) => skills.some((skill) => skill.toLowerCase() === step.skill.toLowerCase())).length
      return { role: role.role, score: Math.round((found / role.steps.length) * 100) }
    })
    .sort((a, b) => b.score - a.score)
  const targetRoleMatch = roleMatches.find((match) => match.role === selectedRole.role) ?? { role: selectedRole.role, score: 0 }
  const missing = selectedRole.steps.filter((step) => !skills.some((skill) => skill.toLowerCase() === step.skill.toLowerCase())).map((step) => step.skill)
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
  const hasPhone = /(?:\+?\d[\d\s().-]{8,}\d)/.test(text)
  const hasLink = /(linkedin\.com|github\.com|https?:\/\/)/i.test(text)
  const longLines = text.split(/\r?\n/).filter((line) => line.length > 140).length
  const bulletCount = text.split(/\r?\n/).filter((line) => /^\s*[-•*]/.test(line)).length
  const measurableResults = /\b\d+(?:%| years?| users?| projects?| clients?| seconds?| hours?| lakh| crore)\b/i.test(text)
  const contactScore = [hasEmail, hasPhone, hasLink].filter(Boolean).length
  const overall = Math.min(100, Math.round(
    sections.length / sectionRules.length * 35
    + Math.min(skills.length / 10, 1) * 25
    + (contactScore / 3) * 15
    + (measurableResults ? 15 : 0)
    + (bulletCount >= 3 ? 10 : 0),
  ))
  const hasJobDescription = jobDescription.trim().length >= 30
  const atsResult = hasJobDescription ? atsScoreJD(text, jobDescription) : null
  const ats = atsResult ? atsResult.score : null
  const strengths = [
    sections.includes('skills') && skills.length >= 5 ? `Detected ${skills.length} relevant skills.` : '',
    sections.includes('projects') ? 'Projects section is present.' : '',
    sections.includes('experience') ? 'Experience or internship history is present.' : '',
    measurableResults ? 'At least one measurable result was detected.' : '',
    hasLink ? 'A professional link was detected.' : '',
  ].filter(Boolean)
  const feedback = buildResumeFeedback({
    text,
    roleName: selectedRole.role,
    skills,
    missingRoleSkills: missing,
    sections: [...sections],
    atsResult: atsResult ?? null,
  })

  return {
    overall,
    ats,
    skills,
    missing,
    sections,
    matches: roleMatches.slice(0, 5),
    targetRoleMatch,
    strengths,
    weaknesses: feedback.improvements,
    formatting: feedback.formatting,
    recommendations: feedback.recommendations,
  }
}

function List({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="flex flex-col gap-2 text-sm">{items.map((item) => <li key={item} className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul>
  ) : <p className="text-sm text-muted-foreground">{empty}</p>
}

function FeedbackList({ items, empty }: { items: FeedbackItem[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, index) => {
        const priorityClass = item.priority === 'high'
          ? 'border-destructive/25 bg-destructive/10 text-destructive'
          : item.priority === 'medium'
            ? 'border-amber-500/25 bg-amber-500/10 text-amber-700'
            : 'border-muted bg-muted text-muted-foreground'
        const priorityLabel = item.priority[0].toUpperCase() + item.priority.slice(1)
        return (
          <li key={`${index}-${item.title}`} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityClass}`}>{priorityLabel}</span>
              <span className="text-sm font-medium">{item.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{item.detail}</p>
            {item.before && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Your resume</p>
                <p className="rounded-md bg-muted px-3 py-2 text-sm italic">{item.before}</p>
              </div>
            )}
            {item.after && (
              <div>
                <p className="mb-1 text-xs font-medium">Suggested</p>
                <p className="rounded-md bg-accent px-3 py-2 text-sm">{item.after}</p>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function ResumeAnalysis() {
  const { resume, loading, uploadResume, downloadResume } = useStudentAccount()
  const [uploading, setUploading] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [roleId, setRoleId] = useState('analyst')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analysedText, setAnalysedText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const selectedRole = roadmaps.find((role) => role.id === roleId) ?? roadmaps[0]

  async function analyseFile(file: File, text?: string) {
    setAnalysing(true)
    try {
      const extractedText = text ?? await extractResumeText(file)
      const classification = classifyResumeText(extractedText)
      if (!classification.isResume) {
        toast.error(classification.reason ?? 'This file does not appear to be a resume.')
        return
      }
      setAnalysedText(extractedText)
      setAnalysis(analyseResume(extractedText, selectedRole, jobDescription))
      toast.success('Resume analysis completed locally.')
    } catch (error) {
      console.error('Unable to analyse resume:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to analyse resume.')
    } finally {
      setAnalysing(false)
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED.includes(file.type)) return void toast.error('Please choose a PDF or DOCX file.')
    if (file.size > MAX_FILE_SIZE) return void toast.error('File is too large. Maximum size is 5 MB.')
    setUploading(true)
    try {
      const text = await extractResumeText(file)
      const classification = classifyResumeText(text)
      if (!classification.isResume) {
        toast.error(classification.reason ?? 'This file does not appear to be a resume.')
        return
      }
      await uploadResume(file)
      setAnalysedText(text)
      setAnalysis(analyseResume(text, selectedRole, jobDescription))
      toast.success('Resume uploaded and analysis completed locally.')
    } catch (error) {
      console.error('Unable to upload resume:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to upload resume.')
    } finally {
      setUploading(false)
    }
  }

  async function analyseSavedResume() {
    if (!resume) return
    setAnalysing(true)
    try {
      const url = await downloadResume()
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string; detail?: string } | null
        throw new Error(detail?.error ?? detail?.detail ?? `Resume download failed with status ${response.status}.`)
      }
      const blob = await response.blob()
      await analyseFile(new File([blob], resume.fileName, { type: resume.mimeType }))
    } catch (error) {
      console.error('Unable to analyse saved resume:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to analyse saved resume.')
      setAnalysing(false)
    }
  }

  return (
    <>
      <PageHeader title="Resume Analysis" description="Get a private, rule-based review of your resume without sending it to an external AI service." />
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-accent p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-pretty text-accent-foreground">This first version checks extracted text, sections, skills, ATS signals, and roadmap fit. It cannot judge visual layout precisely.</p>
      </div>
      <Panel title="Resume and target role">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="analysis-role" className="mb-2 block text-sm font-medium">Target role</label>
            <select id="analysis-role" className={selectClass} value={roleId} onChange={(event) => {
              const nextRoleId = event.target.value
              const nextRole = roadmaps.find((role) => role.id === nextRoleId) ?? roadmaps[0]
              setRoleId(nextRoleId)
              if (analysedText) setAnalysis(analyseResume(analysedText, nextRole, jobDescription))
            }}>
              {roadmaps.map((role) => <option key={role.id} value={role.id}>{role.role}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 px-4 py-5 text-center hover:border-primary/50 hover:bg-accent/50">
            <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{uploading ? 'Uploading resume…' : 'Upload or replace resume'}</span>
            <span className="text-xs text-muted-foreground">PDF or DOCX, up to 5 MB</span>
            <input type="file" accept=".pdf,.docx" className="sr-only" aria-label="Upload resume for analysis" onChange={(event) => { void onFile(event) }} disabled={uploading || loading} />
          </label>
        </div>
        <label htmlFor="analysis-jd" className="mt-4 block text-sm font-medium">Job description (paste to get your ATS score)</label>
        <textarea
          id="analysis-jd"
          rows={6}
          placeholder="Paste the job description here…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
        />
        <Button variant="outline" className="mt-2" disabled={!analysedText || jobDescription.trim().length < 30} onClick={() => setAnalysis(analyseResume(analysedText, selectedRole, jobDescription))}>
          Calculate ATS score
        </Button>
        {resume && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4" aria-hidden="true" />{resume.fileName}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={!resume || analysing || uploading} onClick={() => { void analyseSavedResume() }}>{analysing ? 'Analysing…' : 'Analyse saved resume'}</Button>
          <Button variant="outline" disabled={!resume || uploading} onClick={() => { void downloadResume().then((url) => window.open(url, '_blank', 'noopener,noreferrer')).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Unable to download resume.')) }}>Download resume</Button>
        </div>
      </Panel>

      {analysis && (
        <>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Panel title="Overall resume score"><p className="text-3xl font-semibold">{analysis.overall}/100</p><Bar value={analysis.overall} className="mt-3" /></Panel>
            <Panel title="ATS score (job description)">
              {analysis.ats !== null ? (
                <>
                  <p className="text-3xl font-semibold">{analysis.ats}/100</p>
                  <Bar value={analysis.ats} tone={analysis.ats >= 75 ? 'success' : 'warning'} className="mt-3" />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Paste a job description above and click “Calculate ATS score” to see how well your resume matches it.</p>
              )}
            </Panel>
          </div>
          <Panel title="Role matching">
            <div className="mb-4 rounded-lg border border-primary/20 bg-accent/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Target role: {analysis.targetRoleMatch.role}</span>
                <span className="text-lg font-bold text-primary">{analysis.targetRoleMatch.score}%</span>
              </div>
              <Bar value={analysis.targetRoleMatch.score} className="mt-2" />
            </div>
            <div className="flex flex-col gap-3">{analysis.matches.map((match) => <div key={match.role} className="flex items-center gap-3"><span className="min-w-0 flex-1 truncate text-sm font-medium">{match.role}</span><div className="w-1/3"><Bar value={match.score} /></div><span className="w-10 text-right text-sm font-semibold">{match.score}%</span></div>)}</div>
          </Panel>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Panel title="Detected skills"><div className="flex flex-wrap gap-2">{analysis.skills.length ? analysis.skills.map((skill) => <Chip key={skill}>{skill}</Chip>) : <p className="text-sm text-muted-foreground">No supported skills were detected.</p>}</div></Panel>
            <Panel title={`Missing skills for ${selectedRole.role}`}><List items={analysis.missing} empty="Your detected skills cover this roadmap." /></Panel>
            <Panel title="Strengths"><List items={analysis.strengths} empty="Add more structured content to reveal strengths." /></Panel>
            <Panel title="Areas to improve"><FeedbackList items={analysis.weaknesses} empty="No major rule-based weaknesses detected." /></Panel>
            <Panel title="Formatting feedback"><FeedbackList items={analysis.formatting} empty="No formatting feedback available." /></Panel>
            <Panel title="Recommendations"><FeedbackList items={analysis.recommendations} empty="No recommendations available." /></Panel>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lightbulb className="size-4" />Scores are guidance, not a hiring guarantee. Text extraction cannot evaluate visual design perfectly.</p>
        </>
      )}
    </>
  )
}
