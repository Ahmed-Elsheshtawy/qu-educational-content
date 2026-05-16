/**
 * Comments API Client
 * Handles all communication with the backend comments API
 */

const API_BASE = '/api/comments';

/**
 * Submit a new comment
 */
export const submitComment = async (content, resourceId, courseId, type) => {
    try {
        const response = await fetch(`${API_BASE}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                resourceId: resourceId || null,
                courseId: courseId || null,
                type
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit comment');
        }

        return data;
    } catch (error) {
        console.error('Error submitting comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get comments for a resource or course
 */
export const getComments = async (resourceId = null, courseId = null, type = 'resource') => {
    try {
        const params = new URLSearchParams();
        if (resourceId) params.append('resourceId', resourceId);
        if (courseId) params.append('courseId', courseId);
        if (type) params.append('type', type);

        const response = await fetch(`${API_BASE}?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to retrieve comments');
        }

        return data;
    } catch (error) {
        console.error('Error getting comments:', error);
        return {
            success: false,
            data: [],
            error: error.message
        };
    }
};

/**
 * Mark a comment as helpful
 */
export const markHelpful = async (commentId) => {
    try {
        const response = await fetch(`${API_BASE}/helpful`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ commentId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to mark as helpful');
        }

        return data;
    } catch (error) {
        console.error('Error marking as helpful:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get pending comments for admin (admin only)
 */
export const getPendingComments = async (adminToken) => {
    try {
        const response = await fetch(`${API_BASE}/admin/pending`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to retrieve pending comments');
        }

        return data;
    } catch (error) {
        console.error('Error getting pending comments:', error);
        return {
            success: false,
            data: [],
            error: error.message
        };
    }
};

/**
 * Approve a comment (admin only)
 */
export const approveComment = async (commentId, adminToken) => {
    try {
        const response = await fetch(`${API_BASE}/admin/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ commentId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to approve comment');
        }

        return data;
    } catch (error) {
        console.error('Error approving comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete a comment (admin only)
 */
export const deleteCommentApi = async (commentId, adminToken) => {
    try {
        const response = await fetch(`${API_BASE}/admin/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete comment');
        }

        return data;
    } catch (error) {
        console.error('Error deleting comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get comment statistics (admin only)
 */
export const getCommentStats = async (adminToken) => {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to retrieve statistics');
        }

        return data;
    } catch (error) {
        console.error('Error getting comment stats:', error);
        return {
            success: false,
            error: error.message
        };
    }
};
