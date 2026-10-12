require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Book = require('./models/Book');
const Notice = require('./models/Notice');
const Event = require('./models/Event');
const LostFound = require('./models/LostFound');
const Attendance = require('./models/Attendance');
const Department = require('./models/Department');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');

async function seed({ clear = true } = {}) {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }
    console.log('🌱 Seeding database...\n');

    // ── Clear existing data ──
    if (clear) {
        await Promise.all([
            User.deleteMany({}), Book.deleteMany({}), Notice.deleteMany({}),
            Event.deleteMany({}), LostFound.deleteMany({}), Attendance.deleteMany({}),
            Department.deleteMany({}), Notification.deleteMany({}), AuditLog.deleteMany({})
        ]);
    }

    // ── 1. Users ──
    const hashedPw = await bcrypt.hash('password123', 12);
    const users = await User.insertMany([
        { name: 'Deep Das', email: 'deep@campus.edu', password: hashedPw, role: 'student', department: 'Computer Science', year: 3, skills: ['React', 'Node.js', 'Python', 'MongoDB'], avatar: 'DD' },
        { name: 'Admin User', email: 'admin@campus.edu', password: hashedPw, role: 'admin', department: 'Administration', avatar: 'AU' },
        { name: 'Librarian', email: 'librarian@campus.edu', password: hashedPw, role: 'librarian', department: 'Library', avatar: 'LB' },
        { name: 'Dr. Priya Sharma', email: 'priya@alumni.edu', password: hashedPw, role: 'alumni', department: 'AI/ML', skills: ['Machine Learning', 'Deep Learning', 'Python', 'Research'], avatar: 'PS' },
        { name: 'Rahul Verma', email: 'rahul@alumni.edu', password: hashedPw, role: 'alumni', department: 'Web Development', skills: ['React', 'Node.js', 'MongoDB', 'AWS'], avatar: 'RV' },
        { name: 'Sneha Kapoor', email: 'sneha@alumni.edu', password: hashedPw, role: 'alumni', department: 'Frontend', skills: ['Vue.js', 'TypeScript', 'Figma', 'CSS'], avatar: 'SK' },
        { name: 'Vikram Singh', email: 'vikram@campus.edu', password: hashedPw, role: 'student', department: 'Computer Science', year: 4, skills: ['Algorithms', 'C++', 'Problem Solving', 'DSA'], avatar: 'VS' },
        { name: 'Ananya Gupta', email: 'ananya@campus.edu', password: hashedPw, role: 'student', department: 'Data Science', year: 3, skills: ['Data Analysis', 'Statistics', 'R', 'Tableau'], avatar: 'AG' },
    ]);
    console.log(`✅ ${users.length} users created (Deep Das as demo student)`);
    const deep = users[0];
    const admin = users[1];
    const librarian = users[2];
    const vikram = users[6];

    // ── 2. Departments ──
    const departments = await Department.insertMany([
        { name: 'Computer Science and Engineering', code: 'CSE', description: 'Department of Computer Science and Engineering', headOfDepartment: 'Dr. Rajesh Rao', contactEmail: 'cse@campus.edu', displayOrder: 1 },
        { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology', headOfDepartment: 'Dr. Sunita Mehta', contactEmail: 'it@campus.edu', displayOrder: 2 },
        { name: 'Electronics and Communication', code: 'ECE', description: 'Department of Electronics & Communication Engineering', headOfDepartment: 'Prof. Alok Gupta', contactEmail: 'ece@campus.edu', displayOrder: 3 },
        { name: 'Mechanical Engineering', code: 'ME', description: 'Department of Mechanical Engineering', headOfDepartment: 'Dr. Ramesh Patel', contactEmail: 'me@campus.edu', displayOrder: 4 },
        { name: 'Civil Engineering', code: 'CE', description: 'Department of Civil Engineering', headOfDepartment: 'Dr. K. Srinivas', contactEmail: 'ce@campus.edu', displayOrder: 5 },
        { name: 'Electrical Engineering', code: 'EE', description: 'Department of Electrical & Electronics Engineering', headOfDepartment: 'Prof. Neha Sen', contactEmail: 'ee@campus.edu', displayOrder: 6 },
        { name: 'Management Studies', code: 'MBA', description: 'Department of Management and Business Administration', headOfDepartment: 'Dr. Vikram Malhotra', contactEmail: 'mgmt@campus.edu', displayOrder: 7 },
        { name: 'University-wide', code: 'UNIV', description: 'Central University Administration & Common Facilities', headOfDepartment: 'Dean of Student Affairs', contactEmail: 'dean@campus.edu', displayOrder: 0 },
    ]);
    console.log(`✅ ${departments.length} departments seeded`);

    // ── 3. Books ──
    const books = await Book.insertMany([
        { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'cs', tags: ['programming', 'best practices', 'agile'], copies: 5, available: 3, location: 'Zone A → Row 3 → Shelf 12', cover: '📘', description: 'Even bad code can function.' },
        { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen, Charles E. Leiserson', isbn: '978-0262033848', category: 'cs', tags: ['algorithms', 'data structures', 'computer science'], copies: 8, available: 2, location: 'Zone A → Row 1 → Shelf 5', cover: '📗', description: 'The Bible of algorithms.' },
        { title: 'Design Patterns: Elements of Reusable Object-Oriented Software', author: 'Gang of Four', isbn: '978-0201633610', category: 'cs', tags: ['design patterns', 'oop'], copies: 4, available: 4, location: 'Zone A → Row 3 → Shelf 14', cover: '📙', description: 'Capturing experience in object-oriented software.' },
        { title: 'Machine Learning: A Probabilistic Perspective', author: 'Kevin P. Murphy', isbn: '978-0262018029', category: 'cs', tags: ['machine learning', 'AI'], copies: 6, available: 0, location: 'Zone B → Row 2 → Shelf 8', cover: '🤖', description: 'Comprehensive introduction to ML.' },
        { title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '978-1285741550', category: 'math', tags: ['calculus', 'mathematics'], copies: 12, available: 7, location: 'Zone C → Row 1 → Shelf 3', cover: '📐', description: 'Calculus textbook.' },
        { title: 'Linear Algebra Done Right', author: 'Sheldon Axler', isbn: '978-3319110790', category: 'math', tags: ['linear algebra', 'mathematics'], copies: 5, available: 5, location: 'Zone C → Row 2 → Shelf 6', cover: '📊', description: 'Linear algebra concepts.' },
        { title: 'Physics for Scientists and Engineers', author: 'Raymond A. Serway', isbn: '978-1133947271', category: 'physics', tags: ['physics'], copies: 10, available: 4, location: 'Zone D → Row 1 → Shelf 2', cover: '⚛️', description: 'Standard physics textbook.' },
        { title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', isbn: '978-0135957059', category: 'cs', tags: ['programming', 'software'], copies: 6, available: 1, location: 'Zone A → Row 4 → Shelf 18', cover: '💻', description: 'Timeless lessons for programmers.' },
    ]);
    console.log(`✅ ${books.length} books created`);

    // ── 4. Smart Notices (Department-Wise & Audience Targeted) ──
    const notices = await Notice.insertMany([
        {
            title: 'Mid-Semester Examination Schedule — Spring 2026',
            content: 'The official timetable for Mid-Semester Examinations has been announced by the Controller of Examinations. All 2nd, 3rd, and 4th year students must report to their assigned examination halls 15 minutes before commencement. Admit cards are available on the student portal.',
            departments: ['Computer Science and Engineering', 'Information Technology', 'Electronics and Communication', 'Mechanical Engineering'],
            eligibleYears: [2, 3, 4],
            category: 'Examination',
            priority: 'urgent',
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            publishingDepartment: 'Examination Cell',
            authorName: 'Dr. B. K. Sen',
            pinned: true,
            icon: '📝',
            status: 'published',
            attachments: [{ name: 'MidSem_Spring2026_Schedule.pdf', url: '#', type: 'pdf', size: '1.4 MB' }],
            readBy: [deep._id],
            savedBy: [deep._id],
            createdBy: admin._id
        },
        {
            title: 'Google & Microsoft Summer Internship Drive 2026',
            content: 'The Training & Placement Cell invites applications for Software Engineering and Data Science internship roles at Google India and Microsoft IDC. Eligible students: 3rd Year B.Tech (CSE / IT / ECE) with CGPA >= 7.5 and no active backlogs. Upload your latest ATS resume before the deadline.',
            departments: ['Computer Science and Engineering', 'Information Technology', 'Electronics and Communication'],
            eligibleYears: [3],
            category: 'Placement',
            priority: 'high',
            publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            publishingDepartment: 'Training & Placement Cell',
            authorName: 'Dr. Pankaj Ojha',
            pinned: true,
            icon: '💼',
            status: 'published',
            registrationLink: 'https://campusai.edu/internships/register',
            savedBy: [deep._id],
            createdBy: admin._id
        },
        {
            title: 'CSE Department Hackathon: HackStorm 2026 (₹1.5 Lakh Pool)',
            content: 'Calling all coders, innovators, and problem solvers! The Department of Computer Science & Engineering presents HackStorm 2026 — an intense 36-hour hackathon focused on Generative AI, Sustainable Tech, and Autonomous Systems. Free food, mentor guidance, and cloud credits will be provided.',
            departments: ['Computer Science and Engineering', 'Information Technology'],
            eligibleYears: [1, 2, 3, 4],
            category: 'Hackathon',
            priority: 'high',
            publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            publishingDepartment: 'Computer Science and Engineering',
            authorName: 'Prof. Anita Singh',
            pinned: false,
            icon: '⚡',
            status: 'published',
            registrationLink: 'https://hackstorm.campus.edu',
            createdBy: admin._id
        },
        {
            title: 'Central Library Extended 24/7 Hours during Exam Month',
            content: 'In response to student requests, the Central Library reading rooms and digital media labs on the 2nd and 3rd floors will remain open 24/7 beginning next Monday. High-speed Wi-Fi, air conditioning, and tea stations will be available throughout the night. Please carry your student ID card.',
            departments: ['University-wide'],
            eligibleYears: [],
            category: 'Administrative',
            priority: 'normal',
            publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            publishingDepartment: 'Central Library',
            authorName: 'Kavita Patel (Head Librarian)',
            pinned: false,
            icon: '📖',
            status: 'published',
            readBy: [deep._id],
            createdBy: librarian._id
        },
        {
            title: 'National Conference on Quantum Computing & Silicon Photonics',
            content: 'Department of Electronics & Communication Engineering is hosting a 2-day national seminar on Quantum Circuits and Nanophotonics. Renowned scientists from ISRO and IISc will deliver keynote addresses. Paper submissions are open until March 15.',
            departments: ['Electronics and Communication', 'Electrical Engineering'],
            eligibleYears: [3, 4],
            category: 'Academic',
            priority: 'normal',
            publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            publishingDepartment: 'Electronics and Communication',
            authorName: 'Prof. Alok Gupta',
            pinned: false,
            icon: '🔬',
            status: 'published',
            createdBy: admin._id
        },
        {
            title: 'Merit-Cum-Means Scholarship Renewal Notice (2025–26)',
            content: 'Applications are invited from deserving students for the MCM Institutional Scholarships. Family annual income must be below ₹4.5 Lakh. Please submit certified income tax returns and semester mark sheets to the Dean of Students office.',
            departments: ['University-wide'],
            eligibleYears: [1, 2, 3, 4],
            category: 'Scholarship',
            priority: 'high',
            publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            publishingDepartment: 'Student Welfare Section',
            authorName: 'Dean Student Affairs',
            pinned: false,
            icon: '🎓',
            status: 'published',
            createdBy: admin._id
        }
    ]);
    console.log(`✅ ${notices.length} department notices created`);

    // ── 5. Campus Events ──
    const events = await Event.insertMany([
        {
            title: 'CampusAI Hackathon 2026: Agentic Systems & LLMs',
            description: 'A 24-hour university-wide hackathon challenging student teams to build autonomous agents, AI workflows, and campus utility apps. Exciting awards, investor feedback, and tech company interviews for winners.',
            organizingDepartment: 'Computer Science and Engineering',
            clubName: 'ACM Student Chapter & Google Developer Group',
            category: 'Hackathon',
            eventDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            startTime: '09:00 AM',
            endTime: '09:00 AM (Next Day)',
            venue: 'Auditorium Complex & Innovation Hub',
            isOnline: false,
            organizerName: 'Dr. Rajesh Rao',
            organizerEmail: 'cse@campus.edu',
            registrationDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            eligibilityCriteria: 'All Engineering & Management students',
            eligibleDepartments: ['Computer Science and Engineering', 'Information Technology', 'Electronics and Communication'],
            capacityLimit: 120,
            posterGradient: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #10B981 100%)',
            icon: '🚀',
            status: 'published',
            registrations: [
                { user: deep._id, name: 'Deep Das', email: 'deep@campus.edu', department: 'Computer Science', year: 3, status: 'registered' },
                { user: vikram._id, name: 'Vikram Singh', email: 'vikram@campus.edu', department: 'Computer Science', year: 4, status: 'registered' }
            ],
            savedBy: [deep._id],
            createdBy: admin._id
        },
        {
            title: 'Hands-on Cloud Architecture & Kubernetes Masterclass',
            description: 'Industry workshop conducted by senior cloud architects from AWS. Learn Docker multi-stage builds, Helm chart deployments, ingress controllers, and microservice monitoring with Prometheus & Grafana.',
            organizingDepartment: 'Computer Science and Engineering',
            clubName: 'Cloud & DevOps Club',
            category: 'Workshop',
            eventDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
            startTime: '02:00 PM',
            endTime: '05:30 PM',
            venue: 'Computing Lab 4 (Block B)',
            isOnline: false,
            organizerName: 'Prof. Anita Singh',
            organizerEmail: 'devops@campus.edu',
            registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            eligibilityCriteria: '2nd, 3rd, and 4th year CS / IT students',
            eligibleYears: [2, 3, 4],
            capacityLimit: 50,
            posterGradient: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #EC4899 100%)',
            icon: '☁️',
            status: 'published',
            registrations: [
                { user: deep._id, name: 'Deep Das', email: 'deep@campus.edu', department: 'Computer Science', year: 3, status: 'registered' }
            ],
            savedBy: [deep._id],
            createdBy: admin._id
        },
        {
            title: 'Annual Inter-College Sports Championship: Urja 2026',
            description: 'The premier athletic meet of the season! Competitions in Football, Basketball, Badminton, Cricket, Table Tennis, and 100m Track. Registration open for individual track events and department teams.',
            organizingDepartment: 'University-wide',
            clubName: 'Sports Council',
            category: 'Sports',
            eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            startTime: '08:00 AM',
            endTime: '06:00 PM',
            venue: 'Main University Stadium & Indoor Sports Arena',
            isOnline: false,
            organizerName: 'Coach Devendra Sharma',
            registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            eligibilityCriteria: 'Open to all enrolled students',
            capacityLimit: 300,
            posterGradient: 'linear-gradient(135deg, #065F46 0%, #059669 50%, #34D399 100%)',
            icon: '🏆',
            status: 'published',
            registrations: [],
            createdBy: admin._id
        },
        {
            title: 'Distinguished Guest Lecture: Future of Autonomous Electric Vehicles',
            description: 'Keynote presentation by Chief Technology Officer of Tesla Energy India. Topics include battery chemistry advancements, computer vision for level-4 autonomy, and embedded safety standards.',
            organizingDepartment: 'Mechanical Engineering',
            clubName: 'Automotive Engineers Society',
            category: 'Guest lecture',
            eventDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
            startTime: '11:00 AM',
            endTime: '01:00 PM',
            venue: 'Seminar Hall 1 (Mech Block)',
            isOnline: true,
            onlineMeetingLink: 'https://meet.google.com/ev-campus-lecture',
            organizerName: 'Dr. Ramesh Patel',
            capacityLimit: 150,
            posterGradient: 'linear-gradient(135deg, #991B1B 0%, #DC2626 50%, #F59E0B 100%)',
            icon: '🚗',
            status: 'published',
            registrations: [],
            createdBy: admin._id
        }
    ]);
    console.log(`✅ ${events.length} campus events created`);

    // ── 6. AI-Powered Lost & Found ──
    const lfItems = await LostFound.insertMany([
        {
            name: 'Sony WH-1000XM4 Noise Cancelling Headphones',
            type: 'lost',
            category: 'Electronics',
            status: 'potential_match',
            location: 'Central Library 2nd Floor Silent Zone',
            campusZone: 'Central Library',
            dateOccurred: new Date(Date.now() - 24 * 60 * 60 * 1000),
            timeApprox: 'Around 3:30 PM',
            description: 'Black over-ear wireless headphones kept in a matte black zippered case. Has a small faint scratch on the left hinge. Urgently needed for thesis work!',
            color: 'Black',
            identifyingFeatures: 'Small scratch on left hinge; serial number registered with owner; custom gray aux cable inside pouch',
            icon: '🎧',
            holdingLocation: 'With Reporter',
            handedToSecurity: false,
            isSensitive: false,
            contactPreference: 'in_app',
            reportedBy: deep._id
        },
        {
            name: 'Dark Over-Ear Bluetooth Headset',
            type: 'found',
            category: 'Electronics',
            status: 'potential_match',
            location: 'Library 2nd Floor reading tables',
            campusZone: 'Central Library',
            dateOccurred: new Date(Date.now() - 22 * 60 * 60 * 1000),
            timeApprox: 'Found around 4:15 PM',
            description: 'Discovered high-end dark wireless headset inside a protective zip case on study desk 14 near the journals section.',
            color: 'Black / Dark Gray',
            identifyingFeatures: 'Protective case containing headset and cable. Handed over to security desk.',
            icon: '🎧',
            holdingLocation: 'Campus Security Office Room 104',
            handedToSecurity: true,
            isSensitive: false,
            contactPreference: 'security_office',
            reportedBy: vikram._id
        },
        {
            name: 'Student ID Card & Leather Cardholder',
            type: 'found',
            category: 'ID & Cards',
            status: 'open',
            location: 'Main Cafeteria near Counter 3',
            campusZone: 'Student Activity Center',
            dateOccurred: new Date(Date.now() - 6 * 60 * 60 * 1000),
            timeApprox: 'Around 1:00 PM lunch hour',
            description: 'Found a student identity card inside a dark brown RFID cardholder. Transferred to Campus Security for safe return.',
            color: 'Brown',
            identifyingFeatures: 'Sensitive ID card with student photo and registration number. Details kept confidential for verification.',
            icon: '🪪',
            holdingLocation: 'Campus Security Central Office Room 104',
            handedToSecurity: true,
            isSensitive: true,
            contactPreference: 'security_office',
            reportedBy: admin._id
        },
        {
            name: 'Navy Blue Wildcraft College Backpack',
            type: 'lost',
            category: 'Bags & Wallets',
            status: 'open',
            location: 'Sports Complex Badminton Court Bleachers',
            campusZone: 'Sports Complex',
            dateOccurred: new Date(Date.now() - 36 * 60 * 60 * 1000),
            timeApprox: 'Evening around 6:00 PM',
            description: 'Navy blue backpack with 3 compartments. Contains DSA spiral notebook, scientific calculator, and steel water bottle.',
            color: 'Navy Blue',
            identifyingFeatures: 'Yellow key ring attached to front zipper; name written on inside flap of DSA notebook',
            icon: '🎒',
            holdingLocation: 'With Reporter',
            handedToSecurity: false,
            isSensitive: false,
            contactPreference: 'in_app',
            reportedBy: deep._id
        },
        {
            name: 'Apple 67W USB-C MacBook Power Adapter',
            type: 'found',
            category: 'Electronics',
            status: 'open',
            location: 'Computer Lab 3 (Block A)',
            campusZone: 'Computer Science Department',
            dateOccurred: new Date(Date.now() - 14 * 60 * 60 * 1000),
            timeApprox: 'Morning 11:30 AM',
            description: 'White Apple 67W charging brick plugged into wall socket under row 4 desk. Left behind after lab session.',
            color: 'White',
            identifyingFeatures: 'White square charger with braided USB-C cable',
            icon: '🔌',
            holdingLocation: 'Lab Assistant Desk (CS Lab 3)',
            handedToSecurity: false,
            isSensitive: false,
            contactPreference: 'in_app',
            reportedBy: users[7]._id // Ananya
        }
    ]);
    // Link the potential match pair
    lfItems[0].matchedItemId = lfItems[1]._id;
    await lfItems[0].save();
    lfItems[1].matchedItemId = lfItems[0]._id;
    await lfItems[1].save();

    console.log(`✅ ${lfItems.length} lost & found items created (with smart potential match pair)`);

    // ── 7. Notifications for Deep ──
    const notifs = await Notification.insertMany([
        {
            user: deep._id,
            title: '✨ Potential Match for your Headphones!',
            message: 'A "Dark Over-Ear Bluetooth Headset" was found in Library 2nd Floor (88% match). View details and claim at Campus Security Desk.',
            type: 'lostfound',
            priority: 'high',
            linkTab: 'lostfound',
            targetId: lfItems[1]._id,
            read: false,
            createdAt: new Date(Date.now() - 20 * 60 * 1000)
        },
        {
            user: deep._id,
            title: '📢 Urgent Exam Timetable Released',
            message: 'Mid-Semester Examination Schedule Spring 2026 is published for CSE 3rd Year.',
            type: 'notice',
            priority: 'urgent',
            linkTab: 'updates',
            targetId: notices[0]._id,
            read: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
            user: deep._id,
            title: '🎟️ Registration Confirmed: CampusAI Hackathon',
            message: 'Your team registration is confirmed for Hackathon 2026 starting Friday 9:00 AM in the Auditorium.',
            type: 'event',
            priority: 'normal',
            linkTab: 'updates',
            targetId: events[0]._id,
            read: true,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
    ]);
    console.log(`✅ ${notifs.length} notifications created for Deep`);

    // ── 8. Attendance (for Deep — 60 days of mock data) ──
    const subjects = [
        { name: 'Data Structures', code: 'CS301' },
        { name: 'Operating Systems', code: 'CS302' },
        { name: 'Database Systems', code: 'CS303' },
        { name: 'Computer Networks', code: 'CS304' },
        { name: 'Software Engineering', code: 'CS305' },
    ];
    const attRecords = [];
    const baseDate = new Date('2026-02-01');
    for (let i = 59; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dailySubs = subjects.sort(() => Math.random() - 0.5).slice(0, Math.random() > 0.3 ? 3 : 2);
        dailySubs.forEach(sub => {
            attRecords.push({
                student: deep._id,
                subject: sub.name,
                subjectCode: sub.code,
                date: d,
                status: Math.random() > 0.3 ? 'present' : 'absent',
                time: `${8 + Math.floor(Math.random() * 8)}:00 ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
            });
        });
    }
    await Attendance.insertMany(attRecords);
    console.log(`✅ ${attRecords.length} attendance records created for Deep`);

    // ── 9. Audit Logs ──
    await AuditLog.insertMany([
        { actor: admin._id, actorName: 'Admin User', actorRole: 'admin', action: 'NOTICE_PUBLISHED', targetType: 'Notice', targetId: notices[0]._id, details: { title: notices[0].title } },
        { actor: admin._id, actorName: 'Admin User', actorRole: 'admin', action: 'EVENT_PUBLISHED', targetType: 'Event', targetId: events[0]._id, details: { title: events[0].title } },
        { actor: admin._id, actorName: 'Admin User', actorRole: 'admin', action: 'DEPARTMENT_CREATED', targetType: 'Department', targetId: departments[0]._id, details: { code: 'CSE' } },
    ]);
    console.log('✅ Audit logs recorded');

    console.log('\n✨ Database seeding completed successfully!');
    console.log('Default credentials:');
    console.log('   Student:   deep@campus.edu / password123 (Deep Das)');
    console.log('   Admin:     admin@campus.edu / password123');
    console.log('   Librarian: librarian@campus.edu / password123');
    console.log('   Alumni:    priya@alumni.edu / password123\n');
}

module.exports = { seed };

if (require.main === module) {
    seed().then(() => mongoose.disconnect()).catch(err => {
        console.error('Seed error:', err);
        process.exit(1);
    });
}
