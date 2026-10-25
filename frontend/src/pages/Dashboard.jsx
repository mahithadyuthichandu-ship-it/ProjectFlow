import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

const STATUS_COLORS = ['#94A3B8', '#6366F1', '#22C55E'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-slate-500 py-20">Failed to load stats</div>;
  }

  const statusData = [
    { name: 'To Do', value: stats.todo },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Done', value: stats.done },
  ];

  const priorityData = (stats.byPriority || []).map((p) => ({
    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
    count: p.count,
    fill: PRIORITY_COLORS[p.priority] || '#94A3B8',
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your projects and tasks</p>
        </div>
        <Link to="/board" className="btn-primary">
          Open Board <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Active Projects"
          value={stats.totalProjects}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Tasks"
          value={stats.done}
          sub={`${stats.completionRate}% done`}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats.inProgress}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task status pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Tasks by Status</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {statusData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: STATUS_COLORS[i] }}
                />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>

        {/* Priority bar */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Open Tasks by Priority</h3>
          <div className="h-52">
            {priorityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No open tasks
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} barSize={36}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project progress */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Project Progress</h3>
          <div className="space-y-4">
            {(stats.tasksByProject || []).map((p) => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700 truncate">{p.name}</span>
                    <span className="text-slate-500">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: p.color || '#6366F1' }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {p.done}/{p.total} tasks
                  </div>
                </div>
              );
            })}
            {(!stats.tasksByProject || stats.tasksByProject.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-8">No projects yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Activity</h3>
            <TrendingUp size={16} className="text-slate-400" />
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {(stats.recentActivity || []).map((a) => (
              <div key={a.id} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(a.created_at + 'Z'), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {(!stats.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Quick Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Users size={14} /> Team Members
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalMembers}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <CheckCircle2 size={14} /> Total Tasks
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalTasks}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Clock size={14} /> To Do
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.todo}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp size={14} /> Completion
              </div>
              <div className="text-2xl font-bold text-brand-600">{stats.completionRate}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
