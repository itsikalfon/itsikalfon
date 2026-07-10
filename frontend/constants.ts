import { TeamMember, Task } from './types';

export const DEFAULT_HOURS_PER_WEEK = 45; // 5 days * 9 hours
export const HOURS_PER_DAY = 9;
export const PIXELS_PER_HOUR = 20; // Increased for better visibility of small tasks

export const INITIAL_TEAM: TeamMember[] = [
  { id: 'm1', name: 'Video 1', role: 'Video', skills: ['Video'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m1/100/100' },
  { id: 'm2', name: 'Video 2', role: 'Video + Code', skills: ['Video', 'Code'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m2/100/100' },
  { id: 'm3', name: 'Video 3', role: 'Video', skills: ['Video'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m3/100/100' },
  { id: 'm4', name: 'Creative', role: 'Creative + Design', skills: ['Creative', 'Static'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m4/100/100' },
  { id: 'm5', name: 'Designer 1', role: 'Static Design', skills: ['Static'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m5/100/100' },
  { id: 'm6', name: 'Designer 2', role: 'Static Design', skills: ['Static'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m6/100/100' },
  { id: 'm7', name: 'Designer 3', role: 'Static Design', skills: ['Static'], weeklyCapacityHours: 45, avatarUrl: 'https://picsum.photos/seed/m7/100/100' },
];

export const INITIAL_TASKS: Task[] = [
  { id: 't1', name: 'PM Sports General', type: 'Video', estimatedHours: 8, priority: 'Normal', requiredSkills: ['Video'] },
  { id: 't2', name: 'PM Sports Body', type: 'Video', estimatedHours: 6, priority: 'Normal', requiredSkills: ['Video'] },
  { id: 't3', name: 'PM Sports VS', type: 'Video', estimatedHours: 10, priority: 'High', requiredSkills: ['Video'] },
  { id: 't4', name: 'PM Sports Creative', type: 'Creative', estimatedHours: 6, priority: 'Normal', requiredSkills: ['Creative'] },
  { id: 't5', name: 'SG-OOH Quote', type: 'Creative', estimatedHours: 2, priority: 'Low', requiredSkills: ['Creative'] },
  { id: 't6', name: 'US SSF-247 Banners', type: 'Static', estimatedHours: 8, priority: 'Normal', requiredSkills: ['Static'] },
  { id: 't7', name: 'US SSF-247 3 Videos', type: 'Video', estimatedHours: 12, priority: 'High', requiredSkills: ['Video'] },
  { id: 't8', name: '24/5 – B7 Promo', type: 'Mixed', estimatedHours: 6, priority: 'Normal', requiredSkills: ['Video', 'Static'], canSplit: true },
  { id: 't9', name: 'Earning Season Video', type: 'Video', estimatedHours: 8, priority: 'Urgent', requiredSkills: ['Video'] },
  { id: 't10', name: 'Earning Season Banners', type: 'Static', estimatedHours: 4, priority: 'Urgent', requiredSkills: ['Static'] },
  { id: 't11', name: 'CANDI ETF Campaign', type: 'Mixed', estimatedHours: 8, priority: 'Normal', requiredSkills: ['Video', 'Static'] },
  { id: 't12', name: 'Client banners', type: 'Static', estimatedHours: 10, priority: 'Normal', requiredSkills: ['Static'] },
  { id: 't13', name: 'Newsletter design', type: 'Static', estimatedHours: 6, priority: 'Low', requiredSkills: ['Static'] },
  { id: 't14', name: 'Weekly planning', type: 'Other', estimatedHours: 4, priority: 'Normal', requiredSkills: [] },
];

export const TASK_COLORS: Record<string, string> = {
  Video: 'from-indigo-400 to-purple-500 text-white shadow-purple-200',
  Static: 'from-emerald-400 to-teal-500 text-white shadow-teal-200',
  Code: 'from-blue-400 to-cyan-500 text-white shadow-blue-200',
  Creative: 'from-orange-400 to-amber-500 text-white shadow-orange-200',
  Mixed: 'from-pink-400 to-rose-500 text-white shadow-pink-200',
  Other: 'from-slate-400 to-gray-500 text-white shadow-slate-200',
};

export const TASK_ICONS: Record<string, string> = {
  Video: 'Video',
  Static: 'Image',
  Code: 'Code',
  Creative: 'PenTool',
  Mixed: 'Layers',
  Other: 'Calendar',
};