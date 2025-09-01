// Subject.js - Updated to work with Flask backend and storage/ directory
// Fully dynamic subject loading from server

// Admin Functions
function openAdminModal() {
    const modal = document.getElementById('admin-modal-overlay');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        const usernameField = document.getElementById('admin-username');
        if (usernameField) usernameField.focus();
    }
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Reset form
    const adminForm = document.getElementById('admin-form');
    if (adminForm) adminForm.reset();
    
    const adminError = document.getElementById('admin-error');
    if (adminError) adminError.style.display = 'none';
}

function handleAdminLogin(event) {
    event.preventDefault();

    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    // Simple authentication (in real app, use proper authentication)
    if (username === 'admin' && password === 'password') {
        closeAdminModal();
        showAdminDashboard();
    } else {
        const adminError = document.getElementById('admin-error');
        if (adminError) adminError.style.display = 'block';
    }
}

function showAdminDashboard() {
    window.location.href = "/admin";
}

// Load all subjects from Flask backend
async function loadNotesData() {
    try {
        const response = await fetch('/api/subjects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading subjects data:', error);
        showToast('Failed to load subjects data', 'error');
        return {};
    }
}

// Load units dynamically from Flask backend
async function loadUnitsForSubject(subjectName) {
    try {
        const notesData = await loadNotesData();
        const subjectData = notesData[subjectName];
        
        if (!subjectData || !subjectData.units || subjectData.units.length === 0) {
            return createNoUnitsMessage(subjectName, subjectData);
        }
        
        // Sort units by number
        const sortedUnits = subjectData.units.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        
        return sortedUnits.map(unit => createUnitCard(subjectName, unit)).join('');
    } catch (error) {
        console.error('Error loading units:', error);
        return createErrorMessage(subjectName);
    }
}

function createUnitCard(subjectName, unit) {
    const hasFile = unit.fileName && unit.fileName.trim() !== '';
    const fileSize = unit.fileSize ? formatFileSize(unit.fileSize) : '';
    
    return `
        <div class="unit-card" data-unit-id="${unit.id}">
            <div class="unit-header">
                <div class="unit-icon">
                    <i class="${unit.icon || 'fas fa-book'}"></i>
                </div>
                <div class="unit-number">${unit.number.toString().padStart(2, '0')}</div>
            </div>
            <h3 class="unit-title">${unit.title}</h3>
            <p class="unit-description">${unit.description}</p>
            <div class="unit-stats">
                <span><i class="fas fa-list"></i> ${unit.topicsCount || 0} topics</span>
                <span><i class="fas fa-file-alt"></i> ${unit.pagesCount || 0} pages</span>
                ${fileSize ? `<span><i class="fas fa-hdd"></i> ${fileSize}</span>` : ''}
            </div>
            <div class="unit-topics">
                <strong>Topics:</strong> ${unit.topics || 'Not specified'}
            </div>
            <button class="download-btn ${!hasFile ? 'disabled' : ''}" 
                    onclick="downloadUnit('${unit.fileName}', '${unit.title}')" 
                    ${!hasFile ? 'disabled' : ''}>
                <i class="fas fa-${hasFile ? 'download' : 'ban'}"></i> 
                ${hasFile ? 'Download Unit ' + unit.number : 'No File Available'}
            </button>
        </div>
    `;
}

function createNoUnitsMessage(subjectName, subjectData) {
    const subjectDisplayName = subjectData?.displayName || formatSubjectName(subjectName);
    
    return `
        <div class="no-units-message">
            <div class="no-units-icon">
                <i class="fas fa-folder-open"></i>
            </div>
            <h3 class="no-units-title">No units available yet</h3>
            <p class="no-units-description">
                Units for ${subjectDisplayName} haven't been added yet. 
                <br><i class="fas fa-history"></i> Check back later!
            </p>
        </div>
    `;
}

