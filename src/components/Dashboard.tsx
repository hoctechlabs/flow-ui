import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spin, Tooltip } from 'antd'
import {
  CheckCircleOutlined,
  SyncOutlined,
  ThunderboltFilled,
  DatabaseOutlined,
  RocketOutlined,
  LinkOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type { Project, FlowStats } from '../types'
import { ActivityGraph } from './ActivityGraph'
import { ThroughputChart } from './ThroughputChart'
import { PageHeader } from './PageHeader'

// ── Stat tile ────────────────────────────────────────────────────────────────

function Tile({ label, value, color, dim, suffix, primary }: {
  label: string
  value: number | string
  color: string
  dim?: boolean
  suffix?: string
  primary?: boolean
}) {
  return (
    <div
      style={{
        background: dim ? 'rgba(255,255,255,0.015)' : primary ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `3px solid ${dim ? 'rgba(255,255,255,0.07)' : color}`,
        borderRadius: 10,
        padding: primary ? '20px 22px' : '16px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        opacity: dim ? 0.5 : 1,
        cursor: 'default',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = dim ? 'rgba(255,255,255,0.025)' : primary ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = dim ? 'rgba(255,255,255,0.015)' : primary ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.03)' }}
    >
      <div style={{ fontSize: 12, color: dim ? '#334155' : '#64748b', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: primary ? 34 : 26, fontWeight: 700, color: dim ? '#334155' : '#e2e8f0', lineHeight: 1, whiteSpace: 'nowrap' }}>
        {value}{suffix && <span style={{ fontSize: 13, color: '#475569', marginLeft: 5 }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 12 }}>
      {children}
    </div>
  )
}

// ── AI Memory headline ────────────────────────────────────────────────────────

function WeeklyBar({ pattern }: { pattern: string }) {
  const heights: Record<string, number> = { '▁': 10, '▂': 14, '▃': 18, '▄': 22, '▅': 26, '▆': 30, '▇': 34, '█': 38 }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 42 }}>
      {pattern.split('').map((b, i) => (
        <div key={i} style={{
          width: 16,
          height: heights[b] ?? 10,
          background: i === pattern.length - 1 ? '#38bdf8' : 'rgba(56,189,248,0.35)',
          borderRadius: 2,
        }} />
      ))}
    </div>
  )
}

