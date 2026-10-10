require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Book = require('./models/Book');
const Notice = require('./models/Notice');
const LostFound = require('./models/LostFound');
const Attendance = require('./models/Attendance');

async function seed({ clear = true } = {}) {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }
    console.log('🌱 Seeding database...\n');

    // ── Clear existing data ──
    if (clear) {
        await Promise.all([
            User.deleteMany({}), Book.deleteMany({}), Notice.deleteMany({}),
            LostFound.deleteMany({}), Attendance.deleteMany({})
        ]);
    }

    // ── 1. Users ──
    const hashedPw = await bcrypt.hash('password123', 12);
    const users = await User.insertMany([
        { name: 'Arya Das', email: 'arya@campus.edu', password: hashedPw, role: 'student', department: 'Computer Science', year: 3, skills: ['React', 'Node.js', 'Python', 'MongoDB'], avatar: 'AD' },
        { name: 'Admin User', email: 'admin@campus.edu', password: hashedPw, role: 'admin', department: 'Administration', avatar: 'AD' },
        { name: 'Librarian', email: 'librarian@campus.edu', password: hashedPw, role: 'librarian', department: 'Library', avatar: 'LB' },
        { name: 'Dr. Priya Sharma', email: 'priya@alumni.edu', password: hashedPw, role: 'alumni', department: 'AI/ML', skills: ['Machine Learning', 'Deep Learning', 'Python', 'Research'], avatar: 'PS' },
        { name: 'Rahul Verma', email: 'rahul@alumni.edu', password: hashedPw, role: 'alumni', department: 'Web Development', skills: ['React', 'Node.js', 'MongoDB', 'AWS'], avatar: 'RV' },
        { name: 'Sneha Kapoor', email: 'sneha@alumni.edu', password: hashedPw, role: 'alumni', department: 'Frontend', skills: ['Vue.js', 'TypeScript', 'Figma', 'CSS'], avatar: 'SK' },
        { name: 'Vikram Singh', email: 'vikram@campus.edu', password: hashedPw, role: 'student', department: 'Computer Science', year: 4, skills: ['Algorithms', 'C++', 'Problem Solving', 'DSA'], avatar: 'VS' },
        { name: 'Ananya Gupta', email: 'ananya@campus.edu', password: hashedPw, role: 'student', department: 'Data Science', year: 3, skills: ['Data Analysis', 'Statistics', 'R', 'Tableau'], avatar: 'AG' },
    ]);
    console.log(`✅ ${users.length} users created`);
    const arya = users[0];

    // ── 2. Books (from app.js booksData) ──
    const books = await Book.insertMany([
        { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'cs', tags: ['programming', 'best practices', 'agile'], copies: 5, available: 3, location: 'Zone A → Row 3 → Shelf 12', cover: '📘', description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.' },
        { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen, Charles E. Leiserson', isbn: '978-0262033848', category: 'cs', tags: ['algorithms', 'data structures', 'computer science'], copies: 8, available: 2, location: 'Zone A → Row 1 → Shelf 5', cover: '📗', description: 'The Bible of algorithms.' },
        { title: 'Design Patterns: Elements of Reusable Object-Oriented Software', author: 'Gang of Four', isbn: '978-0201633610', category: 'cs', tags: ['design patterns', 'oop', 'software architecture'], copies: 4, available: 4, location: 'Zone A → Row 3 → Shelf 14', cover: '📙', description: 'Capturing a wealth of experience about the design of object-oriented software.' },
        { title: 'Machine Learning: A Probabilistic Perspective', author: 'Kevin P. Murphy', isbn: '978-0262018029', category: 'cs', tags: ['machine learning', 'AI', 'statistics'], copies: 6, available: 0, location: 'Zone B → Row 2 → Shelf 8', cover: '🤖', description: 'A comprehensive introduction to machine learning.' },
        { title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '978-1285741550', category: 'math', tags: ['calculus', 'mathematics', 'analysis'], copies: 12, available: 7, location: 'Zone C → Row 1 → Shelf 3', cover: '📐', description: 'The most successful calculus textbook in the world.' },
        { title: 'Linear Algebra Done Right', author: 'Sheldon Axler', isbn: '978-3319110790', category: 'math', tags: ['linear algebra', 'mathematics', 'vectors'], copies: 5, available: 5, location: 'Zone C → Row 2 → Shelf 6', cover: '📊', description: 'Focuses on the central goal of linear algebra.' },
        { title: 'Physics for Scientists and Engineers', author: 'Raymond A. Serway', isbn: '978-1133947271', category: 'physics', tags: ['physics', 'mechanics', 'electromagnetism'], copies: 10, available: 4, location: 'Zone D → Row 1 → Shelf 2', cover: '⚛️', description: 'The standard physics textbook.' },
        { title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', isbn: '978-0135957059', category: 'cs', tags: ['programming', 'software development', 'career'], copies: 6, available: 1, location: 'Zone A → Row 4 → Shelf 18', cover: '💻', description: 'Your journey to mastery with timeless lessons for programmers.' },
        { title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell, Peter Norvig', isbn: '978-0136042594', category: 'cs', tags: ['AI', 'machine learning', 'robotics'], copies: 7, available: 3, location: 'Zone B → Row 1 → Shelf 4', cover: '🧠', description: 'The leading textbook in AI.' },
        { title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson, Gerald Jay Sussman', isbn: '978-0262510875', category: 'cs', tags: ['programming', 'lisp', 'computer science'], copies: 3, available: 2, location: 'Zone A → Row 2 → Shelf 9', cover: '🔮', description: 'A legendary computer science textbook.' },
        { title: 'Business Analytics: Data Analysis & Decision Making', author: 'S. Christian Albright', isbn: '978-1305947542', category: 'business', tags: ['analytics', 'business', 'data'], copies: 5, available: 3, location: 'Zone E → Row 1 → Shelf 5', cover: '📈', description: 'Teaches concepts and techniques for data analysis.' },
        { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '978-0141439518', category: 'literature', tags: ['classic', 'romance', 'fiction'], copies: 4, available: 4, location: 'Zone F → Row 2 → Shelf 12', cover: '📖', description: 'A romantic novel of manners.' },
    ]);
    console.log(`✅ ${books.length} books created`);

    // ── 3. Notices ──
    const notices = await Notice.insertMany([
        { title: 'TechFest 2026 - Annual Technical Festival', content: 'Get ready for the biggest tech event of the year! TechFest 2026 features hackathons, workshops, guest lectures, and exciting prizes.', category: 'event', icon: '📅', createdBy: users[1]._id },
        { title: 'Mid-Semester Examination Schedule Released', content: 'The mid-semester exam schedule for Spring 2026 has been released. Please check the academic portal.', category: 'academic', icon: '📚', createdBy: users[1]._id },
        { title: 'New Book Arrivals - February 2026', content: 'The library has added 150+ new titles across Computer Science, Mathematics, and Business.', category: 'library', icon: '📖', createdBy: users[1]._id },
        { title: 'Cultural Night - Expressions 2026', content: 'Join us for an evening of music, dance, and drama at the annual cultural night.', category: 'event', icon: '🎭', createdBy: users[1]._id },
        { title: 'Summer Internship Registration Open', content: 'Students in their 3rd year and above can now apply for summer internship placements.', category: 'academic', icon: '💼', createdBy: users[1]._id },
    ]);
    console.log(`✅ ${notices.length} notices created`);

    // ── 4. Lost & Found ──
    const lf = await LostFound.insertMany([
        { name: 'Blue Backpack', status: 'lost', location: 'Library 2nd Floor', icon: '🎒', reportedBy: arya._id },
        { name: 'Silver Watch', status: 'found', location: 'Cafeteria', icon: '⌚', reportedBy: users[6]._id },
        { name: 'Student ID Card', status: 'lost', location: 'Main Building', icon: '🪪', reportedBy: users[7]._id },
        { name: 'Wireless Earbuds', status: 'found', location: 'Sports Complex', icon: '🎧', reportedBy: arya._id },
        { name: 'Laptop Charger', status: 'lost', location: 'Computer Lab 3', icon: '🔌', reportedBy: users[6]._id },
    ]);
    console.log(`✅ ${lf.length} lost/found items created`);

    // ── 5. Attendance (for Arya — 60 days of mock data) ──
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
        if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
        const dailySubs = subjects.sort(() => Math.random() - 0.5).slice(0, Math.random() > 0.3 ? 3 : 2);
        dailySubs.forEach(sub => {
            attRecords.push({
                student: arya._id,
                subject: sub.name,
                subjectCode: sub.code,
                date: d,
                status: Math.random() > 0.35 ? 'present' : 'absent',
                time: `${8 + Math.floor(Math.random() * 8)}:00 ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
            });
        });
    }
    await Attendance.insertMany(attRecords);
    console.log(`✅ ${attRecords.length} attendance records created for Arya`);

    console.log('\n✨ Seed complete! Default credentials:');
    console.log('   Student:   arya@campus.edu / password123');
    console.log('   Admin:     admin@campus.edu / password123');
    console.log('   Librarian: librarian@campus.edu / password123');
    console.log('   Alumni:    priya@alumni.edu / password123');
}

module.exports = { seed };

if (require.main === module) {
    seed().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error('Seed error:', err);
        process.exit(1);
    });
}
