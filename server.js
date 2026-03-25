const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// ================== MULTER (ONLY ONE) ==================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = `student_${req.session.userId || 'guest'}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// ================== MIDDLEWARE ==================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: 'placement_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// ================== DATABASE ==================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'placement_tracker'
});

db.connect(err => {
    if (err) return console.log(err);
    console.log("✅ MySQL Connected");
});

// ================== AUTH ==================
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    db.query('SELECT * FROM users WHERE email=? AND password=?',
        [email, password],
        (err, results) => {

            if (results.length > 0) {
                const user = results[0];

                if (role && user.role !== role) {
                    return res.status(403).json({ error: 'Wrong role' });
                }

                req.session.userId = user.id;
                req.session.role = user.role;

                res.json({ message: 'Success', role: user.role });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
});

app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    db.query('INSERT INTO users (name,email,password,role) VALUES (?,?,?, "student")',
        [name, email, password],
        (err) => {
            if (err) return res.status(500).json({ error: 'Signup error' });
            res.json({ message: 'Account created' });
        });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// ================== AUTH MIDDLEWARE ==================
app.use('/api', (req, res, next) => {
    if (req.session.userId) next();
    else res.status(401).json({ error: 'Login required' });
});

const isAdmin = (req, res, next) => {
    if (req.session.role === 'admin') next();
    else res.status(403).json({ error: 'Admin only' });
};

// ================== JOBS ==================
app.get('/api/jobs', (req, res) => {
    const query = `
        SELECT j.*, c.company_name, c.location 
        FROM Jobs j
        JOIN Companies c ON j.company_id = c.company_id
    `;
    db.query(query, (err, results) => res.json(results));
});

// STUDENT FILTERED JOBS
app.get('/api/student/jobs', (req, res) => {
    const userId = req.session.userId;

    db.query("SELECT email FROM users WHERE id=?", [userId], (err, uRes) => {
        const email = uRes[0].email;

        db.query("SELECT branch FROM Students WHERE email=?", [email], (err, sRes) => {
            const branch = sRes.length ? sRes[0].branch : 'Not Specified';

            const query = `
                SELECT j.*, c.company_name, c.location 
                FROM Jobs j
                JOIN Companies c ON j.company_id = c.company_id
                WHERE j.allowed_branches='ALL' OR j.allowed_branches LIKE ?
            `;
            db.query(query, [`%${branch}%`], (err, results) => res.json(results));
        });
    });
});

// ================== APPLICATION ==================
app.post('/api/applications', (req, res) => {
    const { student_id, job_id } = req.body;

    // Check if already applied
    db.query('SELECT * FROM Applications WHERE student_id=? AND job_id=?',
        [student_id, job_id],
        (err, existing) => {
            if (existing && existing.length > 0) {
                return res.status(400).json({ error: 'You have already applied for this job!' });
            }

            db.query('INSERT INTO Applications (student_id, job_id, status) VALUES (?, ?, "Pending")',
                [student_id, job_id],
                (err) => {
                    if (err) {
                        console.error("Application Insert Error:", err);
                        return res.status(500).json({ error: 'Failed to apply.' });
                    }
                    res.json({ message: 'Applied' });
                });
        });
});

app.get('/api/student/applications', (req, res) => {
    const userId = req.session.userId;
    db.query(`
        SELECT a.*, 
        COALESCE(j.job_title, 'Unknown Job') as job_title, 
        COALESCE(c.company_name, 'Unknown Company') as company_name 
        FROM Applications a
        LEFT JOIN Jobs j ON a.job_id = j.job_id
        LEFT JOIN Companies c ON j.company_id = c.company_id
        LEFT JOIN Students s ON a.student_id = s.student_id
        LEFT JOIN users u ON s.email = u.email
        WHERE u.id = ?
    `, [userId], (err, r) => res.json(r || []));
});
// ================== PROFILE ==================
app.get('/api/student/profile', (req, res) => {
    const userId = req.session.userId;

    db.query("SELECT name,email FROM users WHERE id=?", [userId], (err, u) => {
        if (err || u.length === 0) return res.status(404).json({ error: 'User not found' });
        const email = u[0].email;

        db.query("SELECT * FROM Students WHERE email=?", [email], (err, s) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (s.length) res.json(s[0]);
            else res.json({ full_name: u[0].name, email });
        });
    });
});

