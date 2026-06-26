import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Tabs, Spin, Empty } from 'antd'
import { UserOutlined, TeamOutlined, AppstoreOutlined, SettingOutlined, DollarOutlined } from '@ant-design/icons'
import { api } from '../api'
import { PageHeader } from './PageHeader'

const icons: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  org: <TeamOutlined />,
  products: <AppstoreOutlined />,
  processes: <SettingOutlined />,
  business: <DollarOutlined />,
}

export function KBView() {
  const [active, setActive] = useState('user')
  const { data, isLoading } = useQuery({ queryKey: ['kb'], queryFn: api.kb })

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spin /></div>
  }

  if (!data) return null
  const current = data.find(f => f.name === active)

  const tabs = (
    <Tabs
      activeKey={active}
      onChange={setActive}
      size="small"
      items={data.map(f => ({
        key: f.name,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {icons[f.name]}
            {f.name.charAt(0).toUpperCase() + f.name.slice(1)}
          </span>
        ),
      }))}
      tabBarStyle={{ margin: 0, borderBottom: 'none' }}
    />
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0b0e14' }}>
      <PageHeader title="Knowledge Base" tabs={tabs} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 820 }}>
        {current?.content
          ? <div className="md"><ReactMarkdown>{current.content}</ReactMarkdown></div>
          : <Empty description={<span style={{ color: '#475569' }}>Nothing recorded yet</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }
      </div>
    </div>
  )
}
