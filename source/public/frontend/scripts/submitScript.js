import { getCourses, submitResource } from '../api/submitApi.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Maximum allowed file size for uploads (150MB)
 */
const MAX_FILE_SIZE = 150 * 1024 * 1024;

/**
 * Redirect delay after successful submission (milliseconds)
 */
const REDIRECT_DELAY = 500;

// ============================================================================
// DOM ELEMENTS & STATE
// ============================================================================

// Form elements
const submitForm = document.getElementById('submit-form');
const submitMessage = document.getElementById('submit-message');

// Dropdown elements
const collegeSelect = document.getElementById('submit-college');
const departmentSelect = document.getElementById('submit-department');
const courseSelect = document.getElementById('submit-course-code');

// File input elements
const fileInput = document.getElementById('submit-file');
const folderInput = document.getElementById('submit-folder');
const fileUrlInput = document.getElementById('submit-file-url');
const fileNameDisplay = document.getElementById('file-name-display');

// Application state
let allCourses = []; // Stores all available courses for filtering
let dragAndDropFiles = []; // Stores files from drag and drop operations

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application when DOM is ready
 * Sets up event handlers and loads initial data
 */
function initializeSubmitForm() {
    // Check if elements exist (view might not be visible yet)
    if (!document.getElementById('submit-year')) {
        // Elements not in DOM yet, wait a bit and try again
        setTimeout(initializeSubmitForm, 100);
        return;
    }
    
    // Set current year as default
    document.getElementById('submit-year').value = new Date().getFullYear();
    
    // Initialize all components
    loadCourses();
    setupFormHandler();
    setupFileInput();
    setupCascadingDropdowns();
    setupSearchableCourseSelect();
    checkURLParameters();
}

// Initialize when DOM is ready (handles both already loaded and still loading)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSubmitForm);
} else {
    initializeSubmitForm();
}

// ============================================================================
// CASCADING DROPDOWN MANAGEMENT
// ============================================================================

/**
 * Setup cascading dropdown behavior
 * College → Department → Course hierarchy
 */
function setupCascadingDropdowns() {
    collegeSelect.addEventListener('change', handleCollegeChange);
    departmentSelect.addEventListener('change', handleDepartmentChange);
}

/**
 * Handle college selection change
 * Updates available departments and resets course selection
 * 
 * @param {boolean} preventSearchClear - If true, preserves search input value
 */
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

/**
 * Handle department selection change
 * Updates available courses based on selected college and department
 * 
 * @param {boolean} preventSearchClear - If true, preserves search input value
 */
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

// ============================================================================
// SEARCHABLE COURSE SELECT
// ============================================================================

/**
 * Setup searchable/filterable course dropdown
 * Provides type-ahead search functionality for course selection
 */
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

/**
 * Render filtered course options in the searchable dropdown
 * Filters by college, department, and search term
 * 
 * @param {string} searchTerm - Optional search query to filter courses
 */
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

// ============================================================================
// COURSE DATA MANAGEMENT
// ============================================================================

/**
 * Load all available courses from the API
 * Populates college dropdown and stores courses for filtering
 */
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

/**
 * Populate the college dropdown with unique colleges from courses
 * 
 * @param {Array} courses - Array of course objects
 */
function populateCollegeSelect(courses) {
    // Get unique colleges
    const colleges = [...new Set(courses.map(course => course.college))].sort();
    
    const options = colleges
        .map(college => `<option value="${college}">${college}</option>`)
        .join('');
    
    collegeSelect.innerHTML = '<option value="">Select College</option>' + options;
}

// ============================================================================
// FILE HANDLING
// ============================================================================

/**
 * Setup form submission event handler
 */
function setupFormHandler() {
    submitForm.addEventListener('submit', handleSubmit);
}

/**
 * Setup file input handlers for file/folder selection and drag-and-drop
 * Manages file selection from multiple sources: file picker, folder picker, drag-and-drop
 */
