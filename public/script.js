// API Base URL
const API_URL = '/api';

// --- Authentication & Fetch Wrapper ---
// Global fetch wrapper to handle 401 Unauthorized responses
async function apiFetch(url, options = {}) {
    // Ensure credentials (cookies) are sent with every request!
    options.credentials = 'same-origin';

    // Determine if URL is a full URL or just an endpoint like '/dashboard'
    const fullUrl = url.startsWith('http') ? url : (url.startsWith('/api') ? url : API_URL + url);

    try {
        const response = await fetch(fullUrl, options);
        if (response.status === 401) {
            // Unauthorized, redirect to login page
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }
        return response;
    } catch (err) {
        if (err.message === 'Unauthorized') throw err; // Already handled
        console.error('Fetch error:', err);
        throw err;
    }
}

// Navigation Logic
document.querySelectorAll('.nav-links li').forEach(link => {
    link.addEventListener('click', () => {
        // Activate link
        document.querySelector('.nav-links li.active').classList.remove('active');
        link.classList.add('active');

        // Show section
        const target = link.getAttribute('data-target');
        document.querySelector('.section.active').classList.remove('active');
        document.getElementById(target).classList.add('active');

        // Load data based on section
        loadData(target);
    });
});

// Mobile Sidebar Toggle
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});

// Logout Button Logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (err) {
            console.error('Error logging out', err);
        }
    });
}

// Form Toggle Utility
function toggleForm(formId) {
    const form = document.getElementById(formId);
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
    } else {
        form.classList.add('hidden');
    }
}

// --- Global Toast Notification System ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}" style="color: ${type === 'error' ? 'var(--danger)' : 'var(--success)'}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Theme Toggler ---
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            themeToggle.innerHTML = '🌙';
            localStorage.setItem('theme', 'light');
            document.querySelectorAll('table input, table select').forEach(el => {
                el.style.background = '';
                el.style.color = '';
                el.style.border = '';
            });
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '☀️';
            localStorage.setItem('theme', 'dark');
            document.querySelectorAll('table input, table select').forEach(el => {
                el.style.background = '#0f172a';
                el.style.color = '#e2e8f0';
                el.style.border = '1px solid #334155';
            });
        }
        if (window.salaryChartInstance) window.salaryChartInstance.update();
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '☀️';
        document.querySelectorAll('table input, table select').forEach(el => {
            el.style.background = '#0f172a';
            el.style.color = '#e2e8f0';
            el.style.border = '1px solid #334155';
        });
    }
}

// Global Variables for Dropdowns
let studentsList = [];
let companiesList = [];
let jobsList = [];

// Fetch and Load Data
async function loadData(section) {
    try {
        if (section === 'dashboard') {
            const res = await apiFetch('/analytics');
            const data = await res.json();
            document.getElementById('count-total').textContent = data.totalStudents || 0;
            document.getElementById('count-placed').textContent = data.placedStudents || 0;
            document.getElementById('count-unplaced').textContent = data.unplacedStudents || 0;
            document.getElementById('count-percentage').textContent = (data.placementPercentage || 0) + '%';

            const highEl = document.getElementById('sal-highest'); if (highEl) highEl.textContent = '$' + (data.salary?.max || 0);
            const avgEl = document.getElementById('sal-average'); if (avgEl) avgEl.textContent = '$' + (data.salary?.avg || 0);
            const lowEl = document.getElementById('sal-lowest'); if (lowEl) lowEl.textContent = '$' + (data.salary?.min || 0);

            if (data.companyChart) renderChart(data.companyChart);
        }
        else if (section === 'students') {
            const res = await apiFetch('/students');
            studentsList = await res.json();
            renderStudents();
            populateStudentDropdowns();
        }
        else if (section === 'companies') {
            const res = await apiFetch('/companies');
            companiesList = await res.json();
            renderCompanies();
            populateCompanyDropdowns();
        }
        else if (section === 'jobs') {
            const res = await apiFetch('/jobs');
            jobsList = await res.json();
            renderJobs();
            populateJobDropdowns();
        }
        else if (section === 'applications') {
            const res = await apiFetch('/applications');
            const data = await res.json();
            renderApplications(data);

            // pre-load stuff for form just in case
            if (!studentsList.length) loadData('students');
            if (!jobsList.length) loadData('jobs');
        }
        else if (section === 'offcampus') {
            loadOffCampus();
        }
        else if (section === 'upcoming') {
            loadUpcoming();
        }

        else if (section === 'statistics') {
            loadStatistics();
        }
        else if (section === 'history') {
            loadHistory();
        }
        else if (section === 'report') {
            loadReport();
        }
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.error('Error fetching data for', section, err);
        }
    }
}

// --- Chart JS Instance ---
let salaryChartInstance = null;
window.renderChart = function (chartData) {
    const ctx = document.getElementById('salaryChart');
    if (!ctx) return;

    if (salaryChartInstance) salaryChartInstance.destroy();

    const labels = chartData.map(d => d.company);
    const dataVals = chartData.map(d => parseFloat(d.avgSalary));

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    salaryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Salary ($)',
                data: dataVals,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor } },
                x: { ticks: { color: textColor } }
            }
        }
    });
};

