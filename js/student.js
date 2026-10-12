// ============================================================
//  CampusAI — student.js  (Student Dashboard Logic)
// ============================================================

// ── Shared Utilities ──────────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
    toast.innerHTML = `<span style="font-size:20px">${icons[type] || 'ℹ️'}</span><div><div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div><div class="toast-msg">${message}</div></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

let currentStudentUser = {
    name: 'Student User',
    role: 'student',
    department: 'Student',
    year: null
};

function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0].toUpperCase())
        .join('')
        .slice(0, 2) || 'ST';
}

function getRolePage(role) {
    const pages = { student: 'student.html', librarian: 'librarian.html', admin: 'admin.html', alumni: 'alumni.html' };
    return pages[role] || 'index.html';
}

function ensureStudentSession() {
    const user = api.getUser();
    if (!user?.role) {
        globalThis.location.href = 'index.html';
        return null;
    }
    if (user.role !== 'student') {
        globalThis.location.href = getRolePage(user.role);
        return null;
    }
    currentStudentUser = user;
    return user;
}

function hydrateStudentIdentity(user) {
    const name = user.name || 'Student';
    const department = user.department || 'Student';
    const year = user.year ? `Year ${user.year}` : 'Student';
    const avatar = user.avatar || getInitials(name);

    const avatarEl = document.getElementById('studentUserAvatar');
    const nameEl = document.getElementById('studentUserName');
    const roleEl = document.getElementById('studentUserRole');
    const greetingEl = document.getElementById('studentGreeting');
    const chatWelcomeEl = document.getElementById('studentChatWelcome');

    if (avatarEl) avatarEl.textContent = avatar;
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = `${department} · ${year}`;
    if (greetingEl) greetingEl.textContent = `Good morning, ${name.split(' ')[0]} 👋`;
    if (chatWelcomeEl) {
        chatWelcomeEl.innerHTML = `Hello ${name.split(' ')[0]}! 👋 I'm your Campus AI Assistant, powered by RAG (Retrieval-Augmented Generation). I can answer questions about:<br /><br />• Exam schedules and academic calendar<br />• Library policies and timings<br />• Placement & career guidance<br />• Hostel & campus facilities<br />• Department contacts and offices<br /><br />What would you like to know today?`;
    }
}

function logout() {
    if (confirm('Sign out of CampusAI?')) globalThis.location.href = 'index.html';
}

// ── Navigation ─────────────────────────────────────────────────
function switchTab(name, el) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const panel = document.getElementById('tab-' + name);
    if (panel) panel.classList.add('active');
    if (el) el.classList.add('active');
    const titles = {
        home: 'Dashboard',
        updates: 'Campus Updates',
        lostfound: 'Lost & Found',
        library: 'SmartLib',
        career: 'Career Engine',
        mentorship: 'MentorNet',
        chat: 'Campus Assistant',
        connect: 'Student Connect',
        attendance: 'Attendance Tracking',
        notifications: 'Notification Center'
    };
    document.getElementById('topbarTitle').textContent = titles[name] || 'CampusAI';

    if (name === 'updates') loadCampusUpdates();
    if (name === 'lostfound') loadLostFoundItems();
    if (name === 'notifications') loadNotifications();
}

function switchSubTab(name, btn, groupClass) {
    const parent = btn.closest('.tab-panel') || document;
    parent.querySelectorAll('.' + groupClass).forEach(p => p.classList.remove('active'));
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(groupClass.replace('-sub', '') + '-' + name);
    if (target) target.classList.add('active');
    btn.classList.add('active');
}

// ── Mobile Sidebar ─────────────────────────────────────────────
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('backdrop').classList.toggle('visible');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('backdrop').classList.remove('visible');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// ── JRS Gauge (Half-Donut) ────────────────────────────────────
function drawJRSGauge() {
    const canvas = document.getElementById('jrsGauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const score = 74;
    const cx = 70, cy = 80, r = 60;
    ctx.clearRect(0, 0, 140, 80);
    // Background arc
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineCap = 'round'; ctx.stroke();
    // Score arc
    const endAngle = Math.PI + (score / 100) * Math.PI;
    const grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    grad.addColorStop(0, '#60A5FA'); grad.addColorStop(1, '#34D399');
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, endAngle);
    ctx.lineWidth = 14; ctx.strokeStyle = grad; ctx.lineCap = 'round'; ctx.stroke();
}

