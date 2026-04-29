// DOM Elements
const courseSubmitForm = document.getElementById('course-submit-form');
const submitMessage = document.getElementById('course-submit-message');
const collegeSelect = document.getElementById('course-college');
const departmentSelect = document.getElementById('course-department');

// Qatar University Colleges and Departments
const qatarUniversityData = {
    "College of Arts and Sciences": [
        "Arabic Language Department",
        "Biological & Environmental Sciences Department",
        "Chemistry & Earth Sciences Department",
        "English Literature and Linguistics Department",
        "Humanities Department",
        "International Affairs Department",
        "Mass Communication Department",
        "Mathematics and Statistics Department",
        "Physics and Material Sciences Department",
        "Social Sciences Department"
    ],
    "College of Business and Economics": [
        "Accounting and Information Systems Department",
        "Finance and Economics Department",
        "Management and Marketing Department"
    ],
    "College of Education": [
        "Educational Sciences Department",
        "Psychological Sciences Department",
        "Physical Education Department",
        "Art Education Department"
    ],
    "College of Engineering": [
        "Architecture and Urban Planning Department",
        "Chemical Engineering Department",
        "Civil and Environmental Engineering Department",
        "Computer Science & Engineering Department",
        "Electrical Engineering Department",
        "Mechanical and Industrial Engineering Department"
    ],
    "College of Health Sciences": [
        "Biomedical Sciences Department",
        "Public Health Department",
        "Physical Therapy & Rehabilitation Science Department",
        "Human Nutrition Department"
    ],
    "College of Law": [
        "Private Law Department",
        "Public Law Department",
        "Legal Skills Department"
    ],
    "College of Medicine": [
        "Basic Medical Sciences Department",
        "Population Medicine Department"
    ],
    "College of Pharmacy": [
        "Clinical Pharmacy and Pharmacy Practice Department",
        "Pharmacognosy Department",
        "Medicinal Chemistry Department",
        "Pharmacology Department",
        "Pharmacokinetics Department",
        "Pharmaceutics Department"
    ],
    "College of Sharia and Islamic Studies": [
        "Islamic Jurisprudence Department",
        "Islamic Culture & Preaching Department",
        "Foundations of Islam Department"
    ],
    "College of Nursing": [
        "Nursing Department"
    ],
    "College of Dental Medicine": [
        "Dental Medicine Department"
    ],
    "College of Sport Sciences": [
        "Sports Coaching Department",
        "Sports Management Department"
    ]
};

// Setup form handler on page load
function initializeCourseSubmitForm() {
    // Check if elements exist (view might not be visible yet)
    if (!document.getElementById('course-college')) {
        // Elements not in DOM yet, wait a bit and try again
        setTimeout(initializeCourseSubmitForm, 100);
        return;
    }
    
    populateCollegeSelect();
    setupFormHandler();
    setupCourseCodeFormatter();
    setupCascadingDropdowns();
}

// Initialize when DOM is ready (handles both already loaded and still loading)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCourseSubmitForm);
} else {
    initializeCourseSubmitForm();
}

// Populate college dropdown
function populateCollegeSelect() {
    const colleges = Object.keys(qatarUniversityData).sort();
    
    const options = colleges
        .map(college => `<option value="${college}">${college}</option>`)
        .join('');
    
    collegeSelect.innerHTML = '<option value="">Select College</option>' + options;
}

// Setup cascading dropdowns
function setupCascadingDropdowns() {
    collegeSelect.addEventListener('change', handleCollegeChange);
}

// Handle college selection
function handleCollegeChange() {
    const selectedCollege = collegeSelect.value;
    
    if (!selectedCollege) {
        departmentSelect.disabled = true;
        departmentSelect.innerHTML = '<option value="">Select College First</option>';
        return;
    }
    
    // Get departments for selected college
    const departments = qatarUniversityData[selectedCollege] || [];
    
    // Populate department dropdown
    const departmentOptions = departments
        .map(dept => `<option value="${dept}">${dept}</option>`)
        .join('');
    
    departmentSelect.innerHTML = '<option value="">Select Department</option>' + departmentOptions;
    departmentSelect.disabled = false;
}

// Setup form submission handler
function setupFormHandler() {
    courseSubmitForm.addEventListener('submit', handleSubmit);
}

// Auto-format course code as user types
function setupCourseCodeFormatter() {
    const courseCodeInput = document.getElementById('course-code');
    
    courseCodeInput.addEventListener('input', (e) => {
        // Convert to uppercase
        let value = e.target.value.toUpperCase();
        
        // Remove any characters that aren't letters or numbers
        value = value.replace(/[^A-Z0-9]/g, '');
        
        // Format: 4 letters + 3 numbers
        if (value.length > 4) {
            value = value.substring(0, 4) + value.substring(4, 7);
        }
        
        e.target.value = value;
        
        // Validate format
        if (value.length === 7) {
            const isValid = /^[A-Z]{4}[0-9]{3}$/.test(value);
            if (!isValid) {
                e.target.setCustomValidity('Course code must be 4 letters followed by 3 numbers');
            } else {
                e.target.setCustomValidity('');
            }
        } else if (value.length > 0) {
            e.target.setCustomValidity('Course code must be 7 characters (4 letters + 3 numbers)');
        } else {
            e.target.setCustomValidity('');
        }
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous messages
    hideMessage();
    
    // Get form data
    const formData = {
        college: document.getElementById('course-college').value.trim(),
        department: document.getElementById('course-department').value.trim(),
        courseCode: document.getElementById('course-code').value.trim().toUpperCase().replace(/\s+/g, ''), // Remove all spaces
        courseName: document.getElementById('course-name').value.trim(),
        status: 'pending',
        submittedAt: new Date().toISOString()
    };
    
    // Validate required fields
    if (!formData.college || !formData.department || !formData.courseCode || !formData.courseName) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Validate course code format
    if (!/^[A-Z]{4}[0-9]{3}$/.test(formData.courseCode)) {
        showMessage('Invalid course code format. Must be 4 letters followed by 3 numbers (e.g., CMPS251).', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = courseSubmitForm.querySelector('.btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        // Submit course request
        const response = await fetch('/api/courses/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Check if it's a duplicate course error
            if (response.status === 409) {
                throw new Error('This course already exists in the database.');
            }
            throw new Error(data.error || 'Failed to submit course request');
        }
        
        // Show success message
        showMessage(
            data.message || 'Your course request is under review. An admin will approve it soon.',
            'success'
        );
        
        // Reset form
        courseSubmitForm.reset();
        
        // Refresh page after 5 seconds
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
    } catch (error) {
        console.error('Submission error:', error);
        showMessage(
            error.message || 'Failed to submit course request. Please check your connection and try again.',
            'error'
        );
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
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
