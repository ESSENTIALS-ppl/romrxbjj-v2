// Quinn F1-F5 copy (QUINN-COPY-F1-F5.md): Stacy PASS Oct 19 2026.
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { Assessment } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { RADAR_LEFT_COLOR, RADAR_RIGHT_COLOR, RADAR_RIGHT_DASH } from '../components/BaseRadar'
import { cn } from '../lib/cn'
import { ReminderOptIn } from '../components/ReminderOptIn'
import { localDateIso, localDateOfTimestamp, isCompletedToday, isUnexpectedSaveError, withoutDay } from '../lib/localDate'
import { WEEK1_GOAL, WEEK1_COPY, week1Window, isInWeek1, week1Done, week1LocalDate, week1StartFrom, week1CountEnd } from '../lib/week1Goal'
import { AddToHomeScreenTip } from '../components/AddToHomeScreenTip'
import { SESSION_LENGTH_COPY, SESSION_LENGTHS, pickMovements, pickWithSlots, readSessionLength, sessionLengthKey, type SessionLength } from '../lib/sessionLength'
import { WeeklyGoal } from '../components/WeeklyGoal'
import { WEEKLY_GOAL_COPY } from '../lib/weeklyGoal'
import { GuidedPlayer } from '../components/GuidedPlayer'
import { PLAYER_COPY } from '../lib/guidedPlayer'
import { SoloChallenge } from '../components/SoloChallenge'
import { QuickCheckBanner } from '../components/QuickCheckBanner'
import { RombotCheckinCard } from '../components/RombotCheckin'
import { SessionFeel } from '../components/SessionFeel'
import { SHOW_SESSION_FEEDBACK } from '../lib/sessionFeedback'
import {
  bandFull,
  jointBandsForAssessment,
  isUnscoredJoint,
  jointKeyBase,
  formatScoreBand,
  mobilityScoreForAssessment,
  overallBandForAssessment,
  rankBadgeClass,
  rankProblemJoints,
  sideBandsForJoint,
  valueToneClass,
  formatMeasure,
  jointUnit,
  JOINT_SCORE_TARGETS,
  topProblemAreasForAssessment,
  BAND_DESC,
  BAND_TONE,
  type BandScore,
} from '../lib/mobilityBands'
import { skipQuick } from '../lib/assessmentReads'
import {
  AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Circle,
  ClipboardList, Dumbbell, Flame, PersonStanding,
  RefreshCw, CheckCircle, Clock, TrendingUp, BookOpen,
} from 'lucide-react'

// =============================================================================
// My Protocol (Base / HQ)
// -----------------------------------------------------------------------------
// This is the sport-agnostic mobility protocol shown to every Base subscriber.
// It surfaces the user's mobility band, top-3 priority joints,
// asymmetry flags, and a personalized daily / full mobility plan pulled from
// the `exercises` table (filtered to sports @> ['general']).
//
// Sport add-ons (BJJ, BB, etc.) get their own "My Game" surface elsewhere and
// read from `technique_eligibility`. This page does NOT touch that table.
// =============================================================================

// ---- Types -----------------------------------------------------------------
interface Rx {
  id: string
  name: string
  dose: string
  cue: string
  equipment: string
  video_url: string | null
}
interface Prescription {
  exercises: Rx[]
  stretches: Rx[]
  foam: Rx[]
}
interface DbExercise {
  id: string
  joint_key: string
  exercise_type: string
  name: string
  sets: number | null
  reps: string | null
  coaching_cue: string | null
  video_url: string | null
}

interface SessionLog {
  sessions: string[]
  cycleStart: string
}

// ---- Rotation --------------------------------------------------------------
const ROTATION: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2, 0: 0,
}
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CYCLE_TARGET = 42

function getBandTier(band: BandScore) {
  const tone = BAND_TONE[band]
  return { label: bandFull(band), color: tone.color, bg: tone.bg, ring: tone.ring, desc: BAND_DESC[band] }
}

// ---- Joint config ----------------------------------------------------------
interface JointDef {
  key: string
  label: string
  why: string
  leftKey?: string
  rightKey?: string
  singleKey?: string
  rxKey: string
}
const JOINTS: JointDef[] = [
  {
    key: 'hip_er', label: 'Hip External Rotation',
    why: 'Deep squats, wide stances, and hip mobility for everyday movement.',
    leftKey: 'hip_er_l', rightKey: 'hip_er_r',
    rxKey: 'hip_er',
  },
  {
    key: 'hip_ir', label: 'Hip Internal Rotation',
    why: 'Used in rotational sports, walking and knee tracking.',
    leftKey: 'hip_ir_l', rightKey: 'hip_ir_r',
    rxKey: 'hip_ir',
  },
  {
    key: 'hip_abd', label: 'Hip Abduction',
    why: 'Lateral stability, glute strength, single-leg balance, and pelvic control.',
    leftKey: 'hip_abd_l', rightKey: 'hip_abd_r',
    rxKey: 'hip_abd',
  },
  {
    key: 'hip_flex', label: 'Hip Flexion',
    why: 'Squat depth, stair climbing, sitting posture, and low-back load management.',
    leftKey: 'hip_flex_l', rightKey: 'hip_flex_r',
    rxKey: 'hip_flex',
  },
  {
    key: 'shoulder_er', label: 'Shoulder External Rotation',
    why: 'Overhead pressing, throwing, and everyday reaching.',
    leftKey: 'shoulder_er_l', rightKey: 'shoulder_er_r',
    rxKey: 'shoulder_er',
  },
  {
    key: 'shoulder_flex', label: 'Shoulder Flexion',
    why: 'Reaching overhead, pressing, pulling, and thoracic-spine coupled movement.',
    leftKey: 'shoulder_flex_l', rightKey: 'shoulder_flex_r',
    rxKey: 'shoulder_flex',
  },
  {
    key: 'ankle_df', label: 'Ankle Dorsiflexion',
    why: 'Squat depth, balance, and walking mechanics.',
    leftKey: 'ankle_df_l', rightKey: 'ankle_df_r',
    rxKey: 'ankle_df',
  },
  {
    key: 'lumbar_flex', label: 'Lumbar Flexion',
    why: 'Bending forward, deadlift setup, and functional daily movement patterns.',
    singleKey: 'lumbar_flex',
    rxKey: 'lumbar_flex',
  },
  {
    key: 'lumbar_ext', label: 'Lumbar Extension',
    why: 'Used when you stand tall and bend backward.',
    singleKey: 'lumbar_ext',
    rxKey: 'lumbar_ext',
  },
  {
    key: 'cervical_rot', label: 'Cervical Rotation',
    why: 'Used when you turn your head to check a blind spot or look around you.',
    leftKey: 'cervical_rot_l', rightKey: 'cervical_rot_r',
    rxKey: 'cervical_rot',
  },
  // Oct 19 2026: Base measures neck flexion, extension and side bend (not rotation), so they join the protocol.
  // `why` lines are NEW COPY, FOR STACY before ship.
  {
    key: 'cervical_flex', label: 'Neck Flexion',
    why: 'Looking down at a phone, desk work, and tucking your chin.',
    singleKey: 'cervical_flex',
    rxKey: 'cervical_flex',
  },
  {
    key: 'cervical_ext', label: 'Neck Extension',
    why: 'Looking up, overhead reaching, and upright head posture.',
    singleKey: 'cervical_ext',
    rxKey: 'cervical_ext',
  },
  {
    key: 'cervical_lat', label: 'Neck Side Bend',
    why: 'Checking over your shoulder and easing side-to-side neck stiffness.',
    leftKey: 'cervical_lat_l', rightKey: 'cervical_lat_r',
    rxKey: 'cervical_lat',
  },
]

