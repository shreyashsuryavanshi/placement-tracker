const API_URL = '/api';

// Fetch Wrapper handling credentials and auth redirects
async function apiFetch(url, options = {}) {
    options.credentials = 'include';
    const fullUrl = url.startsWith('http') ? url : (url.startsWith('/api') ? url : API_URL + url);

    try {
        const response = await fetch(fullUrl, options);
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login.html';
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error("Fetch error:", e);
        return null;
    }
}

// Sidebar Navigation
document.querySelectorAll('.sidebar .nav-links li').forEach(li => {
    li.addEventListener('click', (e) => {
        document.querySelectorAll('.sidebar .nav-links li').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetId = e.currentTarget.getAttribute('data-target');

        document.querySelectorAll('.content-sections .section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'jobs') { loadDashboardStats(); loadJobs(); }
        if (targetId === 'applications') loadApplications();
        if (targetId === 'offcampus') loadStudentOffCampus();
        if (targetId === 'statistics') loadStudentStatistics();
        if (targetId === 'upcoming') loadStudentUpcoming();
    });
});

// Load and Render Jobs in Pastel Grid
window.allStudentJobs = [];

// Load and Render Jobs in Pastel Grid
async function loadJobs() {
    const data = await apiFetch('/student/jobs');
    if (!data) return;

    const select = document.getElementById('a-job');
    if (select) {
        select.innerHTML = '<option value="">Select Job...</option>';
        data.forEach(j => { select.innerHTML += `<option value="${j.job_id}">${j.job_title} at ${j.company_name}</option>`; });
    }

    window.allStudentJobs = data;
    renderStudentJobs();
}

window.filterJobs = function () {
    renderStudentJobs();
}

function renderStudentJobs() {
    const branchFilter = (document.getElementById('filter-branch')?.value || '').toUpperCase();

    let filtered = window.allStudentJobs.filter(j => {
        if (!branchFilter) return true;
        const allowed = (j.allowed_branches || 'ALL').toUpperCase();
        return allowed === 'ALL' || allowed.includes(branchFilter);
    });

    const countEl = document.getElementById('filter-result-count');
    if (countEl) {
        countEl.textContent = branchFilter
            ? `${filtered.length} job${filtered.length !== 1 ? 's' : ''} found for ${branchFilter}`
            : '';
    }

    const recGrid = document.getElementById('recommended-grid-container');
    const highGrid = document.getElementById('high-salary-grid-container');
    const recentGrid = document.getElementById('recent-grid-container');

    if (!recGrid || !highGrid || !recentGrid) return;

    [recGrid, highGrid, recentGrid].forEach(g => {
        g.style.display = 'grid';
        g.style.gridTemplateColumns = 'repeat(auto-fill, minmax(340px, 1fr))';
        g.style.gap = '25px';
        g.innerHTML = '';
    });

    const recommended = filtered.slice(0, 3);
    const highSalary = filtered.filter(j => parseFloat(j.salary) >= 7).slice(0, 3);
    const recent = [...filtered].reverse().slice(0, 6);

    recommended.forEach(j => recGrid.innerHTML += createJobCardHTML(j));
    if (recommended.length === 0) recGrid.innerHTML = '<p style="color:#6b7280;">No jobs found for this branch.</p>';

    highSalary.forEach(j => highGrid.innerHTML += createJobCardHTML(j));
    if (highSalary.length === 0) highGrid.innerHTML = '<p style="color:#6b7280;">No high salary jobs for this branch.</p>';

    recent.forEach(j => recentGrid.innerHTML += createJobCardHTML(j));
    if (recent.length === 0) recentGrid.innerHTML = '<p style="color:#6b7280;">No jobs found.</p>';
}
function createJobCardHTML(j) {
    const jobSalary = j.salary && j.salary !== 'Not Specified' ? j.salary : 'Not Disclosed';
    const badgeHtml = j.allowed_branches && j.allowed_branches.toUpperCase() !== 'ALL'
        ? `<span style="margin-left:auto; background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Eligible for: ${j.allowed_branches}</span>`
        : `<span style="margin-left:auto; background: #d1fae5; color: #047857; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-globe"></i> Open to All Branches</span>`;

    return `
        <div style="background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; transition: transform 0.3s, box-shadow 0.3s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.05)';">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 50px; height: 50px; border-radius: 12px; background: #f3f4f6; color: var(--primary); display: flex; justify-content: center; align-items: center; font-size: 1.5rem;">
                        <i class="fas fa-building"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1.1rem; color: #111827; font-weight: 700;">${j.company_name}</h4>
                        <p style="margin: 0; color: #6b7280; font-size: 0.85rem;"><i class="fas fa-map-marker-alt"></i> ${j.location || 'Remote'}</p>
                    </div>
                </div>
                <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 0.9rem;">
                    ${jobSalary}
                </span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 1.4rem; color: #1f2937; margin: 0;">${j.job_title}</h3>
                </div>
                <div style="display: flex;">${badgeHtml}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;">
                <div style="font-size: 0.85rem; color: #4b5563;">
                    <i class="fas fa-laptop-code" style="color: #6366f1; width: 20px;"></i> <strong>Skills:</strong> ${j.skills || 'Any'}
                </div>
                <div style="font-size: 0.85rem; color: #4b5563;">
                    <i class="fas fa-graduation-cap" style="color: #6366f1; width: 20px;"></i> <strong>Edu:</strong> ${j.education || 'Any Degree'}
                </div>
                <div style="font-size: 0.85rem; color: #4b5563;">
                    <i class="fas fa-briefcase" style="color: #6366f1; width: 20px;"></i> <strong>Exp:</strong> ${j.experience || 'Fresher'}
                </div>
                <div style="font-size: 0.85rem; color: #4b5563;">
                    <i class="fas fa-chart-line" style="color: #6366f1; width: 20px;"></i> <strong>CGPA:</strong> ${j.cgpa_required > 0 ? j.cgpa_required + '+' : 'No Bar'}
                </div>
                <div style="grid-column: 1 / -1; font-size: 0.85rem; color: #4b5563;">
                    <i class="fas fa-user-check" style="color: #6366f1; width: 20px;"></i> <strong>Pref:</strong> ${j.preferences || 'Open to All'}
                </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <button class="btn btn-primary" style="width: 100%; justify-content: center; font-size: 1rem; padding: 12px; background: linear-gradient(135deg, #4f46e5, #3b82f6); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); border: none;" onclick="applyDirectly(${j.job_id})">
                    Apply Now <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
                </button>
            </div>
            
        </div>
    `;
}

// Global function to apply directly from card
window.applyDirectly = async function (job_id) {
    const sIdField = document.getElementById('s-id');
    const student_id = sIdField ? sIdField.value : null;

    if (!student_id) {
        alert("Please complete and save your Personal Profile first so we have your explicit Student ID!");
        document.querySelector('[data-target="profile"]').click();
        return;
    }

    const confirmApply = confirm("Do you want to instantly submit your application for this position?");
    if (!confirmApply) return;

    const result = await apiFetch('/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id, job_id, status: 'Pending' })
    });

    if (result && result.message) {
        alert('✅ Application submitted implicitly!');
        loadApplications();
        document.querySelector('[data-target="applications"]').click();
    } else {
        alert('❌ Failed to apply. Please manually try again.');
    }
};

