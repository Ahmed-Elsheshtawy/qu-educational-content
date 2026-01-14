import { getCourses, submitResource } from '../api/submitApi.js';

// DOM Elements
const submitForm = document.getElementById('submit-form');
const collegeSelect = document.getElementById('submit-college');
const departmentSelect = document.getElementById('submit-department');
const courseSelect = document.getElementById('submit-course-code');
const submitMessage = document.getElementById('submit-message');
const fileInput = document.getElementById('submit-file');
const fileUrlInput = document.getElementById('submit-file-url');
const fileNameDisplay = document.getElementById('file-name-display');

// Store all courses for filtering
let allCourses = [];

// Load courses on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
    setupFormHandler();
    setupFileInput();
    setupCascadingDropdowns();
    checkURLParameters();
});

// Setup cascading dropdowns
function setupCascadingDropdowns() {
    collegeSelect.addEventListener('change', handleCollegeChange);
    departmentSelect.addEventListener('change', handleDepartmentChange);
}

// Handle college selection
function handleCollegeChange() {
    const selectedCollege = collegeSelect.value;
    
    if (!selectedCollege) {
        // Reset department and course dropdowns
        departmentSelect.disabled = true;
        departmentSelect.innerHTML = '<option value="">Select College First</option>';
        courseSelect.disabled = true;
        courseSelect.innerHTML = '<option value="">Select Department First</option>';
        return;
    }
    
    // Get unique departments for selected college
    const departments = [...new Set(
        allCourses
            .filter(course => course.college === selectedCollege)
            .map(course => course.department)
    )].sort();
    
    // Populate department dropdown
    const departmentOptions = departments
        .map(dept => `<option value="${dept}">${dept}</option>`)
        .join('');
    
    departmentSelect.innerHTML = '<option value="">Select Department</option>' + departmentOptions;
    departmentSelect.disabled = false;
    
    // Reset course dropdown
    courseSelect.disabled = true;
    courseSelect.innerHTML = '<option value="">Select Department First</option>';
}

// Handle department selection
function handleDepartmentChange() {
    const selectedCollege = collegeSelect.value;
    const selectedDepartment = departmentSelect.value;
    
    if (!selectedDepartment) {
        courseSelect.disabled = true;
        courseSelect.innerHTML = '<option value="">Select Department First</option>';
        return;
    }
    
    // Filter courses by college and department
    const filteredCourses = allCourses.filter(course => 
        course.college === selectedCollege && 
        course.department === selectedDepartment
    );
    
    // Populate course dropdown
    const courseOptions = filteredCourses
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
        .map(course => `<option value="${course.courseCode}">${course.courseCode} - ${course.courseName}</option>`)
        .join('');
    
    courseSelect.innerHTML = '<option value="">Select Course</option>' + courseOptions;
    courseSelect.disabled = false;
}

// Load available courses
async function loadCourses() {
    try {
        const courses = await getCourses();
        allCourses = Array.isArray(courses) ? courses : (courses.courses || []);
        
        populateCollegeSelect(allCourses);
        
        // After courses are loaded, pre-fill from URL if params exist
        prefillFromURL();
    } catch (error) {
        console.error('Error loading courses:', error);
        showMessage('Failed to load courses. Please refresh the page.', 'error');
    }
}

