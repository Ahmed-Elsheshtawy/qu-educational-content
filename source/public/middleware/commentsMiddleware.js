/**
 * Middleware for comments functionality
 * Handles IP hashing for anonymous user tracking (privacy-preserving)
 */

import crypto from 'crypto';

/**
 * Get hashed IP for tracking helpful votes without storing actual IP
 * This prevents vote manipulation while maintaining user anonymity
 */
export const getIpHash = (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const hash = crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT || 'salt').digest('hex');
    return hash.substring(0, 16); // Use first 16 chars for cleaner storage
};

/**
 * Sanitize comment content to prevent XSS and remove unwanted characters
 */
export const sanitizeComment = (content) => {
    if (!content || typeof content !== 'string') {
        return '';
    }
    
    return content
        .trim()
        .substring(0, 1000) // Max 1000 characters
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
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
    
    if (type === 'resource' && !resourceId) {
        errors.push('Resource ID is required for resource comments');
    }
    
    if (type === 'course' && !courseId) {
        errors.push('Course ID is required for course comments');
    }
    
    if (type === 'platform' && !courseId) {
        errors.push('Platform ID is required for platform comments');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};