// Load and Render Applications
async function loadApplications() {
    const data = await apiFetch('/student/applications');
    if (!data) return;

    const tbody = document.getElementById('applications-table-body');
    tbody.innerHTML = '';

    data.forEach(a => {
        const rawStatus = a.status || 'Pending';
        const statusClass = rawStatus.toLowerCase();
        let badgeClass = 'pending';
        if (statusClass === 'accepted' || statusClass === 'approved') badgeClass = 'accepted';
        if (statusClass === 'rejected') badgeClass = 'rejected';

        tbody.innerHTML += `<tr>
    <td>#${a.application_id}</td>
    <td><strong>${a.job_title}</strong></td>
    <td>${a.company_name}</td>
    <td><span class="badge ${badgeClass}">${rawStatus}</span></td>
    <td>${a.salary && a.salary > 0
                ? `<span style="font-weight:700; color:#10b981;">₹${Number(a.salary).toLocaleString('en-IN')}</span>`
                : `<span style="color:#94a3b8;">Not decided yet</span>`}
    </td>
</tr>`;
    });
}

// Submit Application
document.getElementById('app-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const student_id = document.getElementById('s-id').value;
    if (!student_id) {
        alert("Action Denied: You must complete and save your Profile first. This registers your USN so recruiters know who you are!");
        return;
    }
    const job_id = document.getElementById('a-job').value;

    const result = await apiFetch('/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id, job_id, status: 'Pending' })
    });

    if (result && result.message) {
        alert('✅ Application submitted successfully!');
        document.getElementById('a-job').value = '';
        loadApplications(); // Refresh table
    } else {
        alert(result?.error || '❌ Failed to submit application. Did you already apply to this job?');
    }
});

