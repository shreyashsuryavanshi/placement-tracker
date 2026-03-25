const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'placement_tracker'
});

db.query('SELECT * FROM Applications', (e, a) => {
    console.log('--- Applications ---');
    console.log(a);

    db.query('SELECT * FROM Students', (e, s) => {
        console.log('--- Students ---');
        console.log(s);

        db.query('SELECT id, email, full_name, role FROM users', (e, u) => {
            console.log('--- Users ---');
            console.log(u);
            process.exit(0);
        });
    });
});