// Populate college dropdown
function populateCollegeSelect(courses) {
    // Get unique colleges
    const colleges = [...new Set(courses.map(course => course.college))].sort();
    
    const options = colleges
        .map(college => `<option value="${college}">${college}</option>`)
        .join('');
    
    collegeSelect.innerHTML = '<option value="">Select College</option>' + options;
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

    // Validate required fields
    const courseCode = document.getElementById('submit-course-code').value.trim().toUpperCase().replace(/\s+/g, ''); // Remove all spaces
    const title = document.getElementById('submit-title').value;
    const type = document.getElementById('submit-type').value;
    const year = document.getElementById('submit-year').value;
    
    if (!courseCode || !title || !type || !year) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = submitForm.querySelector('.btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = file ? 'Uploading...' : 'Submitting...';
    
    try {
        let finalFileUrl, finalFileName, finalFileSize;

        if (file) {
            // Direct upload to R2 using presigned URL
            finalFileUrl = await uploadFileDirectly(file, submitBtn);
            finalFileName = file.name;
            finalFileSize = file.size;
        } else {
            finalFileUrl = fileUrl;
            finalFileName = fileUrl.split('/').pop() || 'External File';
            finalFileSize = 0;
        }

        // Submit resource metadata
        submitBtn.textContent = 'Submitting...';
        const response = await fetch('/api/resources/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                courseCode,
                title,
                type,
                year,
                description: document.getElementById('submit-description').value || '',
                tags: JSON.stringify(tags),
                status: 'pending',
                fileUrl: finalFileUrl,
                fileName: finalFileName,
                fileSize: finalFileSize
            })
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, get text response (likely an error page)
            const text = await response.text();
            throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
        }

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

// Upload file directly to R2 using presigned URL
async function uploadFileDirectly(file, submitBtn) {
    try {
        // Request presigned URL from server
        submitBtn.textContent = 'Preparing upload...';
        console.log('Requesting presigned URL for:', file.name, 'Type:', file.type);
        
        const presignedResponse = await fetch('/api/resources/presigned-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type || 'application/octet-stream'
            })
        });

        console.log('Presigned response status:', presignedResponse.status);

        if (!presignedResponse.ok) {
            const error = await presignedResponse.json();
            console.error('Presigned URL error:', error);
            throw new Error(error.error || 'Failed to get upload URL');
        }

        const { uploadUrl, publicUrl } = await presignedResponse.json();
        console.log('Got presigned URL, uploading to R2...');

        // Upload file directly to R2
        submitBtn.textContent = `Uploading ${formatFileSize(file.size)}...`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type || 'application/octet-stream'
            }
        });

        console.log('Upload response status:', uploadResponse.status);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed:', errorText);
            throw new Error('File upload failed: ' + uploadResponse.status);
        }

        console.log('Upload successful! Public URL:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Failed to upload file');
    }
}

// Check URL parameters and store for later use
function checkURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Store params in sessionStorage if they exist
    if (urlParams.has('college')) {
        sessionStorage.setItem('prefill_college', urlParams.get('college'));
    }
    if (urlParams.has('department')) {
        sessionStorage.setItem('prefill_department', urlParams.get('department'));
    }
    if (urlParams.has('courseCode')) {
        sessionStorage.setItem('prefill_courseCode', urlParams.get('courseCode'));
    }
}

// Pre-fill form from URL parameters
function prefillFromURL() {
    const college = sessionStorage.getItem('prefill_college');
    const department = sessionStorage.getItem('prefill_department');
    const courseCode = sessionStorage.getItem('prefill_courseCode');
    
    if (!college || !department || !courseCode) return;
    
    // Clear session storage
    sessionStorage.removeItem('prefill_college');
    sessionStorage.removeItem('prefill_department');
    sessionStorage.removeItem('prefill_courseCode');
    
    // Pre-fill college
    collegeSelect.value = college;
    
    // Trigger college change to populate departments
    const departments = [...new Set(
        allCourses
            .filter(course => course.college === college)
            .map(course => course.department)
    )].sort();
    
    const departmentOptions = departments
        .map(dept => `<option value="${dept}">${dept}</option>`)
        .join('');
    
    departmentSelect.innerHTML = '<option value="">Select Department</option>' + departmentOptions;
    departmentSelect.disabled = false;
    departmentSelect.value = department;
    
    // Trigger department change to populate courses
    const filteredCourses = allCourses.filter(course => 
        course.college === college && 
        course.department === department
    );
    
    const courseOptions = filteredCourses
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
        .map(course => `<option value="${course.courseCode}">${course.courseCode} - ${course.courseName}</option>`)
        .join('');
    
    courseSelect.innerHTML = '<option value="">Select Course</option>' + courseOptions;
    courseSelect.disabled = false;
    courseSelect.value = courseCode;
    
    // Scroll to form
    submitForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