// Logout Feature
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        // We use explicit fetch here to avoid /api URL binding. 
        const response = await fetch('/logout', { method: 'POST', credentials: 'include' });
        if (response.ok) {
            window.location.href = '/login.html';
        }
    } catch (err) {
        console.error("Logout failed:", err);
    }
});

// Resume Upload Handler
document.getElementById('resume-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('resume-file');
    if (!fileInput.files.length) return;

    const statusMsg = document.getElementById('upload-status');
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--text-muted)';
    statusMsg.textContent = 'Uploading securely...';

    const formData = new FormData();
    formData.append('resume', fileInput.files[0]);

    try {
        const response = await fetch('/api/student/resume', {
            method: 'POST',
            body: formData, // No Content-Type header so browser safely sets the precise multipart boundary
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            statusMsg.style.color = 'var(--success)';
            statusMsg.textContent = '✅ Resume explicitly uploaded! (' + result.filename + ')';
            fileInput.value = ''; // clean out field implicitly
        } else {
            statusMsg.style.color = 'var(--danger)';
            statusMsg.textContent = `❌ Upload failed: ${result.error}`;
        }
    } catch (err) {
        statusMsg.style.color = 'var(--danger)';
        statusMsg.textContent = '❌ An internal server error crashed the upload.';
    }
});

