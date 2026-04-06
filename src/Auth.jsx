import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth({ theme, onToggleTheme }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('יש למלא מייל וסיסמה')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('מייל או סיסמה שגויים')
          } else {
            setError('שגיאה בהתחברות. נסה שוב.')
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          if (error.message.includes('already registered')) {
            setError('המייל הזה כבר רשום. נסה להתחבר.')
          } else {
            setError('שגיאה בהרשמה: ' + error.message)
          }
        }
      }
    } catch {
      setError('שגיאה לא צפויה. נסה שוב.')
    }

    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="theme-toggle-wrapper">
        <button className="theme-toggle" onClick={onToggleTheme}>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="app-title" style={{ fontSize: 38 }}>בריאים 💪</h1>
          <p className="app-subtitle">המסע שלך לחיים בריאים מתחיל כאן</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError('') }}
          >
            כניסה
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError('') }}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">כתובת מייל</label>
            <input
              type="email"
              className="profile-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              dir="ltr"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">סיסמה</label>
            <input
              type="password"
              className="profile-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isLogin ? '••••••' : 'לפחות 6 תווים'}
              dir="ltr"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '⏳ רגע...' : isLogin ? '🔓 כניסה' : '✨ הרשמה'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'אין לך חשבון? ' : 'כבר יש לך חשבון? '}
          <button
            className="auth-switch-btn"
            onClick={() => { setIsLogin(!isLogin); setError('') }}
          >
            {isLogin ? 'הירשם כאן' : 'התחבר כאן'}
          </button>
        </p>
      </div>
    </div>
  )
}