// ---- Scoring ---------------------------------------------------------------
interface ScoredJoint {
  def: JointDef
  left: number | null
  right: number | null
  single: number | null
  asymmetry: number
  severity: number
  /** Band from lib/mobilityBands (joint_scores truth); null if unmeasured. */
  band: BandScore | null
  gap: string
}
function scoreJoints(assessment: Assessment, bands: Map<string, BandScore>): ScoredJoint[] {
  const rec = assessment as unknown as Record<string, number | null>
  return JOINTS.map(def => {
    const left   = def.leftKey   ? (rec[def.leftKey]   ?? null) : null
    const right  = def.rightKey  ? (rec[def.rightKey]  ?? null) : null
    const single = def.singleKey ? (rec[def.singleKey] ?? null) : null

    let asymmetry = 0
    let severity  = 0
    let gap       = ''

    // Base target (JOINT_SCORE_TARGETS, same as the band) and the measured unit.
    const target = JOINT_SCORE_TARGETS[def.key]
    const unit = jointUnit(def.key)
    if (left !== null && right !== null) {
      asymmetry = Math.round(Math.abs(left - right) * 10) / 10
      const worst = Math.min(left, right)
      severity = target != null ? Math.max(0, target - worst) : 0
      gap = `L ${formatMeasure(left)}${unit} vs R ${formatMeasure(right)}${unit} · ${formatMeasure(asymmetry)}${unit} gap`
    } else if (single !== null) {
      severity = target != null ? Math.max(0, target - single) : 0
      gap = `${formatMeasure(single)}${unit} (target ${target ?? '-'}${unit})`
    }
    const band = bands.get(def.key) ?? null
    return { def, left, right, single, asymmetry, severity, band, gap }
  })
}

// ---- DB drill loader -------------------------------------------------------
// Some joints have both short (`hip_flex`) and long (`hip_flexion`) rows.
// We accept both, prefer short-form rows, and always fall back to long-form.
const JOINT_KEY_ALIASES: Record<string, string[]> = {
  hip_er:        ['hip_er'],
  hip_ir:        ['hip_ir'],
  hip_abd:       ['hip_abd', 'hip_abduction'],
  hip_flex:      ['hip_flex', 'hip_flexion'],
  shoulder_er:   ['shoulder_er'],
  shoulder_flex: ['shoulder_flex', 'shoulder_flexion'],
  ankle_df:      ['ankle_df'],
  lumbar_flex:   ['lumbar_flex', 'lumbar_flexion'],
  lumbar_ext:    ['lumbar_ext', 'lumbar_extension'],
  cervical_rot:  ['cervical_rot', 'cervical_rotation'],
  cervical_flex: ['cervical_flex', 'cervical_flexion'],
  cervical_ext:  ['cervical_ext', 'cervical_extension'],
  cervical_lat:  ['cervical_lat', 'cervical_lateral_flexion'],
}

function toRx(row: DbExercise): Rx {
  const dose = row.sets && row.reps ? `${row.sets} sets x ${row.reps}` : (row.reps ?? '')
  return {
    id: row.id,
    name: row.name,
    dose,
    cue: row.coaching_cue ?? '',
    equipment: '',
    video_url: row.video_url,
  }
}

// Some exercises exist as more than one DB row for the same joint group
// (either an exact duplicate row, or a row filed under a short joint_key
// alias plus a matching row filed under the long-form alias, e.g. hip_flex
// / hip_flexion). Both resolve into the same rxKey via JOINT_KEY_ALIASES,
// so without deduping they render twice. Dedupe by name + exercise_type
// within the scoped set and keep whichever row has richer prescription
// data (sets present, then longer reps/cue text as a tiebreaker).
function dedupeExercises(scoped: DbExercise[]): DbExercise[] {
  const byKey = new Map<string, DbExercise>()
  for (const row of scoped) {
    const dedupeKey = `${row.name.trim().toLowerCase()}|${row.exercise_type}`
    const existing = byKey.get(dedupeKey)
    if (!existing) {
      byKey.set(dedupeKey, row)
      continue
    }
    const existingScore = (existing.sets ? 2 : 0) + (existing.reps?.length ?? 0) + (existing.coaching_cue?.length ?? 0)
    const rowScore = (row.sets ? 2 : 0) + (row.reps?.length ?? 0) + (row.coaching_cue?.length ?? 0)
    if (rowScore > existingScore) byKey.set(dedupeKey, row)
  }
  return Array.from(byKey.values())
}

