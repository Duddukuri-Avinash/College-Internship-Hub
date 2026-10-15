'use client'

import { useState } from 'react'
import { AlertTriangle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared'
import { Switch } from '@/components/student/form-bits'
import { Confirm } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { PERMISSIONS, type PermKey, type RoleDef } from '@/lib/admin-data'

export function RolesPermissions() {
  const { roles, setRoles, log } = useAdmin()
  const [draft, setDraft] = useState<RoleDef[]>(roles)
  const [confirming, setConfirming] = useState(false)

  const changed = draft.filter((d) => {
    const orig = roles.find((r) => r.id === d.id)!
    return PERMISSIONS.some((p) => orig.perms[p.key] !== d.perms[p.key])
  })
  const affectedUsers = changed.reduce((n, r) => n + r.users, 0)

  function toggle(id: string, key: PermKey, v: boolean) {
    setDraft((list) => list.map((r) => (r.id === id ? { ...r, perms: { ...r.perms, [key]: v } } : r)))
  }

  function save() {
    changed.forEach((d) => {
      const orig = roles.find((r) => r.id === d.id)!
      const diff = PERMISSIONS.filter((p) => orig.perms[p.key] !== d.perms[p.key])
      log('Updated role permissions', 'Settings', d.name, Object.fromEntries(diff.map((p) => [p.label, orig.perms[p.key] ? 'Allowed' : 'Denied'])), Object.fromEntries(diff.map((p) => [p.label, d.perms[p.key] ? 'Allowed' : 'Denied'])))
    })
    setRoles(draft)
    setConfirming(false)
    toast.success('Permissions saved')
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Role</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Users</th>
                {PERMISSIONS.map((p) => <th key={p.key} className="whitespace-nowrap px-4 py-3 text-center font-medium">{p.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {draft.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      {r.name}
                      {r.locked && <Lock className="size-3.5 text-muted-foreground" aria-label="Locked role" />}
                    </span>
                    {changed.some((c) => c.id === r.id) && <span className="text-xs text-warning-foreground">Unsaved changes</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.users}</td>
                  {PERMISSIONS.map((p) => (
                    <td key={p.key} className="px-4 py-3">
                      <div className="flex justify-center">
                        {r.locked ? (
                          <span className="text-xs text-muted-foreground">Always</span>
                        ) : (
                          <Switch checked={r.perms[p.key]} onChange={(v) => toggle(r.id, p.key, v)} label={`${p.label} for ${r.name}`} />
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {changed.length ? `${changed.length} role${changed.length > 1 ? 's' : ''} changed · affects ${affectedUsers} existing user${affectedUsers === 1 ? '' : 's'}` : 'No unsaved changes. The Admin role always has every permission.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!changed.length} onClick={() => setDraft(roles)}>Discard</Button>
            <Button disabled={!changed.length} onClick={() => setConfirming(true)}>Save changes</Button>
          </div>
        </div>
      </Panel>

      <Confirm open={confirming} onClose={() => setConfirming(false)} title="Save permission changes?" confirmLabel="Save changes" destructive={false} onConfirm={save}>
        <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">This affects {affectedUsers} existing user{affectedUsers === 1 ? '' : 's'}.</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {changed.map((c) => <li key={c.id}>{c.name} ({c.users} users)</li>)}
            </ul>
            <p className="mt-1 text-muted-foreground">Changes apply on their next page load and are recorded in the audit log.</p>
          </div>
        </div>
      </Confirm>
    </>
  )
}
