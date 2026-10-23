'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppShell, type Role, type View } from '@/components/app-shell'
import { AuthFlow, type AuthScreen, type RegisteredStudent } from '@/components/auth/auth-flow'
import { type RegisteredFaculty } from '@/components/auth/faculty-auth'
import { StudentDashboard } from '@/components/student/dashboard'
import { Discover } from '@/components/student/discover'
import { InternshipDetail } from '@/components/student/internship-detail'
import { MyInternships } from '@/components/student/my-internships'
import { Seniors, ExperienceDetail, ShareExperience } from '@/components/student/seniors'
import { StudentProfile } from '@/components/student/profile'
import { Onboarding } from '@/components/student/onboarding'
import { ResumeAnalysis } from '@/components/student/resume-analysis'
import { SkillRoadmap } from '@/components/student/roadmap'
import { QuizPage } from '@/components/student/quiz-page'
import { SubmitInternship } from '@/components/student/submit-internship'
import { StudentSettings } from '@/components/student/settings'
import { FacultyDashboard } from '@/components/faculty/dashboard'
import { VerificationCenter } from '@/components/faculty/verification'
import { PostOpportunity } from '@/components/faculty/post-opportunity'
import { AdminPortal } from '@/components/admin/admin-portal'
import { FacultyStoreProvider } from '@/components/faculty/faculty-store'
import { AdminStoreProvider } from '@/components/admin/admin-store'
import { ManageOpportunities } from '@/components/faculty/manage-opportunities'
import { FacultyStudents, FacultyStudentDetail } from '@/components/faculty/students'
import { FacultyRequests } from '@/components/faculty/requests'
import { FacultyReports } from '@/components/faculty/reports'
import { FacultyAnnouncements } from '@/components/faculty/announcements'
import { FacultySettings } from '@/components/faculty/settings'
import { getSignedInProfile, signOut, type AuthProfile } from '@/lib/supabase/auth'
import { StudentAccountProvider } from '@/components/student/student-account-provider'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { NotificationsPage } from '@/components/notifications/notifications-page'

const home: Record<Role, View> = {
  student: { name: 'student-dashboard' },
  faculty: { name: 'faculty-dashboard' },
  admin: { name: 'admin', section: 'overview' },
}

function viewRole(view: View): Role {
  if (view.name === 'notifications') return 'student'
  if (view.name.startsWith('faculty-') || view.name === 'faculty-dashboard' || view.name === 'verification' || view.name === 'post-opportunity') return 'faculty'
  if (view.name === 'admin') return 'admin'
  return 'student'
}

