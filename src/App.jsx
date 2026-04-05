import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import './App.css'

// ===== CONSTANTS =====
const HEBREW_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
]

const HABITS = [
  { id: 'dessert',  name: 'קינוח אחד ביום',          emoji: '🍰', color: '#FF6B6B' },
  { id: 'snacks',   name: 'בלי נשנושים',             emoji: '🚫', color: '#4ECDC4' },
  { id: 'plate',    name: 'אוכלים מה שיש בצלחת',     emoji: '🍽️', color: '#45B7D1' },
  { id: 'water',    name: '2 כוסות מים לפני ארוחה',   emoji: '💧', color: '#96CEB4' },
  { id: 'workout',  name: 'שלושה אימונים בשבוע',     emoji: '🏋️', color: '#DDA0DD' },
]

// ===== HELPERS =====
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay() }
function getMonthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}` }

function getWeeksOfMonth(y, m) {
  const d = getDaysInMonth(y, m)
  return [
    { num: 1, label: `1–7` },
    { num: 2, label: `8–14` },
    { num: 3, label: `15–21` },
    { num: 4, label: `22–${d}` },
  ]
}

// ===== CIRCULAR CHART =====
function CircularTracker({ habits, daysInMonth, habitsData, monthKey, today, isCurrentMonth, onDotClick }) {
  const CX = 250, CY = 250
  const OUTER_R = 195, INNER_R = 95
  const RING_GAP = (OUTER_R - INNER_R) / habits.length
  const DOT_R = Math.min(RING_GAP * 0.38, 7.5)
  const GAP_DEG = 50
  const ARC_DEG = 360 - GAP_DEG
  const START_DEG = 90 + GAP_DEG / 2 // 115°

  const angleFor = (day) => START_DEG + ((day - 0.5) / daysInMonth) * ARC_DEG

  // Arc path for ring background
  const arcPath = (r) => {
    const s = START_DEG * Math.PI / 180
    const e = (START_DEG + ARC_DEG) * Math.PI / 180
    const x1 = CX + r * Math.cos(s), y1 = CY + r * Math.sin(s)
    const x2 = CX + r * Math.cos(e), y2 = CY + r * Math.sin(e)
    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 500 500" className="circular-svg">
      {/* Ring background arcs */}
      {habits.map((h, i) => {
        const r = OUTER_R - i * RING_GAP - RING_GAP / 2
        return (
          <path
            key={`arc-${h.id}`}
            d={arcPath(r)}
            fill="none"
            stroke={h.color}
            strokeWidth={RING_GAP - 3}
            strokeOpacity={0.1}
            strokeLinecap="round"
          />
        )
      })}

      {/* Day number labels */}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const a = angleFor(day) * Math.PI / 180
        const r = OUTER_R + 16
        const isT = isCurrentMonth && day === today
        return (
          <text
            key={`lbl-${day}`}
            x={CX + r * Math.cos(a)}
            y={CY + r * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`day-label ${isT ? 'day-label-today' : ''}`}
          >
            {day}
          </text>
        )
      })}

      {/* Dots */}
      {habits.map((habit, ringIdx) => {
        const r = OUTER_R - ringIdx * RING_GAP - RING_GAP / 2
        return Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const a = angleFor(day) * Math.PI / 180
          const x = CX + r * Math.cos(a)
          const y = CY + r * Math.sin(a)
          const status = habitsData[monthKey]?.[habit.id]?.[day]
          const isFuture = isCurrentMonth && day > today
          const isToday = isCurrentMonth && day === today

          let fill = 'var(--dot-empty)'
          if (isFuture) fill = 'var(--dot-future)'
          else if (status === 'success') fill = '#4caf50'
          else if (status === 'fail') fill = '#ef5350'

          return (
            <g key={`${habit.id}-${day}`}>
              {/* Invisible larger hit area */}
              <circle
                cx={x} cy={y} r={DOT_R + 4}
                fill="transparent"
                style={{ cursor: isFuture ? 'default' : 'pointer' }}
                onClick={() => !isFuture && onDotClick(habit.id, day)}
              />
              <circle
                cx={x} cy={y} r={DOT_R}
                fill={fill}
                stroke={isToday ? 'var(--accent)' : 'none'}
                strokeWidth={isToday ? 2 : 0}
                style={{ transition: 'fill 0.2s', pointerEvents: 'none' }}
              />
            </g>
          )
        })
      })}

      {/* Center text */}
      <text x={CX} y={CY - 10} textAnchor="middle" className="center-month">
        {HEBREW_MONTHS[parseInt(monthKey.split('-')[1]) - 1]}
      </text>
      <text x={CX} y={CY + 15} textAnchor="middle" className="center-year">
        {monthKey.split('-')[0]}
      </text>
    </svg>
  )
}

// ===== MAIN APP =====
export default function App() {
  const now = new Date()
  const todayDate = now.getDate()

  // Auth
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // UI
  const [theme, setTheme] = useState(() => localStorage.getItem('breaim-theme') || 'dark')
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [editingName, setEditingName] = useState(false)

  // Data
  const [userName, setUserName] = useState('')
  const [habitsData, setHabitsData] = useState({})
  const [weightsData, setWeightsData] = useState({})
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Derived
  const monthKey = getMonthKey(viewYear, viewMonth)
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const weeks = getWeeksOfMonth(viewYear, viewMonth)

  // ── Theme ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('breaim-theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setProfileLoaded(false); setDataLoaded(false); setHabitsData({}); setWeightsData({}); setUserName('') }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load profile ──
  useEffect(() => {
    if (!session?.user) return
    supabase.from('profiles').select('name').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) setUserName(data.name || ''); setProfileLoaded(true) })
  }, [session])

  // ── Load habits + weights ──
  useEffect(() => {
    if (!session?.user) return
    const load = async () => {
      const [{ data: habits }, { data: weights }] = await Promise.all([
        supabase.from('habits_data').select('*').eq('user_id', session.user.id),
        supabase.from('weights_data').select('*').eq('user_id', session.user.id),
      ])
      const hMap = {}
      if (habits) habits.forEach(r => {
        if (!hMap[r.month_key]) hMap[r.month_key] = {}
        if (!hMap[r.month_key][r.habit_id]) hMap[r.month_key][r.habit_id] = {}
        hMap[r.month_key][r.habit_id][r.day] = r.status
      })
      setHabitsData(hMap)
      const wMap = {}
      if (weights) weights.forEach(r => {
        if (!wMap[r.month_key]) wMap[r.month_key] = {}
        wMap[r.month_key][r.week_number] = r.weight?.toString() || ''
      })
      setWeightsData(wMap)
      setDataLoaded(true)
    }
    load()
  }, [session])

  // ── Save name ──
  useEffect(() => {
    if (!session?.user || !profileLoaded) return
    const t = setTimeout(() => {
      supabase.from('profiles').upsert({ id: session.user.id, name: userName })
    }, 800)
    return () => clearTimeout(t)
  }, [userName, session, profileLoaded])

  // ── Mark habit ──
  const markHabit = useCallback(async (habitId, day, status) => {
    if (!session?.user) return
    setHabitsData(prev => {
      const u = JSON.parse(JSON.stringify(prev))
      if (!u[monthKey]) u[monthKey] = {}
      if (!u[monthKey][habitId]) u[monthKey][habitId] = {}
      if (status === null) delete u[monthKey][habitId][day]
      else u[monthKey][habitId][day] = status
      return u
    })
    if (status === null) {
      await supabase.from('habits_data').delete().match({ user_id: session.user.id, month_key: monthKey, habit_id: habitId, day })
    } else {
      await supabase.from('habits_data').upsert(
        { user_id: session.user.id, month_key: monthKey, habit_id: habitId, day, status },
        { onConflict: 'user_id,month_key,habit_id,day' }
      )
    }
  }, [session, monthKey])

  // Dot click cycles: empty → success → fail → empty
  const handleDotClick = useCallback((habitId, day) => {
    const current = habitsData[monthKey]?.[habitId]?.[day]
    if (!current) markHabit(habitId, day, 'success')
    else if (current === 'success') markHabit(habitId, day, 'fail')
    else markHabit(habitId, day, null)
  }, [habitsData, monthKey, markHabit])

  // ── Save weight ──
  const saveWeight = useCallback(async (weekNum, value) => {
    if (!session?.user) return
    setWeightsData(prev => {
      const u = { ...prev }
      if (!u[monthKey]) u[monthKey] = {}
      u[monthKey][weekNum] = value
      return u
    })
    if (value === '') {
      await supabase.from('weights_data').delete().match({ user_id: session.user.id, month_key: monthKey, week_number: weekNum })
    } else {
      await supabase.from('weights_data').upsert(
        { user_id: session.user.id, month_key: monthKey, week_number: weekNum, weight: parseFloat(value) || 0 },
        { onConflict: 'user_id,month_key,week_number' }
      )
    }
  }, [session, monthKey])

  // ── Navigation ──
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  // ── Stats ──
  const calcHabitStats = useCallback((habitId) => {
    const hm = habitsData[monthKey]?.[habitId] || {}
    const maxDay = isCurrentMonth ? todayDate : daysInMonth
    let s = 0, f = 0, m = 0
    for (let d = 1; d <= maxDay; d++) {
      const st = hm[d]
      if (st === 'success') { s++; m++ } else if (st === 'fail') { f++; m++ }
    }
    return { successes: s, failures: f, marked: m, total: maxDay, pct: m > 0 ? Math.round((s / m) * 100) : 0 }
  }, [habitsData, monthKey, isCurrentMonth, todayDate, daysInMonth])

  const calcStreak = useCallback((habitId) => {
    let streak = 0; const d = new Date()
    for (let i = 0; i < 365; i++) {
      const mk = getMonthKey(d.getFullYear(), d.getMonth())
      if (habitsData[mk]?.[habitId]?.[d.getDate()] === 'success') { streak++; d.setDate(d.getDate() - 1) } else break
    }
    return streak
  }, [habitsData])

  const overallPct = (() => {
    let ts = 0, tm = 0
    HABITS.forEach(h => { const s = calcHabitStats(h.id); ts += s.successes; tm += s.marked })
    return tm > 0 ? Math.round((ts / tm) * 100) : 0
  })()

  // ── Render ──
  if (authLoading) return <div className="loading-screen"><span>⏳ טוען...</span></div>
  if (!session) return <Auth theme={theme} onToggleTheme={toggleTheme} />
  if (!dataLoaded) return <div className="loading-screen"><span>⏳ טוען נתונים...</span></div>

  return (
    <div className="app-container">
      {/* ── Top Bar (sticky) ── */}
      <div className="top-bar">
        <div className="top-bar-right">
          {editingName ? (
            <input
              className="name-edit-input"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              autoFocus
            />
          ) : (
            <span className="top-bar-name" onClick={() => setEditingName(true)}>
              שלום, {userName || 'לחץ לעריכה'} 👋
            </span>
          )}
        </div>
        <div className="top-bar-left">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            יציאה
          </button>
        </div>
      </div>

      {/* ── Title ── */}
      <div className="title-section">
        <h1 className="app-title">בריאים 💪</h1>
        <p className="app-subtitle">המסע שלך לחיים בריאים מתחיל כאן</p>
      </div>

      {/* ── Month Navigation ── */}
      <div className="month-nav">
        <button className="month-nav-btn" onClick={nextMonth}>→</button>
        <span className="month-name">{HEBREW_MONTHS[viewMonth]} {viewYear}</span>
        <button className="month-nav-btn" onClick={prevMonth}>←</button>
      </div>

      {/* ── Weight Tracker ── */}
      <div className="section">
        <h2 className="section-title">⚖️ מדד שקילות</h2>
        <div className="weight-grid">
          {weeks.map(w => (
            <div key={w.num} className="weight-card">
              <div className="weight-week-label">שבוע {w.num}</div>
              <div className="weight-dates">{w.label}</div>
              <input
                type="number"
                step="0.1"
                className="weight-input"
                placeholder="ק״ג"
                value={weightsData[monthKey]?.[w.num] || ''}
                onChange={e => saveWeight(w.num, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Five Commandments ── */}
      <div className="section">
        <h2 className="section-title">📜 חמשת חומשי התזונה</h2>
        <div className="commandments-list">
          {HABITS.map((h, i) => (
            <div key={h.id} className="commandment-item">
              <span className="commandment-num" style={{ background: h.color + '30', color: h.color }}>{i + 1}</span>
              <span className="commandment-emoji">{h.emoji}</span>
              <span className="commandment-text">{h.name}</span>
              <span className="commandment-dot" style={{ background: h.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Circular Habit Tracker ── */}
      <div className="section">
        <h2 className="section-title">📅 מעקב הרגלים</h2>
        <div className="circular-wrapper">
          <CircularTracker
            habits={HABITS}
            daysInMonth={daysInMonth}
            habitsData={habitsData}
            monthKey={monthKey}
            today={todayDate}
            isCurrentMonth={isCurrentMonth}
            onDotClick={handleDotClick}
          />
          {/* Legend */}
          <div className="circle-legend">
            {HABITS.map(h => (
              <div key={h.id} className="legend-item">
                <span className="legend-dot" style={{ background: h.color }} />
                <span className="legend-text">{h.emoji} {h.name}</span>
              </div>
            ))}
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#4caf50' }} />
              <span className="legend-text">= הצלחתי</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#ef5350' }} />
              <span className="legend-text">= לא הצלחתי</span>
            </div>
          </div>
          <p className="circle-hint">💡 לחץ על נקודה כדי לשנות: אפור → ירוק → אדום → אפור</p>
        </div>
      </div>

      {/* ── Today's Quick Panel ── */}
      {isCurrentMonth && (
        <div className="section">
          <h2 className="section-title">✅ סימון היום — {todayDate} ב{HEBREW_MONTHS[viewMonth]}</h2>
          <div className="today-panel">
            {HABITS.map(h => {
              const status = habitsData[monthKey]?.[h.id]?.[todayDate]
              return (
                <div key={h.id} className="today-row">
                  <span className="today-habit-name">{h.emoji} {h.name}</span>
                  <div className="today-btns">
                    <button
                      className={`today-btn-mark success-mark ${status === 'success' ? 'active' : ''}`}
                      onClick={() => markHabit(h.id, todayDate, status === 'success' ? null : 'success')}
                    >✓</button>
                    <button
                      className={`today-btn-mark fail-mark ${status === 'fail' ? 'active' : ''}`}
                      onClick={() => markHabit(h.id, todayDate, status === 'fail' ? null : 'fail')}
                    >✗</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Statistics ── */}
      <div className="section">
        <h2 className="section-title">📊 סטטיסטיקה</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">אחוז הצלחה כללי</div>
            <div className={`stat-value ${overallPct >= 70 ? 'success-text' : 'accent-text'}`}>{overallPct}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">סטריק הכי ארוך</div>
            <div className="stat-value accent-text">{Math.max(...HABITS.map(h => calcStreak(h.id)))} 🔥</div>
          </div>
        </div>
        <div className="stat-card full-width" style={{ marginBottom: 16 }}>
          <div className="stat-title" style={{ marginBottom: 12 }}>אחוז הצלחה לפי הרגל</div>
          <div className="stat-bars">
            {HABITS.map(h => {
              const s = calcHabitStats(h.id)
              return (
                <div key={h.id} className="stat-bar-row">
                  <span className="stat-bar-label">{h.emoji} {h.name}</span>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: `${s.pct}%`, background: h.color }} />
                  </div>
                  <span className="stat-bar-pct">{s.pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="stat-card full-width">
          <div className="stat-title" style={{ marginBottom: 12 }}>🔥 רצף ימים רצופים</div>
          <div className="streak-grid">
            {HABITS.map(h => (
              <div key={h.id} className="streak-item">
                <div className="streak-count" style={{ color: h.color }}>{calcStreak(h.id)}</div>
                <div className="streak-label">{h.emoji} {h.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        בריאים © {now.getFullYear()} — בנה את ההרגלים שלך, יום אחרי יום
      </div>
    </div>
  )
}