function setupFileInput() {
    /**
     * Handle file selection from any source
     * Clears other input methods and displays file information
     * 
     * @param {FileList|File[]} files - Selected files
     * @param {string} source - Source of selection: 'file', 'folder', or 'drag'
     */
    const handleFiles = (files, source) => {
        // Clear other file input sources to prevent conflicts
        if (source === 'file') {
            dragAndDropFiles = [];
            if (folderInput) folderInput.value = '';
        } else if (source === 'folder') {
            dragAndDropFiles = [];
            if (fileInput) fileInput.value = '';
        } else if (source === 'drag') {
            if (fileInput) fileInput.value = '';
            if (folderInput) folderInput.value = '';
        }

        if (files.length > 0) {
            const isFolder = source === 'folder';
            const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
            
            // Display appropriate message based on selection type
            if (files.length === 1 && !isFolder && source !== 'drag') {
                // Single file selected
                fileNameDisplay.textContent = `Selected: ${files[0].name} (${formatFileSize(files[0].size)})`;
            } else {
                // Multiple files or folder - will be compressed to ZIP
                fileNameDisplay.textContent = `Selected: ${isFolder ? 'Folder with ' : ''}${files.length} files (${formatFileSize(totalSize)} total) - Will be compressed to ZIP`;
            }
            fileNameDisplay.style.display = 'block';
            
            // Disable URL input when files are selected
            fileUrlInput.value = '';
            fileUrlInput.disabled = true;
        } else {
            fileNameDisplay.style.display = 'none';
            fileUrlInput.disabled = false;
        }
    };

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, 'file');
    });

    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            handleFiles(e.target.files, 'folder');
        });
    }

    // ========================================================================
    // Drag and Drop Zone Setup
    // ========================================================================
    
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        // Prevent default drag behaviors for all drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Visual feedback: highlight zone during drag
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.style.backgroundColor = '#f0f8ff';
            dropZone.style.borderColor = '#007bff';
        }

        function unhighlight(e) {
            dropZone.style.backgroundColor = 'transparent';
            dropZone.style.borderColor = '#ccc';
        }

        // Handle dropped files and folders
        dropZone.addEventListener('drop', handleDrop, false);

        /**
         * Handle file/folder drop event
         * Recursively traverses dropped folders to collect all files
         * 
         * @param {DragEvent} e - Drop event
         */
        async function handleDrop(e) {
            const items = e.dataTransfer.items;
            const collectedFiles = [];
            
            if (items) {
                // Use DataTransferItemList interface for folder support
                const promises = [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : items[i].getAsEntry();
                    if (item) {
                        promises.push(traverseFileTree(item, item.name, collectedFiles));
                    }
                }
                await Promise.all(promises);
            } else {
                // Fallback: Use DataTransfer interface (no folder support)
                for (let i = 0; i < e.dataTransfer.files.length; i++) {
                    collectedFiles.push(e.dataTransfer.files[i]);
                }
            }
            
            dragAndDropFiles = collectedFiles;
            handleFiles(collectedFiles, 'drag');
        }

        /**
         * Recursively traverse file tree for drag-and-drop folders
         * Preserves folder structure by maintaining relative paths
         * 
         * @param {FileSystemEntry} item - File or directory entry
         * @param {string} path - Current relative path
         * @param {File[]} collectedFiles - Array to collect files into
         * @returns {Promise<void>}
         */
        function traverseFileTree(item, path, collectedFiles) {
            return new Promise((resolve, reject) => {
                if (item.isFile) {
                    // Process file: attach path and add to collection
                    item.file(file => {
                        // Attach relative path to maintain folder structure in ZIP
                        Object.defineProperty(file, 'webkitRelativePath', {
                            value: path,
                            writable: true
                        });
                        collectedFiles.push(file);
                        resolve();
                    });
                } else if (item.isDirectory) {
                    // Process directory: recursively read all entries
                    const dirReader = item.createReader();
                    const readEntries = () => {
                        dirReader.readEntries(async (entries) => {
                            if (entries.length > 0) {
                                // Process all entries in this batch
                                const promises = [];
                                for (let i = 0; i < entries.length; i++) {
                                    promises.push(traverseFileTree(entries[i], path + "/" + entries[i].name, collectedFiles));
                                }
                                await Promise.all(promises);
                                // Continue reading (large directories may require multiple batches)
                                readEntries();
                            } else {
                                // No more entries, directory is complete
                                resolve();
                            }
                        }, reject);
                    };
                    readEntries();
                }
            });
        }
    }

    // ========================================================================
    // File/URL Input Toggle
    // ========================================================================
    
    // Disable file inputs when URL is provided (and vice versa)
    fileUrlInput.addEventListener('input', () => {
        const hasUrl = !!fileUrlInput.value;
        const formGroup = document.querySelector('label[for="submit-file"]').parentNode;
        const buttons = formGroup.querySelectorAll('button');
        if (hasUrl) {
            dropZone.style.opacity = '0.5';
            dropZone.style.pointerEvents = 'none';
            buttons.forEach(btn => btn.disabled = true);
        } else {
            dropZone.style.opacity = '1';
            dropZone.style.pointerEvents = 'auto';
            buttons.forEach(btn => btn.disabled = false);
        }
    });
}

