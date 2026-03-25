# Student Placement Tracker

A full-stack Student Placement Tracker web application built using Node.js, Express, MySQL, HTML, CSS, and Vanilla JavaScript.

## Prerequisites
1. **XAMPP** (or any other local MySQL server) must be installed and running.
2. **Node.js** must be installed on your system.
3. The database \`placement_tracker\` with tables \`Students\`, \`Companies\`, \`Jobs\`, and \`Applications\` MUST exist in your MySQL instance (as per your existing schema).

## Project Structure
- \`server.js\` - The Node.js Express backend server.
- \`package.json\` - Project dependencies.
- \`public/index.html\` - The dashboard UI.
- \`public/style.css\` - Styles and dark-mode sidebar theme.
- \`public/script.js\` - Frontend logic connecting to the backend via Fetch API.

## Step-by-Step Instructions to Run

### 1. Start MySQL Server
Open **XAMPP Control Panel** and ensure that the **MySQL module is Started**.

### 2. Start the Backend Server
1. Open up your terminal or command prompt.
2. Navigate to the project directory:
   \`\`\`cmd
   cd "c:\Users\Appasaheb Suryvanshi\Desktop\antiproject\dbms\placement_tracker"
   \`\`\`
3. Start the server using Node:
   \`\`\`cmd
   node server.js
   \`\`\`
4. You should see a message in the console saying:
   \`\`\`
   Server is running on http://localhost:3000
   Connected to MySQL database!
   \`\`\`

### 3. Open the Application
1. Open your web browser (Chrome, Edge, Firefox, etc.).
2. Navigate to: [http://localhost:3000](http://localhost:3000)
3. You will see the **Modern Admin Dashboard**.

## Features
- **Dashboard Overview**: View total counts of students, companies, jobs, and applications.
- **Manage Students**: Add new students and view all students with their CGPA and Skills.
- **Manage Companies**: Add hiring companies and their locations.
- **Manage Jobs**: Post new jobs linked to companies.
- **Manage Applications**: Apply for jobs for specific students and update their statuses (Pending, Accepted, Rejected).
