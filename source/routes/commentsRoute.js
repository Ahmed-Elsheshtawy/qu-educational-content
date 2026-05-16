import express from 'express';
import { ObjectId } from 'mongodb';
import {
    getIpHash,
    sanitizeComment,
    validateCommentInput
} from '../public/middleware/commentsMiddleware.js';
import {
    addComment,
    getComments,
    markCommentHelpful,
    getPendingComments,
    approveComment,
    deleteComment,
    getCommentStats
} from '../services/commentsDbService.js';

const router = express.Router();

// Middleware to verify admin token (simple JWT verification)
const verifyAdminToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    // In production, verify JWT properly
    // For now, just check if token exists
    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    req.adminToken = token;
    next();
};

/**
 * POST /api/comments/add
 * Submit a new comment
 */
router.post('/add', async (req, res) => {
    try {
        const { content, resourceId, courseId, type } = req.body;
        
        // Validate input
        const validation = validateCommentInput(content, resourceId, courseId, type);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }
        
        // Sanitize content
        const sanitized = sanitizeComment(content);
        
        // Get IP hash for vote tracking
        const ipHash = getIpHash(req);
        
        // Save comment
        const comment = await addComment({
            content: sanitized,
            resourceId,
            courseId,
            type,
            ipHash
        });
        
        res.json({
            success: true,
            message: 'Comment submitted and pending approval',
            data: {
                _id: comment._id,
                content: comment.content,
                timestamp: comment.timestamp
            }
        });
    } catch (error) {
        console.error('Error submitting comment:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to submit comment'
        });
    }
});

/**
 * GET /api/comments
 * Get approved comments for a resource or course
 */
router.get('/', async (req, res) => {
    try {
        const { resourceId, courseId, type } = req.query;
        
        const comments = await getComments(resourceId, courseId, type, true);
        
        res.json({
            success: true,
            data: comments.map(c => ({
                _id: c._id,
                content: c.content,
                type: c.type,
                timestamp: c.timestamp,
                helpfulCount: c.helpfulCount || 0
            }))
        });
    } catch (error) {
        console.error('Error getting comments:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch comments'
        });
    }
});

/**
 * POST /api/comments/helpful
 * Mark a comment as helpful (with vote deduplication)
 */
router.post('/helpful', async (req, res) => {
    try {
        const { commentId } = req.body;
        
        if (!commentId) {
            return res.status(400).json({
                success: false,
                error: 'Comment ID is required'
            });
        }
        
        const ipHash = getIpHash(req);
        const result = await markCommentHelpful(commentId, ipHash);
        
        res.json(result);
    } catch (error) {
        console.error('Error marking comment helpful:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to record vote'
        });
    }
});

/**
 * GET /api/comments/admin/pending
 * Get all pending comments (requires admin token)
 */
router.get('/admin/pending', verifyAdminToken, async (req, res) => {
    try {
        const comments = await getPendingComments();
        
        res.json({
            success: true,
            data: comments.map(c => ({
                _id: c._id,
                content: c.content,
                type: c.type,
                resourceId: c.resourceId,
                courseId: c.courseId,
                timestamp: c.timestamp,
                ipHash: c.ipHash.substring(0, 8) + '...' // Partial hash for reference
            }))
        });
    } catch (error) {
        console.error('Error getting pending comments:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch pending comments'
        });
    }
});

/**
 * POST /api/comments/admin/approve
 * Approve a pending comment (requires admin token)
 */
router.post('/admin/approve', verifyAdminToken, async (req, res) => {
    try {
        const { commentId } = req.body;
        
        if (!commentId) {
            return res.status(400).json({
                success: false,
                error: 'Comment ID is required'
            });
        }
        
        const result = await approveComment(commentId);
        
        res.json(result);
    } catch (error) {
        console.error('Error approving comment:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to approve comment'
        });
    }
});

/**
 * DELETE /api/comments/admin/:id
 * Delete a comment (requires admin token)
 */
router.delete('/admin/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await deleteComment(id);
        
        res.json(result);
    } catch (error) {
        console.error('Error deleting comment:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete comment'
        });
    }
});

/**
 * GET /api/comments/admin/stats
 * Get comment statistics (requires admin token)
 */
router.get('/admin/stats', verifyAdminToken, async (req, res) => {
    try {
        const stats = await getCommentStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting comment stats:', error.message, error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch statistics'
        });
    }
});

export default router;
