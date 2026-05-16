/**
 * Comments Database Service
 * Handles all MongoDB operations for comments
 */

import { MongoClient } from 'mongodb';

/**
 * Add a new comment (anonymous, requires admin approval)
 */
export const addComment = async (commentData) => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        const comment = {
            ...commentData,
            timestamp: new Date(),
            isApproved: false, // Requires admin approval
            helpfulCount: 0,
            voters: [] // Array of IP hashes that voted helpful (to prevent duplicate votes)
        };

        const result = await collection.insertOne(comment);
        return {
            success: true,
            commentId: result.insertedId,
            message: 'Comment submitted successfully. It will appear after admin approval.'
        };
    } catch (error) {
        console.error('Error adding comment:', error);
        return {
            success: false,
            error: error.message || 'Failed to add comment'
        };
    } finally {
        await client.close();
    }
};

/**
 * Get comments for a resource or course
 * @param {String} resourceId - Optional, filter by resource
 * @param {String} courseId - Optional, filter by course
 * @param {Boolean} approvedOnly - Only return approved comments (default: true)
 */
export const getComments = async (resourceId = null, courseId = null, approvedOnly = true) => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        const filter = {};
        
        if (resourceId) {
            filter.resourceId = resourceId;
        }
        if (courseId) {
            filter.courseId = courseId;
        }
        if (approvedOnly) {
            filter.isApproved = true;
        }

        const comments = await collection
            .find(filter)
            .sort({ timestamp: -1 }) // Newest first
            .toArray();

        // Remove voter IPs from response for privacy
        const sanitizedComments = comments.map(comment => ({
            _id: comment._id,
            content: comment.content,
            timestamp: comment.timestamp,
            helpfulCount: comment.helpfulCount,
            isApproved: comment.isApproved,
            type: comment.type,
            resourceId: comment.resourceId,
            courseId: comment.courseId
        }));

        return {
            success: true,
            comments: sanitizedComments,
            count: sanitizedComments.length
        };
    } catch (error) {
        console.error('Error getting comments:', error);
        return {
            success: false,
            comments: [],
            error: error.message || 'Failed to retrieve comments'
        };
    } finally {
        await client.close();
    }
};

/**
 * Mark a comment as helpful (increment helpful count if not already voted by this user)
 */
export const markCommentHelpful = async (commentId, ipHash) => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        // Check if user already voted
        const comment = await collection.findOne({ _id: commentId });
        
        if (!comment) {
            return {
                success: false,
                error: 'Comment not found'
            };
        }

        if (comment.voters && comment.voters.includes(ipHash)) {
            return {
                success: false,
                alreadyVoted: true,
                error: 'You have already marked this as helpful'
            };
        }

        // Add vote
        const result = await collection.updateOne(
            { _id: commentId },
            {
                $inc: { helpfulCount: 1 },
                $push: { voters: ipHash }
            }
        );

        if (result.modifiedCount === 0) {
            return {
                success: false,
                error: 'Failed to update comment'
            };
        }

        return {
            success: true,
            message: 'Thank you for your feedback!'
        };
    } catch (error) {
        console.error('Error marking comment helpful:', error);
        return {
            success: false,
            error: error.message || 'Failed to mark comment helpful'
        };
    } finally {
        await client.close();
    }
};

/**
 * Get pending comments for admin approval
 */
export const getPendingComments = async () => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        const comments = await collection
            .find({ isApproved: false })
            .sort({ timestamp: -1 })
            .toArray();

        return {
            success: true,
            comments,
            count: comments.length
        };
    } catch (error) {
        console.error('Error getting pending comments:', error);
        return {
            success: false,
            comments: [],
            error: error.message || 'Failed to retrieve pending comments'
        };
    } finally {
        await client.close();
    }
};

/**
 * Approve a comment (admin only)
 */
export const approveComment = async (commentId) => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        const result = await collection.updateOne(
            { _id: commentId },
            { $set: { isApproved: true } }
        );

        if (result.modifiedCount === 0) {
            return {
                success: false,
                error: 'Comment not found or already approved'
            };
        }

        return {
            success: true,
            message: 'Comment approved successfully'
        };
    } catch (error) {
        console.error('Error approving comment:', error);
        return {
            success: false,
            error: error.message || 'Failed to approve comment'
        };
    } finally {
        await client.close();
    }
};

/**
 * Reject/Delete a comment (admin only)
 */
export const deleteComment = async (commentId) => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        const result = await collection.deleteOne({ _id: commentId });

        if (result.deletedCount === 0) {
            return {
                success: false,
                error: 'Comment not found'
            };
        }

        return {
            success: true,
            message: 'Comment deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting comment:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete comment'
        };
    } finally {
        await client.close();
    }
};

/**
 * Get comment statistics
 */
export const getCommentStats = async () => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        const collection = db.collection(process.env.MONGODB_COMMENTS_COLLECTION_NAME);

        const total = await collection.countDocuments({});
        const approved = await collection.countDocuments({ isApproved: true });
        const pending = await collection.countDocuments({ isApproved: false });

        return {
            success: true,
            stats: {
                total,
                approved,
                pending
            }
        };
    } catch (error) {
        console.error('Error getting comment stats:', error);
        return {
            success: false,
            error: error.message || 'Failed to get comment statistics'
        };
    } finally {
        await client.close();
    }
};
