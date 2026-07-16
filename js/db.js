/**
 * FLUX — db.js
 * LocalStorage-based data layer simulating PostgreSQL schema
 * Tables: users, projects, tasks, task_dependencies, timelogs, project_content, expenses
 */

const DB = {
  // ─── HELPERS ──────────────────────────────────────────────────────────────
  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },
  _now() { return new Date().toISOString(); },
  _get(key) { return JSON.parse(localStorage.getItem('flux_' + key) || '[]'); },
  _set(key, data) { localStorage.setItem('flux_' + key, JSON.stringify(data)); },

  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  getProjects() { return this._get('projects'); },
  getProject(id) { return this.getProjects().find(p => p.id === id) || null; },
  createProject(data) {
    const project = {
      id: this._uuid(),
      user_id: 'local-user',
      name: data.name,
      description: data.description || '',
      status: 'PLANNING',
      total_budget: parseFloat(data.total_budget) || 0,
      created_at: this._now(),
      updated_at: this._now()
    };
    const all = this.getProjects();
    all.unshift(project);
    this._set('projects', all);
    return project;
  },
  updateProject(id, fields) {
    const all = this.getProjects();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...fields, updated_at: this._now() };
    this._set('projects', all);
    return all[idx];
  },
  deleteProject(id) {
    this._set('projects', this.getProjects().filter(p => p.id !== id));
    this._set('tasks', this.getTasks().filter(t => t.project_id !== id));
    this._set('project_content', this.getContent().filter(c => c.project_id !== id));
    this._set('expenses', this.getExpenses().filter(e => e.project_id !== id));
  },
  getProjectProgress(id) {
    const tasks = this.getTasksByProject(id);
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.status === 'DONE').length;
    return Math.round((done / tasks.length) * 100);
  },

  // ─── TASKS ────────────────────────────────────────────────────────────────
  getTasks() { return this._get('tasks'); },
  getTask(id) { return this.getTasks().find(t => t.id === id) || null; },
  getTasksByProject(projectId) { return this.getTasks().filter(t => t.project_id === projectId); },
  createTask(data) {
    const task = {
      id: this._uuid(),
      project_id: data.project_id,
      title: data.title,
      description: '',
      priority: data.priority || 'MEDIUM',
      status: 'TODO',
      due_date: data.due_date || null,
      time_spent_seconds: 0,
      labels: [],
      dependencies: [],
      created_at: this._now(),
      updated_at: this._now()
    };
    const all = this.getTasks();
    all.unshift(task);
    this._set('tasks', all);
    return task;
  },
  updateTask(id, fields) {
    const all = this.getTasks();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...fields, updated_at: this._now() };
    this._set('tasks', all);
    return all[idx];
  },
  deleteTask(id) {
    this._set('tasks', this.getTasks().filter(t => t.id !== id));
    // Remove from other tasks' dependencies
    const all = this.getTasks().map(t => ({
      ...t,
      dependencies: (t.dependencies || []).filter(depId => depId !== id)
    }));
    this._set('tasks', all);
  },

  // ─── PROJECT CONTENT (Notes + Steps + Instagram) ──────────────────────────
  getContent() { return this._get('project_content'); },
  getContentByProject(projectId) { return this.getContent().filter(c => c.project_id === projectId); },
  getContentById(id) { return this.getContent().find(c => c.id === id) || null; },
  createContent(data) {
    const item = {
      id: this._uuid(),
      project_id: data.project_id,
      type: data.type, // NOTE | STEP | INSTAGRAM
      title: data.title || '',
      body_text: data.body_text || '',
      ig_url: data.ig_url || null,
      ig_thumbnail_url: data.ig_thumbnail_url || null,
      ig_author: data.ig_author || null,
      personal_note: data.personal_note || null,
      sort_order: data.sort_order || 0,
      completed: false,
      created_at: this._now()
    };
    const all = this.getContent();
    all.unshift(item);
    this._set('project_content', all);
    return item;
  },
  updateContent(id, fields) {
    const all = this.getContent();
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...fields };
    this._set('project_content', all);
    return all[idx];
  },
  deleteContent(id) {
    this._set('project_content', this.getContent().filter(c => c.id !== id));
  },
  countIGContent() {
    return this.getContent().filter(c => c.type === 'INSTAGRAM').length;
  },

  // ─── EXPENSES ─────────────────────────────────────────────────────────────
  getExpenses() { return this._get('expenses'); },
  getExpensesByProject(projectId) { return this.getExpenses().filter(e => e.project_id === projectId); },
  createExpense(data) {
    const expense = {
      id: this._uuid(),
      project_id: data.project_id,
      description: data.description,
      amount: parseFloat(data.amount),
      incurred_at: this._now(),
      created_at: this._now()
    };
    const all = this.getExpenses();
    all.unshift(expense);
    this._set('expenses', all);
    return expense;
  },
  deleteExpense(id) {
    this._set('expenses', this.getExpenses().filter(e => e.id !== id));
  },
  getTotalSpent(projectId) {
    return this.getExpensesByProject(projectId).reduce((sum, e) => sum + e.amount, 0);
  },

  // ─── TIMELOGS ─────────────────────────────────────────────────────────────
  getTimelogs() { return this._get('timelogs'); },
  createTimelog(data) {
    const log = {
      id: this._uuid(),
      task_id: data.task_id,
      started_at: data.started_at,
      ended_at: data.ended_at,
      duration_seconds: data.duration_seconds,
      created_at: this._now()
    };
    const all = this.getTimelogs();
    all.unshift(log);
    this._set('timelogs', all);
    return log;
  },

  // ─── STATS ────────────────────────────────────────────────────────────────
  getStats() {
    const tasks = this.getTasks();
    return {
      projects: this.getProjects().length,
      tasks: tasks.length,
      done: tasks.filter(t => t.status === 'DONE').length,
      ig: this.countIGContent()
    };
  },

  // ─── CLEAR ALL ────────────────────────────────────────────────────────────
  clearAll() {
    ['projects','tasks','project_content','expenses','timelogs'].forEach(k => {
      localStorage.removeItem('flux_' + k);
    });
  }
};