// Profile Handling
async function loadProfile() {
    const data = await apiFetch('/student/profile');
    if (data) {
        document.getElementById('profile-display-name').textContent = data.full_name || 'Your Name';
        document.getElementById('profile-display-email').textContent = data.email || '';
        document.getElementById('profile-display-usn').textContent = data.usn || '—';
        document.getElementById('profile-display-branch').textContent = data.branch || '—';
        document.getElementById('profile-display-cgpa').textContent = data.cgpa || '—';
        if (data.profile_photo) {
            document.getElementById('profile-img').src = '/uploads/' + data.profile_photo;
        }
        if (data.branch && data.branch !== 'Not Specified') document.getElementById('prof-branch').value = data.branch;
        const profUsn = document.getElementById('prof-usn');
        if (profUsn && data.usn) {
            profUsn.value = data.usn;
            profUsn.readOnly = true;
            profUsn.style.background = '#f1f5f9';
            profUsn.style.cursor = 'not-allowed';
            profUsn.style.border = '2px solid #10b981';
        }

        // Lock all fields after first save
        // First fill values THEN lock
        document.getElementById('prof-name').value = data.full_name || '';
        document.getElementById('prof-email').value = data.email || '';
        document.getElementById('prof-cgpa').value = data.cgpa || '';
        if (data.full_name && data.usn) {
            const lockFields = ['prof-name', 'prof-email', 'prof-cgpa', 'prof-branch'];
            lockFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.readOnly = true;
                    el.disabled = id === 'prof-branch';
                    el.style.background = '#f1f5f9';
                    el.style.cursor = 'not-allowed';
                    el.style.color = '#64748b';
                    el.style.border = '1px solid #e2e8f0';
                }
            });

            // Change save button to only save skills
            const saveBtn = document.querySelector('#profile-form button[type="submit"]');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Skills';
                saveBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
            }

            // Add locked message
            const form = document.getElementById('profile-form');
            if (form && !document.getElementById('lock-notice')) {
                const notice = document.createElement('div');
                notice.id = 'lock-notice';
                notice.style.cssText = 'background:#eff6ff; border:1px solid #dbeafe; border-radius:10px; padding:12px 16px; margin-bottom:16px; font-size:0.85rem; color:#1d4ed8; display:flex; align-items:center; gap:8px;';
                notice.innerHTML = '<i class="fas fa-lock"></i> Profile is locked. Only Skills can be updated. Contact admin for changes.';
                form.insertBefore(notice, form.firstChild);
            }
        }
        // Auto-fill their Student ID safely behind the scenes for Applying
        const sIdField = document.getElementById('s-id');
        const sUsnField = document.getElementById('s-usn');
        if (sIdField && data.student_id) {
            sIdField.value = data.student_id;
            sIdField.setAttribute('readonly', 'true');
        }
        if (sUsnField && data.usn) {
            sUsnField.value = data.usn;
        }
    }
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('prof-name').value;
    const cgpa = document.getElementById('prof-cgpa').value || null;
    const skills = document.getElementById('prof-skills').value || '';
    const branch = document.getElementById('prof-branch').value;
    const usn = document.getElementById('prof-usn').value.toUpperCase();

    if (!usn) {
        alert('⚠️ USN is mandatory! Please enter your University USN.');
        return;
    }

    const statusMsg = document.getElementById('profile-status');
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--text-muted)';
    statusMsg.textContent = 'Saving profile synchronously...';

    const result = await apiFetch('/student/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, cgpa, skills, branch, usn })
    });

    if (result && result.message) {
        statusMsg.style.color = 'var(--success)';
        statusMsg.textContent = '✅ ' + result.message;
        loadProfile(); // Reload seamlessly capturing their freshly mapped XAMPP student ID
    } else {
        statusMsg.style.color = 'var(--danger)';
        statusMsg.textContent = '❌ Failed to save profile.';
    }
});

async function loadDashboardStats() {
    const data = await apiFetch('/student/analytics');
    if (!data) return;

    const elTotal = document.getElementById('count-total'); if (elTotal) elTotal.textContent = data.totalStudents || 0;
    const elPlaced = document.getElementById('count-placed'); if (elPlaced) elPlaced.textContent = data.placedStudents || 0;
    const elUnplaced = document.getElementById('count-unplaced'); if (elUnplaced) elUnplaced.textContent = data.unplacedStudents || 0;
    const elPercent = document.getElementById('count-percentage'); if (elPercent) elPercent.textContent = (data.placementPercentage || 0) + '%';
    const elHigh = document.getElementById('sal-highest'); if (elHigh) elHigh.textContent = '$' + (data.salary?.max || 0);
    const elAvg = document.getElementById('sal-average'); if (elAvg) elAvg.textContent = '$' + (data.salary?.avg || 0);
}


// Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadJobs();
    loadProfile();
    loadNotifications();
    loadApplications();
    setInterval(loadNotifications, 30000);
    setInterval(loadApplications, 15000);
});
async function uploadPhoto() {
    const fileInput = document.getElementById('photo-input');
    if (!fileInput.files.length) {
        alert("Select a photo first");
        return;
    }

    const formData = new FormData();
    formData.append('photo', fileInput.files[0]);

    const res = await fetch('/api/student/photo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    });

    const data = await res.json();

    if (res.ok) {
        document.getElementById('profile-img').src = '/uploads/' + data.filename;
        alert("Photo uploaded!");
    } else {
        alert("Upload failed");
    }
}// ===== NOTIFICATIONS =====
async function loadNotifications() {
    const data = await apiFetch('/notifications');
    if (!data) return;

    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;

    const unread = data.filter(n => n.is_read === 0);

    if (unread.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = unread.length;
    } else {
        badge.style.display = 'none';
    }

    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px; font-size:0.88rem;">No notifications yet</p>';
        return;
    }

    list.innerHTML = data.map(n => `
        <div style="padding:12px; border-radius:10px; margin-bottom:8px; background:${n.is_read ? '#f8fafc' : '#eef2ff'}; border:1px solid ${n.is_read ? '#e2e8f0' : '#c7d2fe'};">
            <p style="margin:0; font-size:0.88rem; color:#1e293b;">${n.message}</p>
            <span style="font-size:0.75rem; color:#94a3b8; margin-top:4px; display:block;">
                ${new Date(n.created_at).toLocaleString()}
            </span>
        </div>
    `).join('');
}