function createErrorMessage(subjectName) {
    return `
        <div class="no-units-message error">
            <div class="no-units-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="no-units-title">Error loading units</h3>
            <p class="no-units-description">
                Failed to load units for ${formatSubjectName(subjectName)}. 
                <br><button onclick="location.reload()" class="refresh-btn">Try Again</button>
            </p>
        </div>
    `;
}

// Helper function to format subject names
function formatSubjectName(subjectKey) {
    return subjectKey
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Initialize the page - now fully dynamic with Flask backend
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Show loading state
        showLoadingState();
        
        // Load all available subjects dynamically from Flask backend
        const availableSubjects = await loadAvailableSubjects();
        
        // Get subject from URL parameter or use first available subject
        const urlParams = new URLSearchParams(window.location.search);
        const requestedSubject = urlParams.get('subject');
        
        let initialSubject = null;
        if (requestedSubject && availableSubjects.includes(requestedSubject)) {
            initialSubject = requestedSubject;
        } else if (availableSubjects.length > 0) {
            initialSubject = availableSubjects[0];
        }

        // Update subject tabs dynamically
        await updateSubjectTabs();

        // Show initial subject or empty state
        if (initialSubject) {
            await showSubject(initialSubject);
        } else {
            showEmptyState();
        }

        // Add smooth scrolling and animations
        initializeAnimations();
        
        // Hide loading state
        hideLoadingState();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('Failed to initialize page', 'error');
        hideLoadingState();
        showEmptyState();
    }
});

function showLoadingState() {
    const mainContent = document.querySelector('main') || document.body;
    mainContent.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h2>Loading subjects...</h2>
            <p>Fetching data from server...</p>
        </div>
    `;
}

function hideLoadingState() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.remove();
    }
}

// Load all available subjects from Flask backend
async function loadAvailableSubjects() {
    try {
        const notesData = await loadNotesData();
        return Object.keys(notesData);
    } catch (error) {
        console.error('Error loading available subjects:', error);
        return [];
    }
}

// Update subject tabs based on actual data from Flask backend
async function updateSubjectTabs() {
    try {
        const notesData = await loadNotesData();
        const tabs = document.querySelectorAll('.subject-tab');
        
        // First, hide all existing tabs
        tabs.forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Get or create tab container
        const tabContainer = document.querySelector('.subject-tabs') || createTabContainer();
        
        // Clear and recreate tabs based on actual data
        tabContainer.innerHTML = '';
        
        Object.keys(notesData).forEach(subjectKey => {
            const subject = notesData[subjectKey];
            const hasUnits = subject.units && subject.units.length > 0;
            
            const tab = document.createElement('button');
            tab.className = `subject-tab ${!hasUnits ? 'empty-subject' : ''}`;
            tab.textContent = subject.displayName || formatSubjectName(subjectKey);
            tab.setAttribute('data-subject', subjectKey);
            tab.title = hasUnits ? `View ${subject.displayName} units` : `No units available for ${subject.displayName}`;
            
            tab.onclick = () => showSubject(subjectKey);
            
            tabContainer.appendChild(tab);
        });
    } catch (error) {
        console.error('Error updating subject tabs:', error);
    }
}

// Create tab container if it doesn't exist
function createTabContainer() {
    let container = document.querySelector('.subject-tabs');
    if (!container) {
        container = document.createElement('div');
        container.className = 'subject-tabs';
        
        // Insert at the top of the main content
        const mainContent = document.querySelector('main') || document.body;
        mainContent.insertBefore(container, mainContent.firstChild);
    }
    return container;
}

// Show subject - now works with any dynamic subject from Flask backend
async function showSubject(subjectName) {
    try {
        const notesData = await loadNotesData();
        const subjectData = notesData[subjectName];
        
        if (!subjectData) {
            console.warn(`Subject '${subjectName}' not found`);
            showToast(`Subject '${subjectName}' not found`, 'error');
            return;
        }

        // Hide all sections
        document.querySelectorAll('.subject-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all tabs
        document.querySelectorAll('.subject-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Find or create section for this subject
        let section = document.getElementById(`${subjectName}-section`);
        if (!section) {
            section = createSubjectSection(subjectName, subjectData);
        }

        // Show selected section
        section.classList.add('active');
        
        // Load units dynamically
        const unitsGrid = section.querySelector('.units-grid');
        if (unitsGrid) {
            unitsGrid.innerHTML = '<div class="loading-units"><i class="fas fa-spinner fa-spin"></i> Loading units...</div>';
            const unitsHTML = await loadUnitsForSubject(subjectName);
            unitsGrid.innerHTML = unitsHTML;
        }

        // Add active class to selected tab
        const activeTab = document.querySelector(`[data-subject="${subjectName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update header information
        updateSubjectHeader(subjectName, subjectData);

        // Trigger card animations
        setTimeout(() => {
            const cards = section.querySelectorAll('.unit-card');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.style.animation = 'none';
                card.offsetHeight; // Trigger reflow
                card.style.animation = 'fadeInUp 0.6s ease forwards';
            });
        }, 100);

        // Update URL without page reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('subject', subjectName);
        window.history.pushState({}, '', newUrl);

        // Track analytics
        trackEvent('view', 'subject-units', subjectName);
        
    } catch (error) {
        console.error('Error showing subject:', error);
        showToast('Failed to load subject', 'error');
    }
}

