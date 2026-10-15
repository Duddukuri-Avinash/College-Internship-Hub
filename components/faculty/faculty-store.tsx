'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { VerifyStatus } from '@/lib/data'
import {
  TODAY,
  announcementsSeed,
  deptStudents,
  facultyAccount,
  opportunitiesSeed,
  requestsSeed,
  verificationItems,
  type Announcement,
  type DeptStudent,
  type Opportunity,
  type StudentRequest,
  type VerificationItem,
} from '@/lib/faculty-data'

type Store = {
  students: DeptStudent[]
  reminders: Record<string, string>
  remind: (ids: string[]) => void
  opportunities: Opportunity[]
  saveOpportunity: (o: Opportunity) => void
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void
  duplicateOpportunity: (id: string) => Opportunity | undefined
  requests: StudentRequest[]
  updateRequest: (id: string, patch: Partial<StudentRequest>) => void
  replyRequest: (id: string, text: string) => void
  announcements: Announcement[]
  addAnnouncement: (a: Announcement) => void
  verifications: VerificationItem[]
  decide: (ids: string[], status: VerifyStatus, note?: string) => void
}

const FacultyStoreContext = createContext<Store | null>(null)

export function FacultyStoreProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Record<string, string>>({})
  const [opportunities, setOpportunities] = useState(opportunitiesSeed)
  const [requests, setRequests] = useState(requestsSeed)
  const [announcements, setAnnouncements] = useState(announcementsSeed)
  const [verifications, setVerifications] = useState(verificationItems)

  const value = useMemo<Store>(
    () => ({
      students: deptStudents,
      reminders,
      remind: (ids) => setReminders((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, TODAY])) })),
      opportunities,
      saveOpportunity: (o) =>
        setOpportunities((list) => (list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? o : x)) : [o, ...list])),
      updateOpportunity: (id, patch) => setOpportunities((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      duplicateOpportunity: (id) => {
        const src = opportunities.find((o) => o.id === id)
        if (!src) return
        const copy: Opportunity = { ...src, id: `o${Date.now()}`, role: `${src.role} (copy)`, status: 'Draft', interested: [], postedOn: TODAY }
        setOpportunities((list) => [copy, ...list])
        return copy
      },
      requests,
      updateRequest: (id, patch) => setRequests((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      replyRequest: (id, text) =>
        setRequests((list) =>
          list.map((r) =>
            r.id === id
              ? { ...r, status: r.status === 'New' ? 'In progress' : r.status, thread: [...r.thread, { by: facultyAccount.name, text, date: TODAY, faculty: true }] }
              : r,
          ),
        ),
      announcements,
      addAnnouncement: (a) => setAnnouncements((list) => [a, ...list]),
      verifications,
      decide: (ids, status, note) =>
        setVerifications((list) =>
          list.map((v) =>
            ids.includes(v.id)
              ? {
                  ...v,
                  status,
                  decidedBy: facultyAccount.name,
                  decidedOn: TODAY,
                  note: note || undefined,
                  audit: [
                    ...v.audit,
                    {
                      action: status === 'Verified' ? 'Verified' : status === 'Rejected' ? 'Rejected' : 'Additional proof requested',
                      by: facultyAccount.name,
                      date: TODAY,
                      note: note || undefined,
                      status,
                    },
                  ],
                }
              : v,
          ),
        ),
    }),
    [reminders, opportunities, requests, announcements, verifications],
  )

  return <FacultyStoreContext.Provider value={value}>{children}</FacultyStoreContext.Provider>
}

export function useFacultyStore() {
  const ctx = useContext(FacultyStoreContext)
  if (!ctx) throw new Error('useFacultyStore must be used inside FacultyStoreProvider')
  return ctx
}
