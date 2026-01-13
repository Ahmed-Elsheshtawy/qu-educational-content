import { getCourseByCourseCode } from '../api/coursesApi.js';
import { getResourcesByCourseCode } from '../api/resourcesApi.js';

// Get course code from URL
const urlParams = new URLSearchParams(window.location.search);
const courseCode = urlParams.get('code');

// Check if course code exists
if (!courseCode) {
  window.location.href = '../index.html';
}

// Store all resources globally for filtering
let allResources = [];

// Load course details and resources
async function loadCourseDetails() {
  try {
    // Fetch course and resources data
    const [course, resources] = await Promise.all([
      getCourseByCourseCode(courseCode),
      getResourcesByCourseCode(courseCode)
    ]);

    if (!course) {
      alert('Course not found');
      window.location.href = '../index.html';
      return;
    }

    // Populate course information
    populateCourseInfo(course);

    // Store resources globally
    allResources = resources;

    // Populate filter dropdowns
    populateFilters(resources);

    // Display all resources
    displayResources(resources);

  } catch (error) {
    console.error('Error loading course details:', error);
    alert('Failed to load course details');
  }
}

// Populate course information
function populateCourseInfo(course) {
  // Update page title
  document.title = `${course.courseCode} - ${course.courseName}`;

  // Populate course header elements
  const courseCodeEl = document.getElementById('course-code');
  const courseNameEl = document.getElementById('course-name');
  const collegeEl = document.getElementById('course-college');
  const departmentEl = document.getElementById('course-department');
  const resourceCountEl = document.getElementById('resource-count');

  if (courseCodeEl) courseCodeEl.textContent = course.courseCode;
  if (courseNameEl) courseNameEl.textContent = course.courseName;
  if (collegeEl) collegeEl.textContent = course.college || 'N/A';
  if (departmentEl) departmentEl.textContent = course.department || 'N/A';
  if (resourceCountEl) resourceCountEl.textContent = `${course.resourceCount || 0} Resources`;

  // Setup "Add Resource" button
  const addResourceBtn = document.getElementById('add-resource-btn');
  if (addResourceBtn) {
    addResourceBtn.addEventListener('click', () => {
      // Navigate to submit page with pre-filled course info
      const params = new URLSearchParams({
        college: course.college || '',
        department: course.department || '',
        courseCode: course.courseCode
      });
      window.location.href = `/submit?${params.toString()}`;
    });
  }
}

// Display resources
function displayResources(resources) {
  const resourcesContainer = document.getElementById('resources-container');

  if (!resourcesContainer) return;

  if (!resources || resources.length === 0) {
    resourcesContainer.innerHTML = '<p class="no-resources">No resources available for this course yet.</p>';
    return;
  }

  // Clear container
  resourcesContainer.innerHTML = '';

  // Create resource list
  const list = document.createElement('div');
  list.className = 'resource-list';

  resources.forEach(resource => {
    const item = createResourceItem(resource);
    list.appendChild(item);
  });

  resourcesContainer.appendChild(list);
}

// Create a resource item
function createResourceItem(resource) {

  // Get template
  const template = document.getElementById('resource-item-template');
  const item = template.content.cloneNode(true);

  // Extract year from tags or uploadDate
  const year = extractYear(resource);

  // Populate resource title and type badge
  item.querySelector('.resource-title').textContent = resource.title;
  item.querySelector('.resource-type-badge').textContent = formatResourceType(resource.type);

  // Populate or remove description
  const descriptionEl = item.querySelector('.resource-description');
  if (resource.description) {
    descriptionEl.textContent = resource.description;
  } else {
    descriptionEl.remove();
  }

  // Populate metadata
  const yearEl = item.querySelector('.resource-year');
  if (year) {
    yearEl.textContent = `Year: ${year}`;
  } else {
    yearEl.remove();
  }

  item.querySelector('.resource-downloads').textContent = `${resource.downloads || 0} downloads`;

  // Populate tags
  const tagsContainer = item.querySelector('.resource-tags');
  if (resource.tags && resource.tags.length > 0) {
    resource.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag';
      tagSpan.textContent = tag;
      tagsContainer.appendChild(tagSpan);
    });
  } else {
    tagsContainer.remove();
  }

  // Set download button
  const downloadButton = item.querySelector('.download-button');
  downloadButton.href = resource.fileUrl;
  downloadButton.target = '_blank';
  downloadButton.dataset.resourceId = resource._id;

  // Add download tracking
  downloadButton.addEventListener('click', () => {
    trackDownload(resource._id);
  });

  return item;
}

// Track download
async function trackDownload(resourceId) {
  try {
    const { incrementDownloadCount } = await import('../api/resourcesApi.js');
    await incrementDownloadCount(resourceId);
  } catch (error) {
    console.error('Error tracking download:', error);
  }
}

// Populate filter dropdowns
function populateFilters(resources) {
  // Get unique types
  const types = [...new Set(resources.map(r => r.type).filter(Boolean))];
  const typeFilter = document.getElementById('type-filter');
  
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = formatResourceType(type);
    typeFilter.appendChild(option);
  });

  // Get unique years
  const years = [...new Set(resources.map(r => extractYear(r)).filter(Boolean))].sort((a, b) => b - a);
  const yearFilter = document.getElementById('year-filter');
  
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  // Add event listeners
  typeFilter.addEventListener('change', applyFilters);
  yearFilter.addEventListener('change', applyFilters);
}

// Apply filters
function applyFilters() {
  const typeFilter = document.getElementById('type-filter').value;
  const yearFilter = document.getElementById('year-filter').value;

  let filteredResources = [...allResources];

  // Filter by type
  if (typeFilter) {
    filteredResources = filteredResources.filter(r => r.type === typeFilter);
  }

  // Filter by year
  if (yearFilter) {
    filteredResources = filteredResources.filter(r => extractYear(r) === yearFilter);
  }

  displayResources(filteredResources);
}

// Extract year from resource
function extractYear(resource) {
  // Check for direct year field
  if (resource.year) {
    return resource.year.toString();
  }

  // Fallback: Extract year from upload date
  if (resource.uploadDate) {
    const date = new Date(resource.uploadDate);
    if (!isNaN(date.getTime())) {
      return date.getFullYear().toString();
    }
  }

  return null;
}

// Format resource type for display
function formatResourceType(type) {
  const typeMap = {
    'exam': 'Exam',
    'lecture-notes': 'Lecture Notes',
    'exercises': 'Exercises',
    'slides': 'Slides',
    'lab': 'Lab Materials',
    'other': 'Other'
  };
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadCourseDetails();
});
