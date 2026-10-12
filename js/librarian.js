// ============================================================
//  CampusAI — librarian.js
// ============================================================

// ── Shared Utilities ──────────────────────────────────────────
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
        .slice(0, 2) || 'LB';
}

function getRolePage(role) {
    const pages = { student: 'student.html', librarian: 'librarian.html', admin: 'admin.html', alumni: 'alumni.html' };
    return pages[role] || 'index.html';
}

function ensureLibrarianSession() {
    const user = api.getUser();
    if (!user?.role) {
        globalThis.location.href = 'index.html';
        return null;
    }
    if (user.role !== 'librarian') {
        globalThis.location.href = getRolePage(user.role);
        return null;
    }
    return user;
}

function hydrateLibrarianIdentity(user) {
    const name = user.name || 'Librarian';
    const role = user.department || 'Head Librarian';
    const avatar = user.avatar || getInitials(name);

    const avatarEl = document.getElementById('librarianUserAvatar');
    const nameEl = document.getElementById('librarianUserName');
    const roleEl = document.getElementById('librarianUserRole');

    if (avatarEl) avatarEl.textContent = avatar;
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = role;
}

function switchTab(name, el) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const panel = document.getElementById('tab-' + name);
    if (panel) panel.classList.add('active');
    if (el) el.classList.add('active');
    const titles = { scan: 'Scan & Issue', issues: 'Active Issues', returns: 'Returns', fines: 'Fine Management', reservations: 'Reservations', inventory: 'Book Inventory', analytics: 'Library Analytics', auditlog: 'Audit Log' };
    document.getElementById('topbarTitle').textContent = titles[name] || 'Librarian Console';
    if (name === 'analytics') initAnalyticsCharts();
}

// ── Scanner ──────────────────────────────────────────────────
let currentScanMode = 'issue';
function openScanner(mode) {
    currentScanMode = mode;
    document.getElementById('scannerTitle').textContent = mode === 'issue' ? '📤 Issue Book — Scan Barcodes' : '📥 Return Book — Scan Barcode';
    document.getElementById('scannerModal').classList.add('open');
}
function closeScannerModal() { document.getElementById('scannerModal').classList.remove('open'); }
function closeConfirmModal() {
    document.getElementById('issueConfirmModal').classList.remove('open');
    showToast('Ready for next transaction', 'info');
}

function simulateScan() {
    closeScannerModal();
    setTimeout(() => {
        if (currentScanMode === 'issue') {
            document.getElementById('issueConfirmModal').classList.add('open');
        } else {
            processReturn();
        }
    }, 400);
}

// ── Issue / Return ────────────────────────────────────────────
function lookupStudent() {
    const roll = document.getElementById('studentRoll').value;
    if (!roll) { showToast('Enter Roll Number', 'warning'); return; }
    document.getElementById('studentPreview').style.display = 'block';
    showToast('Student found: Deep Das', 'success');
}

function issueBook() {
    const isbn = document.getElementById('bookISBN').value;
    if (!isbn) { showToast('Enter book ISBN', 'warning'); return; }
    document.getElementById('issueConfirmModal').classList.add('open');
    addAuditRow({ ts: new Date().toLocaleString(), action: 'BOOK_ISSUED', by: 'Kavita Patel', target: 'Deep Das (CS/2024/047)', detail: 'CLRS: ISBN 978-0262033848' });
}

function processReturn() {
    const resultCard = document.getElementById('returnResult');
    const resultContent = document.getElementById('returnResultContent');
    if (!resultCard || !resultContent) return;
    resultCard.style.display = 'block';
    resultContent.innerHTML = `
    <div style="text-align:center;margin-bottom:var(--sp-4)"><span style="font-size:48px">📥</span></div>
    <div class="issue-detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
      <div class="issue-detail-item"><div class="issue-detail-label">Student</div><div class="issue-detail-value">Deep Das</div></div>
      <div class="issue-detail-item"><div class="issue-detail-label">Book</div><div class="issue-detail-value">CLRS Algorithms</div></div>
      <div class="issue-detail-item"><div class="issue-detail-label">Days Overdue</div><div class="issue-detail-value" style="color:var(--red)">3 days</div></div>
      <div class="issue-detail-item"><div class="issue-detail-label">Fine Due</div><div class="issue-detail-value" style="color:var(--red)">₹6.00</div></div>
    </div>
    <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-4)">
      <button class="btn btn-primary" style="flex:1" onclick="showToast('Fine of ₹6 collected!','success')">Collect Fine</button>
      <button class="btn btn-secondary" onclick="showToast('Fine waived. Audit recorded.','info')">Waive Fine</button>
    </div>`;
    showToast('Book return processed', 'success');
    addAuditRow({ ts: new Date().toLocaleString(), action: 'BOOK_RETURNED', by: 'Kavita Patel', target: 'Deep Das', detail: 'CLRS — Fine: ₹6' });
}