app.post('/api/student/profile', (req, res) => {
    const userId = req.session.userId;
    const { full_name, cgpa, skills, branch, usn } = req.body;

    db.query("SELECT email FROM users WHERE id=?", [userId], (err, u) => {
        if (err || u.length === 0) return res.status(404).json({ error: 'User not found' });
        const email = u[0].email;

        db.query("SELECT * FROM Students WHERE email=?", [email], (err, s) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (s.length) {
                db.query("UPDATE Students SET full_name=?, cgpa=?, skills=?, branch=?, usn=IF(usn IS NULL OR usn='', ?, usn) WHERE email=?",
                    [full_name, cgpa, skills, branch, usn, email],
                    (err) => {
                        if (err) return res.status(500).json({ error: 'Database update failed' });
                        res.json({ message: 'Updated' });
                    });
            } else {
                db.query("INSERT INTO Students (full_name,email,cgpa,skills,branch,usn) VALUES (?,?,?,?,?,?)",
                    [full_name, email, cgpa, skills, branch, usn],
                    (err) => {
                        if (err) return res.status(500).json({ error: 'Database insert failed' });
                        res.json({ message: 'Created' });
                    });
            }
        });
    });
});

// ================== RESUME ==================
app.post('/api/student/resume', upload.single('resume'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No resume file uploaded' });
    const filename = req.file.filename;
    const userId = req.session.userId;

    db.query("UPDATE users SET resume=? WHERE id=?", [filename, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database update failed' });
        res.json({ filename });
    });
});

// ================== PHOTO ==================
app.post('/api/student/photo', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const filename = req.file.filename;
    const userId = req.session.userId;

    db.query("SELECT email FROM users WHERE id=?", [userId], (err, r) => {
        if (err || r.length === 0) return res.status(404).json({ error: 'User not found' });
        const email = r[0].email;

        db.query("UPDATE Students SET profile_photo=? WHERE email=?",
            [filename, email],
            (err) => {
                if (err) return res.status(500).json({ error: 'Database update failed' });
                res.json({ filename });
            });
    });
});

// ================== ADMIN ==================
app.get('/api/students', isAdmin, (req, res) => {
    db.query('SELECT * FROM Students', (err, r) => res.json(r || []));
});

app.get('/api/applications', isAdmin, (req, res) => {
    db.query(`
        SELECT a.*, COALESCE(s.full_name, 'Unknown Student') as full_name, 
        s.usn, j.job_title, c.company_name
        FROM Applications a
        LEFT JOIN Students s ON a.student_id = s.student_id
        LEFT JOIN Jobs j ON a.job_id = j.job_id
        LEFT JOIN Companies c ON j.company_id = c.company_id
    `, (err, r) => res.json(r || []));
});
// --- Student Analytics ---
app.get('/api/student/analytics', (req, res) => {
    const queries = {
        totalStudents: "SELECT COUNT(*) as count FROM Students",
        placedStats: "SELECT status, COUNT(*) as count FROM Applications GROUP BY status",
        salaryStats: "SELECT MAX(salary) as max, MIN(salary) as min, AVG(salary) as avg FROM Applications WHERE salary > 0",
    };

    let results = {
        totalStudents: 0, placedStudents: 0, unplacedStudents: 0, placementPercentage: 0,
        salary: { max: 0, min: 0, avg: 0 }
    };

    db.query(queries.totalStudents, (err, countRes) => {
        if (!err && countRes.length) results.totalStudents = countRes[0].count;
        db.query(queries.placedStats, (err, placedRes) => {
            if (!err) {
                placedRes.forEach(r => {
                    if (r.status && (r.status.toLowerCase() === 'accepted' || r.status.toLowerCase() === 'selected')) {
                        results.placedStudents += r.count;
                    }
                });
                results.unplacedStudents = results.totalStudents - results.placedStudents;
                if (results.totalStudents > 0) results.placementPercentage = Math.round((results.placedStudents / results.totalStudents) * 100);
            }
            db.query(queries.salaryStats, (err, salRes) => {
                if (!err && salRes.length) {
                    results.salary = { max: Math.round(salRes[0].max || 0), min: Math.round(salRes[0].min || 0), avg: Math.round(salRes[0].avg || 0) };
                }
                res.json(results);
            });
        });
    });
});

