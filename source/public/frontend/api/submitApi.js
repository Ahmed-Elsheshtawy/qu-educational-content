// API Configuration
const API_BASE = '/api';

// Courses
export async function getCourses() {
    const response = await fetch(`${API_BASE}/courses`);
    if (!response.ok) throw new Error('Failed to load courses');
    return response.json();
}

export async function getCourseByCode(courseCode) {
    const response = await fetch(`${API_BASE}/courses/${courseCode}`);
    if (!response.ok) throw new Error('Failed to load course');
    return response.json();
}

// Resources
export async function getResources() {
    const response = await fetch(`${API_BASE}/resources`);
    if (!response.ok) throw new Error('Failed to load resources');
    return response.json();
}

export async function getResourcesByCourse(courseCode) {
    const response = await fetch(`${API_BASE}/resources/course/${courseCode}`);
    if (!response.ok) throw new Error('Failed to load resources');
    return response.json();
}

export async function submitResource(data) {
    const response = await fetch(`${API_BASE}/resources/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to submit resource');
    }
    
    return result;
}

export async function incrementDownload(resourceId) {
    const response = await fetch(`${API_BASE}/resources/${resourceId}/download`, {
        method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to track download');
    return response.json();
}
