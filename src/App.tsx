import { ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TasksView } from './components/TasksView'
import { KBView } from './components/KBView'
import { Dashboard } from './components/Dashboard'
import { theme } from './theme'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function FlowApp() {
  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: '#0b0e14' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksView />} />
          <Route path="/tasks/:project" element={<TasksView />} />
          <Route path="/kb" element={<KBView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FlowApp />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  )
}
