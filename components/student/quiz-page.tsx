'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/shared'
import { cn } from '@/lib/utils'
import type { View } from '@/components/app-shell'

type Question = { q: string; o: string[] }
type Quiz = { id: string; questions: Question[]; expiresAt: string }
type QuizResult = { score: number; total: number; passed: boolean; correctAnswers: number[] }

export function QuizPage({ skill, navigate }: { skill: string; navigate: (view: View) => void }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/student/quiz/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skill }),
    }).then(async (response) => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? payload.detail ?? 'Unable to start the quiz.')
      if (!active) return
      setQuiz(payload)
      setAnswers(Array(payload.questions.length).fill(-1))
      setSecondsLeft(Math.max(0, Math.ceil((Date.parse(payload.expiresAt) - Date.now()) / 1000)))
    }).catch((error: unknown) => {
      if (active) {
        toast.error(error instanceof Error ? error.message : 'Unable to start the quiz.')
        navigate({ name: 'roadmap' })
      }
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [navigate, skill])

  useEffect(() => {
    if (!quiz || result) return
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [quiz, result])

  useEffect(() => {
    if (!quiz) return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void fetch(`/api/student/quiz/tab-leave?attempt_id=${encodeURIComponent(quiz.id)}`, { method: 'POST' })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [quiz])

  async function submitQuiz() {
    if (!quiz || answers.some((answer) => answer < 0) || submitting) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: quiz.id, answers }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? payload.detail ?? 'Unable to submit the quiz.')
      setResult(payload)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit the quiz.')
    } finally {
      setSubmitting(false)
    }
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')

  if (loading) return <p className="text-sm text-muted-foreground">Preparing your quiz…</p>
  if (!quiz) return null

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Button variant="ghost" className="w-fit" onClick={() => navigate({ name: 'roadmap' })}><ArrowLeft /> Back to roadmap</Button>
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <h1 className="text-xl font-semibold">Quiz: {skill}</h1>
        <span className={cn('font-mono text-lg font-bold', secondsLeft < 60 && 'text-destructive')}>Time: {minutes}:{seconds}</span>
      </div>
      <Panel>
        <p className="text-sm text-muted-foreground">Answer every question. You need 70% to pass.</p>
        <ol className="mt-4 flex flex-col gap-5">
          {quiz.questions.map((question, questionIndex) => (
            <li key={`${quiz.id}-${questionIndex}`}>
              <p className="text-sm font-medium">{questionIndex + 1}. {question.q}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {question.o.map((option, optionIndex) => (
                  <label key={option} className={cn('rounded-lg border p-3 text-sm', answers[questionIndex] === optionIndex && 'border-primary bg-accent')}>
                    <input className="mr-2" type="radio" name={`${quiz.id}-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))} />
                    {option}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex items-center gap-3">
          <Button disabled={submitting || secondsLeft === 0} onClick={() => void submitQuiz()}>{submitting ? 'Submitting…' : 'Submit quiz'}</Button>
          {result && <span className={cn('text-sm font-medium', result.passed ? 'text-success' : 'text-destructive')}>{result.score}/{result.total} — {result.passed ? 'Passed' : 'Failed'}</span>}
        </div>
        {result && (
          <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold">Review incorrect answers</p>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              {quiz.questions.map((question, questionIndex) => {
                const selectedIndex = answers[questionIndex]
                const correctIndex = result.correctAnswers[questionIndex]
                if (selectedIndex === correctIndex) return null
                return <li key={`${quiz.id}-review-${questionIndex}`}><p className="font-medium">{questionIndex + 1}. {question.q}</p><p className="text-destructive">Your answer: {question.o[selectedIndex]}</p><p className="text-success">Correct answer: {question.o[correctIndex]}</p></li>
              })}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  )
}
