// ============================================================
//  CampusAI — alumni.js
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
    .slice(0, 2) || 'AL';
}

function getRolePage(role) {
  const pages = { student: 'student.html', librarian: 'librarian.html', admin: 'admin.html', alumni: 'alumni.html' };
  return pages[role] || 'index.html';
}

function ensureAlumniSession() {
  const user = api.getUser();
  if (!user?.role) {
    globalThis.location.href = 'index.html';
    return null;
  }
  if (user.role !== 'alumni') {
    globalThis.location.href = getRolePage(user.role);
    return null;
  }
  return user;
}

function hydrateAlumniIdentity(user) {
  const name = user.name || 'Alumni';
  const avatar = user.avatar || getInitials(name);
  const department = user.department || 'Alumni Network';

  const avatarEl = document.getElementById('alumniUserAvatar');
  const nameEl = document.getElementById('alumniUserName');
  const roleEl = document.getElementById('alumniUserRole');
  const greetingEl = document.getElementById('alumniGreeting');
  const subtitleEl = document.getElementById('alumniSubtitle');

  if (avatarEl) avatarEl.textContent = avatar;
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = `${department} · Alumni`;
  if (greetingEl) greetingEl.textContent = `Welcome back, ${name.split(' ')[0]}! 🌟`;
  if (subtitleEl) subtitleEl.textContent = `${department} · Alumni Member`;
}

const tabTitles = { dashboard: 'Dashboard', mentees: 'My Mentees', sessions: 'Sessions', referrals: 'Referrals', profile: 'My Profile' };
function switchTab(name, el) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const p = document.getElementById('tab-' + name); if (p) p.classList.add('active');
    if (el) el.classList.add('active');
    document.getElementById('topbarTitle').textContent = tabTitles[name] || 'Alumni Portal';
}
function switchSubSessions(sub, btn) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSessions(sub === 'upcoming');
}

// ── Data ──────────────────────────────────────────────────────
const mentees = [
    { initials: 'DD', name: 'Deep Das', degree: 'B.Tech CS — Year 3', jrs: 78, goals: ['System Design', 'DSA', 'Placement'], sessions: 8, nextSession: 'Feb 22, 2026', rating: 5.0, status: 'active' },
    { initials: 'RV', name: 'Rohan Verma', degree: 'B.Tech EC — Year 2', jrs: 61, goals: ['Python', 'ML Foundations'], sessions: 6, nextSession: 'Feb 25, 2026', rating: 4.8, status: 'active' },
    { initials: 'SJ', name: 'Sneha Joshi', degree: 'B.Tech ME — Year 4', jrs: 55, goals: ['MBA Prep', 'Resume Review'], sessions: 10, nextSession: 'Mar 1, 2026', rating: 5.0, status: 'active' },
];

function menteeCard(m) {
    return `
  <div class="mentee-card" onclick="switchTab('mentees',document.querySelector('[onclick*=mentees]'))">
    <div class="mentee-header">
      <div class="mentee-avatar">${m.initials}</div>
      <div>
        <div class="mentee-name">${m.name}</div>
        <div class="mentee-degree">${m.degree}</div>
      </div>
      <div class="mentee-jrs">
        <div class="jrs-mini-ring" style="position:relative;display:inline-flex">
          <svg width="48" height="48" style="transform:rotate(-90deg)">
            <circle cx="24" cy="24" r="18" fill="none" stroke="#E2E8F0" stroke-width="4"/>
            <circle cx="24" cy="24" r="18" fill="none" stroke="${m.jrs >= 70 ? '#059669' : m.jrs >= 50 ? '#2563EB' : '#F97316'}" stroke-width="4"
              stroke-dasharray="${2 * Math.PI * 18}" stroke-dashoffset="${2 * Math.PI * 18 * (1 - m.jrs / 100)}" stroke-linecap="round"/>
          </svg>
          <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:800;color:var(--navy)">${m.jrs}</span>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2" style="flex-wrap:wrap;gap:4px;margin-bottom:var(--sp-3)">
      ${m.goals.map(g => `<span class="chip chip-purple" style="font-size:11px">${g}</span>`).join('')}
    </div>
    <div class="flex justify-between text-xs text-gray" style="margin-bottom:var(--sp-2)">
      <span>Sessions: <strong>${m.sessions}</strong></span>
      <span>Next: <strong style="color:var(--action-blue)">${m.nextSession}</strong></span>
    </div>
    <div class="flex gap-2" style="margin-top:var(--sp-3)">
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="event.stopPropagation();showModal('scheduleModal')">Schedule</button>
      <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();showToast('Notes for ${m.name}','info')">Notes</button>
    </div>
  </div>`;
}

// ── Sessions Data ─────────────────────────────────────────────
const sessionsData = [
    { mentee: 'Deep Das', date: 'Feb 22, 2026', time: '11:00 AM', duration: '30 min', status: 'upcoming', notes: 'LLD: URL Shortener', rating: null },
    { mentee: 'Rohan Verma', date: 'Feb 25, 2026', time: '10:00 AM', duration: '30 min', status: 'upcoming', notes: 'Python OOP Deep Dive', rating: null },
    { mentee: 'Sneha Joshi', date: 'Mar 1, 2026', time: '11:30 AM', duration: '45 min', status: 'upcoming', notes: 'MBA SOP Review', rating: null },
    { mentee: 'Deep Das', date: 'Feb 15, 2026', time: '11:00 AM', duration: '30 min', status: 'completed', notes: 'Graph Algorithms', rating: '⭐⭐⭐⭐⭐' },
    { mentee: 'Rohan Verma', date: 'Feb 10, 2026', time: '10:00 AM', duration: '30 min', status: 'completed', notes: 'NumPy Basics', rating: '⭐⭐⭐⭐⭐' },
    { mentee: 'Sneha Joshi', date: 'Feb 8, 2026', time: '11:30 AM', duration: '45 min', status: 'completed', notes: 'Career roadmap', rating: '⭐⭐⭐⭐⭐' },
];