window.toggleNotifications = function () {
    const dropdown = document.getElementById('notif-dropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) markAllRead();
};

window.markAllRead = async function () {
    await apiFetch('/notifications/read', { method: 'POST' });
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    loadNotifications();
};

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown && !e.target.closest('#notif-dropdown') && !e.target.closest('[onclick="toggleNotifications()"]')) {
        dropdown.style.display = 'none';
    }
});
// ================== OFF CAMPUS ====================
async function loadStudentOffCampus() {
    const data = await apiFetch('/offcampus');
    if (!data) return;

    const grid = document.getElementById('student-offcampus-grid');
    if (!grid) return;

    if (!data.length) {
        grid.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:40px;">No off campus jobs posted yet. Check back later!</p>';
        return;
    }

    grid.innerHTML = data.map(j => `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.05); transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
                <div style="width:48px; height:48px; border-radius:12px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:#6366f1;">
                    <i class="fas fa-globe"></i>
                </div>
                <div>
                    <h4 style="margin:0; font-size:1rem; font-weight:700; color:#111827;">${j.company_name}</h4>
                    <p style="margin:0; color:#6b7280; font-size:0.82rem;"><i class="fas fa-map-marker-alt"></i> ${j.location || 'Remote'}</p>
                </div>
                <span style="margin-left:auto; background:rgba(16,185,129,0.1); color:#10b981; padding:5px 12px; border-radius:20px; font-weight:700; font-size:0.85rem;">
                    ${j.salary || 'Not Specified'}
                </span>
            </div>
            <h3 style="font-size:1.2rem; color:#1f2937; margin-bottom:10px;">${j.job_title}</h3>
            <p style="color:#6b7280; font-size:0.85rem; margin-bottom:18px;">${j.description || ''}</p>
            ${j.apply_link ? `
            <a href="${j.apply_link}" target="_blank" style="display:block; text-align:center; background:linear-gradient(135deg, #4f46e5, #6366f1); color:white; padding:12px; border-radius:10px; text-decoration:none; font-weight:600; font-size:0.95rem;">
                <i class="fas fa-external-link-alt" style="margin-right:8px;"></i> Apply Now
            </a>` : ''}
        </div>
    `).join('');
}
// ================== STATISTICS ====================
let statsData = null;
let currentStatsView = 'cards';
let statsChartInstance = null;

async function loadStudentStatistics() {
    const data = await apiFetch('/statistics');
    if (!data) return;
    statsData = data;
    renderStatsByCategory();
}

window.setStatsView = function (view) {
    currentStatsView = view;
    document.querySelectorAll('.stats-view-btn').forEach(b => {
        b.style.background = 'white';
        b.style.color = '#64748b';
        b.style.borderColor = '#e2e8f0';
    });
    const active = document.getElementById('view-btn-' + view);
    if (active) {
        active.style.background = '#6366f1';
        active.style.color = 'white';
        active.style.borderColor = '#6366f1';
    }
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
    else if (category === 'year') renderYearStats(area);
};

