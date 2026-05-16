import { ObjectId } from 'mongodb';
import { getDatabase } from '../public/services/mongoService.js';

const COLLECTION_NAME = 'comments';

/**
 * Get the database connection
 */
const getCommentsCollection = async () => {
    try {
        const db = getDatabase();
        if (!db) {
            throw new Error('Database not initialized');
        }
        const collection = db.collection(COLLECTION_NAME);
        
        // Ensure indexes exist (non-blocking)
        collection.createIndex({ resourceId: 1 }).catch(() => {});
        collection.createIndex({ courseId: 1 }).catch(() => {});
        collection.createIndex({ type: 1 }).catch(() => {});
        collection.createIndex({ timestamp: -1 }).catch(() => {});
        collection.createIndex({ isApproved: 1 }).catch(() => {});
        
        return collection;
    } catch (error) {
        console.error('Error getting comments collection:', error.message);
        throw new Error('Failed to access comments collection: ' + error.message);
    }
};

/**
 * Initialize comments database (ensure collection exists)
 */
export const initDB = async () => {
    try {
        const collection = await getCommentsCollection();
        console.log('✅ Comments collection initialized');
        return collection;
    } catch (error) {
        console.error('Failed to initialize comments database:', error);
        throw error;
    }
};

/**
 * Add a new comment
 */
export const addComment = async (commentData) => {
    try {
        const collection = await getCommentsCollection();
        const comment = {
            content: commentData.content,
            resourceId: commentData.resourceId || null,
            courseId: commentData.courseId,
            type: commentData.type,
            ipHash: commentData.ipHash,
            timestamp: new Date(),
            isApproved: false,
            helpfulCount: 0,
            voters: []
        };
        
        const result = await collection.insertOne(comment);
        return { _id: result.insertedId, ...comment };
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

/**
 * Get comments (optionally filtered)
 */
export const getComments = async (resourceId = null, courseId = null, type = null, approvedOnly = true) => {
    try {
        const collection = await getCommentsCollection();
        const query = { isApproved: approvedOnly };
        
        if (resourceId) query.resourceId = resourceId;
        if (courseId) query.courseId = courseId;
        if (type) query.type = type;
        
        const comments = await collection.find(query).sort({ timestamp: -1 }).toArray();
        return comments;
    } catch (error) {
        console.error('Error getting comments:', error);
        throw error;
    }
};

/**
 * Mark comment as helpful (with vote deduplication)
 */
export const markCommentHelpful = async (commentId, ipHash) => {
    try {
        const collection = await getCommentsCollection();
        const comment = await collection.findOne({ _id: new ObjectId(commentId) });
        
        if (!comment) {
            throw new Error('Comment not found');
        }
        
        // Check if this IP has already voted
        if (comment.voters && comment.voters.includes(ipHash)) {
            return { success: false, message: 'You have already voted for this comment' };
        }
        
        // Add vote
        const result = await collection.updateOne(
            { _id: new ObjectId(commentId) },
            {
                $inc: { helpfulCount: 1 },
                $push: { voters: ipHash }
            }
        );
        
        return { success: true, message: 'Vote recorded' };
    } catch (error) {
        console.error('Error marking comment helpful:', error);
        throw error;
    }
};

/**
 * Get pending comments (for admin review)
 */
export const getPendingComments = async () => {
    try {
        const collection = await getCommentsCollection();
        const comments = await collection.find({ isApproved: false }).sort({ timestamp: -1 }).toArray();
        return comments;
    } catch (error) {
        console.error('Error getting pending comments:', error);
        throw error;
    }
};

/**
 * Approve a comment
 */
export const approveComment = async (commentId) => {
    try {
        const collection = await getCommentsCollection();
        const result = await collection.updateOne(
            { _id: new ObjectId(commentId) },
            { $set: { isApproved: true } }
        );
        
        if (result.matchedCount === 0) {
            throw new Error('Comment not found');
        }
        
        return { success: true, message: 'Comment approved' };
    } catch (error) {
        console.error('Error approving comment:', error);
        throw error;
    }
};

/**
 * Delete a comment
 */
export const deleteComment = async (commentId) => {
    try {
        const collection = await getCommentsCollection();
        const result = await collection.deleteOne({ _id: new ObjectId(commentId) });
        
        if (result.deletedCount === 0) {
            throw new Error('Comment not found');
        }
        
        return { success: true, message: 'Comment deleted' };
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

/**
 * Get comment statistics
 */
export const getCommentStats = async () => {
    try {
        const collection = await getCommentsCollection();
        const total = await collection.countDocuments();
        const approved = await collection.countDocuments({ isApproved: true });
        const pending = await collection.countDocuments({ isApproved: false });
        
        return {
            total,
            approved,
            pending
        };
    } catch (error) {
        console.error('Error getting comment stats:', error);
        throw error;
    }
};
