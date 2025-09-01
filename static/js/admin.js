// Admin.js - Updated to use Flask backend with storage/ directory

function logoutAdmin() {
    // Remove any session data (if using sessions later)
    sessionStorage.removeItem("isAdminLoggedIn");
    window.location.href = "/subject";
}

// Tab switching functionality
function showAdminSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected section and activate tab
    document.getElementById(sectionName + '-section').classList.add('active');
    event.target.classList.add('active');
    
    // Initialize specific sections
    if (sectionName === 'manage') {
        setTimeout(() => initializeManageSection(), 100);
    } else if (sectionName === 'overview') {
        setTimeout(() => initializeOverview(), 100);
    }
}

// Toggle new subject input
function toggleNewSubject() {
    const select = document.getElementById('subjectSelect');
    const newSubjectGroup = document.getElementById('newSubjectGroup');
    
    if (select.value === 'new') {
        newSubjectGroup.style.display = 'block';
        document.getElementById('newSubjectName').required = true;
    } else {
        newSubjectGroup.style.display = 'none';
        document.getElementById('newSubjectName').required = false;
        document.getElementById('newSubjectName').value = '';
    }
}

// Auto-calculate topics count
document.addEventListener('DOMContentLoaded', function() {
    const unitTopicsInput = document.getElementById('unitTopics');
    if (unitTopicsInput) {
        unitTopicsInput.addEventListener('input', function() {
            const topics = this.value.split(',').filter(topic => topic.trim() !== '');
            document.getElementById('topicsCount').value = topics.length;
        });
    }
});

// Handle file selection and drag & drop
function handleFileSelect(input) {
    const fileInfo = document.getElementById('fileInfo');
    const fileInfoText = document.getElementById('fileInfoText');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        
        fileInfoText.innerHTML = `
            <i class="fas fa-file-check"></i> 
            <strong>${file.name}</strong> (${fileSize} MB)
        `;
        fileInfo.style.display = 'block';
        
        // Update upload area appearance
        const uploadArea = document.getElementById('fileUploadArea');
        uploadArea.style.borderColor = '#27ae60';
        uploadArea.style.background = 'rgba(39, 174, 96, 0.05)';
    } else {
        fileInfo.style.display = 'none';
        resetFileUploadArea();
    }
}

function resetFileUploadArea() {
    const uploadArea = document.getElementById('fileUploadArea');
    uploadArea.style.borderColor = '#bdc3c7';
    uploadArea.style.background = '#f8f9fa';
}

// Drag and drop functionality
document.addEventListener('DOMContentLoaded', function() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    
    if (fileUploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            fileUploadArea.classList.add('dragover');
        }

        function unhighlight(e) {
            fileUploadArea.classList.remove('dragover');
        }

        fileUploadArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            document.getElementById('notesFile').files = files;
            handleFileSelect(document.getElementById('notesFile'));
        }
    }
});

// Form submission - Updated to use Flask backend
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            
            const subjectSelect = document.getElementById('subjectSelect').value;
            const newSubjectName = document.getElementById('newSubjectName').value;
            const subject = subjectSelect === 'new' ? newSubjectName.toLowerCase().replace(/\s+/g, '-') : subjectSelect;
            const subjectDisplay = subjectSelect === 'new' ? newSubjectName : getSubjectDisplayName(subjectSelect);
            
            if (!subject) {
                showError('Please select or enter a subject name');
                resetSubmitButton();
                return;
            }

            // Validate required fields
            const unitTitle = document.getElementById('unitTitle').value;
            const unitDescription = document.getElementById('unitDescription').value;
            const unitTopics = document.getElementById('unitTopics').value;
            const pagesCount = document.getElementById('pagesCount').value;

            if (!unitTitle || !unitDescription || !unitTopics || !pagesCount) {
                showError('Please fill in all required fields');
                resetSubmitButton();
                return;
            }

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('subjectDisplay', subjectDisplay);
            formData.append('unitNumber', document.getElementById('unitNumber').value);
            formData.append('unitIcon', document.getElementById('unitIcon').value || 'fas fa-book');
            formData.append('unitTitle', unitTitle);
            formData.append('unitDescription', unitDescription);
            formData.append('unitTopics', unitTopics);
            formData.append('pagesCount', pagesCount);
            
            // Add file if selected
            const fileInput = document.getElementById('notesFile');
            if (fileInput.files[0]) {
                formData.append('file', fileInput.files[0]);
            }

            // Send to Flask backend
            createUnitViaAPI(formData);
        });
    }
});