function renderOverallStats(area) {
    const o = statsData.overall;
    area.innerHTML = `
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4);border-radius:20px;padding:32px 36px;margin-bottom:24px;color:white;position:relative;overflow:hidden;">
            <div style="position:absolute;right:-30px;top:-30px;width:200px;height:200px;background:rgba(255,255,255,0.08);border-radius:50%;"></div>
            <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:6px;">📊 Placement Overview 2025</h2>
            <p style="opacity:0.85;font-size:0.95rem;">Real-time placement analytics</p>
            <div style="display:flex;gap:40px;margin-top:24px;flex-wrap:wrap;">
                <div>
                    <p style="opacity:0.75;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Placement Rate</p>
                    <p style="font-size:3rem;font-weight:800;line-height:1;">${o.placementPercentage}%</p>
                </div>
                <div>
                    <p style="opacity:0.75;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Total Students</p>
                    <p style="font-size:3rem;font-weight:800;line-height:1;">${o.totalStudents}</p>
                </div>
                <div>
                    <p style="opacity:0.75;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Placed</p>
                    <p style="font-size:3rem;font-weight:800;line-height:1;">${o.placedStudents}</p>
                </div>
            </div>
        </div>
       <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;">
            <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;padding:24px;color:white;box-shadow:0 8px 24px rgba(16,185,129,0.3);">
                <i class="fas fa-check-circle" style="font-size:1.8rem;opacity:0.8;margin-bottom:12px;display:block;"></i>
                <p style="font-size:0.8rem;opacity:0.85;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Placed Students</p>
                <p style="font-size:2.2rem;font-weight:800;line-height:1;">${o.placedStudents}</p>
            </div>
            <div style="background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:16px;padding:24px;color:white;box-shadow:0 8px 24px rgba(239,68,68,0.3);">
                <i class="fas fa-times-circle" style="font-size:1.8rem;opacity:0.8;margin-bottom:12px;display:block;"></i>
                <p style="font-size:0.8rem;opacity:0.85;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Not Placed</p>
                <p style="font-size:2.2rem;font-weight:800;line-height:1;">${o.unplacedStudents}</p>
            </div>
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;padding:24px;color:white;box-shadow:0 8px 24px rgba(245,158,11,0.3);">
                <i class="fas fa-chart-line" style="font-size:1.8rem;opacity:0.8;margin-bottom:12px;display:block;"></i>
                <p style="font-size:0.8rem;opacity:0.85;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Average Package</p>
                <p style="font-size:1.6rem;font-weight:800;line-height:1;">₹${Number(o.avgSalary).toLocaleString('en-IN')}</p>
            </div>
            <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px;padding:24px;color:white;box-shadow:0 8px 24px rgba(99,102,241,0.3);">
                <i class="fas fa-arrow-up" style="font-size:1.8rem;opacity:0.8;margin-bottom:12px;display:block;"></i>
                <p style="font-size:0.8rem;opacity:0.85;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Highest Package</p>
                <p style="font-size:1.6rem;font-weight:800;line-height:1;">₹${Number(o.maxSalary).toLocaleString('en-IN')}</p>
            </div>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h4 style="color:#1e293b;font-size:1rem;font-weight:600;">Overall Placement Progress</h4>
                <span style="font-weight:700;color:#6366f1;font-size:1.1rem;">${o.placementPercentage}%</span>
            </div>
            <div style="background:#e2e8f0;border-radius:20px;height:14px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#10b981,#6366f1,#06b6d4);height:100%;width:${o.placementPercentage}%;border-radius:20px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:0.82rem;color:#64748b;">
                <span>🟢 Placed: ${o.placedStudents}</span>
                <span>🔴 Not Placed: ${o.unplacedStudents}</span>
                <span>👥 Total: ${o.totalStudents}</span>
            </div>
        </div>`;
}

