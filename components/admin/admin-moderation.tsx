'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/shared'
import { Pill, fmtDate, type Tone } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { Table, Tabs } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import type { ModDecision, ModItem, ModState } from '@/lib/admin-data'

const TABS = ['Reported', 'Pending review', 'Resolved'] as const satisfies readonly ModState[]
const decisionTone: Record<ModDecision, Tone> = { Approved: 'success', Removed: 'danger', 'Author warned': 'warning', 'Sharing suspended': 'orange' }

export function Moderation() {
  const { moderation, setModeration, log } = useAdmin()
  const [tab, setTab] = useState<ModState>('Reported')
  const [open, setOpen] = useState<ModItem | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const counts = Object.fromEntries(TABS.map((t) => [t, moderation.filter((m) => m.state === t).length])) as Record<ModState, number>
  const rows = moderation.filter((m) => m.state === tab)

  function decide(d: ModDecision) {
    if (!open) return
    if (note.trim().length < 5) return setError('Add a decision note (at least 5 characters) — it is kept with the resolved item.')
    setModeration((l) => l.map((m) => (m.id === open.id ? { ...m, state: 'Resolved', decision: d, note: note.trim() } : m)))
    log(`Moderation: ${d}`, 'Moderation', open.title, { state: open.state }, { state: 'Resolved', decision: d })
    toast.success(`${d} · moved to Resolved`)
    setOpen(null)
  }

  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Moderation queues" counts={counts} />
      <Table
        empty={{ icon: <ShieldCheck />, title: tab === 'Resolved' ? 'Nothing resolved yet' : 'Queue is clear', description: tab === 'Resolved' ? undefined : 'No items need attention right now.' }}
        head={['Content', 'Author', tab === 'Resolved' ? 'Decision' : 'Reason', 'Date', <span key="a" className="sr-only">Actions</span>]}
        rows={rows.map((m) => [
          <span key="c" className="flex flex-col"><span className="font-medium">{m.title}</span><span className="line-clamp-1 max-w-80 text-xs text-muted-foreground">{m.content}</span></span>,
          m.author,
          tab === 'Resolved' && m.decision ? (
            <span key="d" className="flex flex-col gap-1"><Pill tone={decisionTone[m.decision]}>{m.decision}</Pill><span className="max-w-60 text-xs text-muted-foreground">{m.note}</span></span>
          ) : m.reason,
          <span key="dt" className="whitespace-nowrap tabular-nums text-muted-foreground">{fmtDate(m.date)}</span>,
          <div key="x" className="flex justify-end"><Button size="sm" variant="outline" onClick={() => { setOpen(m); setNote(m.note ?? ''); setError('') }}>{m.state === 'Resolved' ? 'View' : 'Review'}</Button></div>,
        ])}
      />

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        size="lg"
        title={open?.title ?? ''}
        description={open ? `${open.kind} · ${fmtDate(open.date)}` : undefined}
        footer={
          open?.state === 'Resolved' ? <Button variant="outline" onClick={() => setOpen(null)}>Close</Button> : (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => decide('Author warned')}>Warn author</Button>
              <Button variant="outline" onClick={() => decide('Sharing suspended')}>Suspend sharing</Button>
              <Button variant="destructive" onClick={() => decide('Removed')}>Remove</Button>
              <Button onClick={() => decide('Approved')}>Approve</Button>
            </div>
          )
        }
      >
        {open && (
          <div className="flex flex-col gap-4 text-sm">
            <blockquote className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 leading-relaxed">{open.content}</blockquote>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{open.reporter ? 'Reporter reason' : 'Queue reason'}</p>
                <p className="mt-1 font-medium">{open.reason}</p>
                {open.reporter && <p className="mt-1 text-xs text-muted-foreground">Reported by {open.reporter}</p>}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Author history · {open.author}</p>
                <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
                  <div><dt className="text-xs text-muted-foreground">Posts</dt><dd className="font-semibold tabular-nums">{open.authorHistory.posts}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Warnings</dt><dd className="font-semibold tabular-nums">{open.authorHistory.warnings}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Removed</dt><dd className={`font-semibold tabular-nums ${open.authorHistory.removed ? 'text-destructive' : ''}`}>{open.authorHistory.removed}</dd></div>
                </dl>
              </div>
            </div>
            {open.state === 'Resolved' ? (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Decision</p>
                {open.decision && <Pill tone={decisionTone[open.decision]} className="mt-1">{open.decision}</Pill>}
                <p className="mt-2">{open.note}</p>
              </div>
            ) : (
              <Field label="Decision note" htmlFor="mod-note" error={error} hint="Saved with the resolved item and in the audit log.">
                <Textarea id="mod-note" rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError('') }} aria-invalid={!!error || undefined} />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
