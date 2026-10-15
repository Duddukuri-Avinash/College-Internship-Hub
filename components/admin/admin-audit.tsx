'use client'

import { useState } from 'react'
import { FileDown, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/shared'
import { Pill } from '@/components/faculty/bits'
import { FilterSelect, SearchBox, Table, downloadFile } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import type { AuditCategory, AuditEntry } from '@/lib/admin-data'

const CATEGORIES: AuditCategory[] = ['Verification', 'Opportunity', 'Settings', 'Moderation', 'User management', 'Announcement']

export function AuditLogs() {
  const { audit } = useAdmin()
  const [q, setQ] = useState('')
  const [actor, setActor] = useState('All')
  const [cat, setCat] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<AuditEntry | null>(null)

  const actors = Array.from(new Set(audit.map((a) => a.actor)))
  const rows = audit.filter((l) => {
    const d = l.time.slice(0, 10)
    return (
      (!q.trim() || `${l.action} ${l.target} ${l.actor}`.toLowerCase().includes(q.trim().toLowerCase())) &&
      (actor === 'All' || l.actor === actor) &&
      (cat === 'All' || l.category === cat) &&
      (!from || d >= from) &&
      (!to || d <= to)
    )
  })

  function exportLog() {
    const csv = [['Time', 'Actor', 'Category', 'Action', 'Target', 'Before', 'After'], ...rows.map((l) => [l.time, l.actor, l.category, l.action, l.target, JSON.stringify(l.before ?? {}), JSON.stringify(l.after ?? {})])]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadFile('internhub-audit-log.csv', csv)
    toast.success(`Exported ${rows.length} log entries`)
  }

  const keys = open ? Array.from(new Set([...Object.keys(open.before ?? {}), ...Object.keys(open.after ?? {})])) : []

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={q} onChange={setQ} placeholder="Search action, target or actor" label="Search audit log" />
          <Button variant="outline" onClick={exportLog}><FileDown /> Export log</Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect label="Actor" value={actor} onChange={setActor} options={['All', ...actors]} />
          <FilterSelect label="Action type" value={cat} onChange={setCat} options={['All', ...CATEGORIES]} />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">From<Input type="date" className="h-9 bg-card" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">To<Input type="date" className="h-9 bg-card" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          {(from || to || actor !== 'All' || cat !== 'All' || q) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setActor('All'); setCat('All'); setQ('') }}>Clear filters</Button>}
        </div>
      </div>
      <Table
        empty={{ icon: <ScrollText />, title: 'No log entries match', description: 'Try widening the date range.' }}
        head={['Time', 'Actor', 'Type', 'Action', 'Target', <span key="a" className="sr-only">Details</span>]}
        rows={rows.map((l) => [
          <span key="t" className="whitespace-nowrap tabular-nums text-muted-foreground">{l.time}</span>,
          l.actor,
          <Pill key="c">{l.category}</Pill>,
          <span key="a" className="font-medium">{l.action}</span>,
          l.target,
          <div key="x" className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setOpen(l)}>Details</Button></div>,
        ])}
      />
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action ?? ''} description={open ? `${open.time} · ${open.actor}` : undefined} footer={<Button variant="outline" onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-[90px_1fr] gap-y-1.5">
              <dt className="text-muted-foreground">Type</dt><dd>{open.category}</dd>
              <dt className="text-muted-foreground">Target</dt><dd>{open.target}</dd>
            </dl>
            {keys.length ? (
              <table className="w-full overflow-hidden rounded-lg border text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Field</th><th className="px-3 py-2 font-medium">Before</th><th className="px-3 py-2 font-medium">After</th></tr></thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k} className="border-t">
                      <td className="px-3 py-2 font-medium">{k}</td>
                      <td className="px-3 py-2 text-destructive line-through decoration-destructive/40">{open.before?.[k] ?? '—'}</td>
                      <td className="px-3 py-2 text-success">{open.after?.[k] ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">No field changes recorded for this action.</p>}
          </div>
        )}
      </Modal>
    </>
  )
}
