import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Input, Segmented, Select, Spin, Empty } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { PageHeader } from './PageHeader'
import { api } from '../api'
import { TaskCard } from './TaskCard'
import { TaskDetail } from './TaskDetail'
import type { Task } from '../types'

const columnDef = [
  { key: 'backlog',      label: 'Backlog',     dot: '#64748b', topBorder: '#334155', countBg: 'rgba(100,116,139,0.18)', countColor: '#64748b' },
  { key: 'in-progress', label: 'In Progress',  dot: '#38bdf8', topBorder: '#38bdf8', countBg: 'rgba(56,189,248,0.15)',  countColor: '#38bdf8' },
  { key: 'done',        label: 'Done',         dot: '#10b981', topBorder: '#10b981', countBg: 'rgba(16,185,129,0.15)',  countColor: '#10b981' },
] as const

export function TasksView() {
  const { project } = useParams<{ project?: string }>()
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sort, setSort] = useState<string>('newest')
  const [search, setSearch] = useState('')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const { data: activeTasks, isLoading: loadingActive } = useQuery({
    queryKey: ['tasks', project ?? null],
    queryFn: () => api.tasks({ project }),
  })

  const { data: doneTasks, isLoading: loadingDone } = useQuery({
    queryKey: ['tasks-done', project ?? null],
    queryFn: () => api.tasks({ project, status: 'done' }),
  })

  const isLoading = loadingActive || loadingDone
  const tasks = [...(activeTasks ?? []), ...(doneTasks ?? [])]

  const filtered = tasks
    .filter(t => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (search && !t.slug.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'newest') return a.age_days - b.age_days
      if (sort === 'oldest') return b.age_days - a.age_days
      if (sort === 'priority') {
        const order = { high: 0, medium: 1, low: 2 }
        return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1)
      }
      return 0
    })

  const title = project ? project.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All Tasks'
  const isAllTasks = !project

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0b0e14' }}>
      <PageHeader
        title={title}
        subtitle={`${tasks.length} tasks`}
        right={
          <>
            <Select
              size="small"
              value={sort}
              onChange={setSort}
              style={{ width: 130 }}
              options={[
                { label: 'Newest first', value: 'newest' },
                { label: 'Oldest first', value: 'oldest' },
                { label: 'By priority', value: 'priority' },
              ]}
            />
            <Segmented
              size="small"
              value={priorityFilter}
              onChange={v => setPriorityFilter(v as string)}
              options={[
                { label: 'All', value: 'all' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ]}
            />
            <Input
              size="small"
              prefix={<SearchOutlined style={{ color: '#475569' }} />}
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 190 }}
              allowClear
            />
          </>
        }
      />

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: 18,
            padding: '24px 28px',
            height: '100%',
            overflowX: 'auto',
            boxSizing: 'border-box',
          }}>
            {columnDef.map(col => (
              <BoardColumn
                key={col.key}
                title={col.label}
                dot={col.dot}
                topBorder={col.topBorder}
                countBg={col.countBg}
                countColor={col.countColor}
                tasks={filtered.filter(t => t.status === col.key)}
                selectedSlug={selectedSlug}
                onSelect={slug => setSelectedSlug(prev => prev === slug ? null : slug)}
                showProject={isAllTasks}
              />
            ))}
          </div>
        )}
      </div>

      {selectedSlug && (
        <TaskDetail key={selectedSlug} slug={selectedSlug} onClose={() => setSelectedSlug(null)} />
      )}
    </div>
  )
}

function BoardColumn({
  title, dot, topBorder, countBg, countColor, tasks, selectedSlug, onSelect, showProject,
}: {
  title: string
  dot: string
  topBorder: string
  countBg: string
  countColor: string
  tasks: Task[]
  selectedSlug: string | null
  onSelect: (s: string) => void
  showProject: boolean
}) {
  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 280,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderTop: `2px solid ${topBorder}`,
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '100%',
    }}>
      <div style={{
        padding: '14px 18px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px 10px 0 0',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', flex: 1, letterSpacing: '0.03em' }}>{title}</span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          background: countBg,
          color: countColor,
          padding: '2px 9px',
          borderRadius: 10,
        }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ overflowY: 'auto', padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {tasks.length === 0
          ? <Empty description={<span style={{ fontSize: 12, color: '#475569' }}>No tasks</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '28px 0' }} />
          : tasks.map(t => (
            <TaskCard
              key={t.slug}
              task={t}
              selected={selectedSlug === t.slug}
              onClick={() => onSelect(t.slug)}
              showProject={showProject}
            />
          ))
        }
      </div>
    </div>
  )
}
