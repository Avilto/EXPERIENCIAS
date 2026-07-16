/**
 * FLUX — app.js
 * Main application controller: navigation, rendering, interactions
 */

// ─── STATE ───────────────────────────────────────────────────────────────────
let currentView = 'dashboard';
let currentProjectId = null;
let currentTaskId = null;
let currentContentId = null;
let currentContentFilter = 'ALL';
let newContentType = 'NOTE';

// Stopwatch state
let swInterval = null;
let swRunning = false;
let swSessionSeconds = 0;
let swStartTime = null;

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  navigate('dashboard');
  seedDemoData();
});

function seedDemoData() {
  if (DB.getProjects().length > 0) return; // Already has data
  const p = DB.createProject({ name: 'Campaña Verano 2025', description: 'Estrategia de contenido para redes sociales del verano.', total_budget: 3000 });
  DB.updateProject(p.id, { status: 'ACTIVE' });
  const t1 = DB.createTask({ project_id: p.id, title: 'Diseñar brief de contenido', priority: 'HIGH', due_date: '2025-08-01' });
  const t2 = DB.createTask({ project_id: p.id, title: 'Grabar videos de producto', priority: 'HIGH' });
  const t3 = DB.createTask({ project_id: p.id, title: 'Editar reel principal', priority: 'MEDIUM' });
  DB.updateTask(t1.id, { status: 'DONE' });
  DB.updateTask(t2.id, { dependencies: [t1.id] });
  DB.updateTask(t3.id, { dependencies: [t2.id] });
  DB.createContent({ project_id: p.id, type: 'NOTE', title: 'Paleta de colores', body_text: 'Usar tonos cálidos: naranja, coral y beige. Referencia la campaña de verano de Zara 2024.' });
  DB.createContent({ project_id: p.id, type: 'STEP', title: 'Definir audiencia objetivo', body_text: 'Mujeres 25-35, interés en moda y lifestyle.', sort_order: 1 });
  DB.createContent({ project_id: p.id, type: 'STEP', title: 'Crear calendario editorial', body_text: '3 posts semanales durante julio y agosto.', sort_order: 2 });
  DB.createContent({ project_id: p.id, type: 'INSTAGRAM', ig_url: 'https://www.instagram.com/reel/ejemplo/', ig_author: '@influencer.moda', personal_note: 'Me encanta la iluminación y el ritmo del reel. Quiero algo similar para la apertura de la campaña.', ig_thumbnail_url: '' });
  DB.createExpense({ project_id: p.id, description: 'Fotógrafo freelance', amount: 800 });
  DB.createExpense({ project_id: p.id, description: 'Ropa para shooting', amount: 350 });
}

// ─── GREETING ────────────────────────────────────────────────────────────────
function setGreeting() {
  const h = new Date().getHours();
  const el = document.getElementById('greetingText');
  if (!el) return;
  el.textContent = h < 12 ? 'Buenos días ☀️' : h < 18 ? 'Buenas tardes 🌤' : 'Buenas noches 🌙';
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function navigate(view) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Update nav
  document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active');

  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('active');

  currentView = view;

  // Render current view
  if (view === 'dashboard') renderDashboard();
  if (view === 'projects') renderProjects();
  if (view === 'tasks') renderGlobalTasks();
  if (view === 'project-detail' && currentProjectId) renderProjectDetail(currentProjectId);
  if (view === 'task-detail' && currentTaskId) renderTaskDetail(currentTaskId);
  if (view === 'settings') renderSettings();
}

function openProject(id) {
  currentProjectId = id;
  navigate('project-detail');
}

function openTask(id) {
  currentTaskId = id;
  navigate('task-detail');
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard() {
  const stats = DB.getStats();
  document.getElementById('statProjects').textContent = stats.projects;
  document.getElementById('statTasks').textContent = stats.tasks;
  document.getElementById('statDone').textContent = stats.done;

  // Active projects (first 3)
  const projects = DB.getProjects().filter(p => p.status !== 'COMPLETED').slice(0, 3);
  const pList = document.getElementById('dashProjectList');
  pList.innerHTML = projects.length
    ? projects.map(p => renderProjectCard(p)).join('')
    : emptyState('folder_open', 'Sin proyectos activos. ¡Crea uno!');

  // Upcoming tasks (not done, by due date)
  const tasks = DB.getTasks()
    .filter(t => t.status !== 'DONE')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 4);
  const tList = document.getElementById('dashTaskList');
  tList.innerHTML = tasks.length
    ? tasks.map(t => renderTaskCard(t, true)).join('')
    : emptyState('task_alt', 'Sin tareas pendientes.');
}

