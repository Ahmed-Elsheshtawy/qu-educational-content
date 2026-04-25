import { 
    logout,
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse as apiDeleteCourse,
    getResources,
    createResource,
    updateResource,
    deleteResource as apiDeleteResource,
    getPendingResources,
    approveResource,
    rejectResource,
    getPendingCourses,
    approveCourse,
    rejectCourse,
    syncResourceCounts
} from '../api/adminApi.js';

// Qatar University Colleges and Departments
const qatarUniversityData = {
    "College of Arts and Sciences": [
        "Arabic Language Department",
        "Biological & Environmental Sciences Department",
        "Chemistry & Earth Sciences Department",
        "English Literature and Linguistics Department",
        "Humanities Department",
        "International Affairs Department",
        "Mass Communication Department",
        "Mathematics and Statistics Department",
        "Physics and Material Sciences Department",
        "Social Sciences Department"
    ],
    "College of Business and Economics": [
        "Accounting and Information Systems Department",
        "Finance and Economics Department",
        "Management and Marketing Department"
    ],
    "College of Education": [
        "Educational Sciences Department",
        "Psychological Sciences Department",
        "Physical Education Department",
        "Art Education Department"
    ],
    "College of Engineering": [
        "Architecture and Urban Planning Department",
        "Chemical Engineering Department",
        "Civil and Environmental Engineering Department",
        "Computer Science & Engineering Department",
        "Electrical Engineering Department",
        "Mechanical and Industrial Engineering Department"
    ],
    "College of Health Sciences": [
        "Biomedical Sciences Department",
        "Public Health Department",
        "Physical Therapy & Rehabilitation Science Department",
        "Human Nutrition Department"
    ],
    "College of Law": [
        "Private Law Department",
        "Public Law Department",
        "Legal Skills Department"
    ],
    "College of Medicine": [
        "Basic Medical Sciences Department",
        "Population Medicine Department"
    ],
    "College of Pharmacy": [
        "Clinical Pharmacy and Pharmacy Practice Department",
        "Pharmacognosy Department",
        "Medicinal Chemistry Department",
        "Pharmacology Department",
        "Pharmacokinetics Department",
        "Pharmaceutics Department"
    ],
    "College of Sharia and Islamic Studies": [
        "Islamic Jurisprudence Department",
        "Islamic Culture & Preaching Department",
        "Foundations of Islam Department"
    ],
    "College of Nursing": [
        "Nursing Department"
    ],
    "College of Dental Medicine": [
        "Dental Medicine Department"
    ],
    "College of Sport Sciences": [
        "Sports Coaching Department",
        "Sports Management Department"
    ]
};

// State management
let allCourses = [];
let allResources = [];
let pendingResources = [];
let pendingCourses = [];
let currentEditCourse = null;
let currentEditResource = null;
let deleteTarget = null;

console.log('📋 Declaring DOM element variables...');

// DOM elements - will be initialized in DOMContentLoaded
let logoutBtn;
let tabButtons;
let coursesTab;
let resourcesTab;
let pendingTab;
let courseModal;
let resourceModal;
let deleteModal;
let pendingEditModal;
let closeButtons;
let cancelButtons;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM elements
  logoutBtn = document.getElementById('logout-btn');
  tabButtons = document.querySelectorAll('.tab-btn');
  coursesTab = document.getElementById('courses-tab');
  resourcesTab = document.getElementById('resources-tab');
  pendingTab = document.getElementById('pending-tab');
  courseModal = document.getElementById('course-modal');
  resourceModal = document.getElementById('resource-modal');
  deleteModal = document.getElementById('delete-modal');
  pendingEditModal = document.getElementById('pending-edit-modal');
  closeButtons = document.querySelectorAll('.close-btn');
  cancelButtons = document.querySelectorAll('.cancel-btn');
  
  setupEventListeners();
  loadDashboardData();
  
  // Initialize tab from URL
  const initialTab = getTabFromURL();
  if (initialTab) {
    switchTab(initialTab, false); // false = don't update URL since we're loading from it
  }
  
  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const tab = getTabFromURL();
    if (tab) {
      switchTab(tab, false);
    }
  });
});

// Setup event listeners
function setupEventListeners() {
  // Home button
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Tabs
  if (tabButtons.length > 0) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab, true)); // true = update URL
    });
  }

  // Sub-tabs for pending section
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');
  if (subTabButtons.length > 0) {
    subTabButtons.forEach(btn => {
      btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab));
    });
  }

  // Course actions
  document.getElementById('add-course-btn').addEventListener('click', () => openCourseModal());
  document.getElementById('course-form').addEventListener('submit', handleCourseSubmit);
  
  // Course form college/department cascading
  const courseCollegeSelect = document.getElementById('course-college');
  const courseDepartmentSelect = document.getElementById('course-department');
  if (courseCollegeSelect && courseDepartmentSelect) {
    courseCollegeSelect.addEventListener('change', handleCourseFormCollegeChange);
  }

  // Resource actions
  document.getElementById('add-resource-btn').addEventListener('click', () => openResourceModal());
  document.getElementById('resource-form').addEventListener('submit', handleResourceSubmit);

  // Delete confirmation
  document.getElementById('confirm-delete-btn').addEventListener('click', handleDelete);

  // Pending edit actions
  document.getElementById('pending-edit-form').addEventListener('submit', handlePendingEditSubmit);
  document.getElementById('pending-approve-btn').addEventListener('click', handlePendingApprove);
  document.getElementById('pending-reject-btn').addEventListener('click', handlePendingReject);

  // Filter listeners
  setupFilterListeners();

  // Close modals
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  cancelButtons.forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  // Close modal on outside click - DISABLED
  // Uncomment below to enable closing modals by clicking outside
  /*
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
  */
  
  // Setup searchable course select
  setupSearchableCourseSelect();
}

