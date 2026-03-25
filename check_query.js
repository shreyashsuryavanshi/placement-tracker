const mysql = require('mysql2');
const db = mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'placement_tracker' });

db.query(`
    SELECT a.*, j.job_title, c.company_name 
    FROM Applications a
    JOIN Jobs j ON a.job_id = j.job_id
    JOIN Companies c ON j.company_id = c.company_id
    JOIN Students s ON a.student_id = s.student_id
    JOIN users u ON s.email = u.email
    WHERE u.email = 'student@gmail.com'
`, (e, r) => {
    console.log("Error:", e);
    console.log("Results:", r);
    process.exit(0);
});
