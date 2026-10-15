'use client'

import { useState } from 'react'
import { ArrowLeft, BadgeCheck, PenLine, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Chip, PageHeader, Panel, SourceBadge, selectClass } from '@/components/shared'
import { experiences, type Source } from '@/lib/data'
import type { View } from '@/components/app-shell'

export function Seniors({ navigate }: { navigate: (v: View) => void }) {
  return (
    <>
      <PageHeader
        title="Learn from Seniors"
        description="Faculty-verified internship experiences shared by seniors of R.V.R & J.C College of Engineering."
        actions={
          <Button onClick={() => navigate({ name: 'share-experience' })}>
            <PenLine /> Share Your Experience
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {experiences.map((e) => (
          <article key={e.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <SourceBadge source={e.obtained as Source} />
              <span className="flex items-center gap-1 text-xs font-medium">
                <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" /> {e.rating}
              </span>
            </div>
            <h2 className="mt-3 font-semibold">{e.role}</h2>
            <p className="text-sm text-muted-foreground">
              {e.company} · {e.duration}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {e.skills.map((s) => <Chip key={s}>{s}</Chip>)}
            </div>
            <p className="mt-3 text-sm"><span className="font-medium">Project: </span><span className="text-muted-foreground">{e.project}</span></p>
            <p className="mt-2 text-sm"><span className="font-medium">Learned: </span><span className="text-muted-foreground">{e.learned}</span></p>
            <div className="mt-auto flex items-center justify-between border-t pt-3 mt-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="size-4 text-success" aria-hidden="true" /> {e.name} · {e.batch}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'experience', id: e.id })}>Read more</Button>
            </div>
          </article>
        ))}
      </div>
      {experiences.length === 0 && (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No faculty-verified experiences have been published yet.
        </p>
      )}
    </>
  )
}

export function ExperienceDetail({ id, navigate }: { id: string; navigate: (v: View) => void }) {
  const e = experiences.find((x) => x.id === id) ?? experiences[0]
  if (!e) {
    return (
      <>
        <button onClick={() => navigate({ name: 'seniors' })} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to experiences
        </button>
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          This experience is not available.
        </p>
      </>
    )
  }
  return (
    <>
      <button onClick={() => navigate({ name: 'seniors' })} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to experiences
      </button>
      <div className="rounded-xl border bg-card p-6">
        <SourceBadge source={e.obtained as Source} />
        <h1 className="mt-2 text-balance text-2xl font-semibold">{e.role} at {e.company}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <BadgeCheck className="size-4 text-success" aria-hidden="true" /> Verified experience by {e.name} ({e.batch}) · {e.duration}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Interview & application experience"><p className="text-sm leading-relaxed text-muted-foreground">{e.interview}</p></Panel>
        <Panel title="Project"><p className="text-sm leading-relaxed text-muted-foreground">{e.project}</p></Panel>
        <Panel title="Challenges faced"><p className="text-sm leading-relaxed text-muted-foreground">{e.challenges}</p></Panel>
        <Panel title="What I learned"><p className="text-sm leading-relaxed text-muted-foreground">{e.learned}</p></Panel>
        <Panel title="Technologies used">
          <div className="flex flex-wrap gap-2">{e.tech.map((t) => <Chip key={t}>{t}</Chip>)}</div>
        </Panel>
        <Panel title="Recommendations for juniors" className="border-success/30 bg-success/5">
          <p className="text-sm leading-relaxed">{e.recommendation}</p>
        </Panel>
      </div>
    </>
  )
}

export function ShareExperience({ navigate }: { navigate: (v: View) => void }) {
  const [submitting, setSubmitting] = useState(false)
  const fields: [string, string, string][] = [
    ['interview', 'Interview / application experience', 'Rounds, questions asked, timeline…'],
    ['project', 'Project you worked on', 'What did you build?'],
    ['challenges', 'Challenges faced', 'What was hard and how you handled it'],
    ['learned', 'What you learned', 'Key takeaways'],
    ['recommendation', 'Recommendations for juniors', 'How should juniors prepare?'],
  ]
  return (
    <>
      <button onClick={() => navigate({ name: 'seniors' })} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to experiences
      </button>
      <PageHeader title="Share Your Experience" description="Your post is reviewed by faculty before it is published to juniors." />
      <form
        className="flex flex-col gap-6"
        onSubmit={(ev) => {
          ev.preventDefault()
          setSubmitting(true)
          setTimeout(() => {
            toast.success('Experience submitted for faculty review')
            navigate({ name: 'seniors' })
          }, 600)
        }}
      >
        <Panel title="Internship details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><Label htmlFor="company">Company</Label><Input id="company" required /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="role">Role</Label><Input id="role" required /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="duration">Duration</Label><Input id="duration" required /></div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obtained">How did you get it?</Label>
              <select id="obtained" className={selectClass} defaultValue="College Opportunity">
                <option>College Opportunity</option><option>Self-Found</option><option>Senior Referral</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="tech">Skills & technologies (comma separated)</Label><Input id="tech" placeholder="React, Node.js, MongoDB" required /></div>
          </div>
        </Panel>
        <Panel title="Your experience">
          <div className="flex flex-col gap-4">
            {fields.map(([id, label, ph]) => (
              <div key={id} className="flex flex-col gap-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Textarea id={id} placeholder={ph} rows={3} required />
              </div>
            ))}
          </div>
        </Panel>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ name: 'seniors' })}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'}</Button>
        </div>
      </form>
    </>
  )
}