// Setup searchable course select dropdown
function setupSearchableCourseSelect() {
  const searchInput = document.getElementById('resource-course-search');
  const dropdown = document.getElementById('resource-course-dropdown');
  const hiddenSelect = document.getElementById('resource-course-code');
  
  if (!searchInput || !dropdown || !hiddenSelect) {
    console.error('Searchable select elements not found');
    return;
  }
  
  console.log('Searchable select initialized');
  
  // Ensure input is editable
  searchInput.removeAttribute('readonly');
  searchInput.removeAttribute('disabled');
  
  let selectedValue = '';
  
  // Show dropdown on focus
  searchInput.addEventListener('focus', () => {
    console.log('Input focused, courses count:', allCourses.length);
    if (allCourses.length > 0) {
      renderCourseOptions(allCourses);
      dropdown.classList.add('show');
    }
  });
  
  // Show dropdown on click
  searchInput.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Input clicked');
    if (allCourses.length > 0) {
      renderCourseOptions(allCourses);
      dropdown.classList.add('show');
    }
  });
  
  // Filter courses on input
  searchInput.addEventListener('input', (e) => {
    console.log('Input event:', e.target.value);
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
      // Show all courses if search is empty
      renderCourseOptions(allCourses);
    } else {
      // Filter courses
      const filteredCourses = allCourses.filter(course => 
        course.courseCode.toLowerCase().includes(searchTerm) || 
        course.courseName.toLowerCase().includes(searchTerm)
      );
      renderCourseOptions(filteredCourses);
    }
    
    dropdown.classList.add('show');
  });
  
  // Also listen to keyup for additional debugging
  searchInput.addEventListener('keyup', (e) => {
    console.log('Key pressed:', e.key);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
  
  // Render course options
  function renderCourseOptions(courses) {
    if (!courses || courses.length === 0) {
      dropdown.innerHTML = '<div class="searchable-select-no-results">No courses found</div>';
      return;
    }
    
    dropdown.innerHTML = courses.map(course => `
      <div class="searchable-select-option" data-value="${course.courseCode}">
        <div class="course-code">${course.courseCode}</div>
        <div class="course-name">${course.courseName}</div>
      </div>
    `).join('');
    
    // Add click handlers to options
    dropdown.querySelectorAll('.searchable-select-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.dataset.value;
        const course = courses.find(c => c.courseCode === value);
        
        if (course) {
          searchInput.value = `${course.courseCode} - ${course.courseName}`;
          hiddenSelect.value = value;
          selectedValue = value;
          dropdown.classList.remove('show');
          
          // Mark as selected visually
          dropdown.querySelectorAll('.searchable-select-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          option.classList.add('selected');
        }
      });
    });
  }
}

