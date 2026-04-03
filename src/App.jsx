import { useState, useEffect, useCallback } from 'react'
import './App.css'

// ===== HELPERS =====
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const HABITS = [
  { id: 'dessert', name: 'קינוח אחד ביום', emoji: '🍰' },
  { id: 'snacks', name: 'בלי נשנושים', emoji: '🚫' },
  { id: 'plate', name: 'אוכלים מה שיש בצלחת', emoji: '🍽️' },
  { id: 'water', name: '2 כוסות מים לפני ארוחה', emoji: '💧' },
]

const PRINCIPLES = [
  { title: 'איזון מאקרו', desc: 'חלוקה מאוזנת בין חלבונים, פחמימות ושומנים בכל ארוחה' },
  { title: 'ירקות בכל ארוחה', desc: 'לפחות חצי צלחת ירקות טריים או מבושלים' },
  { title: 'אכילה מודעת', desc: 'לאכול לאט, בלי מסכים, ולהקשיב לתחושת השובע' },
  { title: 'תדירות אכילה', desc: '3 ארוחות עיקריות ביום בשעות קבועות' },
  { title: 'הידרציה', desc: 'לשתות לפחות 8 כוסות מים ביום, כולל לפני כל ארוחה' },
]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeeksInMonth(year, month) {
  const days = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  return Math.ceil((days + firstDay) / 7)
}

// Calculate target workouts for a month (3 per week)
function getWorkoutTarget(year, month) {
  const days = getDaysInMonth(year, month)
  const weeks = Math.ceil(days / 7)
  return weeks * 3
}

// ===== LOCAL STORAGE =====
function loadData(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('שגיאה בשמירה:', e)
  }
}

