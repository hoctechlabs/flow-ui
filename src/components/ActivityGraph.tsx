import { useQuery } from '@tanstack/react-query'
import { Tooltip, Typography } from 'antd'
import { api } from '../api'

const { Text } = Typography

const WEEKS = 52
const DAYS_PER_WEEK = 7
const CELL = 13
const GAP = 3
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function levelColor(count: number, max: number): string {
  if (count === 0) return 'rgba(255,255,255,0.05)'
  const ratio = count / max
  if (ratio <= 0.25) return '#9be9a8'
  if (ratio <= 0.5)  return '#40c463'
  if (ratio <= 0.75) return '#30a14e'
  return '#216e39'
}

function buildGrid(activityMap: Map<string, number>) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = toISODate(today)

  // Start on the Sunday WEEKS*7 days ago (or the Sunday before that)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - WEEKS * DAYS_PER_WEEK + 1)
  // rewind to nearest Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: Array<Array<{ date: string; count: number; isToday: boolean }>> = []
  const cursor = new Date(startDate)

  while (weeks.length <= WEEKS) {
    const week: Array<{ date: string; count: number; isToday: boolean }> = []
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const iso = toISODate(cursor)
      week.push({ date: iso, count: activityMap.get(iso) ?? 0, isToday: iso === todayISO })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  // Month label: for each week find if any day in that week is the 1st of a month
  // Use the column of that week for the label
  const monthPositions: Array<{ label: string; col: number }> = []
  const seenMonths = new Set<string>()
  weeks.forEach((week, col) => {
    for (const cell of week) {
      const d = new Date(cell.date + 'T00:00:00')
      if (d.getDate() === 1) {
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (!seenMonths.has(key)) {
          seenMonths.add(key)
          monthPositions.push({ label: MONTH_LABELS[d.getMonth()], col })
        }
        break
      }
    }
  })

  return { weeks, monthPositions }
}

export function ActivityGraph() {
  const { data, isLoading } = useQuery({ queryKey: ['activity'], queryFn: api.activity })

  const activityMap = new Map<string, number>()
  let max = 1
  ;(data ?? []).forEach(d => {
    activityMap.set(d.date, d.count)
    if (d.count > max) max = d.count
  })

  const totalShipped = (data ?? []).reduce((s, d) => s + d.count, 0)
  const activeDays   = (data ?? []).filter(d => d.count > 0).length

  const { weeks, monthPositions } = buildGrid(activityMap)

  const LEFT_GUTTER = 28
  const TOP_GUTTER  = 20
  const gridW = weeks.length * (CELL + GAP) - GAP
  const gridH = DAYS_PER_WEEK * (CELL + GAP) - GAP

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>
          Activity
        </Text>
        {!isLoading && (
          <Text style={{ fontSize: 12, color: '#64748b' }}>
            {totalShipped} tasks shipped · {activeDays} active days (last 52 weeks)
          </Text>
        )}
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '18px 22px 14px',
        overflowX: 'auto',
      }}>
        {isLoading ? (
          <div style={{ height: gridH + TOP_GUTTER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#475569', fontSize: 13 }}>Loading…</Text>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${LEFT_GUTTER + gridW} ${TOP_GUTTER + gridH}`}
            style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
          >
            {/* Month labels — positioned at the first week that contains the 1st */}
            {monthPositions.map(m => (
              <text
                key={`${m.label}-${m.col}`}
                x={LEFT_GUTTER + m.col * (CELL + GAP)}
                y={12}
                fontSize={10}
                fill="#475569"
                fontFamily="system-ui, sans-serif"
              >
                {m.label}
              </text>
            ))}

            {/* Day-of-week labels */}
            {DAY_LABELS.map((label, row) => label ? (
              <text
                key={row}
                x={LEFT_GUTTER - 4}
                y={TOP_GUTTER + row * (CELL + GAP) + CELL - 2}
                fontSize={9}
                fill="#475569"
                textAnchor="end"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            ) : null)}

            {/* Cells */}
            {weeks.map((week, col) =>
              week.map((cell, row) => (
                <Tooltip
                  key={cell.date}
                  title={
                    cell.count > 0
                      ? `${cell.count} task${cell.count > 1 ? 's' : ''} shipped — ${cell.date}`
                      : cell.date
                  }
                  placement="top"
                >
                  <rect
                    x={LEFT_GUTTER + col * (CELL + GAP)}
                    y={TOP_GUTTER + row * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    ry={3}
                    fill={levelColor(cell.count, max)}
                    stroke={cell.isToday ? '#38bdf8' : 'none'}
                    strokeWidth={cell.isToday ? 1.5 : 0}
                    style={{ cursor: cell.count > 0 ? 'pointer' : 'default' }}
                  />
                </Tooltip>
              ))
            )}
          </svg>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: '#475569' }}>Less</Text>
          {[0, 0.2, 0.45, 0.7, 1].map(ratio => (
            <div
              key={ratio}
              style={{ width: CELL, height: CELL, borderRadius: 3, background: levelColor(ratio === 0 ? 0 : ratio * max, max), flexShrink: 0 }}
            />
          ))}
          <Text style={{ fontSize: 10, color: '#475569' }}>More</Text>
        </div>
      </div>
    </div>
  )
}
