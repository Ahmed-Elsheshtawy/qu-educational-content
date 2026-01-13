const API_BASE_URL = '/api/courses';

// Get all courses
export async function getAllCourses() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

// Get course by ID
export async function getCourseById(courseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch course');
    return await response.json();
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
}

// Get course by course code
export async function getCourseByCourseCode(courseCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/code/${courseCode}`);
    if (!response.ok) throw new Error('Failed to fetch course');
    return await response.json();
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
}

// Get courses by department
export async function getCoursesByDepartment(department) {
  try {
    const response = await fetch(`${API_BASE_URL}/department/${department}`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

// Get courses by semester
export async function getCoursesBySemester(semester) {
  try {
    const response = await fetch(`${API_BASE_URL}/semester/${encodeURIComponent(semester)}`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

// Search courses
export async function searchCourses(searchTerm) {
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchTerm)}`);
    if (!response.ok) throw new Error('Failed to search courses');
    return await response.json();
  } catch (error) {
    console.error('Error searching courses:', error);
    throw error;
  }
}

// Get unique departments
export async function getUniqueDepartments() {
  try {
    const response = await fetch(`${API_BASE_URL}/meta/departments`);
    if (!response.ok) throw new Error('Failed to fetch departments');
    return await response.json();
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
}

// Get unique semesters
export async function getUniqueSemesters() {
  try {
    const response = await fetch(`${API_BASE_URL}/meta/semesters`);
    if (!response.ok) throw new Error('Failed to fetch semesters');
    return await response.json();
  } catch (error) {
    console.error('Error fetching semesters:', error);
    throw error;
  }
}

// Sync resource counts
export async function syncResourceCounts() {
  try {
    const response = await fetch(`${API_BASE_URL}/sync-counts`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to sync resource counts');
    return await response.json();
  } catch (error) {
    console.error('Error syncing resource counts:', error);
    throw error;
  }
}