// API call to create unit via Flask backend
async function createUnitViaAPI(formData) {
    try {
        const response = await fetch('/api/unit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(result.message);
            resetForm();
            updateSubjectSelector();
            
            // Update statistics if on overview tab
            const overviewSection = document.getElementById('overview-section');
            if (overviewSection && overviewSection.classList.contains('active')) {
                refreshOverviewStats();
            }
        } else {
            showError(result.message || 'Failed to create unit');
        }

    } catch (error) {
        console.error('Error creating unit:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        resetSubmitButton();
    }
}

function getSubjectDisplayName(subjectKey) {
    const displayNames = {
        'tamil': 'Tamil',
        'english': 'English',
        'statistics': 'Statistics',
        'java': 'Java',
        'html': 'HTML'
    };
    return displayNames[subjectKey] || subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1);
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Unit';
}

// Updated to load from Flask backend
async function updateSubjectSelector() {
    try {
        const response = await fetch('/api/subjects');
        const notesData = await response.json();
        
        const subjectSelect = document.getElementById('subjectSelect');
        
        // Clear existing options except default and "create new"
        const existingOptions = Array.from(subjectSelect.options);
        const defaultOption = existingOptions[0];
        const newOption = existingOptions[existingOptions.length - 1];
        
        subjectSelect.innerHTML = '';
        subjectSelect.appendChild(defaultOption);
        
        // Add subjects from backend
        Object.keys(notesData).forEach(subjectKey => {
            const option = document.createElement('option');
            option.value = subjectKey;
            option.textContent = notesData[subjectKey].displayName;
            subjectSelect.appendChild(option);
        });
        
        // Re-add "create new" option
        subjectSelect.appendChild(newOption);
        
    } catch (error) {
        console.error('Error updating subject selector:', error);
    }
}

function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    if (successMsg) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
        const errorMsg = document.getElementById('errorMessage');
        if (errorMsg) errorMsg.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 5000);
    }
}

function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        const successMsg = document.getElementById('successMessage');
        if (successMsg) successMsg.style.display = 'none';
    }
}

function resetForm() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.reset();
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('newSubjectGroup').style.display = 'none';
        document.getElementById('topicsCount').value = '';
        resetFileUploadArea();
    }
}

// Initialize page - Updated to load from backend
document.addEventListener('DOMContentLoaded', function() {
    // Set default icon if not provided
    const unitIcon = document.getElementById('unitIcon');
    if (unitIcon) {
        unitIcon.placeholder = 'Default: fas fa-book';
    }
    
    // Initialize subject selector with existing subjects
    updateSubjectSelector();
});

// Manage Section Functions - Updated to use Flask backend
function refreshManageData() {
    loadManageData();
    updateSubjectFilter();
    
    // Add refresh animation
    const refreshBtn = document.querySelector('.refresh-btn i');
    if (refreshBtn) {
        refreshBtn.style.animation = 'spin 1s linear';
        setTimeout(() => {
            refreshBtn.style.animation = '';
        }, 1000);
    }
}

async function loadManageData() {
    const container = document.getElementById('manageDataContainer');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (!container) return;
    
    try {
        const response = await fetch('/api/subjects');
        const notesData = await response.json();
        
        // Clear existing content
        container.innerHTML = '';
        
        if (Object.keys(notesData).length === 0) {
            if (noDataMessage) noDataMessage.style.display = 'block';
            container.style.display = 'none';
            return;
        }
        
        if (noDataMessage) noDataMessage.style.display = 'none';
        container.style.display = 'block';
        
        // Create subject cards
        Object.keys(notesData).forEach(subjectKey => {
            const subject = notesData[subjectKey];
            const subjectCard = createSubjectCard(subjectKey, subject);
            container.appendChild(subjectCard);
        });
        
    } catch (error) {
        console.error('Error loading manage data:', error);
        showError('Failed to load data from server');
    }
}

