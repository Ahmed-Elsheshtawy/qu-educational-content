import { getAllCourses, syncResourceCounts } from '../api/coursesApi.js';

// DOM Elements
const coursesGrid = document.getElementById('courses-grid');
const courseCardTemplate = document.getElementById('course-card-template');
const collegeFilter = document.getElementById('college-filter');
const departmentFilter = document.getElementById('department-filter');
const resetButton = document.getElementById('filter-reset');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

// Store all courses globally for filtering
let allCourses = [];

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
    
    // Populate filters
    populateFilters(courses);
    
    // Display all courses
    displayCourses(courses);
    
  } catch (error) {
    console.error('Error loading courses:', error);
    coursesGrid.innerHTML = '<p class="error-message">Failed to load courses. Please try again later.</p>';
  }
}

// Display courses
function displayCourses(courses) {
  // Clear the grid
  coursesGrid.innerHTML = '';
  
  // Check if there are courses
  if (!courses || courses.length === 0) {
    coursesGrid.innerHTML = '<p class="no-courses">No courses available yet.</p>';
    return;
  }
  
  // Create a card for each course
  courses.forEach(course => {
    createCourseCard(course);
  });
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

  // Get unique departments
  const departments = [...new Set(courses.map(c => c.department).filter(Boolean))].sort();
  departments.forEach(department => {
    const option = document.createElement('option');
    option.value = department;
    option.textContent = department;
    departmentFilter.appendChild(option);
  });

  // Add event listeners
  collegeFilter.addEventListener('change', applyFilters);
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

// Apply filters
function applyFilters() {
  const selectedCollege = collegeFilter.value;
  const selectedDepartment = departmentFilter.value;
  const searchTerm = searchInput.value.toLowerCase().trim();

  let filteredCourses = [...allCourses];

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
  
  // Display message if no courses match
  if(filteredCourses.length === 0) {
    coursesGrid.innerHTML = '<p class="no-courses">No courses match the selected filters.</p>';
    return;
  }
  // Display filtered courses
  displayCourses(filteredCourses);
}

// Reset filters
function resetFilters() {
  collegeFilter.value = '';
  departmentFilter.value = '';
  searchInput.value = '';
  displayCourses(allCourses);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadCourses();
  setupNavigation();
  handleRouteChange();
  // Sync resource counts in background (non-blocking)
  syncResourceCounts().catch(err => console.warn('Failed to sync resource counts:', err));
});
