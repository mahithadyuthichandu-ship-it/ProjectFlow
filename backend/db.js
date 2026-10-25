const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'project_dashboard.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366F1',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    avatar_color TEXT DEFAULT '#6366F1',
    role TEXT DEFAULT 'member',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    assignee_id TEXT,
    due_date TEXT,
    tags TEXT DEFAULT '[]',
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES members(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_id TEXT,
    entity_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed data if empty
const projectCount = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
if (projectCount === 0) {
  const members = [
    { id: uuidv4(), name: 'Alex Rivera', email: 'alex@team.com', avatar_color: '#6366F1', role: 'admin' },
    { id: uuidv4(), name: 'Sam Chen', email: 'sam@team.com', avatar_color: '#EC4899', role: 'member' },
    { id: uuidv4(), name: 'Jordan Lee', email: 'jordan@team.com', avatar_color: '#14B8A6', role: 'member' },
    { id: uuidv4(), name: 'Taylor Kim', email: 'taylor@team.com', avatar_color: '#F59E0B', role: 'member' },
  ];

  const insertMember = db.prepare(
    'INSERT INTO members (id, name, email, avatar_color, role) VALUES (?, ?, ?, ?, ?)'
  );
  members.forEach((m) => insertMember.run(m.id, m.name, m.email, m.avatar_color, m.role));

  const projects = [
    {
      id: uuidv4(),
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern UI',
      color: '#6366F1',
    },
    {
      id: uuidv4(),
      name: 'Mobile App Launch',
      description: 'iOS and Android app for customer engagement',
      color: '#EC4899',
    },
    {
      id: uuidv4(),
      name: 'Q4 Marketing Campaign',
      description: 'Social media and email campaigns for holiday season',
      color: '#14B8A6',
    },
  ];

  const insertProject = db.prepare(
    'INSERT INTO projects (id, name, description, color) VALUES (?, ?, ?, ?)'
  );
  projects.forEach((p) => insertProject.run(p.id, p.name, p.description, p.color));

  const tasks = [
    { project: 0, title: 'Design new homepage mockups', status: 'done', priority: 'high', assignee: 0, days: -5 },
    { project: 0, title: 'Implement responsive navigation', status: 'done', priority: 'high', assignee: 1, days: -3 },
    { project: 0, title: 'Build hero section components', status: 'in_progress', priority: 'medium', assignee: 1, days: 2 },
    { project: 0, title: 'Set up CMS integration', status: 'todo', priority: 'medium', assignee: 2, days: 7 },
    { project: 0, title: 'Performance optimization', status: 'todo', priority: 'low', assignee: 0, days: 14 },
    { project: 0, title: 'Write SEO meta tags', status: 'todo', priority: 'low', assignee: 3, days: 10 },
    { project: 1, title: 'Define app architecture', status: 'done', priority: 'high', assignee: 0, days: -10 },
    { project: 1, title: 'Design onboarding screens', status: 'in_progress', priority: 'high', assignee: 3, days: 3 },
    { project: 1, title: 'Implement authentication flow', status: 'in_progress', priority: 'high', assignee: 1, days: 5 },
    { project: 1, title: 'Push notification setup', status: 'todo', priority: 'medium', assignee: 2, days: 12 },
    { project: 1, title: 'App Store submission prep', status: 'todo', priority: 'medium', assignee: 0, days: 21 },
    { project: 2, title: 'Create content calendar', status: 'done', priority: 'high', assignee: 3, days: -7 },
    { project: 2, title: 'Design social media assets', status: 'in_progress', priority: 'medium', assignee: 3, days: 4 },
    { project: 2, title: 'Set up email sequences', status: 'todo', priority: 'high', assignee: 2, days: 8 },
    { project: 2, title: 'Influencer outreach list', status: 'todo', priority: 'low', assignee: 3, days: 15 },
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, due_date, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  tasks.forEach((t, i) => {
    const due = new Date();
    due.setDate(due.getDate() + t.days);
    insertTask.run(
      uuidv4(),
      projects[t.project].id,
      t.title,
      '',
      t.status,
      t.priority,
      members[t.assignee].id,
      due.toISOString().split('T')[0],
      i
    );
  });

  // Seed activity
  const insertActivity = db.prepare(
    'INSERT INTO activity (id, type, message, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)'
  );
  insertActivity.run(uuidv4(), 'project_created', 'Website Redesign project created', projects[0].id, 'project');
  insertActivity.run(uuidv4(), 'task_completed', 'Design new homepage mockups completed', null, 'task');
  insertActivity.run(uuidv4(), 'task_created', 'Implement authentication flow added', null, 'task');
  insertActivity.run(uuidv4(), 'project_created', 'Mobile App Launch project created', projects[1].id, 'project');
}

module.exports = db;