// ── Issues Data ───────────────────────────────────────────────
const issuesData = [
    { student: 'Deep Das', roll: 'CS/2024/047', book: 'Introduction to Algorithms', issued: 'Feb 3, 2026', due: 'Feb 17, 2026', daysLeft: -3, fine: '₹6', status: 'overdue' },
    { student: 'Rohan Verma', roll: 'EC/2024/112', book: 'Signals & Systems (Oppenheim)', issued: 'Feb 10, 2026', due: 'Feb 24, 2026', daysLeft: 4, fine: '₹0', status: 'ok' },
    { student: 'Sneha Joshi', roll: 'ME/2024/09', book: 'Engineering Thermodynamics', issued: 'Feb 5, 2026', due: 'Feb 19, 2026', daysLeft: -1, fine: '₹2', status: 'overdue' },
    { student: 'Amit Bose', roll: 'CS/2024/078', book: 'DBMS (Silberschatz)', issued: 'Feb 12, 2026', due: 'Feb 26, 2026', daysLeft: 6, fine: '₹0', status: 'ok' },
    { student: 'Priya Das', roll: 'IT/2024/033', book: 'Computer Networks (Forouzan)', issued: 'Feb 15, 2026', due: 'Mar 1, 2026', daysLeft: 9, fine: '₹0', status: 'ok' },
    { student: 'Kunal Shah', roll: 'CS/2024/055', book: 'The Algorithm Design Manual', issued: 'Feb 1, 2026', due: 'Feb 15, 2026', daysLeft: -5, fine: '₹10', status: 'overdue' },
];

