import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spin } from 'antd'
import {
  AppstoreOutlined,
  BookOutlined,
  FolderOutlined,
  DashboardOutlined,
  ThunderboltFilled,
} from '@ant-design/icons'

function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
import { api } from '../api'
import type { Project } from '../types'

function NavItem({
  icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  count?: number | string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px 9px 16px',
        borderRadius: 7,
        cursor: 'pointer',
        margin: '2px 10px',
        background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
        borderLeft: active ? '3px solid #10b981' : '3px solid transparent',
        transition: 'background 0.12s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      <span style={{ color: active ? '#10b981' : '#64748b', fontSize: 15, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{
        flex: 1,
        fontSize: 13.5,
        color: active ? '#e2e8f0' : '#94a3b8',
        fontWeight: active ? 500 : 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          background: active ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)',
          color: active ? '#10b981' : '#64748b',
          padding: '2px 8px',
          borderRadius: 10,
          lineHeight: '17px',
          flexShrink: 0,
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '20px 22px 7px',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: '#334155',
    }}>
      {children}
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: api.projects })

  const totalActive = projects?.reduce((s, p) => s + p.backlog + p.in_progress, 0) ?? 0

  const isDashboard = pathname === '/'
  const isAllTasks  = pathname === '/tasks'
  const isKB        = pathname === '/kb'
  const activeProject = pathname.startsWith('/tasks/') ? decodeURIComponent(pathname.slice(7)) : null

  return (
    <div style={{
      width: 230,
      background: '#0f1117',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
    }}>
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #10b981, #38bdf8)',
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ThunderboltFilled style={{ color: '#fff', fontSize: 16 }} />
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.3px' }}>
          Flow
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
        <SectionLabel>Views</SectionLabel>

        <NavItem
          icon={<DashboardOutlined />}
          label="Dashboard"
          active={isDashboard}
          onClick={() => navigate('/')}
        />

        <NavItem
          icon={<AppstoreOutlined />}
          label="All Tasks"
          active={isAllTasks}
          count={totalActive}
          onClick={() => navigate('/tasks')}
        />

        <NavItem
          icon={<BookOutlined />}
          label="Knowledge Base"
          active={isKB}
          onClick={() => navigate('/kb')}
        />

        <SectionLabel>Projects</SectionLabel>

        {isLoading ? (
          <div style={{ padding: '14px 22px' }}><Spin size="small" /></div>
        ) : (
          projects
            ?.filter(p => p.total > 0)
            .sort((a, b) => b.in_progress - a.in_progress || b.backlog - a.backlog)
            .map((p: Project) => (
              <NavItem
                key={p.slug}
                icon={<FolderOutlined />}
                label={slugToName(p.slug)}
                active={activeProject === p.slug}
                count={p.in_progress > 0 ? `${p.in_progress} active` : p.backlog + p.done}
                onClick={() => navigate(`/tasks/${encodeURIComponent(p.slug)}`)}
              />
            ))
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'linear-gradient(to bottom, transparent, #0f1117)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