export function InternHubApp() {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [view, setView] = useState<View>(home.student)
  const [history, setHistory] = useState<View[]>([])
  const [auth, setAuth] = useState<AuthScreen | null>('login')
  const [registeredStudent, setRegisteredStudent] = useState<RegisteredStudent | null>(null)
  const [registeredFaculty, setRegisteredFaculty] = useState<RegisteredFaculty | null>(null)
  const [firstLogin, setFirstLogin] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const recoveryFlow = useRef(false)

  const enterPortal = useCallback((nextProfile: AuthProfile, isFirstLogin: boolean) => {
    if (nextProfile.role === 'faculty' && nextProfile.status !== 'active') {
      setProfile(null)
      setAuth('faculty-pending')
      return
    }
    setProfile(nextProfile)
    setFirstLogin(isFirstLogin)
    setView(nextProfile.role === 'student' && isFirstLogin ? { name: 'onboarding' } : home[nextProfile.role])
    setAuth(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (recoveryFlow.current) return
    const nextProfile = await getSignedInProfile()
    if (!nextProfile) {
      setProfile(null)
      setAuth('login')
      return
    }

    enterPortal(nextProfile, nextProfile.first_login ?? false)
  }, [enterPortal])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('auth') === 'reset') {
      recoveryFlow.current = true
      setAuth('reset')
    } else {
      const authError = new URLSearchParams(window.location.search).get('auth_error')
      if (authError) {
        toast.error(authError === 'missing_code' ? 'The authentication link is incomplete.' : 'The authentication link is invalid or expired.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    let active = true
    void refreshSession().catch((error: unknown) => {
      console.error('Unable to restore the SQL Server session:', error)
      if (active) {
        toast.error(error instanceof Error ? error.message : 'Unable to restore your session.')
        setProfile(null)
        setAuth('login')
      }
    }).finally(() => {
      if (active) setCheckingSession(false)
    })

    return () => {
      active = false
    }
  }, [refreshSession])

  const setAuthScreen = (screen: AuthScreen) => {
    if (screen === 'login' && recoveryFlow.current) {
      recoveryFlow.current = false
      window.history.replaceState({}, '', window.location.pathname)
      void refreshSession().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Unable to load your account.')
      })
    }
    setAuth(screen)
  }

  const navigate = (nextView: View) => {
    if (!profile || (nextView.name !== 'notifications' && viewRole(nextView) !== profile.role)) {
      toast.error('Your account does not have access to that portal.')
      if (profile) setView(home[profile.role])
      return
    }
    setHistory((current) => {
      const previous = current[current.length - 1]
      if (JSON.stringify(previous) === JSON.stringify(view)) {
        return current
      }
      return [...current, view]
    })
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setHistory((current) => {
      if (current.length === 0) return current
      const previous = current[current.length - 1]
      setView(previous)
      return current.slice(0, -1)
    })
  }

  const logout = async () => {
    try {
      await signOut()
      setProfile(null)
      setAuth('login')
      toast.success('You have been logged out')
    } catch (error) {
      console.error('Sign-out failed:', error)
      toast.error(error instanceof Error ? error.message : 'Sign-out failed.')
    }
  }

  if (checkingSession) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Checking your session…</div>
  }

  if (auth || !profile) {
    return (
      <AuthFlow
        screen={auth ?? 'login'}
        setScreen={setAuthScreen}
        registered={registeredStudent}
        setRegistered={setRegisteredStudent}
        initialFaculty={registeredFaculty}
        onAuthenticated={enterPortal}
      />
    )
  }

  if (view.name !== 'notifications' && viewRole(view) !== profile.role) {
    setView(home[profile.role])
    return null
  }

  return (
    <NotificationProvider>
      <FacultyStoreProvider enabled={profile.role === 'faculty'}>
        <AdminStoreProvider enabled={profile.role === 'admin'}>
          <StudentAccountProvider profile={profile}>
            <AppShell
            role={profile.role}
            profile={profile}
            view={view}
            onNavigate={navigate}
            onBack={goBack}
            canGoBack={history.length > 0}
            onLogout={() => { void logout() }}
          >
          {view.name === 'student-dashboard' && <StudentDashboard navigate={navigate} />}
          {view.name === 'discover' && <Discover navigate={navigate} />}
          {view.name === 'internship' && <InternshipDetail id={view.id} navigate={navigate} />}
          {view.name === 'my-internships' && <MyInternships />}
          {view.name === 'seniors' && <Seniors navigate={navigate} />}
          {view.name === 'experience' && <ExperienceDetail id={view.id} navigate={navigate} />}
          {view.name === 'share-experience' && <ShareExperience navigate={navigate} />}
          {view.name === 'profile' && <StudentProfile navigate={navigate} />}
          {view.name === 'onboarding' && <Onboarding navigate={(nextView) => { setFirstLogin(false); navigate(nextView) }} firstLogin={firstLogin} name={profile.full_name} />}
          {view.name === 'resume-analysis' && <ResumeAnalysis />}
          {view.name === 'roadmap' && <SkillRoadmap navigate={navigate} />}
          {view.name === 'quiz' && <QuizPage skill={view.skill} level={view.level} navigate={navigate} />}
          {view.name === 'submit-internship' && <SubmitInternship navigate={navigate} />}
          {view.name === 'settings' && <StudentSettings />}
          {view.name === 'notifications' && <NotificationsPage navigate={navigate} />}
          {view.name === 'faculty-dashboard' && <FacultyDashboard navigate={navigate} />}
          {view.name === 'verification' && <VerificationCenter />}
          {view.name === 'post-opportunity' && <PostOpportunity key={view.editId ?? 'new'} editId={view.editId} navigate={navigate} />}
          {view.name === 'faculty-opportunities' && <ManageOpportunities navigate={navigate} />}
          {view.name === 'faculty-students' && <FacultyStudents key={view.quick ?? 'all'} quick={view.quick} navigate={navigate} />}
          {view.name === 'faculty-student' && <FacultyStudentDetail id={view.id} navigate={navigate} />}
          {view.name === 'faculty-requests' && <FacultyRequests />}
          {view.name === 'faculty-reports' && <FacultyReports />}
          {view.name === 'faculty-announcements' && <FacultyAnnouncements />}
          {view.name === 'faculty-settings' && <FacultySettings />}
          {view.name === 'admin' && <AdminPortal section={view.section} navigate={navigate} />}
            </AppShell>
          </StudentAccountProvider>
        </AdminStoreProvider>
      </FacultyStoreProvider>
    </NotificationProvider>
  )
}
