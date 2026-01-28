// Task lifecycle types for Phase 2

export interface TaskConfig {
  id?: string;
  name: string;
  owner?: string;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}
