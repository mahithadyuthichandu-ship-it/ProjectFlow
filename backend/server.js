const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Helpers ───────────────────────────────────────────────
function logActivity(type, message, entityId = null, entityType = null) {
  db.prepare(
    'INSERT INTO activity (id, type, message, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), type, message, entityId, entityType);
}

// ─── Dashboard Stats ───────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const totalProjects = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'active'").get().c;
  const totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  const todo = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'todo'").get().c;
  const inProgress = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'").get().c;
  const done = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get().c;
  const overdue = db
    .prepare("SELECT COUNT(*) as c FROM tasks WHERE due_date < date('now') AND status != 'done'")
    .get().c;
  const totalMembers = db.prepare('SELECT COUNT(*) as c FROM members').get().c;

  const byPriority = db
    .prepare(
      `SELECT priority, COUNT(*) as count FROM tasks WHERE status != 'done' GROUP BY priority`
    )
    .all();

  const tasksByProject = db
    .prepare(
      `SELECT p.name, p.color,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
        COUNT(t.id) as total
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.status = 'active'
       GROUP BY p.id`
    )
    .all();

  const recentActivity = db
    .prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 10')
    .all();

  res.json({
    totalProjects,
    totalTasks,
    todo,
    inProgress,
    done,
    overdue,
    totalMembers,
    byPriority,
    tasksByProject,
    recentActivity,
    completionRate: totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0,
  });
});

// ─── Projects ──────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  const projects = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count
       FROM projects p
       ORDER BY p.created_at DESC`
    )
    .all();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const { name, description, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  db.prepare(
    'INSERT INTO projects (id, name, description, color) VALUES (?, ?, ?, ?)'
  ).run(id, name.trim(), description || '', color || '#6366F1');
  logActivity('project_created', `Project "${name}" created`, id, 'project');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const { name, description, color, status } = req.body;
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  db.prepare(
    `UPDATE projects SET name = ?, description = ?, color = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    color ?? existing.color,
    status ?? existing.status,
    req.params.id
  );
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  logActivity('project_deleted', `Project "${existing.name}" deleted`, req.params.id, 'project');
  res.json({ success: true });
});

// ─── Tasks ─────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  const { project_id, status } = req.query;
  let sql = `
    SELECT t.*, m.name as assignee_name, m.avatar_color as assignee_color, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN members m ON m.id = t.assignee_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE 1=1
  `;
  const params = [];
  if (project_id) {
    sql += ' AND t.project_id = ?';
    params.push(project_id);
  }
  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY t.position ASC, t.created_at DESC';
  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db
    .prepare(
      `SELECT t.*, m.name as assignee_name, m.avatar_color as assignee_color
       FROM tasks t LEFT JOIN members m ON m.id = t.assignee_id WHERE t.id = ?`
    )
    .get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const { project_id, title, description, status, priority, assignee_id, due_date, tags } = req.body;
  if (!project_id || !title?.trim()) {
    return res.status(400).json({ error: 'project_id and title are required' });
  }
  const id = uuidv4();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), 0) as m FROM tasks WHERE project_id = ? AND status = ?')
    .get(project_id, status || 'todo').m;

  db.prepare(
    `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, due_date, tags, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    project_id,
    title.trim(),
    description || '',
    status || 'todo',
    priority || 'medium',
    assignee_id || null,
    due_date || null,
    JSON.stringify(tags || []),
    maxPos + 1
  );
  logActivity('task_created', `Task "${title}" created`, id, 'task');
  const task = db
    .prepare(
      `SELECT t.*, m.name as assignee_name, m.avatar_color as assignee_color
       FROM tasks t LEFT JOIN members m ON m.id = t.assignee_id WHERE t.id = ?`
    )
    .get(id);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const {
    title,
    description,
    status,
    priority,
    assignee_id,
    due_date,
    tags,
    position,
  } = req.body;

  const newStatus = status ?? existing.status;
  if (status && status !== existing.status) {
    logActivity(
      status === 'done' ? 'task_completed' : 'task_updated',
      status === 'done'
        ? `Task "${existing.title}" completed`
        : `Task "${existing.title}" moved to ${status.replace('_', ' ')}`,
      req.params.id,
      'task'
    );
  }

  db.prepare(
    `UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      assignee_id = ?, due_date = ?, tags = ?, position = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title ?? existing.title,
    description ?? existing.description,
    newStatus,
    priority ?? existing.priority,
    assignee_id !== undefined ? assignee_id : existing.assignee_id,
    due_date !== undefined ? due_date : existing.due_date,
    tags ? JSON.stringify(tags) : existing.tags,
    position ?? existing.position,
    req.params.id
  );

  const task = db
    .prepare(
      `SELECT t.*, m.name as assignee_name, m.avatar_color as assignee_color
       FROM tasks t LEFT JOIN members m ON m.id = t.assignee_id WHERE t.id = ?`
    )
    .get(req.params.id);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  logActivity('task_deleted', `Task "${existing.title}" deleted`, req.params.id, 'task');
  res.json({ success: true });
});

// Batch reorder / status update for Kanban
app.post('/api/tasks/reorder', (req, res) => {
  const { updates } = req.body; // [{ id, status, position }]
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });

  const updateStmt = db.prepare(
    'UPDATE tasks SET status = ?, position = ?, updated_at = datetime(\'now\') WHERE id = ?'
  );
  const tx = db.transaction((items) => {
    for (const item of items) {
      updateStmt.run(item.status, item.position, item.id);
    }
  });
  tx(updates);
  res.json({ success: true });
});

// ─── Members ───────────────────────────────────────────────
app.get('/api/members', (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY name').all();
  res.json(members);
});

app.post('/api/members', (req, res) => {
  const { name, email, avatar_color, role } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  db.prepare(
    'INSERT INTO members (id, name, email, avatar_color, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), email || '', avatar_color || '#6366F1', role || 'member');
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.status(201).json(member);
});

// ─── Activity ──────────────────────────────────────────────
app.get('/api/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const activity = db
    .prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT ?')
    .all(limit);
  res.json(activity);
});

app.listen(PORT, () => {
  console.log(`🚀 Project Dashboard API running on http://localhost:${PORT}`);
});
