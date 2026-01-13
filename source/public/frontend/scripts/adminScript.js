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
    syncResourceCounts
} from '../api/adminApi.js';

// State management
let allCourses = [];
let allResources = [];
let pendingResources = [];
let currentEditCourse = null;
let currentEditResource = null;
let deleteTarget = null;

// DOM elements
const logoutBtn = document.getElementById('logout-btn');

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const coursesTab = document.getElementById('courses-tab');
const resourcesTab = document.getElementById('resources-tab');
const pendingTab = document.getElementById('pending-tab');

// Modals
const courseModal = document.getElementById('course-modal');
const resourceModal = document.getElementById('resource-modal');
const deleteModal = document.getElementById('delete-modal');

// Close buttons
const closeButtons = document.querySelectorAll('.close-btn');
const cancelButtons = document.querySelectorAll('.cancel-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDashboardData();
});

// Setup event listeners
function setupEventListeners() {
  // Logout
  logoutBtn.addEventListener('click', handleLogout);

  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Course actions
  document.getElementById('add-course-btn').addEventListener('click', () => openCourseModal());
  document.getElementById('course-form').addEventListener('submit', handleCourseSubmit);

  // Resource actions
  document.getElementById('add-resource-btn').addEventListener('click', () => openResourceModal());
  document.getElementById('resource-form').addEventListener('submit', handleResourceSubmit);

  // Delete confirmation
  document.getElementById('confirm-delete-btn').addEventListener('click', handleDelete);

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
    loadPendingResources()
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
  } catch (error) {
    console.error('Failed to load courses:', error);
    allCourses = [];
    renderCoursesTable();
  }
}

// Render courses table
function renderCoursesTable() {
  const tbody = document.getElementById('courses-table-body');
  
  if (allCourses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No courses found. Add your first course!</td></tr>';
    return;
  }

  tbody.innerHTML = allCourses.map(course => `
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
  const select = document.getElementById('resource-course-filter');
  const courseCodeSelect = document.getElementById('resource-course-code');
  
  const options = allCourses.map(course => 
    `<option value="${course.courseCode}">${course.courseCode} - ${course.courseName}</option>`
  ).join('');
  
  select.innerHTML = '<option value="">All Courses</option>' + options;
  courseCodeSelect.innerHTML = '<option value="">Select Course</option>' + options;

  // Add filter listener
  select.addEventListener('change', filterResources);
}

// Filter resources
function filterResources() {
  const selectedCourse = document.getElementById('resource-course-filter').value;
  
  if (selectedCourse) {
    const filtered = allResources.filter(r => r.courseCode === selectedCourse);
    renderResourcesTable(filtered);
  } else {
    renderResourcesTable(allResources);
  }
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
          <button class="btn-icon btn-success" onclick="approveSubmission('${resource._id}')">Approve</button>
          <button class="btn-icon btn-delete" onclick="rejectSubmission('${resource._id}')">Reject</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Update pending count badge
function updatePendingCount() {
  const badge = document.getElementById('pending-count');
  badge.textContent = pendingResources.length;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Approve submission
window.approveSubmission = async function(resourceId) {
  try {
    await approveResource(resourceId);
    await syncResourceCounts();
    showSuccessMessage('Resource approved successfully!');
    await loadDashboardData();
  } catch (error) {
    console.error('Error approving submission:', error);
    showErrorMessage(error.message || 'Failed to approve submission');
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

// Switch tabs
function switchTab(tabName) {
  tabButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
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
}

// Course Modal Functions
function openCourseModal(courseId = null) {
  currentEditCourse = courseId;
  const modal = document.getElementById('course-modal');
  const title = document.getElementById('course-modal-title');
  const form = document.getElementById('course-form');
  
  form.reset();
  form.querySelector('.form-error').textContent = '';
  
  if (courseId) {
    title.textContent = 'Edit Course';
    const course = allCourses.find(c => c._id === courseId);
    if (course) {
      document.getElementById('course-id').value = course._id;
      document.getElementById('course-code').value = course.courseCode;
      document.getElementById('course-name').value = course.courseName;
      document.getElementById('course-college').value = course.college || '';
      document.getElementById('course-department').value = course.department || '';
    }
  } else {
    title.textContent = 'Add Course';
    document.getElementById('course-id').value = '';
  }
  
  modal.classList.add('active');
}

window.editCourse = openCourseModal;

// Handle course submit
async function handleCourseSubmit(e) {
  e.preventDefault();
  const formError = e.target.querySelector('.form-error');
  formError.textContent = '';

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

  try {
    if (courseId) {
      await updateCourse(courseId, courseData);
    } else {
      await createCourse(courseData);
    }

    closeAllModals();
    await loadCourses();
  } catch (error) {
    formError.textContent = error.message || 'Failed to save course. Please try again.';
    console.error('Course submit error:', error);
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
  
  form.reset();
  form.querySelector('.form-error').textContent = '';
  
  if (resourceId) {
    title.textContent = 'Edit Resource';
    const resource = allResources.find(r => r._id === resourceId);
    if (resource) {
      document.getElementById('resource-id').value = resource._id;
      document.getElementById('resource-course-code').value = resource.courseCode;
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

  try {
    if (resourceId) {
      await updateResource(resourceId, resourceData);
    } else {
      await createResource(resourceData);
    }

    await syncResourceCounts();
    closeAllModals();
    await loadResources();
    await loadCourses(); // Refresh to update resource counts
  } catch (error) {
    formError.textContent = error.message || 'Failed to save resource. Please try again.';
    console.error('Resource submit error:', error);
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

  try {
    if (deleteTarget.type === 'course') {
      await apiDeleteCourse(deleteTarget.id);
      await syncResourceCounts();
      closeAllModals();
      showSuccessMessage('Course deleted successfully');
      await loadCourses();
      await loadResources(); // Refresh resources as they might be deleted
    } else if (deleteTarget.type === 'pending') {
      await rejectResource(deleteTarget.id);
      await syncResourceCounts();
      closeAllModals();
      showSuccessMessage('Submission rejected successfully');
      await loadDashboardData();
    } else {
      await apiDeleteResource(deleteTarget.id);
      await syncResourceCounts();
      closeAllModals();
      showSuccessMessage('Resource deleted successfully');
      await loadResources();
      await loadCourses(); // Refresh to update resource counts
    }
  } catch (error) {
    closeAllModals();
    showErrorMessage(error.message || 'Failed to delete item. Please try again.');
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