// --- CSV Export Logic ---
window.exportCSV = function () {
    if (!window.applicationsList || window.applicationsList.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    const headers = ['Application ID', 'Student Name', 'Job Title', 'Company', 'Status', 'Salary'];
    const rows = window.applicationsList.map(a => [
        a.application_id, `"${a.full_name}"`, `"${a.job_title}"`, `"${a.company_name}"`, a.status, a.salary || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "placement_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV successfully!');
};

// Render Functions
function renderStudents() {
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '';
    studentsList.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>
    <strong style="color:var(--primary); font-family:monospace;">${s.usn || '—'}</strong>
    <button onclick="editUSN(${s.student_id}, '${s.usn || ''}')" 
        style="background:none; border:none; cursor:pointer; color:#64748b; margin-left:6px;" 
        title="Edit USN">
        <i class="fas fa-pencil-alt" style="font-size:0.75rem;"></i>
    </button>
</td>
                <td style="color:var(--text-muted);">${s.email}</td>
                <td>
                    <span style="background:rgba(99,102,241,0.1);color:var(--primary);padding:3px 9px;border-radius:8px;font-size:0.82rem;font-weight:600;">
                        ${s.branch || '—'}
                    </span>
                </td>
                <td><strong>${s.cgpa || '—'}</strong></td>
                <td>${(s.skills || '').split(',').map(skill => skill.trim() ? `<span style="background:rgba(139,92,246,0.2);color:#c4b5fd;padding:4px 10px;border-radius:12px;font-size:0.8rem;margin-right:5px;border:1px solid rgba(139,92,246,0.3);">${skill.trim()}</span>` : '').join('')}</td>
                <td>${s.resume ? `<a href="/uploads/${s.resume}" target="_blank" style="color:var(--secondary);text-decoration:none;font-weight:500;"><i class="fas fa-file-pdf"></i> View</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
            </tr>
        `;
    });
}

function renderCompanies() {
    const tbody = document.getElementById('companies-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    companiesList.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>#${c.company_id}</td>
                <td><strong>${c.company_name}</strong></td>
                <td><i class="fas fa-map-marker-alt" style="color:#9ca3af;margin-right:5px;"></i>${c.location}</td>
                <td style="text-align: right;">
                    <button class="btn btn-info" style="padding: 6px 12px; font-size: 0.8rem; margin-right: 5px;" onclick="editCompany(${c.company_id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteCompany(${c.company_id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
}

function renderJobs() {
    const tbody = document.getElementById('jobs-grid-container');
    if (!tbody) return;
    tbody.innerHTML = '';

    jobsList.forEach((j) => {
        const jobSalary = j.salary && j.salary !== 'Not Specified' ? j.salary : 'Not Specified';

        let eligibleCount = 0;
        let branchDist = {};
        if (j.allowed_branches) {
            const branchList = j.allowed_branches.toUpperCase().split(',').map(s => s.trim());
            studentsList.forEach(s => {
                const sb = (s.branch || 'Not Specified').toUpperCase();
                if (branchList.includes('ALL') || branchList.includes(sb) || branchList.some(b => sb.includes(b)) || sb === 'ALL') {
                    eligibleCount++;
                    branchDist[sb] = (branchDist[sb] || 0) + 1;
                }
            });
        }
        const distString = Object.entries(branchDist).map(([b, c]) => `${b}: ${c}`).join(', ') || 'N/A';

        tbody.innerHTML += `
            <tr>
                <td>#${j.job_id}</td>
                <td>
                    <strong>${j.job_title}</strong>
                    <div style="font-size: 0.75rem; color: ${document.body.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#4b5563'}; margin-top: 5px; background: ${document.body.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#f3f4f6'}; padding: 4px; border-radius: 4px; display: inline-block;">
                        <i class="fas fa-users" style="color:var(--primary);"></i> <strong>Eligible:</strong> <span style="color:#10b981;">${eligibleCount} students</span> <span style="color:#9ca3af; margin-left: 4px;">(${distString})</span>
                    </div>
                </td>
                <td><i class="fas fa-building" style="color:#9ca3af;margin-right:5px;"></i> ${j.company_name}</td>
                <td>${j.location || 'Remote'}</td>
                <td><span style="font-weight:600; color:#10b981;">${jobSalary}</span></td>
                <td style="font-size:0.85rem;">${j.cgpa_required || 0}</td>
                <td style="font-size:0.85rem;">${j.skills || 'Not Specified'}</td>
                <td style="font-size:0.85rem;">${j.experience || 'Not Specified'}</td>
                <td style="font-size:0.85rem;">${j.education || 'Not Specified'}</td>
                <td style="font-size:0.85rem;">${j.preferences || 'Not Specified'}</td>
                <td><strong style="font-size:0.85rem; color:#10b981;">${j.allowed_branches || 'ALL'}</strong></td>
                <td style="text-align: right; min-width: 140px;">
                    <button class="btn btn-info" style="padding: 6px 12px; font-size: 0.8rem; margin-right: 5px;" onclick="editJob(${j.job_id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteJob(${j.job_id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
    // Apply dark mode to newly rendered inputs
    if (document.body.getAttribute('data-theme') === 'dark') {
        setTimeout(() => {
            document.querySelectorAll('table input, table select').forEach(el => {
                el.style.background = '#0f172a';
                el.style.color = '#e2e8f0';
                el.style.border = '1px solid #334155';
            });
        }, 200);
    }
}

// Store globally for CSV
window.applicationsList = [];

function renderApplications(apps) {
    window.applicationsList = apps;
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    apps.forEach(a => {
        let badgeClass = 'applied';
        const statusLower = (a.status || 'pending').toLowerCase();
        if (statusLower === 'accepted' || statusLower === 'selected') badgeClass = 'selected';
        else if (statusLower === 'rejected') badgeClass = 'rejected';

        tbody.innerHTML += `
    <tr>
       <td style="font-family:monospace; font-size:0.82rem; color:var(--text-muted);">${a.application_id}</td>
       <td style="font-family:monospace; font-weight:700; color:var(--primary); font-size:0.88rem;">${a.usn || '—'}</td>
<td><a href="#" style="color:var(--text-main);font-weight:600;text-decoration:none;" onclick="viewStudent(${a.student_id}); return false;">${a.full_name}</a></td>
        <td>${a.job_title}</td>
        <td>${a.company_name}</td>
        <td style="cursor:pointer;" onclick="inlineEditStatus(this, ${a.application_id}, '${a.status || 'Pending'}')">
            <span class="badge ${badgeClass}">${a.status || 'Pending'}</span> <i class="fas fa-pencil-alt" style="font-size:0.7rem;color:var(--text-muted);margin-left:5px;"></i>
        </td>
        <td style="cursor:pointer;" onclick="inlineEditSalary(this, ${a.application_id}, ${a.salary || 0})">
            $${a.salary || 0} <i class="fas fa-pencil-alt" style="font-size:0.7rem;color:var(--text-muted);margin-left:5px;"></i>
        </td>
        <td style="text-align:right;">
    <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; margin-right:5px;" onclick="openStatusModal(${a.application_id}, '${a.status || 'Pending'}', ${a.salary || 0})">
        <i class="fas fa-edit"></i>
    </button>
    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteApplication(${a.application_id})">
        <i class="fas fa-trash"></i>
    </button>
</td>
    </tr>
`;
    });
}

// Dropdown Populators
function populateStudentDropdowns() {
    const select = document.getElementById('a-student');
    if (!select) return;
    select.innerHTML = '<option value="">Select Student...</option>';
    studentsList.forEach(s => select.innerHTML += `<option value="${s.student_id}">${s.full_name}</option>`);
}

function populateCompanyDropdowns() {
    const select = document.getElementById('j-company');
    if (!select) return;
    select.innerHTML = '<option value="">Select Company...</option>';
    companiesList.forEach(c => select.innerHTML += `<option value="${c.company_id}">${c.company_name}</option>`);
}

function populateJobDropdowns() {
    const select = document.getElementById('a-job');
    if (!select) return;
    select.innerHTML = '<option value="">Select Job...</option>';
    jobsList.forEach(j => select.innerHTML += `<option value="${j.job_id}">${j.job_title} (${j.company_name})</option>`);
}

// Form Submissions
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        full_name: document.getElementById('s-name').value,
        email: document.getElementById('s-email').value,
        cgpa: document.getElementById('s-cgpa').value,
        skills: document.getElementById('s-skills').value,
        usn: document.getElementById('s-usn').value,
        branch: document.getElementById('s-branch').value
    };
    await postData('/students', data);
    document.getElementById('student-form').reset();
    toggleForm('student-form-container');
    loadData('students');
});
document.getElementById('company-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        company_name: document.getElementById('c-name').value,
        location: document.getElementById('c-location').value
    };
    await postData('/companies', data);
    document.getElementById('company-form').reset();
    toggleForm('company-form-container');
    loadData('companies');
});

document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        job_title: document.getElementById('j-title').value,
        company_name: document.getElementById('j-company-name').value,
        salary: document.getElementById('j-salary').value,
        location: document.getElementById('j-location').value,
        description: document.getElementById('j-desc').value,
        cgpa_required: document.getElementById('j-cgpa').value,
        skills: document.getElementById('j-skills').value,
        experience: document.getElementById('j-experience').value,
        education: document.getElementById('j-education').value,
        preferences: document.getElementById('j-preferences').value,
        allowed_branches: document.getElementById('j-branches').value
    };
    await postData('/jobs', data);
    document.getElementById('job-form').reset();
    toggleForm('job-form-container');
    loadData('jobs');
});

document.getElementById('app-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        student_id: document.getElementById('a-student').value,
        job_id: document.getElementById('a-job').value,
        status: document.getElementById('a-status').value
    };
    await postData('/applications', data);
    document.getElementById('app-form').reset();
    toggleForm('app-form-container');
    loadData('applications');
});

// POST data helper function
async function postData(endpoint, data) {
    try {
        const response = await apiFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        showToast(result.message || 'Success');
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.error('Error posting data', err);
            showToast('An error occurred. Make sure server is correct.', 'error');
        }
    }
}

// --- Modal and Inline Editing Interfaces ---
let currentEditId = null;

// Inline Status dropdown
window.inlineEditStatus = function (tdElement, appId, currentStatus) {
    if (tdElement.querySelector('select')) return;

    const select = document.createElement('select');
    select.innerHTML = `
        <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
        <option value="Accepted" ${currentStatus === 'Accepted' || currentStatus === 'Selected' ? 'selected' : ''}>Selected</option>
        <option value="Rejected" ${currentStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
    `;
    select.style.padding = '4px'; select.style.borderRadius = '4px';
    if (document.body.getAttribute('data-theme') === 'dark') {
        select.style.background = '#0f172a';
        select.style.color = '#e2e8f0';
        select.style.border = '1px solid #334155';
    }

    select.onblur = async () => {
        const newVal = select.value;
        if (newVal !== currentStatus) {
            await updateAppField(appId, { status: newVal });
            showToast('Student status updated to ' + newVal);
        }
        loadData('applications');
    };

    tdElement.innerHTML = '';
    tdElement.appendChild(select);
    select.focus();
};

// Inline Salary input
window.inlineEditSalary = function (tdElement, appId, currentSalary) {
    if (tdElement.querySelector('input')) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentSalary || 0;
    input.style.padding = '4px'; input.style.width = '100px'; input.style.borderRadius = '4px';
    if (document.body.getAttribute('data-theme') === 'dark') {
        input.style.background = '#0f172a';
        input.style.color = '#e2e8f0';
        input.style.border = '1px solid #334155';
    }

    input.onblur = async () => {
        const newVal = parseFloat(input.value) || 0;
        if (newVal !== currentSalary) {
            await updateAppField(appId, { salary: newVal });
            showToast('Salary updated successfully!');
        }
        loadData('applications');
    };

    tdElement.innerHTML = '';
    tdElement.appendChild(input);
    input.focus();
};

// Global Fetch Patches
async function updateAppField(appId, payload) {
    try {
        await apiFetch(`/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) { console.error(e); }
}

// Student Popup Modal
window.viewStudent = function (studentId) {
    const student = studentsList.find(s => s.student_id === studentId);
    if (!student) return;

    document.getElementById('modal-s-name').textContent = student.full_name;
    document.getElementById('modal-s-email').textContent = student.email;
    document.getElementById('modal-s-cgpa').textContent = student.cgpa;

    const skillsDiv = document.getElementById('modal-s-skills');
    skillsDiv.innerHTML = (student.skills || '').split(',').map(skill => skill.trim() ? `<span style="background:rgba(99,102,241,0.1);color:var(--primary);padding:4px 10px;border-radius:12px;font-size:0.8rem;">${skill.trim()}</span>` : '').join('');

    const sApps = window.applicationsList.filter(a => a.student_id === studentId);
    const appsDiv = document.getElementById('modal-s-apps');
    appsDiv.innerHTML = sApps.map(a => `
        <div style="background:var(--bg-light); padding:10px 15px; border-radius:8px; margin-bottom:10px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h5 style="color:var(--text-main); font-size:0.95rem; margin-bottom:3px;">${a.job_title}</h5>
                <p style="color:var(--text-muted); font-size:0.8rem;">${a.company_name}</p>
            </div>
            <div style="text-align:right;">
                <span class="badge ${a.status.toLowerCase() === 'accepted' || a.status.toLowerCase() === 'selected' ? 'selected' : (a.status.toLowerCase() === 'rejected' ? 'rejected' : 'applied')}">${a.status}</span>
                <div style="font-size:0.8rem; font-weight:600; color:var(--text-main); margin-top:5px;">$${a.salary || 0}</div>
            </div>
        </div>
    `).join('') || '<p style="color:var(--text-muted);font-size:0.85rem;">No applications yet.</p>';

    document.getElementById('student-modal').classList.add('active');
};

function openStatusModal(appId, currentStatus, currentSalary) {
    currentEditId = appId;
    const statObj = document.getElementById('update-status-select');
    if (statObj) statObj.value = (currentStatus === 'Selected' ? 'Accepted' : currentStatus);
    const salInput = document.getElementById('update-salary-input');
    if (salInput) salInput.value = currentSalary || 0;

    document.getElementById('status-modal').classList.add('active');
}

window.closeModal = function () {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    currentEditId = null;
}

document.getElementById('save-status-btn').addEventListener('click', async () => {
    const newStatus = document.getElementById('update-status-select').value;
    const salInput = document.getElementById('update-salary-input');
    let payload = { status: newStatus };
    if (salInput) payload.salary = parseFloat(salInput.value) || 0;

    try {
        const response = await apiFetch(`/applications/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        showToast('Application edited dynamically!');
        closeModal();
        loadData('applications'); // refresh
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.error(err);
            showToast('Error modifying status!', 'error');
        }
    }
});

// --- Job and Company Management (Admin CRUD) ---
window.deleteJob = async function (jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
        await apiFetch('/jobs/' + jobId, { method: 'DELETE' });
        showToast('Job deleted successfully', 'success');
        loadData('jobs');
    } catch (err) {
        showToast('Error deleting job', 'error');
    }
};

window.editJob = function (jobId) {
    const job = jobsList.find(j => j.job_id === jobId);
    if (!job) return;
    currentEditId = jobId;
    document.getElementById('edit-j-title').value = job.job_title;
    document.getElementById('edit-j-company').value = job.company_name;
    document.getElementById('edit-j-location').value = job.location || '';
    document.getElementById('edit-j-salary').value = job.salary || '';
    document.getElementById('edit-j-desc').value = job.description || '';
    document.getElementById('edit-j-cgpa').value = job.cgpa_required || '';
    document.getElementById('edit-j-skills').value = job.skills || '';
    document.getElementById('edit-j-experience').value = job.experience || '';
    document.getElementById('edit-j-education').value = job.education || '';
    document.getElementById('edit-j-preferences').value = job.preferences || '';
    document.getElementById('edit-j-branches').value = job.allowed_branches || 'ALL';

    document.getElementById('edit-job-modal').classList.add('active');
};

window.saveEditedJob = async function () {
    const data = {
        job_title: document.getElementById('edit-j-title').value,
        company_name: document.getElementById('edit-j-company').value,
        location: document.getElementById('edit-j-location').value,
        salary: document.getElementById('edit-j-salary').value,
        description: document.getElementById('edit-j-desc').value,
        cgpa_required: document.getElementById('edit-j-cgpa').value,
        skills: document.getElementById('edit-j-skills').value,
        experience: document.getElementById('edit-j-experience').value,
        education: document.getElementById('edit-j-education').value,
        preferences: document.getElementById('edit-j-preferences').value,
        allowed_branches: document.getElementById('edit-j-branches').value
    };
    try {
        await apiFetch('/jobs/' + currentEditId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showToast('Job updated successfully!');
        closeModal();
        loadData('jobs');
    } catch (err) {
        showToast('Error updating job', 'error');
    }
};

window.deleteCompany = async function (companyId) {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
        await apiFetch('/companies/' + companyId, { method: 'DELETE' });
        showToast('Company deleted successfully', 'success');
        loadData('companies');
    } catch (err) {
        showToast('Error deleting company', 'error');
    }
};

window.editCompany = function (companyId) {
    const comp = companiesList.find(c => c.company_id === companyId);
    if (!comp) return;
    currentEditId = companyId;
    document.getElementById('edit-c-name').value = comp.company_name;
    document.getElementById('edit-c-location').value = comp.location || '';

    document.getElementById('edit-company-modal').classList.add('active');
};

window.saveEditedCompany = async function () {
    const data = {
        company_name: document.getElementById('edit-c-name').value,
        location: document.getElementById('edit-c-location').value
    };
    try {
        await apiFetch('/companies/' + currentEditId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showToast('Company updated successfully!');
        closeModal();
        loadData('companies');
    } catch (err) {
        showToast('Error updating company', 'error');
    }
};

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadData('dashboard');
    // Pre-load data sequentially to populate dropdowns ahead of time
    setTimeout(() => {
        loadData('companies');
        setTimeout(() => loadData('students'), 300);
        setTimeout(() => loadData('jobs'), 600);
    }, 500);
});
// ================== OFF CAMPUS ====================
async function loadOffCampus() {
    try {
        const res = await apiFetch('/offcampus');
        const data = await res.json();
        const grid = document.getElementById('offcampus-grid');
        if (!grid) return;

        if (!data.length) {
            grid.innerHTML = '<p style="color:var(--text-muted);">No off campus jobs posted yet.</p>';
            return;
        }

        grid.innerHTML = data.map(j => `
            <div style="background:var(--panel-bg); border:1px solid var(--border-color); border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div>
                        <h3 style="color:var(--text-main); font-size:1.1rem; font-weight:700; margin-bottom:4px;">${j.job_title}</h3>
                        <p style="color:var(--text-muted); font-size:0.88rem;"><i class="fas fa-building" style="margin-right:5px;"></i>${j.company_name}</p>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="deleteOffCampus(${j.id})" style="padding:5px 10px; font-size:0.8rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                    <span style="background:rgba(16,185,129,0.1); color:#10b981; padding:4px 10px; border-radius:8px; font-size:0.82rem; font-weight:600;">
                        ₹ ${j.salary || 'Not Specified'}
                    </span>
                    <span style="background:rgba(99,102,241,0.1); color:#6366f1; padding:4px 10px; border-radius:8px; font-size:0.82rem; font-weight:600;">
                        <i class="fas fa-map-marker-alt"></i> ${j.location || 'Remote'}
                    </span>
                </div>
                <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">${j.description || ''}</p>
                ${j.apply_link ? `
                <a href="${j.apply_link}" target="_blank" class="btn btn-primary" style="width:100%; justify-content:center; text-decoration:none; display:flex;">
                    <i class="fas fa-external-link-alt"></i> Apply Now
                </a>` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading off campus jobs', err);
    }
}

document.getElementById('offcampus-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        company_name: document.getElementById('oc-company').value,
        job_title: document.getElementById('oc-title').value,
        salary: document.getElementById('oc-salary').value,
        location: document.getElementById('oc-location').value,
        apply_link: document.getElementById('oc-link').value,
        description: document.getElementById('oc-desc').value,
    };
    await postData('/offcampus', data);
    document.getElementById('offcampus-form').reset();
    toggleForm('offcampus-form-container');
    loadOffCampus();
});

window.deleteOffCampus = async function (id) {
    if (!confirm('Delete this off campus job?')) return;
    try {
        await apiFetch('/offcampus/' + id, { method: 'DELETE' });
        showToast('Off campus job deleted!');
        loadOffCampus();
    } catch (err) {
        showToast('Error deleting', 'error');
    }
};

window.deleteApplication = async function (appId) {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
        await apiFetch('/applications/' + appId, { method: 'DELETE' });
        showToast('Application deleted!');
        loadData('applications');
    } catch (err) {
        showToast('Error deleting application', 'error');
    }
};
// ================== STATISTICS ====================
let statsData = null;
let currentStatsView = 'cards';
let statsChartInstance = null;

async function loadStatistics() {
    try {
        const res = await apiFetch('/statistics');
        statsData = await res.json();
        renderStatsByCategory();
    } catch (err) {
        console.error('Error loading statistics', err);
    }
}

window.setStatsView = function (view) {
    currentStatsView = view;
    document.querySelectorAll('.stats-view-btn').forEach(b => b.classList.remove('active-view-btn'));
    document.getElementById('view-btn-' + view).classList.add('active-view-btn');
    renderStatsByCategory();
};

window.renderStatsByCategory = function () {
    if (!statsData) return;
    const category = document.getElementById('stats-category')?.value;
    const area = document.getElementById('stats-display-area');
    if (!area) return;

    if (statsChartInstance) { statsChartInstance.destroy(); statsChartInstance = null; }

    const toolbar = document.getElementById('stats-view-toolbar');
    if (toolbar) toolbar.style.display = category === 'overall' ? 'none' : 'flex';
    if (category === 'overall') renderOverallStats(area);
    else if (category === 'branch') renderStats(area, statsData.branchWise, 'branch', 'Branch-wise Placements');
    else if (category === 'company') renderStats(area, statsData.companyWise, 'company_name', 'Company-wise Placements');
    else if (category === 'cgpa') renderStats(area, statsData.cgpaWise, 'cgpa_range', 'CGPA-wise Placements');
    else if (category === 'campus') renderStats(area, statsData.campusWise, 'campus', 'Campus-wise Placements');
    else if (category === 'neo') renderNeoStats(area);
    else if (category === 'year') renderYearStats(area);
    else if (category === 'report') loadReportInStats(area);
};

function renderOverallStats(area) {
    const o = statsData.overall;
    area.innerHTML = `
        <!-- Hero Banner -->
        <div style="background:linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4); border-radius:20px; padding:32px 36px; margin-bottom:24px; color:white; position:relative; overflow:hidden;">
            <div style="position:absolute; right:-30px; top:-30px; width:200px; height:200px; background:rgba(255,255,255,0.08); border-radius:50%;"></div>
            <div style="position:absolute; right:60px; bottom:-40px; width:150px; height:150px; background:rgba(255,255,255,0.05); border-radius:50%;"></div>
            <h2 style="font-size:1.6rem; font-weight:700; margin-bottom:6px;">📊 Placement Overview 2025</h2>
            <p style="opacity:0.85; font-size:0.95rem;">Real-time placement analytics for your institution</p>
            <div style="display:flex; gap:40px; margin-top:24px; flex-wrap:wrap;">
                <div>
                    <p style="opacity:0.75; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Placement Rate</p>
                    <p style="font-size:3rem; font-weight:800; line-height:1;">${o.placementPercentage}%</p>
                </div>
                <div>
                    <p style="opacity:0.75; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Total Students</p>
                    <p style="font-size:3rem; font-weight:800; line-height:1;">${o.totalStudents}</p>
                </div>
                <div>
                    <p style="opacity:0.75; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Placed</p>
                    <p style="font-size:3rem; font-weight:800; line-height:1;">${o.placedStudents}</p>
                </div>
            </div>
        </div>

        <!-- Stat Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:18px; margin-bottom:24px;">
            <div style="background:linear-gradient(135deg, #10b981, #059669); border-radius:16px; padding:24px; color:white; box-shadow:0 8px 24px rgba(16,185,129,0.3);">
                <i class="fas fa-check-circle" style="font-size:1.8rem; opacity:0.8; margin-bottom:12px; display:block;"></i>
                <p style="font-size:0.8rem; opacity:0.85; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Placed Students</p>
                <p style="font-size:2.2rem; font-weight:800; line-height:1;">${o.placedStudents}</p>
            </div>
            <div style="background:linear-gradient(135deg, #ef4444, #dc2626); border-radius:16px; padding:24px; color:white; box-shadow:0 8px 24px rgba(239,68,68,0.3);">
                <i class="fas fa-times-circle" style="font-size:1.8rem; opacity:0.8; margin-bottom:12px; display:block;"></i>
                <p style="font-size:0.8rem; opacity:0.85; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Not Placed</p>
                <p style="font-size:2.2rem; font-weight:800; line-height:1;">${o.unplacedStudents}</p>
            </div>
            <div style="background:linear-gradient(135deg, #f59e0b, #d97706); border-radius:16px; padding:24px; color:white; box-shadow:0 8px 24px rgba(245,158,11,0.3);">
                <i class="fas fa-chart-line" style="font-size:1.8rem; opacity:0.8; margin-bottom:12px; display:block;"></i>
                <p style="font-size:0.8rem; opacity:0.85; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Average Package</p>
                <p style="font-size:1.6rem; font-weight:800; line-height:1;">₹${Number(o.avgSalary).toLocaleString('en-IN')}</p>
            </div>
            <div style="background:linear-gradient(135deg, #6366f1, #4f46e5); border-radius:16px; padding:24px; color:white; box-shadow:0 8px 24px rgba(99,102,241,0.3);">
                <i class="fas fa-arrow-up" style="font-size:1.8rem; opacity:0.8; margin-bottom:12px; display:block;"></i>
                <p style="font-size:0.8rem; opacity:0.85; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Highest Package</p>
                <p style="font-size:1.6rem; font-weight:800; line-height:1;">₹${Number(o.maxSalary).toLocaleString('en-IN')}</p>
            </div>
        </div>

        <!-- Progress Bar -->
        <div style="background:var(--panel-bg); border:1px solid var(--border-color); border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="color:var(--text-main); font-size:1rem; font-weight:600;">Overall Placement Progress</h4>
                <span style="font-weight:700; color:#6366f1; font-size:1.1rem;">${o.placementPercentage}%</span>
            </div>
            <div style="background:#e2e8f0; border-radius:20px; height:14px; overflow:hidden;">
                <div style="background:linear-gradient(90deg, #10b981, #6366f1, #06b6d4); height:100%; width:${o.placementPercentage}%; border-radius:20px; transition:width 1s ease;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:0.82rem; color:var(--text-muted);">
                <span>🟢 Placed: ${o.placedStudents}</span>
                <span>🔴 Not Placed: ${o.unplacedStudents}</span>
                <span>👥 Total: ${o.totalStudents}</span>
            </div>
        </div>`;
}
function renderStats(area, data, labelKey, title) {
    if (!data || !data.length) {
        area.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No data available yet.</p>';
        return;
    }
    const labels = data.map(d => d[labelKey] || 'Unknown');
    const placedData = data.map(d => d.placed || 0);
    const totalData = data.map(d => d.total || 0);

    if (currentStatsView === 'cards') {
        area.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;">
                ${data.map(d => `
                    <div style="background:var(--panel-bg);border:1px solid var(--border-color);border-radius:14px;padding:22px;box-shadow:0 4px 15px rgba(0,0,0,0.04);">
                        <h4 style="color:var(--text-main);font-size:1rem;margin-bottom:14px;font-weight:700;">${d[labelKey] || 'Unknown'}</h4>
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                            <span style="color:var(--text-muted);font-size:0.85rem;">Total Students</span>
                            <span style="font-weight:700;color:var(--text-main);">${d.total || 0}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
                            <span style="color:var(--text-muted);font-size:0.85rem;">Placed</span>
                            <span style="font-weight:700;color:#10b981;">${d.placed || 0}</span>
                        </div>
                        <div style="background:#e2e8f0;border-radius:10px;height:8px;overflow:hidden;">
                            <div style="background:linear-gradient(90deg,#10b981,#6366f1);height:100%;width:${d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0}%;border-radius:10px;"></div>
                        </div>
                        <p style="text-align:right;font-size:0.8rem;color:var(--text-muted);margin-top:6px;">${d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0}% placed</p>
                    </div>
                `).join('')}
            </div>`;
    } else if (currentStatsView === 'bar') {
        area.innerHTML = `<div class="panel"><h3 style="margin-bottom:20px;">${title}</h3><div style="position:relative;height:350px;"><canvas id="stats-chart"></canvas></div></div>`;
        setTimeout(() => {
            const ctx = document.getElementById('stats-chart');
            if (!ctx) return;
            statsChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Total', data: totalData, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
                        { label: 'Placed', data: placedData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);
    } else if (currentStatsView === 'pie') {
        area.innerHTML = `<div class="panel"><h3 style="margin-bottom:20px;">${title}</h3><div style="position:relative;height:350px;display:flex;justify-content:center;"><canvas id="stats-chart"></canvas></div></div>`;
        setTimeout(() => {
            const ctx = document.getElementById('stats-chart');
            if (!ctx) return;
            const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
            statsChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data: placedData, backgroundColor: colors, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }, 100);
    } else if (currentStatsView === 'table') {
        area.innerHTML = `
            <div class="panel" style="overflow-x:auto;">
                <h3 style="margin-bottom:20px;">${title}</h3>
                <table class="data-table">
                    <thead>
                        <tr><th>Name</th><th>Total</th><th>Placed</th><th>Not Placed</th><th>%</th></tr>
                    </thead>
                    <tbody>
                        ${data.map(d => `
                            <tr>
                                <td><strong>${d[labelKey] || 'Unknown'}</strong></td>
                                <td>${d.total || 0}</td>
                                <td style="color:#10b981;font-weight:600;">${d.placed || 0}</td>
                                <td style="color:#ef4444;">${(d.total || 0) - (d.placed || 0)}</td>
                                <td><span style="background:rgba(16,185,129,0.1);color:#10b981;padding:3px 9px;border-radius:8px;font-weight:600;font-size:0.82rem;">${d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }
}

function renderNeoStats(area) {
    const data = statsData.neoIdWise;
    if (!data || !data.length) {
        area.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No placed students with NEO ID yet.</p>';
        return;
    }
    area.innerHTML = `
        <div class="panel" style="overflow-x:auto;">
            <h3 style="margin-bottom:20px;">NEO ID — Placed Students</h3>
            <table class="data-table">
                <thead><tr><th>NEO ID</th><th>Student Name</th><th>Branch</th><th>CGPA</th><th>Status</th></tr></thead>
                <tbody>
                    ${data.map(d => `
                        <tr>
                            <td><strong>${d.neo_id || '—'}</strong></td>
                            <td>${d.full_name}</td>
                            <td>${d.branch || '—'}</td>
                            <td>${d.cgpa || '—'}</td>
                            <td><span class="badge selected">Placed ✅</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function renderYearStats(area) {
    const data = statsData.yearComparison;
    if (!data || !data.length) {
        area.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No year comparison data yet.</p>';
        return;
    }
    if (currentStatsView === 'table' || currentStatsView === 'cards') {
        area.innerHTML = `
            <div class="panel" style="overflow-x:auto;">
                <h3 style="margin-bottom:20px;">Year-wise Comparison</h3>
                <table class="data-table">
                    <thead><tr><th>Year</th><th>Total Applications</th><th>Placed</th><th>Placement %</th></tr></thead>
                    <tbody>
                        ${data.map(d => `
                            <tr>
                                <td><strong>${d.year}</strong></td>
                                <td>${d.total_applications}</td>
                                <td style="color:#10b981;font-weight:600;">${d.placed}</td>
                                <td><span style="background:rgba(16,185,129,0.1);color:#10b981;padding:3px 9px;border-radius:8px;font-weight:600;font-size:0.82rem;">${d.total_applications > 0 ? Math.round((d.placed / d.total_applications) * 100) : 0}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    } else {
        area.innerHTML = `<div class="panel"><h3 style="margin-bottom:20px;">Year-wise Comparison</h3><div style="position:relative;height:350px;"><canvas id="stats-chart"></canvas></div></div>`;
        setTimeout(() => {
            const ctx = document.getElementById('stats-chart');
            if (!ctx) return;
            statsChartInstance = new Chart(ctx, {
                type: currentStatsView === 'pie' ? 'doughnut' : 'bar',
                data: {
                    labels: data.map(d => String(d.year)),
                    datasets: [
                        { label: 'Total', data: data.map(d => d.total_applications), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
                        { label: 'Placed', data: data.map(d => d.placed), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);
    }
}
window.editUSN = async function (studentId, currentUSN) {
    const newUSN = prompt(`Enter new USN:\nCurrent: ${currentUSN || 'Not set'}`, currentUSN || '');
    if (!newUSN || newUSN === currentUSN) return;

    try {
        const res = await apiFetch(`/students/${studentId}/usn`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usn: newUSN.toUpperCase() })
        });
        const data = await res.json();
        showToast(data.message || 'USN Updated!');
        loadData('students');
    } catch (err) {
        showToast('Error updating USN', 'error');
    }
};
// ================== AUDIT LOG ====================
async function loadHistory() {
    try {
        const res = await apiFetch('/application-history');
        const data = await res.json();
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:40px;">No history yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(h => {
            const statusChanged = h.old_status !== h.new_status;
            const salaryChanged = h.old_salary !== h.new_salary;

            return `<tr>
                <td style="font-size:0.8rem; color:var(--text-muted);">
                    ${new Date(h.changed_at).toLocaleString()}
                </td>
                <td style="font-family:monospace; font-weight:700; color:var(--primary); font-size:0.85rem;">
                    ${h.student_usn || '—'}
                </td>
                <td><strong>${h.student_name || '—'}</strong></td>
                <td>${h.job_title || '—'}</td>
                <td>${h.company_name || '—'}</td>
                <td>
                    ${h.old_status
                    ? `<span class="badge ${h.old_status.toLowerCase() === 'accepted' ? 'selected' : h.old_status.toLowerCase() === 'rejected' ? 'rejected' : 'applied'}">${h.old_status}</span>`
                    : '<span style="color:var(--text-muted);">—</span>'}
                </td>
                <td>
                    ${statusChanged
                    ? `<span class="badge ${h.new_status.toLowerCase() === 'accepted' ? 'selected' : h.new_status.toLowerCase() === 'rejected' ? 'rejected' : 'applied'}" style="font-weight:800;">${h.new_status} ✨</span>`
                    : `<span class="badge ${h.new_status.toLowerCase() === 'accepted' ? 'selected' : h.new_status.toLowerCase() === 'rejected' ? 'rejected' : 'applied'}">${h.new_status}</span>`}
                </td>
                <td style="color:var(--text-muted);">
                    ${h.old_salary > 0 ? '₹' + Number(h.old_salary).toLocaleString('en-IN') : '—'}
                </td>
                <td style="font-weight:600; color:#10b981;">
                    ${h.new_salary > 0 ? '₹' + Number(h.new_salary).toLocaleString('en-IN') : '—'}
                </td>
                <td>
                    <span style="background:${h.action_type === 'APPLIED' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)'}; 
                        color:${h.action_type === 'APPLIED' ? '#6366f1' : '#f59e0b'}; 
                        padding:3px 9px; border-radius:8px; font-size:0.78rem; font-weight:600;">
                        ${h.action_type === 'APPLIED' ? '📝 Applied' : '🔄 Updated'}
                    </span>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error loading history', err);
    }
}// ================== PLACEMENT REPORT ====================
let reportData = null;

window.loadReport = async function () {
    try {
        const branch = document.getElementById('report-branch')?.value || '';
        const url = branch ? `/placement-report?branch=${branch}` : '/placement-report';
        const res = await apiFetch(url);
        reportData = await res.json();
        renderReportBranchStats(reportData.branchStats, branch);
        renderReportCompanyTable(reportData.companyStats);
    } catch (err) {
        console.error('Error loading report', err);
    }
};

function renderReportBranchStats(branchStats, selectedBranch) {
    const area = document.getElementById('report-branch-stats');
    if (!area) return;

    const filtered = selectedBranch
        ? branchStats.filter(b => b.branch === selectedBranch)
        : branchStats;

    if (!filtered.length) {
        area.innerHTML = '<p style="color:var(--text-muted);">No data available.</p>';
        return;
    }

    area.innerHTML = filtered.map(b => `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-bottom:20px; box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <h3 style="color:#6366f1; font-size:1.1rem; margin-bottom:16px; padding-bottom:10px; border-bottom:2px solid #e0e7ff;">
                📚 Statistics for ${b.branch || 'Unknown'} Branch
            </h3>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;">
                <div style="background:#f0fdf4; border:1px solid #dcfce7; border-radius:12px; padding:16px; text-align:center;">
                    <p style="font-size:0.78rem; color:#64748b; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Total Placed</p>
                    <p style="font-size:1.8rem; font-weight:800; color:#10b981;">${b.total_placed || 0}</p>
                </div>
                <div style="background:#eff6ff; border:1px solid #dbeafe; border-radius:12px; padding:16px; text-align:center;">
                    <p style="font-size:0.78rem; color:#64748b; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Average CTC</p>
                    <p style="font-size:1.4rem; font-weight:800; color:#3b82f6;">₹${Number(b.avg_ctc || 0).toLocaleString('en-IN')}</p>
                </div>
                <div style="background:#fdf4ff; border:1px solid #fce7f3; border-radius:12px; padding:16px; text-align:center;">
                    <p style="font-size:0.78rem; color:#64748b; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Maximum CTC</p>
                    <p style="font-size:1.4rem; font-weight:800; color:#8b5cf6;">₹${Number(b.max_ctc || 0).toLocaleString('en-IN')}</p>
                </div>
                <div style="background:#fff7ed; border:1px solid #ffedd5; border-radius:12px; padding:16px; text-align:center;">
                    <p style="font-size:0.78rem; color:#64748b; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">Minimum CTC</p>
                    <p style="font-size:1.4rem; font-weight:800; color:#f59e0b;">₹${Number(b.min_ctc || 0).toLocaleString('en-IN')}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderReportCompanyTable(companyStats) {
    const tbody = document.getElementById('report-company-body');
    if (!tbody) return;

    if (!companyStats || !companyStats.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:40px;">No placement data yet.</td></tr>';
        return;
    }

    tbody.innerHTML = companyStats.map((c, i) => `
        <tr>
            <td style="color:var(--text-muted); font-size:0.85rem; text-align:center; width:60px;">${i + 1}</td>
            <td style="font-weight:600; font-size:0.95rem;">${c.company_name}</td>
            <td style="text-align:center;">
                <span style="background:rgba(16,185,129,0.1); color:#10b981; padding:5px 14px; border-radius:8px; font-weight:700;">
                    ${c.placed}
                </span>
            </td>
           <td style="font-weight:700; color:#6366f1; font-size:0.95rem; text-align:center;">
                ${c.avg_ctc ? '₹' + Number(c.avg_ctc).toLocaleString('en-IN') : 'N/A'}
            </td>
        </tr>
    `).join('');
}

window.sortReport = function () {
    if (!reportData) return;
    const sortBy = document.getElementById('report-sort')?.value;
    let sorted = [...reportData.companyStats];

    if (sortBy === 'ctc') {
        sorted.sort((a, b) => (b.avg_ctc || 0) - (a.avg_ctc || 0));
    } else if (sortBy === 'placed') {
        sorted.sort((a, b) => (b.placed || 0) - (a.placed || 0));
    } else {
        sorted.sort((a, b) => a.company_name.localeCompare(b.company_name));
    }

    renderReportCompanyTable(sorted);
};
async function loadReportInStats(area) {
    try {
        const res = await apiFetch('/placement-report');
        reportData = await res.json();

        area.innerHTML = `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px 24px;margin-bottom:24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <i class="fas fa-filter" style="color:#6366f1;"></i>
            <span style="font-weight:600;color:#1e293b;">Select Branch:</span>
            <select id="report-branch" onchange="filterReportBranch()" style="padding:9px 16px;border:1px solid #e2e8f0;border-radius:9px;font-size:0.9rem;color:#1e293b;background:#f8fafc;cursor:pointer;font-family:'Poppins',sans-serif;">
                <option value="">All Branches</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EE">EE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
            </select>
            <select id="report-sort" onchange="sortReport()" style="padding:9px 16px;border:1px solid #e2e8f0;border-radius:9px;font-size:0.9rem;color:#1e293b;background:#f8fafc;cursor:pointer;font-family:'Poppins',sans-serif;">
                <option value="company">Sort by Company Name</option>
                <option value="ctc">Sort by Avg CTC</option>
                <option value="placed">Sort by Placed Count</option>
            </select>
        </div>
        <div id="report-branch-stats" style="margin-bottom:24px;"></div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <h3 style="margin-bottom:20px;color:#1e293b;">🏢 Company-wise Placement Details</h3>
            <table class="data-table">
                <thead>
    <tr>
        <th style="width:50px;">No.</th>
        <th style="width:40%;">Company Name</th>
        <th style="width:25%; text-align:center;">Students Placed</th>
        <th style="width:25%; text-align:center;">Average CTC</th>
    </tr>
</thead>
                <tbody id="report-company-body"></tbody>
            </table>
        </div>`;

        renderReportBranchStats(reportData.branchStats, '');
        renderReportCompanyTable(reportData.companyStats);
    } catch (err) {
        console.error('Error loading report', err);
    }
}

window.filterReportBranch = function () {
    if (!reportData) return;
    const branch = document.getElementById('report-branch')?.value || '';
    const filtered = branch
        ? reportData.companyStats.filter(c => c.branch === branch)
        : reportData.companyStats;
    renderReportBranchStats(reportData.branchStats, branch);
    renderReportCompanyTable(filtered);
};
// ================== UPCOMING COMPANIES ====================
async function loadUpcoming() {
    try {
        const res = await apiFetch('/upcoming');
        const data = await res.json();
        const grid = document.getElementById('upcoming-grid');
        if (!grid) return;

        if (!data.length) {
            grid.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:40px;">No upcoming companies scheduled yet.</p>';
            return;
        }

        grid.innerHTML = data.map(c => {
            const visitDate = new Date(c.visit_date);
            const today = new Date();
            const daysLeft = Math.ceil((visitDate - today) / (1000 * 60 * 60 * 24));
            const urgency = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#10b981';

            return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.05); position:relative; overflow:hidden;">
                <div style="position:absolute; top:0; left:0; right:0; height:4px; background:${urgency};"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                    <div>
                        <h3 style="color:#1e293b; font-size:1.1rem; font-weight:700; margin-bottom:4px;">${c.company_name}</h3>
                        <p style="color:#64748b; font-size:0.85rem;">${c.job_title || '—'}</p>
                    </div>
                    <div style="text-align:center; background:${urgency}15; border:1px solid ${urgency}40; border-radius:10px; padding:8px 14px;">
                        <p style="font-size:1.5rem; font-weight:800; color:${urgency}; line-height:1;">${daysLeft}</p>
                        <p style="font-size:0.7rem; color:${urgency}; font-weight:600;">DAYS LEFT</p>
                    </div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
                    <span style="background:#eff6ff; color:#3b82f6; padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:600;">
                        <i class="fas fa-calendar"></i> ${visitDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style="background:#f0fdf4; color:#10b981; padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:600;">
                        <i class="fas fa-star"></i> CGPA: ${c.required_cgpa || 'No Bar'}+
                    </span>
                    <span style="background:#fdf4ff; color:#8b5cf6; padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:600;">
                        <i class="fas fa-code-branch"></i> ${c.allowed_branches || 'ALL'}
                    </span>
                </div>
                <div style="background:#f8fafc; border-radius:10px; padding:12px; margin-bottom:14px;">
                    <p style="font-size:0.82rem; color:#64748b; margin-bottom:6px; font-weight:600;">
                        <i class="fas fa-laptop-code" style="color:#6366f1;"></i> Required Skills:
                    </p>
                    <p style="font-size:0.88rem; color:#1e293b;">${c.required_skills || 'Not specified'}</p>
                </div>
                ${c.description ? `
                <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:10px; padding:12px; margin-bottom:14px;">
                    <p style="font-size:0.82rem; color:#92400e; font-weight:600; margin-bottom:4px;">
                        <i class="fas fa-lightbulb"></i> Preparation Tips:
                    </p>
                    <p style="font-size:0.85rem; color:#78350f;">${c.description}</p>
                </div>` : ''}
                <button class="btn btn-danger" style="width:100%; justify-content:center;" onclick="deleteUpcoming(${c.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Error loading upcoming', err);
    }
}

document.getElementById('upcoming-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        company_name: document.getElementById('uc-company').value,
        job_title: document.getElementById('uc-title').value,
        visit_date: document.getElementById('uc-date').value,
        required_cgpa: document.getElementById('uc-cgpa').value,
        required_skills: document.getElementById('uc-skills').value,
        allowed_branches: document.getElementById('uc-branches').value,
        description: document.getElementById('uc-desc').value
    };
    await postData('/upcoming', data);
    document.getElementById('upcoming-form').reset();
    toggleForm('upcoming-form-container');
    loadUpcoming();
});

window.deleteUpcoming = async function (id) {
    if (!confirm('Remove this upcoming company?')) return;
    try {
        await apiFetch('/upcoming/' + id, { method: 'DELETE' });
        showToast('Removed!');
        loadUpcoming();
    } catch (err) {
        showToast('Error', 'error');
    }
};