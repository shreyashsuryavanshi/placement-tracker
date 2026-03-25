const mysql = require('mysql2');
const db = mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'placement_tracker' });
db.connect(err => {
    if (err) return console.error(err);
    db.query("SELECT * FROM users WHERE role='admin'", (err, res) => {
        if (err) return console.error(err);
        if (res.length > 0) {
            console.log('Admin user exists:', res[0].email, res[0].password);
            process.exit(0);
        } else {
            db.query("INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@example.com', 'admin123', 'admin')", (err) => {
                if (err) return console.error(err);
                console.log('Admin user created: admin@example.com / admin123');
                process.exit(0);
            });
        }
    });
});