// --- Analytics ---
app.get('/api/analytics', isAdmin, (req, res) => {
    const queries = {
        totalStudents: "SELECT COUNT(*) as count FROM Students",
        placedStats: "SELECT status, COUNT(*) as count FROM Applications GROUP BY status",
        salaryStats: "SELECT MAX(salary) as max, MIN(salary) as min, AVG(salary) as avg FROM Applications WHERE salary > 0",
        companyChart: "SELECT c.company_name as company, AVG(a.salary) as avgSalary FROM Applications a JOIN Jobs j ON a.job_id = j.job_id JOIN Companies c ON j.company_id = c.company_id WHERE a.salary > 0 GROUP BY c.company_id"
    };

    let results = {
        totalStudents: 0,
        placedStudents: 0,
        unplacedStudents: 0,
        placementPercentage: 0,
        salary: { max: 0, min: 0, avg: 0 },
        companyChart: []
    };

    db.query(queries.totalStudents, (err, countRes) => {
        if (!err && countRes.length) results.totalStudents = countRes[0].count;

        db.query(queries.placedStats, (err, placedRes) => {
            if (!err) {
                placedRes.forEach(r => {
                    if (r.status && (r.status.toLowerCase() === 'accepted' || r.status.toLowerCase() === 'selected')) {
                        results.placedStudents += r.count;
                    }
                });
                results.unplacedStudents = results.totalStudents - results.placedStudents;
                if (results.totalStudents > 0) {
                    results.placementPercentage = Math.round((results.placedStudents / results.totalStudents) * 100);
                }
            }

            db.query(queries.salaryStats, (err, salRes) => {
                if (!err && salRes.length) {
                    results.salary = {
                        max: Math.round(salRes[0].max || 0),
                        min: Math.round(salRes[0].min || 0),
                        avg: Math.round(salRes[0].avg || 0)
                    };
                }

                db.query(queries.companyChart, (err, chartRes) => {
                    if (!err) results.companyChart = chartRes || [];
                    res.json(results);
                });
            });
        });
    });
});

// --- Companies CRUD ---
app.get('/api/companies', (req, res) => {
    db.query('SELECT * FROM Companies', (err, r) => res.json(r || []));
});

app.post('/api/companies', isAdmin, (req, res) => {
    const { company_name, location } = req.body;
    db.query('INSERT INTO Companies (company_name, location) VALUES (?, ?)',
        [company_name, location],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Company Added' });
        });
});

app.put('/api/companies/:id', isAdmin, (req, res) => {
    const { company_name, location } = req.body;
    db.query('UPDATE Companies SET company_name=?, location=? WHERE company_id=?',
        [company_name, location, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Company Updated' });
        });
});

app.delete('/api/companies/:id', isAdmin, (req, res) => {
    db.query('DELETE FROM Companies WHERE company_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Company Deleted' });
    });
});

