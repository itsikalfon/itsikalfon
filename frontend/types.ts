export type TaskType = 'Video' | 'Static' | 'Code' | 'Creative' | 'Mixed' | 'Other';
export type Priority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  estimatedHours: number;
  priority: Priority;
  requiredSkills: string[];
  locked?: boolean;
  canSplit?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string[];
  weeklyCapacityHours: number;
  avatarUrl: string;
}

export interface BoardState {
  queue: Task[];
  columns: Record<string, Task[]>; // memberId -> tasks
  overflow: Task[];
  completed: Task[]; // New completed area
  score: number;
  team: TeamMember[];
  globalHoursPerWeek: number;
  weekOffset: number; // Added to track current week view
}

export interface FallingTask {
  id: string;
  task: Task;
  colId: string;
  yHours: number; // Position from top in hours
  isPlayMode: boolean;
  speed: number; // Hours per second
}