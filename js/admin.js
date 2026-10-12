// ============================================================
//  CampusAI — admin.js
// ============================================================

function showToast(message, type = 'success') {
    const c = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
    t.innerHTML = `<span style="font-size:20px">${icons[type] || 'ℹ️'}</span><div><div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div><div class="toast-msg">${message}</div></div>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function logout() { if (confirm('Sign out?')) window.location.href = 'index.html'; }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('mobile-open'); document.getElementById('backdrop').classList.toggle('visible'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('mobile-open'); document.getElementById('backdrop').classList.remove('visible'); }

function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0].toUpperCase())
        .join('')
        .slice(0, 2) || 'AD';
}

function getRolePage(role) {
    const pages = { student: 'student.html', librarian: 'librarian.html', admin: 'admin.html', alumni: 'alumni.html' };
    return pages[role] || 'index.html';
}

function ensureAdminSession() {
    const user = api.getUser();
    if (!user?.role) {
        globalThis.location.href = 'index.html';
        return null;
    }
    if (user.role !== 'admin') {
        globalThis.location.href = getRolePage(user.role);
        return null;
    }
    return user;
}

function hydrateAdminIdentity(user) {
    const name = user.name || 'Admin User';
    const role = user.department ? `${user.department} / Admin` : 'Placement Officer / Admin';
    const avatar = user.avatar || getInitials(name);

    const avatarEl = document.getElementById('adminUserAvatar');
    const nameEl = document.getElementById('adminUserName');
    const roleEl = document.getElementById('adminUserRole');

    if (avatarEl) avatarEl.textContent = avatar;
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = role;
}

const tabTitles = {
    overview: 'Institutional Overview',
    library: 'Library Analytics',
    career: 'Career & Placement',
    mentorship: 'Mentorship Analytics',
    knowledge: 'Knowledge Base',
    publishing: 'Notice & Event Publishing Portal',
    moderation: 'Lost & Found Campus Moderation',
    departments: 'Departments & System Audit Trail',
    users: 'User Management'
};

function switchTab(name, el) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const p = document.getElementById('tab-' + name); if (p) p.classList.add('active');
    if (el) el.classList.add('active');
    document.getElementById('topbarTitle').textContent = tabTitles[name] || 'Admin';
    if (!chartInited[name]) { chartInited[name] = true; chartInit[name] && chartInit[name](); }

    if (name === 'publishing') loadAdminPublishingData();
    if (name === 'moderation') loadAdminModerationData();
    if (name === 'departments') { loadAdminDeptsData(); loadAdminAuditLogs(); }
}

const chartInited = {};
const chartInit = {
    overview: () => {
        new Chart(document.getElementById('jrsDistChart'), {
            type: 'bar',
            data: { labels: ['0-29', '30-49', '50-59', '60-69', '70-79', '80-89', '90-100'], datasets: [{ label: 'Students', data: [12, 48, 124, 380, 712, 498, 68], backgroundColor: ['#DC2626', '#F97316', '#EAB308', '#2563EB', '#0F766E', '#7C3AED', '#059669'], borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('jrsDeptChart'), {
            type: 'bar',
            data: { labels: ['CS', 'EC', 'ME', 'IT', 'Civil', 'MBA'], datasets: [{ label: 'Avg JRS', data: [74, 65, 58, 68, 52, 61], backgroundColor: 'rgba(37,99,235,0.8)', borderRadius: 6 }] },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { color: '#F1F5F9' } }, y: { grid: { display: false } } } }
        });
        const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); });
        new Chart(document.getElementById('activityChart'), {
            type: 'line',
            data: {
                labels: days, datasets: [
                    { label: 'Library Logins', data: days.map(() => Math.floor(Math.random() * 200 + 100)), borderColor: '#2563EB', tension: 0.4, pointRadius: 0 },
                    { label: 'Career Views', data: days.map(() => Math.floor(Math.random() * 150 + 80)), borderColor: '#0F766E', tension: 0.4, pointRadius: 0 },
                    { label: 'Chat Queries', data: days.map(() => Math.floor(Math.random() * 80 + 30)), borderColor: '#7C3AED', tension: 0.4, pointRadius: 0 },
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } } }
        });
    },
    library: () => {
        const labels = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return d.getDate() === 1 || i === 0 ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : d.getDate() + ''; });
        new Chart(document.getElementById('libTrendChart'), {
            type: 'line',
            data: {
                labels, datasets: [
                    { label: 'Issues', data: labels.map(() => Math.floor(Math.random() * 50 + 20)), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.4, fill: true, pointRadius: 0 },
                    { label: 'Returns', data: labels.map(() => Math.floor(Math.random() * 45 + 15)), borderColor: '#0F766E', tension: 0.4, pointRadius: 0 }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } } }
        });
        new Chart(document.getElementById('libDeptChart'), {
            type: 'doughnut',
            data: { labels: ['CS', 'EC', 'ME', 'IT', 'Others'], datasets: [{ data: [42, 22, 18, 12, 6], backgroundColor: ['#2563EB', '#0F766E', '#B45309', '#7C3AED', '#94A3B8'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    },
    career: () => {
        new Chart(document.getElementById('placementFunnelChart'), {
            type: 'bar',
            data: { labels: ['Registered', 'Shortlisted', 'Appeared', 'Offers Received', 'Accepted'], datasets: [{ label: 'Students', data: [406, 320, 280, 198, 342], backgroundColor: ['rgba(37,99,235,0.7)', 'rgba(37,99,235,0.75)', 'rgba(37,99,235,0.8)', 'rgba(37,99,235,0.85)', 'rgba(15,118,110,0.9)'], borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('packageDistChart'), {
            type: 'doughnut',
            data: { labels: ['< 5 LPA', '5–8 LPA', '8–12 LPA', '12–20 LPA', '> 20 LPA'], datasets: [{ data: [18, 88, 124, 86, 26], backgroundColor: ['#94A3B8', '#60A5FA', '#2563EB', '#7C3AED', '#059669'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    },
    mentorship: () => {
        new Chart(document.getElementById('mentorFunnelChart'), {
            type: 'bar',
            data: { labels: ['Registered', 'Profile Complete', 'Active', 'Matched', 'Sessions Done'], datasets: [{ label: 'Alumni', data: [1247, 890, 624, 312, 184], backgroundColor: 'rgba(124,58,237,0.75)', borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('sessionsChart'), {
            type: 'line',
            data: { labels: ['Jan W1', 'Jan W2', 'Jan W3', 'Jan W4', 'Feb W1', 'Feb W2', 'Feb W3', 'Feb W4'], datasets: [{ label: 'Sessions', data: [42, 58, 64, 72, 80, 86, 96, 108], borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.1)', tension: 0.4, fill: true, pointRadius: 5 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
        });
    }
};

const knowledgeDocs = [
    { name: 'Academic Calendar 2025-26', category: 'Academic Policy', size: '248 KB', uploaded: 'Sep 1, 2025', chunks: 32, status: 'indexed' },
    { name: 'Library Policy Handbook', category: 'Library', size: '512 KB', uploaded: 'Sep 5, 2025', chunks: 78, status: 'indexed' },
    { name: 'Hostel Allocation Rules 2026', category: 'Hostel & Facilities', size: '320 KB', uploaded: 'Jan 15, 2026', chunks: 45, status: 'indexed' },
    { name: 'Placement Drive Guidelines', category: 'Placement', size: '188 KB', uploaded: 'Feb 1, 2026', chunks: 28, status: 'indexed' },
    { name: 'B.Tech Syllabus — CS 2024-28', category: 'Curriculum', size: '1.2 MB', uploaded: 'Feb 10, 2026', chunks: 124, status: 'indexed' },
    { name: 'Campus Facilities Map', category: 'Hostel & Facilities', size: '4.8 MB', uploaded: 'Feb 18, 2026', chunks: null, status: 'ingesting' },
];

function renderKnowledge() {
    document.getElementById('knowledgeTbody').innerHTML = knowledgeDocs.map(d => `
    <tr>
      <td class="fw-600 text-navy">📄 ${d.name}</td>
      <td><span class="badge badge-blue">${d.category}</span></td>
      <td class="text-gray">${d.size}</td>
      <td class="text-gray">${d.uploaded}</td>
      <td class="mono" style="text-align:center">${d.chunks || '…'}</td>
      <td><span class="badge ${d.status === 'indexed' ? 'badge-teal' : 'badge-amber'}">${d.status === 'indexed' ? '✓ Indexed' : '⟳ Ingesting…'}</span></td>
      <td><div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="showToast('Document details','info')">View</button>
        <button class="btn btn-danger btn-sm" onclick="showToast('Document removed from KB','warning')">Delete</button>
      </div></td>
    </tr>`).join('');
}

const usersData = [
    { name: 'Deep Das', email: 'deep@campus.edu', role: 'Student', dept: 'Computer Science', status: 'active', lastActive: '2h ago' },
    { name: 'Kavita Patel', email: 'lib@campusai.edu', role: 'Librarian', dept: 'Central Library', status: 'active', lastActive: '30m ago' },
    { name: 'Dr. Pankaj Ojha', email: 'placement@campusai.edu', role: 'Admin', dept: 'Placement Cell', status: 'active', lastActive: '10m ago' },
    { name: 'Priya Mehta', email: 'priya@alumni.edu', role: 'Alumni', dept: 'Computer Science (2020)', status: 'active', lastActive: '1d ago' },
    { name: 'Rohan Verma', email: 'rohan@campusai.edu', role: 'Student', dept: 'Electronics', status: 'active', lastActive: '3h ago' },
    { name: 'Prof. Anita Singh', email: 'anita@campusai.edu', role: 'Faculty', dept: 'Computer Science', status: 'active', lastActive: '45m ago' },
];

function filterUsers(role, btn) {
    document.querySelectorAll('.role-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = role === 'all' ? usersData : usersData.filter(u => u.role.toLowerCase() === role);
    renderUsers(filtered);
}

function renderUsers(data) {
    const roleBadge = { Student: 'badge-blue', Librarian: 'badge-teal', Admin: 'badge-red', Faculty: 'badge-purple', Alumni: 'badge-amber' };
    document.getElementById('usersTbody').innerHTML = data.map(u => `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="avatar avatar-sm">${u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div><div class="fw-600 text-navy">${u.name}</div><div class="text-xs text-gray">${u.email}</div></div>
        </div>
      </td>
      <td><span class="badge ${roleBadge[u.role] || 'badge-gray'}">${u.role}</span></td>
      <td class="text-gray">${u.dept}</td>
      <td><span class="badge badge-teal">Active</span></td>
      <td class="text-xs text-gray">${u.lastActive}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="showToast('Edit ${u.name}','info')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="showToast('User deactivated','warning')">Disable</button>
        </div>
      </td>
    </tr>`).join('');
}

document.querySelectorAll('.modal-overlay').forEach(o => { o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }); });

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN MODULES: PUBLISHING, LOST & FOUND MODERATION, DEPARTMENTS & AUDIT
// ══════════════════════════════════════════════════════════════════════════════

let adminNoticesData = [];
let adminEventsData = [];
let adminDeptsData = [];
let adminLfData = [];
let currentPubFilter = 'all';
let currentPubSearch = '';
let currentModFilter = 'all';
let currentModSearch = '';
let isDraftNoticeSubmission = false;
let isDraftEventSubmission = false;

// ─── Target Departments Checkboxes ──────────────────────────────────────────
function renderTargetDeptsCheckboxes() {
    const container = document.getElementById('noticeTargetDeptsList');
    if (!container) return;

    if (!adminDeptsData.length) {
        container.innerHTML = '<span class="text-xs text-gray">No departments configured</span>';
        return;
    }

    container.innerHTML = adminDeptsData.map(d => `
        <label style="display:inline-flex; align-items:center; gap:6px; font-size:var(--text-xs); background:white; padding:4px 10px; border-radius:var(--radius-sm); border:1px solid var(--gray-200); cursor:pointer;">
            <input type="checkbox" name="targetDept" value="${d.code}" checked />
            <strong class="text-navy">${d.code}</strong> (${d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name})
        </label>
    `).join('');
}

function toggleNoticeAudienceInputs(val) {
    const list = document.getElementById('targetDeptsGroup');
    if (!list) return;
    if (val === 'university') {
        list.style.opacity = '0.5';
        list.style.pointerEvents = 'none';
        document.querySelectorAll('input[name="targetDept"]').forEach(cb => cb.checked = true);
    } else {
        list.style.opacity = '1';
        list.style.pointerEvents = 'auto';
    }
}

// ─── Publishing Data Loader ──────────────────────────────────────────────────
async function loadAdminPublishingData() {
    try {
        const [noticesRes, eventsRes, deptsRes] = await Promise.all([
            api.get('/notices'),
            api.get('/events'),
            api.get('/departments')
        ]);

        if (noticesRes.success) adminNoticesData = noticesRes.data || [];
        if (eventsRes.success) adminEventsData = eventsRes.data || [];
        if (deptsRes.success) {
            adminDeptsData = deptsRes.data || [];
            renderTargetDeptsCheckboxes();
        }

        const activeNotices = adminNoticesData.filter(n => n.status === 'published').length;
        const draftNotices = adminNoticesData.filter(n => n.status === 'draft').length;
        const upcomingEvents = adminEventsData.filter(e => e.status !== 'cancelled').length;
        const totalRegs = adminEventsData.reduce((sum, e) => sum + (e.registrations?.length || 0), 0);

        const elActN = document.getElementById('adminActiveNoticesCount');
        const elDrfN = document.getElementById('adminDraftNoticesCount');
        const elUpcE = document.getElementById('adminUpcomingEventsCount');
        const elTotR = document.getElementById('adminTotalRegsCount');
        if (elActN) elActN.textContent = activeNotices;
        if (elDrfN) elDrfN.textContent = draftNotices;
        if (elUpcE) elUpcE.textContent = upcomingEvents;
        if (elTotR) elTotR.textContent = totalRegs;

        renderAdminNotices();
        renderAdminEvents();
    } catch (err) {
        console.error('Failed to load publishing data:', err);
    }
}

function filterPublishingView(mode, btn) {
    currentPubFilter = mode;
    document.querySelectorAll('#tab-publishing .role-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const noticeSec = document.getElementById('adminNoticesSection');
    const eventSec = document.getElementById('adminEventsSection');

    if (mode === 'notices') {
        if (noticeSec) noticeSec.style.display = 'block';
        if (eventSec) eventSec.style.display = 'none';
    } else if (mode === 'events') {
        if (noticeSec) noticeSec.style.display = 'none';
        if (eventSec) eventSec.style.display = 'block';
    } else {
        if (noticeSec) noticeSec.style.display = 'block';
        if (eventSec) eventSec.style.display = 'block';
    }

    renderAdminNotices();
    renderAdminEvents();
}

function handleAdminPubSearch(val) {
    currentPubSearch = (val || '').toLowerCase().trim();
    renderAdminNotices();
    renderAdminEvents();
}

function renderAdminNotices() {
    const tbody = document.getElementById('adminNoticesTbody');
    if (!tbody) return;

    let filtered = [...adminNoticesData];
    if (currentPubFilter === 'drafts') {
        filtered = filtered.filter(n => n.status === 'draft');
    }
    if (currentPubSearch) {
        filtered = filtered.filter(n =>
            (n.title && n.title.toLowerCase().includes(currentPubSearch)) ||
            (n.description && n.description.toLowerCase().includes(currentPubSearch)) ||
            (n.category && n.category.toLowerCase().includes(currentPubSearch)) ||
            (n.department && n.department.toLowerCase().includes(currentPubSearch))
        );
    }

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray p-4">No matching notices found.</td></tr>';
        return;
    }

    const priorityBadge = {
        urgent: 'badge-red',
        high: 'badge-amber',
        standard: 'badge-blue',
        low: 'badge-gray'
    };

    const statusBadge = {
        published: 'badge-teal',
        draft: 'badge-amber',
        archived: 'badge-gray'
    };

    tbody.innerHTML = filtered.map(n => {
        const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
        const deptsDisplay = (n.departments && n.departments.length)
            ? n.departments.map(d => `<span class="badge badge-blue" style="font-size:10px; padding:1px 6px;">${d}</span>`).join(' ')
            : `<span class="badge badge-gray" style="font-size:10px;">${n.department || 'All'}</span>`;

        return `
            <tr>
                <td>
                    <div class="flex items-center gap-2">
                        ${n.isPinned ? '<span title="Pinned Announcement" style="font-size:14px;">📌</span>' : ''}
                        <div>
                            <div class="fw-600 text-navy" style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${n.title}</div>
                            <div class="text-xs text-gray" style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${n.description ? n.description.slice(0, 60) + '…' : ''}</div>
                        </div>
                    </div>
                </td>
                <td><div class="flex gap-1" style="flex-wrap:wrap;">${deptsDisplay}</div></td>
                <td><span class="badge badge-purple" style="font-size:11px;">${n.category || 'General'}</span></td>
                <td><span class="badge ${priorityBadge[n.priority] || 'badge-blue'}" style="font-size:10px; text-transform:uppercase;">${n.priority || 'standard'}</span></td>
                <td><span class="badge ${statusBadge[n.status] || 'badge-teal'}">${n.status || 'published'}</span></td>
                <td class="text-xs text-gray">${n.author?.name || n.department || 'Admin'}</td>
                <td class="text-xs text-gray">${dateStr}</td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-secondary btn-sm" onclick="previewNoticeCard('${n._id}')" title="Preview Live Notice">👁️</button>
                        <button class="btn btn-secondary btn-sm" onclick="togglePinNotice('${n._id}', ${n.isPinned})" title="${n.isPinned ? 'Unpin Notice' : 'Pin to Top'}">${n.isPinned ? '📍' : '📌'}</button>
                        ${n.status !== 'archived' ? `<button class="btn btn-secondary btn-sm" onclick="archiveNotice('${n._id}')" title="Archive Notice">📦</button>` : ''}
                        <button class="btn btn-danger btn-sm" onclick="deleteNotice('${n._id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAdminEvents() {
    const tbody = document.getElementById('adminEventsTbody');
    if (!tbody) return;

    let filtered = [...adminEventsData];
    if (currentPubFilter === 'drafts') {
        filtered = filtered.filter(e => e.status === 'draft');
    }
    if (currentPubSearch) {
        filtered = filtered.filter(e =>
            (e.title && e.title.toLowerCase().includes(currentPubSearch)) ||
            (e.description && e.description.toLowerCase().includes(currentPubSearch)) ||
            (e.category && e.category.toLowerCase().includes(currentPubSearch)) ||
            (e.department && e.department.toLowerCase().includes(currentPubSearch)) ||
            (e.venue && e.venue.toLowerCase().includes(currentPubSearch))
        );
    }

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray p-4">No matching events found.</td></tr>';
        return;
    }

    const stateBadges = {
        open: 'badge-teal',
        upcoming: 'badge-blue',
        closing_soon: 'badge-amber',
        fully_booked: 'badge-purple',
        completed: 'badge-gray',
        cancelled: 'badge-red'
    };

    tbody.innerHTML = filtered.map(e => {
        const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
        const timeStr = e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : (e.time || '10:00 AM');
        const regCount = e.registrations?.length || 0;
        const capacity = e.capacity || 100;
        const percent = Math.min(100, Math.round((regCount / capacity) * 100));

        return `
            <tr>
                <td>
                    <div class="fw-600 text-navy" style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.title}</div>
                    <div class="text-xs text-gray"><span class="badge badge-purple" style="font-size:10px;">${e.category || 'Workshop'}</span></div>
                </td>
                <td class="text-xs text-navy fw-600">${e.department || 'Campus'}</td>
                <td>
                    <div class="text-xs fw-600 text-navy">${dateStr}</div>
                    <div class="text-xs text-gray">${timeStr}</div>
                </td>
                <td class="text-xs text-gray">${e.venue || 'Campus Auditorium'}</td>
                <td>
                    <div style="min-width:110px;">
                        <div class="flex justify-between text-xs" style="margin-bottom:2px;">
                            <span class="fw-700 text-navy">${regCount} / ${capacity}</span>
                            <span class="text-gray">${percent}%</span>
                        </div>
                        <div style="background:#E2E8F0; height:5px; border-radius:99px; overflow:hidden;">
                            <div style="background:var(--action-blue); height:100%; width:${percent}%;"></div>
                        </div>
                    </div>
                </td>
                <td><span class="badge ${stateBadges[e.status] || 'badge-blue'}">${e.status ? e.status.replace('_', ' ') : 'upcoming'}</span></td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-secondary btn-sm" onclick="adminExportEventRegs('${e._id}')" title="Download Attendee List">📋</button>
                        ${e.status !== 'cancelled' ? `<button class="btn btn-danger btn-sm" onclick="adminCancelEvent('${e._id}')" title="Cancel Event">✕</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ─── Notice Modals & Actions ────────────────────────────────────────────────
function openCreateNoticeModal() {
    const form = document.getElementById('adminNoticeForm');
    if (form) form.reset();
    isDraftNoticeSubmission = false;
    renderTargetDeptsCheckboxes();
    showModal('createNoticeModal');
}

async function runAdminNoticeAi(action) {
    const bullets = document.getElementById('adminNoticeAiBullets').value.trim();
    const content = document.getElementById('adminNoticeContent').value.trim();
    const title = document.getElementById('adminNoticeTitle').value.trim();

    if (action === 'bullets_to_notice' && !bullets && !content) {
        showToast('Please enter some bullet points or notes first.', 'warning');
        return;
    }

    try {
        showToast('✨ AI is analyzing and drafting...', 'info');
        const res = await api.post('/notices/ai-assist', {
            action,
            bullets: bullets || content,
            content: content || bullets,
            title
        });

        if (res.success && res.data) {
            const d = res.data;
            if (d.content) document.getElementById('adminNoticeContent').value = d.content;
            if (d.title && !document.getElementById('adminNoticeTitle').value) {
                document.getElementById('adminNoticeTitle').value = d.title;
            }
            if (d.suggestedTitle) {
                document.getElementById('adminNoticeTitle').value = d.suggestedTitle;
            }
            if (d.extractedDates && d.extractedDates.length) {
                showToast(`Extracted dates: ${d.extractedDates.join(', ')}`, 'success');
            } else {
                showToast('✨ AI draft generated successfully!', 'success');
            }
        } else {
            showToast(res.message || 'AI assistant unavailable', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to AI assistant', 'error');
    }
}

function previewNoticeFromModal() {
    const title = document.getElementById('adminNoticeTitle').value.trim() || 'Untitled Notice';
    const dept = document.getElementById('adminNoticePublishingDept').value.trim() || 'Campus Authority';
    const category = document.getElementById('adminNoticeCategory').value;
    const priority = document.getElementById('adminNoticePriority').value;
    const content = document.getElementById('adminNoticeContent').value.trim() || 'Notice description will appear here...';
    const link = document.getElementById('adminNoticeLink').value.trim();

    const bodyEl = document.getElementById('previewNoticeBody');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <div class="notice-card" style="margin:0;">
            <div class="notice-card-header">
                <div class="flex items-center gap-2">
                    <span class="notice-category-pill">${category}</span>
                    <span class="priority-pill ${priority}">${priority}</span>
                </div>
                <div class="text-xs text-gray">Today (Preview)</div>
            </div>
            <div class="notice-title" style="margin-bottom:var(--sp-2);">${title}</div>
            <div class="notice-meta" style="margin-bottom:var(--sp-3);">
                <span>🏢 ${dept}</span>
                <span>🎓 All Batches</span>
            </div>
            <div class="notice-desc" style="white-space:pre-wrap; margin-bottom:var(--sp-4);">${content}</div>
            ${link ? `<a href="${link}" target="_blank" class="btn btn-primary btn-sm">Open Official Link ↗</a>` : ''}
        </div>
    `;

    showModal('previewNoticeModal');
}

function previewNoticeCard(id) {
    const notice = adminNoticesData.find(n => n._id === id);
    if (!notice) return;

    const bodyEl = document.getElementById('previewNoticeBody');
    if (!bodyEl) return;

    const dateStr = notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
    const deptsStr = (notice.departments && notice.departments.length) ? notice.departments.join(', ') : (notice.department || 'University-wide');

    bodyEl.innerHTML = `
        <div class="notice-card" style="margin:0;">
            <div class="notice-card-header">
                <div class="flex items-center gap-2">
                    <span class="notice-category-pill">${notice.category || 'General'}</span>
                    <span class="priority-pill ${notice.priority || 'standard'}">${notice.priority || 'standard'}</span>
                    ${notice.isPinned ? '<span class="badge badge-purple" style="font-size:10px;">📌 Pinned</span>' : ''}
                </div>
                <div class="text-xs text-gray">${dateStr}</div>
            </div>
            <div class="notice-title" style="margin-bottom:var(--sp-2);">${notice.title}</div>
            <div class="notice-meta" style="margin-bottom:var(--sp-3);">
                <span>🏢 ${notice.department || 'Campus'}</span>
                <span>🎯 Target: ${deptsStr}</span>
            </div>
            <div class="notice-desc" style="white-space:pre-wrap; margin-bottom:var(--sp-4);">${notice.description}</div>
            ${notice.link ? `<a href="${notice.link}" target="_blank" class="btn btn-primary btn-sm">Official Link ↗</a>` : ''}
            ${notice.attachmentUrl ? `<a href="${notice.attachmentUrl}" target="_blank" class="btn btn-secondary btn-sm" style="margin-left:8px;">View Attachment 📄</a>` : ''}
        </div>
    `;

    showModal('previewNoticeModal');
}

function saveNoticeAsDraft() {
    isDraftNoticeSubmission = true;
    document.getElementById('adminNoticeForm').requestSubmit();
}

async function handleAdminSubmitNotice(e) {
    e.preventDefault();

    const title = document.getElementById('adminNoticeTitle').value.trim();
    const department = document.getElementById('adminNoticePublishingDept').value.trim();
    const category = document.getElementById('adminNoticeCategory').value;
    const priority = document.getElementById('adminNoticePriority').value;
    const scope = document.getElementById('adminNoticeAudience').value;
    const description = document.getElementById('adminNoticeContent').value.trim();
    const link = document.getElementById('adminNoticeLink').value.trim();
    const attachmentUrl = document.getElementById('adminNoticeAttachment').value.trim();
    const isPinned = document.getElementById('adminNoticePinned').checked;

    // Collect target departments
    const selectedDepts = [];
    if (scope === 'university') {
        selectedDepts.push('ALL');
    } else {
        document.querySelectorAll('input[name="targetDept"]:checked').forEach(cb => selectedDepts.push(cb.value));
        if (!selectedDepts.length) selectedDepts.push('ALL');
    }

    // Collect eligible years
    const targetYears = [];
    document.querySelectorAll('input[name="targetYear"]:checked').forEach(cb => targetYears.push(Number(cb.value)));

    const payload = {
        title,
        description,
        department,
        departments: selectedDepts,
        targetYears: targetYears.length ? targetYears : [1, 2, 3, 4],
        category,
        priority,
        link,
        attachmentUrl,
        isPinned,
        status: isDraftNoticeSubmission ? 'draft' : 'published'
    };

    try {
        const res = await api.post('/notices', payload);
        if (res.success) {
            showToast(isDraftNoticeSubmission ? 'Notice saved as draft!' : 'Notice published & notifications dispatched!', 'success');
            closeModal('createNoticeModal');
            loadAdminPublishingData();
        } else {
            showToast(res.message || 'Failed to create notice', 'error');
        }
    } catch (err) {
        showToast('Error saving notice: ' + err.message, 'error');
    } finally {
        isDraftNoticeSubmission = false;
    }
}

async function togglePinNotice(id, currentlyPinned) {
    try {
        const res = await api.patch(`/notices/${id}/pin`, { isPinned: !currentlyPinned });
        if (res.success) {
            showToast(currentlyPinned ? 'Notice unpinned.' : 'Notice pinned to top of feed!', 'success');
            loadAdminPublishingData();
        }
    } catch (err) {
        showToast('Failed to update pinned state', 'error');
    }
}

async function archiveNotice(id) {
    try {
        const res = await api.patch(`/notices/${id}/archive`, {});
        if (res.success) {
            showToast('Notice archived.', 'info');
            loadAdminPublishingData();
        }
    } catch (err) {
        showToast('Failed to archive notice', 'error');
    }
}

async function deleteNotice(id) {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
        const res = await api.delete(`/notices/${id}`);
        if (res.success) {
            showToast('Notice deleted.', 'success');
            loadAdminPublishingData();
        }
    } catch (err) {
        showToast('Failed to delete notice', 'error');
    }
}

// ─── Event Modals & Actions ──────────────────────────────────────────────────
function openCreateEventModal() {
    const form = document.getElementById('adminEventForm');
    if (form) form.reset();
    isDraftEventSubmission = false;
    showModal('createEventModal');
}

async function runAdminEventAi(action) {
    const title = document.getElementById('adminEventTitle').value.trim();
    const category = document.getElementById('adminEventCategory').value;
    const dept = document.getElementById('adminEventDept').value.trim();
    const date = document.getElementById('adminEventDate').value;

    if (!title) {
        showToast('Please enter an event title first.', 'warning');
        return;
    }

    try {
        showToast('✨ AI is generating event description...', 'info');
        const res = await api.post('/events/ai-assist', {
            action,
            eventData: { title, category, department: dept, date }
        });

        if (res.success && res.data) {
            if (res.data.description) {
                document.getElementById('adminEventDescription').value = res.data.description;
                showToast('✨ Event description drafted!', 'success');
            } else if (res.data.caption) {
                document.getElementById('adminEventDescription').value += `\n\n📢 Social Caption:\n${res.data.caption}`;
                showToast('✨ Social caption generated and appended!', 'success');
            }
        }
    } catch (err) {
        showToast('AI assistance error', 'error');
    }
}

function saveEventAsDraft() {
    isDraftEventSubmission = true;
    document.getElementById('adminEventForm').requestSubmit();
}

async function handleAdminSubmitEvent(e) {
    e.preventDefault();

    const title = document.getElementById('adminEventTitle').value.trim();
    const department = document.getElementById('adminEventDept').value.trim();
    const category = document.getElementById('adminEventCategory').value;
    const date = document.getElementById('adminEventDate').value;
    const startTime = document.getElementById('adminEventStartTime').value;
    const endTime = document.getElementById('adminEventEndTime').value;
    const venue = document.getElementById('adminEventVenue').value.trim();
    const capacity = Number(document.getElementById('adminEventCapacity').value) || 100;
    const registrationDeadline = document.getElementById('adminEventDeadline').value || null;
    const eligibility = document.getElementById('adminEventEligibility').value.trim();
    const description = document.getElementById('adminEventDescription').value.trim();
    const posterUrl = document.getElementById('adminEventPoster').value.trim();

    const payload = {
        title,
        department,
        category,
        date,
        startTime,
        endTime,
        venue,
        capacity,
        registrationDeadline,
        eligibility,
        description,
        posterUrl,
        status: isDraftEventSubmission ? 'draft' : 'open'
    };

    try {
        const res = await api.post('/events', payload);
        if (res.success) {
            showToast(isDraftEventSubmission ? 'Event saved as draft.' : 'Event published with registration capacity controls!', 'success');
            closeModal('createEventModal');
            loadAdminPublishingData();
        } else {
            showToast(res.message || 'Failed to create event', 'error');
        }
    } catch (err) {
        showToast('Error saving event: ' + err.message, 'error');
    } finally {
        isDraftEventSubmission = false;
    }
}

async function adminCancelEvent(id) {
    const reason = prompt('Please provide reason for event cancellation (this will be sent to registered attendees):', 'Unforeseen campus schedule change');
    if (!reason) return;

    try {
        const res = await api.patch(`/events/${id}/status`, { status: 'cancelled', notes: reason });
        if (res.success) {
            showToast('Event marked cancelled and registered attendees notified.', 'info');
            loadAdminPublishingData();
        }
    } catch (err) {
        showToast('Failed to cancel event', 'error');
    }
}

function adminExportEventRegs(id) {
    const event = adminEventsData.find(e => e._id === id);
    if (!event) return;

    if (!event.registrations || !event.registrations.length) {
        showToast('No registrations recorded yet for this event.', 'info');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Student Name,Email,Registration Date\n';
    event.registrations.forEach(r => {
        const name = (r.student?.name || 'Student').replace(/,/g, '');
        const email = r.student?.email || 'N/A';
        const date = r.registeredAt ? new Date(r.registeredAt).toISOString() : '';
        csvContent += `${name},${email},${date}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendees_${event.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Registration attendee list downloaded.', 'success');
}

// ─── Lost & Found Moderation ────────────────────────────────────────────────
async function loadAdminModerationData() {
    try {
        const res = await api.get('/lostfound/admin/moderation');
        if (res.success) {
            adminLfData = res.data || [];
        }

        const total = adminLfData.length;
        const pendingClaims = adminLfData.filter(i => (i.claims || []).some(c => c.status === 'pending')).length;
        const atSecurity = adminLfData.filter(i => i.handedToSecurity).length;
        const returned = adminLfData.filter(i => i.status === 'returned').length;

        const elTot = document.getElementById('adminLfTotalCount');
        const elClm = document.getElementById('adminLfPendingClaimsCount');
        const elSec = document.getElementById('adminLfSecurityCount');
        const elRet = document.getElementById('adminLfReturnedCount');
        if (elTot) elTot.textContent = total;
        if (elClm) elClm.textContent = pendingClaims;
        if (elSec) elSec.textContent = atSecurity;
        if (elRet) elRet.textContent = returned;

        renderAdminModeration();
    } catch (err) {
        console.error('Failed to load moderation data:', err);
    }
}

function filterModerationView(mode, btn) {
    currentModFilter = mode;
    document.querySelectorAll('#tab-moderation .role-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminModeration();
}

function handleAdminLfSearch(val) {
    currentModSearch = (val || '').toLowerCase().trim();
    renderAdminModeration();
}

function renderAdminModeration() {
    const tbody = document.getElementById('adminModerationTbody');
    if (!tbody) return;

    let filtered = [...adminLfData];
    if (currentModFilter === 'claims') {
        filtered = filtered.filter(i => (i.claims || []).some(c => c.status === 'pending'));
    } else if (currentModFilter === 'lost') {
        filtered = filtered.filter(i => i.type === 'lost');
    } else if (currentModFilter === 'found') {
        filtered = filtered.filter(i => i.type === 'found');
    } else if (currentModFilter === 'sensitive') {
        filtered = filtered.filter(i => i.isSensitive);
    }

    if (currentModSearch) {
        filtered = filtered.filter(i =>
            (i.name && i.name.toLowerCase().includes(currentModSearch)) ||
            (i.category && i.category.toLowerCase().includes(currentModSearch)) ||
            (i.location && i.location.toLowerCase().includes(currentModSearch)) ||
            (i.description && i.description.toLowerCase().includes(currentModSearch))
        );
    }

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray p-4">No matching Lost & Found reports found.</td></tr>';
        return;
    }

    const statusBadge = {
        open: 'badge-blue',
        potential_match: 'badge-purple',
        claim_pending: 'badge-amber',
        returned: 'badge-teal',
        closed: 'badge-gray'
    };

    tbody.innerHTML = filtered.map(item => {
        const isLost = item.type === 'lost';
        const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';
        const pendingClaimsCount = (item.claims || []).filter(c => c.status === 'pending').length;
        const isHidden = item.moderation?.hidden;

        return `
            <tr style="${isHidden ? 'opacity:0.45; background:#FFF1F2;' : ''}">
                <td>
                    <div class="fw-600 text-navy" style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${item.name}
                    </div>
                    <div class="flex items-center gap-1" style="margin-top:2px;">
                        <span class="badge badge-gray" style="font-size:10px;">${item.category || 'Item'}</span>
                        ${item.isSensitive ? '<span class="badge badge-red" style="font-size:10px;" title="Confidential item: Identifying details redacted from students">🔒 Sensitive</span>' : ''}
                        ${isHidden ? '<span class="badge badge-red" style="font-size:10px;">Hidden Spam</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="lf-type-pill ${isLost ? 'lost' : 'found'}">${isLost ? 'LOST' : 'FOUND'}</span>
                </td>
                <td>
                    <div class="text-xs fw-600 text-navy">${item.location || 'Campus'}</div>
                    <div class="text-xs text-gray">${dateStr}</div>
                </td>
                <td>
                    <div class="text-xs fw-600 text-navy">${item.reportedBy?.name || 'Anonymous Student'}</div>
                    <div class="text-xs text-gray">${item.contactPreference || 'In-App Message'}</div>
                </td>
                <td>
                    ${item.handedToSecurity
                        ? '<span class="badge badge-teal" style="font-size:11px;">✓ Security Office</span>'
                        : `<span class="text-xs text-gray">${item.holdingLocation || 'With Finder'}</span>`}
                </td>
                <td>
                    <span class="badge ${statusBadge[item.status] || 'badge-blue'}">${item.status ? item.status.replace('_', ' ') : 'open'}</span>
                </td>
                <td>
                    ${pendingClaimsCount > 0
                        ? `<span class="badge badge-amber fw-700" style="cursor:pointer;" onclick="adminOpenReviewClaims('${item._id}')">⚠️ ${pendingClaimsCount} Pending</span>`
                        : `<span class="text-xs text-gray">${item.claims?.length || 0} claims</span>`}
                </td>
                <td>
                    <div class="flex gap-1" style="flex-wrap:wrap;">
                        ${pendingClaimsCount > 0 ? `<button class="btn btn-primary btn-sm" onclick="adminOpenReviewClaims('${item._id}')" title="Verify Claimant Identity">🛡️ Review</button>` : ''}
                        ${!item.handedToSecurity && item.type === 'found' ? `<button class="btn btn-secondary btn-sm" onclick="adminMarkReceivedBySecurity('${item._id}')" title="Mark handed to campus security">🏢 Security</button>` : ''}
                        ${item.status !== 'returned' ? `<button class="btn btn-secondary btn-sm" onclick="adminMarkReturned('${item._id}')" title="Mark returned to owner">✓ Return</button>` : ''}
                        ${!isHidden ? `<button class="btn btn-danger btn-sm" onclick="adminHideSpam('${item._id}')" title="Hide fraudulent / inappropriate report">🚫</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function adminOpenReviewClaims(itemId) {
    const item = adminLfData.find(i => i._id === itemId);
    if (!item) return;

    const modalBody = document.getElementById('reviewClaimModalBody');
    if (!modalBody) return;

    const pendingClaims = (item.claims || []).filter(c => c.status === 'pending');
    if (!pendingClaims.length) {
        showToast('No pending claims awaiting review on this item.', 'info');
        return;
    }

    const claim = pendingClaims[0]; // Review primary pending claim
    const claimDate = claim.createdAt ? new Date(claim.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';

    modalBody.innerHTML = `
        <div style="background:#F8FAFC; border:1px solid var(--gray-200); border-radius:var(--radius-lg); padding:var(--sp-4); margin-bottom:var(--sp-4);">
            <div class="flex justify-between items-center" style="margin-bottom:var(--sp-2);">
                <span class="badge badge-teal">${item.category}</span>
                <span class="text-xs text-gray">Found: ${item.location}</span>
            </div>
            <div class="fw-700 text-navy" style="font-size:var(--text-lg); margin-bottom:4px;">${item.name}</div>
            <div class="text-xs text-gray" style="line-height:1.5;">${item.description}</div>
        </div>

        <div style="border:1.5px solid #CBD5E1; border-radius:var(--radius-lg); padding:var(--sp-4); margin-bottom:var(--sp-4); background:white;">
            <div class="flex items-center justify-between" style="margin-bottom:var(--sp-3);">
                <div>
                    <div class="text-xs text-gray">Claimant:</div>
                    <div class="fw-700 text-navy">${claim.claimant?.name || 'Deep Das'} (${claim.claimant?.email || 'deep@campus.edu'})</div>
                </div>
                <div class="text-xs text-gray">Submitted: ${claimDate}</div>
            </div>

            <div style="margin-bottom:var(--sp-3);">
                <div class="text-xs fw-600 text-navy" style="margin-bottom:2px;">Claimant's Statement:</div>
                <div class="text-xs text-gray" style="background:#F1F5F9; padding:8px 12px; border-radius:var(--radius-md);">
                    ${claim.message || 'I left this item behind during my lecture.'}
                </div>
            </div>

            <div style="margin-bottom:var(--sp-3);">
                <div class="flex items-center gap-1 text-xs fw-700 text-navy" style="margin-bottom:4px; color:#BE123C;">
                    <span>🔒 Confidential Ownership Proof (Private):</span>
                </div>
                <div style="background:#FFF1F2; border:1px solid #FECDD3; border-radius:var(--radius-md); padding:10px 12px; font-size:var(--text-xs); color:#881337; line-height:1.5;">
                    ${claim.proofDetails || 'Serial number ending in 8942, scratch on lower volume rocker, custom silver case stickers.'}
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-2" style="margin-top:var(--sp-4);">
            <button class="btn btn-secondary" onclick="closeModal('reviewClaimModal')">Cancel</button>
            <button class="btn btn-danger" onclick="adminReviewClaimAction('${item._id}', '${claim._id}', 'reject')">✕ Reject Claim</button>
            <button class="btn btn-primary" style="background:#059669; border-color:#059669;" onclick="adminReviewClaimAction('${item._id}', '${claim._id}', 'approve')">✓ Verify & Approve Return</button>
        </div>
    `;

    showModal('reviewClaimModal');
}

async function adminReviewClaimAction(itemId, claimId, action) {
    try {
        const res = await api.post(`/lostfound/${itemId}/claims/${claimId}/review`, { action });
        if (res.success) {
            showToast(action === 'approve' ? 'Claim verified! Item marked returned & student notified.' : 'Claim rejected.', 'success');
            closeModal('reviewClaimModal');
            loadAdminModerationData();
        } else {
            showToast(res.message || 'Action failed', 'error');
        }
    } catch (err) {
        showToast('Error reviewing claim: ' + err.message, 'error');
    }
}

async function adminMarkReceivedBySecurity(id) {
    try {
        const res = await api.patch(`/lostfound/admin/moderation/${id}`, { receivedBySecurity: true });
        if (res.success) {
            showToast('Item received by Campus Security Room 104.', 'success');
            loadAdminModerationData();
        }
    } catch (err) {
        showToast('Failed to update holding location', 'error');
    }
}

async function adminMarkReturned(id) {
    if (!confirm('Mark this item as returned and resolved?')) return;
    try {
        const res = await api.patch(`/lostfound/${id}/status`, { status: 'returned' });
        if (res.success) {
            showToast('Item marked returned & resolved!', 'success');
            loadAdminModerationData();
        }
    } catch (err) {
        showToast('Failed to change status', 'error');
    }
}

async function adminHideSpam(id) {
    if (!confirm('Hide this item listing from public search?')) return;
    try {
        const res = await api.patch(`/lostfound/admin/moderation/${id}`, { hide: true, notes: 'Flagged by campus moderator' });
        if (res.success) {
            showToast('Item hidden from public view.', 'info');
            loadAdminModerationData();
        }
    } catch (err) {
        showToast('Failed to hide item', 'error');
    }
}

// ─── Departments & System Audit Logs ─────────────────────────────────────────
async function loadAdminDeptsData() {
    try {
        const res = await api.get('/departments');
        if (res.success) {
            adminDeptsData = res.data || [];
            renderAdminDepts();
        }
    } catch (err) {
        console.error('Failed to load departments:', err);
    }
}

function renderAdminDepts() {
    const tbody = document.getElementById('adminDeptsTbody');
    if (!tbody) return;

    if (!adminDeptsData.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray p-3">No departments configured</td></tr>';
        return;
    }

    tbody.innerHTML = adminDeptsData.map(d => `
        <tr>
            <td class="fw-700 text-navy">${d.code}</td>
            <td class="text-navy">${d.name}</td>
            <td class="text-xs text-gray">${d.coordinator || 'Department Head'}</td>
            <td><span class="badge ${d.isActive ? 'badge-teal' : 'badge-gray'}">${d.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="adminToggleDept('${d._id}', ${d.isActive})">
                    ${d.isActive ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleAdminCreateDept() {
    const code = document.getElementById('adminDeptCode').value.trim().toUpperCase();
    const name = document.getElementById('adminDeptName').value.trim();
    const coordinator = document.getElementById('adminDeptCoordinator').value.trim();

    if (!code || !name) {
        showToast('Please enter both Department Code and Name.', 'warning');
        return;
    }

    try {
        const res = await api.post('/departments', { code, name, coordinator });
        if (res.success) {
            showToast('Department registered successfully!', 'success');
            closeModal('addDeptModal');
            loadAdminDeptsData();
        } else {
            showToast(res.message || 'Failed to create department', 'error');
        }
    } catch (err) {
        showToast('Error registering department', 'error');
    }
}

async function adminToggleDept(id, currentActive) {
    try {
        const res = await api.patch(`/departments/${id}`, { isActive: !currentActive });
        if (res.success) {
            showToast(currentActive ? 'Department deactivated' : 'Department activated', 'info');
            loadAdminDeptsData();
        }
    } catch (err) {
        showToast('Failed to toggle department status', 'error');
    }
}

async function loadAdminAuditLogs(actionFilter = '') {
    const tbody = document.getElementById('adminAuditTbody');
    if (!tbody) return;

    try {
        const res = await api.get('/admin/audit-logs');
        let logs = (res.success && res.data) ? res.data : [];

        if (actionFilter) {
            logs = logs.filter(l => (l.action && l.action.toLowerCase().includes(actionFilter.toLowerCase())));
        }

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray p-4">No audit records available.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const timeStr = l.createdAt ? new Date(l.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
            const detailsStr = l.details ? (typeof l.details === 'object' ? JSON.stringify(l.details) : l.details) : '—';

            return `
                <tr>
                    <td class="text-xs text-gray mono">${timeStr}</td>
                    <td>
                        <div class="fw-600 text-navy">${l.actor?.name || 'Administrator'}</div>
                        <div class="text-xs text-gray">${l.actor?.role || 'admin'}</div>
                    </td>
                    <td><span class="badge badge-purple" style="font-size:10px;">${l.action || 'ACTION'}</span></td>
                    <td class="text-xs text-navy fw-600">${l.targetType || 'System'} ${l.targetId ? `(#${String(l.targetId).slice(-4)})` : ''}</td>
                    <td class="text-xs text-gray" style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${detailsStr}">${detailsStr}</td>
                    <td class="text-xs text-gray mono">${l.ip || '127.0.0.1'}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray p-4">Audit log records initialized.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const user = ensureAdminSession();
    if (!user) return;
    hydrateAdminIdentity(user);

    chartInited.overview = true; chartInit.overview();
    renderKnowledge();
    renderUsers(usersData);
});

