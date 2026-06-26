import { Tag, Tooltip } from 'antd'
import { WarningOutlined, HourglassOutlined } from '@ant-design/icons'
import type { Task } from '../types'

const priorityBorder: Record<string, string> = {
  high:   '#f43f5e',
  medium: '#f59e0b',
  low:    '#10b981',
}

const priorityTag: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(244,63,94,0.15)',   color: '#f43f5e' },
  medium: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  low:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
}

function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function timeAgo(isoString?: string, ageDays?: number): string {
  if (isoString) {
    const diff = Date.now() - new Date(isoString).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    if (mins < 60)    return `${mins}m ago`
    if (hours < 24)   return `${hours}h ago`
    if (days < 7)     return `${days}d ago`
    if (weeks < 5)    return `${weeks}w ago`
    if (months < 12)  return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
  }
  if (ageDays !== undefined) return `${ageDays}d ago`
  return ''
}

interface Props {
  task: Task
  selected?: boolean
  onClick: () => void
  showProject?: boolean
}

export function TaskCard({ task, selected, onClick, showProject }: Props) {
  const pt = priorityTag[task.priority] ?? priorityTag.medium

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? '#1c2333' : '#161b27',
        borderRadius: 8,
        borderLeft: `4px solid ${priorityBorder[task.priority] ?? '#64748b'}`,
        padding: '14px 16px 13px',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 2px #10b981'
          : '0 1px 4px rgba(0,0,0,0.35)',
        transition: 'box-shadow 0.15s, background 0.15s, transform 0.12s',
        userSelect: 'none',
        transform: 'translateY(0)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        if (!selected) {
          el.style.background = '#1a2030'
          el.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        if (!selected) {
          el.style.background = '#161b27'
          el.style.transform = 'translateY(0)'
        }
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 3 }}>
        {slugToName(task.slug)}
      </div>

      <div style={{
        fontFamily: "'SFMono-Regular', 'Consolas', monospace",
        fontSize: 10,
        color: '#334155',
        marginBottom: showProject && task.project ? 3 : 12,
        letterSpacing: '0.02em',
      }}>
        {task.slug}
      </div>

      {showProject && task.project && (
        <div style={{
          fontSize: 10.5,
          color: '#475569',
          marginBottom: 12,
          display: 'inline-block',
          background: 'rgba(255,255,255,0.05)',
          padding: '1px 7px',
          borderRadius: 4,
        }}>
          {task.project}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Tag style={{ background: pt.bg, color: pt.color, border: `1px solid ${pt.color}40`, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '1px 7px', margin: 0, lineHeight: '19px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {task.priority}
        </Tag>

        {task.stale && (
          <Tooltip title={`Stale for ${task.stale_days} days`}>
            <Tag icon={<WarningOutlined />} style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, fontSize: 10, padding: '1px 7px', margin: 0, lineHeight: '19px' }}>
              stale
            </Tag>
          </Tooltip>
        )}

        {task.waiting_on && (
          <Tooltip title={`Waiting: ${task.waiting_on}`}>
            <Tag icon={<HourglassOutlined />} style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 4, fontSize: 10, padding: '1px 7px', margin: 0, lineHeight: '19px' }}>
              waiting
            </Tag>
          </Tooltip>
        )}

        <Tooltip title={task.created_at ? new Date(task.created_at).toLocaleString() : undefined}>
          <span style={{ fontSize: 10.5, color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap', cursor: task.created_at ? 'default' : undefined }}>
            {timeAgo(task.created_at, task.age_days)}
          </span>
        </Tooltip>
      </div>
    </div>
  )
}