// --- Jobs CRUD (Admin) ---
app.post('/api/jobs', isAdmin, (req, res) => {
    const j = req.body;
    db.query('SELECT company_id FROM Companies WHERE company_name=?', [j.company_name], (err, cRes) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        let handleJobInsert = (compId) => {
            const query = `INSERT INTO Jobs (company_id, job_title, description, salary, location, skills, experience, education, cgpa_required, preferences, allowed_branches) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            db.query(query, [compId, j.job_title, j.description, j.salary, j.location, j.skills, j.experience, j.education, j.cgpa_required || 0, j.preferences, j.allowed_branches || 'ALL'], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to insert job' });
                res.json({ message: 'Job Added' });
            });
        };

        if (cRes && cRes.length > 0) {
            handleJobInsert(cRes[0].company_id);
        } else {
            db.query('INSERT INTO Companies (company_name, location) VALUES (?, ?)', [j.company_name, j.location || 'Remote'], (err, insertRes) => {
                if (err) return res.status(500).json({ error: 'Failed to insert company' });
                handleJobInsert(insertRes.insertId);
            });
        }
    });
});

app.put('/api/jobs/:id', isAdmin, (req, res) => {
    const j = req.body;
    const query = `UPDATE Jobs SET job_title=?, description=?, salary=?, location=?, skills=?, experience=?, education=?, cgpa_required=?, preferences=?, allowed_branches=? WHERE job_id=?`;
    db.query(query, [j.job_title, j.description, j.salary, j.location, j.skills, j.experience, j.education, j.cgpa_required || 0, j.preferences, j.allowed_branches || 'ALL', req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update job' });
        res.json({ message: 'Job Updated' });
    });
});

app.delete('/api/jobs/:id', isAdmin, (req, res) => {
    db.query('DELETE FROM Jobs WHERE job_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Job Deleted' });
    });
});

// --- Students Create (Admin) ---
app.post('/api/students', isAdmin, (req, res) => {
    const { full_name, email, cgpa, skills, usn, branch } = req.body;
    db.query('INSERT INTO Students (full_name, email, cgpa, skills, branch, usn) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, email, cgpa, skills, branch || 'Not Specified', usn || null],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Student Added' });
        });
});
// --- Update Student USN (Admin only) ---
app.put('/api/students/:id/usn', isAdmin, (req, res) => {
    const { usn } = req.body;
    if (!usn) return res.status(400).json({ error: 'USN is required' });
    db.query('UPDATE Students SET usn=? WHERE student_id=?',
        [usn.toUpperCase(), req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'USN updated successfully!' });
        });
});

// --- Applications Put (Admin) ---
app.put('/api/applications/:id', isAdmin, (req, res) => {
    const { status, salary } = req.body;
    let query = 'UPDATE Applications SET status=?';
    let params = [status];
    if (salary !== undefined) {
        query += ', salary=?';
        params.push(salary);
    }
    query += ' WHERE application_id=?';
    params.push(req.params.id);

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // Send notification to student
        if (status === 'Accepted' || status === 'Rejected') {
            db.query(`
                SELECT a.student_id, j.job_title, c.company_name, u.id as user_id
                FROM Applications a
                JOIN Jobs j ON a.job_id = j.job_id
                JOIN Companies c ON j.company_id = c.company_id
                JOIN Students s ON a.student_id = s.student_id
                JOIN users u ON s.email = u.email
                WHERE a.application_id = ?
            `, [req.params.id], (err, rows) => {
                if (!err && rows.length) {
                    const { user_id, job_title, company_name } = rows[0];
                    const icon = status === 'Accepted' ? '✅' : '❌';
                    const message = `${icon} Your application for <strong>${job_title}</strong> at <strong>${company_name}</strong> has been <strong>${status}</strong>!`;
                    db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)',
                        [user_id, message]);
                }
            });
        }

        res.json({ message: 'Application Updated' });
    });
});

// Get unread notifications for student
app.get('/api/notifications', (req, res) => {
    db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [req.session.userId], (err, r) => res.json(r || []));
});

// Mark all notifications as read
app.post('/api/notifications/read', (req, res) => {
    db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?',
        [req.session.userId], (err) => res.json({ message: 'Marked as read' }));
});

app.delete('/api/applications/:id', isAdmin, (req, res) => {
    db.query('DELETE FROM Applications WHERE application_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Application Deleted' });
    });
});

// ================== OFF CAMPUS JOBS ==================
app.get('/api/offcampus', (req, res) => {
    db.query('SELECT * FROM offcampus_jobs ORDER BY created_at DESC', (err, r) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(r || []);
    });
});

app.post('/api/offcampus', isAdmin, (req, res) => {
    const { company_name, job_title, salary, location, apply_link, description } = req.body;
    db.query('INSERT INTO offcampus_jobs (company_name, job_title, salary, location, apply_link, description) VALUES (?,?,?,?,?,?)',
        [company_name, job_title, salary, location, apply_link, description],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Off Campus Job Added!' });
        });
});

app.delete('/api/offcampus/:id', isAdmin, (req, res) => {
    db.query('DELETE FROM offcampus_jobs WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Deleted' });
    });
});


// ================== STATISTICS ==================
app.get('/api/statistics', (req, res) => {
    let stats = {
        overall: {},
        branchWise: [],
        companyWise: [],
        cgpaWise: [],
        campusWise: [],
        neoIdWise: [],
        yearComparison: []
    };

    // Overall
    db.query(`SELECT COUNT(*) as total FROM Students`, (err, r) => {
        stats.overall.totalStudents = r[0].total;

        db.query(`SELECT COUNT(*) as placed FROM Applications WHERE status='Accepted'`, (err, r) => {
            stats.overall.placedStudents = r[0].placed;
            stats.overall.unplacedStudents = stats.overall.totalStudents - stats.overall.placedStudents;
            stats.overall.placementPercentage = stats.overall.totalStudents > 0
                ? Math.round((stats.overall.placedStudents / stats.overall.totalStudents) * 100) : 0;

            db.query(`SELECT MAX(salary) as max, MIN(salary) as min, AVG(salary) as avg FROM Applications WHERE salary > 0`, (err, r) => {
                stats.overall.maxSalary = Math.round(r[0].max || 0);
                stats.overall.minSalary = Math.round(r[0].min || 0);
                stats.overall.avgSalary = Math.round(r[0].avg || 0);

                // Branch-wise
                db.query(`
                    SELECT s.branch, COUNT(DISTINCT s.student_id) as total,
                    COUNT(DISTINCT CASE WHEN a.status='Accepted' THEN a.student_id END) as placed
                    FROM Students s
                    LEFT JOIN Applications a ON s.student_id = a.student_id
                    GROUP BY s.branch
                `, (err, r) => {
                    stats.branchWise = r || [];

                    // Company-wise
                    db.query(`
                        SELECT c.company_name, COUNT(a.application_id) as total,
                        COUNT(CASE WHEN a.status='Accepted' THEN 1 END) as placed
                        FROM Applications a
                        JOIN Jobs j ON a.job_id = j.job_id
                        JOIN Companies c ON j.company_id = c.company_id
                        GROUP BY c.company_id
                        ORDER BY placed DESC LIMIT 10
                    `, (err, r) => {
                        stats.companyWise = r || [];

                        // CGPA-wise
                        db.query(`
                            SELECT 
                            CASE 
                                WHEN s.cgpa >= 9 THEN '9-10'
                                WHEN s.cgpa >= 8 THEN '8-9'
                                WHEN s.cgpa >= 7 THEN '7-8'
                                WHEN s.cgpa >= 6 THEN '6-7'
                                ELSE 'Below 6'
                            END as cgpa_range,
                            COUNT(DISTINCT s.student_id) as total,
                            COUNT(DISTINCT CASE WHEN a.status='Accepted' THEN s.student_id END) as placed
                            FROM Students s
                            LEFT JOIN Applications a ON s.student_id = a.student_id
                            GROUP BY cgpa_range
                            ORDER BY cgpa_range DESC
                        `, (err, r) => {
                            stats.cgpaWise = r || [];

                            // Campus-wise
                            db.query(`
                                SELECT COALESCE(s.campus, 'Not Specified') as campus,
                                COUNT(DISTINCT s.student_id) as total,
                                COUNT(DISTINCT CASE WHEN a.status='Accepted' THEN s.student_id END) as placed
                                FROM Students s
                                LEFT JOIN Applications a ON s.student_id = a.student_id
                                GROUP BY s.campus
                            `, (err, r) => {
                                stats.campusWise = r || [];

                                // NEO ID
                                db.query(`
                                    SELECT COALESCE(s.neo_id, 'No NEO ID') as neo_id, s.full_name,
                                    s.branch, s.cgpa,
                                    COUNT(CASE WHEN a.status='Accepted' THEN 1 END) as placed
                                    FROM Students s
                                    LEFT JOIN Applications a ON s.student_id = a.student_id
                                    GROUP BY s.student_id
                                    HAVING placed > 0
                                    LIMIT 20
                                `, (err, r) => {
                                    stats.neoIdWise = r || [];

                                    // Year comparison
                                    db.query(`
                                        SELECT 
                                        YEAR(created_at) as year,
                                        COUNT(*) as total_applications,
                                        COUNT(CASE WHEN status='Accepted' THEN 1 END) as placed
                                        FROM Applications
                                        GROUP BY YEAR(created_at)
                                        ORDER BY year
                                    `, (err, r) => {
                                        stats.yearComparison = r || [];
                                        res.json(stats);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
// ================== START ==================

// ================== APPLICATION HISTORY ==================
app.get('/api/application-history', isAdmin, (req, res) => {
    db.query(`
        SELECT * FROM application_history 
        ORDER BY changed_at DESC 
        LIMIT 50
    `, (err, r) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(r || []);
    });
});

// ================== PLACEMENT REPORT ==================
app.get('/api/placement-report', (req, res) => {
    const branch = req.query.branch || null;

    let branchFilter = branch ? `AND s.branch = '${branch}'` : '';

    // Branch-wise CTC stats
    db.query(`
        SELECT 
            s.branch,
            COUNT(DISTINCT CASE WHEN a.status='Accepted' THEN s.student_id END) as total_placed,
            ROUND(AVG(CASE WHEN a.status='Accepted' AND a.salary > 0 THEN a.salary END), 2) as avg_ctc,
            MAX(CASE WHEN a.status='Accepted' THEN a.salary END) as max_ctc,
            MIN(CASE WHEN a.status='Accepted' AND a.salary > 0 THEN a.salary END) as min_ctc
        FROM Students s
        LEFT JOIN Applications a ON s.student_id = a.student_id
        GROUP BY s.branch
        ORDER BY s.branch
    `, (err, branchStats) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // Company-wise stats
        db.query(`
            SELECT 
                c.company_name,
                COUNT(CASE WHEN a.status='Accepted' THEN 1 END) as placed,
                ROUND(AVG(CASE WHEN a.status='Accepted' AND a.salary > 0 THEN a.salary END), 2) as avg_ctc,
                s.branch
            FROM Applications a
            JOIN Jobs j ON a.job_id = j.job_id
            JOIN Companies c ON j.company_id = c.company_id
            JOIN Students s ON a.student_id = s.student_id
            WHERE a.status = 'Accepted'
            ${branch ? `AND s.branch = '${branch}'` : ''}
            GROUP BY c.company_id, s.branch
            ORDER BY c.company_name
        `, (err, companyStats) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ branchStats, companyStats });
        });
    });
});

// ================== UPCOMING COMPANIES ==================
app.get('/api/upcoming', (req, res) => {
    db.query('SELECT * FROM upcoming_companies WHERE visit_date >= CURDATE() ORDER BY visit_date ASC', (err, r) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(r || []);
    });
});

app.post('/api/upcoming', isAdmin, (req, res) => {
    const { company_name, job_title, visit_date, required_cgpa, required_skills, allowed_branches, description } = req.body;
    db.query('INSERT INTO upcoming_companies (company_name, job_title, visit_date, required_cgpa, required_skills, allowed_branches, description) VALUES (?,?,?,?,?,?,?)',
        [company_name, job_title, visit_date, required_cgpa || 0, required_skills, allowed_branches || 'ALL', description],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Upcoming company added!' });
        });
});

app.delete('/api/upcoming/:id', isAdmin, (req, res) => {
    db.query('DELETE FROM upcoming_companies WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Deleted' });
    });
});
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});