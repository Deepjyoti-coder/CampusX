/**
 * Comprehensive Automated Verification Suite for CampusAI:
 * 1. Deep identity check across users
 * 2. Department-Wise Smart Notices & Event Management
 * 3. AI-Powered Lost & Found Matching & Claim Workflows
 * 4. Notifications & Personalization
 * 5. Administrative Publishing, Moderation, & Audit Logs
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function assert(condition, message, extra = null) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`, extra ? JSON.stringify(extra) : '');
        process.exit(1);
    } else {
        console.log(`  ✓ ${message}`);
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🚀 RUNNING CAMPUSAI E2E SUITE: NOTICES, EVENTS, LOST & FOUND, AND DEEP IDENTITY');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // 1. AUTHENTICATION & IDENTITY CHECK
    console.log('▶ Step 1: Authentication & Identity Check (Deep Das)...');
    const studentLogin = await request('POST', '/auth/login', {
        email: 'deep@campus.edu',
        password: 'password123'
    });
    assert(studentLogin.status === 200, 'Student login HTTP 200');
    assert(studentLogin.body.data.user.name === 'Deep Das', 'Student user name is Deep Das (not Arya)');
    assert(studentLogin.body.data.user.department.includes('Computer Science'), 'Deep is in CSE');
    assert(studentLogin.body.data.user.year === 3, 'Deep is Year 3');
    const studentToken = studentLogin.body.data.token;

    const adminLogin = await request('POST', '/auth/login', {
        email: 'admin@campus.edu',
        password: 'password123'
    });
    assert(adminLogin.status === 200, 'Admin login HTTP 200');
    const adminToken = adminLogin.body.data.token;

    // 2. CONFIGURABLE DEPARTMENTS
    console.log('\n▶ Step 2: Configurable Department Management...');
    const deptsRes = await request('GET', '/departments');
    assert(deptsRes.status === 200, 'Get departments HTTP 200');
    const deptsCount = deptsRes.body.count || (deptsRes.body.data ? deptsRes.body.data.length : 0);
    assert(deptsCount >= 8, `Seeded departments count >= 8 (Found: ${deptsCount})`);

    const newDeptCode = 'TEST-DS-' + Date.now().toString().slice(-4);
    const createDeptRes = await request('POST', '/departments', {
        code: newDeptCode,
        name: 'Data Science & Artificial Intelligence ' + newDeptCode,
        coordinator: 'Dr. S. K. Bose'
    }, adminToken);
    assert(createDeptRes.status === 201, `Admin can create new department (${newDeptCode})`, createDeptRes);

    // 3. AI WRITING ASSISTANT FOR NOTICES & EVENTS
    console.log('\n▶ Step 3: AI Notice & Event Writing Assistant...');
    const aiBulletsRes = await request('POST', '/notices/ai-assist', {
        action: 'bullets_to_notice',
        bullets: 'Mid term tests from 20th Oct, timing 10am to 1pm, Hall 4, bring university ID card',
        title: ''
    }, adminToken);
    assert(aiBulletsRes.status === 200, 'Notice AI bullets_to_notice HTTP 200');
    assert(aiBulletsRes.body.data.content && aiBulletsRes.body.data.content.length > 50, 'AI generated structured notice content');
    assert(Boolean(aiBulletsRes.body.data.title), 'AI generated a relevant notice title');

    const aiEventRes = await request('POST', '/events/ai-assist', {
        action: 'generate_event',
        eventData: {
            title: 'Cloud Native & Docker Hands-on Bootcamp',
            category: 'Workshop',
            department: 'Computer Science & Engineering',
            date: '2026-11-15'
        }
    }, adminToken);
    assert(aiEventRes.status === 200, 'Event AI generate_event HTTP 200');
    assert(aiEventRes.body.data.description && aiEventRes.body.data.description.length > 50, 'AI generated event description');

    // 4. NOTICE CREATION, AUDIENCE TARGETING, BOOKMARK & READ STATUS
    console.log('\n▶ Step 4: Department-Wise Notice Organization & Student Access...');
    const newNoticeRes = await request('POST', '/notices', {
        title: 'Special CSE Batch 2026 Competitive Programming Trials',
        description: 'Selection round for the Inter-College ICPC regionals. Register before Friday.',
        department: 'Computer Science & Engineering',
        departments: ['CSE'],
        targetYears: [3, 4],
        category: 'Competition',
        priority: 'high',
        isPinned: true
    }, adminToken);
    assert(newNoticeRes.status === 201, 'Notice creation with department & year targeting HTTP 201');
    const noticeId = newNoticeRes.body.data._id;

    // Student fetches feed (For You)
    const forYouRes = await request('GET', '/notices?scope=for_you', null, studentToken);
    assert(forYouRes.status === 200, 'Student fetch "For You" notices HTTP 200');
    const foundTargetNotice = forYouRes.body.data.find(n => n._id === noticeId);
    assert(Boolean(foundTargetNotice), 'Deep (CSE Year 3) sees targeted CSE notice in "For You"');

    // Student bookmarks notice
    const bookmarkRes = await request('POST', `/notices/${noticeId}/bookmark`, null, studentToken);
    assert(bookmarkRes.status === 200, 'Student bookmarks notice');
    assert(bookmarkRes.body.isSaved === true, 'Notice marked as saved');

    // Student marks notice as read
    const readRes = await request('POST', `/notices/${noticeId}/read`, null, studentToken);
    assert(readRes.status === 200, 'Student marks notice as read');
    assert(readRes.body.isRead === true, 'Notice marked as read');

    // 5. EVENT CREATION, REGISTRATION, CAPACITY ENFORCEMENT & ICAL EXPORT
    console.log('\n▶ Step 5: Event Management, Duplicate & Capacity Protection, iCal Export...');
    const newEventRes = await request('POST', '/events', {
        title: 'Quantum Computing & Algorithms Masterclass',
        description: 'Deep dive into Qubits and Qiskit programming with visiting research scientists.',
        department: 'Computer Science & Engineering',
        category: 'Guest Lecture',
        date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Seminar Hall 3B',
        capacity: 2, // Low capacity to test full limit
        eligibility: 'Open to All Students'
    }, adminToken);
    assert(newEventRes.status === 201, 'Admin event creation HTTP 201');
    const eventId = newEventRes.body.data._id;

    // Student registers for event
    const regRes = await request('POST', `/events/${eventId}/register`, null, studentToken);
    assert(regRes.status === 200, 'Student registers for event');

    // Duplicate registration attempt must fail
    const dupRegRes = await request('POST', `/events/${eventId}/register`, null, studentToken);
    assert(dupRegRes.status === 400, 'Duplicate registration correctly blocked (HTTP 400)');
    assert(dupRegRes.body.message.includes('already registered'), 'Duplicate registration error message verified');

    // Calendar .ics export
    const icalRes = await request('GET', `/events/${eventId}/calendar`, null, studentToken);
    assert(icalRes.status === 200, 'Event iCal .ics download HTTP 200');
    assert(typeof icalRes.body === 'string' && icalRes.body.includes('BEGIN:VCALENDAR'), 'Valid iCalendar format received');

    // Student cancels registration
    const cancelRegRes = await request('DELETE', `/events/${eventId}/register`, null, studentToken);
    assert(cancelRegRes.status === 200, 'Student registration cancellation HTTP 200');

    // 6. AI-POWERED LOST & FOUND AND 3-STAGE MATCHING ENGINE
    console.log('\n▶ Step 6: Lost & Found Reporting & 3-Stage Matching Engine...');
    // Report lost item
    const lostItemRes = await request('POST', '/lostfound', {
        type: 'lost',
        name: 'Matte Grey Dell XPS Laptop Charger',
        category: 'Electronics',
        location: 'Central Library 2nd Floor Reading Room',
        color: 'Grey',
        approxDate: new Date().toISOString(),
        description: '130W USB-C Dell adapter with rubber cord strap and slight scrape on the brick plug.',
        contactPreference: 'In-App'
    }, studentToken);
    assert(lostItemRes.status === 201, 'Student reports lost item HTTP 201');
    const lostItemId = lostItemRes.body.data._id;

    // Report found item with matching semantics
    const foundItemRes = await request('POST', '/lostfound', {
        type: 'found',
        name: 'Dell Type-C Power Adapter',
        category: 'Electronics',
        location: 'Central Library Reading Desk',
        color: 'Grey',
        approxDate: new Date().toISOString(),
        description: 'Original Dell USB Type-C high power charger block found plugged near reading carrel.',
        holdingLocation: 'Library Circulation Counter',
        isSensitive: false
    }, adminToken);
    assert(foundItemRes.status === 201, 'Report found item HTTP 201');
    const foundItemId = foundItemRes.body.data._id;

    // Run AI Matching Engine
    const matchesRes = await request('GET', `/lostfound/${lostItemId}/matches`);
    assert(matchesRes.status === 200, 'Matching engine HTTP 200');
    assert(matchesRes.body.matches && matchesRes.body.matches.length > 0, 'Matching engine found candidate match');
    const bestMatch = matchesRes.body.matches[0];
    const score = bestMatch.matchScore || bestMatch.score;
    assert(score >= 50, `Matching score computed: ${score}% (>= 50%)`);
    assert(Boolean(bestMatch.matchingCharacteristics || bestMatch.characteristics), 'Matching characteristics explained in result');

    // 7. PRIVACY REDACTION ON CONFIDENTIAL ITEMS
    console.log('\n▶ Step 7: Confidentiality & Sensitive Item Privacy Protection...');
    const sensitiveRes = await request('POST', '/lostfound', {
        type: 'found',
        name: 'Student ID Card (Deep Das)',
        category: 'ID Cards & Documents',
        location: 'Cafeteria Table 4',
        color: 'Blue',
        approxDate: new Date().toISOString(),
        description: 'Official College ID Card with photo and roll number.',
        isSensitive: true,
        secretIdentifyingDetails: 'Roll Number 2023CSE089, bar code 9842109, blood group O+'
    }, adminToken);
    assert(sensitiveRes.status === 201, 'Sensitive found item registered HTTP 201');
    const sensitiveItemId = sensitiveRes.body.data._id;

    // Fetch from public student view — secret identifying details must be redacted!
    const publicViewRes = await request('GET', `/lostfound/${sensitiveItemId}`);
    assert(publicViewRes.status === 200, 'Public fetch of sensitive item HTTP 200');
    assert(publicViewRes.body.data.secretIdentifyingDetails === undefined, 'Secret identifying details redacted from public JSON');

    // 8. SECURE OWNERSHIP CLAIM WORKFLOW
    console.log('\n▶ Step 8: Secure Ownership Claim Workflow & Verification...');
    const claimRes = await request('POST', `/lostfound/${foundItemId}/claim`, {
        message: 'This is my daily charger that I forgot on Tuesday afternoon.',
        proofDetails: 'Dell model DA130PM170, cord has black velcro tie, small nick near the wall prong.'
    }, studentToken);
    assert(claimRes.status === 201 || claimRes.status === 200, 'Student submits ownership claim HTTP 201/200', claimRes);
    assert(claimRes.body.data.claims && claimRes.body.data.claims.length > 0, 'Claim attached to found item');
    const claimId = claimRes.body.data.claims[0]._id;

    // Admin verifies and approves claim
    const reviewClaimRes = await request('POST', `/lostfound/${foundItemId}/claims/${claimId}/review`, {
        action: 'approve',
        reviewNotes: 'Verified serial number and cord markings match physical item.'
    }, adminToken);
    assert(reviewClaimRes.status === 200, 'Admin approves claim HTTP 200');
    assert(reviewClaimRes.body.data.status === 'returned', 'Item status transitioned to "returned"');

    // Admin moderation action: mark at security
    const modRes = await request('PATCH', `/lostfound/admin/moderation/${lostItemId}`, {
        receivedBySecurity: true,
        notes: 'Transferred to Security Office'
    }, adminToken);
    assert(modRes.status === 200, 'Admin moderation action HTTP 200');
    assert(modRes.body.data.handedToSecurity === true, 'Item marked as received by Campus Security');

    // 9. IN-APP NOTIFICATION CENTER & UNREAD COUNT
    console.log('\n▶ Step 9: In-App Notification Center & Unread Count...');
    const notifsRes = await request('GET', '/notifications', null, studentToken);
    assert(notifsRes.status === 200, 'Student fetch notifications HTTP 200');
    assert(notifsRes.body.data && notifsRes.body.data.length > 0, 'Student has received notifications');
    const firstNotifId = notifsRes.body.data[0]._id;

    const markReadRes = await request('PATCH', `/notifications/${firstNotifId}/read`, null, studentToken);
    assert(markReadRes.status === 200, 'Notification marked as read HTTP 200');

    // 10. ADMINISTRATIVE AUDIT LOGGING
    console.log('\n▶ Step 10: Administrative Audit Log Trail...');
    const auditRes = await request('GET', '/admin/audit-logs', null, adminToken);
    assert(auditRes.status === 200, 'Admin audit logs HTTP 200');
    assert(auditRes.body.count > 0, `Recorded audit logs count: ${auditRes.body.count}`);

    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('🎉 ALL 28 E2E ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY WITH 100% PASS RATE!');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
}

runTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
