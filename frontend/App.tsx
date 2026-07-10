import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Pause, Plus, Settings, ChevronLeft, ChevronRight, 
  AlertTriangle, RotateCcw, Undo2, Video, Image as ImageIcon, 
  Code, PenTool, Layers, Calendar, GripVertical, Info, X, Users, Clock, Edit2, Trash2,
  CheckCircle2, ChevronDown, ChevronUp, Download, Upload, Sun, Sunset, Copy, Check, FileText,
  Menu, Sidebar, List, ArrowUpDown, LogOut, Shield, Loader2
} from 'lucide-react';
import { Task, TeamMember, BoardState, FallingTask, TaskType, Priority } from './types';
import { INITIAL_TEAM, INITIAL_TASKS, DEFAULT_HOURS_PER_WEEK, HOURS_PER_DAY, PIXELS_PER_HOUR, TASK_COLORS, TASK_ICONS } from './constants';
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const SUPER_ADMIN = 'itsik.alfon@plus500.com';
const DAY_GAP_PX = 40; // Gap between days in the timeline

// --- Helper Components ---

const IconMap: Record<string, React.ElementType> = {
  Video, Image: ImageIcon, Code, PenTool, Layers, Calendar
};

const TaskBrick = ({ 
  task, 
  isDragging, 
  style, 
  className = '',
  onEdit,
  isSplitTop,
  isSplitBottom,
  segmentHeight
}: { 
  task: Task; 
  isDragging?: boolean; 
  style?: React.CSSProperties;
  className?: string;
  onEdit?: (task: Task) => void;
  isSplitTop?: boolean;
  isSplitBottom?: boolean;
  segmentHeight: number;
}) => {
  const Icon = IconMap[TASK_ICONS[task.type] || 'Calendar'];
  const isCompact = segmentHeight < 45; // Use compact layout for small bricks
  
  // Determine Day View Status
  let dayStatus: 'today' | 'split' | 'later' | 'none' = 'none';
  if (task.startHour !== undefined && task.endHour !== undefined) {
    if (task.endHour <= HOURS_PER_DAY) dayStatus = 'today';
    else if (task.startHour < HOURS_PER_DAY && task.endHour > HOURS_PER_DAY) dayStatus = 'split';
    else dayStatus = 'later';
  }

  let borderClass = '';
  if (dayStatus === 'today') borderClass = 'border-l-4 border-l-yellow-300';
  if (dayStatus === 'split') borderClass = 'border-l-4 border-l-amber-400 border-dashed';

  let splitClasses = '';
  if (isSplitTop) splitClasses += ' rounded-t-none border-t-2 border-dashed border-white/60';
  if (isSplitBottom) splitClasses += ' rounded-b-none border-b-2 border-dashed border-white/60';

  return (
    <div 
      className={`
        relative p-1.5 md:p-2 flex flex-col justify-between overflow-hidden group
        bg-gradient-to-br ${TASK_COLORS[task.type] || TASK_COLORS.Other}
        shadow-md transition-all duration-200 rounded-lg
        ${isDragging ? 'opacity-50 scale-95 cursor-grabbing' : 'cursor-grab hover:brightness-110'}
        ${borderClass}
        ${splitClasses}
        ${className}
      `}
      style={{ 
        height: `${segmentHeight}px`, 
        minHeight: isCompact ? `${segmentHeight}px` : '40px',
        ...style 
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDoubleClick={() => onEdit && onEdit(task)}
      title={isCompact ? `${task.name} (${task.estimatedHours}h)` : undefined}
    >
      {isCompact ? (
        // Compact Layout for small bricks
        <div className="flex items-center justify-between h-full w-full">
          <div className="flex items-center gap-1 overflow-hidden">
            {dayStatus === 'today' && <Sun size={10} className="text-yellow-300 shrink-0" />}
            {dayStatus === 'split' && <Sunset size={10} className="text-amber-300 shrink-0" />}
            <span className="font-semibold text-[10px] leading-tight truncate">{task.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <span className="text-[10px] font-bold opacity-90">{task.estimatedHours}h</span>
          </div>
        </div>
      ) : (
        // Normal Layout
        <>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1 overflow-hidden">
              {dayStatus === 'today' && <Sun size={12} className="text-yellow-300 shrink-0 md:w-3 md:h-3" title="Happening Today" />}
              {dayStatus === 'split' && <Sunset size={12} className="text-amber-300 shrink-0 md:w-3 md:h-3" title="Splits to Tomorrow" />}
              <span className="font-semibold text-[10px] md:text-xs leading-tight line-clamp-2 pr-1">{task.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white md:block hidden"
                >
                  <Edit2 size={12} />
                </button>
              )}
              {task.priority === 'Urgent' && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
            </div>
          </div>
          <div className="flex justify-between items-end mt-0.5 md:mt-1">
            <span className="text-[10px] md:text-xs font-medium opacity-90">{task.estimatedHours}h</span>
            <Icon size={12} className="opacity-75 md:w-3.5 md:h-3.5" />
          </div>
        </>
      )}
      
      <div className="absolute inset-0 rounded-lg border border-white/20 pointer-events-none" />
      
      {/* Mobile edit hint */}
      {!isCompact && (
        <div className="absolute inset-0 hidden group-active:flex md:group-active:hidden items-center justify-center bg-black/20 rounded-lg pointer-events-none">
           <span className="text-white text-[8px] font-bold bg-black/50 px-1.5 py-0.5 rounded">Double tap to edit</span>
        </div>
      )}
    </div>
  );
};

// --- Main App Component (CapacityBoard) ---

interface CapacityBoardProps {
  isAdmin: boolean;
  onSignOut: () => void;
  onToggleAdmin: () => void;
}

function CapacityBoard({ isAdmin, onSignOut, onToggleAdmin }: CapacityBoardProps) {
  // --- State ---
  const [history, setHistory] = useState<BoardState[]>([]);
  const [state, setState] = useState<BoardState>(() => {
    const saved = localStorage.getItem('capacity-physics-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.completed) parsed.completed = [];
        if (parsed.weekOffset === undefined) parsed.weekOffset = 0;
        return parsed;
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }

    const initialCols: Record<string, Task[]> = {};
    INITIAL_TEAM.forEach(m => initialCols[m.id] = []);
    return {
      queue: [...INITIAL_TASKS],
      columns: initialCols,
      overflow: [],
      completed: [],
      score: 0,
      team: [...INITIAL_TEAM],
      globalHoursPerWeek: DEFAULT_HOURS_PER_WEEK,
      weekOffset: 0
    };
  });

  const [isPlayMode, setIsPlayMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false); // Start closed

  const boardScrollRef = useRef<HTMLDivElement>(null);

  // Physics Engine State
  const fallingTasksRef = useRef<FallingTask[]>([]);
  const [, setTick] = useState(0);

  // Refs for game loop
  const stateRef = useRef(state);
  const isPlayModeRef = useRef(isPlayMode);
  const isPausedRef = useRef(isPaused);

  // Scroll to bottom on load
  useEffect(() => {
    if (boardScrollRef.current) {
      boardScrollRef.current.scrollTop = boardScrollRef.current.scrollHeight;
    }
  }, []);

  // Robust Saving
  useEffect(() => { 
    stateRef.current = state; 
    localStorage.setItem('capacity-physics-state', JSON.stringify(state));
    
    // Show brief save indicator
    setSaveIndicator(true);
    const timer = setTimeout(() => setSaveIndicator(false), 1500);
    return () => clearTimeout(timer);
  }, [state]);
  
  useEffect(() => { isPlayModeRef.current = isPlayMode; }, [isPlayMode]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // --- Logic Helpers ---

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev, stateRef.current].slice(-20));
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setState(previousState);
    setHistory(prev => prev.slice(0, -1));
    fallingTasksRef.current = [];
  };

  const handleResetWeek = () => {
    saveHistory();
    setState(prev => {
      const allTasks = [
        ...prev.queue,
        ...prev.overflow,
        ...prev.completed,
        ...Object.values(prev.columns).flat()
      ];
      const emptyCols: Record<string, Task[]> = {};
      prev.team.forEach(m => emptyCols[m.id] = []);
      return { ...prev, queue: allTasks, columns: emptyCols, overflow: [], completed: [], score: 0 };
    });
    fallingTasksRef.current = [];
  };

  const handleSortQueue = (criteria: string) => {
    if (!criteria) return;
    saveHistory();
    setState(prev => {
      const sorted = [...prev.queue].sort((a, b) => {
        if (criteria === 'hours-desc') return b.estimatedHours - a.estimatedHours;
        if (criteria === 'hours-asc') return a.estimatedHours - b.estimatedHours;
        if (criteria === 'priority') {
          const p = { Urgent: 4, High: 3, Normal: 2, Low: 1 };
          return p[b.priority] - p[a.priority];
        }
        if (criteria === 'type') return a.type.localeCompare(b.type);
        return 0;
      });
      return { ...prev, queue: sorted };
    });
  };

  const getWeekString = () => {
    const start = new Date();
    start.setDate(start.getDate() + (state.weekOffset * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const format = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
    return `${format(start)} - ${format(end)}`;
  };

  const generateTextReport = () => {
    let report = `📊 CAPACITY PHYSICS - STATUS REPORT\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    if (state.completed.length > 0) {
      report += `✅ COMPLETED:\n`;
      state.completed.forEach(t => report += `- ${t.name} (${t.estimatedHours}h)\n`);
      report += `\n`;
    }

    report += `🚀 SCHEDULED TASKS:\n`;
    state.team.forEach(m => {
      const tasks = state.columns[m.id] || [];
      if (tasks.length > 0) {
        report += `${m.name}:\n`;
        tasks.forEach(t => {
          report += `  - ${t.name} (${t.estimatedHours}h)\n`;
        });
      }
    });
    report += `\n`;

    if (state.overflow.length > 0) {
      report += `⚠️ OVERFLOW / AT RISK:\n`;
      state.overflow.forEach(t => report += `- ${t.name} (${t.estimatedHours}h)\n`);
      report += `\n`;
    }

    return report;
  };

  const handleDownloadCSV = () => {
    let csv = "Task Name,Type,Hours,Priority,Status,Assignee\n";
    
    state.queue.forEach(t => csv += `"${t.name}",${t.type},${t.estimatedHours},${t.priority},Queued,\n`);
    state.overflow.forEach(t => csv += `"${t.name}",${t.type},${t.estimatedHours},${t.priority},Overflow,\n`);
    state.completed.forEach(t => csv += `"${t.name}",${t.type},${t.estimatedHours},${t.priority},Completed,\n`);
    
    Object.entries(state.columns).forEach(([memberId, tasks]) => {
      const member = state.team.find(m => m.id === memberId);
      const assignee = member ? member.name : 'Unknown';
      tasks.forEach(t => csv += `"${t.name}",${t.type},${t.estimatedHours},${t.priority},Scheduled,"${assignee}"\n`);
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `capacity-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      // Fallback for sandboxed environments
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.error('Fallback: Oops, unable to copy', e);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `capacity-physics-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && parsed.team && parsed.columns) {
          setState(parsed);
          alert("Data imported successfully!");
        } else {
          alert("Invalid data format.");
        }
      } catch (err) {
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
  };

  const calculateColumnHours = (tasks: Task[]) => tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  const processOverflow = (currentState: BoardState): BoardState => {
    const newState = { ...currentState, columns: { ...currentState.columns }, overflow: [...currentState.overflow] };
    
    Object.keys(newState.columns).forEach(colId => {
      const member = newState.team.find(m => m.id === colId);
      const capacity = member ? member.weeklyCapacityHours : newState.globalHoursPerWeek;
      
      let colTasks = [...newState.columns[colId]];
      let totalHours = 0;
      const keptTasks: Task[] = [];
      const overflowedTasks: Task[] = [];

      for (const task of colTasks) {
        if (totalHours + task.estimatedHours <= capacity) {
          keptTasks.push(task);
          totalHours += task.estimatedHours;
        } else {
          overflowedTasks.push(task);
        }
      }

      newState.columns[colId] = keptTasks;
      newState.overflow = [...newState.overflow, ...overflowedTasks];
    });

    return newState;
  };

  // Pure functions for task manipulation
  const findTask = (board: BoardState, taskId: string): Task | undefined => {
    if (board.queue.find(t => t.id === taskId)) return board.queue.find(t => t.id === taskId);
    if (board.overflow.find(t => t.id === taskId)) return board.overflow.find(t => t.id === taskId);
    if (board.completed.find(t => t.id === taskId)) return board.completed.find(t => t.id === taskId);
    for (const col of Object.values(board.columns)) {
      const t = col.find(t => t.id === taskId);
      if (t) return t;
    }
    return undefined;
  };

  const removeTask = (board: BoardState, taskId: string): BoardState => {
    const newState = { ...board, columns: { ...board.columns } };
    newState.queue = newState.queue.filter(t => t.id !== taskId);
    newState.overflow = newState.overflow.filter(t => t.id !== taskId);
    newState.completed = newState.completed.filter(t => t.id !== taskId);
    for (const colId of Object.keys(newState.columns)) {
      newState.columns[colId] = newState.columns[colId].filter(t => t.id !== taskId);
    }
    return newState;
  };

  const updateTaskInState = (board: BoardState, updatedTask: Task): BoardState => {
    const newState = { ...board, columns: { ...board.columns } };
    
    const updateList = (list: Task[]) => list.map(t => t.id === updatedTask.id ? updatedTask : t);
    
    newState.queue = updateList(newState.queue);
    newState.overflow = updateList(newState.overflow);
    newState.completed = updateList(newState.completed);
    for (const colId of Object.keys(newState.columns)) {
      newState.columns[colId] = updateList(newState.columns[colId]);
    }
    return processOverflow(newState);
  };

  // --- Timeline Splitting Logic ---
  const getTaskSegments = (task: Task, startHour: number) => {
    const segments = [];
    let remainingHours = task.estimatedHours;
    let currentStart = startHour;
    let iterations = 0;

    while (remainingHours > 0.01 && iterations < 20) {
      iterations++;
      const dayIndex = Math.floor(currentStart / HOURS_PER_DAY);
      const nextDayHour = (dayIndex + 1) * HOURS_PER_DAY;
      const hoursInThisDay = Math.min(remainingHours, nextDayHour - currentStart);
      
      segments.push({
        ...task,
        segmentId: `${task.id}-${dayIndex}`,
        startHour: currentStart,
        endHour: currentStart + hoursInThisDay,
        dayIndex,
        isSplitBottom: currentStart > startHour + 0.01,
        isSplitTop: remainingHours > hoursInThisDay + 0.01
      });

      currentStart += hoursInThisDay;
      remainingHours -= hoursInThisDay;
    }
    return segments;
  };

  // --- Physics Engine (Game Loop) ---

  const spawnPlayModeTask = useCallback(() => {
    const currentQueue = stateRef.current.queue;
    if (currentQueue.length === 0) {
      setIsPlayMode(false);
      return;
    }
    
    if (fallingTasksRef.current.some(ft => ft.isPlayMode)) return;

    const nextTask = currentQueue[0];
    
    setState(prev => ({ ...prev, queue: prev.queue.slice(1) }));
    
    const middleColId = stateRef.current.team[Math.floor(stateRef.current.team.length / 2)].id;
    
    fallingTasksRef.current.push({
      id: `fall-${Date.now()}`,
      task: nextTask,
      colId: middleColId,
      yHours: stateRef.current.globalHoursPerWeek + 5,
      isPlayMode: true,
      speed: 10
    });
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      let deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      if (deltaTime > 0.1) deltaTime = 0.1;

      if (isPausedRef.current) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      let needsRender = false;
      const currentFalls = fallingTasksRef.current;
      
      if (currentFalls.length > 0) {
        const ongoing: FallingTask[] = [];
        const landed: FallingTask[] = [];

        currentFalls.forEach(ft => {
          const dropAmount = ft.speed * deltaTime;
          const colTasks = stateRef.current.columns[ft.colId] || [];
          const stackHeight = calculateColumnHours(colTasks);
          const landingYTop = stackHeight + ft.task.estimatedHours;

          let newY = ft.yHours - dropAmount;

          if (newY <= landingYTop) {
            landed.push({ ...ft, yHours: landingYTop });
          } else {
            ongoing.push({ ...ft, yHours: newY });
          }
          needsRender = true;
        });

        fallingTasksRef.current = ongoing;

        if (landed.length > 0) {
          setState(prev => {
            const newState = { ...prev, columns: { ...prev.columns } };
            let playModeLanded = false;
            
            landed.forEach(ft => {
              newState.columns[ft.colId] = [...(newState.columns[ft.colId] || []), ft.task];
              if (ft.isPlayMode) {
                newState.score += 10;
                playModeLanded = true;
              }
            });
            
            if (playModeLanded && isPlayModeRef.current) {
              setTimeout(spawnPlayModeTask, 300);
            }
            
            return processOverflow(newState);
          });
        }
      } else if (isPlayModeRef.current && stateRef.current.queue.length > 0) {
        spawnPlayModeTask();
      }

      if (needsRender) {
        setTick(t => t + 1);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [spawnPlayModeTask]);

  // --- Keyboard Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayModeRef.current) return;

      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(p => !p);
        return;
      }

      if (isPausedRef.current) return;

      const activeFalls = fallingTasksRef.current;
      const playTaskIndex = activeFalls.findIndex(ft => ft.isPlayMode);
      if (playTaskIndex === -1) return;

      const ft = activeFalls[playTaskIndex];
      const team = stateRef.current.team;
      const currentTeamIndex = team.findIndex(m => m.id === ft.colId);

      let newFalls = [...activeFalls];

      switch (e.key) {
        case 'ArrowLeft':
          if (currentTeamIndex > 0) {
            newFalls[playTaskIndex] = { ...ft, colId: team[currentTeamIndex - 1].id };
            fallingTasksRef.current = newFalls;
          }
          break;
        case 'ArrowRight':
          if (currentTeamIndex < team.length - 1) {
            newFalls[playTaskIndex] = { ...ft, colId: team[currentTeamIndex + 1].id };
            fallingTasksRef.current = newFalls;
          }
          break;
        case 'ArrowDown':
          newFalls[playTaskIndex] = { ...ft, speed: 40 };
          fallingTasksRef.current = newFalls;
          break;
        case ' ': // Hard drop
          e.preventDefault();
          const colTasks = stateRef.current.columns[ft.colId] || [];
          const stackHeight = calculateColumnHours(colTasks);
          newFalls[playTaskIndex] = { ...ft, yHours: stackHeight + ft.task.estimatedHours };
          fallingTasksRef.current = newFalls;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        const activeFalls = fallingTasksRef.current;
        const playTaskIndex = activeFalls.findIndex(ft => ft.isPlayMode);
        if (playTaskIndex !== -1) {
          let newFalls = [...activeFalls];
          newFalls[playTaskIndex] = { ...newFalls[playTaskIndex], speed: 10 };
          fallingTasksRef.current = newFalls;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Drag and Drop Handlers ---

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropToColumn = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = findTask(stateRef.current, taskId);
    if (!task) return;

    saveHistory();
    setState(prev => removeTask(prev, taskId));

    fallingTasksRef.current.push({
      id: `drop-${Date.now()}-${Math.random()}`,
      task,
      colId,
      yHours: stateRef.current.globalHoursPerWeek + 2,
      isPlayMode: false,
      speed: 60
    });
  };

  const onDropToQueue = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = findTask(stateRef.current, taskId);
    if (!task) return;

    saveHistory();
    setState(prev => {
      const newState = removeTask(prev, taskId);
      return { ...newState, queue: [task, ...newState.queue] };
    });
  };

  const onDropToOverflow = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = findTask(stateRef.current, taskId);
    if (!task) return;

    saveHistory();
    setState(prev => {
      const newState = removeTask(prev, taskId);
      return { ...newState, overflow: [...newState.overflow, task] };
    });
  };

  const onDropToComplete = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = findTask(stateRef.current, taskId);
    if (!task) return;

    saveHistory();
    setState(prev => {
      const newState = removeTask(prev, taskId);
      return { ...newState, completed: [task, ...newState.completed] };
    });
    setIsCompletedExpanded(true);
  };

  // --- Derived Stats ---
  const totalCapacity = state.team.reduce((sum, m) => sum + m.weeklyCapacityHours, 0);
  const totalUsed = Object.values(state.columns).reduce((sum, tasks) => sum + calculateColumnHours(tasks), 0);
  const utilization = Math.round((totalUsed / totalCapacity) * 100) || 0;
  const atRiskCount = state.overflow.length;
  
  const numDays = Math.ceil(state.globalHoursPerWeek / HOURS_PER_DAY);
  const boardHeightPx = state.globalHoursPerWeek * PIXELS_PER_HOUR + (numDays - 1) * DAY_GAP_PX;

  // --- Render Helpers ---
  const renderTimelineAxis = () => {
    const days = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (state.weekOffset * 7));

    for (let d = 0; d < numDays; d++) {
      const dayBottomPx = d * HOURS_PER_DAY * PIXELS_PER_HOUR + d * DAY_GAP_PX;
      const dayHeightPx = Math.min(HOURS_PER_DAY, state.globalHoursPerWeek - d * HOURS_PER_DAY) * PIXELS_PER_HOUR;
      
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + d);
      const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      days.push(
        <div key={`day-${d}`} className="absolute w-full" style={{ bottom: `${dayBottomPx}px`, height: `${dayHeightPx}px` }}>
          {/* Vertical Line */}
          <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>
          
          {/* Start Node (Bottom) */}
          <div className="absolute right-4 bottom-0 w-3 h-3 bg-white border-2 border-blue-400 rounded-full translate-x-[5px] translate-y-1/2 z-10"></div>
          
          {/* End Node (Top) */}
          <div className="absolute right-4 top-0 w-3 h-3 bg-white border-2 border-blue-400 rounded-full translate-x-[5px] -translate-y-1/2 z-10"></div>
          
          {/* Day Label */}
          <div className="absolute right-8 bottom-0 translate-y-1/2 flex flex-col items-end pr-2">
            <span className="text-[10px] md:text-xs font-bold text-slate-700 whitespace-nowrap">Day {d + 1}</span>
            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{dateStr}</span>
          </div>
        </div>
      );
    }
    return days;
  };

  const renderGridLines = () => {
    const lines = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (state.weekOffset * 7));

    for (let d = 0; d < numDays; d++) {
      const dayBottomPx = d * HOURS_PER_DAY * PIXELS_PER_HOUR + d * DAY_GAP_PX;
      const hoursInDay = Math.min(HOURS_PER_DAY, state.globalHoursPerWeek - d * HOURS_PER_DAY);
      
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + d);
      const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      for (let h = 0; h <= hoursInDay; h++) {
        const bottomPx = dayBottomPx + h * PIXELS_PER_HOUR;
        const isDayMark = h === 0;
        
        lines.push(
          <div key={`grid-${d}-${h}`} className={`absolute w-full border-b flex items-end z-0 ${isDayMark ? 'border-blue-300 border-dashed' : 'border-slate-100'}`} style={{ bottom: `${bottomPx}px`, height: '1px' }}>
            {isDayMark && (
              <span className="absolute right-0 text-[9px] md:text-[10px] text-blue-500 font-bold bg-white pl-2 transform translate-y-1/2 flex items-center gap-1 whitespace-nowrap">
                <Sun size={10} /> DAY {d + 1} <span className="text-slate-400 font-normal ml-1">{dateStr}</span>
              </span>
            )}
          </div>
        );
      }
    }
    
    if (state.globalHoursPerWeek % 4 !== 0) {
       const bottomPx = state.globalHoursPerWeek * PIXELS_PER_HOUR + (numDays - 1) * DAY_GAP_PX;
       lines.push(
        <div key="global-cap" className="absolute w-full border-b-2 border-red-400 border-dashed flex items-end z-0" style={{ bottom: `${bottomPx}px`, height: '2px' }}>
          <span className="absolute right-0 text-[10px] md:text-xs text-red-500 font-bold bg-white pl-2 transform translate-y-1/2">CAPACITY LIMIT</span>
        </div>
       );
    } else {
       const bottomPx = state.globalHoursPerWeek * PIXELS_PER_HOUR + (numDays - 1) * DAY_GAP_PX;
       lines.push(
        <div key="global-cap" className="absolute w-full border-b-2 border-red-400 border-dashed flex items-end z-0" style={{ bottom: `${bottomPx}px`, height: '2px' }}>
          <span className="absolute right-0 text-[10px] md:text-xs text-red-500 font-bold bg-white pl-2 transform translate-y-1/2">CAPACITY LIMIT</span>
        </div>
       );
    }

    return lines;
  };

  const renderWeekStrip = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const start = new Date();
    start.setDate(start.getDate() + (state.weekOffset * 7));
    
    return (
      <div className="flex items-center gap-2 md:gap-4 mt-0.5 md:mt-1">
        {days.map((d, i) => {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          const isToday = i === 0 && state.weekOffset === 0; // Highlight today only if current week
          return (
            <div key={d} className={`flex flex-col items-center ${isToday ? 'text-brand-600 font-bold' : 'text-slate-500'}`}>
              <span className="text-[7px] md:text-[10px]">{d}</span>
              <span className="text-[9px] md:text-xs">{date.getDate()}</span>
              {isToday && <div className="w-1 h-1 bg-brand-600 rounded-full mt-0.5"></div>}
            </div>
          )
        })}
      </div>
    )
  };

  // Gather all tasks for the All Tasks Modal
  const allTasksWithStatus = [
    ...state.queue.map(t => ({ ...t, status: 'Queue' })),
    ...state.overflow.map(t => ({ ...t, status: 'Overflow' })),
    ...state.completed.map(t => ({ ...t, status: 'Completed' })),
    ...Object.entries(state.columns).flatMap(([memberId, tasks]) => {
      const member = state.team.find(m => m.id === memberId);
      return tasks.map(t => ({ ...t, status: `Scheduled (${member?.name || 'Unknown'})` }));
    })
  ];

  return (
    <div className="h-[100dvh] flex flex-col font-sans bg-[#f8fafc] overflow-hidden">
      {/* --- Top Navigation --- */}
      <header className="h-10 md:h-12 border-b flex items-center justify-between px-2 md:px-4 shrink-0 z-20 shadow-sm bg-white border-slate-200">
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-1 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <Menu size={16} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center shadow-inner bg-brand-600">
              <Layers className="text-white" size={14} />
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <button onClick={() => setState(p => ({...p, weekOffset: p.weekOffset - 1}))} className="p-0.5 hover:bg-slate-100 rounded text-slate-500">
                  <ChevronLeft size={14} />
                </button>
                <h1 className="font-bold text-xs md:text-sm leading-none text-slate-800 tracking-tight">
                  {getWeekString()}
                </h1>
                <button onClick={() => setState(p => ({...p, weekOffset: p.weekOffset + 1}))} className="p-0.5 hover:bg-slate-100 rounded text-slate-500">
                  <ChevronRight size={14} />
                </button>
                {saveIndicator && <span className="text-[8px] text-emerald-500 font-bold animate-pulse ml-1">✓ Saved</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          
          {/* Mobile Actions (Compact) */}
          <div className="flex md:hidden items-center gap-1">
             <button 
              onClick={() => setIsCreatingTask(true)}
              className="bg-brand-600 text-white p-1 rounded-full shadow-sm"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={() => {
                setIsPlayMode(!isPlayMode);
                if (isPlayMode) {
                  const playTasks = fallingTasksRef.current.filter(ft => ft.isPlayMode);
                  fallingTasksRef.current = fallingTasksRef.current.filter(ft => !ft.isPlayMode);
                  if (playTasks.length > 0) {
                    setState(prev => ({ ...prev, queue: [...playTasks.map(ft => ft.task), ...prev.queue] }));
                  }
                }
              }}
              className={`p-1 rounded-full shadow-sm ${isPlayMode ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {isPlayMode ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"
            >
              <Settings size={16} />
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => setIsCreatingTask(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus size={12} /> NEW TASK
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5 pr-2 border border-slate-200">
              <button 
                onClick={() => {
                  setIsPlayMode(!isPlayMode);
                  if (isPlayMode) {
                    const playTasks = fallingTasksRef.current.filter(ft => ft.isPlayMode);
                    fallingTasksRef.current = fallingTasksRef.current.filter(ft => !ft.isPlayMode);
                    if (playTasks.length > 0) {
                      setState(prev => ({ ...prev, queue: [...playTasks.map(ft => ft.task), ...prev.queue] }));
                    }
                  }
                }}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isPlayMode ? 'bg-brand-500 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm'}`}
              >
                {isPlayMode ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
              </button>
              <span className="text-[9px] font-semibold text-slate-700">PLAY MODE</span>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Team</span>
            <span className="text-[10px] font-semibold text-slate-800">{state.team.length} / {state.team.length}</span>
          </div>
          
          <div className="hidden md:flex flex-col items-center w-20">
            <div className="flex justify-between w-full mb-0.5">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Util</span>
              <span className="text-[9px] font-bold text-brand-600">{utilization}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
            <AlertTriangle size={10} className="text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[6px] font-bold uppercase tracking-wider opacity-80 leading-none">At Risk</span>
              <span className="text-[8px] font-bold leading-none mt-0.5">{atRiskCount} tasks</span>
            </div>
          </div>

          {isAdmin && (
            <button 
              onClick={onToggleAdmin}
              className="hidden md:block text-brand-600 hover:bg-brand-50 transition-colors p-1 rounded-full"
              title="Admin Dashboard"
            >
              <Shield size={14} />
            </button>
          )}

          <button 
            onClick={onSignOut}
            className="hidden md:block text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors p-1 rounded-full"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>

          <button 
            onClick={() => setShowSettingsModal(true)}
            className="hidden md:block text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            title="Settings"
          >
            <Settings size={14} />
          </button>
          
          <button 
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className={`hidden md:flex text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 ${!isRightSidebarOpen ? 'bg-slate-200 text-slate-700' : ''}`}
            title="Toggle Sidebar"
          >
            <Sidebar size={14} />
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 md:p-4 gap-2 md:gap-4 relative">
        
        {/* Mobile Menu Overlay (Queue & Overflow) */}
        {showMobileMenu && (
          <div className="md:hidden absolute inset-0 z-50 bg-white flex flex-col overflow-hidden">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 text-sm">Menu & Tasks</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-1.5 bg-slate-200 rounded-full"><X size={14}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-20">
              
              {/* Mobile Queue */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-700 text-xs">TASK QUEUE</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAllTasksModal(true)} className="p-1 text-slate-400 hover:text-brand-600 bg-slate-100 rounded">
                      <List size={12} />
                    </button>
                    <div className="relative flex items-center group">
                      <select 
                        onChange={(e) => { handleSortQueue(e.target.value); e.target.value = ""; }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      >
                        <option value="" disabled hidden>Sort...</option>
                        <option value="priority">Priority</option>
                        <option value="hours-desc">Hours (High-Low)</option>
                        <option value="hours-asc">Hours (Low-High)</option>
                        <option value="type">Type</option>
                      </select>
                      <button className="p-1 text-slate-400 bg-slate-100 rounded pointer-events-none">
                        <ArrowUpDown size={12} />
                      </button>
                    </div>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{state.queue.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {state.queue.map(task => (
                    <TaskBrick key={task.id} task={task} onEdit={setEditingTask} segmentHeight={task.estimatedHours * PIXELS_PER_HOUR} />
                  ))}
                </div>
              </div>

              {/* Mobile Overflow */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-red-800 text-xs">OVERFLOW</h3>
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{state.overflow.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {state.overflow.map(task => (
                    <TaskBrick key={task.id} task={task} className="opacity-80 grayscale-[30%]" onEdit={setEditingTask} segmentHeight={task.estimatedHours * PIXELS_PER_HOUR} />
                  ))}
                </div>
              </div>

              {/* Mobile Completed */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-emerald-800 text-xs">COMPLETED</h3>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{state.completed.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {state.completed.map(task => (
                    <TaskBrick key={task.id} task={task} className="opacity-60 grayscale-[50%]" onEdit={setEditingTask} segmentHeight={task.estimatedHours * PIXELS_PER_HOUR} />
                  ))}
                </div>
              </div>

              {/* Mobile Admin/Signout */}
              <div className="pt-4 border-t border-slate-200 flex justify-between">
                {isAdmin && (
                  <button onClick={onToggleAdmin} className="flex items-center gap-2 text-brand-600 font-bold text-xs">
                    <Shield size={14} /> Admin Dashboard
                  </button>
                )}
                <button onClick={onSignOut} className="flex items-center gap-2 text-red-600 font-bold text-xs ml-auto">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Left Panel: Task Queue (Desktop) / Top Bar (Mobile) */}
        <div 
          className="w-full md:w-56 h-[100px] md:h-auto flex flex-col bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0"
          onDragOver={onDragOver}
          onDrop={onDropToQueue}
        >
          <div className="p-1.5 md:p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-700 text-[10px] md:text-xs tracking-wide">TASK QUEUE</h2>
              <span className="bg-slate-200 text-slate-600 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full">{state.queue.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowAllTasksModal(true)}
                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                title="All Tasks Manager"
              >
                <List size={14} />
              </button>
              <div className="relative flex items-center group">
                <select 
                  onChange={(e) => {
                    handleSortQueue(e.target.value);
                    e.target.value = "";
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Sort Tasks"
                >
                  <option value="" disabled hidden>Sort...</option>
                  <option value="priority">Priority</option>
                  <option value="hours-desc">Hours (High-Low)</option>
                  <option value="hours-asc">Hours (Low-High)</option>
                  <option value="type">Type</option>
                </select>
                <button className="p-1 text-slate-400 group-hover:text-brand-600 group-hover:bg-brand-50 rounded transition-colors pointer-events-none">
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto p-1.5 md:p-2 gap-1.5 md:gap-2 hide-scrollbar md:custom-scrollbar items-start md:items-stretch">
            {state.queue.map(task => (
              <TaskBrick key={task.id} task={task} onEdit={setEditingTask} className="w-28 md:w-auto shrink-0 md:shrink" segmentHeight={task.estimatedHours * PIXELS_PER_HOUR} />
            ))}
            {state.queue.length === 0 && (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-2 text-center border-2 border-dashed border-slate-200 rounded-lg min-w-[100px] md:min-w-0">
                <GripVertical size={20} className="mb-1 opacity-20" />
                <p className="text-[10px] md:text-xs font-medium">Empty</p>
              </div>
            )}
          </div>
          <div className="hidden md:block p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center font-medium">
            Drag & drop to the board
          </div>
        </div>

        {/* Center Panel: Main Board & Team Cards */}
        <div className="flex-1 flex flex-col relative bg-white rounded-xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] md:min-h-0">
          
          <div className="flex-1 overflow-auto custom-scrollbar relative flex flex-col" ref={boardScrollRef}>
            <div className="flex flex-row flex-1 min-w-max">
              
              {/* Sticky Y-Axis (Timeline) */}
              <div className="sticky left-0 z-30 w-14 md:w-16 bg-white/95 backdrop-blur-sm border-r border-slate-100 shrink-0 flex flex-col">
                <div className="flex-1 flex flex-col justify-end pb-2 md:pb-4 pt-4">
                  <div className="relative w-full" style={{ height: `${boardHeightPx}px` }}>
                    {renderTimelineAxis()}
                  </div>
                </div>
                {/* Spacer for team cards area */}
                <div className="min-h-[70px] md:min-h-[80px] h-auto border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm shrink-0"></div>
              </div>

              {/* Main Content (Grid + Columns + Cards) */}
              <div className="flex-1 flex flex-col">
                
                {/* Board Area */}
                <div className="flex-1 flex flex-col justify-end relative px-1 md:px-2 pb-2 md:pb-4 pt-4">
                  {/* Grid Lines */}
                  <div className="absolute bottom-2 md:bottom-4 left-1 right-1 md:left-2 md:right-2 pointer-events-none z-0">
                    <div className="relative w-full" style={{ height: `${boardHeightPx}px` }}>
                      {renderGridLines()}
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="relative flex gap-1 md:gap-2 z-10">
                    {state.team.map((member, colIndex) => {
                      const colTasks = state.columns[member.id] || [];
                      const usedHours = calculateColumnHours(colTasks);
                      const activeFalls = fallingTasksRef.current.filter(ft => ft.colId === member.id);

                      let currentY = 0;
                      const segmentsToRender: any[] = [];
                      
                      colTasks.forEach(task => {
                        const startHour = currentY;
                        const segments = getTaskSegments(task, startHour);
                        segmentsToRender.push(...segments);
                        currentY += task.estimatedHours;
                      });

                      return (
                        <div 
                          key={member.id} 
                          className="flex-1 min-w-[80px] md:min-w-[100px] relative flex flex-col justify-end group"
                          style={{ height: `${boardHeightPx}px` }}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDropToColumn(e, member.id)}
                        >
                          <div className="absolute inset-0 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border-2 border-dashed border-transparent group-hover:border-slate-200 -z-10" />
                          
                          {member.weeklyCapacityHours !== state.globalHoursPerWeek && (
                            <div className="absolute w-full border-b-2 border-amber-400 border-dotted z-0" style={{ bottom: `${member.weeklyCapacityHours * PIXELS_PER_HOUR}px` }} />
                          )}

                          <div className="relative w-full flex flex-col-reverse gap-0.5 z-10">
                            {segmentsToRender.map((seg) => {
                              const bottomPx = seg.startHour * PIXELS_PER_HOUR + seg.dayIndex * DAY_GAP_PX;
                              const heightPx = (seg.endHour - seg.startHour) * PIXELS_PER_HOUR;
                              
                              return (
                                <div key={seg.segmentId} className="absolute w-full" style={{ bottom: `${bottomPx}px`, height: `${heightPx}px` }}>
                                  <TaskBrick 
                                    task={seg} 
                                    className="w-full" 
                                    onEdit={setEditingTask}
                                    isSplitTop={seg.isSplitTop}
                                    isSplitBottom={seg.isSplitBottom}
                                    segmentHeight={heightPx}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {activeFalls.map(ft => {
                            const startHour = ft.yHours - ft.task.estimatedHours;
                            const segments = getTaskSegments(ft.task, startHour);
                            
                            return segments.map(seg => {
                              const bottomPx = seg.startHour * PIXELS_PER_HOUR + seg.dayIndex * DAY_GAP_PX;
                              const heightPx = (seg.endHour - seg.startHour) * PIXELS_PER_HOUR;
                              
                              return (
                                <div key={seg.segmentId} className="absolute w-full z-20" style={{ bottom: `${bottomPx}px`, height: `${heightPx}px` }}>
                                  <TaskBrick 
                                    task={seg} 
                                    className={`w-full shadow-xl ${ft.isPlayMode ? 'ring-2 ring-brand-400 ring-offset-2' : ''}`} 
                                    isSplitTop={seg.isSplitTop}
                                    isSplitBottom={seg.isSplitBottom}
                                    segmentHeight={heightPx}
                                  />
                                </div>
                              );
                            });
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team Cards */}
                <div className="min-h-[70px] md:min-h-[80px] h-auto bg-slate-50 border-t border-slate-200 p-1.5 md:p-2 flex gap-1 md:gap-2 px-1 md:px-2 z-20 shrink-0">
                  {state.team.map(member => {
                    const usedHours = calculateColumnHours(state.columns[member.id] || []);
                    const isOverloaded = usedHours > member.weeklyCapacityHours;
                    const isAvailable = usedHours < member.weeklyCapacityHours - 4;

                    return (
                      <div key={member.id} className="flex-1 min-w-[80px] md:min-w-[100px] flex flex-col items-center text-center shrink-0 justify-end pb-1">
                        <div className="relative mb-1 shrink-0">
                          <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white shadow-sm object-cover" />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white ${isOverloaded ? 'bg-red-500' : isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-[9px] md:text-[11px] leading-tight px-1 break-words w-full truncate">{member.name}</h3>
                        <p className="text-[7px] md:text-[9px] text-slate-500 font-medium mb-1 px-1 break-words truncate w-full">{member.role}</p>
                        
                        <div className="w-full bg-slate-100 rounded-full h-1 mb-0.5 overflow-hidden shrink-0 mt-auto">
                          <div 
                            className={`h-full rounded-full ${isOverloaded ? 'bg-red-500' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min(100, (usedHours / member.weeklyCapacityHours) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-[8px] md:text-[10px] font-bold shrink-0 ${isOverloaded ? 'text-red-600' : 'text-slate-600'}`}>
                          {usedHours} / {member.weeklyCapacityHours}h
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>

          {/* Bottom Action Bar (Desktop) */}
          <div className="hidden md:flex justify-between items-center p-1.5 md:px-4 bg-white border-t border-slate-200 shrink-0 z-20 h-10">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 text-amber-700 w-7 h-7 rounded-full flex items-center justify-center shadow-sm">
                <span className="font-bold text-sm">🏆</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Score</p>
                <p className="font-bold text-base leading-none text-slate-800">{state.score}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <FileText size={12} /> Export
              </button>
              <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Undo2 size={12} /> Undo
              </button>
              <button 
                onClick={handleResetWeek}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Play Mode Overlay Instructions */}
          {isPlayMode && (
            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/90 backdrop-blur p-2 md:p-3 rounded-xl shadow-lg border border-slate-200 text-[10px] md:text-xs z-40">
              <h3 className="font-bold text-slate-800 mb-1.5 tracking-wider">HOW TO PLAY</h3>
              <ul className="space-y-1 text-slate-600">
                <li className="flex items-center gap-1.5"><kbd className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 font-mono">←</kbd> <kbd className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 font-mono">→</kbd> Move</li>
                <li className="flex items-center gap-1.5"><kbd className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 font-mono">↓</kbd> Soft drop</li>
                <li className="flex items-center gap-1.5"><kbd className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 font-mono">SPACE</kbd> Hard drop</li>
                <li className="flex items-center gap-1.5"><kbd className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 font-mono">P</kbd> Pause</li>
              </ul>
              {isPaused && (
                <div className="mt-2 text-center font-bold text-brand-600 animate-pulse">PAUSED</div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Overflow, Insights & Completed (Desktop) */}
        {isRightSidebarOpen && (
          <div className="hidden md:flex w-64 flex-col gap-4 shrink-0">
            
            {/* Overflow Panel */}
            <div 
              className="flex-1 bg-red-50/50 rounded-2xl border border-red-100 shadow-sm flex flex-col overflow-hidden"
              onDragOver={onDragOver}
              onDrop={onDropToOverflow}
            >
              <div className="p-3 border-b border-red-100 flex justify-between items-center bg-white/50">
                <div>
                  <h2 className="font-bold text-red-800 text-xs tracking-wide">OVERFLOW</h2>
                  <p className="text-[9px] text-red-600 font-medium uppercase">(NEXT WEEK)</p>
                </div>
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{state.overflow.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {state.overflow.map(task => (
                  <div key={task.id} className="relative group">
                    <TaskBrick task={task} className="opacity-80 grayscale-[30%]" onEdit={setEditingTask} segmentHeight={task.estimatedHours * PIXELS_PER_HOUR} />
                    <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm pointer-events-none">
                      <p className="text-[10px] font-semibold text-red-700 text-center px-2">
                        Pushed out due to capacity limits.
                      </p>
                    </div>
                  </div>
                ))}
                {state.overflow.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-red-300 p-4 text-center">
                    <AlertTriangle size={24} className="mb-2 opacity-50" />
                    <p className="text-xs font-medium">No overflow</p>
                  </div>
                )}
              </div>
            </div>

            {/* Insights Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 shrink-0">
              <h2 className="font-bold text-slate-700 text-xs tracking-wide mb-2">INSIGHTS</h2>
              <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {state.team.map(m => {
                  const used = calculateColumnHours(state.columns[m.id] || []);
                  if (used > m.weeklyCapacityHours) {
                    return (
                      <li key={m.id} className="flex items-start gap-1.5 text-[10px] text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-100">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        <span><strong>{m.name}</strong> is overloaded by {used - m.weeklyCapacityHours}h.</span>
                      </li>
                    );
                  }
                  if (used < m.weeklyCapacityHours - 8) {
                    return (
                      <li key={m.id} className="flex items-start gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span><strong>{m.name}</strong> has {m.weeklyCapacityHours - used}h available.</span>
                      </li>
                    );
                  }
                  return null;
                })}
                {state.overflow.length > 0 && (
                  <li className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>{state.overflow.length} tasks pushed to next week.</span>
                  </li>
                )}
                {state.team.every(m => calculateColumnHours(state.columns[m.id] || []) <= m.weeklyCapacityHours) && state.overflow.length === 0 && (
                  <li className="text-[10px] text-slate-500 italic text-center py-1">
                    Capacity looks balanced.
                  </li>
                )}
              </ul>
            </div>

            {/* Completed Panel */}
            <div 
              className="bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm flex flex-col overflow-hidden shrink-0 transition-all duration-300"
              style={{ maxHeight: isCompletedExpanded ? '250px' : '45px' }}
              onDragOver={onDragOver}
              onDrop={onDropToComplete}
            >
              <div 
                className="p-3 border-b border-emerald-100 flex justify-between items-center bg-white/50 cursor-pointer hover:bg-emerald-50 transition-colors"
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <h2 className="font-bold text-emerald-800 text-xs tracking-wide">COMPLETED</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{state.completed.length}</span>
                  {isCompletedExpanded ? <ChevronDown size={14} className="text-emerald-600"/> : <ChevronUp size={14} className="text-emerald-600"/>}
                </div>
              </div>
              {isCompletedExpanded && (
                <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-1">
                  {state.completed.map(task => (
                    <TaskBrick key={task.id} task={task} className="opacity-60 grayscale-[50%]" onEdit={setEditingTask} segmentHeight={task.estimatedHours * PIXELS_PER_HOUR} />
                  ))}
                  {state.completed.length === 0 && (
                    <div className="text-center text-emerald-400 text-[10px] py-3 border-2 border-dashed border-emerald-200 rounded-lg m-1">
                      Drop completed tasks here
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Mobile Bottom Action Bar */}
      <div className="md:hidden grid grid-cols-3 w-full bg-white border-t border-slate-200 shrink-0 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] h-12">
         <button onClick={handleUndo} disabled={history.length === 0} className="flex flex-col items-center justify-center text-slate-500 disabled:opacity-30 active:bg-slate-50">
            <Undo2 size={16} />
            <span className="text-[8px] mt-0.5 font-medium">Undo</span>
         </button>
         <button onClick={handleResetWeek} className="flex flex-col items-center justify-center text-slate-500 active:bg-slate-50">
            <RotateCcw size={16} />
            <span className="text-[8px] mt-0.5 font-medium">Reset</span>
         </button>
         <button onClick={() => setShowExportModal(true)} className="flex flex-col items-center justify-center text-slate-500 active:bg-slate-50">
            <FileText size={16} />
            <span className="text-[8px] mt-0.5 font-medium">Export</span>
         </button>
      </div>

      {/* --- Task Modal (Create & Edit) --- */}
      {(isCreatingTask || editingTask) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">{editingTask ? 'Edit Task Brick' : 'Create New Task Brick'}</h2>
              <button onClick={() => { setIsCreatingTask(false); setEditingTask(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const taskData: Task = {
                  id: editingTask ? editingTask.id : `t-new-${Date.now()}`,
                  name: formData.get('name') as string,
                  type: formData.get('type') as TaskType,
                  estimatedHours: Number(formData.get('hours')),
                  priority: formData.get('priority') as Priority,
                  requiredSkills: [formData.get('type') as string]
                };
                
                saveHistory();
                if (editingTask) {
                  setState(prev => updateTaskInState(prev, taskData));
                } else {
                  setState(prev => ({ ...prev, queue: [taskData, ...prev.queue] }));
                }
                
                setIsCreatingTask(false);
                setEditingTask(null);
              }}
              className="p-4 md:p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Name</label>
                <input name="name" required type="text" defaultValue={editingTask?.name || ''} placeholder="e.g. Summer Campaign Video" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select name="type" defaultValue={editingTask?.type || 'Video'} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="Video">Video</option>
                    <option value="Static">Static Design</option>
                    <option value="Code">Code / Web</option>
                    <option value="Creative">Creative</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hours</label>
                  <input name="hours" required type="number" min="1" max="40" defaultValue={editingTask?.estimatedHours || 8} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                <select name="priority" defaultValue={editingTask?.priority || 'Normal'} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                {editingTask && (
                  <button 
                    type="button"
                    onClick={() => {
                      saveHistory();
                      setState(prev => removeTask(prev, editingTask.id));
                      setEditingTask(null);
                    }}
                    className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors">
                  {editingTask ? 'Save Changes' : 'Drop into Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- All Tasks Modal --- */}
      {showAllTasksModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <List className="text-slate-500" size={20} />
                <h2 className="font-bold text-slate-800">All Tasks Manager</h2>
              </div>
              <button onClick={() => setShowAllTasksModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Name</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Status</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Type</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Hours</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Priority</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allTasksWithStatus.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-sm font-semibold text-slate-800">{task.name}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            task.status === 'Queue' ? 'bg-slate-100 text-slate-600' :
                            task.status === 'Overflow' ? 'bg-red-100 text-red-700' :
                            task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-600">{task.type}</td>
                        <td className="p-3 text-sm font-medium text-slate-700">{task.estimatedHours}h</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            task.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                            task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                            task.priority === 'Normal' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditingTask(task)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => {
                              if(window.confirm('Delete this task?')) {
                                saveHistory();
                                setState(prev => removeTask(prev, task.id));
                              }
                            }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allTasksWithStatus.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">No tasks found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Export Modal --- */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="text-slate-500" size={20} />
                <h2 className="font-bold text-slate-800">Export Status Report</h2>
              </div>
              <button onClick={() => { setShowExportModal(false); setCopied(false); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
              <textarea 
                readOnly 
                value={generateTextReport()}
                className="w-full h-48 md:h-64 p-3 md:p-4 text-xs md:text-sm font-mono text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none resize-none"
              />
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex flex-col md:flex-row justify-between items-center gap-3">
              <button 
                onClick={handleDownloadCSV}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-slate-600 hover:text-brand-600 font-semibold py-2 px-4 rounded-xl transition-colors hover:bg-brand-50 border border-slate-200 md:border-none"
              >
                <Download size={18} /> Download CSV
              </button>
              <div className="flex w-full md:w-auto gap-3">
                <button 
                  onClick={() => {
                    copyToClipboard(generateTextReport());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 md:px-6 rounded-xl transition-colors"
                >
                  {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 md:px-6 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Settings Modal --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="text-slate-500" size={20} />
                <h2 className="font-bold text-slate-800">Dashboard Settings</h2>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={16} /> Global Settings</h3>
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                  <div>
                    <p className="font-semibold text-slate-700">Default Weekly Capacity</p>
                    <p className="text-xs text-slate-500">The standard hours per week for the board scale.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={state.globalHoursPerWeek}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0) setState(prev => ({ ...prev, globalHoursPerWeek: val }));
                      }}
                      className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-slate-500 font-medium">hrs</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users size={16} /> Team Management</h3>
                  <button 
                    onClick={() => {
                      const newMember: TeamMember = {
                        id: `m-${Date.now()}`,
                        name: 'New Member',
                        role: 'Role',
                        skills: [],
                        weeklyCapacityHours: state.globalHoursPerWeek,
                        avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`
                      };
                      setState(prev => ({
                        ...prev,
                        team: [...prev.team, newMember],
                        columns: { ...prev.columns, [newMember.id]: [] }
                      }));
                    }}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-lg"
                  >
                    <Plus size={14} /> Add Member
                  </button>
                </div>
                <div className="space-y-3">
                  {state.team.map(member => (
                    <div key={member.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      
                      <div className="flex items-center gap-4">
                        <label className="relative group cursor-pointer block w-12 h-12 shrink-0" title="Upload Avatar">
                          <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload size={16} className="text-white" />
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setState(prev => ({
                                    ...prev,
                                    team: prev.team.map(m => m.id === member.id ? { ...m, avatarUrl: reader.result as string } : m)
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                        </label>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Remove ${member.name}? Their tasks will be moved to the queue.`)) {
                              setState(prev => {
                                const tasksToRequeue = prev.columns[member.id] || [];
                                const newColumns = { ...prev.columns };
                                delete newColumns[member.id];
                                return {
                                  ...prev,
                                  team: prev.team.filter(m => m.id !== member.id),
                                  columns: newColumns,
                                  queue: [...tasksToRequeue, ...prev.queue]
                                };
                              });
                            }
                          }}
                          className="md:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
                          <input 
                            type="text" 
                            value={member.name}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                team: prev.team.map(m => m.id === member.id ? { ...m, name: e.target.value } : m)
                              }));
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Role</label>
                          <input 
                            type="text" 
                            value={member.role}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                team: prev.team.map(m => m.id === member.id ? { ...m, role: e.target.value } : m)
                              }));
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-24 shrink-0 flex items-center justify-between md:block">
                        <label className="md:block text-[10px] font-bold text-slate-400 uppercase mb-1">Capacity</label>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={member.weeklyCapacityHours}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val >= 0) {
                                setState(prev => {
                                  const newTeam = prev.team.map(m => m.id === member.id ? { ...m, weeklyCapacityHours: val } : m);
                                  return processOverflow({ ...prev, team: newTeam });
                                });
                              }
                            }}
                            className="w-20 md:w-full border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <span className="text-slate-500 text-xs">h</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (window.confirm(`Remove ${member.name}? Their tasks will be moved to the queue.`)) {
                            setState(prev => {
                              const tasksToRequeue = prev.columns[member.id] || [];
                              const newColumns = { ...prev.columns };
                              delete newColumns[member.id];
                              return {
                                ...prev,
                                team: prev.team.filter(m => m.id !== member.id),
                                columns: newColumns,
                                queue: [...tasksToRequeue, ...prev.queue]
                              };
                            });
                          }
                        }}
                        className="hidden md:block p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-4"
                        title="Remove Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Download size={16} /> Backup & Restore</h3>
                  <p className="text-xs text-slate-500 mb-3">If your environment resets on code updates, use these to save and load your board state.</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleExportData}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Export Backup
                    </button>
                    <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Upload size={14} /> Import Backup
                      <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                    </label>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all data and reset to defaults? This cannot be undone.")) {
                        localStorage.removeItem('capacity-physics-state');
                        window.location.reload();
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-2"
                  >
                    <AlertTriangle size={16} /> Clear All Data & Reset to Defaults
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-full md:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 md:py-2 px-6 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SetupScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Firebase Setup Required</h1>
        <p className="text-slate-600 mb-6 text-sm">
          To enable authentication and database features, please update the <code className="bg-slate-100 px-1 py-0.5 rounded text-brand-600">firebaseConfig</code> object in <code className="bg-slate-100 px-1 py-0.5 rounded text-brand-600">firebase.ts</code> with your actual Firebase project credentials.
        </p>
        <p className="text-xs text-slate-500 mt-4">
          Note: Ensure your Firestore database has a collection named <code className="bg-slate-100 px-1 rounded">allowed_users</code> and appropriate security rules.
        </p>
      </div>
    </div>
  );
}

function LoginScreen({ onSignIn, error }: { onSignIn: () => void, error: string }) {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Layers className="text-white" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Capacity Physics</h1>
        <p className="text-slate-500 mb-8 text-sm">Sign in to access the studio simulator.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Authentication Error</p>
                <p>{error}</p>
              </div>
            </div>
            {window !== window.top && error.includes('API key') && (
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-3 block w-full text-center bg-red-100 hover:bg-red-200 text-red-800 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Open App in New Tab
              </a>
            )}
          </div>
        )}

        <button 
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function AccessDeniedScreen({ onSignOut, email }: { onSignOut: () => void, email: string }) {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-red-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6 text-sm">
          The account <strong>{email}</strong> has not been invited to use this application.
        </p>
        <button 
          onClick={onSignOut}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<{id: string, email: string}[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const isProd = window.location.hostname === 'genai-app-capacityphysics-1-1783586859947-912950288864.us-central1.run.app';

  const fetchUsers = async () => {
    setLoading(true);
    if (!isProd) {
      setUsers([{ id: 'mock-1', email: 'test.user@example.com' }]);
      setLoading(false);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'allowed_users'));
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, email: doc.data().email }));
      setUsers(fetched);
    } catch (err) {
      console.error("Error fetching users", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    if (!isProd) {
      setUsers(prev => [...prev, { id: Date.now().toString(), email: newEmail.toLowerCase().trim() }]);
      setNewEmail('');
      return;
    }
    try {
      await addDoc(collection(db, 'allowed_users'), { email: newEmail.toLowerCase().trim() });
      setNewEmail('');
      fetchUsers();
    } catch (err) {
      console.error("Error adding user", err);
      alert("Failed to add user. Check permissions.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this user?')) return;
    if (!isProd) {
      setUsers(prev => prev.filter(u => u.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'allowed_users', id));
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user", err);
      alert("Failed to delete user.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <ChevronLeft size={20} /> Back to Board
        </button>
        <div className="mx-auto flex items-center gap-2">
          <Shield className="text-brand-600" size={20} />
          <h1 className="font-bold text-lg text-slate-800">Admin Dashboard</h1>
        </div>
        <div className="w-24"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Invite User</h2>
            <form onSubmit={handleAdd} className="flex gap-3">
              <input 
                type="email" 
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter Google email address..." 
                className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2">
                <Plus size={18} /> Invite
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Allowed Users</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{users.length} Users</span>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto" size={24} /></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Email Address</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Always show super admin */}
                  <tr className="bg-brand-50/50">
                    <td className="p-4 text-sm font-semibold text-slate-800 flex items-center gap-2">
                      {SUPER_ADMIN} <span className="bg-brand-100 text-brand-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Super Admin</span>
                    </td>
                    <td className="p-4 text-sm text-right text-slate-400 italic">Cannot be removed</td>
                  </tr>
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-700">{u.email}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Access"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-8 text-center text-slate-500">No invited users yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export function AppWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [authError, setAuthError] = useState('');

  const isProd = window.location.hostname === 'genai-app-capacityphysics-1-1783586859947-912950288864.us-central1.run.app';

  useEffect(() => {
    if (!isProd) {
      // Bypass auth in sandbox/dev
      setUser({ email: SUPER_ADMIN, uid: 'dev-mock-user', displayName: 'Dev Admin' } as User);
      setIsAllowed(true);
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.email === SUPER_ADMIN) {
          setIsAllowed(true);
          setIsAdmin(true);
        } else {
          try {
            const q = query(collection(db, 'allowed_users'), where('email', '==', currentUser.email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              setIsAllowed(true);
            } else {
              setIsAllowed(false);
            }
          } catch (err) {
            console.error("Error checking permissions", err);
            setAuthError("Failed to verify permissions. Check database rules.");
            setIsAllowed(false);
          }
        }
      } else {
        setUser(null);
        setIsAllowed(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isProd]);

  const handleSignIn = async () => {
    if (!isProd) return;
    try {
      setAuthError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        if (window !== window.top) {
          setAuthError("Sandbox iframe blocked the API key. Please open the app in a new tab/window to sign in.");
        } else {
          setAuthError("API key is not valid. Please check your Firebase configuration.");
        }
      } else {
        setAuthError(err.message);
      }
    }
  };

  const handleSignOut = async () => {
    if (!isProd) {
      alert("Sign out is disabled in preview mode.");
      return;
    }
    await signOut(auth);
  };

  if (!isFirebaseConfigured && isProd) return <SetupScreen />;
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-brand-600" size={48} /></div>;
  if (!user) return <LoginScreen onSignIn={handleSignIn} error={authError} />;
  if (user && !isAllowed) return <AccessDeniedScreen onSignOut={handleSignOut} email={user.email || ''} />;
  if (showAdmin && isAdmin) return <AdminDashboard onBack={() => setShowAdmin(false)} />;

  return <CapacityBoard isAdmin={isAdmin} onSignOut={handleSignOut} onToggleAdmin={() => setShowAdmin(true)} />;
}