// Create a new subject section dynamically
function createSubjectSection(subjectName, subjectData) {
    const section = document.createElement('div');
    section.className = 'subject-section';
    section.id = `${subjectName}-section`;
    
    section.innerHTML = `
        <div class="subject-header">
            <div class="subject-info">
                <h2 id="subject-title">${subjectData.displayName || formatSubjectName(subjectName)}</h2>
                <p id="subject-subtitle">Study materials and notes</p>
            </div>
        </div>
        <div class="units-grid"></div>
    `;
    
    // Append to main content area
    const mainContent = document.querySelector('main') || document.body;
    mainContent.appendChild(section);
    
    return section;
}

// Update subject header - now works with dynamic data from Flask
function updateSubjectHeader(subjectName, subjectData) {
    const title = subjectData.displayName || formatSubjectName(subjectName);
    const subtitle = subjectData.description || `Study materials for ${title}`;
    
    // Update header elements if they exist
    const subjectTitle = document.getElementById('subject-title');
    const subjectSubtitle = document.getElementById('subject-subtitle');
    const currentSubject = document.getElementById('current-subject');
    
    if (subjectTitle) subjectTitle.textContent = title;
    if (subjectSubtitle) subjectSubtitle.textContent = subtitle;
    if (currentSubject) currentSubject.textContent = title;
}

// Updated download function - uses Flask backend endpoint in storage/
function downloadUnit(fileName, unitTitle) {
    if (!fileName || fileName.trim() === '') {
        showToast('No file available for download', 'error');
        return;
    }

    // Show loading state
    const button = event.target.closest('.download-btn');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
    button.disabled = true;

    // Open Flask download endpoint - files are served from storage/ directory
    setTimeout(() => {
        try {
            const downloadUrl = `/download/${encodeURIComponent(fileName)}`;
            
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast(`Started download: ${unitTitle}`, 'success');
            trackEvent('download', 'unit', fileName);
            
        } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed. Please try again.', 'error');
        }

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
    }, 1000);
}

