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
    setupSearchableCourseSelect();
    checkURLParameters();
});

// Setup cascading dropdowns
function setupCascadingDropdowns() {
    collegeSelect.addEventListener('change', handleCollegeChange);
    departmentSelect.addEventListener('change', handleDepartmentChange);
}

// Handle college selection
function handleCollegeChange(preventSearchClear = false) {
    const selectedCollege = collegeSelect.value;
    const searchInput = document.getElementById('submit-course-search');
    
    if (!selectedCollege) {
        // Reset department and course dropdowns
        departmentSelect.disabled = true;
        departmentSelect.innerHTML = '<option value="">Select College First</option>';
        courseSelect.disabled = true;
        courseSelect.innerHTML = '<option value="">Select Department First</option>';
        
        // Update search input
        if (searchInput && !preventSearchClear) {
            searchInput.value = '';
            searchInput.placeholder = 'Select college to filter courses...';
            renderCourseOptions();
        }
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
    
    // Update search input and re-render courses
    if (searchInput && !preventSearchClear) {
        searchInput.value = '';
        searchInput.placeholder = 'Type to search courses...';
        renderCourseOptions();
    }
}

// Handle department selection
function handleDepartmentChange(preventSearchClear = false) {
    const selectedCollege = collegeSelect.value;
    const selectedDepartment = departmentSelect.value;
    const searchInput = document.getElementById('submit-course-search');
    
    if (!selectedDepartment) {
        courseSelect.disabled = true;
        courseSelect.innerHTML = '<option value="">Select Department First</option>';
        // Clear search and re-render courses
        if (searchInput && !preventSearchClear) {
            searchInput.value = '';
            renderCourseOptions();
        }
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
    
    // Re-render searchable dropdown with filtered courses
    if (searchInput && !preventSearchClear) {
        searchInput.value = '';
        renderCourseOptions();
    }
}

// Setup searchable course select
function setupSearchableCourseSelect() {
    const searchInput = document.getElementById('submit-course-search');
    const dropdown = document.getElementById('submit-course-dropdown');
    const hiddenSelect = document.getElementById('submit-course-code');
    
    if (!searchInput || !dropdown || !hiddenSelect) {
        console.warn('Searchable select elements not found');
        return;
    }
    
    // Show dropdown on focus or click
    searchInput.addEventListener('focus', () => {
        renderCourseOptions();
        dropdown.classList.add('show');
    });
    
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        renderCourseOptions();
        dropdown.classList.add('show');
    });
    
    // Filter on input
    searchInput.addEventListener('input', () => {
        renderCourseOptions(searchInput.value.toLowerCase());
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// Render course options in searchable dropdown
function renderCourseOptions(searchTerm = '') {
    const dropdown = document.getElementById('submit-course-dropdown');
    const hiddenSelect = document.getElementById('submit-course-code');
    const searchInput = document.getElementById('submit-course-search');
    const selectedCollege = collegeSelect.value;
    const selectedDepartment = departmentSelect.value;
    
    if (!dropdown || !hiddenSelect) return;
    
    // Filter courses based on college and department selection
    let coursesToShow = allCourses;
    
    if (selectedCollege) {
        coursesToShow = coursesToShow.filter(course => course.college === selectedCollege);
    }
    
    if (selectedDepartment) {
        coursesToShow = coursesToShow.filter(course => course.department === selectedDepartment);
    }
    
    // Further filter based on search term
    const filtered = coursesToShow.filter(course => {
        if (!searchTerm) return true;
        const courseText = `${course.courseCode} ${course.courseName}`.toLowerCase();
        return courseText.includes(searchTerm);
    });
    
    // Clear dropdown
    dropdown.innerHTML = '';
    
    if (filtered.length === 0) {
        const message = selectedCollege ? 'No courses found' : 'Select a college to see courses';
        dropdown.innerHTML = `<div class="searchable-select-no-results">${message}</div>`;
        return;
    }
    
    // Sort courses by course code
    filtered.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    
    // Render filtered options
    filtered.forEach(course => {
        const div = document.createElement('div');
        div.className = 'searchable-select-option';
        
        div.innerHTML = `
            <div class="course-code">${course.courseCode}</div>
            <div class="course-name">${course.courseName}</div>
        `;
        
        // Handle selection
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Store the selected course info before any cascading changes
            const selectedCourse = {
                code: course.courseCode,
                name: course.courseName,
                college: course.college,
                department: course.department
            };
            
            // Update college if different (with flag to prevent search clear)
            if (selectedCourse.college !== collegeSelect.value) {
                collegeSelect.value = selectedCourse.college;
                handleCollegeChange(true);
            }
            
            // Update department if different (with flag to prevent search clear)
            if (selectedCourse.department !== departmentSelect.value) {
                departmentSelect.value = selectedCourse.department;
                handleDepartmentChange(true);
            }
            
            // Now set the course values
            hiddenSelect.value = selectedCourse.code;
            searchInput.value = `${selectedCourse.code} - ${selectedCourse.name}`;
            
            // Close the dropdown
            dropdown.classList.remove('show');
        });
        
        dropdown.appendChild(div);
    });
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
        const files = e.target.files;
        if (files.length > 0) {
            // Calculate total size
            const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
            
            // Show file info
            if (files.length === 1) {
                fileNameDisplay.textContent = `Selected: ${files[0].name} (${formatFileSize(files[0].size)})`;
            } else {
                fileNameDisplay.textContent = `Selected: ${files.length} files (${formatFileSize(totalSize)} total) - Will be compressed to ZIP`;
            }
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

// Compress multiple files into a ZIP
async function compressFilesToZip(files, progressCallback) {
    try {
        const zip = new JSZip();
        const courseCode = document.getElementById('submit-course-code').value.trim().toUpperCase().replace(/\s+/g, '');
        const timestamp = new Date().toISOString().slice(0, 10);
        
        // Add each file to the ZIP
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (progressCallback) {
                progressCallback(`Adding ${file.name}... (${i + 1}/${files.length})`);
            }
            zip.file(file.name, file);
        }
        
        // Generate ZIP file
        if (progressCallback) {
            progressCallback('Compressing files...');
        }
        
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
        
        // Create a File object from the Blob
        const zipFileName = `${courseCode}_${timestamp}_resources.zip`;
        return new File([zipBlob], zipFileName, { type: 'application/zip' });
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress files: ' + error.message);
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous messages
    hideMessage();
    
    // Get form data
    const tagsInput = document.getElementById('submit-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const files = fileInput.files;
    const fileUrl = document.getElementById('submit-file-url').value;

    // Validate that either file or URL is provided
    if (files.length === 0 && !fileUrl) {
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
    submitBtn.textContent = files.length > 0 ? 'Uploading...' : 'Submitting...';
    
    try {
        let finalFileUrl, finalFileName, finalFileSize;

        if (files.length > 0) {
            let fileToUpload;
            
            // If multiple files selected, compress them to ZIP
            if (files.length > 1) {
                submitBtn.textContent = 'Compressing files...';
                fileToUpload = await compressFilesToZip(
                    Array.from(files), 
                    (status) => { submitBtn.textContent = status; }
                );
            } else {
                fileToUpload = files[0];
            }
            
            // Check total size
            if (fileToUpload.size > 75 * 1024 * 1024) {
                throw new Error('File size exceeds 75MB limit. Please reduce file size.');
            }
            
            // Direct upload to R2 using presigned URL
            finalFileUrl = await uploadFileDirectly(fileToUpload, submitBtn);
            finalFileName = fileToUpload.name;
            finalFileSize = fileToUpload.size;
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
    
    // Update the searchable input field
    const searchInput = document.getElementById('submit-course-search');
    if (searchInput) {
        const selectedCourse = filteredCourses.find(course => course.courseCode === courseCode);
        if (selectedCourse) {
            searchInput.value = `${selectedCourse.courseCode} - ${selectedCourse.courseName}`;
        }
    }
    
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
