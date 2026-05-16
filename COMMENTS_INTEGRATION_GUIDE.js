/**
 * COMMENTS FEATURE - INTEGRATION GUIDE
 * 
 * Backend files created:
 * 1. /routes/commentsRoute.js - All API endpoints
 * 2. /services/commentsDbService.js - Database operations
 * 3. /middleware/commentsMiddleware.js - Validation and sanitization
 * 
 * Frontend files created:
 * 1. /api/commentsApi.js - API client functions
 * 2. /scripts/commentsComponent.js - Comments section component (reusable)
 * 3. /scripts/adminCommentsScript.js - Admin comments management
 * 4. /styles/commentsStyles.css - Comments styling
 * 5. /styles/adminCommentsStyles.css - Admin panel styling
 * 
 * ============================================
 * HOW TO INTEGRATE INTO YOUR PAGES
 * ============================================
 * 
 * 1. ADD TO courseDetail.html (or any page with comments)
 *    - Add comments CSS link to <head>
 *    - Add <div id="comments-container"></div> where you want comments
 *    - Import and initialize CommentsSection in your script
 * 
 * 2. ADD TO admin.html (for comment moderation)
 *    - Add admin comments CSS link to <head>
 *    - Add <div id="admin-comments-container"></div> in admin panel
 *    - Import and initialize AdminCommentsPanel in your script
 * 
 * ============================================
 * DATABASE SCHEMA
 * ============================================
 * 
 * MongoDB Comments Collection:
 * {
 *   _id: ObjectId,
 *   content: String (max 1000 chars, sanitized),
 *   type: String (either "resource" or "course"),
 *   resourceId: ObjectId (if type is "resource"),
 *   courseId: ObjectId (if type is "course"),
 *   timestamp: Date,
 *   isApproved: Boolean (default: false - requires admin approval),
 *   helpfulCount: Number (upvote count),
 *   voters: Array<String> (IP hashes of users who voted - for preventing duplicate votes),
 *   ipHash: String (hashed IP for anonymous tracking)
 * }
 * 
 * ============================================
 * API ENDPOINTS
 * ============================================
 * 
 * PUBLIC (No Auth Required):
 * POST   /api/comments/add
 *        - Submit a new comment (anonymous)
 *        - Body: { content, resourceId, courseId, type }
 *        - Returns: { success, commentId, message }
 * 
 * GET    /api/comments
 *        - Get comments for a resource/course
 *        - Query: ?resourceId=xxx or ?courseId=xxx
 *        - Returns: { success, comments[], count }
 * 
 * POST   /api/comments/helpful
 *        - Mark comment as helpful (IP-based, no login)
 *        - Body: { commentId }
 *        - Returns: { success, message } or { alreadyVoted: true }
 * 
 * ADMIN ONLY (Requires JWT Token):
 * GET    /api/comments/admin/pending
 *        - Get pending comments for approval
 *        - Returns: { success, comments[], count }
 * 
 * POST   /api/comments/admin/approve
 *        - Approve a comment
 *        - Body: { commentId }
 *        - Returns: { success, message }
 * 
 * DELETE /api/comments/admin/:id
 *        - Delete/reject a comment
 *        - Returns: { success, message }
 * 
 * GET    /api/comments/admin/stats
 *        - Get comment statistics
 *        - Returns: { success, stats: { total, approved, pending } }
 * 
 * ============================================
 * PRIVACY & SECURITY FEATURES
 * ============================================
 * 
 * ✓ No username storage - comments are anonymous
 * ✓ No personal data collected - only hashed IP for vote tracking
 * ✓ Content sanitization - prevents XSS attacks
 * ✓ XSS prevention in frontend - text content is escaped
 * ✓ Admin approval required - filters spam/inappropriate comments
 * ✓ Vote protection - IP hashing prevents vote manipulation
 * ✓ Character limit - 1000 chars max per comment
 * ✓ No voter IP storage - only hash stored, never actual IP
 * 
 * ============================================
 * OPTIONAL: Add IP_HASH_SALT to .env
 * ============================================
 * 
 * For extra security, add to your .env:
 * IP_HASH_SALT=your-secret-random-string
 * 
 * This makes the IP hashing more secure. If not set, a default is used.
 * 
 * ============================================
 * EXAMPLE USAGE IN courseDetail.html
 * ============================================
 * 
 * In <head>:
 * <link rel="stylesheet" href="../styles/commentsStyles.css">
 * 
 * In <body> where you want comments:
 * <div id="comments-container"></div>
 * 
 * In your script file (e.g., courseDetailScript.js):
 * import { CommentsSection } from '../scripts/commentsComponent.js';
 * 
 * // Initialize comments when page loads
 * const commentsSection = new CommentsSection(
 *   'comments-container',
 *   resourceId,  // or null if for course
 *   courseId,    // or null if for resource
 *   'resource'   // or 'course'
 * );
 * 
 * ============================================
 * EXAMPLE USAGE IN admin.html
 * ============================================
 * 
 * In <head>:
 * <link rel="stylesheet" href="../styles/adminCommentsStyles.css">
 * 
 * In admin panel (inside a tab):
 * <section class="tab-content">
 *   <div id="admin-comments-container"></div>
 * </section>
 * 
 * In your admin script:
 * import { AdminCommentsPanel } from '../scripts/adminCommentsScript.js';
 * 
 * // Initialize when admin clicks comments tab
 * const commentsPanel = new AdminCommentsPanel('admin-comments-container');
 */