function groupByJoint(rows: DbExercise[]): Record<string, Prescription> {
  const out: Record<string, Prescription> = {}
  for (const rxKey of Object.keys(JOINT_KEY_ALIASES)) {
    const aliases = JOINT_KEY_ALIASES[rxKey]
    const scoped = dedupeExercises(rows.filter(r => aliases.includes(r.joint_key)))
    if (scoped.length === 0) continue
    out[rxKey] = {
      exercises: scoped.filter(r => r.exercise_type === 'resistance').map(toRx),
      stretches: scoped.filter(r => r.exercise_type === 'stretch').map(toRx),
      foam:      scoped.filter(r => r.exercise_type === 'foam_roll').map(toRx),
    }
  }
  return out
}

// ---- Retest banner ---------------------------------------------------------
function RetestBanner({ assessedAt }: { assessedAt: string }) {
  const navigate = useNavigate()
  const now = new Date()
  const assessed = new Date(assessedAt)
  const daysSince = Math.floor((now.getTime() - assessed.getTime()) / (1000 * 60 * 60 * 24))
  const weeksSince = daysSince / 7

  const retestDate = new Date(assessed.getTime() + 42 * 24 * 60 * 60 * 1000)
  const daysUntilRetest = Math.ceil((retestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const retestDateStr = retestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const assessedDateStr = assessed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  let status: 'green' | 'yellow' | 'red'
  let Icon: React.ElementType
  let message: string
  let subtext: string

  if (weeksSince < 4) {
    status = 'green'; Icon = CheckCircle
    message = `Assessed ${assessedDateStr}`
    subtext = `Next retest in ${daysUntilRetest} days · ${retestDateStr}`
  } else if (weeksSince < 6) {
    status = 'yellow'; Icon = Clock
    message = `Reassessment due ${retestDateStr}`
    subtext = 'Your ROM may have shifted. Retest to update your protocol.'
  } else {
    status = 'red'; Icon = RefreshCw
    message = `Retest overdue by ${Math.abs(daysUntilRetest)} days`
    subtext = "Retake now to see where you are and update your protocol."
  }

  const styles = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }
  const iconStyles = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }

  return (
    <button
      onClick={() => navigate('/onboarding/assessment')}
      className={cn(
        'w-full flex items-start gap-3 rounded-card border px-4 py-3.5 text-left transition-opacity hover:opacity-80',
        styles[status]
      )}
    >
      <Icon className={cn('shrink-0 mt-0.5', iconStyles[status])} size={16} />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-snug">{message}</p>
        <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{subtext}</p>
      </div>
      <span className="ml-auto shrink-0 text-xs font-semibold underline underline-offset-2 opacity-70 mt-0.5">Retest</span>
    </button>
  )
}

// ---- Why statement card ----------------------------------------------------
function WhyStatement({ heading, body }: { heading: string; body: string }) {
  // P1-03: collapsed by default so the Today card is the first thing on the page. The heading (existing copy) is the toggle.
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-card border border-cobalt/20 bg-cobalt-light px-5 py-3" data-testid="why-statement">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-cobalt"
      >
        {heading}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="text-sm text-cobalt-ink leading-relaxed mt-3">
          {body}
        </p>
      )}
    </div>
  )
}

