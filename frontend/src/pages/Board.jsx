import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Calendar, X } from 'lucide-react';
import { api } from '../api/client';
import { format, isPast, parseISO } from 'date-fns';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-brand-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' },
];

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

export default function Board() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = useCallback(async () => {
    try {
      const [projs, mems] = await Promise.all([api.getProjects(), api.getMembers()]);
      setProjects(projs);
      setMembers(mems);
      const pid = projectId || (projs[0]?.id ?? '');
      setSelectedProject(pid);
      if (pid) {
        const t = await api.getTasks({ project_id: pid });
        setTasks(t);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleProjectChange = (id) => {
    setSelectedProject(id);
    navigate(id ? `/board/${id}` : '/board');
  };

  const getColumnTasks = (status) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const handleDragStart = (event) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target status
    let newStatus = task.status;
    // over.id could be a column id or another task id
    const overIsColumn = COLUMNS.some((c) => c.id === over.id);
    if (overIsColumn) {
      newStatus = over.id;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) newStatus = overTask.status;
    }

    if (newStatus === task.status && active.id === over.id) return;

    // Optimistic update
    const columnTasks = getColumnTasks(newStatus).filter((t) => t.id !== taskId);
    let newPosition = 0;
    if (!overIsColumn) {
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);
      newPosition = overIndex >= 0 ? overIndex : columnTasks.length;
    } else {
      newPosition = columnTasks.length;
    }

    // Rebuild positions for the target column
    const updated = tasks.map((t) => {
      if (t.id === taskId) return { ...t, status: newStatus, position: newPosition };
      return t;
    });

    // Recalculate positions in target column
    const targetTasks = updated
      .filter((t) => t.status === newStatus)
      .sort((a, b) => {
        if (a.id === taskId) return newPosition - 0.5; // place at newPosition
        return a.position - b.position;
      });

    const finalUpdates = targetTasks.map((t, i) => ({
      id: t.id,
      status: newStatus,
      position: i,
    }));

    setTasks((prev) => {
      const map = Object.fromEntries(finalUpdates.map((u) => [u.id, u]));
      return prev.map((t) => (map[t.id] ? { ...t, ...map[t.id] } : t));
    });

    try {
      await api.reorderTasks(finalUpdates);
    } catch (e) {
      console.error(e);
      load(); // revert on error
    }
  };

  const handleSaveTask = async (data) => {
    try {
      if (editTask) {
        await api.updateTask(editTask.id, data);
      } else {
        await api.createTask({ ...data, project_id: selectedProject });
      }
      setShowModal(false);
      setEditTask(null);
      const t = await api.getTasks({ project_id: selectedProject });
      setTasks(t);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
          <p className="text-slate-500 mt-1">Drag tasks between columns</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto min-w-[200px]"
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditTask(null);
                setShowModal(true);
              }}
            >
              <Plus size={18} /> Add Task
            </button>
          )}
        </div>
      </div>

      {!selectedProject ? (
        <div className="card p-16 text-center text-slate-400">
          Select a project to view its board
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map((col) => {
              const colTasks = getColumnTasks(col.id);
              return (
                <Column
                  key={col.id}
                  column={col}
                  tasks={colTasks}
                  onEdit={(t) => {
                    setEditTask(t);
                    setShowModal(true);
                  }}
                  onDelete={handleDeleteTask}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {showModal && (
        <TaskModal
          task={editTask}
          members={members}
          onSave={handleSaveTask}
          onClose={() => {
            setShowModal(false);
            setEditTask(null);
          }}
        />
      )}
    </div>
  );
}

function Column({ column, tasks, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-100/70 rounded-xl p-3 min-h-[420px] flex flex-col transition-colors ${
        isOver ? 'ring-2 ring-brand-400 bg-brand-50/40' : ''
      }`}
    >
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
        <h3 className="font-semibold text-slate-700 text-sm">{column.title}</h3>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-white rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5">
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTask({ task, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} dragListeners={listeners} />
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, dragListeners, isDragging }) {
  const overdue =
    task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow transition-shadow cursor-pointer ${
        isDragging ? 'shadow-lg rotate-1' : ''
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
          {...(dragListeners || {})}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`badge border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
              {task.priority}
            </span>
            {task.due_date && (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  overdue ? 'text-red-500 font-medium' : 'text-slate-400'
                }`}
              >
                <Calendar size={11} />
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
          </div>
          {task.assignee_name && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: task.assignee_color || '#6366F1' }}
              >
                {task.assignee_name.charAt(0)}
              </div>
              <span className="text-xs text-slate-500">{task.assignee_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, members, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Task title"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Assignee</label>
            <select
              className="input"
              value={form.assignee_id}
              onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
