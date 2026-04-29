/* ============================================================
   STUDENT PRODUCTIVITY TRACKER — script.js
   Handles: CRUD, LocalStorage, Custom Modals, Dynamic Charting
   ============================================================ */

// ──────────────────────────────────────────────
// 1. DATA LAYER
// ──────────────────────────────────────────────

const STORAGE_KEY = 'studytrack_premium_data';

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
  return 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}


// ──────────────────────────────────────────────
// 2. FORM & CORE ACTIONS
// ──────────────────────────────────────────────

function handleFormSubmit() {
  const editId  = document.getElementById('edit-id').value;
  const date    = document.getElementById('entry-date').value;
  const subject = document.getElementById('entry-subject').value.trim();
  const hours   = parseFloat(document.getElementById('entry-hours').value);
  const task    = document.getElementById('entry-task').value.trim();
  const status  = document.getElementById('entry-status').value;

  // Validation
  if (!date)    return showToast('⚠️ Please select a date.', 'warning');
  if (!subject) return showToast('⚠️ Subject is required.', 'warning');
  if (isNaN(hours) || hours <= 0) return showToast('⚠️ Hours must be greater than 0.', 'warning');
  if (!task)    return showToast('⚠️ Task description is required.', 'warning');

  let entries = loadEntries();

  if (editId) {
    const idx = entries.findIndex(e => e.id === editId);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], date, subject, hours, task, status };
      showToast('✨ Entry updated successfully!', 'success');
    }
  } else {
    const newEntry = { id: generateId(), date, subject, hours, task, status };
    entries.push(newEntry);
    showToast('🚀 New entry added!', 'success');
    sendNotification('Study Recorded! 📚', `You tracked ${hours}h for ${subject}. Keep it up!`);
  }

  saveEntries(entries);
  resetForm();
  renderAll();
}

function resetForm() {
  document.getElementById('edit-id').value = '';
  document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('entry-subject').value = '';
  document.getElementById('entry-hours').value = '';
  document.getElementById('entry-task').value = '';
  document.getElementById('entry-status').value = 'Pending';

  document.getElementById('form-title').innerHTML = '<span>📝</span> Create Entry';
  document.getElementById('add-btn').textContent = 'Save Entry';
  document.getElementById('cancel-btn').style.display = 'none';
}

function cancelEdit() {
  resetForm();
}

function editEntry(id) {
  const entries = loadEntries();
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  document.getElementById('edit-id').value = entry.id;
  document.getElementById('entry-date').value = entry.date;
  document.getElementById('entry-subject').value = entry.subject;
  document.getElementById('entry-hours').value = entry.hours;
  document.getElementById('entry-task').value = entry.task;
  document.getElementById('entry-status').value = entry.status;

  document.getElementById('form-title').innerHTML = '<span>✏️</span> Edit Entry';
  document.getElementById('add-btn').textContent = 'Update Entry';
  document.getElementById('cancel-btn').style.display = 'inline-flex';

  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function markCompleted(id) {
  const entries = loadEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) {
    entries[idx].status = 'Completed';
    saveEntries(entries);
    renderAll();
    showToast('🏆 Milestone achieved!', 'success');
    sendNotification('Milestone Unlocked! 🏆', `Awesome! You completed your session for ${entries[idx].subject}.`);
  }
}


// ──────────────────────────────────────────────
// 3. MODAL LOGIC (Fixes Delete Bug)
// ──────────────────────────────────────────────

let modalCallback = null;

function showModal(title, text, icon, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-text').textContent = text;
  document.getElementById('modal-icon').textContent = icon;
  
  modalCallback = onConfirm;
  overlay.style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  modalCallback = null;
}

// Confirm button inside modal
document.getElementById('modal-confirm-btn').addEventListener('click', () => {
  if (modalCallback) modalCallback();
  closeModal();
});

function deleteEntry(id) {
  showModal(
    'Delete Entry?', 
    'This will permanently remove this record from your study log.', 
    '🗑️', 
    () => {
      const entries = loadEntries().filter(e => e.id !== id);
      saveEntries(entries);
      renderAll();
      showToast('Entry removed.', 'info');
    }
  );
}

function showClearAllModal() {
  showModal(
    'Clear All Data?', 
    'Every single entry will be deleted. This action is irreversible.', 
    '⚠️', 
    () => {
      localStorage.removeItem(STORAGE_KEY);
      resetForm();
      renderAll();
      showToast('All data cleared.', 'info');
    }
  );
}


// ──────────────────────────────────────────────
// 4. RENDERING (Table, Summary, Chart)
// ──────────────────────────────────────────────

