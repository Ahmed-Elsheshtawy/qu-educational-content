import { getCourses, submitResource } from '../api/submitApi.js';

// DOM Elements
const submitForm = document.getElementById('submit-form');
const courseSelect = document.getElementById('submit-course-code');
const submitMessage = document.getElementById('submit-message');
const fileInput = document.getElementById('submit-file');
const fileUrlInput = document.getElementById('submit-file-url');
const fileNameDisplay = document.getElementById('file-name-display');

// Load courses on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
    setupFormHandler();
    setupFileInput();
});

// Load available courses
async function loadCourses() {
    try {
        const courses = await getCourses();
        const coursesArray = Array.isArray(courses) ? courses : (courses.courses || []);
        
        populateCourseSelect(coursesArray);
    } catch (error) {
        console.error('Error loading courses:', error);
        showMessage('Failed to load courses. Please refresh the page.', 'error');
    }
}

// Populate course dropdown
function populateCourseSelect(courses) {
    const options = courses
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
        .map(course => `<option value="${course.courseCode}">${course.courseCode} - ${course.courseName}</option>`)
        .join('');
    
    courseSelect.innerHTML = '<option value="">Select Course</option>' + options;
}

// Setup form submission handler
function setupFormHandler() {
    submitForm.addEventListener('submit', handleSubmit);
}

// Setup file input handler
function setupFileInput() {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Show file name
            fileNameDisplay.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
            fileNameDisplay.style.display = 'block';
            
            // Clear URL input if file is selected
            fileUrlInput.value = '';
            fileUrlInput.disabled = true;
        } else {
            fileNameDisplay.style.display = 'none';
            fileUrlInput.disabled = false;
        }
    });

    // Enable file input when URL is cleared
    fileUrlInput.addEventListener('input', () => {
        if (fileUrlInput.value) {
            fileInput.disabled = true;
        } else {
            fileInput.disabled = false;
        }
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous messages
    hideMessage();
    
    // Get form data
    const tagsInput = document.getElementById('submit-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const file = fileInput.files[0];
    const fileUrl = document.getElementById('submit-file-url').value;

    // Validate that either file or URL is provided
    if (!file && !fileUrl) {
        showMessage('Please either upload a file or provide a file URL.', 'error');
        return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('courseCode', document.getElementById('submit-course-code').value);
    formData.append('title', document.getElementById('submit-title').value);
    formData.append('type', document.getElementById('submit-type').value);
    formData.append('year', document.getElementById('submit-year').value);
    formData.append('description', document.getElementById('submit-description').value || '');
    formData.append('tags', JSON.stringify(tags));
    formData.append('status', 'pending');

    if (file) {
        formData.append('file', file);
    } else {
        formData.append('fileUrl', fileUrl);
    }
    
    // Validate required fields
    if (!formData.get('courseCode') || !formData.get('title') || !formData.get('type') || !formData.get('year')) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = submitForm.querySelector('.btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = file ? 'Uploading...' : 'Submitting...';
    
    try {
        const response = await fetch('/api/resources/submit', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit resource');
        }
        
        showMessage('Thank you! Your resource has been submitted and is pending review. You will be redirected to the home page...', 'success');
        submitForm.reset();
        fileNameDisplay.style.display = 'none';
        fileInput.disabled = false;
        fileUrlInput.disabled = false;
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    } catch (error) {
        console.error('Submission error:', error);
        showMessage(error.message || 'Network error. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Resource';
    }
}

// Show message
function showMessage(message, type) {
    submitMessage.textContent = message;
    submitMessage.className = `submit-message ${type}`;
    submitMessage.style.display = 'block';
    
    // Scroll to message
    submitMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Hide message
function hideMessage() {
    submitMessage.style.display = 'none';
    submitMessage.className = 'submit-message';
}
