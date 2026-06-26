export interface Project {
  slug: string
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'done'
  total: number
  in_progress: number
  backlog: number
  done: number
}

export interface Task {
  slug: string
  status: 'backlog' | 'in-progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  project: string
  age_days: number
  created_at?: string
  stale?: boolean
  stale_days?: number
  waiting_on?: string
  tags?: string[]
}

export interface Update {
  filename: string
  date: string
  content: string
}

export interface TaskDetail extends Task {
  name: string
  work_dir: string
  created_at?: string
  brief: string
  updates: Update[]
}

export interface KBFile {
  name: string
  content: string
}

export interface ActivityDay {
  date: string
  count: number
}

export interface ThroughputPoint {
  period: string
  created: number
  closed: number
}

export interface FlowStats {
  context_recalls: number
  resumes: number
  references: number
  cross_task: number
  kb: number
  tokens_estimated: string
  instant_resumes: number
  tasks_done: number
  tokens_processed: number
  kb_facts: number
  addressed_by_name: number
  weekly_recalls: string
}
