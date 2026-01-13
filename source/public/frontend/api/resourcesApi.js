const API_BASE_URL = '/api/resources';

// Get all resources
export async function getAllResources() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Get resource by ID
export async function getResourceById(resourceId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${resourceId}`);
    if (!response.ok) throw new Error('Failed to fetch resource');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resource:', error);
    throw error;
  }
}

// Get resources by course code
export async function getResourcesByCourseCode(courseCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/course/${courseCode}`);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Get resources by course code and type
export async function getResourcesByCourseAndType(courseCode, type) {
  try {
    const response = await fetch(`${API_BASE_URL}/course/${courseCode}/type/${type}`);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Get resources by type
export async function getResourcesByType(type) {
  try {
    const response = await fetch(`${API_BASE_URL}/type/${type}`);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Get resources by semester
export async function getResourcesBySemester(semester) {
  try {
    const response = await fetch(`${API_BASE_URL}/semester/${encodeURIComponent(semester)}`);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Get resources by tag
export async function getResourcesByTag(tag) {
  try {
    const response = await fetch(`${API_BASE_URL}/tag/${tag}`);
    if (!response.ok) throw new Error('Failed to fetch resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Search resources
export async function searchResources(searchTerm) {
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchTerm)}`);
    if (!response.ok) throw new Error('Failed to search resources');
    return await response.json();
  } catch (error) {
    console.error('Error searching resources:', error);
    throw error;
  }
}

// Get most downloaded resources
export async function getMostDownloadedResources(limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/popular?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch popular resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching popular resources:', error);
    throw error;
  }
}

// Get recently uploaded resources
export async function getRecentResources(limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/recent?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch recent resources');
    return await response.json();
  } catch (error) {
    console.error('Error fetching recent resources:', error);
    throw error;
  }
}

// Get resource count by course
export async function getResourceCountByCourse(courseCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/count/${courseCode}`);
    if (!response.ok) throw new Error('Failed to get resource count');
    return await response.json();
  } catch (error) {
    console.error('Error getting resource count:', error);
    throw error;
  }
}

// Get unique resource types
export async function getUniqueResourceTypes() {
  try {
    const response = await fetch(`${API_BASE_URL}/meta/types`);
    if (!response.ok) throw new Error('Failed to fetch resource types');
    return await response.json();
  } catch (error) {
    console.error('Error fetching resource types:', error);
    throw error;
  }
}

// Get all tags
export async function getAllTags() {
  try {
    const response = await fetch(`${API_BASE_URL}/meta/tags`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}

// Increment download count
export async function incrementDownloadCount(resourceId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${resourceId}/download`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to increment download count');
    return await response.json();
  } catch (error) {
    console.error('Error incrementing download count:', error);
    throw error;
  }
}