// ---- Today movement card ---------------------------------------------------
function TodayMovementCard({ rx, index }: { rx: Rx; index: number }) {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const labels = ['Movement 1', 'Movement 2', 'Movement 3']

  return (
    <div className={cn(
      'rounded-xl border transition-colors overflow-hidden',
      checked ? 'border-cobalt/20 bg-cobalt/[0.03]' : 'border-cobalt/10 bg-white'
    )}>
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          onClick={() => setChecked(c => !c)}
          className="mt-0.5 shrink-0 text-cobalt hover:scale-110 transition-transform"
        >
          {checked
            ? <CheckCircle2 size={17} fill="currentColor" strokeWidth={0} />
            : <Circle size={17} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {/* P1-19: Full can list more than 3, so the same Movement N pattern continues past 3 */}
              <p className="text-[10px] text-cobalt font-bold uppercase tracking-wider mb-0.5">{labels[index] ?? `Movement ${index + 1}`}</p>
              <p className={cn('text-sm font-semibold leading-snug', checked ? 'line-through text-slate-400' : 'text-cobalt-ink')}>
                {rx.name}
              </p>
            </div>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-slate-400 hover:text-cobalt transition-colors mt-0.5 shrink-0"
            >
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
          {rx.dose && (
            <span className="inline-block text-xs bg-cobalt-light text-cobalt font-semibold px-2.5 py-0.5 rounded-full mt-1.5">
              {rx.dose}
            </span>
          )}
          {open && (
            <div className="mt-2.5 pt-2.5 border-t border-cobalt/10 space-y-2">
              {rx.cue && (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  <span className="font-semibold text-cobalt-ink">How to do it: </span>{rx.cue}
                </p>
              )}
              {rx.dose && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-cobalt-ink">Dose: </span>{rx.dose}
                </p>
              )}
              {rx.equipment && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-cobalt-ink">Equipment: </span>{rx.equipment}
                </p>
              )}
              {rx.video_url && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-cobalt-ink">Video: </span>
                  <a href={rx.video_url} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">
                    Watch demo
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TodayCardProps {
  ranked: ScoredJoint[]
  rxLibrary: Record<string, Prescription>
  assessedAt: string
  userId: string
  assessmentId?: string | null
}
function TodayCard({ ranked, rxLibrary, assessedAt, userId, assessmentId }: TodayCardProps) {
  const todayDow = new Date().getDay()
  const todayPriorityIndex = ROTATION[todayDow]
  const todayPriority = ranked[Math.min(todayPriorityIndex, ranked.length - 1)]
  const dayName = DAY_NAMES[todayDow]

  const storageKey = `romrx_hq_sessions_${userId}`
  const getLog = useCallback((): SessionLog => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw) as SessionLog
    } catch { /* ignore */ }
    return { sessions: [], cycleStart: assessedAt }
  }, [storageKey, assessedAt])

  const [log, setLog] = useState<SessionLog>(getLog)
  // P1-05: null until the database answers; then the protocol_sessions row for today's LOCAL day decides.
  const [dbToday, setDbToday] = useState<boolean | null>(null)
  const [todayIso, setTodayIso] = useState(() => localDateIso())
  const [sessionLength, setSessionLengthState] = useState<SessionLength>(() => readSessionLength(userId)) // P1-19
  const setSessionLength = (l: SessionLength) => {
    setSessionLengthState(l)
    try { localStorage.setItem(sessionLengthKey(userId), l) } catch { /* ignore */ }
  }
  const [dbSessionCount, setDbSessionCount] = useState(0)
  const [cycleStartDate, setCycleStartDate] = useState(() => localDateOfTimestamp(assessedAt))
  const [week1Dates, setWeek1Dates] = useState<string[]>([]) // P1-04

  useEffect(() => {
    if (!userId) return
    // P1-06b: the cycle starts at the latest full assessment, never a quick check (needs migration 20261116031000)
    skipQuick(supabase
      .from('assessments')
      .select('assessed_at')
      .eq('user_id', userId))
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.assessed_at) setCycleStartDate(localDateOfTimestamp(data.assessed_at))
      })
  }, [userId])

  const refreshCount = useCallback(() => {
    if (!userId) return
    supabase
      .from('protocol_sessions')
      .select('session_date', { count: 'exact' })
      .eq('user_id', userId)
      .gte('session_date', cycleStartDate)
      .then(({ count }) => { if (count !== null) setDbSessionCount(count) })
  }, [userId, cycleStartDate])

  useEffect(() => { refreshCount() }, [refreshCount]) // Session N/42 on load (kept from b52546f; Vera F0)

  // P1-04: session days inside week 1 of this cycle (same date convention as the write below).
  const refreshWeek1 = useCallback(() => {
    if (!userId) return
    const w = week1Window(week1StartFrom(assessedAt)) // local day the assessment was taken
    supabase
      .from('protocol_sessions')
      .select('session_date')
      .eq('user_id', userId)
      .gte('session_date', w.start)
      .lt('session_date', week1CountEnd(w))
      .then(({ data }) => { if (data) setWeek1Dates(data.map(r => r.session_date as string)) })
  }, [userId, assessedAt])

  useEffect(() => { refreshWeek1() }, [refreshWeek1])

  // P1-05: "completed today" reads the database for today's local day (one row per user per local day, any sport).
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('protocol_sessions')
      .select('session_date')
      .eq('user_id', userId)
      .eq('session_date', todayIso)
      .limit(1)
      .then(({ data, error }) => { if (!cancelled && !error && data) setDbToday(data.length > 0) })
    return () => { cancelled = true }
  }, [userId, todayIso])

  // Roll the day over when the tab comes back after local midnight (no lockout the next morning).
  useEffect(() => {
    const check = () => { const t = localDateIso(); setTodayIso(prev => { if (prev !== t) { setDbToday(null); return t } return prev }) }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => { document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check) }
  }, [])

  const completedToday = isCompletedToday(dbToday, log.sessions, todayIso)

  const handleMarkComplete = useCallback(() => {
    const todayIso = localDateIso() // P1-05: local calendar day, not the UTC day
    setTodayIso(todayIso)
    const protocolDay = `P${todayPriorityIndex + 1}`
    // P1-22: write protocol_completions (one row per Today-card movement).
    const joint = todayPriority?.def.key ?? todayPriority?.def.rxKey ?? null
    const rxToday = todayPriority ? rxLibrary[todayPriority.def.rxKey] : null
    const movements: Rx[] = pickMovements<Rx>(rxToday, sessionLength) // P1-19: the movements of the chosen length (standard = the 3 as before)
    const hadTodayCached = log.sessions.includes(todayIso) // was already saved before this tap
    setLog(prev => {
      const sessions = prev.sessions.includes(todayIso)
        ? prev.sessions
        : [...prev.sessions, todayIso]
      const next: SessionLog = { ...prev, sessions }
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setDbToday(true) // optimistic; the upsert below makes it true in the database
    supabase.from('protocol_sessions').upsert({
      user_id: userId,
      session_date: todayIso,
      protocol_day: protocolDay,
    }, { onConflict: 'user_id,session_date' }).then(async ({ error }) => {
      if (!error || error.code === '23505') { refreshCount(); refreshWeek1() } // 23505 = already logged today
      if (isUnexpectedSaveError(error)) {
        // P1-05: the save did not land, so undo the optimistic "completed" (no stale tick until reload).
        setDbToday(false)
        if (!hadTodayCached) {
          setLog(prev => {
            const next: SessionLog = { ...prev, sessions: withoutDay(prev.sessions, todayIso) }
            try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
            return next
          })
        }
      }
      // P1-22: completions only after a session write that succeeded (as in 41b947e7).
      if (error) return
      // Completions are best-effort: a failure must not undo the session log.
      try {
        const rows = (movements.length ? movements : [null]).map((m) => ({
          user_id: userId,
          assessment_id: assessmentId ?? null,
          exercise_id: m?.id ?? null,
          joint,
          completed_at: new Date().toISOString(),
        }))
        const { error: cErr } = await supabase.from('protocol_completions').insert(rows)
        if (cErr) console.error('protocol_completions insert failed:', cErr.message)
      } catch (e) {
        console.error('protocol_completions insert threw:', e)
      }
    })
  }, [storageKey, userId, todayPriorityIndex, refreshCount, refreshWeek1, assessmentId, todayPriority, rxLibrary, log.sessions, sessionLength])

  const week1 = week1Window(week1StartFrom(assessedAt))
  const showWeek1 = isInWeek1(week1LocalDate(), week1) // P1-04: the user's local day
  const week1Count = week1Done(week1Dates, week1)

  const sessionsThisCycle = Math.min(dbSessionCount, CYCLE_TARGET)
  const progressPct = Math.min(100, Math.round((sessionsThisCycle / CYCLE_TARGET) * 100))

  const now = new Date()
  const retestDate = new Date(new Date(assessedAt).getTime() + 42 * 24 * 60 * 60 * 1000)
  const daysUntilRetest = Math.ceil((retestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const retestDateStr = retestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const rx = todayPriority ? rxLibrary[todayPriority.def.rxKey] : null
  // P1-19: standard is today's card unchanged; quick and full only once the chooser has words (SESSION_LENGTH_COPY).
  const todayMovements: Rx[] = pickMovements<Rx>(rx, sessionLength)
  // P1-20 + P1-19: the player plays the movements of the chosen session length, each with its slot (timed vs reps)
  const playerMovements = useMemo(
    () => pickWithSlots<Rx>(rx, sessionLength).map(({ item, slot }) => ({ name: item.name, dose: item.dose, slot })),
    [rx, sessionLength],
  )
  const [playerOpen, setPlayerOpen] = useState(false)

  return (
    <div className="rounded-card border-2 border-cobalt bg-white shadow-md overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cobalt">TODAY · {dayName.toUpperCase()}</p>
            <h2 className="font-display font-bold text-cobalt-ink text-xl leading-tight mt-0.5">
              {todayPriority ? todayPriority.def.label : 'Recovery Day'}
            </h2>
          </div>
          {/* P1-09: the weekly goal replaces "Session N/42" once it has words; until then the counter stays */}
          {!WEEKLY_GOAL_COPY && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Session</p>
            <p className="text-lg font-bold text-cobalt leading-tight">{sessionsThisCycle}<span className="text-sm font-normal text-slate-400">/{CYCLE_TARGET}</span></p>
          </div>
          )}
        </div>
        {/* Integration: one goal at a time. Week 1 shows the P1-04 week 1 goal; the weekly goal (P1-09) takes over from week 2 */}
        {!showWeek1 && <WeeklyGoal userId={userId} refreshKey={dbSessionCount} />}

        {/* P1-09: with the weekly goal on, the bar follows the week (inside WeeklyGoal), not the 42-session cycle */}
        {!WEEKLY_GOAL_COPY && (
        <div className="mt-3 mb-2">
          <div className="w-full bg-cobalt-light rounded-full h-2">
            <div
              className="bg-cobalt h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        )}

        {showWeek1 && (
          <div className="flex items-center justify-between gap-3 mt-2 mb-2 rounded-lg bg-cobalt-light px-3 py-2" data-testid="week1-goal">
            <span className="text-xs font-semibold text-cobalt-ink">
              {week1Count >= WEEK1_GOAL ? WEEK1_COPY.done : WEEK1_COPY.label}
            </span>
            <span className="flex items-center gap-1.5">
              {week1Count < WEEK1_GOAL && <span className="text-xs text-slate-500 mr-1">{WEEK1_COPY.progress(week1Count)}</span>}
              {Array.from({ length: WEEK1_GOAL }, (_, i) => (
                <span
                  key={i}
                  data-testid="week1-dot"
                  data-done={i < week1Count ? 'true' : 'false'}
                  className={cn('w-3 h-3 rounded-full border-2', i < week1Count ? 'bg-cobalt border-cobalt' : 'bg-white border-cobalt/40')}
                />
              ))}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <TrendingUp size={11} className="text-cobalt shrink-0" />
          {daysUntilRetest > 0
            ? <span>Retest in <strong className="text-cobalt-ink">{daysUntilRetest} days</strong> · {retestDateStr}</span>
            : <span className="text-red-600 font-semibold">Retest due</span>
          }
        </div>
      </div>

      {SESSION_LENGTH_COPY && (
        <div className="px-5 pb-3" data-testid="session-length">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{SESSION_LENGTH_COPY.heading}</p>
          <div role="radiogroup" aria-label={SESSION_LENGTH_COPY.heading} className="grid grid-cols-3 gap-1.5">
            {SESSION_LENGTHS.map(l => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={sessionLength === l}
                onClick={() => setSessionLength(l)}
                className={cn('rounded-lg px-2 py-1.5 text-xs font-semibold border', sessionLength === l ? 'bg-cobalt text-white border-cobalt' : 'bg-white text-cobalt-ink border-slate-200')}
              >
                {SESSION_LENGTH_COPY![l]}
              </button>
            ))}
          </div>
        </div>
      )}

      {todayMovements.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Today's movements</p>
          {todayMovements.map((m, i) => (
            <TodayMovementCard key={m.id} rx={m} index={i} />
          ))}
        </div>
      )}

      {PLAYER_COPY && playerMovements.length > 0 && (
        <div className="px-5 pb-3">
          <button type="button" onClick={() => setPlayerOpen(true)} className="w-full rounded-xl py-3 text-sm font-bold text-cobalt border-2 border-cobalt bg-white">
            {PLAYER_COPY.start}
          </button>
        </div>
      )}
      {PLAYER_COPY && playerOpen && (
        <GuidedPlayer copy={PLAYER_COPY} movements={playerMovements} completedToday={completedToday} onMarkComplete={handleMarkComplete} onClose={() => setPlayerOpen(false)} />
      )}

      <div className="px-5 pb-5">
        {/* P1-06: quick check banner or "Your next check" line (hidden while QUICK_CHECK_ON is false) */}
        <div className="mb-3 empty:hidden"><QuickCheckBanner userId={userId} /></div>
        {completedToday ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 py-3.5 text-green-700 font-semibold text-sm">
            <CheckCircle2 size={16} fill="currentColor" strokeWidth={0} />
            Completed today
          </div>
        ) : null}
        {/* P1-18: "How did that feel?" once per session; renders nothing while SHOW_SESSION_FEEDBACK is false */}
        {SHOW_SESSION_FEEDBACK && completedToday && <div className="mt-3 empty:hidden"><SessionFeel userId={userId} sessionDate={todayIso} refreshKey={dbSessionCount} /></div>}
        {/* P1-01: offer the reminder right after session 1 (Stacy B); hidden once opted in or dismissed */}
        {completedToday && dbSessionCount === 1 && (
          <div className="mt-3"><ReminderOptIn userId={userId} placement="after_session" /></div>
        )}
        {/* P1-13: Add to Home Screen tip after session 1, under the reminder offer (phones only) */}
        {completedToday && dbSessionCount === 1 && <div className="mt-3"><AddToHomeScreenTip /></div>}
        {completedToday ? null : (
          <button
            onClick={handleMarkComplete}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98] bg-cobalt"
          >
            Mark Today Complete
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Rx item (full protocol) -----------------------------------------------
function RxItem({
  label, icon: Icon, color, items,
}: {
  label: string
  icon: React.ElementType
  color: string
  items: Rx[]
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))

  const toggle = (i: number) => setOpenIdx(o => o === i ? null : i)
  const check  = (i: number) => setChecked(c => c.map((v, idx) => idx === i ? !v : v))

  if (items.length === 0) return null

  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-2.5', color)}>
        <Icon size={14} className="shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="space-y-2">
        {items.map((rx, i) => (
          <div key={rx.id} className={cn(
            'rounded-xl border transition-colors overflow-hidden',
            checked[i] ? 'border-cobalt/20 bg-cobalt/[0.03]' : 'border-cobalt/10 bg-white'
          )}>
            <div className="flex items-start gap-3 px-3.5 py-3">
              <button onClick={() => check(i)} className="mt-0.5 shrink-0 text-cobalt hover:scale-110 transition-transform">
                {checked[i]
                  ? <CheckCircle2 size={17} fill="currentColor" strokeWidth={0} />
                  : <Circle size={17} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-semibold leading-snug', checked[i] ? 'line-through text-slate-400' : 'text-cobalt-ink')}>
                    {rx.name}
                  </p>
                  <button onClick={() => toggle(i)} className="text-slate-400 hover:text-cobalt transition-colors mt-0.5 shrink-0">
                    {openIdx === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
                {rx.dose && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-xs bg-cobalt-light text-cobalt font-semibold px-2.5 py-0.5 rounded-full">{rx.dose}</span>
                  </div>
                )}
                {openIdx === i && (
                  <div className="mt-2.5 pt-2.5 border-t border-cobalt/10 space-y-2">
                    {rx.cue && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        <span className="font-semibold text-cobalt-ink">How to do it: </span>{rx.cue}
                      </p>
                    )}
                    {rx.dose && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-cobalt-ink">Dose: </span>{rx.dose}
                      </p>
                    )}
                    {rx.equipment && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-cobalt-ink">Equipment: </span>{rx.equipment}
                      </p>
                    )}
                    {rx.video_url && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-cobalt-ink">Video: </span>
                        <a href={rx.video_url} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">
                          Watch demo
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Left / Right indicator (same convention as the My Body radar) ---------
// Left = solid slate line, Right = dashed teal line (components/BaseRadar legend).
// The number under it keeps its band colour; only the side indicator follows the radar.
function SideSwatch({ side }: { side: 'left' | 'right' }) {
  const color = side === 'left' ? RADAR_LEFT_COLOR : RADAR_RIGHT_COLOR
  return (
    <svg width="14" height="6" aria-hidden data-side-swatch={side} className="shrink-0">
      <line
        x1="0" y1="3" x2="14" y2="3" stroke={color} strokeWidth="2"
        strokeDasharray={side === 'right' ? RADAR_RIGHT_DASH : undefined}
      />
    </svg>
  )
}

// ---- Issue card (full protocol per-joint) ----------------------------------
function IssueCard({ ranked, rxLibrary, rank }: {
  ranked: ScoredJoint
  rxLibrary: Record<string, Prescription>
  rank: number
}) {
  const [open, setOpen] = useState<boolean>(false)
  const { def, left, right, single, band, asymmetry, severity } = ranked
  const rx = rxLibrary[def.rxKey]

  // Base copy (Jim LOCK 2026-09-24): "#N Problem area", rendered as-is (no uppercase).
  const rankLabel = `#${rank} Problem area`
  // Rank badge coloured by THIS joint's band (Grant's call 2026-09-24, replaces the
  // neutral slate from #74): solid badge in BAND_TONE[band], same band as the chip.
  const rankColor = rankBadgeClass(band)

  const isBilateral = left !== null && right !== null
  const hasAsymmetry = isBilateral && asymmetry > 0
  // Unit as measured/stored (Ankle DF = knee-to-wall cm, everything else degrees).
  const unit = jointUnit(def.key)
  // Each side coloured by Base band (side / JOINT_SCORE_TARGETS); the worse side = card band.
  const sideBands = sideBandsForJoint(def.key, { left, right }, band)
  // Base target from JOINT_SCORE_TARGETS (the one that sets the band), e.g. "90°".
  const targetValue = JOINT_SCORE_TARGETS[def.key]

  return (
    <div className="bg-white rounded-card border border-cobalt/10 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full', rankColor)}>
                {rankLabel}
              </span>
              {band != null && (
                <span className={cn('flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wider', BAND_TONE[band].chip)}>
                  {band === 1 && <AlertTriangle size={9} />} {bandFull(band)}
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-cobalt-ink text-base leading-snug">{def.label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{def.why}</p>
          </div>
          <div className="shrink-0 text-slate-400 mt-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        <div className="px-5 pb-4 flex flex-wrap gap-3">
          {isBilateral ? (
            <>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide inline-flex items-center gap-1" style={{ color: RADAR_LEFT_COLOR }}>
                  <SideSwatch side="left" />Left
                </p>
                <p className={cn('text-sm font-bold', valueToneClass(sideBands.left))} data-band={sideBands.left ?? ''}>
                  {formatMeasure(left)}{unit}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide inline-flex items-center gap-1" style={{ color: RADAR_RIGHT_COLOR }}>
                  <SideSwatch side="right" />Right
                </p>
                <p className={cn('text-sm font-bold', valueToneClass(sideBands.right))} data-band={sideBands.right ?? ''}>
                  {formatMeasure(right)}{unit}
                </p>
              </div>
              {hasAsymmetry && (
                <div className="bg-slate-50 rounded-xl px-3 py-1.5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Asymmetry</p>
                  <p className="text-sm font-bold text-slate-700">{formatMeasure(asymmetry)}{unit} gap</p>
                </div>
              )}
            </>
          ) : single !== null ? (
            <>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Value</p>
                <p className={cn('text-sm font-bold', valueToneClass(band))} data-band={band ?? ''}>
                  {formatMeasure(single)}{unit}
                </p>
              </div>
              {severity > 0 && band != null && band < 3 && (
                <div className={cn('rounded-xl px-3 py-1.5', BAND_TONE[band].bg)}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-wide', BAND_TONE[band].color)}>Below target</p>
                  <p className={cn('text-sm font-bold', BAND_TONE[band].color)}>{formatMeasure(severity)}{unit}</p>
                </div>
              )}
            </>
          ) : null}
          {targetValue != null && (
            <div className="bg-slate-50 rounded-xl px-3 py-1.5">
              {/* "Steady" is a band name: Steady cobalt (BAND_TONE[3]), never black/grey. */}
              <p className={cn('text-[10px] font-medium uppercase tracking-wide', BAND_TONE[3].color)} data-band-label="3">Steady target</p>
              <p className={cn('text-xs font-semibold', BAND_TONE[3].color)}>{targetValue}{unit}</p>
            </div>
          )}
        </div>
      </button>

      {open && rx && (
        <div className="px-5 pb-5 border-t border-cobalt/10 pt-4 space-y-5">
          <RxItem label={`Exercises (${rx.exercises.length})`} icon={Dumbbell} color="text-cobalt" items={rx.exercises} />
          <RxItem label={`Stretches (${rx.stretches.length})`} icon={PersonStanding} color="text-cobalt/70" items={rx.stretches} />
          <RxItem label={`Foam Rolling (${rx.foam.length})`} icon={Flame} color="text-slate-500" items={rx.foam} />
        </div>
      )}
      {open && !rx && (
        <div className="px-5 pb-5 border-t border-cobalt/10 pt-4">
          <p className="text-xs text-slate-500">Recommended exercises loading. Refresh if this persists.</p>
        </div>
      )}
    </div>
  )
}

// ---- Per-tab why copy ------------------------------------------------------
const DAILY_WHY = "This is your minimum effective dose. Research is clear: short, consistent daily mobility work changes range of motion more than long sessions done occasionally. A few minutes a day, every day, is what actually moves your numbers. Do this and you're covered. Everything else is bonus."
const FULL_WHY  = "Got more time, or want to attack a specific restriction? This is your complete list of recommended exercises (Rx). Every movement from your assessment, organized by the limitations holding back your body. Use it as a deeper session when you can, or as a reference to understand the whole plan. The Daily keeps you progressing. The Full lets you go further."

// ---- Main page -------------------------------------------------------------
export function MyProtocol() {
  const { user } = useAuth()
  const { assessment, jointScores, loading } = useProfile(user?.id)
  const [tab, setTab] = useState<'daily' | 'full'>('daily')
  const [rxLibrary, setRxLibrary] = useState<Record<string, Prescription>>({})
  const [rxLoading, setRxLoading]  = useState(true)
  // FG-17: the saved protocol (public.protocols, one row per exercise, written by the server when the assessment is scored)
  // is the single source of truth, the same rows ROMBot reads. undefined = still loading, null = none saved (fall back to the old local pick).
  const [savedProtocol, setSavedProtocol] = useState<{ exerciseIds: string[]; jointOrder: string[] } | null | undefined>(undefined)
  const assessmentId = assessment?.id
  useEffect(() => {
    if (loading) return
    if (!assessmentId) { setSavedProtocol(null); return }
    let cancelled = false
    supabase
      .from('protocols')
      .select('exercise_id, joint_key, priority_rank')
      .eq('assessment_id', assessmentId)
      .order('priority_rank', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data || data.length === 0) { setSavedProtocol(null); return }
        const jointOrder: string[] = []
        for (const r of data) if (!jointOrder.includes(r.joint_key as string)) jointOrder.push(r.joint_key as string)
        setSavedProtocol({ exerciseIds: data.map(r => r.exercise_id as string), jointOrder })
      })
    return () => { cancelled = true }
  }, [assessmentId, loading])

  const bands = useMemo(() => jointBandsForAssessment(assessment, jointScores), [assessment, jointScores])
  const scored = useMemo(() => assessment ? scoreJoints(assessment, bands) : [], [assessment, bands])
  // Same top problem areas as My Body (worst_joints, deduped, max 3) lead the list;
  // remaining slots fall back to asymmetry, then severity. Always capped at 3.
  const problemOrder = useMemo(
    () => topProblemAreasForAssessment(assessment).map(jointKeyBase),
    [assessment],
  )
  const ranked = useMemo(() => {
    const rows = scored
      .filter(s => s.left !== null || s.right !== null || s.single !== null)
      .filter(s => !isUnscoredJoint(s.def.key))
      .map(s => ({ key: s.def.key, asymmetry: s.asymmetry, severity: s.severity, s }))
    // Shared with My Body (lib/mobilityBands rankProblemJoints); problemOrder kept for callers below.
    void problemOrder
    const localRanked = rankProblemJoints(assessment, rows).map(r => r.s)
    // FG-17: when a saved protocol exists, its joints and order win, so the screen shows exactly what ROMBot reads.
    if (savedProtocol && savedProtocol.jointOrder.length > 0) {
      const fromSaved = savedProtocol.jointOrder
        .map(jk => scored.find(s => s.def.key === jk || s.def.rxKey === jk || (JOINT_KEY_ALIASES[s.def.rxKey] ?? []).includes(jk)))
        .filter((s): s is ScoredJoint => !!s)
      if (fromSaved.length > 0) return fromSaved
    }
    return localRanked
  }, [scored, problemOrder, assessment, savedProtocol])

  // Fetch drills for the top-3 priority joints from Supabase.
  useEffect(() => {
    if (savedProtocol === undefined) return // wait for the saved protocol lookup
    if (ranked.length === 0) { setRxLoading(false); return }
    if (savedProtocol && savedProtocol.exerciseIds.length > 0) {
      setRxLoading(true)
      supabase
        .from('exercises')
        .select('id, joint_key, exercise_type, name, sets, reps, coaching_cue, video_url, sports')
        .in('id', savedProtocol.exerciseIds)
        .then(({ data, error }) => {
          if (error) {
            console.error('exercises load error:', error.message)
            setRxLibrary({})
          } else {
            setRxLibrary(groupByJoint((data ?? []) as DbExercise[]))
          }
          setRxLoading(false)
        })
      return
    }
    const wantedAliases = ranked.flatMap(r => JOINT_KEY_ALIASES[r.def.rxKey] ?? [r.def.rxKey])
    if (wantedAliases.length === 0) { setRxLoading(false); return }
    setRxLoading(true)
    supabase
      .from('exercises')
      .select('id, joint_key, exercise_type, name, sets, reps, coaching_cue, video_url, sports')
      .in('joint_key', wantedAliases)
      .contains('sports', ['general'])
      .then(({ data, error }) => {
        if (error) {
          console.error('exercises load error:', error.message)
          setRxLibrary({})
        } else {
          setRxLibrary(groupByJoint((data ?? []) as DbExercise[]))
        }
        setRxLoading(false)
      })
  }, [ranked, savedProtocol])

  if (loading) return <Spinner />

  if (!assessment) return (
    <EmptyState
      icon={ClipboardList}
      title="No assessment yet"
      description="Complete your ROM assessment and your personalized mobility protocol will appear here."
      action={<Link to="/onboarding/assessment" className="btn-primary text-sm">Start assessment</Link>}
    />
  )

  const hasData = scored.some(s => !isUnscoredJoint(s.def.key) && (s.left !== null || s.right !== null || s.single !== null))
  if (!hasData) return (
    <EmptyState
      icon={ClipboardList}
      title="Assessment processing"
      description="Your protocol will generate once your assessment data has been processed."
    />
  )

  const assessedAt = assessment.assessed_at
  const dateStr = new Date(assessedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const prs  = mobilityScoreForAssessment(assessment, jointScores)
  const overallBand: BandScore = overallBandForAssessment(assessment, jointScores) ?? 3
  const tier = getBandTier(overallBand)

  return (
    <div className="space-y-5">
      <PageHeader title="My Protocol" subtitle={`Based on assessment · ${dateStr}`} />

      {/* Sub-tab switcher */}
      <div className="flex gap-1 p-1 rounded-card bg-slate-50 border border-cobalt/10">
        {([['daily', 'Daily'], ['full', 'Full']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-bold transition-colors',
              tab === key ? 'bg-cobalt text-white shadow-sm' : 'text-slate-500 hover:text-cobalt'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Daily (P1-03: Today card first, WHY collapsed under it) */}
      {tab === 'daily' && (
        <>
          {/* P1-17: day 3 ROMBot note, only while unread */}
          {user && <RombotCheckinCard userId={user.id} />}
          {rxLoading ? (
            <div className="py-8 flex justify-center"><Spinner /></div>
          ) : (
            user && (
              <TodayCard
                ranked={ranked}
                rxLibrary={rxLibrary}
                assessedAt={assessedAt}
                userId={user.id}
                assessmentId={assessmentId}
              />
            )
          )}
          {/* P1-21: solo 14-day challenge on the #1 problem area (any logged session counts) */}
          {user && !rxLoading && (
            <SoloChallenge userId={user.id} jointKey={ranked[0]?.def.key ?? null} jointLabel={ranked[0]?.def.label ?? null} />
          )}
          <WhyStatement heading="WHY DAILY" body={DAILY_WHY} />
        </>
      )}

      {/* Full */}
      {tab === 'full' && (
        <>
          <WhyStatement heading="WHY FULL" body={FULL_WHY} />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-cobalt shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Protocol</p>
            </div>
            {rxLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : (
              <div className="space-y-4">
                {ranked.map((r, i) => (
                  <IssueCard key={r.def.key} ranked={r} rxLibrary={rxLibrary} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* P1-03: band summary and retest banner moved below the session */}
      {/* Mobility band (matches MyBody so the two pages read as siblings) */}
      <div className={cn('flex items-center gap-4 rounded-card border p-4 border-cobalt/10', tier.bg)}>
        <div className={cn('w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shrink-0', tier.ring)}>
          <span className={cn('font-display font-bold text-2xl leading-none', tier.color)}>{prs}</span>
          <span className={cn('text-[10px] font-bold', tier.color)}>/100</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp size={13} className={tier.color} />
            <span className={cn('text-xs font-bold tracking-wider', tier.color)}>Mobility band</span>
          </div>
          <p className={cn('text-lg font-bold leading-tight', tier.color)}>{formatScoreBand(prs, overallBand)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Your top three problem areas shape today's plan</p>
        </div>
      </div>

      {/* Retest banner */}
      <RetestBanner assessedAt={assessedAt} />

      <p className="text-center text-xs text-slate-500 pb-2">
        Protocol auto-updates with each new assessment. Retest every 6 weeks.
      </p>
    </div>
  )
}