function renderStats(area, data, labelKey, title) {
    if (!data || !data.length) {
        area.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">No data available yet.</p>';
        return;
    }
    const labels = data.map(d => d[labelKey] || 'Unknown');
    const placedData = data.map(d => d.placed || 0);
    const totalData = data.map(d => d.total || 0);

    if (currentStatsView === 'cards') {
        area.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;">
                ${data.map(d => `
                    <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:22px;box-shadow:0 4px 15px rgba(0,0,0,0.04);">
                        <h4 style="color:#1e293b;font-size:1rem;margin-bottom:14px;font-weight:700;">${d[labelKey] || 'Unknown'}</h4>
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                            <span style="color:#64748b;font-size:0.85rem;">Total</span>
                            <span style="font-weight:700;color:#1e293b;">${d.total || 0}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
                            <span style="color:#64748b;font-size:0.85rem;">Placed</span>
                            <span style="font-weight:700;color:#10b981;">${d.placed || 0}</span>
                        </div>
                        <div style="background:#e2e8f0;border-radius:10px;height:8px;overflow:hidden;">
                            <div style="background:linear-gradient(90deg,#10b981,#6366f1);height:100%;width:${d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0}%;border-radius:10px;"></div>
                        </div>
                        <p style="text-align:right;font-size:0.8rem;color:#64748b;margin-top:6px;">${d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0}% placed</p>
                    </div>
                `).join('')}
            </div>`;
    } else if (currentStatsView === 'bar') {
        area.innerHTML = `<div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;"><h3 style="margin-bottom:20px;color:#1e293b;">${title}</h3><div style="position:relative;height:350px;"><canvas id="stats-chart"></canvas></div></div>`;
        setTimeout(() => {
            const ctx = document.getElementById('stats-chart');
            if (!ctx) return;
            statsChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels, datasets: [
                        { label: 'Total', data: totalData, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
                        { label: 'Placed', data: placedData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);
    } else if (currentStatsView === 'pie') {
        area.innerHTML = `<div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;"><h3 style="margin-bottom:20px;color:#1e293b;">${title}</h3><div style="position:relative;height:350px;display:flex;justify-content:center;"><canvas id="stats-chart"></canvas></div></div>`;
        setTimeout(() => {
            const ctx = document.getElementById('stats-chart');
            if (!ctx) return;
            statsChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data: placedData, backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'], borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }, 100);
    } else if (currentStatsView === 'table') {
        area.innerHTML = `
            <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;overflow-x:auto;">
                <h3 style="margin-bottom:20px;color:#1e293b;">${title}</h3>
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Total</th><th>Placed</th><th>Not Placed</th><th>%</th></tr></thead>
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

function renderYearStats(area) {
    const data = statsData.yearComparison;
    if (!data || !data.length) {
        area.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">No year comparison data yet.</p>';
        return;
    }
    if (currentStatsView === 'table' || currentStatsView === 'cards') {
        area.innerHTML = `
            <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;overflow-x:auto;">
                <h3 style="margin-bottom:20px;color:#1e293b;">Year-wise Comparison</h3>
                <table class="data-table">
                    <thead><tr><th>Year</th><th>Total Applications</th><th>Placed</th><th>%</th></tr></thead>
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
        area.innerHTML = `<div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;"><h3 style="margin-bottom:20px;color:#1e293b;">Year-wise Comparison</h3><div style="position:relative;height:350px;"><canvas id="stats-chart"></canvas></div></div>`;
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
async function loadReportInStats(area) {
    try {
        if (!area) area = document.getElementById('stats-display-area');
        reportData = await apiFetch('/placement-report');
        if (!reportData) return;

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

let reportData = null;

window.filterReportBranch = function () {
    if (!reportData) return;
    const branch = document.getElementById('report-branch')?.value || '';
    const filtered = branch
        ? reportData.companyStats.filter(c => c.branch === branch)
        : reportData.companyStats;
    renderReportBranchStats(reportData.branchStats, branch);
    renderReportCompanyTable(filtered);
};

window.sortReport = function () {
    if (!reportData) return;
    const sortBy = document.getElementById('report-sort')?.value;
    let sorted = [...reportData.companyStats];
    if (sortBy === 'ctc') sorted.sort((a, b) => (b.avg_ctc || 0) - (a.avg_ctc || 0));
    else if (sortBy === 'placed') sorted.sort((a, b) => (b.placed || 0) - (a.placed || 0));
    else sorted.sort((a, b) => a.company_name.localeCompare(b.company_name));
    renderReportCompanyTable(sorted);
};

function renderReportBranchStats(branchStats, selectedBranch) {
    const area = document.getElementById('report-branch-stats');
    if (!area) return;
    const filtered = selectedBranch ? branchStats.filter(b => b.branch === selectedBranch) : branchStats;
    if (!filtered.length) { area.innerHTML = ''; return; }
    area.innerHTML = filtered.map(b => `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <h3 style="color:#6366f1;font-size:1.1rem;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e0e7ff;">
                📚 Statistics for ${b.branch || 'Unknown'} Branch
            </h3>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
                <div style="background:#f0fdf4;;border:1px solid #dcfce7;border-radius:12px;padding:16px;text-align:center;">
                    <p style="font-size:0.78rem;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Total Placed</p>
                    <p style="font-size:1.8rem;font-weight:800;color:#10b981;">${b.total_placed || 0}</p>
                </div>
                <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;padding:16px;text-align:center;">
                    <p style="font-size:0.78rem;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Average CTC</p>
                    <p style="font-size:1.4rem;font-weight:800;color:#3b82f6;">₹${Number(b.avg_ctc || 0).toLocaleString('en-IN')}</p>
                </div>
                <div style="background:#fdf4ff;border:1px solid #fce7f3;border-radius:12px;padding:16px;text-align:center;">
                    <p style="font-size:0.78rem;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Maximum CTC</p>
                    <p style="font-size:1.4rem;font-weight:800;color:#8b5cf6;">₹${Number(b.max_ctc || 0).toLocaleString('en-IN')}</p>
                </div>
                <div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:16px;text-align:center;">
                    <p style="font-size:0.78rem;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Minimum CTC</p>
                    <p style="font-size:1.4rem;font-weight:800;color:#f59e0b;">₹${Number(b.min_ctc || 0).toLocaleString('en-IN')}</p>
                </div>
            </div>
        </div>`).join('');
}

function renderReportCompanyTable(companyStats) {
    const tbody = document.getElementById('report-company-body');
    if (!tbody) return;
    if (!companyStats || !companyStats.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:40px;">No placement data yet.</td></tr>';
        return;
    }
    tbody.innerHTML = companyStats.map((c, i) => `
        <tr>
            <td style="color:#64748b;font-size:0.85rem;text-align:center;width:50px;">${i + 1}</td>
            <td style="font-weight:600;font-size:0.95rem;">${c.company_name}</td>
            <td style="text-align:center;">
                <span style="background:rgba(16,185,129,0.1);color:#10b981;padding:5px 14px;border-radius:8px;font-weight:700;">${c.placed}</span>
            </td>
            <td style="font-weight:700;color:#6366f1;font-size:0.95rem;text-align:center;">
                ${c.avg_ctc ? '₹' + Number(c.avg_ctc).toLocaleString('en-IN') : 'N/A'}
            </td>
        </tr>`).join('');
}

// ================== UPCOMING COMPANIES ====================
async function loadStudentUpcoming() {
    const data = await apiFetch('/upcoming');
    if (!data) return;

    const grid = document.getElementById('student-upcoming-grid');
    if (!grid) return;

    if (!data.length) {
        grid.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:40px;">No upcoming companies scheduled yet. Check back later!</p>';
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
            <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:10px; padding:12px;">
                <p style="font-size:0.82rem; color:#92400e; font-weight:600; margin-bottom:4px;">
                    <i class="fas fa-lightbulb"></i> Preparation Tips:
                </p>
                <p style="font-size:0.85rem; color:#78350f;">${c.description}</p>
            </div>` : ''}
        </div>`;
    }).join('');
}
// ================== THEME TOGGLE ====================
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            themeToggleBtn.innerHTML = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggleBtn.innerHTML = '☀️';
            localStorage.setItem('theme', 'dark');
        }
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '☀️';
    }
}
