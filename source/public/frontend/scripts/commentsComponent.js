/**
 * Comments Section Component
 * Reusable component for displaying and managing comments on resources/courses
 */

import {
    submitComment,
    getComments,
    markHelpful
} from '../api/commentsApi.js';

export class CommentsSection {
    constructor(containerId, resourceId = null, courseId = null, type = 'resource') {
        this.container = document.getElementById(containerId);
        this.resourceId = resourceId;
        this.courseId = courseId;
        this.type = type; // 'resource' or 'course'
        this.comments = [];
        this.isLoading = false;

        if (!this.container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }

        this.render();
        this.attachEventListeners();
        this.loadComments();
    }

    /**
     * Render the comments section HTML
     */
    render() {
        this.container.innerHTML = `
            <div class="comments-section">
                <h3 class="comments-title">Comments & Questions</h3>
                
                <div class="comments-form">
                    <div class="comment-input-group">
                        <textarea 
                            id="comment-input" 
                            class="comment-input" 
                            placeholder="Ask a question or share feedback... (your comment will be reviewed before appearing)"
                            rows="3"
                            maxlength="1000"
                        ></textarea>
                        <div class="comment-char-count">
                            <span id="char-count">0</span>/1000
                        </div>
                    </div>
                    <button id="submit-comment-btn" class="btn btn-primary" style="margin-top: 0.75rem;">
                        Post Comment
                    </button>
                    <div id="comment-message" class="submit-message"></div>
                </div>

                <div id="comments-list" class="comments-list">
                    <div class="comments-loading">
                        <p>Loading comments...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const submitBtn = document.getElementById('submit-comment-btn');
        const commentInput = document.getElementById('comment-input');
        const charCount = document.getElementById('char-count');

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmitComment());
        }

        if (commentInput) {
            commentInput.addEventListener('input', (e) => {
                if (charCount) {
                    charCount.textContent = e.target.value.length;
                }
            });
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.handleSubmitComment();
                }
            });
        }
    }

    /**
     * Handle comment submission
     */
    async handleSubmitComment() {
        const input = document.getElementById('comment-input');
        const content = input?.value.trim();

        if (!content) {
            this.showMessage('Please enter a comment', 'error');
            return;
        }

        const btn = document.getElementById('submit-comment-btn');
        if (btn) btn.disabled = true;

        const result = await submitComment(
            content,
            this.resourceId,
            this.courseId,
            this.type
        );

        if (result.success) {
            this.showMessage(result.message || 'Comment submitted and awaiting approval', 'success');
            if (input) input.value = '';
            const charCount = document.getElementById('char-count');
            if (charCount) charCount.textContent = '0';
            // Reload comments after short delay
            setTimeout(() => this.loadComments(), 1000);
        } else {
            const errorMsg = result.errors?.[0] || result.error || 'Failed to submit comment';
            this.showMessage(errorMsg, 'error');
        }

        if (btn) btn.disabled = false;
    }

    /**
     * Load and display comments
     */
    async loadComments() {
        const listContainer = document.getElementById('comments-list');
        if (!listContainer) return;

        this.isLoading = true;
        listContainer.innerHTML = '<div class="comments-loading"><p>Loading comments...</p></div>';

        const result = await getComments(this.resourceId, this.courseId, this.type);

        this.isLoading = false;

        if (!result.success) {
            listContainer.innerHTML = `<div class="comments-error"><p>${result.error}</p></div>`;
            return;
        }

        this.comments = result.data || [];

        if (this.comments.length === 0) {
            listContainer.innerHTML = `
                <div class="comments-empty">
                    <p>No comments yet. Be the first to ask a question!</p>
                </div>
            `;
            return;
        }

        const commentsHtml = this.comments.map(comment => this.renderComment(comment)).join('');
        listContainer.innerHTML = commentsHtml;

        // Attach event listeners to helpful buttons
        document.querySelectorAll('.comment-helpful-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                this.handleMarkHelpful(commentId, btn);
            });
        });
    }

    /**
     * Render individual comment HTML
     */
    renderComment(comment) {
        const formattedDate = new Date(comment.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="comment-item" data-comment-id="${comment._id}">
                <div class="comment-header">
                    <span class="comment-author">Anonymous</span>
                    <span class="comment-date">${formattedDate}</span>
                </div>
                <p class="comment-content">${this.escapeHtml(comment.content)}</p>
                <div class="comment-footer">
                    <button 
                        class="comment-helpful-btn" 
                        data-comment-id="${comment._id}"
                        title="Mark as helpful"
                    >
                        👍 <span class="helpful-count">${comment.helpfulCount || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle marking comment as helpful
     */
    async handleMarkHelpful(commentId, button) {
        button.disabled = true;
        button.style.opacity = '0.6';

        const result = await markHelpful(commentId);

        if (result.success) {
            // Increment count on UI
            const countSpan = button.querySelector('.helpful-count');
            if (countSpan) {
                countSpan.textContent = parseInt(countSpan.textContent) + 1;
            }
        } else if (result.alreadyVoted) {
            this.showMessage('You already marked this as helpful', 'info');
        } else {
            this.showMessage(result.error || 'Failed to mark as helpful', 'error');
        }

        button.disabled = false;
        button.style.opacity = '1';
    }

    /**
     * Show message feedback
     */
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('comment-message');
        if (!messageEl) return;

        messageEl.textContent = message;
        messageEl.className = `submit-message ${type}`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 4000);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Refresh comments
     */
    async refresh() {
        await this.loadComments();
    }
}