async function updateSubjectFilter() {
    try {
        const response = await fetch('/api/subjects');
        const notesData = await response.json();
        const filter = document.getElementById('subjectFilter');
        
        if (!filter) return;
        
        const currentValue = filter.value;
        
        // Clear existing options except "All Subjects"
        filter.innerHTML = '<option value="">All Subjects</option>';
        
        // Add subjects from backend
        Object.keys(notesData).forEach(subjectKey => {
            const option = document.createElement('option');
            option.value = subjectKey;
            option.textContent = notesData[subjectKey].displayName;
            filter.appendChild(option);
        });
        
        // Restore previous selection if still valid
        filter.value = currentValue;
        
    } catch (error) {
        console.error('Error updating subject filter:', error);
    }
}

function createSubjectCard(subjectKey, subject) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.setAttribute('data-subject', subjectKey);
    
    card.innerHTML = `
        <div class="subject-header" onclick="toggleSubject('${subjectKey}')">
            <div class="subject-info">
                <h3 class="subject-name">${subject.displayName}</h3>
                <div class="subject-stats">${subject.units.length} units</div>
            </div>
            <div class="subject-actions">
                <button class="action-btn" onclick="event.stopPropagation(); deleteSubject('${subjectKey}')" title="Delete Subject">
                    <i class="fas fa-trash"></i>
                </button>
                <div class="expand-icon">
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
        </div>
        <div class="units-container">
            ${subject.units.map(unit => createUnitHTML(subjectKey, unit)).join('')}
        </div>
    `;
    
    return card;
}

function createUnitHTML(subjectKey, unit) {
    const createdDate = new Date(unit.createdAt).toLocaleDateString();
    const fileSize = unit.fileSize ? (unit.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'No file';
    
    return `
        <div class="unit-item" data-unit-id="${unit.id}">
            <div class="unit-header-row">
                <div class="unit-main-info">
                    <div class="unit-title-row">
                        <div class="unit-icon">
                            <i class="${unit.icon}"></i>
                        </div>
                        <div class="unit-number">Unit ${unit.number}</div>
                        <h4 class="unit-title">${unit.title}</h4>
                    </div>
                    <p class="unit-description">${unit.description}</p>
                    <div class="unit-meta">
                        <div class="unit-meta-item">
                            <i class="fas fa-list"></i>
                            ${unit.topicsCount} topics
                        </div>
                        <div class="unit-meta-item">
                            <i class="fas fa-file-alt"></i>
                            ${unit.pagesCount} pages
                        </div>
                        <div class="unit-meta-item">
                            <i class="fas fa-calendar"></i>
                            Created ${createdDate}
                        </div>
                        <div class="unit-meta-item">
                            <i class="fas fa-hdd"></i>
                            ${fileSize}
                        </div>
                    </div>
                    <div class="unit-topics">
                        <div class="unit-topics-title">Topics:</div>
                        <div class="unit-topics-list">${unit.topics}</div>
                    </div>
                </div>
                <div class="unit-actions">
                    <button class="unit-action-btn edit" onclick="editUnit('${subjectKey}', ${unit.id})" title="Edit Unit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="unit-action-btn replace" onclick="replaceFile('${subjectKey}', ${unit.id})" title="Replace File">
                        <i class="fas fa-file-upload"></i>
                    </button>
                    <button class="unit-action-btn delete" onclick="deleteUnit('${subjectKey}', ${unit.id})" title="Delete Unit">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Delete unit via API
async function deleteUnit(subjectKey, unitId) {
    try {
        const response = await fetch('/api/subjects');
        const notesData = await response.json();
        const unit = notesData[subjectKey].units.find(u => u.id == unitId);
        
        if (!unit) return;
        
        if (confirm(`Are you sure you want to delete the unit "${unit.title}"? This action cannot be undone.`)) {
            const deleteResponse = await fetch(`/api/unit/${subjectKey}/${unitId}`, {
                method: 'DELETE'
            });
            
            const result = await deleteResponse.json();
            
            if (result.success) {
                // Refresh display
                loadManageData();
                updateSubjectFilter();
                updateSubjectSelector();
                showSuccess('Unit deleted successfully!');
            } else {
                showError(result.message || 'Failed to delete unit');
            }
        }
    } catch (error) {
        console.error('Error deleting unit:', error);
        showError('Network error while deleting unit');
    }
}

// Other functions remain the same but need to be adapted for API calls...
// (toggleSubject, filterContent, editUnit, replaceFile, etc.)

// Overview Section Functions - Updated to use Flask API
async function initializeOverview() {
    refreshOverviewStats();
    loadRecentActivity();
    updateLastUpdated();
}

async function refreshOverviewStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        updateStatElement('totalSubjects', stats.totalSubjects);
        updateStatElement('totalUnits', stats.totalUnits);
        updateStatElement('totalFiles', stats.totalFiles);
        updateStatElement('totalStorage', formatFileSize(stats.totalSize));
        
        document.getElementById('lastUpdated').textContent = new Date(stats.lastUpdated).toLocaleString();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update individual stat element with animation
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    const targetValue = typeof value === 'number' ? value : parseInt(value) || 0;
    
    if (currentValue !== targetValue && typeof value === 'number') {
        // Animate number change
        animateNumber(element, currentValue, targetValue, 1000);
    } else {
        element.textContent = value;
    }
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 MB';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Animate number counting
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const minTimer = 50;
    const stepTime = Math.abs(Math.floor(duration / range));
    const timer = stepTime < minTimer ? minTimer : stepTime;
    const startTime = new Date().getTime();
    const endTime = startTime + duration;
    
    function run() {
        const now = new Date().getTime();
        const remaining = Math.max((endTime - now) / duration, 0);
        const current = Math.round(end - (remaining * range));
        element.textContent = current;
        
        if (current !== end) {
            setTimeout(run, timer);
        }
    }
    
    run();
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/subjects');
        const notesData = await response.json();
        const activityContainer = document.getElementById('activityContent');
        
        if (!activityContainer) return;
        
        const activities = [];
        
        // Add recent unit creations
        Object.values(notesData).forEach(subject => {
            subject.units.forEach(unit => {
                activities.push({
                    type: 'unit_created',
                    text: `New unit "${unit.title}" created in ${subject.displayName}`,
                    time: unit.createdAt,
                    icon: 'fas fa-plus-circle',
                    color: '#27ae60'
                });
                
                if (unit.updatedAt && unit.updatedAt !== unit.createdAt) {
                    activities.push({
                        type: 'unit_updated',
                        text: `Unit "${unit.title}" was updated`,
                        time: unit.updatedAt,
                        icon: 'fas fa-edit',
                        color: '#3498db'
                    });
                }
            });
        });
        
        // Sort by time (most recent first)
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        // Take only the last 10 activities
        const recentActivities = activities.slice(0, 10);
        
        if (recentActivities.length === 0) {
            activityContainer.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-text">No recent activity</div>
                    <div class="activity-time">-</div>
                </div>
            `;
            return;
        }
        
        // Render activities
        activityContainer.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${activity.color}20; color: ${activity.color};">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${formatTimeAgo(activity.time)}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Format time ago
function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = new Date().toLocaleString();
    }
}

