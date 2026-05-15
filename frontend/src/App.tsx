import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { apiAuthMe, setUnauthorizedHandler, type AuthUser } from '@/api'
import { FlashApp } from '@/app/FlashApp'
import { LoginPage } from '@/pages/LoginPage'

function NavigateToLogin() {
  const loc = useLocation()
  const target = loc.pathname + (loc.search || '')
  return <Navigate to="/login" replace state={{ from: target || '/' }} />
}

function HomeRoute({ authUser }: { authUser: AuthUser | null }) {
  if (authUser) return <Navigate to="/people" replace />
  return <Navigate to="/login" replace state={{ from: '/' }} />
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthUser(null)
    })
    return () => {
      setUnauthorizedHandler(undefined)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { user } = await apiAuthMe()
        if (!cancelled) setAuthUser(user)
      } catch {
        if (!cancelled) setAuthUser(null)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!authChecked) {
    return (
      <div className="flex h-svh items-center justify-center bg-bg text-sm text-ink-muted">
        Loading…
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authUser ? <Navigate to="/people" replace /> : <LoginPage onAuthed={setAuthUser} />
        }
      />
      <Route path="/" element={<HomeRoute authUser={authUser} />} />
      <Route
        path="/:tab"
        element={
          authUser ? (
            <FlashApp authUser={authUser} setAuthUser={setAuthUser} />
          ) : (
            <NavigateToLogin />
          )
        }
      />
      <Route
        path="*"
        element={authUser ? <Navigate to="/people" replace /> : <NavigateToLogin />}
      />
    </Routes>
  )
}
