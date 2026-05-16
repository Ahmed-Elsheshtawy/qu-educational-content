import crypto from 'crypto';

/**
 * Get IP hash for vote tracking
 * Uses SHA256 to hash the user's IP address (no actual IP stored)
 */
export const getIpHash = (req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const salt = process.env.IP_HASH_SALT || 'default-salt';
    return crypto.createHash('sha256').update(ip + salt).digest('hex');
};

/**
 * Sanitize comment content
 * Removes HTML tags, script content, event handlers, and limits length
 */
export const sanitizeComment = (content) => {
    if (!content) return '';
    
    let sanitized = content
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers (onclick, onerror, etc)
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
        // Remove all other HTML tags but keep text
        .replace(/<[^>]*>/g, '')
        // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    
    // Limit to 1000 characters
    if (sanitized.length > 1000) {
        sanitized = sanitized.substring(0, 1000);
    }
    
    return sanitized.trim();
};

/**
 * Validate comment input
 */
export const validateCommentInput = (content, resourceId, courseId, type) => {
    const errors = [];
    
    if (!content || content.trim().length === 0) {
        errors.push('Comment content is required');
    }
    
    if (content && content.length > 1000) {
        errors.push('Comment must be less than 1000 characters');
    }
    
    if (!type || !['resource', 'course', 'platform'].includes(type)) {
        errors.push('Invalid comment type');
    }
    
    // Validation depends on type
    if (type === 'resource' && !resourceId) {
        errors.push('Resource ID is required for resource comments');
    } else if (type === 'course' && !courseId) {
        errors.push('Course ID is required for course comments');
    } else if (type === 'platform' && !courseId) {
        errors.push('Platform ID is required for platform comments');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};
