// API Configuration
const API_BASE = '/api';

// Helper function to handle response
async function handleResponse(response) {
    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'API request failed');
    }
    return result;
}

// Authentication
export async function logout() {
    const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST'
    });
    return handleResponse(response);
}

// Courses
export async function getCourses() {
    const response = await fetch(`${API_BASE}/courses`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
}

export async function createCourse(courseData) {
    const response = await fetch(`${API_BASE}/admin/courses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create course');
    }
    
    return result;
}

export async function updateCourse(courseId, courseData) {
    const response = await fetch(`${API_BASE}/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to update course');
    }
    
    return result;
}

export async function deleteCourse(courseId) {
    const response = await fetch(`${API_BASE}/admin/courses/${courseId}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to delete course');
    }
    
    return result;
}

// Resources
export async function getResources() {
    const response = await fetch(`${API_BASE}/resources`);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return response.json();
}

export async function createResource(resourceData) {
    const response = await fetch(`${API_BASE}/admin/resources`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(resourceData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create resource');
    }
    
    return result;
}

export async function updateResource(resourceId, resourceData) {
    const response = await fetch(`${API_BASE}/admin/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(resourceData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to update resource');
    }
    
    return result;
}

export async function deleteResource(resourceId) {
    const response = await fetch(`${API_BASE}/admin/resources/${resourceId}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to delete resource');
    }
    
    return result;
}

// Pending Resources
export async function getPendingResources() {
    const response = await fetch(`${API_BASE}/admin/resources/pending`);
    return handleResponse(response);
}

export async function approveResource(resourceId) {
    const response = await fetch(`${API_BASE}/admin/resources/${resourceId}/approve`, {
        method: 'POST'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to approve submission');
    }
    
    return result;
}

export async function rejectResource(resourceId) {
    const response = await fetch(`${API_BASE}/admin/resources/${resourceId}/reject`, {
        method: 'POST'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to reject submission');
    }
    
    return result;
}

// Pending Courses
export async function getPendingCourses() {
    const response = await fetch(`${API_BASE}/admin/courses/pending`);
    return handleResponse(response);
}

export async function approveCourse(courseId) {
    const response = await fetch(`${API_BASE}/admin/courses/${courseId}/approve`, {
        method: 'PUT'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to approve course');
    }
    
    return result;
}

export async function rejectCourse(courseId) {
    const response = await fetch(`${API_BASE}/admin/courses/${courseId}/reject`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to reject course');
    }
    
    return result;
}

export async function syncResourceCounts() {
    const response = await fetch(`${API_BASE}/admin/courses/sync-counts`, {
        method: 'POST'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Failed to sync resource counts');
    }
    
    return result;
}
