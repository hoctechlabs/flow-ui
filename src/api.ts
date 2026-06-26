import axios from 'axios'
import type { Project, Task, TaskDetail, KBFile, FlowStats, ActivityDay, ThroughputPoint } from './types'

const client = axios.create({ baseURL: 'http://localhost:8765' })

export const api = {
  projects: () => client.get<Project[]>('/api/projects').then(r => r.data),
  tasks: (params?: { project?: string; status?: string; priority?: string }) =>
    client.get<Task[]>('/api/tasks', { params }).then(r => r.data),
  taskDetail: (slug: string) =>
    client.get<TaskDetail>(`/api/tasks/${slug}`).then(r => r.data),
  kb: () => client.get<KBFile[]>('/api/kb/all').then(r => r.data),
  stats: () => client.get<FlowStats>('/api/stats').then(r => r.data),
  activity: () => client.get<ActivityDay[]>('/api/activity').then(r => r.data),
  throughput: (params?: { granularity?: 'day' | 'week'; project?: string }) =>
    client.get<ThroughputPoint[]>('/api/throughput', { params }).then(r => r.data),
}
