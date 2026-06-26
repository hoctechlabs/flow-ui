import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Column } from '@ant-design/charts'
import { Segmented, Collapse, Spin, Empty } from 'antd'
import { api } from '../api'
import type { Project, ThroughputPoint } from '../types'

type Granularity = 'day' | 'week'

function formatPeriodLabel(period: string, granularity: Granularity): string {
  if (!period) return ''
  try {
    const d = new Date(period + 'T00:00:00')
    if (granularity === 'week') {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return period
  }
}

function toChartData(points: ThroughputPoint[], granularity: Granularity) {
  const rows: { period: string; value: number; type: string }[] = []
  for (const p of points) {
    const label = formatPeriodLabel(p.period, granularity)
    rows.push({ period: label, value: p.created, type: 'Created' })
    rows.push({ period: label, value: p.closed, type: 'Closed' })
  }
  return rows
}

const chartConfig = {
  xField: 'period',
  yField: 'value',
  colorField: 'type',
  group: true,
  style: { maxWidth: 16, radius: [3, 3, 0, 0] },
  color: ['#38bdf8', '#10b981'],
  legend: { position: 'top-right' as const },
  axis: {
    x: { label: { style: { fill: '#475569', fontSize: 11 } } },
    y: { label: { style: { fill: '#475569', fontSize: 11 } }, grid: { line: { style: { stroke: 'rgba(255,255,255,0.06)' } } } },
  },
  tooltip: { shared: true },
  theme: 'dark',
  background: 'transparent',
}

interface ChartBlockProps {
  data: ThroughputPoint[]
  granularity: Granularity
  height?: number
}

function ChartBlock({ data, granularity, height = 220 }: ChartBlockProps) {
  if (!data.length) {
    return <Empty description={<span style={{ color: '#475569' }}>No data</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }} />
  }
  const chartData = toChartData(data, granularity)
  return (
    <Column
      {...chartConfig}
      data={chartData}
      height={height}
    />
  )
}

interface Props {
  projects: Project[]
}

export function ThroughputChart({ projects }: Props) {
  const [granularity, setGranularity] = useState<Granularity>('week')

  const { data: overall, isLoading: lo } = useQuery({
    queryKey: ['throughput', 'overall', granularity],
    queryFn: () => api.throughput({ granularity }),
  })

  const activeProjects = projects.filter(p => p.total > 0).slice(0, 8)

  const projectQueries = activeProjects.map(p => ({
    slug: p.slug,
  }))

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>
          Throughput
        </div>
        <Segmented
          size="small"
          options={[
            { label: 'Weekly', value: 'week' },
            { label: 'Daily', value: 'day' },
          ]}
          value={granularity}
          onChange={v => setGranularity(v as Granularity)}
        />
      </div>

      {/* Overall chart */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '20px 20px 12px',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
          All projects &mdash; {granularity === 'week' ? 'last 16 weeks' : 'last 60 days'}
        </div>
        {lo ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <ChartBlock data={overall ?? []} granularity={granularity} height={220} />
        )}
      </div>

      {/* Per-project charts */}
      {projectQueries.length > 0 && (
        <Collapse
          ghost
          size="small"
          style={{ background: 'transparent' }}
          items={projectQueries.map(({ slug }) => ({
            key: slug,
            label: (
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            ),
            style: {
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              marginBottom: 6,
            },
            children: <ProjectChart slug={slug} granularity={granularity} />,
          }))}
        />
      )}
    </div>
  )
}

function ProjectChart({ slug, granularity }: { slug: string; granularity: Granularity }) {
  const { data, isLoading } = useQuery({
    queryKey: ['throughput', slug, granularity],
    queryFn: () => api.throughput({ granularity, project: slug }),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <Spin size="small" />
      </div>
    )
  }

  return <ChartBlock data={data ?? []} granularity={granularity} height={160} />
}