/**
 * Format file size in human-readable format
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string (e.g., "15.5 MB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate a standardized filename with course code, date, and time
 * Format: CourseCode_YYYY-MM-DD_HH-MM-SS_resources.extension
 * 
 * @param {string} courseCode - Course code (e.g., ELEC201, CMPS205)
 * @param {string} fileExtension - File extension (e.g., pdf, zip)
 * @returns {string} Standardized filename
 */
function generateStandardFilename(courseCode, fileExtension) {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    return `${courseCode}_${timestamp}_resources.${fileExtension}`;
}

/**
 * Rename a file with a standardized name
 * Creates a new File object with the same content but different name
 * 
 * @param {File} file - Original file
 * @param {string} newFileName - New filename
 * @returns {File} New file with updated name
 */
function renameFile(file, newFileName) {
    return new File([file], newFileName, { type: file.type });
}

/**
 * Compress multiple files into a single ZIP archive
 * Generates a unique filename based on course code and timestamp
 * 
 * @param {File[]} files - Array of files to compress
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<File>} ZIP file with all compressed content
 */
async function compressFilesToZip(files, progressCallback) {
    try {
        const zip = new JSZip();
        const courseCode = document.getElementById('submit-course-code').value.trim().toUpperCase().replace(/\s+/g, '');
        
        // Add each file to the ZIP
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = file.webkitRelativePath || file.name;
            if (progressCallback) {
                progressCallback(`Adding ${relativePath}... (${i + 1}/${files.length})`);
            }
            zip.file(relativePath, file);
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
        
        // Create a File object with standardized filename
        const zipFileName = generateStandardFilename(courseCode, 'zip');
        return new File([zipBlob], zipFileName, { type: 'application/zip' });
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress files: ' + error.message);
    }
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

/**
 * Handle form submission for resource upload
 * Validates input, compresses files if needed, uploads to R2, and submits metadata
 * 
 * @param {Event} e - Form submit event
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous messages
    hideMessage();
    
    // Get form data
    const tagsInput = document.getElementById('submit-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    let files = [];
    if (dragAndDropFiles && dragAndDropFiles.length > 0) {
        files = dragAndDropFiles;
    } else if (folderInput && folderInput.files.length > 0) {
        files = folderInput.files;
    } else if (fileInput && fileInput.files.length > 0) {
        files = fileInput.files;
    }
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
                // Single file: rename it with standardized format
                const originalFile = files[0];
                const fileExtension = originalFile.name.split('.').pop();
                const standardFileName = generateStandardFilename(courseCode, fileExtension);
                fileToUpload = renameFile(originalFile, standardFileName);
            }
            
            // Validate file size
            if (fileToUpload.size > MAX_FILE_SIZE) {
                throw new Error('File size exceeds 150MB limit. Please reduce file size.');
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
        
        // Redirect to home page after short delay
        setTimeout(() => {
            window.location.reload();
        }, REDIRECT_DELAY);
        
    } catch (error) {
        console.error('Submission error:', error);
        showMessage(error.message || 'Network error. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Resource';
    }
}

/**
 * Upload file directly to Cloudflare R2 using presigned URL
 * Two-step process: 1) Get presigned URL from server, 2) Upload to R2
 * 
 * @param {File} file - File to upload
 * @param {HTMLElement} submitBtn - Submit button for status updates
 * @returns {Promise<string>} Public URL of uploaded file
 */
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

// ============================================================================
// URL PARAMETER HANDLING
// ============================================================================

/**
 * Check URL parameters and store for later use
 * Allows pre-filling form from URL query parameters
 */
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

/**
 * Pre-fill form fields from stored URL parameters
 * Automatically selects college, department, and course if provided in URL
 */
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Display a message to the user
 * 
 * @param {string} message - Message text to display
 * @param {string} type - Message type ('success', 'error', 'info')
 */
function showMessage(message, type) {
    submitMessage.textContent = message;
    submitMessage.className = `submit-message ${type}`;
    submitMessage.style.display = 'block';
    
    // Scroll to message for visibility
    submitMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide the message display
 */
function hideMessage() {
    submitMessage.style.display = 'none';
    submitMessage.className = 'submit-message';
}