// ── Readiness Radar Chart ─────────────────────────────────────
function drawReadinessChart() {
    const canvas = document.getElementById('readinessChart');
    if (!canvas) return;
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Academic\nFoundation', 'Skills\nDepth', 'Project\nPortfolio', 'Practical\nExperience', 'Resume\nQuality'],
            datasets: [
                { label: 'Your Score', data: [80, 68, 75, 60, 82], backgroundColor: 'rgba(37,99,235,0.85)', borderRadius: 6, borderSkipped: false },
                { label: 'Target (100)', data: [100, 100, 100, 100, 100], backgroundColor: 'rgba(37,99,235,0.08)', borderRadius: 6, borderSkipped: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 12, family: 'Inter' }, padding: 16 } } },
            scales: {
                y: { max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

// ── ATS Ring Chart ────────────────────────────────────────────
function drawATSRing() {
    const canvas = document.getElementById('atsRing');
    if (!canvas) return;
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            datasets: [{ data: [82, 18], backgroundColor: ['#2563EB', '#F1F5F9'], borderWidth: 0, circumference: 270, rotation: 225 }]
        },
        options: { cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
}

// ── Book Grid Data ────────────────────────────────────────────
const books = [
    { emoji: '📙', color: '#FEF3C7', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', subject: 'CS', avail: true, shelf: 'CS-A2' },
    { emoji: '📘', color: '#DBEAFE', title: 'System Design Interview', author: 'Alex Xu', subject: 'CS', avail: true, shelf: 'CS-B1' },
    { emoji: '📕', color: '#FEE2E2', title: 'Deep Learning', author: 'Goodfellow et al.', subject: 'AI/ML', avail: false, shelf: 'AI-C3' },
    { emoji: '📗', color: '#D1FAE5', title: 'Python for Data Analysis', author: 'Wes McKinney', subject: 'CS', avail: true, shelf: 'CS-A4' },
    { emoji: '📓', color: '#EDE9FE', title: 'Designing Data-Intensive Apps', author: 'Martin Kleppmann', subject: 'CS', avail: true, shelf: 'CS-D2' },
    { emoji: '📒', color: '#FDF4FF', title: 'Atomic Habits', author: 'James Clear', subject: 'Personal Dev', avail: true, shelf: 'PD-E1' },
    { emoji: '📔', color: '#E0F2FE', title: 'The Algorithm Design Manual', author: 'Skiena', subject: 'CS', avail: false, shelf: 'CS-A7' },
    { emoji: '📃', color: '#FFF7ED', title: 'Operating System Concepts', author: 'Silberschatz', subject: 'CS', avail: true, shelf: 'CS-B3' },
];

function renderBooks(list) {
    document.getElementById('bookGrid').innerHTML = list.map(b => `
    <div class="book-card" onclick="showToast('Book details: ${b.title}','info')">
      <div class="book-cover" style="background:${b.color}">${b.emoji}
        <span class="avail-badge ${b.avail ? 'avail' : 'unavail'}">${b.avail ? 'Available' : 'Issued'}</span>
      </div>
      <div class="book-info">
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.author}</div>
        <div class="book-meta">
          <span class="chip chip-blue" style="font-size:10px">${b.subject}</span>
          <span class="book-shelf mono">${b.shelf}</span>
        </div>
      </div>
    </div>`).join('');
}

function filterBooks() {
    const q = document.getElementById('bookSearch').value.toLowerCase();
    renderBooks(books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)));
}

// ── Tech Skills ────────────────────────────────────────────────
const techSkills = [
    { name: 'Python', level: 'Advanced', color: '#2563EB', pct: 85, verified: true },
    { name: 'React / Next.js', level: 'Intermediate', color: '#0EA5E9', pct: 70, verified: true },
    { name: 'PostgreSQL', level: 'Intermediate', color: '#6366F1', pct: 60, verified: false },
    { name: 'Machine Learning', level: 'Beginner', color: '#7C3AED', pct: 40, verified: false },
    { name: 'FastAPI', level: 'Intermediate', color: '#0F766E', pct: 65, verified: true },
    { name: 'Docker', level: 'Beginner', color: '#0369A1', pct: 30, verified: false },
];
const softSkills = [
    { name: 'Communication', level: 'Advanced', color: '#B45309', pct: 90, verified: true },
    { name: 'Problem Solving', level: 'Advanced', color: '#059669', pct: 88, verified: true },
    { name: 'Team Leadership', level: 'Intermediate', color: '#DC2626', pct: 65, verified: false },
    { name: 'Data Structures', level: 'Advanced', color: '#2563EB', pct: 80, verified: true },
];

function renderSkills(skills, containerId) {
    document.getElementById(containerId).innerHTML = skills.map((s, i) => `
    <li class="skill-item">
      <span class="skill-name">${s.name} ${s.verified ? '<span class="badge badge-teal" style="font-size:10px;padding:1px 6px">✓</span>' : ''}</span>
      <div class="skill-level"><div class="skill-fill" style="width:${s.pct}%;background:${s.color}"></div></div>
      <span class="skill-badge">${s.level}</span>
      <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; margin-left: 8px; color: var(--red); opacity: 0.7;" onclick="deleteSkill('${containerId}', ${i})" title="Delete Skill">✕</button>
    </li>`).join('');
}

function deleteSkill(containerId, index) {
    if (containerId === 'techSkillsList') {
        techSkills.splice(index, 1);
        renderSkills(techSkills, containerId);
    } else {
        softSkills.splice(index, 1);
        renderSkills(softSkills, containerId);
    }
    
    // Update Student Connect grid to reflect the removed skill
    const currentSearch = document.getElementById('studentConnectSearch');
    if (currentSearch) {
        renderStudentConnect(currentSearch.value);
    }
    showToast('Skill deleted.', 'info');
}

function addSkill() {
    const nameInput = document.getElementById('newSkillName');
    const catSelect = document.getElementById('newSkillCategory');
    const ratSelect = document.getElementById('newSkillRating');

    const name = nameInput.value.trim();
    if (!name) {
        showToast('Please enter a skill name.', 'error');
        return;
    }

    const colorMap = { 'Technical': '#0EA5E9', 'Soft Skill': '#059669', 'Domain': '#7C3AED' };
    const pctMap = { 'Beginner': 30, 'Intermediate': 60, 'Advanced': 85, 'Expert': 100 };

    const newSkill = {
        name: name,
        level: ratSelect.value,
        color: colorMap[catSelect.value] || '#2563EB',
        pct: pctMap[ratSelect.value] || 50,
        verified: false
    };

    if (catSelect.value === 'Technical') {
        techSkills.push(newSkill);
        renderSkills(techSkills, 'techSkillsList');
    } else {
        softSkills.push(newSkill);
        renderSkills(softSkills, 'softSkillsList');
    }

    nameInput.value = '';
    closeModal('addSkillModal');
    
    // Also update Student Connect grid so the user sees their new skill there
    const currentSearch = document.getElementById('studentConnectSearch');
    if (currentSearch) {
        renderStudentConnect(currentSearch.value);
    }
    
    showToast('Skill added! Portfolio updated.', 'success');
}

// ── Projects ───────────────────────────────────────────────────
const projects = [
    { title: 'CampusConnect — Event Management App', desc: 'Full-stack Next.js + FastAPI app for managing college events with real-time updates and RBAC.', stack: ['Next.js', 'FastAPI', 'PostgreSQL', 'Redis'], github: '#', live: '#', col: 'col-6' },
    { title: 'ML Resume Classifier', desc: 'NLP model (spaCy + scikit-learn) that classifies resumes by job category with 91% accuracy.', stack: ['Python', 'spaCy', 'scikit-learn', 'FastAPI'], github: '#', live: null, col: 'col-6' },
    { title: 'Real-Time Chat App', desc: 'Socket.io and Node.js-based chat with rooms, file sharing, and end-to-end encryption.', stack: ['Node.js', 'Socket.io', 'React', 'MongoDB'], github: '#', live: '#', col: 'col-12' },
];

function renderProjects() {
    document.getElementById('projectGrid').innerHTML = projects.map(p => `
    <div class="project-card ${p.col}">
      <div class="project-title">${p.title}</div>
      <div class="project-desc">${p.desc}</div>
      <div class="project-stack">${p.stack.map(t => `<span class="chip chip-blue">${t}</span>`).join('')}</div>
      <div class="project-links">
        <a href="${p.github}" class="btn btn-secondary btn-sm">GitHub</a>
        ${p.live ? `<a href="${p.live}" class="btn btn-primary btn-sm">Live Demo</a>` : ''}
      </div>
    </div>`).join('');
}

// ── Roadmap Weeks ──────────────────────────────────────────────
const roadmapData = [
    { week: 'Week 1–2', title: 'Frontend Mastery', tasks: ['React 18 hooks & context', 'TypeScript strict mode', 'Responsive UI patterns'], done: true },
    { week: 'Week 3–4', title: 'Backend Architecture', tasks: ['FastAPI + Pydantic models', 'RESTful API design', 'JWT auth implementation'], done: true },
    { week: 'Week 5–6', title: 'Database & ORM', tasks: ['PostgreSQL advanced queries', 'SQLAlchemy 2.0 ORM', 'DB migrations with Alembic'], done: false, active: true },
    { week: 'Week 7–8', title: 'DevOps & Deployment', tasks: ['Docker containerisation', 'CI/CD with GitHub Actions', 'Deploy on AWS/Vercel'], done: false },
    { week: 'Week 9–10', title: 'System Design', tasks: ['Caching with Redis', 'Message queues (Kafka)', 'Scalability patterns'], done: false },
    { week: 'Week 11–12', title: 'Interview Prep', tasks: ['DSA practise (LeetCode 50)', 'Mock interviews x4', 'Resume finalisation'], done: false },
];

function renderRoadmap() {
    document.getElementById('roadmapWeeks').innerHTML = roadmapData.map(w => `
    <div class="card" style="${w.active ? 'border:2px solid var(--action-blue);' : w.done ? 'border:1.5px solid var(--teal);' : ''}">
      <div class="flex items-center justify-between" style="margin-bottom:var(--sp-3)">
        <span class="badge ${w.done ? 'badge-teal' : w.active ? 'badge-blue' : 'badge-gray'}">${w.done ? '✓ Done' : w.active ? '● Active' : '○ Upcoming'}</span>
        <span class="text-xs text-gray mono">${w.week}</span>
      </div>
      <h4 style="color:var(--navy);margin-bottom:var(--sp-3)">${w.title}</h4>
      <ul style="display:flex;flex-direction:column;gap:6px">
        ${w.tasks.map(t => `<li class="flex items-center gap-2 text-sm" style="color:var(--gray-600)"><span style="color:${w.done ? 'var(--teal)' : w.active ? 'var(--action-blue)' : 'var(--gray-300)'}">${w.done ? '✓' : '○'}</span>${t}</li>`).join('')}
      </ul>
    </div>`).join('');
}

// ── Mentor Cards ───────────────────────────────────────────────
const mentors = [
    { initials: 'PM', name: 'Priya Mehta', role: 'Senior SWE', company: 'Google India', industry: 'Tech', grad: 2020, matchScore: 87, skills: ['System Design', 'Python', 'DSA'], connected: true, scores: [90, 85, 100, 80, 100] },
    { initials: 'RS', name: 'Rohit Sharma', role: 'Product Manager', company: 'Flipkart', industry: 'E-Commerce', grad: 2019, matchScore: 78, skills: ['Product Strategy', 'Agile', 'SQL'], connected: false, scores: [80, 70, 80, 75, 90] },
    { initials: 'NA', name: 'Neha Agarwal', role: 'ML Engineer', company: 'Microsoft', industry: 'Tech', grad: 2021, matchScore: 82, skills: ['PyTorch', 'Transformers', 'Python'], connected: false, scores: [85, 82, 80, 85, 80] },
    { initials: 'VK', name: 'Vikram Kumar', role: 'Engineering Manager', company: 'Razorpay', industry: 'FinTech', grad: 2017, matchScore: 71, skills: ['Leadership', 'Microservices', 'Go'], connected: false, scores: [72, 68, 70, 75, 70] },
    { initials: 'SC', name: 'Sneha Chandra', role: 'SDE-2', company: 'Amazon', industry: 'Tech', grad: 2022, matchScore: 80, skills: ['Java', 'AWS', 'Distributed Systems'], connected: false, scores: [82, 78, 80, 80, 78] },
];

function renderMentors() {
    const dims = ['Skills Overlap', 'Career Goal Align', 'Industry Match', 'Availability', 'Alumni Recency'];
    document.getElementById('mentorGrid').innerHTML = mentors.map(m => `
    <div class="mentor-card">
      <div class="mentor-header">
        <div class="mentor-avatar">${m.initials}</div>
        <div>
          <div class="mentor-name">${m.name}</div>
          <div class="mentor-role">${m.role}</div>
          <div class="mentor-company">🏢 ${m.company} · ${m.industry}</div>
        </div>
        <div class="match-score-pill">⚡ ${m.matchScore}%</div>
      </div>
      <div class="mentor-skills">${m.skills.map(s => `<span class="chip chip-teal">${s}</span>`).join('')}</div>
      <div class="mentor-score-bars">
        ${dims.map((d, i) => `<div class="mentor-score-row"><span class="mentor-score-label">${d}</span><div class="mentor-score-bar"><div class="mentor-score-fill" style="width:${m.scores[i]}%"></div></div><span style="font-size:10px;color:var(--gray-400);width:28px;text-align:right">${m.scores[i]}%</span></div>`).join('')}
      </div>
      ${m.connected
            ? `<div class="flex gap-2"><button class="btn btn-primary btn-sm" style="flex:1" onclick="showToast('Meeting link sent to your email','success')">Join Meet</button><button class="btn btn-secondary btn-sm">Sessions</button></div>`
            : `<button class="btn btn-primary w-full" onclick="this.textContent='✓ Request Sent';this.disabled=true;showToast('Mentorship request sent to ${m.name}','success')">Request Mentorship</button>`}
    </div>`).join('');
}

// ── Student Connect ────────────────────────────────────────────
const peerStudents = [
    { initials: 'JS', name: 'James Smith', major: 'Computer Science', grad: 2026, skills: [{name: 'React', level: 'Advanced', color: '#0EA5E9'}, {name: 'Node.js', level: 'Intermediate', color: '#16A34A'}], connected: false },
    { initials: 'SA', name: 'Sarah Adams', major: 'Information Technology', grad: 2027, skills: [{name: 'Python', level: 'Advanced', color: '#2563EB'}, {name: 'ML', level: 'Beginner', color: '#7C3AED'}], connected: true },
    { initials: 'MK', name: 'Michael Khan', major: 'Computer Science', grad: 2025, skills: [{name: 'Docker', level: 'Intermediate', color: '#0369A1'}, {name: 'AWS', level: 'Advanced', color: '#EA580C'}], connected: false },
    { initials: 'EL', name: 'Emma Larson', major: 'Data Science', grad: 2026, skills: [{name: 'Pandas', level: 'Advanced', color: '#4F46E5'}, {name: 'SQL', level: 'Advanced', color: '#F59E0B'}], connected: false },
    { initials: 'RN', name: 'Ravi Nair', major: 'Software Engineering', grad: 2027, skills: [{name: 'Java', level: 'Intermediate', color: '#DC2626'}, {name: 'Spring Boot', level: 'Beginner', color: '#059669'}], connected: false },
    { initials: 'LP', name: 'Lisa Phan', major: 'Design', grad: 2026, skills: [{name: 'UI/UX', level: 'Advanced', color: '#DB2777'}, {name: 'Figma', level: 'Advanced', color: '#A21CAF'}], connected: true },
];

function renderStudentConnect(filterText = '') {
    const grid = document.getElementById('studentConnectGrid');
    if (!grid) return;
    
    // Dynamically generate current user's profile
    const mySkills = [...techSkills, ...softSkills].map(s => ({
        name: s.name, level: s.level, color: s.color
    }));
    const me = {
        initials: currentStudentUser.avatar || getInitials(currentStudentUser.name),
        name: currentStudentUser.name || 'Student',
        major: currentStudentUser.department || 'Student',
        grad: 2027,
        skills: mySkills,
        isMe: true
    };

    const allStudents = [me, ...peerStudents];
    
    const term = filterText.toLowerCase();
    const filtered = allStudents.filter(s => {
        return s.name.toLowerCase().includes(term) ||
               s.major.toLowerCase().includes(term) ||
               s.skills.some(sk => sk.name.toLowerCase().includes(term) || sk.level.toLowerCase().includes(term));
    });

    grid.innerHTML = filtered.map(s => `
    <div class="mentor-card" ${s.isMe ? 'style="border: 2px solid var(--action-blue); background: var(--blue-muted);"' : ''}>
      <div class="mentor-header">
        <div class="mentor-avatar" ${s.isMe ? 'style="background: var(--navy); color: white;"' : ''}>${s.initials}</div>
        <div>
          <div class="mentor-name">${s.name} ${s.isMe ? '<span class="badge badge-teal" style="font-size: 10px; margin-left: 4px;">You</span>' : ''}</div>
          <div class="mentor-role">${s.major}</div>
          <div class="mentor-company">🎓 Class of ${s.grad}</div>
        </div>
      </div>
      <div style="margin: 12px 0;">
          <div style="font-size: 11px; font-weight: 600; color: var(--gray-500); text-transform: uppercase; margin-bottom: 6px;">Skills</div>
          <div class="mentor-skills" style="margin-top: 0;">
              ${s.skills.map(sk => `<span class="chip" style="background: ${sk.color}15; color: ${sk.color}; border: 1px solid ${sk.color}30;">${sk.name} • ${sk.level}</span>`).join('')}
          </div>
      </div>
      ${s.isMe 
            ? `<div class="flex gap-2"><button class="btn btn-secondary btn-sm w-full" onclick="switchTab('career',document.querySelector('[onclick*=career]'));switchSubTab('careerSkills',document.querySelectorAll('.tab-btn')[1],'career-sub')">Manage Skills</button></div>`
            : `<div class="flex gap-2">
                 <button class="btn btn-primary btn-sm" style="flex:1" onclick="${s.connected ? `showToast('Message sent to ${s.name}','success')` : `this.textContent='✓ Request Sent';this.disabled=true;showToast('Connection request sent to ${s.name}','success')`}">${s.connected ? 'Message' : 'Connect'}</button>
                 <button class="btn btn-secondary btn-sm" onclick="viewStudentProfile('${s.name}')">View Profile</button>
               </div>`
      }
    </div>`).join('');
    
    if(filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: var(--sp-6); color: var(--gray-500);">No peers found matching your criteria.</div>';
    }
}

function filterStudentConnect() {
    const term = document.getElementById('studentConnectSearch').value;
    renderStudentConnect(term);
}

function viewStudentProfile(name) {
    const allStudents = [
        {
            initials: currentStudentUser.avatar || getInitials(currentStudentUser.name),
            name: currentStudentUser.name || 'Student',
            major: currentStudentUser.department || 'Student',
            grad: 2027,
            skills: [...techSkills, ...softSkills].map(s => ({ name: s.name, level: s.level, color: s.color })),
            isMe: true
        },
        ...peerStudents
    ];
    
    const s = allStudents.find(p => p.name === name);
    if (!s) return;
    
    document.getElementById('vpAvatar').textContent = s.initials;
    document.getElementById('vpName').textContent = s.name;
    document.getElementById('vpRole').textContent = s.major;
    document.getElementById('vpGrad').textContent = `🎓 Class of ${s.grad}`;
    
    const skillsHtml = s.skills.length > 0 
        ? s.skills.map(sk => `<span class="chip" style="background: ${sk.color}15; color: ${sk.color}; border: 1px solid ${sk.color}30; padding: 4px 10px; font-size: 12px;">${sk.name} • ${sk.level}</span>`).join('')
        : '<span class="text-sm text-gray">No skills registered yet.</span>';
    
    document.getElementById('vpSkills').innerHTML = skillsHtml;
    
    const footer = document.getElementById('vpFooter');
    if (s.connected) {
        footer.innerHTML = `
            <button class="btn btn-secondary" style="flex:1;" onclick="closeModal('viewProfileModal')">Close</button>
            <button class="btn btn-primary" style="flex:1;" onclick="closeModal('viewProfileModal');showToast('Message sent to ${s.name}','success')">Message</button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn btn-secondary" style="flex:1;" onclick="closeModal('viewProfileModal')">Close</button>
            <button class="btn btn-primary" style="flex:1;" onclick="closeModal('viewProfileModal');showToast('Connection request sent to ${s.name}','success')">Connect</button>
        `;
    }
    
    showModal('viewProfileModal');
}

// ── Notifications ──────────────────────────────────────────────
const notifs = [
    { icon: '⚠️', title: 'Book Overdue: CLRS Algorithms', msg: 'Your book was due on Feb 17. Fine of ₹6 has been applied.', time: '2 hours ago', type: 'red', read: false },
    { icon: '📅', title: 'Mentor Session Tomorrow', msg: 'Session with Priya Mehta at 11:00 AM IST. Meeting link has been sent.', time: '5 hours ago', type: 'blue', read: false },
    { icon: '✅', title: 'Resume Analysis Complete', msg: 'Your ATS score: 82/100. View detailed report in Career tab.', time: 'Yesterday', type: 'teal', read: false },
    { icon: '🏆', title: 'JRS Increased by 6 Points', msg: 'Your Job Readiness Score improved from 68 to 74. Keep it up!', time: '2 days ago', type: 'teal', read: true },
    { icon: '📢', title: 'TCS Campus Drive — Register Now', msg: 'TCS is visiting on March 5. Last date to register: Feb 28.', time: '3 days ago', type: 'amber', read: true },
];

function renderNotifications() {
    const el = document.getElementById('notifList');
    if (!el) return;
    el.innerHTML = notifs.map(n => `
    <div class="flex items-start gap-4" style="padding:var(--sp-4);border-bottom:1px solid var(--gray-100);${!n.read ? 'background:var(--blue-muted);' : ''}">
      <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--${n.type}-light||var(--gray-100));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${n.icon}</div>
      <div style="flex:1">
        <div class="fw-600 text-navy text-sm">${n.title}</div>
        <div class="text-xs text-gray" style="margin-top:2px">${n.msg}</div>
        <div class="text-xs text-gray" style="margin-top:6px">${n.time}</div>
      </div>
      ${!n.read ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--action-blue);flex-shrink:0;margin-top:6px"></span>' : ''}
    </div>`).join('');
}

// ── Campus Chat (Direct Gemini REST API) ───────────────────────
// 🔑 Paste your Gemini API key below (get free at https://aistudio.google.com/apikey)
const GEMINI_API_KEY = 'your-gemini-api-key-here';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getLocalFallback(query) {
    const q = query.toLowerCase();

    // Greetings
    if (/^(hi|hello|hey|sup|yo|greetings)\b/.test(q))
        return { answer: 'Hello! 👋 I\'m CampusAI Assistant. I can help you with library timings, exam schedules, placement drives, hostel info, resume building, career advice, and much more. What would you like to know?', source: 'Campus Handbook 2025-26' };

    // Thanks / bye
    if (/thank|thanks|bye|goodbye|see you/.test(q))
        return { answer: 'You\'re welcome! 😊 Feel free to ask anytime. Good luck with your studies!', source: 'Campus Handbook 2025-26' };

    // Library
    if (/library|book|reading room|borrow|lending|catalog/.test(q))
        return { answer: '📚 The Central Library is open Mon–Sat 8 AM–9 PM, Sundays 10 AM–5 PM. Reading rooms are 24/7 for registered students. You can borrow up to 4 books for 14 days. Use SmartLib to search & reserve books online.', source: 'Library Policy Document 2025-26' };

    // Exams
    if (/exam|midterm|end.?sem|test|quiz|assessment|marks|grade|gpa|cgpa/.test(q))
        return { answer: '📝 Semester 6 exams: April 14 – May 2, 2026. Mid-sems are 20% weightage, end-sems 50%, internals 30%. Check the Academic Portal for detailed timetable and admit cards (released 1 week prior).', source: 'Academic Calendar 2025-26' };

    // Placement
    if (/placement|drive|company|job|recruit|intern|hire|career fair/.test(q))
        return { answer: '💼 Upcoming drives: TCS (Mar 5), Infosys (Mar 10), Wipro (Mar 18), Flipkart (Mar 25). Register through the Placement Cell portal. Average package last year: ₹8.2 LPA. Highest: ₹42 LPA.', source: 'Placement Drive Notice Feb 2026' };

    // Hostel
    if (/hostel|dorm|accommodation|room|mess|warden/.test(q))
        return { answer: '🏠 Hostel applications for 2026-27 open now. Eligibility: CGPA ≥ 7.0, distance > 50 km. Portal closes March 15. Room types: Single (₹60k/yr), Double (₹40k/yr), Triple (₹30k/yr). Mess timings: 7-9 AM, 12-2 PM, 7-9 PM.', source: 'Hostel Allocation Policy 2026' };

    // Resume
    if (/resume|cv|ats|cover letter|portfolio/.test(q))
        return { answer: '📄 Resume tips: 1) Keep it 1 page for freshers 2) Use action verbs (built, led, improved) 3) Quantify achievements (e.g., "increased efficiency by 30%") 4) Include skills, projects, and education 5) Save as PDF. Use our ATS Checker in Career Engine to score your resume!', source: 'Career Services Guide 2025-26' };

    // How to build / learn / start
    if (/how to (build|make|create|start|learn|study|prepare|write|code|develop)/.test(q))
        return { answer: '🚀 Great question! Here\'s a general approach: 1) Start with fundamentals — online courses on Coursera/freeCodeCamp 2) Practice hands-on with projects 3) Join campus clubs related to your interest 4) Check Career Engine for a personalized AI roadmap. Visit the library for recommended textbooks!', source: 'Campus Handbook 2025-26' };

    // Attendance
    if (/attendance|absent|present|leave|proxy/.test(q))
        return { answer: '📊 Minimum 75% attendance required per subject. Below 75% = debarred from exams. Medical leave needs a doctor\'s certificate within 3 days. Check your attendance in real-time on the Dashboard → Attendance section.', source: 'Academic Rules 2025-26' };

    // Fees
    if (/fee|tuition|payment|scholarship|financial aid|loan/.test(q))
        return { answer: '💰 Tuition: ₹1.2L/semester. Hostel: ₹30-60k/year. Payment deadline: March 31, 2026. Merit scholarships available for CGPA ≥ 9.0 (50% fee waiver). Apply for financial aid through the Dean\'s Office by Feb 28.', source: 'Fee Structure 2025-26' };

    // Transport / Bus
    if (/bus|transport|route|shuttle|cab|commute/.test(q))
        return { answer: '🚌 Campus buses run every 15 minutes (7 AM–9 PM). 8 routes covering major city areas. Route maps are in the Transport section. Night shuttle available on request (9 PM–11 PM). Bus pass: ₹5,000/semester.', source: 'Transport Guide 2025-26' };

    // Clubs / Events
    if (/club|society|event|fest|hackathon|workshop|cultural|sports day|competition/.test(q))
        return { answer: '🎉 30+ student clubs active! Tech: Coding Club, AI Society, Robotics. Cultural: Drama, Music, Dance. Sports: Cricket, Basketball, Football. TechFest 2026 coming in March! Check Notices for event registrations.', source: 'Student Affairs 2025-26' };

    // WiFi / Internet
    if (/wifi|internet|network|vpn|password/.test(q))
        return { answer: '📶 Campus WiFi: Connect to "CampusAI-Student" network. Login with your student email and password. Speed: 100 Mbps shared. VPN access available for accessing research papers off-campus. IT helpdesk: ext. 1234.', source: 'IT Services Guide' };

    // Faculty / Professor
    if (/professor|faculty|teacher|lecture|class|course|subject/.test(q))
        return { answer: '👨‍🏫 Faculty office hours: Mon–Fri, 2–4 PM. Check the Academic Portal for your course faculty details. For appointment booking, email the department coordinator. HOD office: Admin Building, 3rd Floor.', source: 'Academic Directory 2025-26' };

    // Health / Wellness
    if (/health|doctor|medical|hospital|wellness|stress|anxiety|counsel|mental|sick|emergency/.test(q))
        return { answer: '💙 Campus Health Center: Mon–Sat, 8 AM–8 PM. Emergency: 24/7. Free counseling: Book through CalmLink Wellness section. SOS Helpline: 1800-XXX-XXXX. Nearest hospital: City Hospital (2 km). Stress? Try our guided breathing exercises in the Wellness module.', source: 'Health & Wellness Guide' };

    // Canteen / Food
    if (/canteen|food|cafe|cafeteria|eat|lunch|breakfast|dinner|snack/.test(q))
        return { answer: '🍽️ Main Canteen: 8 AM–9 PM. CCD Café: 9 AM–6 PM. Food Court (3 vendors): 11 AM–8 PM. Mess timings (hostellers): Breakfast 7-9, Lunch 12-2, Dinner 7-9. Average meal cost: ₹50-80.', source: 'Campus Facilities Guide' };

    // Sports
    if (/sport|gym|cricket|football|basketball|badminton|swimming|fitness/.test(q))
        return { answer: '⚽ Sports Complex: 6 AM–9 PM. Gym: 6 AM–10 PM (free for students). Cricket/Football grounds available for booking. Annual Sports Day: March 2026. Swimming pool: ₹500/month. Book courts through the Sports app.', source: 'Sports Facilities Guide' };

    // Research / Project
    if (/research|paper|project|thesis|publication|lab|journal/.test(q))
        return { answer: '🔬 Research opportunities: Talk to your department faculty for projects. Summer research internships open in April. College journal: "CampusAI Research" accepts submissions year-round. Labs are open Mon–Sat, 9 AM–6 PM.', source: 'Research Guidelines 2025-26' };

    // Schedule / Timetable
    if (/schedule|timetable|class timing|when is|what time/.test(q))
        return { answer: '🕐 Class timings: 8:30 AM–4:30 PM (Mon–Fri), Saturday: 9 AM–1 PM. Your personalized timetable is on the Dashboard. Lab sessions are typically 2-hour blocks in the afternoon.', source: 'Academic Calendar 2025-26' };

    // General knowledge / non-campus
    if (/who is|what is|when was|where is|how does|why does|capital of|president|champion/.test(q))
        return { answer: '🤔 That\'s a great general knowledge question! I\'m specialized in campus-related topics. For general questions, try Google or ChatGPT. I can help you with: library, exams, placements, hostel, fees, clubs, transport, wellness, and more!', source: 'Campus Handbook 2025-26' };

    // Catch-all — give a helpful response instead of "no info"
    return { answer: '🤖 I\'m not sure about that specific topic, but I can help with: 📚 Library · 📝 Exams · 💼 Placements · 🏠 Hostel · 📄 Resume · 💰 Fees · 🚌 Transport · 🎉 Clubs · 💙 Wellness · ⚽ Sports. Try asking about one of these!', source: 'Campus Handbook 2025-26' };
}

async function callGeminiAPI(userMessage) {
    const systemPrompt = 'You are CampusAI, a helpful campus assistant for a university. Answer questions about library, events, transport, academics, wellness, and campus facilities. Be concise (2-3 sentences max) and friendly. Use emojis sparingly.';

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${systemPrompt}\n\nStudent's question: ${userMessage}` }]
            }],
            generationConfig: { maxOutputTokens: 300 }
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
}

