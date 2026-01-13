import { getAllCourses, syncResourceCounts } from '../api/coursesApi.js';

// DOM Elements
const coursesGrid = document.getElementById('courses-grid');
const courseCardTemplate = document.getElementById('course-card-template');
const collegeFilter = document.getElementById('college-filter');
const departmentFilter = document.getElementById('department-filter');
const resetButton = document.getElementById('filter-reset');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

// Store all courses globally for filtering
let allCourses = [];
let filteredCourses = [];
let currentPage = 1;
const coursesPerPage = 9;

// View management
function showView(viewName) {
  const homeView = document.getElementById('home-view');
  const aboutView = document.getElementById('about-view');
  const navHome = document.getElementById('nav-home');
  const navAbout = document.getElementById('nav-about');

  // Remove active class from all nav links
  navHome.classList.remove('active');
  navAbout.classList.remove('active');

  if (viewName === 'about') {
    homeView.style.display = 'none';
    aboutView.style.display = 'block';
    navAbout.classList.add('active');
  } else {
    homeView.style.display = 'block';
    aboutView.style.display = 'none';
    navHome.classList.add('active');
  }
}

// Handle route changes
function handleRouteChange() {
  const path = window.location.pathname;
  if (path === '/about') {
    showView('about');
  } else {
    showView('home');
  }
}

// Navigate to a route
function navigateTo(path) {
  history.pushState(null, '', path);
  handleRouteChange();
}

// Handle navigation clicks
function setupNavigation() {
  document.getElementById('nav-home').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('/');
  });

  document.getElementById('nav-about').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('/about');
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', handleRouteChange);
}

// Load and display all courses
async function loadCourses() {
  try {
    // Fetch courses from API
    const courses = await getAllCourses();
    
    // Store courses globally
    allCourses = courses;
    filteredCourses = courses;
    
    // Populate filters
    populateFilters(courses);
    
    // Reset to first page and display
    currentPage = 1;
    displayCourses(filteredCourses);
    
  } catch (error) {
    console.error('Error loading courses:', error);
    coursesGrid.innerHTML = '<p class="error-message">Failed to load courses. Please try again later.</p>';
  }
}

