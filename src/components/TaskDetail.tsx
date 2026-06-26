import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Drawer, Tabs, Tag, Space, Spin, Empty, Button, Tooltip } from 'antd'
import { FolderOutlined, ClockCircleOutlined, WarningOutlined, HourglassOutlined, CloseOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons'
import { api } from '../api'

interface Props {
  slug: string
  onClose: () => void
}

const priorityTag: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(244,63,94,0.15)',  color: '#f43f5e' },
  medium: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  low:    { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
}

const statusTag: Record<string, { bg: string; color: string; label: string }> = {
  'in-progress': { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', label: 'In Progress' },
  backlog:       { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'Backlog' },
  done:          { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Done' },
}

export function TaskDetail({ slug, onClose }: Props) {
  const [tab, setTab] = useState('brief')
  const [copied, setCopied] = useState(false)

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['task', slug],
    queryFn: () => api.taskDetail(slug),
  })

  const pt = data ? (priorityTag[data.priority] ?? priorityTag.medium) : null
  const st = data ? (statusTag[data.status] ?? statusTag.backlog) : null
  const updatesCount = data?.updates?.length ?? 0

  return (
    <Drawer
      open={true}
      onClose={onClose}
      placement="right"
      width={660}
      title={null}
      closable={false}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#161b27' },
        mask: { background: 'rgba(0,0,0,0.45)' },
        wrapper: { boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' },
      }}
    >
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Spin size="large" />
        </div>
      ) : !data ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '24px 28px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" style={{ color: '#64748b' }} />
            </div>

            {/* Name */}
            <h2 style={{ fontSize: 19, fontWeight: 600, color: '#e2e8f0', margin: '0 0 6px', lineHeight: 1.4 }}>
              {data.name || data.slug}
            </h2>

            {/* Slug */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', letterSpacing: '0.02em' }}>
                {data.slug}
              </span>
              <Tooltip title={copied ? 'Copied!' : 'Copy slug'}>
                <Button
                  type="text"
                  size="small"
                  icon={copied ? <CheckOutlined style={{ color: '#10b981' }} /> : <CopyOutlined />}
                  onClick={() => copySlug(data.slug)}
                  style={{ color: '#475569', padding: '0 4px', height: 20, minWidth: 20 }}
                />
              </Tooltip>
            </div>

            {/* Badges */}
            <Space size={8} wrap style={{ rowGap: 8, marginBottom: 20 }}>
              {pt && (
                <Tag style={{ background: pt.bg, color: pt.color, border: `1px solid ${pt.color}40`, borderRadius: 5, fontSize: 11, fontWeight: 700, padding: '3px 10px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {data.priority}
                </Tag>
              )}
              {st && (
                <Tag style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40`, borderRadius: 5, fontSize: 11, fontWeight: 500, padding: '3px 10px', margin: 0 }}>
                  {st.label}
                </Tag>
              )}
              {data.stale && (
                <Tag icon={<WarningOutlined />} style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 5, fontSize: 11, padding: '3px 10px', margin: 0 }}>
                  stale {data.stale_days ? `${data.stale_days}d` : ''}
                </Tag>
              )}
              {data.waiting_on && (
                <Tag icon={<HourglassOutlined />} style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 5, fontSize: 11, padding: '3px 10px', margin: 0 }}>
                  waiting
                </Tag>
              )}
            </Space>

            {/* Waiting detail */}
            {data.waiting_on && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#38bdf8', marginBottom: 16, padding: '10px 14px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 7 }}>
                <HourglassOutlined />
                Waiting on: {data.waiting_on}
              </div>
            )}

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {data.work_dir && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                  <FolderOutlined style={{ flexShrink: 0, color: '#6c7086' }} />
                  {data.work_dir}
                </div>
              )}
              {data.created_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569', flexShrink: 0 }}>
                  <ClockCircleOutlined />
                  {new Date(data.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              size="small"
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
              tabBarStyle={{ padding: '0 28px', marginBottom: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
              items={[
                {
                  key: 'brief',
                  label: 'Brief',
                  style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px' },
                  children: (
                    <>
                      {data.brief
                        ? <div className="md"><ReactMarkdown>{data.brief}</ReactMarkdown></div>
                        : <Empty description={<span style={{ color: '#475569' }}>No brief</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      }
                    </>
                  ),
                },
                {
                  key: 'updates',
                  label: updatesCount > 0 ? `Updates (${updatesCount})` : 'Updates',
                  style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px' },
                  children: (
                    <>
                      {updatesCount === 0
                        ? <Empty description={<span style={{ color: '#475569' }}>No updates yet</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {data.updates.map(u => (
                              <div key={u.filename} style={{ borderLeft: '2px solid rgba(56,189,248,0.4)', paddingLeft: 18 }}>
                                <div style={{ fontSize: 11.5, color: '#475569', fontFamily: 'monospace', marginBottom: 10 }}>{u.date}</div>
                                <div className="md"><ReactMarkdown>{u.content}</ReactMarkdown></div>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
    </Drawer>
  )
}