async function sendChatMessage(text) {
    const input = document.getElementById('chatInput');
    const query = text || input.value.trim();
    if (!query) return;
    input.value = '';
    const msgs = document.getElementById('chatMessages');

    // User message
    msgs.innerHTML += `<div class="chat-msg user"><div class="chat-msg-bubble">${query}</div></div>`;
    // Typing indicator
    const typingId = 'typing_' + Date.now();
    msgs.innerHTML += `<div class="chat-msg ai" id="${typingId}"><div class="chat-ai-avatar" style="width:32px;height:32px;font-size:14px;flex-shrink:0">🤖</div><div class="chat-typing"><span></span><span></span><span></span></div></div>`;
    msgs.scrollTop = msgs.scrollHeight;

    let answer, source;

    // Try Gemini API first (if key is configured)
    if (GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('your-')) {
        try {
            answer = await callGeminiAPI(query);
            source = 'Gemini AI · Confidence: High';
        } catch (err) {
            console.warn('Gemini API error:', err.message);
            // Fall through to local fallback
        }
    }

    // Local fallback if Gemini didn't respond
    if (!answer) {
        const local = getLocalFallback(query);
        if (local) {
            answer = local.answer;
            source = local.source;
        } else {
            answer = "I don't have verified information on that specific topic. Please contact the relevant department office, or rephrase your question.";
            source = null;
        }
    }

    // Remove typing indicator and show response
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();

    msgs.innerHTML += `<div class="chat-msg ai">
      <div class="chat-ai-avatar" style="width:32px;height:32px;font-size:14px;flex-shrink:0">🤖</div>
      <div>
        <div class="chat-msg-bubble">${answer}</div>
        ${source ? `<div class="chat-source-cite">📄 Source: ${source}</div>` : `<div class="chat-source-cite" style="background:var(--amber-light);color:var(--amber)">⚠️ No verified source found — fallback response</div>`}
      </div>
    </div>`;
    msgs.scrollTop = msgs.scrollHeight;
}