// Other utility functions
function toggleSubject(subjectKey) {
    const card = document.querySelector(`[data-subject="${subjectKey}"]`);
    if (card) card.classList.toggle('expanded');
}

function filterContent() {
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    
    if (!searchInput || !subjectFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const subjectFilterValue = subjectFilter.value;
    const subjectCards = document.querySelectorAll('.subject-card');
    
    subjectCards.forEach(card => {
        const subjectKey = card.getAttribute('data-subject');
        const subjectName = card.querySelector('.subject-name').textContent.toLowerCase();
        const unitItems = card.querySelectorAll('.unit-item');
        
        let subjectMatch = !subjectFilterValue || subjectKey === subjectFilterValue;
        let searchMatch = !searchTerm || subjectName.includes(searchTerm);
        
        // Check units for search match
        let hasVisibleUnits = false;
        unitItems.forEach(unit => {
            const unitTitle = unit.querySelector('.unit-title').textContent.toLowerCase();
            const unitDescription = unit.querySelector('.unit-description').textContent.toLowerCase();
            const unitTopics = unit.querySelector('.unit-topics-list').textContent.toLowerCase();
            
            const unitSearchMatch = !searchTerm || 
                unitTitle.includes(searchTerm) || 
                unitDescription.includes(searchTerm) || 
                unitTopics.includes(searchTerm);
            
            if (subjectMatch && unitSearchMatch) {
                unit.style.display = 'block';
                hasVisibleUnits = true;
                searchMatch = true;
            } else {
                unit.style.display = 'none';
            }
        });
        
        if (subjectMatch && searchMatch && hasVisibleUnits) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function initializeManageSection() {
    loadManageData();
    updateSubjectFilter();
}

console.log('📚 Admin Dashboard - Connected to Flask backend with storage/ directory');
console.log('💾 Data stored in: storage/notesData.json');
console.log('📁 Files stored in: storage/ directory');