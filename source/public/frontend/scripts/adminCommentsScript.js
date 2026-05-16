/**
 * Admin Comments Management Component
 * For reviewing and approving comments
 */

import {
    getPendingComments,
    approveComment,
    deleteCommentApi,
    getCommentStats
} from '../api/commentsApi.js';

export class AdminCommentsPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.adminToken = localStorage.getItem('adminToken');
        this.pendingComments = [];
        this.filterType = '';
        this.sortOrder = 'newest';

        if (!this.container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }

        this.attachEventListeners();
        this.loadData();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const refreshBtn = document.getElementById('refresh-comments-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadData());
        }

        // Filter listeners
        const typeFilter = document.getElementById('comments-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filterType = e.target.value;
                this.renderFilteredComments();
            });
        }

        const sortFilter = document.getElementById('comments-sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.sortOrder = e.target.value;
                this.renderFilteredComments();
            });
        }

        const resetFilter = document.getElementById('comments-reset-filter');
        if (resetFilter) {
            resetFilter.addEventListener('click', () => {
                this.filterType = '';
                this.sortOrder = 'newest';
                if (typeFilter) typeFilter.value = '';
                if (sortFilter) sortFilter.value = 'newest';
                this.renderFilteredComments();
            });
        }
    }

    /**
     * Load all data (pending comments and stats)
     */
    async loadData() {
        await Promise.all([
            this.loadPendingComments(),
            this.loadStats()
        ]);
    }

    /**
     * Load pending comments
     */
    async loadPendingComments() {
        this.container.innerHTML = '<div class="loading-state"><p>Loading...</p></div>';

        const result = await getPendingComments(this.adminToken);

        if (!result.success) {
            this.container.innerHTML = `
                <div class="error-state">
                    <p>${result.error}</p>
                </div>
            `;
            return;
        }

        this.pendingComments = result.data || [];
        this.renderFilteredComments();
    }

    /**
     * Render filtered and sorted comments
     */
    renderFilteredComments() {
        let filteredComments = [...this.pendingComments];

        // Apply type filter
        if (this.filterType) {
            filteredComments = filteredComments.filter(comment => comment.type === this.filterType);
        }

        // Apply sorting
        filteredComments.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return this.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        if (filteredComments.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <p>${this.filterType ? 'No comments match the selected filter.' : '✓ No pending comments! All comments have been reviewed.'}</p>
                </div>
            `;
            return;
        }

        const commentsHtml = filteredComments
            .map(comment => this.renderCommentForApproval(comment))
            .join('');
        
        this.container.innerHTML = `<div class="pending-comments-list">${commentsHtml}</div>`;

        // Attach event listeners to action buttons
        document.querySelectorAll('.comment-approve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                this.handleApprove(commentId);
            });
        });

        document.querySelectorAll('.comment-reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                this.handleReject(commentId);
            });
        });
    }

    /**
     * Load comment statistics
     */
    async loadStats() {
        const result = await getCommentStats(this.adminToken);

        if (result.success) {
            const { total, approved, pending } = result.data;
            
            // Update stats in the new HTML structure
            const statPending = document.getElementById('stat-pending-comments');
            const statTotal = document.getElementById('stat-total-comments');
            const statApprovedToday = document.getElementById('stat-approved-today');
            const statRejectedToday = document.getElementById('stat-rejected-today');
            
            if (statPending) statPending.textContent = pending || 0;
            if (statTotal) statTotal.textContent = total || 0;
            if (statApprovedToday) statApprovedToday.textContent = result.data.approvedToday || 0;
            if (statRejectedToday) statRejectedToday.textContent = result.data.rejectedToday || 0;
            
            // Also update the badge
            const badge = document.getElementById('comments-badge');
            if (badge) badge.textContent = pending || 0;
        }
    }

    /**
     * Render individual comment for approval
     */
    renderCommentForApproval(comment) {
        const formattedDate = new Date(comment.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const targetType = comment.type === 'resource' ? 'Resource' : 'Course';
        const targetId = comment.resourceId || comment.courseId;

        return `
            <div class="pending-comment-item" data-comment-id="${comment._id}">
                <div class="comment-meta">
                    <span class="comment-type-badge">${targetType}</span>
                    <span class="comment-timestamp">${formattedDate}</span>
                </div>
                
                <div class="comment-body">
                    <p class="comment-text">${this.escapeHtml(comment.content)}</p>
                </div>

                <div class="comment-actions">
                    <button 
                        class="comment-approve-btn btn btn-success"
                        data-comment-id="${comment._id}"
                    >
                        ✓ Approve
                    </button>
                    <button 
                        class="comment-reject-btn btn btn-danger"
                        data-comment-id="${comment._id}"
                    >
                        ✕ Reject
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle approving a comment
     */
    async handleApprove(commentId) {
        const btn = document.querySelector(`[data-comment-id="${commentId}"].comment-approve-btn`);
        if (btn) btn.disabled = true;

        const result = await approveComment(commentId, this.adminToken);

        if (result.success) {
            this.showToast('Comment approved successfully', 'success');
            // Remove the comment from the internal array
            this.pendingComments = this.pendingComments.filter(c => c._id !== commentId);
            // Re-render
            this.renderFilteredComments();
            await this.loadStats();
        } else {
            this.showToast(result.error || 'Failed to approve comment', 'error');
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Handle rejecting a comment
     */
    async handleReject(commentId) {
        if (!confirm('Are you sure you want to reject this comment? This action cannot be undone.')) {
            return;
        }

        const btn = document.querySelector(`[data-comment-id="${commentId}"].comment-reject-btn`);
        if (btn) btn.disabled = true;

        const result = await deleteCommentApi(commentId, this.adminToken);

        if (result.success) {
            this.showToast('Comment rejected and deleted', 'success');
            // Remove the comment from the internal array
            this.pendingComments = this.pendingComments.filter(c => c._id !== commentId);
            // Re-render
            this.renderFilteredComments();
            await this.loadStats();
        } else {
            this.showToast(result.error || 'Failed to reject comment', 'error');
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize AdminCommentsPanel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create a single instance of the panel
    const adminCommentsPanel = new AdminCommentsPanel('admin-comments-container');
    
    // Update badge with pending comments count
    const updateBadge = async () => {
        try {
            const result = await getCommentStats(localStorage.getItem('adminToken'));
            if (result.success) {
                const badge = document.getElementById('comments-badge');
                if (badge) {
                    badge.textContent = result.data.pending || 0;
                }
            }
        } catch (error) {
            console.error('Error updating comments badge:', error);
        }
    };
    
    // Update badge immediately and then every 30 seconds
    updateBadge();
    setInterval(updateBadge, 30000);
});
