'use client'

import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, PageHeader, Panel, selectClass } from '@/components/shared'
import { Field, Switch } from '@/components/student/form-bits'
import { useStudentAccount } from '@/components/student/student-account-provider'

type Toggles = Record<string, boolean>

const notificationItems: { key: string; label: string; hint: string }[] = [
  { key: 'newOpp', label: 'New college opportunities', hint: 'When faculty post an internship you are eligible for.' },
  { key: 'deadlines', label: 'Deadline reminders', hint: 'A reminder before internship application deadlines.' },
  { key: 'verification', label: 'Verification updates', hint: 'Status changes on offer letters, certificates and self-found submissions.' },
  { key: 'digest', label: 'Weekly digest', hint: 'A Monday summary of matches and upcoming deadlines.' },
]

const privacyItems: { key: string; label: string; hint: string }[] = [
  { key: 'showCgpa', label: 'Show CGPA to faculty', hint: 'Faculty can still see it when checking eligibility.' },
  { key: 'showResume', label: 'Let faculty view my resume', hint: 'Needed for faculty to support your applications.' },
  { key: 'seniorDirectory', label: 'List me in the senior directory after I graduate', hint: 'Juniors can read your verified experience posts.' },
  { key: 'aiGuidance', label: 'Use my profile for AI recommendations', hint: 'Powers matches, resume analysis and roadmaps. Turning it off reduces personalisation.' },
]

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onChange={onChange} label={label} />
    </li>
  )
}

export function StudentSettings() {
  const { account, loading, updatePhone } = useStudentAccount()
  const [phone, setPhone] = useState<string | null>(null)
  const [savingPhone, setSavingPhone] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [notif, setNotif] = useState<Toggles>({ newOpp: true, deadlines: true, verification: true, application: true, digest: false })
  const [channels, setChannels] = useState<Toggles>({ inApp: true, email: true })
  const [privacy, setPrivacy] = useState<Toggles>({ showCgpa: true, showResume: true, seniorDirectory: true, aiGuidance: true })
  const [visibility, setVisibility] = useState('college')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pw.current) return setPwError('Enter your current password.')
    if (pw.next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (pw.next !== pw.confirm) return setPwError('New passwords do not match.')
    setPwError('')
    setPw({ current: '', next: '', confirm: '' })
    toast.success('Password changed')
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your account, notifications and privacy." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Account">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="st-name" hint="Managed by the college records.">
              <Input id="st-name" value={account?.fullName ?? (loading ? 'Loading…' : '')} disabled className="h-9" />
            </Field>
            <Field label="Roll number" htmlFor="st-roll">
              <Input id="st-roll" value={account?.rollNumber ?? (loading ? 'Loading…' : '')} disabled className="h-9" />
            </Field>
            <Field label="College email" htmlFor="st-email" className="sm:col-span-2" hint="Verified. Contact the Training & Placement Cell to change it.">
              <Input id="st-email" value={account?.email ?? (loading ? 'Loading…' : '')} disabled className="h-9" />
            </Field>
            <Field label="Phone" htmlFor="st-phone" className="sm:col-span-2">
              <div className="flex gap-2">
                <Input id="st-phone" type="tel" value={phone ?? account?.phone ?? ''} onChange={(e) => setPhone(e.target.value)} className="h-9" />
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={savingPhone || loading || !account}
                  onClick={async () => {
                    setSavingPhone(true)
                    try {
                      await updatePhone(phone ?? account?.phone ?? '')
                      setPhone(null)
                      toast.success('Phone number updated')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Phone number could not be updated.')
                    } finally {
                      setSavingPhone(false)
                    }
                  }}
                >
                  {savingPhone ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </Field>
          </div>

          <form onSubmit={changePassword} className="mt-6 flex flex-col gap-4 border-t pt-5" noValidate>
            <h3 className="text-sm font-semibold">Change password</h3>
            <Field label="Current password" htmlFor="st-cur">
              <Input id="st-cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className="h-9" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" htmlFor="st-new">
                <Input id="st-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className="h-9" />
              </Field>
              <Field label="Confirm new password" htmlFor="st-conf">
                <Input id="st-conf" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} className="h-9" />
              </Field>
            </div>
            {pwError && (
              <p className="text-xs text-destructive" role="alert">
                {pwError}
              </p>
            )}
            <Button type="submit" variant="outline" className="self-start">
              Update password
            </Button>
          </form>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Notification preferences">
            <ul className="flex flex-col divide-y">
              {notificationItems.map((n) => (
                <ToggleRow key={n.key} id={`n-${n.key}`} label={n.label} hint={n.hint} checked={notif[n.key]} onChange={(v) => setNotif((p) => ({ ...p, [n.key]: v }))} />
              ))}
            </ul>
            <div className="mt-5 border-t pt-4">
              <p className="mb-3 text-sm font-medium">Delivery channels</p>
              <ul className="flex flex-col divide-y">
                <ToggleRow id="ch-inapp" label="In-app notifications" hint="Shown under the bell icon." checked={channels.inApp} onChange={(v) => setChannels((p) => ({ ...p, inApp: v }))} />
                <ToggleRow id="ch-email" label="Email" hint={`Sent to ${account?.email ?? ''}.`} checked={channels.email} onChange={(v) => setChannels((p) => ({ ...p, email: v }))} />
              </ul>
            </div>
            <Button className="mt-5" onClick={() => toast.success('Notification preferences saved')}>
              Save preferences
            </Button>
          </Panel>

          <Panel title="Privacy controls">
            <Field label="Who can see my profile" htmlFor="st-vis">
              <select id="st-vis" className={selectClass} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="faculty">Faculty only</option>
                <option value="college">Faculty and students of my college</option>
              </select>
            </Field>
            <ul className="mt-4 flex flex-col divide-y">
              {privacyItems.map((p) => (
                <ToggleRow key={p.key} id={`p-${p.key}`} label={p.label} hint={p.hint} checked={privacy[p.key]} onChange={(v) => setPrivacy((s) => ({ ...s, [p.key]: v }))} />
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => toast.success('Privacy settings saved')}>Save privacy settings</Button>
              <Button variant="outline" onClick={() => toast.error('Data export is not connected to Supabase yet.')}>
                <Download /> Download my data
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Delete account" className="border-destructive/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-muted-foreground">Request deletion of your InternHub account. Verified internship records kept by the college for academic purposes are not affected.</p>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Request deletion
          </Button>
        </div>
      </Panel>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Request account deletion?"
        description="Your Training & Placement Cell will be notified to process this."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false)
                toast.success('Deletion request sent')
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">You will stay signed in until the request is processed. You can cancel it by contacting the Training &amp; Placement Cell.</p>
      </Modal>
    </>
  )
}