function AIMemory({ stats }: { stats: FlowStats }) {
  const memTiles = [
    { label: 'Tasks shipped',    value: stats.tasks_done,         color: '#10b981', icon: <CheckCircleOutlined /> },
    { label: 'KB facts',         value: stats.kb_facts,           color: '#a78bfa', icon: <DatabaseOutlined /> },
    { label: 'Named, not UUID',  value: stats.addressed_by_name,  color: '#38bdf8', icon: <LinkOutlined /> },
    { label: 'Cross-task refs',  value: stats.cross_task,         color: '#f59e0b', icon: <BranchesOutlined /> },
    { label: 'Session resumes',  value: stats.resumes,            color: '#10b981', icon: <SyncOutlined /> },
    {
      label: 'Tokens processed',
      value: stats.tokens_processed >= 1e9
        ? `${(stats.tokens_processed / 1e9).toFixed(1)}B`
        : `${(stats.tokens_processed / 1e6).toFixed(0)}M`,
      color: '#64748b',
      icon: <RocketOutlined />,
    },
  ]

  return (
    <div style={{
      display: 'flex',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Gradient left accent bar */}
      <div style={{
        width: 3,
        flexShrink: 0,
        background: 'linear-gradient(to bottom, #10b981, #38bdf8)',
      }} />
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(56,189,248,0.04) 100%)',
        overflow: 'hidden',
      }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '22px 26px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{
            width: 46,
            height: 46,
            background: 'linear-gradient(135deg, #10b981, #38bdf8)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ThunderboltFilled style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Context recalls</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{stats.context_recalls.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ flex: 1, fontSize: 14, color: '#64748b', lineHeight: 1.9 }}>
          Your AI remembered, so you didn't.
          <br />
          <span style={{ color: '#38bdf8' }}>{stats.instant_resumes}</span>
          <span style={{ color: '#475569' }}> instant resumes · </span>
          <span style={{ color: '#10b981' }}>{stats.tokens_estimated}</span>
          <span style={{ color: '#475569' }}> tokens never re-typed</span>
        </div>
        {stats.weekly_recalls && (
          <Tooltip title="Weekly recall activity (oldest → newest)">
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>WEEKLY</div>
              <WeeklyBar pattern={stats.weekly_recalls} />
            </div>
          </Tooltip>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', background: 'rgba(255,255,255,0.04)' }}>
        {memTiles.map((t, i) => (
          <div key={t.label} style={{
            background: 'rgba(11,14,20,0.7)',
            padding: '16px 20px',
            borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ fontSize: 11, color: '#475569' }}>{t.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: t.color, fontSize: 16 }}>{t.icon}</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>{t.value}</span>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}

// ── Project list ──────────────────────────────────────────────────────────────

function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function ProjectCard({ p, onClick }: { p: Project; onClick: () => void }) {
  const isActive = p.in_progress > 0
  const total = p.backlog + p.in_progress + p.done
  const pct = total > 0 ? Math.round((p.done / total) * 100) : 0

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `3px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '18px 20px 16px',
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: isActive ? 1 : 0.65,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = isActive ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.05)'
        el.style.opacity = '1'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = isActive ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)'
        el.style.opacity = isActive ? '1' : '0.65'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: isActive ? '#e2e8f0' : '#94a3b8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {slugToName(p.slug)}
        </div>
        {isActive && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#38bdf8',
            background: 'rgba(56,189,248,0.15)',
            padding: '2px 8px',
            borderRadius: 10,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {p.in_progress} active
          </span>
        )}
      </div>

      {/* Big backlog number */}
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: isActive ? '#e2e8f0' : '#475569', lineHeight: 1 }}>
          {p.backlog}
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>tasks in backlog</div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
          marginBottom: 5,
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: isActive ? '#10b981' : '#334155',
            borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#475569' }}>{pct}% done</span>
          <span style={{ fontSize: 11, color: '#334155' }}>{p.done}/{total}</span>
        </div>
      </div>
    </div>
  )
}

function ProjectList({ projects, onNavigate }: { projects: Project[]; onNavigate: (slug: string) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 12,
    }}>
      {projects.map(p => (
        <ProjectCard key={p.slug} p={p} onClick={() => onNavigate(p.slug)} />
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()
  const { data: projects, isLoading: lp } = useQuery({ queryKey: ['projects'], queryFn: api.projects })
  const { data: activeTasks, isLoading: la } = useQuery({ queryKey: ['tasks', null], queryFn: () => api.tasks() })
  const { data: doneTasks, isLoading: ld } = useQuery({ queryKey: ['tasks-done', null], queryFn: () => api.tasks({ status: 'done' }) })
  const { data: flowStats, isLoading: ls } = useQuery({ queryKey: ['stats'], queryFn: api.stats })

  if (lp || la || ld) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  const tasks = [...(activeTasks ?? []), ...(doneTasks ?? [])]
  const projs = projects ?? []

  const inProgress   = tasks.filter(t => t.status === 'in-progress').length
  const backlog      = tasks.filter(t => t.status === 'backlog').length
  const done         = tasks.filter(t => t.status === 'done').length
  const stale        = tasks.filter(t => t.stale).length
  const waiting      = tasks.filter(t => t.waiting_on).length
  const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length
  const activeProjects = projs.filter(p => p.in_progress > 0 || p.backlog > 0).length

  const overviewTiles = [
    { label: 'Active projects', value: activeProjects, suffix: `/ ${projs.length}`, color: '#38bdf8', dim: false,               primary: false },
    { label: 'In progress',     value: inProgress,     color: '#38bdf8',            dim: inProgress === 0,    primary: true  },
    { label: 'Backlog',         value: backlog,        color: '#64748b',            dim: false,               primary: false },
    { label: 'Done',            value: done,           color: '#10b981',            dim: false,               primary: false },
    { label: 'High priority',   value: highPriority,   color: '#f43f5e',            dim: highPriority === 0,  primary: true  },
    { label: 'Stale',           value: stale,          color: '#f59e0b',            dim: stale === 0,         primary: false },
    { label: 'Waiting',         value: waiting,        color: '#38bdf8',            dim: waiting === 0,       primary: false },
  ]

  const tableData = projs
    .filter(p => p.total > 0)
    .sort((a, b) => b.in_progress - a.in_progress || b.backlog - a.backlog)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0b0e14' }}>
      <PageHeader title="Dashboard" subtitle={`${tasks.length} tasks across ${projs.length} projects`} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        <div>
          <SectionLabel>Overview</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {overviewTiles.map(t => (
              <Tile key={t.label} label={t.label} value={t.value} color={t.color} dim={t.dim} suffix={t.suffix} primary={t.primary} />
            ))}
          </div>
        </div>

        {!ls && flowStats && (
          <div>
            <SectionLabel>AI Memory</SectionLabel>
            <AIMemory stats={flowStats} />
          </div>
        )}

        <ActivityGraph />

        <ThroughputChart projects={tableData} />

        <div>
          <SectionLabel>Projects</SectionLabel>
          <ProjectList projects={tableData} onNavigate={slug => navigate(`/tasks/${encodeURIComponent(slug)}`)} />
        </div>

      </div>
    </div>
  )
}