// Show empty state when no subjects exist
function showEmptyState() {
    const mainContent = document.querySelector('main') || document.body;
    mainContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <h2 class="empty-title">No Subjects Available</h2>
            <p class="empty-description">
                No study materials have been uploaded yet. 
                <br>Contact your administrator to add subjects and units.
            </p>
            <div class="empty-actions">
                <button onclick="location.reload()" class="refresh-btn">
                    <i class="fas fa-sync-alt"></i> Refresh Page
                </button>
                <button onclick="openAdminModal()" class="admin-btn">
                    <i class="fas fa-user-shield"></i> Admin Login
                </button>
            </div>
        </div>
    `;
}

function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe unit cards for animation (will be called after dynamic loading)
    const observeCards = () => {
        document.querySelectorAll('.unit-card').forEach(card => {
            observer.observe(card);
        });
    };
    
    // Initial observation
    observeCards();
    
    // Re-observe after any subject switch
    window.observeCards = observeCards;
}

// Toast notification system
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        max-width: 350px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Analytics tracking
function trackEvent(action, category, label) {
    console.log(`Analytics: ${category} - ${action} - ${label}`);
    // TODO: Send to analytics service or Flask endpoint
    // fetch('/api/analytics', { method: 'POST', body: JSON.stringify({action, category, label}) })
}

// Dynamic keyboard navigation - works with any subjects from Flask backend
document.addEventListener('keydown', async function(e) {
    // Navigate between subjects with arrow keys
    if (e.altKey) {
        const availableSubjects = await loadAvailableSubjects();
        const activeTab = document.querySelector('.subject-tab.active');
        
        if (activeTab && availableSubjects.length > 1) {
            const currentSubject = activeTab.getAttribute('data-subject');
            const currentIndex = availableSubjects.indexOf(currentSubject);

            if (e.key === 'ArrowRight' && currentIndex < availableSubjects.length - 1) {
                e.preventDefault();
                await showSubject(availableSubjects[currentIndex + 1]);
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                await showSubject(availableSubjects[currentIndex - 1]);
            }
        }
    }

    // Back to home with Escape
    if (e.key === 'Escape') {
        window.location.href = '/';
    }
});

// Add keyboard shortcuts info
function showKeyboardShortcuts() {
    const shortcuts = `
        Keyboard Shortcuts:
        • Alt + Left/Right: Navigate between subjects
        • Escape: Back to home
        • Tab: Navigate between elements
        • Enter: Download/Select units
        • F5: Refresh page
        • F1: Show this help
    `;
    alert(shortcuts);
}

// Help shortcut
document.addEventListener('keydown', function(e) {
    if (e.key === 'F1') {
        e.preventDefault();
        showKeyboardShortcuts();
    }
});

// Refresh content when returning to page (in case admin updated content)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        refreshCurrentSubject();
    }
});

// Auto-refresh content every 60 seconds when page is visible
setInterval(() => {
    if (!document.hidden) {
        refreshCurrentSubject();
    }
}, 60000); // 60 seconds

async function refreshCurrentSubject() {
    try {
        const activeTab = document.querySelector('.subject-tab.active');
        if (activeTab) {
            const currentSubject = activeTab.getAttribute('data-subject');
            if (currentSubject) {
                await updateSubjectTabs();
                
                // Silently refresh current subject content
                const section = document.getElementById(`${currentSubject}-section`);
                if (section) {
                    const unitsGrid = section.querySelector('.units-grid');
                    if (unitsGrid) {
                        const currentContent = unitsGrid.innerHTML;
                        const newContent = await loadUnitsForSubject(currentSubject);
                        if (currentContent !== newContent) {
                            unitsGrid.innerHTML = newContent;
                            // Re-observe new cards for animations
                            if (window.observeCards) {
                                window.observeCards();
                            }
                        }
                    }
                }
            }
        } else {
            // No active subject - check if new subjects were added
            const availableSubjects = await loadAvailableSubjects();
            if (availableSubjects.length > 0) {
                await updateSubjectTabs();
                await showSubject(availableSubjects[0]);
            }
        }
    } catch (error) {
        console.error('Error during refresh:', error);
    }
}

console.log('📚 Notes Dock - Connected to Flask backend!');
console.log('💾 Data loaded from: /api/subjects (storage/notesData.json)');
console.log('📁 Files downloaded from: /download/<filename> (storage/ directory)');
console.log('💡 Tip: All subjects are now loaded dynamically from Flask backend');
console.log('💡 Tip: Use Alt + Arrow keys to navigate between subjects');
console.log('💡 Tip: Press F1 to see all keyboard shortcuts');