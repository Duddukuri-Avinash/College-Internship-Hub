'use client'

import { useState } from 'react'
import { AlertTriangle, Check, FileText, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DocPreview, FileDrop, Modal, PageHeader, Panel, VerifyBadge } from '@/components/shared'
import { lifecycleStages, myInternships, type VerifyStatus } from '@/lib/data'
import { cn } from '@/lib/utils'
import { useStudentAccount } from '@/components/student/student-account-provider'

function Lifecycle({ stage }: { stage: number }) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Internship lifecycle">
      {lifecycleStages.map((s, idx) => {
        const done = idx < stage
        const current = idx === stage
        return (
          <li key={s} className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
            <div className="flex items-center sm:w-full">
              <span className={cn('hidden h-0.5 flex-1 sm:block', idx === 0 ? 'bg-transparent' : done || current ? 'bg-success' : 'bg-border')} />
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  done ? 'border-success bg-success text-success-foreground' : current ? 'border-primary bg-accent text-primary' : 'border-border bg-card text-muted-foreground',
                )}
                aria-current={current ? 'step' : undefined}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : idx + 1}
              </span>
              <span className={cn('hidden h-0.5 flex-1 sm:block', idx === lifecycleStages.length - 1 ? 'bg-transparent' : done ? 'bg-success' : 'bg-border')} />
            </div>
            <span className={cn('text-xs', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function MyInternships() {
  const { account, submitVerificationDocument } = useStudentAccount()
  const [upload, setUpload] = useState<null | { kind: 'offer' | 'certificate' | 'proof'; company: string }>(null)
  const [file, setFile] = useState<File>()
  const [submitting, setSubmitting] = useState(false)

  const closeUpload = () => {
    setUpload(null)
    setFile(undefined)
    setSubmitting(false)
  }

  async function submitDocument() {
    if (!file || !upload) return
    setSubmitting(true)
    try {
      const kind = upload.kind === 'offer' ? 'offer_letter' : upload.kind === 'certificate' ? 'certificate' : 'other'
      await submitVerificationDocument(file, kind)
      toast.success('Document submitted for faculty verification.')
      closeUpload()
    } catch (error) {
      console.error('Unable to submit document for verification:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to submit document for verification.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="My Internships"
        description="Upload offer letters and certificates for faculty verification. Verified records appear on your academic profile."
        actions={
          <Button onClick={() => setUpload({ kind: 'offer', company: 'New internship' })}>
            <Plus /> Add internship
          </Button>
        }
      />

      {myInternships.map((m) => {
        const offerStatus: VerifyStatus = m.offerStatus
        return (
          <Panel key={m.id}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary" aria-hidden="true">
                  {m.company.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h2 className="font-semibold">{m.role}</h2>
                  <p className="text-sm text-muted-foreground">
                    {m.company} · {m.period} · Mentor: {m.mentor}
                  </p>
                </div>
              </div>
            </div>

            <Lifecycle stage={m.stage} />

            {offerStatus === 'Additional Proof Required' && (
              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center" role="alert">
                <AlertTriangle className="size-5 shrink-0 text-orange-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800">Additional Information Required</p>
                  <p className="text-sm text-orange-800/80">{m.facultyNote}</p>
                </div>
                <Button onClick={() => setUpload({ kind: 'proof', company: m.company })}>
                  <Upload /> Upload Additional Proof
                </Button>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DocRow label="Offer letter" status={offerStatus} file={`${m.company.toLowerCase()}_offer_letter.pdf`} />
              {m.certificateStatus ? (
                <DocRow label="Completion certificate" status={m.certificateStatus} file={`${m.company.toLowerCase()}_certificate.pdf`} />
              ) : (
                <button onClick={() => setUpload({ kind: 'certificate', company: m.company })} className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-left text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  <Upload className="size-4" aria-hidden="true" /> Upload completion certificate after internship ends
                </button>
              )}
            </div>
          </Panel>
        )
      })}
      {myInternships.length === 0 && (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No internship records are available for your account yet.
        </p>
      )}

      <Modal
        open={!!upload}
        onClose={closeUpload}
        size="lg"
        title={upload?.kind === 'certificate' ? 'Upload completion certificate' : upload?.kind === 'proof' ? 'Upload additional proof' : 'Upload offer letter'}
        description={`${upload?.company ?? ''} · Documents are reviewed by your department internship coordinator.`}
        footer={
          <>
            <Button variant="outline" onClick={closeUpload}>Cancel</Button>
            <Button
              disabled={!file || submitting}
              onClick={() => { void submitDocument() }}
            >
              {submitting ? 'Submitting…' : 'Submit for verification'}
            </Button>
          </>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FileDrop label="Click to choose a file" fileName={file?.name} onFile={setFile} />
          {file ? (
            <DocPreview
              title={file.name}
              lines={[
                ['Company', upload?.company ?? ''],
                ['Student', account ? `${account.fullName} · ${account.rollNumber}` : 'Student details unavailable'],
                ['Document type', upload?.kind ?? ''],
                ['Status', 'Ready to submit'],
              ]}
            />
          ) : (
            <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Select a file to see a preview here.
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

function DocRow({ label, status, file }: { label: string; status: VerifyStatus; file: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{file}</p>
      </div>
      <VerifyBadge status={status} />
    </div>
  )
}