// ─── PROJECTS LIST ───────────────────────────────────────────────────────────
function renderProjects() {
  const projects = DB.getProjects();
  const list = document.getElementById('projectList');
  list.innerHTML = projects.length
    ? projects.map(p => renderProjectCard(p)).join('')
    : emptyState('folder_open', 'No hay proyectos. Toca + para crear uno.');
}

function renderProjectCard(p) {
  const pct = DB.getProjectProgress(p.id);
  const tasks = DB.getTasksByProject(p.id);
  const content = DB.getContentByProject(p.id);
  const igCount = content.filter(c => c.type === 'INSTAGRAM').length;
  return `
    <div class="project-card" onclick="openProject('${p.id}')">
      <div class="project-card-name">${esc(p.name)}</div>
      ${p.description ? `<div class="project-card-desc">${esc(p.description)}</div>` : ''}
      <div class="project-card-footer">
        <div class="progress-mini-wrap"><div class="progress-mini-fill" style="width:${pct}%"></div></div>
        <span class="progress-mini-pct">${pct}%</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;padding-left:10px;align-items:center">
        <span class="project-badge ${p.status}">${statusLabel(p.status)}</span>
        <span style="font-size:11px;color:var(--text-3)">${tasks.length} tareas</span>
        ${igCount > 0 ? `<span style="font-size:11px;color:var(--ig-pink)">📸 ${igCount} IG</span>` : ''}
      </div>
    </div>`;
}

// ─── PROJECT DETAIL ───────────────────────────────────────────────────────────
function renderProjectDetail(id) {
  const p = DB.getProject(id);
  if (!p) return navigate('projects');

  document.getElementById('detailProjectName').textContent = p.name;
  const pct = DB.getProjectProgress(id);
  document.getElementById('detailProgressPct').textContent = pct + '%';
  document.getElementById('detailProgressBar').style.width = pct + '%';
  document.getElementById('detailStatusBadge').textContent = statusLabel(p.status);
  document.getElementById('detailStatusBadge').className = `project-badge ${p.status}`;
  document.getElementById('detailBudgetInfo').textContent = p.total_budget > 0 ? `Presupuesto: S/ ${p.total_budget.toFixed(2)}` : '';

  renderProjectTasks(id);
  renderProjectContent(id);
  renderProjectFinance(id);
}

function renderProjectTasks(id) {
  const tasks = DB.getTasksByProject(id);
  const list = document.getElementById('projectTaskList');
  list.innerHTML = tasks.length
    ? tasks.map(t => renderTaskCard(t)).join('')
    : emptyState('task_alt', 'Sin tareas. Toca + para agregar una.');
}

function renderProjectContent(id) {
  let items = DB.getContentByProject(id);
  if (currentContentFilter !== 'ALL') items = items.filter(c => c.type === currentContentFilter);
  const list = document.getElementById('projectContentList');
  list.innerHTML = items.length
    ? items.map(c => renderContentCard(c)).join('')
    : emptyState('lightbulb', 'Sin contenido. Agrega notas, pasos o inspiraciones de Instagram.');
}

function renderProjectFinance(id) {
  const p = DB.getProject(id);
  const spent = DB.getTotalSpent(id);
  const left = p.total_budget - spent;
  const pct = p.total_budget > 0 ? Math.min((spent / p.total_budget) * 100, 100) : 0;

  document.getElementById('detailBudgetTotal').textContent = `S/ ${(p.total_budget || 0).toFixed(2)}`;
  document.getElementById('detailBudgetSpent').textContent = `S/ ${spent.toFixed(2)}`;
  document.getElementById('detailBudgetLeft').textContent = `S/ ${left.toFixed(2)}`;
  document.getElementById('budgetProgressBar').style.width = pct + '%';

  const expenses = DB.getExpensesByProject(id);
  const list = document.getElementById('projectExpenseList');
  list.innerHTML = expenses.length
    ? expenses.map(e => `
      <div class="expense-card">
        <div>
          <div class="expense-desc">${esc(e.description)}</div>
          <div class="expense-date">${formatDate(e.incurred_at)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="expense-amount">S/ ${e.amount.toFixed(2)}</div>
          <button class="icon-btn sm" onclick="deleteExpense('${e.id}')"><span class="material-symbols-rounded" style="font-size:16px">delete</span></button>
        </div>
      </div>`).join('')
    : emptyState('payments', 'Sin gastos registrados.');
}