// ── Resume Upload + ATS (app.js engine) ─────────────────────
let uploadedResumeText = '';
let atsChartInstance = null;

function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
        showToast('Please upload a PDF, DOCX, or TXT file.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds 5 MB limit.', 'error');
        return;
    }

    const sizeMB = (file.size / 1048576).toFixed(2);
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // Update file-info row
    document.getElementById('uploadedFileInfo').style.display = 'flex';
    document.getElementById('uploadedFileName').textContent = file.name;
    document.getElementById('resumeFileMeta').textContent = `Uploaded ${today} · ${sizeMB} MB`;

    event.target.value = ''; // allow re-upload of same file

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = e => {
            uploadedResumeText = e.target.result;
            document.getElementById('resumeText').value = uploadedResumeText;
            showToast('Resume text extracted!', 'success');
        };
        reader.readAsText(file);
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        extractTextFromPDF(file);
    } else if (file.name.endsWith('.docx') || file.type.includes('openxmlformats')) {
        extractTextFromDOCX(file);
    } else {
        showToast('For DOC files, paste the text content into the text area below.', 'info');
    }
}

async function extractTextFromPDF(file) {
    showToast('Extracting text from PDF…', 'info');
    try {
        if (typeof pdfjsLib === 'undefined') {
            showToast('PDF library not loaded. Please paste text manually.', 'error');
            return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            fullText += content.items.map(i => i.str).join(' ') + '\n\n';
        }
        uploadedResumeText = fullText.trim();
        document.getElementById('resumeText').value = uploadedResumeText;
        showToast(`PDF text extracted! (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''})`, 'success');
    } catch (err) {
        console.error('PDF error:', err);
        showToast('Could not extract PDF text. Paste text manually.', 'error');
    }
}