// Handle logout
async function handleLogout() {
  try {
    await logout();
    // Redirect to login page
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Load dashboard data
async function loadDashboardData() {
  await Promise.all([
    loadCourses(),
    loadResources(),
    loadPendingResources(),
    loadPendingCourses()
  ]);
}

// Load courses
async function loadCourses() {
  try {
    const data = await getCourses();
    // API returns array directly
    allCourses = Array.isArray(data) ? data : (data.courses || []);
    renderCoursesTable();
    populateResourceCourseFilters();
    populateAllFilters();
  } catch (error) {
    console.error('Failed to load courses:', error);
    allCourses = [];
    renderCoursesTable();
  }
}

// Render courses table
function renderCoursesTable(courses = allCourses) {
  const tbody = document.getElementById('courses-table-body');
  
  if (courses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No courses found. Add your first course!</td></tr>';
    return;
  }

  tbody.innerHTML = courses.map(course => `
    <tr>
      <td>${course.courseCode}</td>
      <td>${course.courseName}</td>
      <td>${course.college || 'N/A'}</td>
      <td>${course.department || 'N/A'}</td>
      <td>${course.resourceCount || 0}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit" onclick="editCourse('${course._id}')">Edit</button>
          <button class="btn-icon btn-delete" onclick="deleteCourse('${course._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Load resources
async function loadResources() {
  try {
    const data = await getResources();
    // API returns array directly
    allResources = Array.isArray(data) ? data : (data.resources || []);
    renderResourcesTable(allResources);
  } catch (error) {
    console.error('Failed to load resources:', error);
    allResources = [];
    renderResourcesTable(allResources);
  }
}

// Render resources table
function renderResourcesTable(resources) {
  const tbody = document.getElementById('resources-table-body');
  
  if (resources.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No resources found. Add your first resource!</td></tr>';
    return;
  }

  tbody.innerHTML = resources.map(resource => `
    <tr>
      <td>${resource.title}</td>
      <td>${resource.courseCode}</td>
      <td>${formatResourceType(resource.type)}</td>
      <td>${resource.year || 'N/A'}</td>
      <td>${resource.downloads || 0}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit" onclick="editResource('${resource._id}')">Edit</button>
          <button class="btn-icon btn-delete" onclick="deleteResource('${resource._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Format resource type
function formatResourceType(type) {
  const types = {
    'exam': 'Exam',
    'lecture-notes': 'Lecture Notes',
    'assignment': 'Assignment',
    'solution': 'Solution',
    'other': 'Other'
  };
  return types[type] || type;
}

// Populate resource course filter
function populateResourceCourseFilters() {
  const resourceCourseCodeSelect = document.getElementById('resource-course-code');
  
  const options = allCourses.map(course => 
    `<option value="${course.courseCode}">${course.courseCode} - ${course.courseName}</option>`
  ).join('');
  
  resourceCourseCodeSelect.innerHTML = '<option value="">Select Course</option>' + options;
}

// Setup filter listeners
function setupFilterListeners() {
  // Courses filters
  const coursesCollegeFilter = document.getElementById('courses-college-filter');
  const coursesDepartmentFilter = document.getElementById('courses-department-filter');
  const coursesResetBtn = document.getElementById('courses-reset-filter');
  
  coursesCollegeFilter.addEventListener('change', handleCoursesCollegeChange);
  coursesDepartmentFilter.addEventListener('change', filterCourses);
  coursesResetBtn.addEventListener('click', resetCoursesFilters);

  // Resources filters
  const resourcesCollegeFilter = document.getElementById('resources-college-filter');
  const resourcesDepartmentFilter = document.getElementById('resources-department-filter');
  const resourcesCourseFilter = document.getElementById('resource-course-filter');
  const resourcesResetBtn = document.getElementById('resources-reset-filter');
  
  resourcesCollegeFilter.addEventListener('change', handleResourcesCollegeChange);
  resourcesDepartmentFilter.addEventListener('change', handleResourcesDepartmentChange);
  resourcesCourseFilter.addEventListener('change', filterResources);
  resourcesResetBtn.addEventListener('click', resetResourcesFilters);

  // Pending filters
  const pendingCollegeFilter = document.getElementById('pending-college-filter');
  const pendingDepartmentFilter = document.getElementById('pending-department-filter');
  const pendingCourseFilter = document.getElementById('pending-course-filter');
  const pendingResetBtn = document.getElementById('pending-reset-filter');
  
  pendingCollegeFilter.addEventListener('change', handlePendingCollegeChange);
  pendingDepartmentFilter.addEventListener('change', handlePendingDepartmentChange);
  pendingCourseFilter.addEventListener('change', filterPendingResources);
  pendingResetBtn.addEventListener('click', resetPendingFilters);

  // Pending Courses filters
  const pendingCoursesCollegeFilter = document.getElementById('pending-courses-college-filter');
  const pendingCoursesDepartmentFilter = document.getElementById('pending-courses-department-filter');
  const pendingCoursesResetBtn = document.getElementById('pending-courses-reset-filter');
  
  if (pendingCoursesCollegeFilter) {
    pendingCoursesCollegeFilter.addEventListener('change', handlePendingCoursesCollegeChange);
  }
  if (pendingCoursesDepartmentFilter) {
    pendingCoursesDepartmentFilter.addEventListener('change', filterPendingCourses);
  }
  if (pendingCoursesResetBtn) {
    pendingCoursesResetBtn.addEventListener('click', resetPendingCoursesFilters);
  }
}

// Populate all filters
function populateAllFilters() {
  const colleges = Object.keys(qatarUniversityData).sort();
  
  // Courses filters
  const coursesCollegeFilter = document.getElementById('courses-college-filter');
  coursesCollegeFilter.innerHTML = '<option value="">All Colleges</option>' + 
    colleges.map(c => `<option value="${c}">${c}</option>`).join('');
  
  // Resources filters
  const resourcesCollegeFilter = document.getElementById('resources-college-filter');
  resourcesCollegeFilter.innerHTML = '<option value="">All Colleges</option>' + 
    colleges.map(c => `<option value="${c}">${c}</option>`).join('');
  
  // Pending filters
  const pendingCollegeFilter = document.getElementById('pending-college-filter');
  pendingCollegeFilter.innerHTML = '<option value="">All Colleges</option>' + 
    colleges.map(c => `<option value="${c}">${c}</option>`).join('');
  
  // Pending courses college filter
  const pendingCoursesCollegeFilter = document.getElementById('pending-courses-college-filter');
  if (pendingCoursesCollegeFilter) {
    pendingCoursesCollegeFilter.innerHTML = '<option value="">All Colleges</option>' + 
      colleges.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  
  // Course form modal college select
  populateCourseFormCollege();
}

// Populate college dropdown in course form modal
function populateCourseFormCollege() {
  const colleges = Object.keys(qatarUniversityData).sort();
  const collegeSelect = document.getElementById('course-college');
  if (collegeSelect) {
    collegeSelect.innerHTML = '<option value="">Select College</option>' + 
      colleges.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

// COURSES FILTERS
function handleCoursesCollegeChange() {
  const college = document.getElementById('courses-college-filter').value;
  const departmentFilter = document.getElementById('courses-department-filter');
  
  if (!college) {
    departmentFilter.disabled = true;
    departmentFilter.innerHTML = '<option value="">Select a college first</option>';
    filterCourses();
    return;
  }
  
  const departments = qatarUniversityData[college] || [];
  
  departmentFilter.innerHTML = '<option value="">All Departments</option>' + 
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
  departmentFilter.disabled = false;
  
  filterCourses();
}

function filterCourses() {
  const college = document.getElementById('courses-college-filter').value;
  const department = document.getElementById('courses-department-filter').value;
  
  let filtered = [...allCourses];
  
  if (college) {
    filtered = filtered.filter(c => c.college === college);
  }
  
  if (department) {
    filtered = filtered.filter(c => c.department === department);
  }
  
  renderCoursesTable(filtered);
}

function resetCoursesFilters() {
  document.getElementById('courses-college-filter').value = '';
  document.getElementById('courses-department-filter').value = '';
  document.getElementById('courses-department-filter').disabled = true;
  document.getElementById('courses-department-filter').innerHTML = '<option value="">Select a college first</option>';
  renderCoursesTable(allCourses);
}

// RESOURCES FILTERS
function handleResourcesCollegeChange() {
  const college = document.getElementById('resources-college-filter').value;
  const departmentFilter = document.getElementById('resources-department-filter');
  const courseFilter = document.getElementById('resource-course-filter');
  
  if (!college) {
    departmentFilter.disabled = true;
    departmentFilter.innerHTML = '<option value="">Select a college first</option>';
    courseFilter.disabled = true;
    courseFilter.innerHTML = '<option value="">Select a department first</option>';
    filterResources();
    return;
  }
  
  const departments = qatarUniversityData[college] || [];
  
  departmentFilter.innerHTML = '<option value="">All Departments</option>' + 
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
  departmentFilter.disabled = false;
  
  courseFilter.disabled = true;
  courseFilter.innerHTML = '<option value="">Select a department first</option>';
  
  filterResources();
}

function handleResourcesDepartmentChange() {
  const college = document.getElementById('resources-college-filter').value;
  const department = document.getElementById('resources-department-filter').value;
  const courseFilter = document.getElementById('resource-course-filter');
  
  if (!department) {
    courseFilter.disabled = true;
    courseFilter.innerHTML = '<option value="">Select a department first</option>';
    filterResources();
    return;
  }
  
  const courses = allCourses
    .filter(c => c.college === college && c.department === department)
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  
  courseFilter.innerHTML = '<option value="">All Courses</option>' + 
    courses.map(c => `<option value="${c.courseCode}">${c.courseCode} - ${c.courseName}</option>`).join('');
  courseFilter.disabled = false;
  
  filterResources();
}

// Filter resources
function filterResources() {
  const college = document.getElementById('resources-college-filter').value;
  const department = document.getElementById('resources-department-filter').value;
  const courseCode = document.getElementById('resource-course-filter').value;
  
  let filtered = [...allResources];
  
  if (college) {
    const collegeCourses = allCourses.filter(c => c.college === college).map(c => c.courseCode);
    filtered = filtered.filter(r => collegeCourses.includes(r.courseCode));
  }
  
  if (department) {
    const deptCourses = allCourses.filter(c => c.department === department).map(c => c.courseCode);
    filtered = filtered.filter(r => deptCourses.includes(r.courseCode));
  }
  
  if (courseCode) {
    filtered = filtered.filter(r => r.courseCode === courseCode);
  }
  
  renderResourcesTable(filtered);
}

function resetResourcesFilters() {
  document.getElementById('resources-college-filter').value = '';
  document.getElementById('resources-department-filter').value = '';
  document.getElementById('resource-course-filter').value = '';
  document.getElementById('resources-department-filter').disabled = true;
  document.getElementById('resources-department-filter').innerHTML = '<option value="">Select a college first</option>';
  document.getElementById('resource-course-filter').disabled = true;
  document.getElementById('resource-course-filter').innerHTML = '<option value="">Select a department first</option>';
  renderResourcesTable(allResources);
}

// PENDING FILTERS
function handlePendingCollegeChange() {
  const college = document.getElementById('pending-college-filter').value;
  const departmentFilter = document.getElementById('pending-department-filter');
  const courseFilter = document.getElementById('pending-course-filter');
  
  if (!college) {
    departmentFilter.disabled = true;
    departmentFilter.innerHTML = '<option value="">Select a college first</option>';
    courseFilter.disabled = true;
    courseFilter.innerHTML = '<option value="">Select a department first</option>';
    filterPendingResources();
    return;
  }
  
  const departments = qatarUniversityData[college] || [];
  
  departmentFilter.innerHTML = '<option value="">All Departments</option>' + 
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
  departmentFilter.disabled = false;
  
  courseFilter.disabled = true;
  courseFilter.innerHTML = '<option value="">Select a department first</option>';
  
  filterPendingResources();
}

function handlePendingDepartmentChange() {
  const college = document.getElementById('pending-college-filter').value;
  const department = document.getElementById('pending-department-filter').value;
  const courseFilter = document.getElementById('pending-course-filter');
  
  if (!department) {
    courseFilter.disabled = true;
    courseFilter.innerHTML = '<option value="">Select a department first</option>';
    filterPendingResources();
    return;
  }
  
  const courses = allCourses
    .filter(c => c.college === college && c.department === department)
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  
  courseFilter.innerHTML = '<option value="">All Courses</option>' + 
    courses.map(c => `<option value="${c.courseCode}">${c.courseCode} - ${c.courseName}</option>`).join('');
  courseFilter.disabled = false;
  
  filterPendingResources();
}

function filterPendingResources() {
  const college = document.getElementById('pending-college-filter').value;
  const department = document.getElementById('pending-department-filter').value;
  const courseCode = document.getElementById('pending-course-filter').value;
  
  let filtered = [...pendingResources];
  
  if (college) {
    const collegeCourses = allCourses.filter(c => c.college === college).map(c => c.courseCode);
    filtered = filtered.filter(r => collegeCourses.includes(r.courseCode));
  }
  
  if (department) {
    const deptCourses = allCourses.filter(c => c.department === department).map(c => c.courseCode);
    filtered = filtered.filter(r => deptCourses.includes(r.courseCode));
  }
  
  if (courseCode) {
    filtered = filtered.filter(r => r.courseCode === courseCode);
  }
  
  renderPendingTable(filtered);
}

function resetPendingFilters() {
  document.getElementById('pending-college-filter').value = '';
  document.getElementById('pending-department-filter').value = '';
  document.getElementById('pending-course-filter').value = '';
  document.getElementById('pending-department-filter').disabled = true;
  document.getElementById('pending-department-filter').innerHTML = '<option value="">Select a college first</option>';
  document.getElementById('pending-course-filter').disabled = true;
  document.getElementById('pending-course-filter').innerHTML = '<option value="">Select a department first</option>';
  renderPendingTable(pendingResources);
}

// PENDING COURSES FILTERS
function handlePendingCoursesCollegeChange() {
  const college = document.getElementById('pending-courses-college-filter').value;
  const departmentFilter = document.getElementById('pending-courses-department-filter');
  
  if (!college) {
    departmentFilter.disabled = true;
    departmentFilter.innerHTML = '<option value="">Select a college first</option>';
    filterPendingCourses();
    return;
  }
  
  const departments = qatarUniversityData[college] || [];
  
  departmentFilter.innerHTML = '<option value="">All Departments</option>' + 
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
  departmentFilter.disabled = false;
  
  filterPendingCourses();
}

function filterPendingCourses() {
  const college = document.getElementById('pending-courses-college-filter').value;
  const department = document.getElementById('pending-courses-department-filter').value;
  
  let filtered = [...pendingCourses];
  
  if (college) {
    filtered = filtered.filter(c => c.college === college);
  }
  
  if (department) {
    filtered = filtered.filter(c => c.department === department);
  }
  
  renderPendingCoursesTable(filtered);
}

function resetPendingCoursesFilters() {
  document.getElementById('pending-courses-college-filter').value = '';
  document.getElementById('pending-courses-department-filter').value = '';
  document.getElementById('pending-courses-department-filter').disabled = true;
  document.getElementById('pending-courses-department-filter').innerHTML = '<option value="">Select a college first</option>';
  renderPendingCoursesTable();
}

// Load pending resources
async function loadPendingResources() {
  try {
    const data = await getPendingResources();
    pendingResources = Array.isArray(data) ? data : (data.resources || []);
    renderPendingTable();
    updatePendingCount();
  } catch (error) {
    console.error('Failed to load pending resources:', error);
    pendingResources = [];
    renderPendingTable();
    updatePendingCount();
  }
}

// Render pending submissions table
function renderPendingTable() {
  const tbody = document.getElementById('pending-table-body');
  
  if (pendingResources.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending submissions</td></tr>';
    return;
  }

  tbody.innerHTML = pendingResources.map(resource => `
    <tr>
      <td>${resource.title}</td>
      <td>${resource.courseCode}</td>
      <td>${formatResourceType(resource.type)}</td>
      <td>${resource.year || 'N/A'}</td>
      <td>${formatDate(resource.uploadDate)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit" onclick="editPendingSubmission('${resource._id}')">Edit</button>
          <button class="btn-icon btn-success" onclick="approveSubmission('${resource._id}')">Approve</button>
          <button class="btn-icon btn-delete" onclick="rejectSubmission('${resource._id}')">Reject</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Approve submission
window.approveSubmission = async function(resourceId) {
  // Find the button that was clicked
  const button = event.target;
  const originalText = button.innerHTML;
  
  // Disable button and show loading state
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Approving...';
  button.classList.add('loading');
  
  try {
    await approveResource(resourceId);
    await syncResourceCounts();
    
    // Show success state
    button.innerHTML = '✓ Approved';
    button.classList.remove('loading');
    button.classList.add('success-state');
    
    showSuccessMessage('Resource approved successfully!');
    
    // Reload data after a short delay to show success state
    setTimeout(async () => {
      await loadDashboardData();
    }, 800);
  } catch (error) {
    console.error('Error approving submission:', error);
    showErrorMessage(error.message || 'Failed to approve submission');
    
    // Reset button on error
    button.disabled = false;
    button.innerHTML = originalText;
    button.classList.remove('loading');
  }
};

// Reject submission
window.rejectSubmission = async function(resourceId) {
  const resource = pendingResources.find(r => r._id === resourceId);
  if (!resource) return;

  deleteTarget = { type: 'pending', id: resourceId };
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to reject "${resource.title}"? This will permanently delete it.`;
  document.getElementById('delete-modal').classList.add('active');
};

// Edit pending submission
function editPendingSubmission(resourceId) {
  const resource = pendingResources.find(r => r._id === resourceId);
  if (!resource) return;

  const modal = document.getElementById('pending-edit-modal');
  const form = document.getElementById('pending-edit-form');
  
  form.reset();
  form.querySelector('.form-error').textContent = '';
  
  // Populate form with resource data
  document.getElementById('pending-resource-id').value = resource._id;
  document.getElementById('pending-course-code').value = resource.courseCode;
  document.getElementById('pending-title').value = resource.title;
  document.getElementById('pending-type').value = resource.type;
  document.getElementById('pending-description').value = resource.description || '';
  document.getElementById('pending-year').value = resource.year || '';
  document.getElementById('pending-file-url').value = resource.fileUrl || '';
  document.getElementById('pending-file-name').value = resource.fileName || '';
  
  // Populate course dropdown
  const courseSelect = document.getElementById('pending-course-code');
  const options = allCourses.map(course => 
    `<option value="${course.courseCode}">${course.courseCode} - ${course.courseName}</option>`
  ).join('');
  courseSelect.innerHTML = '<option value="">Select Course</option>' + options;
  courseSelect.value = resource.courseCode;
  
  modal.classList.add('active');
}

window.editPendingSubmission = editPendingSubmission;

// Handle pending edit submit
async function handlePendingEditSubmit(e) {
  e.preventDefault();
  const formError = e.target.querySelector('.form-error');
  formError.textContent = '';

  const resourceId = document.getElementById('pending-resource-id').value;
  const resourceData = {
    courseCode: document.getElementById('pending-course-code').value,
    title: document.getElementById('pending-title').value,
    type: document.getElementById('pending-type').value,
    description: document.getElementById('pending-description').value,
    year: parseInt(document.getElementById('pending-year').value)
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
  submitBtn.classList.add('loading');

  try {
    await updateResource(resourceId, resourceData);
    
    // Show success state
    submitBtn.innerHTML = '✓ Saved';
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success-state');
    
    showSuccessMessage('Pending submission updated successfully');
    
    setTimeout(async () => {
      await loadPendingResources();
      submitBtn.innerHTML = originalText;
      submitBtn.classList.remove('success-state');
      submitBtn.disabled = false;
    }, 800);
  } catch (error) {
    // Check if it's a "not modified" error
    if (error.message && error.message.includes('not modified')) {
      // Show info message
      showSuccessMessage('No changes were made to the submission');
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }, 800);
    } else {
      formError.textContent = error.message || 'Failed to update submission. Please try again.';
      console.error('Pending edit error:', error);
      
      // Reset button on error
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      submitBtn.classList.remove('loading');
    }
  }
}

// Handle approve from edit modal
async function handlePendingApprove() {
  const resourceId = document.getElementById('pending-resource-id').value;
  if (!resourceId) return;

  const button = document.getElementById('pending-approve-btn');
  const originalText = button.innerHTML;
  
  // Disable button and show loading state
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Approving...';
  button.classList.add('loading');

  try {
    await approveResource(resourceId);
    await syncResourceCounts();
    
    // Show success state
    button.innerHTML = '✓ Approved';
    button.classList.remove('loading');
    button.classList.add('success-state');
    
    showSuccessMessage('Resource approved successfully!');
    
    // Close modal and reload after delay
    setTimeout(async () => {
      closeAllModals();
      await loadDashboardData();
    }, 800);
  } catch (error) {
    console.error('Error approving submission:', error);
    showErrorMessage(error.message || 'Failed to approve submission');
    
    // Reset button on error
    button.disabled = false;
    button.innerHTML = originalText;
    button.classList.remove('loading');
  }
}

// Handle reject from edit modal
async function handlePendingReject() {
  const resourceId = document.getElementById('pending-resource-id').value;
  const resource = pendingResources.find(r => r._id === resourceId);
  if (!resource) return;

  closeAllModals();
  
  deleteTarget = { type: 'pending', id: resourceId };
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to reject "${resource.title}"? This will permanently delete it.`;
  document.getElementById('delete-modal').classList.add('active');
}

// ==================== PENDING COURSES FUNCTIONS ====================

// Load pending courses
async function loadPendingCourses() {
  try {
    const data = await getPendingCourses();
    pendingCourses = Array.isArray(data) ? data : (data.courses || []);
    renderPendingCoursesTable();
    updatePendingCount();
  } catch (error) {
    console.error('Failed to load pending courses:', error);
    pendingCourses = [];
    renderPendingCoursesTable();
    updatePendingCount();
  }
}

// Render pending courses table
function renderPendingCoursesTable(courses = pendingCourses) {
  const tbody = document.getElementById('pending-courses-table-body');
  
  if (courses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No pending course requests</td></tr>';
    return;
  }

  tbody.innerHTML = courses.map(course => `
    <tr>
      <td>${course.courseCode}</td>
      <td>${course.courseName}</td>
      <td>${course.college || 'N/A'}</td>
      <td>${course.department || 'N/A'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit" onclick="editPendingCourse('${course._id}')">Edit</button>
          <button class="btn-icon btn-success" onclick="approvePendingCourse('${course._id}')">Approve</button>
          <button class="btn-icon btn-delete" onclick="rejectPendingCourse('${course._id}')">Reject</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Update pending count badge (includes both courses and resources)
function updatePendingCount() {
  const badge = document.getElementById('pending-count');
  const totalPending = pendingResources.length + pendingCourses.length;
  badge.textContent = totalPending;
  
  // Add pulsing animation when there are pending items
  if (totalPending > 0) {
    badge.setAttribute('data-has-pending', 'true');
  } else {
    badge.removeAttribute('data-has-pending');
  }
}

// Edit pending course - opens the course modal with data
window.editPendingCourse = function(courseId) {
  const course = pendingCourses.find(c => c._id === courseId);
  if (!course) return;

  // Use the existing course modal
  const modal = document.getElementById('course-modal');
  const title = document.getElementById('course-modal-title');
  const form = document.getElementById('course-form');
  
  form.reset();
  form.querySelector('.form-error').textContent = '';
  
  title.textContent = 'Edit Pending Course';
  document.getElementById('course-id').value = course._id;
  document.getElementById('course-code').value = course.courseCode;
  document.getElementById('course-name').value = course.courseName;
  document.getElementById('course-college').value = course.college || '';
  document.getElementById('course-department').value = course.department || '';
  
  // Set a flag to know we're editing a pending course
  currentEditCourse = courseId;
  form.dataset.isPending = 'true';
  
  modal.classList.add('active');
};

// Approve pending course
window.approvePendingCourse = async function(courseId) {
  const button = event.target;
  const originalText = button.innerHTML;
  
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Approving...';
  button.classList.add('loading');
  
  try {
    await approveCourse(courseId);
    
    button.innerHTML = '✓ Approved';
    button.classList.remove('loading');
    button.classList.add('success-state');
    
    showSuccessMessage('Course approved successfully!');
    
    setTimeout(async () => {
      await loadDashboardData();
    }, 800);
  } catch (error) {
    console.error('Error approving course:', error);
    showErrorMessage(error.message || 'Failed to approve course');
    
    button.disabled = false;
    button.innerHTML = originalText;
    button.classList.remove('loading');
  }
};

// Reject pending course
window.rejectPendingCourse = async function(courseId) {
  const course = pendingCourses.find(c => c._id === courseId);
  if (!course) return;

  deleteTarget = { type: 'pending-course', id: courseId };
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to reject course "${course.courseCode} - ${course.courseName}"? This will permanently delete it.`;
  document.getElementById('delete-modal').classList.add('active');
};

// Get tab name from URL hash
function getTabFromURL() {
  const hash = window.location.hash.substring(1); // Remove the '#'
  const validTabs = ['courses', 'resources', 'pending'];
  return validTabs.includes(hash) ? hash : 'courses'; // Default to courses
}

// Switch tabs
function switchTab(tabName, updateURL = true) {
  try {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
    
    coursesTab.classList.remove('active');
    resourcesTab.classList.remove('active');
    pendingTab.classList.remove('active');
    
    if (tabName === 'courses') {
      coursesTab.classList.add('active');
    } else if (tabName === 'resources') {
      resourcesTab.classList.add('active');
    } else if (tabName === 'pending') {
      pendingTab.classList.add('active');
    }
    
    // Update URL hash if requested
    if (updateURL && window.location.hash !== '#' + tabName) {
      window.location.hash = tabName;
    }
  } catch (error) {
    console.error('Error switching tab:', error);
  }
}

// Switch sub-tabs (for pending section)
function switchSubTab(subTabName) {
  try {
    const subTabButtons = document.querySelectorAll('.sub-tab-btn');
    const subTabContents = document.querySelectorAll('.sub-tab-content');
    
    subTabButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`[data-subtab="${subTabName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
    
    subTabContents.forEach(content => content.classList.remove('active'));
    
    const activeContent = document.getElementById(`${subTabName}-section`);
    if (activeContent) {
      activeContent.classList.add('active');
    }
  } catch (error) {
    console.error('Error switching sub-tab:', error);
  }
}

// Course Form College Change Handler
function handleCourseFormCollegeChange() {
  const college = document.getElementById('course-college').value;
  const departmentSelect = document.getElementById('course-department');
  
  if (!college) {
    departmentSelect.innerHTML = '<option value="">Select College First</option>';
    departmentSelect.disabled = true;
    return;
  }
  
  const departments = qatarUniversityData[college] || [];
  departmentSelect.innerHTML = '<option value="">Select Department</option>' + 
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
  departmentSelect.disabled = false;
}

// Course Modal Functions
function openCourseModal(courseId = null) {
  currentEditCourse = courseId;
  const modal = document.getElementById('course-modal');
  const title = document.getElementById('course-modal-title');
  const form = document.getElementById('course-form');
  const collegeSelect = document.getElementById('course-college');
  const departmentSelect = document.getElementById('course-department');
  
  form.reset();
  form.querySelector('.form-error').textContent = '';
  
  if (courseId) {
    title.textContent = 'Edit Course';
    const course = allCourses.find(c => c._id === courseId);
    if (course) {
      document.getElementById('course-id').value = course._id;
      document.getElementById('course-code').value = course.courseCode;
      document.getElementById('course-name').value = course.courseName;
      collegeSelect.value = course.college || '';
      
      // Trigger college change to populate departments
      handleCourseFormCollegeChange();
      
      // Set department after departments are populated
      departmentSelect.value = course.department || '';
    }
  } else {
    title.textContent = 'Add Course';
    document.getElementById('course-id').value = '';
    collegeSelect.value = '';
    departmentSelect.innerHTML = '<option value="">Select College First</option>';
    departmentSelect.disabled = true;
  }
  
  modal.classList.add('active');
}

window.editCourse = openCourseModal;

// Handle course submit
async function handleCourseSubmit(e) {
  e.preventDefault();
  const formError = e.target.querySelector('.form-error');
  formError.textContent = '';

  const form = e.target;
  const isPending = form.dataset.isPending === 'true';
  const courseId = document.getElementById('course-id').value;
  const courseData = {
    courseCode: document.getElementById('course-code').value,
    courseName: document.getElementById('course-name').value,
    college: document.getElementById('course-college').value,
    department: document.getElementById('course-department').value
  };

  // Check for duplicates only when adding a new course (not editing)
  if (!courseId) {
    const duplicateCode = allCourses.find(c => 
      c.courseCode.toLowerCase() === courseData.courseCode.toLowerCase()
    );
    
    if (duplicateCode) {
      formError.textContent = `A course with code "${courseData.courseCode}" already exists.`;
      return;
    }

    const duplicateName = allCourses.find(c => 
      c.courseName.toLowerCase() === courseData.courseName.toLowerCase()
    );
    
    if (duplicateName) {
      formError.textContent = `A course with name "${courseData.courseName}" already exists.`;
      return;
    }
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
  submitBtn.classList.add('loading');

  try {
    if (courseId) {
      await updateCourse(courseId, courseData);
      showSuccessMessage(isPending ? 'Pending course updated successfully' : 'Course updated successfully');
    } else {
      await createCourse(courseData);
      showSuccessMessage('Course created successfully');
    }

    // Show success state
    submitBtn.innerHTML = '✓ Saved';
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success-state');
    
    setTimeout(async () => {
      closeAllModals();
      // If it was a pending course, reload both courses and pending courses
      if (isPending) {
        await loadDashboardData();
        delete form.dataset.isPending;
      } else {
        await loadCourses();
      }
      submitBtn.innerHTML = originalText;
      submitBtn.classList.remove('success-state');
      submitBtn.disabled = false;
    }, 800);
  } catch (error) {
    // Check if it's a "not modified" error
    if (error.message && error.message.includes('not modified')) {
      // Show info message and close modal
      showSuccessMessage('No changes were made to the course');
      setTimeout(() => {
        closeAllModals();
        delete form.dataset.isPending;
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }, 800);
    } else {
      formError.textContent = error.message || 'Failed to save course. Please try again.';
      console.error('Course submit error:', error);
      
      // Reset button on error
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      submitBtn.classList.remove('loading');
    }
  }
}

// Delete course
function deleteCourse(courseId) {
  const course = allCourses.find(c => c._id === courseId);
  if (!course) return;

  deleteTarget = { type: 'course', id: courseId };
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to delete "${course.courseName}"? This will also delete all associated resources.`;
  document.getElementById('delete-modal').classList.add('active');
}

window.deleteCourse = deleteCourse;

// Resource Modal Functions
function openResourceModal(resourceId = null) {
  currentEditResource = resourceId;
  const modal = document.getElementById('resource-modal');
  const title = document.getElementById('resource-modal-title');
  const form = document.getElementById('resource-form');
  const searchInput = document.getElementById('resource-course-search');
  const hiddenSelect = document.getElementById('resource-course-code');
  
  form.reset();
  form.querySelector('.form-error').textContent = '';
  searchInput.value = '';
  searchInput.removeAttribute('readonly');
  searchInput.removeAttribute('disabled');
  
  if (resourceId) {
    title.textContent = 'Edit Resource';
    const resource = allResources.find(r => r._id === resourceId);
    if (resource) {
      document.getElementById('resource-id').value = resource._id;
      
      // Set the course in both hidden select and search input
      hiddenSelect.value = resource.courseCode;
      const course = allCourses.find(c => c.courseCode === resource.courseCode);
      if (course) {
        searchInput.value = `${course.courseCode} - ${course.courseName}`;
      } else {
        searchInput.value = resource.courseCode;
      }
      
      document.getElementById('resource-title').value = resource.title;
      document.getElementById('resource-type').value = resource.type;
      document.getElementById('resource-description').value = resource.description || '';
      document.getElementById('resource-year').value = resource.year || '';
      document.getElementById('resource-file-url').value = resource.fileUrl || '';
      document.getElementById('resource-file-name').value = resource.fileName || '';
      document.getElementById('resource-tags').value = resource.tags ? resource.tags.join(', ') : '';
    }
  } else {
    title.textContent = 'Add Resource';
    document.getElementById('resource-id').value = '';
  }
  
  modal.classList.add('active');
}

window.editResource = openResourceModal;

// Handle resource submit
async function handleResourceSubmit(e) {
  e.preventDefault();
  const formError = e.target.querySelector('.form-error');
  formError.textContent = '';

  const resourceId = document.getElementById('resource-id').value;
  const tagsInput = document.getElementById('resource-tags').value;
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  const resourceData = {
    courseCode: document.getElementById('resource-course-code').value,
    title: document.getElementById('resource-title').value,
    type: document.getElementById('resource-type').value,
    description: document.getElementById('resource-description').value,
    year: parseInt(document.getElementById('resource-year').value),
    fileUrl: document.getElementById('resource-file-url').value,
    fileName: document.getElementById('resource-file-name').value,
    tags
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
  submitBtn.classList.add('loading');

  try {
    if (resourceId) {
      await updateResource(resourceId, resourceData);
      showSuccessMessage('Resource updated successfully');
    } else {
      await createResource(resourceData);
      showSuccessMessage('Resource created successfully');
    }

    await syncResourceCounts();
    
    // Show success state
    submitBtn.innerHTML = '✓ Saved';
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success-state');
    
    setTimeout(async () => {
      closeAllModals();
      await loadResources();
      await loadCourses();
      submitBtn.innerHTML = originalText;
      submitBtn.classList.remove('success-state');
      submitBtn.disabled = false;
    }, 800);
  } catch (error) {
    // Check if it's a "not modified" error
    if (error.message && error.message.includes('not modified')) {
      // Show info message and close modal
      showSuccessMessage('No changes were made to the resource');
      setTimeout(() => {
        closeAllModals();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }, 800);
    } else {
      formError.textContent = error.message || 'Failed to save resource. Please try again.';
      console.error('Resource submit error:', error);
      
      // Reset button on error
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      submitBtn.classList.remove('loading');
    }
  }
}

// Delete resource
function deleteResource(resourceId) {
  const resource = allResources.find(r => r._id === resourceId);
  if (!resource) return;

  deleteTarget = { type: 'resource', id: resourceId };
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to delete "${resource.title}"?`;
  document.getElementById('delete-modal').classList.add('active');
}

window.deleteResource = deleteResource;

// Handle delete confirmation
async function handleDelete() {
  if (!deleteTarget) return;

  const button = document.getElementById('confirm-delete-btn');
  const originalText = button.innerHTML;
  
  // Disable button and show loading state
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Deleting...';
  button.classList.add('loading');

  try {
    if (deleteTarget.type === 'course') {
      await apiDeleteCourse(deleteTarget.id);
      await syncResourceCounts();
      
      // Show success state
      button.innerHTML = '✓ Deleted';
      button.classList.remove('loading');
      button.classList.add('success-state');
      
      showSuccessMessage('Course deleted successfully');
      
      setTimeout(async () => {
        closeAllModals();
        await loadCourses();
        await loadResources();
        button.innerHTML = originalText;
        button.classList.remove('success-state');
        button.disabled = false;
      }, 800);
      
    } else if (deleteTarget.type === 'pending') {
      await rejectResource(deleteTarget.id);
      await syncResourceCounts();
      
      // Show success state
      button.innerHTML = '✓ Rejected';
      button.classList.remove('loading');
      button.classList.add('success-state');
      
      showSuccessMessage('Submission rejected successfully');
      
      setTimeout(async () => {
        closeAllModals();
        await loadDashboardData();
        button.innerHTML = originalText;
        button.classList.remove('success-state');
        button.disabled = false;
      }, 800);
      
    } else if (deleteTarget.type === 'pending-course') {
      await rejectCourse(deleteTarget.id);
      
      // Show success state
      button.innerHTML = '✓ Rejected';
      button.classList.remove('loading');
      button.classList.add('success-state');
      
      showSuccessMessage('Course request rejected successfully');
      
      setTimeout(async () => {
        closeAllModals();
        await loadDashboardData();
        button.innerHTML = originalText;
        button.classList.remove('success-state');
        button.disabled = false;
      }, 800);
      
    } else {
      await apiDeleteResource(deleteTarget.id);
      await syncResourceCounts();
      
      // Show success state
      button.innerHTML = '✓ Deleted';
      button.classList.remove('loading');
      button.classList.add('success-state');
      
      showSuccessMessage('Resource deleted successfully');
      
      setTimeout(async () => {
        closeAllModals();
        await loadResources();
        await loadCourses();
        button.innerHTML = originalText;
        button.classList.remove('success-state');
        button.disabled = false;
      }, 800);
    }
  } catch (error) {
    showErrorMessage(error.message || 'Failed to delete item. Please try again.');
    
    // Reset button on error
    button.disabled = false;
    button.innerHTML = originalText;
    button.classList.remove('loading');
    console.error('Delete error:', error);
  }

  deleteTarget = null;
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
  currentEditCourse = null;
  currentEditResource = null;
  deleteTarget = null;
}

// Show success message with toast
function showSuccessMessage(message) {
  showToast(message, 'success');
}

// Show error message with toast
function showErrorMessage(message) {
  showToast(message, 'error');
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Show toast with animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}