// Display courses with pagination
function displayCourses(courses) {
  // Clear the grid
  coursesGrid.innerHTML = '';
  
  // Check if there are courses
  if (!courses || courses.length === 0) {
    coursesGrid.innerHTML = '<p class="no-courses">No courses available yet.</p>';
    updatePaginationControls(0);
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(courses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const coursesToDisplay = courses.slice(startIndex, endIndex);
  
  // Create a card for each course on current page
  coursesToDisplay.forEach(course => {
    createCourseCard(course);
  });
  
  // Update pagination controls
  updatePaginationControls(totalPages);
  
  // Scroll to top of courses section
  document.querySelector('.courses-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Update pagination controls
function updatePaginationControls(totalPages) {
  if (totalPages <= 1) {
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    pageInfo.textContent = totalPages === 0 ? 'No results' : `Page 1 of 1`;
  } else {
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

// Create a course card from template
function createCourseCard(course) {
  // Clone the template
  const card = courseCardTemplate.content.cloneNode(true);
  
  // Populate card fields
  card.querySelector('.course-code').textContent = course.courseCode || 'N/A';
  card.querySelector('.course-name').textContent = course.courseName || 'Untitled Course';
  card.querySelector('.college').textContent = course.college || 'N/A';
  card.querySelector('.department').textContent = course.department || 'N/A';
  card.querySelector('.resource-count').textContent = `${course.resourceCount || 0} Resources`;
  
  // Add click handler to the entire card
  const cardElement = card.querySelector('.course-card');
  cardElement.addEventListener('click', () => {
    navigateToCourse(course.courseCode);
  });
  
  // Add click handler to the View button
  const viewButton = card.querySelector('.view-button');
  viewButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent card click from firing
    navigateToCourse(course.courseCode);
  });
  
  // Append to grid
  coursesGrid.appendChild(card);
}

// Navigate to course detail page
function navigateToCourse(courseCode) {
  window.location.href = `views/courseDetail.html?code=${courseCode}`;
}

// Populate filter dropdowns
function populateFilters(courses) {
  // Get unique colleges
  const colleges = [...new Set(courses.map(c => c.college).filter(Boolean))].sort();
  colleges.forEach(college => {
    const option = document.createElement('option');
    option.value = college;
    option.textContent = college;
    collegeFilter.appendChild(option);
  });

  // Initially disable department filter with message
  departmentFilter.disabled = true;
  departmentFilter.innerHTML = '<option value="">Select a college first</option>';

  // Add event listeners
  collegeFilter.addEventListener('change', handleCollegeFilterChange);
  departmentFilter.addEventListener('change', applyFilters);
  resetButton.addEventListener('click', resetFilters);
  
  // Add search event listeners
  searchInput.addEventListener('input', applyFilters);
  searchButton.addEventListener('click', applyFilters);
  
  // Allow Enter key to search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  });
}

// Handle college filter change (cascading)
function handleCollegeFilterChange() {
  const selectedCollege = collegeFilter.value;
  
  if (!selectedCollege) {
    // If no college selected, disable department filter
    departmentFilter.disabled = true;
    departmentFilter.innerHTML = '<option value="">Select a college first</option>';
  } else {
    // Enable department filter
    departmentFilter.disabled = false;
    departmentFilter.innerHTML = '<option value="">All Departments</option>';
    
    // Show only departments in selected college
    const departments = [...new Set(
      allCourses
        .filter(c => c.college === selectedCollege)
        .map(c => c.department)
        .filter(Boolean)
    )].sort();
    
    departments.forEach(department => {
      const option = document.createElement('option');
      option.value = department;
      option.textContent = department;
      departmentFilter.appendChild(option);
    });
  }
  
  // Apply filters after updating department dropdown
  applyFilters();
}

// Apply filters
function applyFilters() {
  const selectedCollege = collegeFilter.value;
  const selectedDepartment = departmentFilter.value;
  const searchTerm = searchInput.value.toLowerCase().trim();

  filteredCourses = [...allCourses];

  // Filter by search term
  if (searchTerm) {
    filteredCourses = filteredCourses.filter(course => {
      const courseCode = (course.courseCode || '').toLowerCase();
      const courseName = (course.courseName || '').toLowerCase();
      const department = (course.department || '').toLowerCase();
      const college = (course.college || '').toLowerCase();
      
      return courseCode.includes(searchTerm) || 
             courseName.includes(searchTerm) || 
             department.includes(searchTerm) ||
             college.includes(searchTerm);
    });
  }

  // Filter by college
  if (selectedCollege) {
    filteredCourses = filteredCourses.filter(c => c.college === selectedCollege);
  }

  // Filter by department
  if (selectedDepartment) {
    filteredCourses = filteredCourses.filter(c => c.department === selectedDepartment);
  }
  
  // Reset to first page when filters change
  currentPage = 1;
  
  // Display filtered courses with pagination
  displayCourses(filteredCourses);
}

// Reset filters
function resetFilters() {
  collegeFilter.value = '';
  departmentFilter.value = '';
  searchInput.value = '';
  
  // Disable department filter and reset message
  departmentFilter.disabled = true;
  departmentFilter.innerHTML = '<option value="">Select a college first</option>';
  
  filteredCourses = allCourses;
  currentPage = 1;
  displayCourses(filteredCourses);
}

// Pagination handlers
function goToNextPage() {
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayCourses(filteredCourses);
  }
}

function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayCourses(filteredCourses);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadCourses();
  setupNavigation();
  handleRouteChange();
  
  // Setup pagination button listeners
  nextPageBtn.addEventListener('click', goToNextPage);
  prevPageBtn.addEventListener('click', goToPreviousPage);
  
  // Sync resource counts in background (non-blocking)
  syncResourceCounts().catch(err => console.warn('Failed to sync resource counts:', err));
});