function renderIssues(data) {
    document.getElementById('issuesTbody').innerHTML = data.map(r => `
    <tr class="${r.status === 'overdue' ? 'row-overdue' : ''}">
      <td><div class="fw-700 text-navy">${r.student}</div><div class="text-xs mono text-gray">${r.roll}</div></td>
      <td>${r.book}</td><td>${r.issued}</td><td>${r.due}</td>
      <td><span class="badge ${r.daysLeft < 0 ? 'badge-red' : r.daysLeft <= 2 ? 'badge-amber' : 'badge-teal'}">${r.daysLeft < 0 ? Math.abs(r.daysLeft) + ' days overdue' : r.daysLeft + ' days left'}</span></td>
      <td><span class="badge ${r.fine === '₹0' ? 'badge-teal' : 'badge-red'}">${r.fine}</span></td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="showToast('Renewal sent for ${r.student}','success')">Renew</button>
          ${r.status === 'overdue' ? `<button class="btn btn-danger btn-sm" onclick="showToast('Overdue notice sent!','warning')">Notify</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}
function filterIssues() { renderIssues(issuesData); }

// ── Fines ─────────────────────────────────────────────────────
const finesData = [
    { student: 'Deep Das', roll: 'CS/2024/047', book: 'CLRS Algorithms', days: 3, amount: '₹6', status: 'unpaid' },
    { student: 'Kunal Shah', roll: 'CS/2024/055', book: 'Algorithm Design Manual', days: 5, amount: '₹10', status: 'unpaid' },
    { student: 'Sneha Joshi', roll: 'ME/2024/09', book: 'Engineering Thermodynamics', days: 1, amount: '₹2', status: 'unpaid' },
    { student: 'Rohan Verma', roll: 'EC/2024/112', book: 'Circuit Analysis', days: 8, amount: '₹16', status: 'paid' },
    { student: 'Priya Das', roll: 'IT/2024/033', book: 'Discrete Mathematics', days: 4, amount: '₹8', status: 'waived' },
];

function renderFines() {
    document.getElementById('finesTbody').innerHTML = finesData.map(f => `
    <tr>
      <td><div class="fw-700 text-navy">${f.student}</div><div class="text-xs mono text-gray">${f.roll}</div></td>
      <td>${f.book}</td><td>${f.days} days</td><td class="fw-700 text-red">${f.amount}</td>
      <td><span class="badge ${f.status === 'paid' ? 'badge-teal' : f.status === 'waived' ? 'badge-gray' : 'badge-red'}">${f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span></td>
      <td>
        ${f.status === 'unpaid' ? `
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="showToast('Fine marked paid!','success')">Mark Paid</button>
            <button class="btn btn-secondary btn-sm" onclick="showToast('Fine waived. Recorded.','info')">Waive</button>
          </div>` : '—'}
      </td>
    </tr>`).join('');
}

// ── Reservations ──────────────────────────────────────────────
const reservesData = [
    { student: 'Deep Das', roll: 'CS/2024/047', book: 'The Pragmatic Programmer', reserved: 'Feb 19, 2026', expires: 'Feb 21, 2026', status: 'expiring' },
    { student: 'Rohan Verma', roll: 'EC/2024/112', book: 'Digital Electronics (Morris Mano)', reserved: 'Feb 17, 2026', expires: 'Feb 19, 2026', status: 'expired' },
    { student: 'Priya Das', roll: 'IT/2024/033', book: 'Database Management (Ramakrishnan)', reserved: 'Feb 18, 2026', expires: 'Feb 22, 2026', status: 'active' },
];

function renderReserves() {
    document.getElementById('reservesTbody').innerHTML = reservesData.map(r => `
    <tr>
      <td><div class="fw-700 text-navy">${r.student}</div><div class="text-xs mono text-gray">${r.roll}</div></td>
      <td>${r.book}</td><td>${r.reserved}</td>
      <td style="${r.status === 'expired' ? 'color:var(--red);' : r.status === 'expiring' ? 'color:var(--amber);' : ''} font-weight:600">${r.expires}</td>
      <td><span class="badge ${r.status === 'active' ? 'badge-teal' : r.status === 'expiring' ? 'badge-amber' : 'badge-red'}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
      <td>
        <div class="flex gap-2">
          ${r.status !== 'expired' ? `<button class="btn btn-primary btn-sm" onclick="showToast('Book marked as issued from reservation!','success')">Issue Now</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="showToast('Reservation cancelled.','info')">Cancel</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Inventory ─────────────────────────────────────────────────
const inventoryData = [
    { title: 'Introduction to Algorithms (CLRS)', author: 'Cormen et al.', isbn: '978-0262033848', copies: 8, avail: 6, shelf: 'CS-A1' },
    { title: 'Design Patterns', author: 'Gang of Four', isbn: '978-0201633610', copies: 5, avail: 4, shelf: 'CS-A2' },
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', copies: 6, avail: 3, shelf: 'CS-A3' },
    { title: 'Deep Learning', author: 'Ian Goodfellow', isbn: '978-0262035613', copies: 4, avail: 0, shelf: 'AI-C1' },
    { title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', isbn: '978-0135957059', copies: 3, avail: 2, shelf: 'CS-B2' },
];

function renderInventory() {
    document.getElementById('inventoryTbody').innerHTML = inventoryData.map(b => `
    <tr>
      <td class="fw-600 text-navy">${b.title}</td>
      <td>${b.author}</td>
      <td class="mono text-gray" style="font-size:11px">${b.isbn}</td>
      <td class="fw-700 text-center">${b.copies}</td>
      <td><span class="badge ${b.avail === 0 ? 'badge-red' : b.avail < b.copies / 2 ? 'badge-amber' : 'badge-teal'}">${b.avail}</span></td>
      <td class="mono" style="font-size:var(--text-sm)">${b.shelf}</td>
      <td><div class="flex gap-2"><button class="btn btn-secondary btn-sm" onclick="showToast('Edit mode for book','info')">Edit</button></div></td>
    </tr>`).join('');
}

// ── Audit Log ─────────────────────────────────────────────────
const auditLog = [
    { ts: '2026-02-20 09:15:32', action: 'BOOK_ISSUED', by: 'Kavita Patel', target: 'Deep Das', detail: 'CLRS → ACC-00847' },
    { ts: '2026-02-20 09:02:11', action: 'FINE_WAIVED', by: 'Kavita Patel', target: 'Priya Das (IT/2024/033)', detail: '₹8 waived — policy' },
    { ts: '2026-02-20 08:48:05', action: 'BOOK_RETURNED', by: 'Self-Service', target: 'Sneha Joshi', detail: 'CLRS returned — Fine: ₹6' },
    { ts: '2026-02-19 16:30:22', action: 'BOOK_ISSUED', by: 'Ravi Kumar', target: 'Amit Bose', detail: 'DBMS → ACC-01205' },
    { ts: '2026-02-19 14:12:44', action: 'FINE_PAID', by: 'Cashier Desk', target: 'Rohan Verma', detail: '₹16 paid — Circuit Analysis' },
    { ts: '2026-02-19 11:05:00', action: 'RESERVATION_EXPIRED', by: 'SYSTEM', target: 'Rohan Verma', detail: 'Morris Mano — 24h limit exceeded' },
];

function addAuditRow(row) {
    auditLog.unshift(row);
    renderAuditLog();
}

function renderAuditLog() {
    document.getElementById('auditTbody').innerHTML = auditLog.map(a => {
        const color = a.action.includes('ISSUED') ? 'badge-blue' : a.action.includes('RETURNED') ? 'badge-teal' : a.action.includes('WAIVED') ? 'badge-amber' : a.action.includes('PAID') ? 'badge-purple' : 'badge-gray';
        return `<tr>
      <td class="mono text-gray" style="font-size:11px;white-space:nowrap">${a.ts}</td>
      <td><span class="badge ${color} audit-row-action">${a.action}</span></td>
      <td>${a.by}</td><td>${a.target}</td><td class="text-xs text-gray">${a.detail}</td>
    </tr>`;
    }).join('');
}

// ── Analytics Charts ──────────────────────────────────────────
let chartsInited = false;
function initAnalyticsCharts() {
    if (chartsInited) return;
    chartsInited = true;

    new Chart(document.getElementById('issueChart'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                { label: 'Issues', data: [18, 24, 21, 28, 30, 14, 8], borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4, fill: true, pointRadius: 5 },
                { label: 'Returns', data: [12, 20, 19, 24, 22, 18, 5], borderColor: '#0F766E', backgroundColor: 'rgba(15,118,110,0.07)', tension: 0.4, fill: true, pointRadius: 5 }
            ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
    });

    new Chart(document.getElementById('deptChart'), {
        type: 'doughnut',
        data: {
            labels: ['Computer Science', 'Electronics', 'Mechanical', 'IT', 'Others'],
            datasets: [{ data: [42, 22, 18, 12, 6], backgroundColor: ['#2563EB', '#0F766E', '#B45309', '#7C3AED', '#94A3B8'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } } }
    });

    new Chart(document.getElementById('fineChart'), {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ label: 'Fines Collected (₹)', data: [840, 920, 760, 1240], backgroundColor: 'rgba(180,83,9,0.8)', borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }
    });

    const topBooksEl = document.getElementById('topBooks');
    const top = [
        { title: 'CLRS Algorithms', count: 32, pct: 100 },
        { title: 'The Pragmatic Programmer', count: 28, pct: 87 },
        { title: 'System Design Interview', count: 25, pct: 78 },
        { title: 'Clean Code', count: 21, pct: 65 },
        { title: 'Deep Learning (Goodfellow)', count: 18, pct: 56 },
    ];
    topBooksEl.innerHTML = top.map((b, i) => `
    <div class="flex items-center gap-3">
      <span style="width:24px;height:24px;border-radius:50%;background:var(--blue-muted);color:var(--action-blue);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center">${i + 1}</span>
      <div style="flex:1">
        <div class="text-sm fw-600 text-navy">${b.title}</div>
        <div class="progress" style="height:5px;margin-top:4px"><div class="progress-bar progress-blue" style="width:${b.pct}%"></div></div>
      </div>
      <span class="badge badge-blue">${b.count}</span>
    </div>`).join('');
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = ensureLibrarianSession();
    if (!user) return;
    hydrateLibrarianIdentity(user);

    // Default due date = 14 days from today
    const d = new Date(); d.setDate(d.getDate() + 14);
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) dueDateInput.value = d.toISOString().split('T')[0];

    renderIssues(issuesData);
    renderFines();
    renderReserves();
    renderInventory();
    renderAuditLog();
});
