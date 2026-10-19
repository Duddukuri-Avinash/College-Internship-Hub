'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, MessageSquareWarning, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DocPreview, Modal, PageHeader, VerifyBadge } from '@/components/shared'
import { formatDate, verificationQueue, type VerifyStatus } from '@/lib/data'
import { cn } from '@/lib/utils'

const tabs = [
  { key: 'Offer Letter', label: 'Offer Letters' },
  { key: 'Certificate', label: 'Certificates' },
  { key: 'Self-Found', label: 'Self-Found Internships' },
  { key: 'Experience', label: 'Student Experiences' },
]

type Item = (typeof verificationQueue)[number]

export function VerificationCenter() {
  const [tab, setTab] = useState('Offer Letter')
  const [items, setItems] = useState(verificationQueue)
  const [review, setReview] = useState<Item | null>(null)
  const [note, setNote] = useState('')
  const [confirmReject, setConfirmReject] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/faculty/verifications', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to load verification records.')
        return result as { verifications: typeof verificationQueue }
      })
      .then((result) => {
        if (active) setItems(result.verifications)
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load verification records.')
      })
    return () => {
      active = false
    }
  }, [])

  const decide = async (status: VerifyStatus) => {
    if (!review) return
    setSaving(true)
    try {
      if (review.documentId) {
        const decision = status === 'Verified' ? 'verified' : status === 'Rejected' ? 'rejected' : 'additional_proof_required'
        const response = await fetch(`/api/faculty/verifications/${encodeURIComponent(review.documentId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ decision, notes: note }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to save verification decision.')
      }
      setItems((prev) => prev.map((i) => (i.id === review.id ? { ...i, status } : i)))
      const msg = status === 'Verified' ? 'Document verified' : status === 'Rejected' ? 'Document rejected' : 'More information requested'
      toast[status === 'Verified' ? 'success' : status === 'Rejected' ? 'error' : 'warning'](msg, { description: `${review.student} has been notified.` })
      setReview(null)
      setNote('')
      setConfirmReject(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save verification decision.')
    } finally {
      setSaving(false)
    }
  }

  const rows = items.filter((i) => i.type === tab)

  return (
    <>
      <PageHeader title="Verification Center" description="Review student-submitted documents. Every decision is recorded in the audit log." />

      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist">
        {tabs.map((t) => {
          const count = items.filter((i) => i.type === t.key && i.status === 'Pending').length
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn('flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors', tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              {t.label}
              {count > 0 && <span className={cn('rounded-full px-1.5 text-xs tabular-nums', tab === t.key ? 'bg-primary-foreground/20' : 'bg-muted')}>{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Internship</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3"><p className="font-medium">{r.student}</p><p className="text-xs text-muted-foreground">{r.regNo} · {r.branch}</p></td>
                  <td className="px-4 py-3"><p>{r.company}</p><p className="text-xs text-muted-foreground">{r.role}</p></td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">{formatDate(r.submitted)}</td>
                  <td className="px-4 py-3"><VerifyBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => setReview(r)}>Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nothing to review here. All caught up.</p>}
      </div>

      <Modal
        open={!!review}
        onClose={() => { setReview(null); setConfirmReject(false) }}
        size="lg"
        title={`Review ${review?.type.toLowerCase() ?? ''}`}
        description={review ? `${review.student} · ${review.regNo} · ${review.company}` : ''}
        footer={
          confirmReject ? (
            <>
              <p className="mr-auto self-center text-sm text-destructive">Reject this document? The student will be notified.</p>
              <Button variant="outline" disabled={saving} onClick={() => setConfirmReject(false)}>Cancel</Button>
              <Button variant="destructive" disabled={saving} onClick={() => { void decide('Rejected') }}>Confirm reject</Button>
            </>
          ) : (
            <>
              <Button variant="destructive" disabled={saving} onClick={() => setConfirmReject(true)}><XCircle /> Reject</Button>
              <Button variant="outline" disabled={saving || !note.trim()} onClick={() => { void decide('Additional Proof Required') }}><MessageSquareWarning /> Request More Information</Button>
              <Button className="bg-success text-success-foreground hover:bg-success/90" disabled={saving} onClick={() => { void decide('Verified') }}><CheckCircle2 /> {saving ? 'Saving…' : 'Verify'}</Button>
            </>
          )
        }
      >
        {review && (
          <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
            {review.documentId ? (
              review.file.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`/api/faculty/documents/${encodeURIComponent(review.documentId)}/download`}
                  title={`Full document: ${review.file}`}
                  className="h-[65vh] min-h-[520px] w-full rounded-lg border bg-background"
                />
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
                  <p className="text-sm font-medium">{review.file}</p>
                  <p className="text-sm text-muted-foreground">DOCX files cannot be previewed directly in the browser.</p>
                  <a
                    href={`/api/faculty/documents/${encodeURIComponent(review.documentId)}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Open full document
                  </a>
                </div>
              )
            ) : (
              <DocPreview
                title={review.file}
                lines={[
                  ['Issued to', review.student],
                  ['Organisation', review.company],
                  ['Position', review.role],
                  ['Submitted', formatDate(review.submitted)],
                ]}
              />
            )}
            <div className="flex flex-col gap-4">
              <dl className="flex flex-col gap-2 text-sm">
                {[['Type', review.type], ['Branch', review.branch], ['Current status', review.status]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Checklist: company letterhead, student name & reg. no., dates, signature or official HR email.
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Note to student</Label>
                <Textarea id="note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when requesting more information" />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