async function extractTextFromDOCX(file) {
    showToast('Extracting text from DOCX…', 'info');
    try {
        if (typeof mammoth === 'undefined') {
            showToast('DOCX library not loaded. Please paste text manually.', 'error');
            return;
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        uploadedResumeText = result.value.trim();
        document.getElementById('resumeText').value = uploadedResumeText;
        showToast('DOCX text extracted!', 'success');
    } catch (err) {
        console.error('DOCX error:', err);
        showToast('Could not extract DOCX text. Paste text manually.', 'error');
    }
}

function clearResumeATS() {
    document.getElementById('resumeFileInput').value = '';
    document.getElementById('resumeText').value = '';
    document.getElementById('uploadedFileInfo').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'none';
    uploadedResumeText = '';
    showToast('Resume cleared.', 'info');
}

function analyzeResume() {
    const resumeText = (document.getElementById('resumeText').value.trim()) || uploadedResumeText;
    const jobTitle = document.getElementById('targetJobTitle')?.value.trim() || '';
    const industry = document.getElementById('targetIndustry')?.value || 'technology';

    if (!resumeText) {
        showToast('Please upload a resume or paste the text content first.', 'error');
        return;
    }

    const btn = document.getElementById('analyzeResumeBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ Analysing…';
    btn.disabled = true;

    setTimeout(() => {
        try {
            const analysis = performATSAnalysis(resumeText, industry, jobTitle, '');
            displayAnalysisResults(analysis);
            const t = analysis.totalScore >= 70 ? 'success' : analysis.totalScore >= 50 ? 'info' : 'error';
            showToast(`Analysis complete! ATS score: ${analysis.totalScore}%`, t);
        } catch (e) {
            console.error('Analysis error:', e);
            showToast('Error analysing resume. Please try again.', 'error');
        }
        btn.innerHTML = orig;
        btn.disabled = false;
    }, 1200);
}

function performATSAnalysis(resumeText, industry, jobTitle, jobDescription) {
    const t = resumeText.toLowerCase();

    // ── Text quality check ────────────────────────────────────
    const printable = (resumeText.match(/[a-zA-Z]/g) || []).length;
    const textQuality = printable / (resumeText.length || 1);

    if (textQuality < 0.2 || resumeText.trim().length < 50) {
        return {
            totalScore: 20,
            contactScore: 10, structureScore: 10, keywordsScore: 0,
            verbsScore: 0, metricsScore: 0, formatScore: 10,
            foundKeywords: [], missingKeywords: ['Readable Text'],
            wordCount: 0,
            feedback: [
                { type: 'critical', title: 'File Unreadable', message: 'Resume text could not be extracted — likely a scanned PDF.' },
                { type: 'improve', title: 'Format Fix', message: 'Export as a text-based PDF or paste text manually.' }
            ]
        };
    }

    // ── 1. Contact Info (max 20 pts) ──────────────────────────
    let totalScore = 0;
    const feedback = [];
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(t);
    const hasPhone = /(\+?[\d][\d\s\-().]{5,14}[\d])/.test(t);
    const hasLinkedIn = /linkedin\.com|linkedin:/i.test(t);

    let contactScore = 0;
    if (hasEmail) { contactScore += 40; }
    else { feedback.push({ type: 'critical', title: 'Missing Email Address', message: 'Add your email address in plain text.' }); }
    if (hasPhone) { contactScore += 40; }
    else { feedback.push({ type: 'critical', title: 'Missing Phone Number', message: 'Add a phone number so recruiters can reach you.' }); }
    if (hasLinkedIn) { contactScore += 20; }
    else { feedback.push({ type: 'improve', title: 'Missing LinkedIn Link', message: 'Add your LinkedIn profile URL.' }); }
    if (contactScore === 100) feedback.push({ type: 'good', title: 'Contact Information', message: 'Essential contact info present.' });
    totalScore += contactScore / 5;   // maps to 20 pts max

    // ── 2. Sections / Structure (max 20 pts) ──────────────────
    const hasExp = /experience|internship|work|history|employment/i.test(t);
    const hasEdu = /education|university|college|degree|bachelor|master/i.test(t);
    const hasSkills = /skills|technologies|tools/i.test(t);

    let structureScore = 0;
    if (hasExp) { structureScore += 50; feedback.push({ type: 'good', title: 'Professional Experience', message: 'Experience section clearly marked.' }); }
    else { feedback.push({ type: 'improve', title: 'Missing Experience', message: 'Add an explicit "Experience" section.' }); }
    if (hasEdu) { structureScore += 25; feedback.push({ type: 'good', title: 'Education Section', message: 'Educational background found.' }); }
    else { feedback.push({ type: 'improve', title: 'Missing Education', message: 'Add an "Education" section.' }); }
    if (hasSkills) { structureScore += 25; }
    else { feedback.push({ type: 'improve', title: 'Missing Skills Section', message: 'Add a "Skills" section.' }); }
    totalScore += structureScore / 5;  // maps to 20 pts max

    // ── 3. Keywords (max 40 pts) — broader, industry-adaptive ─
    const keywordGroups = industry === 'marketing' ? [
        { name: 'Performance Marketing', regex: /seo|sem|ppc|cro|a\/b test|paid media|organic traffic|conversion rate|campaign|funnel|lead generation/g },
        { name: 'Analytics', regex: /google analytics|roi|roas|cpa|cac|kpi|attribution|reporting|dashboard|data.driven/g },
        { name: 'CRM & Automation', regex: /hubspot|salesforce|crm|email automation|lifecycle marketing|lead scoring|workflow/g },
        { name: 'Ad Platforms', regex: /google ads|facebook ads|linkedin ads|retargeting|display advertising|paid search/g },
        { name: 'Content & Design', regex: /content marketing|copywriting|wordpress|seo writing|email marketing|social media/g },
        { name: 'Strategy & Leadership', regex: /budget|team lead|cross-functional|stakeholder|strategic|go-to-market|brand|positionin/g },
        { name: 'Tools', regex: /semrush|ahrefs|hotjar|tableau|optimizely|adobe|figma/g },
        { name: 'Impact & Results', regex: /increased|improved|reduced|generated|grew|boosted|revenue|retention/g }
    ] : industry === 'finance' ? [
        { name: 'Financial Analysis', regex: /financial model|valuation|dcf|budgeting|forecasting|p&l|balance sheet|cash flow/g },
        { name: 'Tools', regex: /excel|vba|bloomberg|sql|tableau|powerbi|python|r\b/g },
        { name: 'Banking & Markets', regex: /equity|fixed income|derivatives|trading|portfolio|risk management|compliance|audit/g },
        { name: 'ERP & Software', regex: /sap|oracle|quickbooks|tally|erp|accounting software/g },
        { name: 'Regulatory', regex: /gaap|ifrs|regulatory|compliance|kyc|aml|tax|statutory/g },
        { name: 'Leadership', regex: /client|stakeholder|managed|led|coordinated|reported/g },
        { name: 'Education', regex: /cfa|cpa|ca|acca|mba|finance|economics|accounting/g },
        { name: 'Results', regex: /revenue|profit|cost.reduction|roi|savings|growth|performance/g }
    ] : [  // technology (default) — also catches general/other resumes broadly
        { name: 'Languages', regex: /python|java\b|javascript|typescript|c\+\+|c#|golang|kotlin|swift|php|ruby|rust|html|css|sql/g },
        { name: 'Frameworks', regex: /react|angular|vue|next|django|flask|spring|fastapi|express|node|rails|laravel|flutter/g },
        { name: 'Databases', regex: /mysql|postgres|mongo|redis|firebase|sqlite|oracle|dynamodb|supabase|elastic/g },
        { name: 'DevOps & Cloud', regex: /git|docker|kubernetes|jenkins|ci\/cd|aws|azure|gcp|terraform|ansible|github actions/g },
        { name: 'AI & Data', regex: /machine learning|deep learning|tensorflow|pytorch|scikit|nlp|llm|pandas|spark|data pipeline/g },
        { name: 'Architecture', regex: /microservices|rest api|graphql|system design|scalability|distributed|event.driven/g },
        { name: 'Process & Soft', regex: /agile|scrum|kanban|jira|cross-functional|leadership|communication|team/g },
        { name: 'Results & Impact', regex: /optimized|improved|reduced|launched|led|delivered|increased|built|designed|developed/g }
    ];

    let foundCategories = 0;
    const foundKeywords = [];
    const missingKeywords = [];

    keywordGroups.forEach(group => {
        const matches = t.match(group.regex);
        if (matches && matches.length > 0) {
            foundCategories++;
            foundKeywords.push(...[...new Set(matches)].slice(0, 3));
        } else {
            missingKeywords.push(group.name + ' Keywords');
        }
    });

    const keywordsScore = Math.min(100, Math.floor((foundCategories / keywordGroups.length) * 100));
    totalScore += keywordsScore * 0.40;    // max 40 pts

    if (foundCategories >= 6) feedback.push({ type: 'good', title: 'Strong Keyword Match', message: `Matched ${foundCategories} core skill areas.` });
    else if (foundCategories >= 3) feedback.push({ type: 'improve', title: 'Moderate Keyword Match', message: `Found keywords in ${foundCategories} areas. Add more domain terms.` });
    else feedback.push({ type: 'improve', title: 'Weak Keyword Coverage', message: `Resume lacks keywords in important domains for ${industry}.` });
    if (missingKeywords.length > 0) feedback.push({ type: 'improve', title: 'Missing Categories', message: `Consider adding terms related to: ${missingKeywords.slice(0, 2).join(', ')}.` });

    // ── 4. Action Verbs & Metrics (max 20 pts) ────────────────
    let verbsScore = 0, metricsScore = 0;

    const verbMatches = t.match(/\b(led|managed|developed|created|improved|increased|optimized|launched|designed|built|implemented|delivered|achieved|reduced|generated|analysed|analyzed|coordinated|mentored|strategized)\b/gi);
    if (verbMatches) {
        verbsScore = Math.min(100, verbMatches.length * 15);
        if (verbsScore >= 60) feedback.push({ type: 'good', title: 'Strong Action Verbs', message: `${verbMatches.length} strong action verbs detected.` });
    } else {
        feedback.push({ type: 'critical', title: 'Missing Action Verbs', message: 'Use strong verbs: managed, developed, launched, improved.' });
    }

    const metricMatches = t.match(/\d+\s*%|\d+x\b|\$[\d,]+|\b\d+\s*(users|clients|leads|customers|students|sales|revenue|projects|team|people)\b/gi);
    if (metricMatches) {
        metricsScore = Math.min(100, metricMatches.length * 25);
        if (metricsScore >= 50) feedback.push({ type: 'good', title: 'Quantified Metrics', message: `${metricMatches.length} quantified result(s) found — great!` });
    } else {
        feedback.push({ type: 'improve', title: 'Missing Quantifiable Impact', message: 'Add numbers: "Increased revenue by 20%", "Led a team of 8".' });
    }

    totalScore += verbsScore * 0.10 + metricsScore * 0.10;   // max 20 pts

    const finalScore = Math.min(100, Math.floor(totalScore));
    const cleanFound = [...new Set(foundKeywords)].map(k => k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    return {
        totalScore: finalScore,
        contactScore, structureScore, keywordsScore,
        verbsScore, metricsScore, formatScore: 100,
        foundKeywords: cleanFound,
        missingKeywords: missingKeywords.slice(0, 4),
        wordCount: resumeText.split(/\s+/).length,
        feedback
    };
}

function displayAnalysisResults(analysis) {
    const resultsDiv = document.getElementById('analysisResults');
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });

    // Animate score counter
    const scoreEl = document.getElementById('atsScoreValue');
    let current = 0;
    const iv = setInterval(() => {
        if (current >= analysis.totalScore) { clearInterval(iv); return; }
        current++;
        scoreEl.textContent = current + '%';
    }, 18);

    // SVG circle fill
    const circumference = 2 * Math.PI * 55;   // r=55 from HTML
    const offset = circumference - (analysis.totalScore / 100) * circumference;
    const fill = document.getElementById('scoreCircleFill');
    fill.style.stroke = analysis.totalScore >= 70 ? '#22c55e' : analysis.totalScore >= 50 ? '#f59e0b' : '#ef4444';
    setTimeout(() => { fill.style.strokeDashoffset = offset; }, 100);

    // Score description
    const desc = document.getElementById('scoreDescription');
    if (analysis.totalScore >= 80) desc.textContent = 'Excellent! Your resume is highly optimised for ATS systems.';
    else if (analysis.totalScore >= 65) desc.textContent = 'Good! Your resume should pass most ATS filters. Minor improvements recommended.';
    else if (analysis.totalScore >= 50) desc.textContent = 'Fair. Your resume may struggle with some ATS systems. See suggestions below.';
    else desc.textContent = 'Needs Improvement. Follow the recommendations to strengthen your resume.';

    // Breakdown bars
    updateBreakdownBar('contact', analysis.contactScore);
    updateBreakdownBar('structure', analysis.structureScore);
    updateBreakdownBar('keywords', analysis.keywordsScore);
    updateBreakdownBar('verbs', analysis.verbsScore);
    updateBreakdownBar('metrics', analysis.metricsScore);
    updateBreakdownBar('format', analysis.formatScore);

    // Keywords found
    document.getElementById('keywordsGrid').innerHTML = analysis.foundKeywords.map(kw =>
        `<span class="keyword-tag found"><i class="fas fa-check"></i> ${kw}</span>`
    ).join('') || '<span class="text-xs text-gray">No specific keywords detected</span>';

    // Missing keywords
    const missSec = document.getElementById('missingKeywordsSection');
    if (analysis.missingKeywords.length > 0) {
        missSec.style.display = 'block';
        document.getElementById('missingKeywordsGrid').innerHTML = analysis.missingKeywords.map(kw =>
            `<span class="keyword-tag missing"><i class="fas fa-plus"></i> ${kw}</span>`
        ).join('');
    } else {
        missSec.style.display = 'none';
    }

    // Feedback items
    const iconMap = { good: 'check', improve: 'exclamation', critical: 'times' };
    document.getElementById('analysisFeedback').innerHTML = analysis.feedback.map(item => `
        <div class="feedback-item ${item.type}">
            <div class="feedback-icon ${item.type}">
                <i class="fas fa-${iconMap[item.type] || 'info'}"></i>
            </div>
            <div class="feedback-text">
                <h5>${item.title}</h5>
                <p>${item.message}</p>
            </div>
        </div>
    `).join('');

    // Score badge in header (keep existing badge in sync if present)
    const badge = document.getElementById('atsScoreBadge');
    if (badge) badge.textContent = `Score: ${analysis.totalScore}/100`;
}

function updateBreakdownBar(id, score) {
    const fill = document.getElementById(`${id}Score`);
    const label = document.getElementById(`${id}ScoreVal`);
    if (!fill || !label) return;
    label.textContent = `${score}%`;
    setTimeout(() => {
        fill.style.width = `${score}%`;
        fill.className = 'breakdown-fill ' + (score >= 70 ? 'good' : score >= 50 ? 'warning' : 'poor');
    }, 300);
}

// ── Attendance Tracking ─────────────────────────────────────────
const subjectsAttendance = [
    { code: 'CS301', name: 'Operating Systems', total: 40, attended: 35 },
    { code: 'CS302', name: 'Computer Networks', total: 38, attended: 26 },
    { code: 'CS303', name: 'Database Management Systems', total: 42, attended: 31 },
    { code: 'CS304', name: 'Design and Analysis of Algorithms', total: 45, attended: 41 },
    { code: 'HU301', name: 'Technical Communication', total: 20, attended: 12 },
    { code: 'MA301', name: 'Probability and Statistics', total: 35, attended: 28 },
];

function renderAttendance() {
    const grid = document.getElementById('attendanceGrid');
    if (!grid) return;
    
    let totalClasses = 0;
    let totalAttended = 0;
    
    grid.innerHTML = subjectsAttendance.map(subject => {
        totalClasses += subject.total;
        totalAttended += subject.attended;
        
        const percentage = ((subject.attended / subject.total) * 100).toFixed(1);
        const isLow = percentage < 75;
        
        // Calculate classes needed if below 75%
        // We know (attended + x) / (total + x) = 0.75
        // x = 3*total - 4*attended
        let notificationHtml = '';
        if (isLow) {
            const classesNeeded = Math.ceil(3 * subject.total - 4 * subject.attended);
            notificationHtml = `
            <div style="margin-top: 12px; padding: 10px; background: var(--red-light); color: var(--red); border-radius: var(--radius-md); font-size: 13px; font-weight: 600; display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 16px;">⚠️</span>
                <span>Requires ${classesNeeded} consecutive class${classesNeeded > 1 ? 'es' : ''} to reach 75%</span>
            </div>`;
        }
        
        return `
        <div class="card col-4" style="${isLow ? 'border: 1px solid var(--red-light);' : ''}">
            <div class="flex items-center justify-between" style="margin-bottom: var(--sp-2);">
                <div class="badge badge-blue">${subject.code}</div>
                <div class="badge ${isLow ? 'badge-red' : 'badge-teal'}" style="font-size: 13px; font-weight: bold;">
                    ${percentage}%
                </div>
            </div>
            <h4 style="color:var(--navy); margin-bottom: var(--sp-3); font-size: 16px;">${subject.name}</h4>
            
            <div class="flex items-center justify-between text-sm" style="margin-bottom: 8px;">
                <span class="text-gray">Classes Attended</span>
                <span class="fw-700 text-navy">${subject.attended} / ${subject.total}</span>
            </div>
            
            <div class="progress">
                <div class="progress-bar ${isLow ? 'progress-red' : 'progress-teal'}" style="width: ${percentage}%"></div>
            </div>
            
            ${notificationHtml}
        </div>`;
    }).join('');
    
    // Update overall stats
    const overallPercentage = ((totalAttended / totalClasses) * 100).toFixed(1);
    const overallBadge = document.getElementById('overallAttendanceBadge');
    const overallBar = document.getElementById('overallAttendanceBar');
    const overallText = document.getElementById('overallAttendanceText');
    
    if (overallBadge && overallBar && overallText) {
        overallBadge.textContent = overallPercentage + '%';
        overallBadge.className = 'badge ' + (overallPercentage >= 75 ? 'badge-teal' : 'badge-red');
        
        overallBar.style.width = overallPercentage + '%';
        overallBar.className = 'progress-bar ' + (overallPercentage >= 75 ? 'progress-teal' : 'progress-red');
        
        overallText.textContent = `${totalAttended} attended out of ${totalClasses} total classes`;
    }
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = ensureStudentSession();
    if (!user) return;
    hydrateStudentIdentity(user);

    drawJRSGauge();
    drawReadinessChart();
    drawATSRing();
    renderBooks(books);
    renderSkills(techSkills, 'techSkillsList');
    renderSkills(softSkills, 'softSkillsList');
    renderProjects();
    renderRoadmap();
    renderStudentConnect();
    renderMentors();
    renderNotifications();
    renderAttendance();
    loadNotifications();

    // animate progress bars
    setTimeout(() => {
        document.querySelectorAll('.progress-bar').forEach(b => {
            const w = b.style.width; b.style.width = '0'; setTimeout(() => { b.style.width = w; }, 50);
        });
    }, 200);
});

// ══════════════════════════════════════════════════════════════
//  MODULE 1: CAMPUS UPDATES (SMART NOTICES & EVENT MANAGEMENT)
// ══════════════════════════════════════════════════════════════

let campusNotices = [];
let campusEvents = [];
let activeNoticeFeedView = 'for_you';
let activeEventFilter = 'all';
let currentUpdatesSubTab = 'notices';

function switchUpdatesSubTab(tab) {
    currentUpdatesSubTab = tab;
    const btnNotices = document.getElementById('btnSubtabNotices');
    const btnEvents = document.getElementById('btnSubtabEvents');
    const viewNotices = document.getElementById('updatesNoticesView');
    const viewEvents = document.getElementById('updatesEventsView');

    if (tab === 'notices') {
        if (btnNotices) btnNotices.classList.add('active');
        if (btnEvents) btnEvents.classList.remove('active');
        if (viewNotices) viewNotices.style.display = 'block';
        if (viewEvents) viewEvents.style.display = 'none';
    } else {
        if (btnEvents) btnEvents.classList.add('active');
        if (btnNotices) btnNotices.classList.remove('active');
        if (viewNotices) viewNotices.style.display = 'none';
        if (viewEvents) viewEvents.style.display = 'block';
    }
}

async function loadCampusUpdates() {
    try {
        // Fetch notices with personalized view
        const noticeRes = await api.get(`/notices?view=${activeNoticeFeedView}`);
        if (noticeRes.success) {
            campusNotices = noticeRes.data || [];
            renderNotices(campusNotices);
        }

        // Fetch events
        const eventRes = await api.get('/events?upcoming=true');
        if (eventRes.success) {
            campusEvents = eventRes.data || [];
            renderEvents(campusEvents);
        }

        // Update stats banner
        const activeNoticesEl = document.getElementById('statActiveNotices');
        const upcomingEventsEl = document.getElementById('statUpcomingEvents');
        const deadlinesCountEl = document.getElementById('statDeadlinesCount');
        const deptUpdatesEl = document.getElementById('statDeptUpdates');

        if (activeNoticesEl) activeNoticesEl.textContent = campusNotices.length;
        if (upcomingEventsEl) upcomingEventsEl.textContent = campusEvents.length;

        const deadlines = campusEvents.filter(e => e.registrationDeadline && new Date(e.registrationDeadline) > new Date()).length;
        if (deadlinesCountEl) deadlinesCountEl.textContent = deadlines;

        const studentDept = currentStudentUser.department || 'Computer Science';
        const deptNotices = campusNotices.filter(n => (n.departments || []).includes(studentDept) || (n.departments || []).includes('Computer Science and Engineering')).length;
        if (deptUpdatesEl) deptUpdatesEl.textContent = `${deptNotices} in ${studentDept.slice(0, 16)}`;

        const subTitleEl = document.getElementById('updatesSubtitle');
        if (subTitleEl) {
            subTitleEl.textContent = `Personalized for ${currentStudentUser.name || 'Deep'} (${studentDept} · Year ${currentStudentUser.year || 3})`;
        }
    } catch (err) {
        console.error('Error loading campus updates:', err);
    }
}

function selectNoticeFeedView(view, btn) {
    activeNoticeFeedView = view;
    document.querySelectorAll('[data-view]').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadCampusUpdates();
}

function handleNoticeSearch() {
    filterNotices();
}

function filterNotices() {
    const term = (document.getElementById('noticeSearchInput')?.value || '').toLowerCase().trim();
    const dept = document.getElementById('noticeDeptFilter')?.value || 'All';
    const cat = document.getElementById('noticeCategoryFilter')?.value || 'All';
    const priority = document.getElementById('noticePriorityFilter')?.value || 'All';

    const filtered = campusNotices.filter(n => {
        const matchesTerm = !term ||
            (n.title && n.title.toLowerCase().includes(term)) ||
            (n.content && n.content.toLowerCase().includes(term)) ||
            (n.publishingDepartment && n.publishingDepartment.toLowerCase().includes(term));

        const matchesDept = dept === 'All' ||
            (n.departments && (n.departments.includes(dept) || n.departments.includes('University-wide') || n.departments.includes('All Departments')));

        const matchesCat = cat === 'All' || n.category === cat;
        const matchesPriority = priority === 'All' || n.priority === priority;

        return matchesTerm && matchesDept && matchesCat && matchesPriority;
    });

    renderNotices(filtered);
}

function renderNotices(list = []) {
    const grid = document.getElementById('noticeGrid');
    const bannerContainer = document.getElementById('pinnedNoticeBannerContainer');
    if (!grid) return;

    const pinnedNotice = list.find(n => n.pinned || n.priority === 'urgent');
    if (pinnedNotice && bannerContainer) {
        bannerContainer.innerHTML = `
            <div class="pinned-banner">
                <div class="flex items-center gap-3">
                    <span class="pinned-badge">PINNED</span>
                    <div>
                        <div class="fw-700 text-navy" style="font-size:var(--text-base)">${pinnedNotice.title}</div>
                        <div class="text-xs text-gray" style="margin-top:2px">
                            ${pinnedNotice.publishingDepartment} · Published ${formatTimeAgo(pinnedNotice.publishedAt)}
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="openNoticeModal('${pinnedNotice._id}')">Read Notice →</button>
            </div>
        `;
    } else if (bannerContainer) {
        bannerContainer.innerHTML = '';
    }

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="card col-12" style="text-align:center;padding:var(--sp-8);grid-column:1/-1">
                <div style="font-size:36px;margin-bottom:var(--sp-2)">📭</div>
                <h4 style="color:var(--navy);margin-bottom:var(--sp-1)">No notices found</h4>
                <p class="text-sm text-gray">Try adjusting your department or category filters</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(n => {
        const deptLabel = (n.departments && n.departments.length) ? n.departments[0] : 'University-wide';
        const isUrgent = n.priority === 'urgent';
        const isHigh = n.priority === 'high';
        const priorityClass = isUrgent ? 'urgent' : isHigh ? 'high' : 'normal';

        return `
            <div class="notice-card ${priorityClass}">
                ${!n.isRead ? '<span class="unread-indicator-dot" title="Unread Notice"></span>' : ''}
                <div>
                    <div class="notice-meta-top">
                        <span class="dept-pill">${escapeHTML(deptLabel)}</span>
                        <span class="priority-tag ${priorityClass}">${n.priority}</span>
                    </div>
                    <h3 class="notice-title">${escapeHTML(n.title)}</h3>
                    <p class="notice-snippet">${escapeHTML((n.content || '').slice(0, 140))}...</p>
                </div>
                <div>
                    ${n.attachments?.length ? `<div style="margin-bottom:var(--sp-2)"><span class="badge badge-blue text-xs">📎 ${n.attachments[0].name || 'Document'}</span></div>` : ''}
                    <div class="notice-footer">
                        <span>${formatTimeAgo(n.publishedAt || n.createdAt)}</span>
                        <div class="flex gap-2">
                            <button class="icon-btn" style="width:28px;height:28px" title="Bookmark" onclick="toggleNoticeBookmark('${n._id}', this)">
                                ${n.isSaved ? '🔖' : '📑'}
                            </button>
                            <button class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 10px" onclick="openNoticeModal('${n._id}')">
                                Read More
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openNoticeModal(id) {
    try {
        const res = await api.get(`/notices/${id}`);
        if (!res.success || !res.data) return;
        const n = res.data;

        document.getElementById('ndModalTitle').textContent = n.title;
        const body = document.getElementById('ndModalBody');
        body.innerHTML = `
            <div class="flex items-center gap-2" style="margin-bottom:var(--sp-3);flex-wrap:wrap">
                <span class="badge ${n.priority === 'urgent' ? 'badge-red' : 'badge-blue'}">${n.priority.toUpperCase()}</span>
                <span class="badge badge-purple">${escapeHTML(n.category)}</span>
                <span class="badge badge-teal">${escapeHTML(n.publishingDepartment || 'Administration')}</span>
                <span class="text-xs text-gray ml-auto">Published: ${new Date(n.publishedAt).toLocaleDateString()}</span>
            </div>
            <div style="font-size:var(--text-sm);color:var(--navy);line-height:1.7;white-space:pre-wrap;margin-bottom:var(--sp-4)">
                ${escapeHTML(n.content)}
            </div>
            ${n.eligibleYears?.length ? `<div class="text-xs text-gray" style="margin-bottom:var(--sp-2)"><strong>Target Audience:</strong> Year ${n.eligibleYears.join(', ')} Students</div>` : ''}
            ${n.registrationLink ? `<div style="margin-top:var(--sp-3)"><a href="${escapeHTML(n.registrationLink)}" target="_blank" class="btn btn-primary btn-sm">🔗 Open Registration / Portal Link</a></div>` : ''}
            ${n.attachments?.length ? `
                <div style="margin-top:var(--sp-3)">
                    <div class="text-xs fw-700 text-gray" style="margin-bottom:6px">ATTACHMENTS:</div>
                    ${n.attachments.map(a => `<div class="card" style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between"><span>📄 ${escapeHTML(a.name)}</span><span class="badge badge-blue">Download</span></div>`).join('')}
                </div>
            ` : ''}
        `;

        document.getElementById('ndModalFooter').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('noticeDetailsModal')">Close</button>
            <button class="btn btn-primary" onclick="toggleNoticeBookmark('${n._id}');closeModal('noticeDetailsModal')">
                ${(n.savedBy || []).includes(currentStudentUser._id) ? 'Remove Bookmark' : 'Bookmark Notice'}
            </button>
        `;

        showModal('noticeDetailsModal');

        const local = campusNotices.find(item => item._id === id);
        if (local) local.isRead = true;
        renderNotices(campusNotices);
    } catch (err) {
        console.error('Error opening notice modal:', err);
    }
}

async function toggleNoticeBookmark(id) {
    try {
        const res = await api.post(`/notices/${id}/bookmark`, {});
        if (res.success) {
            showToast(res.message, 'success');
            const item = campusNotices.find(n => n._id === id);
            if (item) item.isSaved = res.isSaved;
            renderNotices(campusNotices);
        }
    } catch (err) {
        showToast('Failed to bookmark notice', 'error');
    }
}

// ── Events Section ─────────────────────────────────────────────
function selectEventFilter(filter, btn) {
    activeEventFilter = filter;
    document.querySelectorAll('[data-event-filter]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (filter === 'all') {
        renderEvents(campusEvents);
    } else if (filter === 'registered') {
        renderEvents(campusEvents.filter(e => e.isRegistered));
    } else if (filter === 'saved') {
        renderEvents(campusEvents.filter(e => e.isSaved));
    } else {
        renderEvents(campusEvents.filter(e => e.category === filter));
    }
}

function renderEvents(list = []) {
    const grid = document.getElementById('eventGrid');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="card col-12" style="text-align:center;padding:var(--sp-8);grid-column:1/-1">
                <div style="font-size:36px;margin-bottom:var(--sp-2)">🎟️</div>
                <h4 style="color:var(--navy);margin-bottom:var(--sp-1)">No events in this view</h4>
                <p class="text-sm text-gray">Explore All Upcoming Events to view schedules</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(e => {
        const stateClass = e.isRegistered ? 'registered' :
            e.computedState === 'Registration Open' ? 'open' :
            e.computedState === 'Registration Closing Soon' ? 'closing' :
            e.computedState === 'Fully Booked' ? 'full' :
            e.computedState === 'Cancelled' ? 'cancelled' : 'completed';

        const activeRegs = e.activeRegistrationsCount || 0;
        const capacity = e.capacityLimit || 100;
        const capPct = Math.min(Math.round((activeRegs / capacity) * 100), 100);

        return `
            <div class="event-card">
                <div class="event-poster-header" style="background:${e.posterGradient || 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)'}">
                    <div class="event-poster-top">
                        <span class="event-category-badge">${e.icon || '📅'} ${escapeHTML(e.category)}</span>
                        <span class="event-state-pill ${stateClass}">${e.isRegistered ? '✓ Registered' : e.computedState}</span>
                    </div>
                    <div class="text-xs" style="opacity:0.9">🏛️ ${escapeHTML(e.organizingDepartment)}</div>
                </div>
                <div class="event-body">
                    <h3 class="event-name">${escapeHTML(e.title)}</h3>
                    <div class="event-info-row">
                        <span>📅</span>
                        <span>${new Date(e.eventDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${e.startTime}</span>
                    </div>
                    <div class="event-info-row">
                        <span>📍</span>
                        <span>${escapeHTML(e.venue)}</span>
                    </div>

                    ${e.capacityLimit > 0 ? `
                        <div class="event-capacity-wrap">
                            <div class="flex justify-between text-xs text-gray">
                                <span>Capacity: <strong>${activeRegs} / ${e.capacityLimit}</strong></span>
                                <span>${capPct}% filled</span>
                            </div>
                            <div class="event-cap-bar">
                                <div class="event-cap-fill" style="width:${capPct}%"></div>
                            </div>
                        </div>
                    ` : ''}

                    <p class="text-xs text-gray" style="line-height:1.4;margin:var(--sp-2) 0;flex-grow:1">
                        ${escapeHTML((e.description || '').slice(0, 110))}...
                    </p>

                    <div class="flex gap-2" style="margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--gray-100)">
                        ${e.isRegistered ? `
                            <button class="btn btn-secondary btn-sm" style="flex:1" onclick="cancelEventRegistration('${e._id}')">Cancel RSVP</button>
                        ` : (e.computedState === 'Registration Open' || e.computedState === 'Registration Closing Soon') ? `
                            <button class="btn btn-primary btn-sm" style="flex:1" onclick="registerForEvent('${e._id}')">🎟️ Register</button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" style="flex:1" disabled>${e.computedState}</button>
                        `}
                        <a href="/api/events/${e._id}/calendar.ics" download="event-${e._id}.ics" class="btn btn-secondary btn-sm" title="Add to Calendar">
                            📅 iCal
                        </a>
                        <button class="btn btn-secondary btn-sm" onclick="openEventModal('${e._id}')">Details</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function registerForEvent(id) {
    try {
        const res = await api.post(`/events/${id}/register`, {});
        if (res.success) {
            showToast('Registered successfully! Confirmation sent.', 'success');
            loadCampusUpdates();
            loadNotifications();
        } else {
            showToast(res.message || 'Registration failed', 'error');
        }
    } catch (err) {
        showToast('Registration failed', 'error');
    }
}

async function cancelEventRegistration(id) {
    if (!confirm('Cancel your registration for this event?')) return;
    try {
        const res = await api.post(`/events/${id}/cancel-registration`, {});
        if (res.success) {
            showToast('Registration cancelled', 'info');
            loadCampusUpdates();
        } else {
            showToast(res.message || 'Error cancelling', 'error');
        }
    } catch (err) {
        showToast('Error cancelling registration', 'error');
    }
}

async function openEventModal(id) {
    try {
        const res = await api.get(`/events/${id}`);
        if (!res.success || !res.data) return;
        const e = res.data;

        document.getElementById('edModalTitle').textContent = e.title;
        document.getElementById('edModalBody').innerHTML = `
            <div class="flex items-center gap-2" style="margin-bottom:var(--sp-3);flex-wrap:wrap">
                <span class="badge badge-blue">${escapeHTML(e.category)}</span>
                <span class="badge badge-purple">${escapeHTML(e.organizingDepartment)}</span>
                <span class="badge badge-teal">${e.computedState}</span>
            </div>
            <div style="font-size:var(--text-sm);color:var(--navy);line-height:1.6;margin-bottom:var(--sp-4)">
                ${escapeHTML(e.description)}
            </div>
            <div class="grid grid-2" style="gap:var(--sp-3);background:var(--gray-50);padding:var(--sp-3);border-radius:var(--radius-md);margin-bottom:var(--sp-4)">
                <div><strong>📅 Date:</strong> ${new Date(e.eventDate).toLocaleDateString()} (${e.startTime} - ${e.endTime})</div>
                <div><strong>📍 Venue:</strong> ${escapeHTML(e.venue)}</div>
                <div><strong>👤 Organizer:</strong> ${escapeHTML(e.organizerName || 'Coordinator')}</div>
                <div><strong>👥 Eligibility:</strong> ${escapeHTML(e.eligibilityCriteria || 'All Students')}</div>
            </div>
            ${e.onlineMeetingLink ? `<div style="margin-bottom:var(--sp-3)"><strong>Meeting Link:</strong> <a href="${escapeHTML(e.onlineMeetingLink)}" target="_blank">${escapeHTML(e.onlineMeetingLink)}</a></div>` : ''}
        `;

        document.getElementById('edModalFooter').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('eventDetailsModal')">Close</button>
            <a href="/api/events/${e._id}/calendar.ics" download="event.ics" class="btn btn-secondary">Download .ics</a>
            ${e.isRegistered ? `<button class="btn btn-secondary" onclick="cancelEventRegistration('${e._id}');closeModal('eventDetailsModal')">Cancel RSVP</button>` : `<button class="btn btn-primary" onclick="registerForEvent('${e._id}');closeModal('eventDetailsModal')">Register Now</button>`}
        `;

        showModal('eventDetailsModal');
    } catch (err) {
        console.error('Error opening event modal:', err);
    }
}


// ══════════════════════════════════════════════════════════════
//  MODULE 2: AI-POWERED LOST & FOUND
// ══════════════════════════════════════════════════════════════

function selectLFTypeFilter(type, btn) {
    activeLFType = type;
    document.querySelectorAll('[data-lf-type]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadLostFoundItems();
}

function handleLFSearch() {
    filterLFItems();
}

async function loadLostFoundItems() {
    try {
        let url = '/lostfound?';
        if (activeLFType === 'lost' || activeLFType === 'found') {
            url += `type=${activeLFType}&`;
        } else if (activeLFType === 'my_reports') {
            url += 'my_reports=true&';
        }

        const res = await api.get(url);
        if (res.success) {
            lfItemsList = res.data || [];
            renderLFItems(lfItemsList);
        }
    } catch (err) {
        console.error('Error loading lost found items:', err);
    }
}

function filterLFItems() {
    const term = (document.getElementById('lfSearchInput')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('lfCategoryFilter')?.value || 'All Categories';
    const loc = (document.getElementById('lfLocationFilter')?.value || '').toLowerCase().trim();
    const status = document.getElementById('lfStatusFilter')?.value || 'All';

    const filtered = lfItemsList.filter(item => {
        const matchesTerm = !term ||
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.description && item.description.toLowerCase().includes(term)) ||
            (item.location && item.location.toLowerCase().includes(term)) ||
            (item.color && item.color.toLowerCase().includes(term));

        const matchesCat = cat === 'All Categories' || item.category === cat;
        const matchesLoc = !loc || (item.location && item.location.toLowerCase().includes(loc));
        const matchesStatus = status === 'All' || item.status === status;

        return matchesTerm && matchesCat && matchesLoc && matchesStatus;
    });

    renderLFItems(filtered);
}

function renderLFItems(items = []) {
    const grid = document.getElementById('lfGrid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="card col-12" style="text-align:center;padding:var(--sp-8);grid-column:1/-1">
                <div style="font-size:36px;margin-bottom:var(--sp-2)">📦</div>
                <h4 style="color:var(--navy);margin-bottom:var(--sp-1)">No items match your criteria</h4>
                <p class="text-sm text-gray">Search other campus zones or report a lost/found item</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => {
        const isLost = item.type === 'lost';
        const isMatchFound = item.status === 'potential_match';
        const isResolved = item.status === 'returned' || item.status === 'resolved';

        return `
            <div class="lf-card">
                <div class="lf-card-header">
                    <div class="flex items-center gap-2">
                        <span style="font-size:24px">${item.icon || (isLost ? '🔍' : '✨')}</span>
                        <div>
                            <span class="lf-type-pill ${isLost ? 'lost' : 'found'}">${isLost ? 'LOST' : 'FOUND'}</span>
                            <span class="badge ${isResolved ? 'badge-teal' : isMatchFound ? 'badge-purple' : 'badge-gray'}" style="margin-left:4px;font-size:10px">
                                ${isMatchFound ? '⚡ AI Match Detected' : item.status}
                            </span>
                        </div>
                    </div>
                    ${item.color ? `<span class="badge badge-gray text-xs">🎨 ${escapeHTML(item.color)}</span>` : ''}
                </div>

                <h3 style="font-size:var(--text-base);font-weight:700;color:var(--navy);margin-bottom:var(--sp-2)">
                    ${escapeHTML(item.name)}
                </h3>

                <div class="text-xs text-gray" style="margin-bottom:4px">
                    📍 <strong>Location:</strong> ${escapeHTML(item.location || 'Campus')}
                </div>
                <div class="text-xs text-gray" style="margin-bottom:var(--sp-2)">
                    🕒 <strong>When:</strong> ${new Date(item.dateOccurred).toLocaleDateString()} ${item.timeApprox ? `(${escapeHTML(item.timeApprox)})` : ''}
                </div>

                <p class="text-xs text-gray" style="line-height:1.45;flex-grow:1;margin-bottom:var(--sp-3)">
                    ${escapeHTML((item.description || '').slice(0, 130))}
                </p>

                ${item.holdingLocation ? `
                    <div style="margin-bottom:var(--sp-3)">
                        <span class="badge ${item.handedToSecurity ? 'badge-teal' : 'badge-blue'}" style="font-size:11px">
                            ${item.handedToSecurity ? '🛡️ Held at Security Desk' : `🏢 ${escapeHTML(item.holdingLocation)}`}
                        </span>
                    </div>
                ` : ''}

                <div class="flex gap-2" style="padding-top:var(--sp-3);border-top:1px solid var(--gray-100)">
                    <button class="btn btn-secondary btn-sm" style="flex:1" onclick="checkMatches('${item._id}')">
                        ⚡ AI Matches
                    </button>
                    ${!isResolved ? `
                        <button class="btn btn-primary btn-sm" onclick="openClaimModal('${item._id}', '${escapeHTML(item.name)}')">
                            Claim Item
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-sm" disabled>Returned</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function checkMatches(itemId) {
    try {
        const res = await api.get(`/lostfound/${itemId}/matches`);
        if (!res.success) return;

        const body = document.getElementById('aiMatchesModalBody');
        const matches = res.matches || [];

        if (matches.length === 0) {
            body.innerHTML = `
                <div style="text-align:center;padding:var(--sp-6)">
                    <div style="font-size:40px;margin-bottom:var(--sp-2)">🔍</div>
                    <h4 style="color:var(--navy)">No potential matches found yet</h4>
                    <p class="text-sm text-gray">CampusAI continuously compares incoming reports. You will be alerted as soon as a matching item is recorded.</p>
                </div>
            `;
        } else {
            body.innerHTML = `
                <div style="margin-bottom:var(--sp-4);background:var(--blue-muted);padding:var(--sp-3);border-radius:var(--radius-md)">
                    <strong style="color:var(--navy)">AI Matching Engine Analysis:</strong>
                    Scored ${matches.length} candidate reports using 3-stage semantic clustering, weighted keyword vectors, and date/location proximity.
                </div>
                <div style="display:flex;flex-direction:column;gap:var(--sp-3)">
                    ${matches.map(m => {
                        const item = m.item;
                        const score = m.score;
                        const strengthBadge = score >= 75 ? 'badge-teal' : score >= 50 ? 'badge-blue' : 'badge-amber';

                        return `
                            <div class="card" style="padding:var(--sp-4);border:1px solid var(--gray-200)">
                                <div class="flex items-center justify-between" style="margin-bottom:var(--sp-2)">
                                    <div class="flex items-center gap-2">
                                        <span class="match-score-badge">⚡ ${score}% Match</span>
                                        <span class="badge ${strengthBadge}">${m.strength}</span>
                                    </div>
                                    <span class="lf-type-pill ${item.type === 'lost' ? 'lost' : 'found'}">${item.type.toUpperCase()}</span>
                                </div>

                                <h4 style="color:var(--navy);font-weight:700;margin-bottom:4px">${escapeHTML(item.name)}</h4>
                                <div class="text-xs text-gray" style="margin-bottom:var(--sp-2)">
                                    📍 <strong>Found At:</strong> ${escapeHTML(item.location)} · <strong>Date:</strong> ${new Date(item.dateOccurred).toLocaleDateString()}
                                </div>
                                <p class="text-xs text-gray" style="line-height:1.45;margin-bottom:var(--sp-3)">
                                    ${escapeHTML(item.description)}
                                </p>

                                <div class="flex flex-wrap gap-1" style="margin-bottom:var(--sp-3)">
                                    ${(m.traits || []).map(t => `<span class="badge badge-purple" style="font-size:10px">✓ ${escapeHTML(t)}</span>`).join('')}
                                </div>

                                <div class="flex justify-between items-center" style="padding-top:var(--sp-2);border-top:1px solid var(--gray-100)">
                                    <span class="text-xs text-gray">${item.holdingLocation ? `Holding: ${escapeHTML(item.holdingLocation)}` : ''}</span>
                                    <button class="btn btn-primary btn-sm" onclick="closeModal('aiMatchesModal');openClaimModal('${item._id}', '${escapeHTML(item.name)}')">
                                        Verify & Claim Item →
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        showModal('aiMatchesModal');
    } catch (err) {
        showToast('Error evaluating AI matches', 'error');
    }
}

function openReportModal(type) {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'lost') {
        const dateInput = document.getElementById('lostItemDate');
        if (dateInput) dateInput.value = today;
        showModal('reportLostModal');
    } else {
        const dateInput = document.getElementById('foundItemDate');
        if (dateInput) dateInput.value = today;
        showModal('reportFoundModal');
    }
}

async function submitLostReport(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitLost');
    if (btn) btn.disabled = true;

    try {
        const payload = {
            name: document.getElementById('lostItemName').value,
            type: 'lost',
            category: document.getElementById('lostItemCategory').value,
            color: document.getElementById('lostItemColor').value,
            dateOccurred: document.getElementById('lostItemDate').value,
            timeApprox: document.getElementById('lostItemTime').value,
            location: document.getElementById('lostItemLocation').value,
            description: document.getElementById('lostItemDesc').value,
            contactPreference: document.getElementById('lostItemContactPref').value
        };

        const res = await api.post('/lostfound', payload);
        if (res.success) {
            showToast('Lost item report submitted! AI matching active.', 'success');
            closeModal('reportLostModal');
            document.getElementById('reportLostForm').reset();
            loadLostFoundItems();
            loadNotifications();
        } else {
            showToast(res.message || 'Submission error', 'error');
        }
    } catch (err) {
        showToast('Error submitting report', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function submitFoundReport(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitFound');
    if (btn) btn.disabled = true;

    try {
        const payload = {
            name: document.getElementById('foundItemName').value,
            type: 'found',
            category: document.getElementById('foundItemCategory').value,
            color: document.getElementById('foundItemColor').value,
            dateOccurred: document.getElementById('foundItemDate').value,
            location: document.getElementById('foundItemLocation').value,
            description: document.getElementById('foundItemDesc').value,
            holdingLocation: document.getElementById('foundHoldingLocation').value,
            handedToSecurity: document.getElementById('foundHandedToSecurity').checked
        };

        const res = await api.post('/lostfound', payload);
        if (res.success) {
            showToast('Found item reported! Thank you for helping peers.', 'success');
            closeModal('reportFoundModal');
            document.getElementById('reportFoundForm').reset();
            loadLostFoundItems();
        } else {
            showToast(res.message || 'Submission error', 'error');
        }
    } catch (err) {
        showToast('Error submitting report', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function openClaimModal(id, title) {
    document.getElementById('claimItemId').value = id;
    document.getElementById('claimItemTitleDisplay').value = title;
    document.getElementById('claimProofDetails').value = '';
    document.getElementById('claimContactInfo').value = currentStudentUser.email || '';
    showModal('claimItemModal');
}

async function submitItemClaim(e) {
    e.preventDefault();
    const id = document.getElementById('claimItemId').value;
    const btn = document.getElementById('btnSubmitClaim');
    if (btn) btn.disabled = true;

    try {
        const payload = {
            proofDetails: document.getElementById('claimProofDetails').value,
            contactInfo: document.getElementById('claimContactInfo').value
        };

        const res = await api.post(`/lostfound/${id}/claim`, payload);
        if (res.success) {
            showToast('Ownership claim submitted! Security & finder notified.', 'success');
            closeModal('claimItemModal');
            loadLostFoundItems();
        } else {
            showToast(res.message || 'Claim error', 'error');
        }
    } catch (err) {
        showToast('Error submitting claim', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}


// ══════════════════════════════════════════════════════════════
//  NOTIFICATION CENTER
// ══════════════════════════════════════════════════════════════

async function loadNotifications() {
    try {
        const res = await api.get('/notifications');
        if (!res.success) return;

        const notifs = res.data || [];
        const unreadCount = res.unreadCount || 0;

        const updatesBadge = document.getElementById('navUpdatesBadge');
        if (updatesBadge) {
            updatesBadge.textContent = unreadCount > 0 ? unreadCount : 'New';
            updatesBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }

        const notifListEl = document.getElementById('notifList');
        if (!notifListEl) return;

        if (notifs.length === 0) {
            notifListEl.innerHTML = `
                <div style="text-align:center;padding:var(--sp-6)">
                    <div style="font-size:36px;margin-bottom:var(--sp-2)">🔔</div>
                    <div class="fw-600 text-navy">No notifications</div>
                    <div class="text-xs text-gray">You're completely up to date!</div>
                </div>
            `;
            return;
        }

        notifListEl.innerHTML = notifs.map(n => {
            const icon = n.type === 'notice' ? '📢' : n.type === 'event' ? '🎟️' : n.type === 'lostfound' ? '⚡' : '🛡️';
            return `
                <div class="flex items-start gap-3" style="padding:var(--sp-3);border-bottom:1px solid var(--gray-100);background:${n.read ? 'white' : '#F0F9FF'};border-radius:var(--radius-md);margin-bottom:4px">
                    <span style="font-size:20px">${icon}</span>
                    <div style="flex-grow:1;cursor:pointer" onclick="handleNotificationClick('${n.linkTab || 'updates'}', '${n.targetId || ''}', '${n._id}')">
                        <div class="fw-700 text-navy text-sm">${escapeHTML(n.title)}</div>
                        <div class="text-xs text-gray" style="margin:2px 0 4px">${escapeHTML(n.message)}</div>
                        <span class="text-xs text-gray">${formatTimeAgo(n.createdAt)}</span>
                    </div>
                    ${!n.read ? `
                        <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:2px 6px" onclick="markNotificationRead('${n._id}')">
                            Mark Read
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

async function markNotificationRead(id) {
    try {
        await api.post(`/notifications/${id}/read`, {});
        loadNotifications();
    } catch (err) {
        console.error('Error marking read:', err);
    }
}

async function markAllNotificationsAsRead() {
    try {
        await api.post('/notifications/read-all', {});
        showToast('All notifications marked as read', 'success');
        loadNotifications();
    } catch (err) {
        showToast('Error updating notifications', 'error');
    }
}

function handleNotificationClick(tab, targetId, notifId) {
    if (notifId) markNotificationRead(notifId);
    if (tab === 'updates') {
        switchTab('updates', document.getElementById('navUpdates'));
        if (targetId) openNoticeModal(targetId);
    } else if (tab === 'lostfound') {
        switchTab('lostfound', document.getElementById('navLostFound'));
        if (targetId) checkMatches(targetId);
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