// ─── CONTENT CARDS ───────────────────────────────────────────────────────────
function renderContentCard(c) {
  if (c.type === 'INSTAGRAM') {
    return `
      <div class="content-card INSTAGRAM" onclick="openContent('${c.id}')">
        <div class="ig-card-thumb">
          ${c.ig_thumbnail_url
            ? `<img src="${esc(c.ig_thumbnail_url)}" alt="IG" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <span class="material-symbols-rounded" ${c.ig_thumbnail_url ? 'style="display:none"' : ''}>photo_camera</span>
        </div>
        <div class="ig-card-body">
          <div class="ig-card-author">${c.ig_author ? esc(c.ig_author) : 'Instagram'}</div>
          <div class="ig-card-note">${esc(c.personal_note || 'Sin nota personal.')}</div>
          <div style="margin-top:8px;font-size:10px;color:var(--text-3)">${formatDate(c.created_at)}</div>
        </div>
      </div>`;
  }
  return `
    <div class="content-card" onclick="openContent('${c.id}')">
      <div class="content-type-chip ${c.type} ${c.completed ? 'done' : ''}">
        <span class="material-symbols-rounded" style="font-size:11px">${c.type === 'NOTE' ? 'sticky_note_2' : 'checklist'}</span>
        ${c.type === 'NOTE' ? 'Nota' : 'Paso'} ${c.completed ? '✓' : ''}
      </div>
      <div class="content-card-title">${esc(c.title || 'Sin título')}</div>
      <div class="content-card-body">${esc(c.body_text || '')}</div>
    </div>`;
}

function openContent(id) {
  currentContentId = id;
  const c = DB.getContentById(id);
  if (!c) return;
  const body = document.getElementById('contentDetailBody');

  if (c.type === 'INSTAGRAM') {
    body.innerHTML = `
      <h3 class="modal-title">Inspiración Instagram</h3>
      <div class="ig-detail-header">
        ${c.ig_thumbnail_url ? `<img src="${esc(c.ig_thumbnail_url)}" alt="IG" onerror="this.style.display='none'">` : ''}
        <span class="material-symbols-rounded"${c.ig_thumbnail_url ? ' style="display:none"' : ''}>photo_camera</span>
        ${c.ig_author ? `<div class="ig-detail-author">${esc(c.ig_author)}</div>` : ''}
      </div>
      <div class="detail-label" style="margin-top:16px">Mi nota de inspiración</div>
      <div class="note-detail-body">${esc(c.personal_note || 'Sin nota.')}</div>
      <a href="${esc(c.ig_url)}" target="_blank" class="ig-link-btn">
        <span class="material-symbols-rounded">open_in_new</span> Abrir en Instagram
      </a>`;
  } else if (c.type === 'STEP') {
    body.innerHTML = `
      <h3 class="modal-title">Paso de Planificación</h3>
      <div class="step-check-row">
        <button class="step-check-btn ${c.completed ? 'done' : ''}" onclick="toggleStep('${c.id}')">
          ${c.completed ? '<span class="material-symbols-rounded">check</span>' : ''}
        </button>
        <div class="note-detail-title" style="${c.completed ? 'text-decoration:line-through;opacity:0.5' : ''}">${esc(c.title || 'Sin título')}</div>
      </div>
      <div class="note-detail-body">${esc(c.body_text || '')}</div>`;
  } else {
    body.innerHTML = `
      <h3 class="modal-title">Nota</h3>
      <div class="note-detail-title">${esc(c.title || 'Sin título')}</div>
      <div class="detail-label" style="margin-top:16px">Contenido</div>
      <div class="note-detail-body">${esc(c.body_text || '')}</div>`;
  }

  openModal('modalContentDetail');
}

function toggleStep(id) {
  const c = DB.getContentById(id);
  if (!c) return;
  DB.updateContent(id, { completed: !c.completed });
  openContent(id); // re-render modal
  renderProjectContent(currentProjectId);
}

function deleteCurrentContent() {
  if (!currentContentId) return;
  DB.deleteContent(currentContentId);
  closeModal('modalContentDetail');
  renderProjectContent(currentProjectId);
  showToast('Contenido eliminado');
}

// ─── TASK CARDS ──────────────────────────────────────────────────────────────
function renderTaskCard(t, showProject = false) {
  const isDone = t.status === 'DONE';
  const project = showProject ? DB.getProject(t.project_id) : null;
  const dueStr = t.due_date ? formatDateShort(t.due_date) : '';
  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !isDone;

  return `
    <div class="task-card">
      <div class="task-check ${isDone ? 'done' : ''}" onclick="toggleTask('${t.id}', event)">
        ${isDone ? '<span class="material-symbols-rounded">check</span>' : ''}
      </div>
      <div class="task-card-content" onclick="openTask('${t.id}')">
        <div class="task-card-title ${isDone ? 'done' : ''}">${esc(t.title)}</div>
        <div class="task-card-meta">
          <div class="priority-dot ${t.priority}"></div>
          <span class="meta-tag">${priorityLabel(t.priority)}</span>
          ${dueStr ? `<span class="due-tag ${isOverdue ? 'overdue' : ''}">
            <span class="material-symbols-rounded" style="font-size:12px">calendar_today</span>${dueStr}
          </span>` : ''}
          ${(t.labels || []).slice(0, 2).map(l => `<span class="meta-tag">${esc(l)}</span>`).join('')}
          ${project ? `<span class="meta-tag">${esc(project.name)}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function toggleTask(id, event) {
  event.stopPropagation();
  const t = DB.getTask(id);
  if (!t) return;
  DB.updateTask(id, { status: t.status === 'DONE' ? 'TODO' : 'DONE' });
  if (currentView === 'dashboard') renderDashboard();
  if (currentView === 'project-detail') renderProjectTasks(currentProjectId);
  if (currentView === 'tasks') renderGlobalTasks();
}

// ─── TASK DETAIL ─────────────────────────────────────────────────────────────
function renderTaskDetail(id) {
  const t = DB.getTask(id);
  if (!t) return navigate('project-detail');

  document.getElementById('taskDetailTitle').textContent = t.title;
  document.getElementById('taskDetailPriority').value = t.priority;
  document.getElementById('taskDetailStatus').value = t.status;
  document.getElementById('taskDetailDesc').value = t.description || '';
  document.getElementById('taskDetailDue').value = t.due_date ? t.due_date.split('T')[0] + 'T' + (t.due_date.includes('T') ? t.due_date.split('T')[1].slice(0,5) : '00:00') : '';

  renderLabels(t.labels || []);
  renderStopwatch(t);
  renderDependencies(t);
}

function updateTaskField(field, value) {
  if (!currentTaskId) return;
  DB.updateTask(currentTaskId, { [field]: value });
}

function renderLabels(labels) {
  const wrap = document.getElementById('taskLabelsWrap');
  wrap.innerHTML = labels.map(l => `
    <span class="label-tag" onclick="removeLabel('${esc(l)}')">
      ${esc(l)} <span class="material-symbols-rounded remove-label">close</span>
    </span>`).join('');
}

function addLabel(event) {
  if (event.key !== 'Enter') return;
  const input = document.getElementById('taskLabelInput');
  const val = input.value.trim();
  if (!val) return;
  const t = DB.getTask(currentTaskId);
  if (!t) return;
  const labels = [...(t.labels || [])];
  if (!labels.includes(val)) {
    labels.push(val);
    DB.updateTask(currentTaskId, { labels });
    renderLabels(labels);
  }
  input.value = '';
}

function removeLabel(label) {
  const t = DB.getTask(currentTaskId);
  if (!t) return;
  const labels = (t.labels || []).filter(l => l !== label);
  DB.updateTask(currentTaskId, { labels });
  renderLabels(labels);
}

// ─── STOPWATCH ───────────────────────────────────────────────────────────────
function renderStopwatch(t) {
  swSessionSeconds = 0;
  swRunning = false;
  clearInterval(swInterval);
  document.getElementById('swStart').classList.remove('hidden');
  document.getElementById('swStop').classList.add('hidden');
  document.getElementById('stopwatchDisplay').textContent = '00:00:00';
  document.getElementById('stopwatchTotal').textContent = formatSeconds(t.time_spent_seconds || 0);
}

function startStopwatch() {
  if (swRunning) return;
  swRunning = true;
  swStartTime = Date.now() - (swSessionSeconds * 1000);
  document.getElementById('swStart').classList.add('hidden');
  document.getElementById('swStop').classList.remove('hidden');
  swInterval = setInterval(() => {
    swSessionSeconds = Math.floor((Date.now() - swStartTime) / 1000);
    document.getElementById('stopwatchDisplay').textContent = formatSeconds(swSessionSeconds);
  }, 1000);
}

function stopStopwatch() {
  if (!swRunning) return;
  swRunning = false;
  clearInterval(swInterval);
  document.getElementById('swStart').classList.remove('hidden');
  document.getElementById('swStop').classList.add('hidden');
  // Save timelog and update task
  const t = DB.getTask(currentTaskId);
  if (!t || swSessionSeconds === 0) return;
  const newTotal = (t.time_spent_seconds || 0) + swSessionSeconds;
  DB.updateTask(currentTaskId, { time_spent_seconds: newTotal });
  DB.createTimelog({
    task_id: currentTaskId,
    started_at: new Date(swStartTime).toISOString(),
    ended_at: new Date().toISOString(),
    duration_seconds: swSessionSeconds
  });
  document.getElementById('stopwatchTotal').textContent = formatSeconds(newTotal);
  swSessionSeconds = 0;
  document.getElementById('stopwatchDisplay').textContent = '00:00:00';
  showToast('⏱ Tiempo guardado');
}

function resetStopwatch() {
  clearInterval(swInterval);
  swRunning = false;
  swSessionSeconds = 0;
  document.getElementById('swStart').classList.remove('hidden');
  document.getElementById('swStop').classList.add('hidden');
  document.getElementById('stopwatchDisplay').textContent = '00:00:00';
}

// ─── DEPENDENCIES ────────────────────────────────────────────────────────────
function renderDependencies(t) {
  const deps = (t.dependencies || []).map(id => DB.getTask(id)).filter(Boolean);
  const list = document.getElementById('dependenciesList');
  list.innerHTML = deps.length
    ? deps.map(dep => `
      <div class="dep-card">
        <div class="priority-dot ${dep.priority}"></div>
        <div class="dep-title">${esc(dep.title)}</div>
        <span class="meta-tag">${dep.status === 'DONE' ? '✅' : '⏳'}</span>
        <button class="icon-btn sm" onclick="removeDependency('${dep.id}')">
          <span class="material-symbols-rounded" style="font-size:16px">link_off</span>
        </button>
      </div>`).join('')
    : `<div style="font-size:13px;color:var(--text-3);padding:8px 0">Sin dependencias asignadas.</div>`;
}

function openDependencyPicker() {
  const t = DB.getTask(currentTaskId);
  if (!t) return;
  const projectTasks = DB.getTasksByProject(t.project_id).filter(pt => pt.id !== currentTaskId);
  const list = document.getElementById('dependencyPickerList');
  list.innerHTML = projectTasks.length
    ? projectTasks.map(pt => {
        const selected = (t.dependencies || []).includes(pt.id);
        return `
          <div class="dep-card ${selected ? 'selected' : ''}" onclick="toggleDependency('${pt.id}', this)">
            <div class="priority-dot ${pt.priority}"></div>
            <div class="dep-title">${esc(pt.title)}</div>
            ${selected ? '<span class="material-symbols-rounded" style="color:var(--accent-light);font-size:18px">check_circle</span>' : ''}
          </div>`;
      }).join('')
    : '<div style="font-size:13px;color:var(--text-3);padding:16px">No hay otras tareas en este proyecto.</div>';
  openModal('modalDependencies');
}

function toggleDependency(depId, el) {
  const t = DB.getTask(currentTaskId);
  if (!t) return;
  let deps = [...(t.dependencies || [])];
  if (deps.includes(depId)) {
    deps = deps.filter(d => d !== depId);
    el.classList.remove('selected');
  } else {
    deps.push(depId);
    el.classList.add('selected');
  }
  DB.updateTask(currentTaskId, { dependencies: deps });
  renderDependencies(DB.getTask(currentTaskId));
}

function removeDependency(depId) {
  const t = DB.getTask(currentTaskId);
  if (!t) return;
  const deps = (t.dependencies || []).filter(d => d !== depId);
  DB.updateTask(currentTaskId, { dependencies: deps });
  renderDependencies(DB.getTask(currentTaskId));
}

// ─── GLOBAL TASKS VIEW ───────────────────────────────────────────────────────
function renderGlobalTasks() {
  const filter = document.getElementById('globalTaskFilter')?.value || 'ALL';
  let tasks = DB.getTasks();
  if (filter !== 'ALL') tasks = tasks.filter(t => t.status === filter);
  tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const list = document.getElementById('globalTaskList');
  list.innerHTML = tasks.length
    ? tasks.map(t => renderTaskCard(t, true)).join('')
    : emptyState('task_alt', 'Sin tareas.');
}

// ─── SETTINGS / PROFILE ──────────────────────────────────────────────────────
function renderSettings() {
  const stats = DB.getStats();
  document.getElementById('profileStatProjects').textContent = stats.projects;
  document.getElementById('profileStatTasks').textContent = stats.tasks;
  document.getElementById('profileStatIG').textContent = stats.ig;
}

// ─── CREATE ENTITIES ─────────────────────────────────────────────────────────
function createProject() {
  const name = document.getElementById('newProjectName').value.trim();
  if (!name) return showToast('⚠️ Ingresa un nombre');
  const desc = document.getElementById('newProjectDesc').value.trim();
  const budget = document.getElementById('newProjectBudget').value;
  DB.createProject({ name, description: desc, total_budget: budget });
  closeModal('modalNewProject');
  document.getElementById('newProjectName').value = '';
  document.getElementById('newProjectDesc').value = '';
  document.getElementById('newProjectBudget').value = '';
  renderProjects();
  showToast('✅ Proyecto creado');
}

function openNewTask() {
  openModal('modalNewTask');
}

function createTask() {
  const title = document.getElementById('newTaskTitle').value.trim();
  if (!title) return showToast('⚠️ Ingresa un título');
  const priority = document.getElementById('newTaskPriority').value;
  const due = document.getElementById('newTaskDue').value;
  DB.createTask({ project_id: currentProjectId, title, priority, due_date: due || null });
  closeModal('modalNewTask');
  document.getElementById('newTaskTitle').value = '';
  renderProjectTasks(currentProjectId);
  renderProjectDetail(currentProjectId);
  showToast('✅ Tarea creada');
}

function deleteCurrentTask() {
  if (!currentTaskId) return;
  if (!confirm('¿Eliminar esta tarea?')) return;
  DB.deleteTask(currentTaskId);
  navigate('project-detail');
  showToast('🗑 Tarea eliminada');
}

function openNewContent() {
  newContentType = 'NOTE';
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-btn[data-type="NOTE"]').classList.add('active');
  document.getElementById('contentFieldsText').classList.remove('hidden');
  document.getElementById('contentFieldsIG').classList.add('hidden');
  openModal('modalNewContent');
}

function selectContentType(btn, type) {
  newContentType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (type === 'INSTAGRAM') {
    document.getElementById('contentFieldsText').classList.add('hidden');
    document.getElementById('contentFieldsIG').classList.remove('hidden');
  } else {
    document.getElementById('contentFieldsText').classList.remove('hidden');
    document.getElementById('contentFieldsIG').classList.add('hidden');
  }
}

function createContent() {
  if (newContentType === 'INSTAGRAM') {
    const url = document.getElementById('newContentIGUrl').value.trim();
    const note = document.getElementById('newContentIGNote').value.trim();
    if (!url) return showToast('⚠️ Ingresa la URL de Instagram');
    if (!note) return showToast('⚠️ Agrega tu nota de inspiración');
    const thumb = document.getElementById('newContentIGThumb').value.trim();
    const author = document.getElementById('newContentIGAuthor').value.trim();
    DB.createContent({ project_id: currentProjectId, type: 'INSTAGRAM', ig_url: url, ig_thumbnail_url: thumb, ig_author: author, personal_note: note });
    document.getElementById('newContentIGUrl').value = '';
    document.getElementById('newContentIGNote').value = '';
    document.getElementById('newContentIGThumb').value = '';
    document.getElementById('newContentIGAuthor').value = '';
    showToast('📸 Inspiración guardada en el proyecto');
  } else {
    const body = document.getElementById('newContentBody').value.trim();
    if (!body) return showToast('⚠️ Ingresa el contenido');
    const title = document.getElementById('newContentTitle').value.trim();
    DB.createContent({ project_id: currentProjectId, type: newContentType, title, body_text: body });
    document.getElementById('newContentTitle').value = '';
    document.getElementById('newContentBody').value = '';
    showToast('✅ Contenido guardado');
  }
  closeModal('modalNewContent');
  renderProjectContent(currentProjectId);
}

function openNewExpense() { openModal('modalNewExpense'); }

function createExpense() {
  const desc = document.getElementById('newExpenseDesc').value.trim();
  const amount = parseFloat(document.getElementById('newExpenseAmount').value);
  if (!desc) return showToast('⚠️ Ingresa una descripción');
  if (!amount || amount <= 0) return showToast('⚠️ Ingresa un monto válido');
  DB.createExpense({ project_id: currentProjectId, description: desc, amount });
  closeModal('modalNewExpense');
  document.getElementById('newExpenseDesc').value = '';
  document.getElementById('newExpenseAmount').value = '';
  renderProjectFinance(currentProjectId);
  showToast('💰 Gasto registrado');
}

function deleteExpense(id) {
  DB.deleteExpense(id);
  renderProjectFinance(currentProjectId);
  showToast('🗑 Gasto eliminado');
}

// ─── PROJECT MENU ────────────────────────────────────────────────────────────
function openProjectMenu() {
  const p = DB.getProject(currentProjectId);
  if (!p) return;
  const statuses = ['PLANNING','ACTIVE','COMPLETED','ON_HOLD'];
  const current = p.status;
  const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
  const action = confirm(`¿Cambiar estado a "${statusLabel(next)}"?\n\nToca Cancelar para eliminar el proyecto.`);
  if (action) {
    DB.updateProject(currentProjectId, { status: next });
    renderProjectDetail(currentProjectId);
    showToast(`Estado: ${statusLabel(next)}`);
  } else {
    if (confirm('¿ELIMINAR este proyecto y todo su contenido?')) {
      DB.deleteProject(currentProjectId);
      navigate('projects');
      showToast('🗑 Proyecto eliminado');
    }
  }
}

// ─── QUICK ACTIONS ───────────────────────────────────────────────────────────
function openQuickAdd() { openModal('modalQuickAdd'); }

function quickAddTaskGlobal() {
  const projects = DB.getProjects();
  if (!projects.length) { openModal('modalNewProject'); return; }
  currentProjectId = projects[0].id;
  openModal('modalNewTask');
}

function quickAddIG() {
  const projects = DB.getProjects();
  if (!projects.length) { showToast('⚠️ Crea un proyecto primero'); openModal('modalNewProject'); return; }
  currentProjectId = projects[0].id;
  openNewContent();
  // Auto-select Instagram
  const btn = document.querySelector('.type-btn[data-type="INSTAGRAM"]');
  if (btn) selectContentType(btn, 'INSTAGRAM');
}

// ─── CONTENT FILTER ──────────────────────────────────────────────────────────
function filterContent(btn, type) {
  currentContentFilter = type;
  document.querySelectorAll('.content-type-filter .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderProjectContent(currentProjectId);
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function switchTab(btn, tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  const panel = document.getElementById(tabId);
  panel.classList.remove('hidden');
  panel.classList.add('active');
}

// ─── MODALS ──────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
// Close modals by clicking overlay
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ─── UTILITY ─────────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

function statusLabel(s) {
  return { PLANNING: 'PLANIFICANDO', ACTIVE: 'ACTIVO', COMPLETED: 'COMPLETADO', ON_HOLD: 'EN ESPERA' }[s] || s;
}
function priorityLabel(p) {
  return { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' }[p] || p;
}

function emptyState(icon, text) {
  return `<div class="empty-state"><span class="material-symbols-rounded">${icon}</span><p>${text}</p></div>`;
}

function clearAllData() {
  if (confirm('¿Seguro que quieres eliminar TODOS los datos?')) {
    DB.clearAll();
    navigate('dashboard');
    showToast('🧹 Datos eliminados');
  }
}