// ===== MAIN APP =====
function App() {
  const now = new Date()
  const [theme, setTheme] = useState(() => loadData('breaim-theme', 'dark'))
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  // Profile
  const [userName, setUserName] = useState(() => loadData('breaim-name', 'אלון'))
  const [weight, setWeight] = useState(() => loadData('breaim-weight', ''))
  const [goal, setGoal] = useState(() => loadData('breaim-goal', ''))

  // Habits data: { "2026-04": { "dessert": { "1": "success", "2": "fail" }, ... } }
  const [habitsData, setHabitsData] = useState(() => loadData('breaim-habits', {}))

  // Workouts: { "2026-04": 5 }
  const [workoutsData, setWorkoutsData] = useState(() => loadData('breaim-workouts', {}))

  // Persist
  useEffect(() => { saveData('breaim-theme', theme) }, [theme])
  useEffect(() => { saveData('breaim-name', userName) }, [userName])
  useEffect(() => { saveData('breaim-weight', weight) }, [weight])
  useEffect(() => { saveData('breaim-goal', goal) }, [goal])
  useEffect(() => { saveData('breaim-habits', habitsData) }, [habitsData])
  useEffect(() => { saveData('breaim-workouts', workoutsData) }, [workoutsData])

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const monthKey = getMonthKey(viewYear, viewMonth)
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const today = now.getDate()
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const workoutTarget = getWorkoutTarget(viewYear, viewMonth)
  const currentWorkouts = workoutsData[monthKey] || 0

  // Navigation
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Habit marking
  const markHabit = useCallback((habitId, day, status) => {
    setHabitsData(prev => {
      const updated = { ...prev }
      if (!updated[monthKey]) updated[monthKey] = {}
      if (!updated[monthKey][habitId]) updated[monthKey][habitId] = {}
      if (status === null) {
        delete updated[monthKey][habitId][day]
      } else {
        updated[monthKey][habitId][day] = status
      }
      return updated
    })
  }, [monthKey])

  // Workout count
  const changeWorkouts = useCallback((delta) => {
    setWorkoutsData(prev => {
      const current = prev[monthKey] || 0
      const newVal = Math.max(0, current + delta)
      return { ...prev, [monthKey]: newVal }
    })
  }, [monthKey])

  // Calculate stats
  const calcHabitStats = useCallback((habitId) => {
    const habitMonth = habitsData[monthKey]?.[habitId] || {}
    const maxDay = isCurrentMonth ? today : daysInMonth
    let successes = 0
    let failures = 0
    let marked = 0
    for (let d = 1; d <= maxDay; d++) {
      const status = habitMonth[d]
      if (status === 'success') { successes++; marked++ }
      else if (status === 'fail') { failures++; marked++ }
    }
    const pct = marked > 0 ? Math.round((successes / marked) * 100) : 0
    return { successes, failures, marked, total: maxDay, pct }
  }, [habitsData, monthKey, isCurrentMonth, today, daysInMonth])

  // Streak calculation (consecutive success days from today backwards)
  const calcStreak = useCallback((habitId) => {
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const y = d.getFullYear()
      const m = d.getMonth()
      const day = d.getDate()
      const mk = getMonthKey(y, m)
      const status = habitsData[mk]?.[habitId]?.[day]
      if (status === 'success') {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [habitsData])

  // Overall stats
  const overallPct = (() => {
    let totalSuccess = 0
    let totalMarked = 0
    HABITS.forEach(h => {
      const s = calcHabitStats(h.id)
      totalSuccess += s.successes
      totalMarked += s.marked
    })
    return totalMarked > 0 ? Math.round((totalSuccess / totalMarked) * 100) : 0
  })()

  const totalDaysTracked = (() => {
    const maxDay = isCurrentMonth ? today : daysInMonth
    let count = 0
    for (let d = 1; d <= maxDay; d++) {
      let allMarked = true
      for (const h of HABITS) {
        if (!habitsData[monthKey]?.[h.id]?.[d]) {
          allMarked = false
          break
        }
      }
      if (allMarked) count++
    }
    return count
  })()

  return (
    <div className="app-container">
      {/* Theme Toggle */}
      <div className="theme-toggle-wrapper">
        <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>
      </div>

      {/* Header */}
      <div className="header section">
        <h1 className="app-title">בריאים</h1>
        <p className="app-subtitle">המסע שלך לחיים בריאים מתחיל כאן</p>
        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-label">שם</span>
            <input
              className="profile-input name-input"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="השם שלך"
            />
          </div>
          <div className="profile-row">
            <span className="profile-label">משקל</span>
            <input
              className="profile-input"
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="הזן משקל"
              style={{ maxWidth: 120 }}
            />
            <span className="weight-unit">ק״ג</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">מטרה</span>
            <textarea
              className="goal-textarea"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="מה המטרה שלך? (לדוגמה: לרדת 5 קילו תוך 3 חודשים)"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Nutrition Principles */}
      <div className="section">
        <h2 className="section-title">
          <span>📋</span> עקרונות התזונה שלי
        </h2>
        <div className="principles-grid">
          {PRINCIPLES.map((p, i) => (
            <div key={i} className={`principle-card ${i === 4 ? 'full-width' : ''}`}>
              <div className="principle-number">{i + 1}</div>
              <div className="principle-title">{p.title}</div>
              <div className="principle-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="section">
        <h2 className="section-title">
          <span>📅</span> מעקב הרגלים
        </h2>
        <div className="month-nav">
          <button className="month-nav-btn" onClick={nextMonth}>→</button>
          <span className="month-name">{HEBREW_MONTHS[viewMonth]} {viewYear}</span>
          <button className="month-nav-btn" onClick={prevMonth}>←</button>
        </div>

        {/* Habit Cards */}
        {HABITS.map(habit => {
          const stats = calcHabitStats(habit.id)
          const todayStatus = habitsData[monthKey]?.[habit.id]?.[today]
          const scoreClass = stats.pct >= 70 ? 'good' : stats.pct >= 40 ? 'neutral' : stats.marked === 0 ? 'neutral' : 'bad'

          return (
            <div key={habit.id} className="habit-card">
              <div className="habit-header">
                <div className="habit-title">
                  <span className="habit-emoji">{habit.emoji}</span>
                  {habit.name}
                </div>
                <span className={`habit-score ${scoreClass}`}>
                  {stats.marked > 0 ? `${stats.pct}%` : '—'}
                </span>
              </div>

              {/* Calendar */}
              <div className="calendar-grid">
                {DAY_LABELS.map(label => (
                  <div key={label} className="calendar-day-label">{label}</div>
                ))}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="calendar-day empty" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const dayStatus = habitsData[monthKey]?.[habit.id]?.[day]
                  const isFuture = isCurrentMonth && day > today
                  const isToday = isCurrentMonth && day === today

                  let cls = 'calendar-day'
                  if (isFuture) cls += ' future'
                  else if (dayStatus === 'success') cls += ' success'
                  else if (dayStatus === 'fail') cls += ' fail'
                  else cls += ' unmarked'
                  if (isToday) cls += ' today'

                  return (
                    <div
                      key={day}
                      className={cls}
                      onClick={() => {
                        if (isFuture) return
                        if (!dayStatus) markHabit(habit.id, day, 'success')
                        else if (dayStatus === 'success') markHabit(habit.id, day, 'fail')
                        else markHabit(habit.id, day, null)
                      }}
                      title={`יום ${day}`}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>

              {/* Today quick actions */}
              {isCurrentMonth && (
                <div className="today-actions">
                  <button
                    className={`today-btn success-btn ${todayStatus === 'success' ? 'active' : ''}`}
                    onClick={() => markHabit(habit.id, today, todayStatus === 'success' ? null : 'success')}
                  >
                    ✓ הצלחתי היום
                  </button>
                  <button
                    className={`today-btn fail-btn ${todayStatus === 'fail' ? 'active' : ''}`}
                    onClick={() => markHabit(habit.id, today, todayStatus === 'fail' ? null : 'fail')}
                  >
                    ✗ לא הצלחתי
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Workout Tracker */}
        <div className="workout-card">
          <div className="workout-header">
            <div className="workout-title">
              <span className="habit-emoji">🏋️</span>
              אימונים החודש
            </div>
            <span className={`habit-score ${currentWorkouts >= workoutTarget ? 'good' : 'neutral'}`}>
              {currentWorkouts >= workoutTarget ? 'יעד הושג!' : `יעד: ${workoutTarget}`}
            </span>
          </div>
          <div className="workout-counter">
            <button className="workout-count-btn" onClick={() => changeWorkouts(1)}>+</button>
            <div>
              <div className="workout-number">{currentWorkouts}</div>
              <div className="workout-target">מתוך {workoutTarget} אימונים</div>
            </div>
            <button
              className="workout-count-btn"
              onClick={() => changeWorkouts(-1)}
              disabled={currentWorkouts === 0}
            >−</button>
          </div>
          <div className="workout-progress-bar">
            <div
              className={`workout-progress-fill ${currentWorkouts >= workoutTarget ? 'complete' : ''}`}
              style={{ width: `${Math.min(100, (currentWorkouts / workoutTarget) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="section">
        <h2 className="section-title">
          <span>📊</span> סטטיסטיקה
        </h2>

        {/* Overview cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">אחוז הצלחה כללי</div>
            <div className={`stat-value ${overallPct >= 70 ? 'success-text' : 'accent-text'}`}>
              {overallPct}%
            </div>
            <div className="stat-subtitle">מכל ההרגלים החודש</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">ימים שמולאו</div>
            <div className="stat-value accent-text">{totalDaysTracked}</div>
            <div className="stat-subtitle">מתוך {isCurrentMonth ? today : daysInMonth} ימים</div>
          </div>
        </div>

        {/* Per-habit bars */}
        <div className="stat-card full-width" style={{ marginBottom: 16 }}>
          <div className="stat-title" style={{ marginBottom: 12 }}>אחוז הצלחה לפי הרגל</div>
          <div className="stat-bars">
            {HABITS.map(h => {
              const s = calcHabitStats(h.id)
              const fillClass = s.pct >= 70 ? 'success-fill' : s.pct >= 40 ? 'accent-fill' : 'danger-fill'
              return (
                <div key={h.id} className="stat-bar-row">
                  <span className="stat-bar-label">{h.emoji} {h.name}</span>
                  <div className="stat-bar-track">
                    <div className={`stat-bar-fill ${fillClass}`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="stat-bar-pct">{s.pct}%</span>
                </div>
              )
            })}
            {/* Workout bar */}
            <div className="stat-bar-row">
              <span className="stat-bar-label">🏋️ אימונים</span>
              <div className="stat-bar-track">
                <div
                  className={`stat-bar-fill ${currentWorkouts >= workoutTarget ? 'success-fill' : 'accent-fill'}`}
                  style={{ width: `${Math.min(100, (currentWorkouts / workoutTarget) * 100)}%` }}
                />
              </div>
              <span className="stat-bar-pct">{Math.round((currentWorkouts / workoutTarget) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="stat-card full-width">
          <div className="stat-title" style={{ marginBottom: 12 }}>🔥 רצף ימים רצופים (סטריק)</div>
          <div className="streak-grid">
            {HABITS.map(h => (
              <div key={h.id} className="streak-item">
                <div className="streak-count">{calcStreak(h.id)}</div>
                <div className="streak-label">{h.emoji} {h.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        בריאים © {now.getFullYear()} — בנה את ההרגלים שלך, יום אחרי יום
      </div>
    </div>
  )
}

export default App