function renderTable() {
  const entries = loadEntries();
  const filter = document.getElementById('filter-status').value;
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('empty-state');

  const filtered = filter === 'All' ? entries : entries.filter(e => e.status === filter);
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  emptyState.style.display = filtered.length === 0 ? 'flex' : 'none';
  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td class="cell-date">${e.date}</td>
      <td class="cell-subject">${escapeHtml(e.subject)}</td>
      <td class="cell-hours">${e.hours}h</td>
      <td class="cell-task" title="${escapeHtml(e.task)}">${escapeHtml(e.task)}</td>
      <td><span class="badge ${e.status === 'Pending' ? 'badge-pending' : 'badge-completed'}">
        ${e.status === 'Pending' ? '🕒 Pending' : '✅ Done'}
      </span></td>
      <td class="cell-actions">
        ${e.status === 'Pending' ? `<button class="btn btn-sm btn-complete" onclick="markCompleted('${e.id}')">✅</button>` : ''}
        <button class="btn btn-sm btn-edit" onclick="editEntry('${e.id}')">✏️</button>
        <button class="btn btn-sm btn-delete" onclick="deleteEntry('${e.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function renderSummary() {
  const entries = loadEntries();
  const totalHrs = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const completed = entries.filter(e => e.status === 'Completed').length;
  const pending = entries.filter(e => e.status === 'Pending').length;

  document.getElementById('total-hours').textContent = totalHrs.toFixed(1) + ' hrs';
  document.getElementById('total-completed').textContent = completed;
  document.getElementById('total-pending').textContent = pending;
}

function renderChart() {
  const entries = loadEntries();
  const canvas = document.getElementById('bar-chart');
  const empty = document.getElementById('chart-empty');
  const ctx = canvas.getContext('2d');

  const subjectMap = {};
  entries.forEach(e => {
    subjectMap[e.subject] = (subjectMap[e.subject] || 0) + Number(e.hours);
  });

  const subjects = Object.keys(subjectMap);
  const hours = Object.values(subjectMap);

  if (subjects.length === 0) {
    canvas.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  empty.style.display = 'none';

  const COLORS = ['#6366f1', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const W = canvas.parentElement.clientWidth - 40;
  const BAR_H = 36;
  const GAP = 12;
  const LBL_W = 100;
  const CHART_H = subjects.length * (BAR_H + GAP) + 20;

  canvas.width = W;
  canvas.height = CHART_H;
  ctx.clearRect(0, 0, W, CHART_H);

  const maxH = Math.max(...hours, 1);
  const barArea = W - LBL_W - 60;

  subjects.forEach((subj, i) => {
    const y = 10 + i * (BAR_H + GAP);
    const barW = (hours[i] / maxH) * barArea;
    const color = COLORS[i % COLORS.length];

    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = '700 12px Sora';
    ctx.textAlign = 'right';
    ctx.fillText(subj.length > 12 ? subj.slice(0, 10) + '..' : subj, LBL_W - 10, y + BAR_H / 2 + 5);

    // Track
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, LBL_W, y, barArea, BAR_H, 10);
    ctx.fill();

    // Bar
    ctx.fillStyle = color;
    roundRect(ctx, LBL_W, y, Math.max(barW, 10), BAR_H, 10);
    ctx.fill();

    // Value
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 11px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(hours[i].toFixed(1) + 'h', LBL_W + barArea + 10, y + BAR_H / 2 + 5);
  });
}


// ──────────────────────────────────────────────
// 5. UTILS
// ──────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function escapeHtml(str) {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

/** Simple Toast (replacing alerts) */
function showToast(msg, type) {
  // We'll just use a simple console log or a floating div if we had one
  // For now, let's keep it simple or just use alert if absolutely needed
  // but to be "premium", let's create a temporary toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; 
    padding: 12px 24px; border-radius: 12px; 
    background: #0f172a; color: #fff; 
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    z-index: 2000; font-weight: 600;
    animation: fadeInUp 0.3s ease;
  `;
  if (type === 'success') toast.style.background = '#10b981';
  if (type === 'warning') toast.style.background = '#f59e0b';
  if (type === 'info')    toast.style.background = '#6366f1';
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderAll() {
  renderSummary();
  renderTable();
  renderChart();
}


// ──────────────────────────────────────────────
// 6. NOTIFICATIONS
// ──────────────────────────────────────────────

let notificationsEnabled = localStorage.getItem('studytrack_notif_enabled') === 'true';

function initNotifications() {
  const btn = document.getElementById('notif-toggle');
  if (notificationsEnabled && Notification.permission === 'granted') {
    btn.classList.add('active');
    document.getElementById('notif-icon').textContent = '🔕';
  } else {
    notificationsEnabled = false;
    localStorage.setItem('studytrack_notif_enabled', 'false');
  }
}

async function toggleNotifications() {
  if (!('Notification' in window)) {
    showToast('⚠️ Notifications not supported in this browser.', 'warning');
    return;
  }

  if (Notification.permission === 'denied') {
    showToast('❌ Notification permission denied. Please reset in browser settings.', 'warning');
    return;
  }

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('⚠️ Permission rejected.', 'warning');
      return;
    }
  }

  notificationsEnabled = !notificationsEnabled;
  localStorage.setItem('studytrack_notif_enabled', notificationsEnabled);
  
  const btn = document.getElementById('notif-toggle');
  const icon = document.getElementById('notif-icon');

  if (notificationsEnabled) {
    btn.classList.add('active');
    icon.textContent = '🔕';
    showToast('🔔 Notifications enabled!', 'success');
    sendNotification('StudyTracker Active', 'You will now receive alerts for milestones.');
  } else {
    btn.classList.remove('active');
    icon.textContent = '🔔';
    showToast('🔕 Notifications disabled.', 'info');
  }
}

function sendNotification(title, body) {
  if (notificationsEnabled && Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: 'logo.png'
    });
  }
}


// ──────────────────────────────────────────────
// 7. INIT
// ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
  initNotifications();
  renderAll();
});

window.addEventListener('resize', renderChart);
