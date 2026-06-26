interface Props {
  title: string
  subtitle?: string
  right?: React.ReactNode
  tabs?: React.ReactNode
}

export function PageHeader({ title, subtitle, right, tabs }: Props) {
  return (
    <div style={{
      background: '#0f1117',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
    }}>
      <div style={{
        height: 57,
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{title}</span>
          {subtitle && (
            <span style={{ fontSize: 12.5, color: '#475569', marginLeft: 10 }}>{subtitle}</span>
          )}
        </div>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{right}</div>}
      </div>
      {tabs && <div style={{ padding: '0 28px' }}>{tabs}</div>}
    </div>
  )
}
