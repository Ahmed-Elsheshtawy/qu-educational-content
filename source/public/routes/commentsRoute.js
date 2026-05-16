/**
 * Comments API Routes
 * Handles all comment endpoints
 */

import express from 'express';
import { ObjectId } from 'mongodb';
import {
    addComment,
    getComments,
    markCommentHelpful,
    getPendingComments,
    approveComment,
    deleteComment,
    getCommentStats
} from '../services/commentsDbService.js';
import {
    getIpHash,
    sanitizeComment,
    validateCommentInput
} from '../middleware/commentsMiddleware.js';
import { verifyAdmin } from '../middleware/jwtMiddleware.js';

const router = express.Router();

/**
 * POST /api/comments/add
 * Submit a new comment (anonymous)
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
        const sanitizedContent = sanitizeComment(content);

        // Prepare comment data
        const commentData = {
            content: sanitizedContent,
            type, // 'resource' or 'course'
            ipHash: getIpHash(req) // Anonymous tracking
        };

        if (type === 'resource' && resourceId) {
            commentData.resourceId = new ObjectId(resourceId);
        }

        if (type === 'course' && courseId) {
            commentData.courseId = new ObjectId(courseId);
        }

        // Add comment to database
        const result = await addComment(commentData);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in POST /api/comments/add:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit comment'
        });
    }
});

/**
 * GET /api/comments
 * Get comments for a resource or course
 * Query params: resourceId, courseId
 */
router.get('/', async (req, res) => {
    try {
        const { resourceId, courseId } = req.query;

        // Must specify either resourceId or courseId
        if (!resourceId && !courseId) {
            return res.status(400).json({
                success: false,
                error: 'Must provide either resourceId or courseId'
            });
        }

        const result = await getComments(
            resourceId || null,
            courseId || null,
            true // Only approved comments for public view
        );

        res.json(result);
    } catch (error) {
        console.error('Error in GET /api/comments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve comments'
        });
    }
});

/**
 * POST /api/comments/helpful
 * Mark a comment as helpful (anonymous, IP-based)
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

        // Get IP hash for this user
        const ipHash = getIpHash(req);

        // Mark as helpful
        const result = await markCommentHelpful(
            new ObjectId(commentId),
            ipHash
        );

        const statusCode = result.success ? 200 : result.alreadyVoted ? 400 : 500;
        res.status(statusCode).json(result);
    } catch (error) {
        console.error('Error in POST /api/comments/helpful:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark comment helpful'
        });
    }
});

/**
 * GET /api/comments/admin/pending
 * Get pending comments for admin approval (admin only)
 */
router.get('/admin/pending', verifyAdmin, async (req, res) => {
    try {
        const result = await getPendingComments();
        res.json(result);
    } catch (error) {
        console.error('Error in GET /api/comments/admin/pending:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pending comments'
        });
    }
});

/**
 * POST /api/comments/admin/approve
 * Approve a comment (admin only)
 */
router.post('/admin/approve', verifyAdmin, async (req, res) => {
    try {
        const { commentId } = req.body;

        if (!commentId) {
            return res.status(400).json({
                success: false,
                error: 'Comment ID is required'
            });
        }

        const result = await approveComment(new ObjectId(commentId));

        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in POST /api/comments/admin/approve:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve comment'
        });
    }
});

/**
 * DELETE /api/comments/admin/:id
 * Delete a comment (admin only)
 */
router.delete('/admin/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Comment ID is required'
            });
        }

        const result = await deleteComment(new ObjectId(id));

        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in DELETE /api/comments/admin/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete comment'
        });
    }
});

/**
 * GET /api/comments/admin/stats
 * Get comment statistics (admin only)
 */
router.get('/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const result = await getCommentStats();
        res.json(result);
    } catch (error) {
        console.error('Error in GET /api/comments/admin/stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve comment statistics'
        });
    }
});

export default router;