function renderSessions(upcoming = true) {
    const data = sessionsData.filter(s => (s.status === 'upcoming') === upcoming);
    document.getElementById('sessionsTbody').innerHTML = data.map(s => `
    <tr>
      <td class="fw-600 text-navy">${s.mentee}</td>
      <td><div class="fw-600">${s.date}</div><div class="text-xs text-gray">${s.time}</div></td>
      <td>${s.duration}</td>
      <td><span class="badge ${s.status === 'upcoming' ? 'badge-blue' : 'badge-teal'}">${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span></td>
      <td class="text-xs text-gray">${s.notes}</td>
      <td>${s.rating || '—'}</td>
      <td>
        ${s.status === 'upcoming'
            ? `<div class="flex gap-2"><button class="btn btn-primary btn-sm" onclick="showToast('Join link: meet.google.com/xyz','info')">Join</button><button class="btn btn-secondary btn-sm" onclick="showToast('Session cancelled','warning')">Cancel</button></div>`
            : `<div class="flex gap-2"><button class="btn btn-secondary btn-sm" onclick="showToast('Session notes viewed','info')">Notes</button></div>`}
      </td>
    </tr>`).join('');
}

// ── Referrals ─────────────────────────────────────────────────
const referralsData = [
    { candidate: 'Deep Das', company: 'Google India', role: 'SWE Intern 2026', referred: 'Feb 15, 2026', status: 'under_review', outcome: '—' },
    { candidate: 'Rohan Verma', company: 'Microsoft', role: 'SWE Intern 2026', referred: 'Jan 22, 2026', status: 'offered', outcome: 'Offer ₹18 LPA' },
    { candidate: 'Sneha Joshi', company: 'Flipkart', role: 'PM Intern 2026', referred: 'Jan 8, 2026', status: 'offered', outcome: 'Offer ₹12 LPA' },
    { candidate: 'Amit Bose', company: 'Amazon', role: 'SDE Intern 2026', referred: 'Dec 10, 2025', status: 'declined', outcome: 'Position on hold' },
];

function renderReferrals() {
    const statusMap = { under_review: 'badge-amber', offered: 'badge-teal', declined: 'badge-red' };
    const labelMap = { under_review: 'Under Review', offered: 'Offer Extended', declined: 'Declined' };
    document.getElementById('referralsTbody').innerHTML = referralsData.map(r => `
    <tr>
      <td class="fw-600 text-navy">${r.candidate}</td>
      <td>${r.company}</td>
      <td class="text-gray">${r.role}</td>
      <td class="text-gray">${r.referred}</td>
      <td><span class="badge ${statusMap[r.status]}">${labelMap[r.status]}</span></td>
      <td class="fw-600 ${r.status === 'offered' ? 'text-teal' : 'text-gray'}">${r.outcome}</td>
    </tr>`).join('');
}

// ── Upcoming Sessions Widget ──────────────────────────────────
function renderUpcomingSessions() {
    const up = sessionsData.filter(s => s.status === 'upcoming').slice(0, 3);
    document.getElementById('upcomingSessions').innerHTML = up.map(s => `
    <div style="padding:var(--sp-3) 0;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:var(--sp-3)">
      <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--blue-muted);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
        <span style="font-size:9px;font-weight:700;color:var(--action-blue)">${s.date.split(' ')[0].toUpperCase()}</span>
        <span style="font-size:16px;font-weight:800;color:var(--navy);line-height:1.1">${s.date.split(' ')[1].replace(',', '')}</span>
      </div>
      <div style="flex:1">
        <div class="fw-600 text-navy text-sm">${s.mentee}</div>
        <div class="text-xs text-gray">${s.time} · ${s.notes}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showToast('Join link: meet.google.com/abc','info')">Join</button>
    </div>`).join('');
}

// ── Impact Score Ring ─────────────────────────────────────────
function renderImpactRing() {
    const canvas = document.getElementById('impactRing');
    if (!canvas) return;
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            datasets: [{ data: [87, 13], backgroundColor: ['#A78BFA', 'rgba(255,255,255,0.15)'], borderWidth: 0, hoverOffset: 0 }]
        },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false }, legend: { display: false } }, animation: { duration: 800 } }
    });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = ensureAlumniSession();
  if (!user) return;
  hydrateAlumniIdentity(user);

    renderImpactRing();

    const dashGrid = document.getElementById('menteeDashGrid');
    const menteeGrid = document.getElementById('menteeGrid');
    if (dashGrid) dashGrid.innerHTML = mentees.map(menteeCard).join('');
    if (menteeGrid) menteeGrid.innerHTML = mentees.map(menteeCard).join('');

    renderUpcomingSessions();
    renderSessions(true);
    renderReferrals();

    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
    });
});
