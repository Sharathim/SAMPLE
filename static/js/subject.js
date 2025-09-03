

// Admin Functions
function openAdminModal() {
    const modal = document.getElementById('admin-modal-overlay');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('admin-username').focus();
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal-overlay');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');

    // Reset form
    document.getElementById('admin-form').reset();
    document.getElementById('admin-error').style.display = 'none';
}


// Load units dynamically from localStorage
function loadUnitsForSubject(subjectName) {
    const notesData = JSON.parse(localStorage.getItem('notesData') || '{}');
    const subjectData = notesData[subjectName];

    if (!subjectData || !subjectData.units || subjectData.units.length === 0) {
        return createNoUnitsMessage(subjectName);
    }

    // Sort units by number
    const sortedUnits = subjectData.units.sort((a, b) => parseInt(a.number) - parseInt(b.number));

    return sortedUnits.map(unit => createUnitCard(subjectName, unit)).join('');
}

function createUnitCard(subjectName, unit) {
    return `
        <div class="unit-card" data-unit-id="${unit.id}">
            <div class="unit-header">
                <div class="unit-icon">
                    <i class="${unit.icon}"></i>
                </div>
                <div class="unit-number">${unit.number.toString().padStart(2, '0')}</div>
            </div>
            <h3 class="unit-title">${unit.title}</h3>
            <p class="unit-description">${unit.description}</p>
            <div class="unit-stats">
                <span>${unit.topicsCount} topics</span>
                <span>${unit.pagesCount} pages</span>
            </div>
            <div class="unit-topics">Topics: ${unit.topics}</div>
            <button class="download-btn" onclick="downloadUnit('${subjectName}', ${unit.number})" ${!unit.fileName ? 'disabled' : ''}>
                <i class="fas fa-download"></i> Download Unit ${unit.number}
            </button>
        </div>
    `;
}

function createNoUnitsMessage(subjectName) {
    const subjectInfo = defaultSubjectInfo[subjectName] || { title: subjectName.charAt(0).toUpperCase() + subjectName.slice(1) };

    return `
        <div class="no-units-message">
            <div class="no-units-icon">
                <i class="fas fa-folder-open"></i>
            </div>
            <h3 class="no-units-title">No units available yet</h3>
            <p class="no-units-description">Units for ${subjectInfo.title} haven't been added yet. Check back later!</p>
    `;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // Increment visitor count for analytics
    incrementVisitorCount();

    // Get subject from URL parameter or default to Tamil
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get('subject') || 'tamil';

    // Load all subjects to make tabs active/inactive based on available content
    updateSubjectTabs();

    if (subject) {
        showSubject(subject);
    } else {
        showSubject('tamil');
    }

    // Add smooth scrolling and animations
    initializeAnimations();
});

function updateSubjectTabs() {
    const notesData = JSON.parse(localStorage.getItem('notesData') || '{}');
    const tabs = document.querySelectorAll('.subject-tab');
    const reverseTabMapping = {
        'Tamil': 'tamil',
        'English': 'english',
        'Statistics': 'statistics',
        'Java': 'java',
        'Web Technology': 'html'
    };


    tabs.forEach(tab => {
        const subjectName = reverseTabMapping[tab.textContent];
        const hasUnits = notesData[subjectName] && notesData[subjectName].units && notesData[subjectName].units.length > 0;

        // Add visual indicator for subjects with no content
        if (!hasUnits) {
            tab.classList.add('empty-subject');
            tab.title = `No units available for ${tab.textContent}`;
        } else {
            tab.classList.remove('empty-subject');
            tab.title = `View ${tab.textContent} units`;
        }
    });
}

function showSubject(subjectName) {
    // Hide all sections
    document.querySelectorAll('.subject-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.subject-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${subjectName}-section`);
    if (section) {
        section.classList.add('active');

        // Load units dynamically
        const unitsGrid = section.querySelector('.units-grid');
        if (unitsGrid) {
            unitsGrid.innerHTML = loadUnitsForSubject(subjectName);
        }
    }

    // Add active class to selected tab using proper mapping
    const tabMapping = {
        'tamil': 'Tamil',
        'english': 'English',
        'statistics': 'Statistics',
        'java': 'Java',
        'html': 'Web Technology'
    };

    document.querySelectorAll('.subject-tab').forEach(tab => {
        if (tab.dataset.subject === subjectName) {
            tab.classList.add('active');
        }
    });


    // Update header information
    updateSubjectHeader(subjectName);

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
}

function updateSubjectHeader(subjectName) {
    const notesData = JSON.parse(localStorage.getItem('notesData') || '{}');
    const subjectData = notesData[subjectName];
    const defaultInfo = defaultSubjectInfo[subjectName];

    let title, subtitle;

    if (subjectData && subjectData.displayName) {
        title = subjectData.displayName;
        subtitle = defaultInfo ? defaultInfo.subtitle : `Study materials for ${subjectData.displayName}`;
    } else if (defaultInfo) {
        title = defaultInfo.title;
        subtitle = defaultInfo.subtitle;
    } else {
        title = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
        subtitle = `Study materials for ${title}`;
    }

    document.getElementById('subject-title').textContent = title;
    document.getElementById('subject-subtitle').textContent = subtitle;
    document.getElementById('current-subject').textContent = title;
}

function downloadUnit(subject, unitNumber) {
    // Show loading state
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="loading"></div> Downloading...';
    button.disabled = true;

    // Increment download count for analytics
    incrementDownloadCount();

    // Simulate download process
    setTimeout(() => {
        // In a real application, this would trigger an actual download
        const subjectData = JSON.parse(localStorage.getItem('notesData') || '{}');
        const units = subjectData[subject]?.units || [];
        const unit = units.find(u => parseInt(u.number) === parseInt(unitNumber));

        if (unit && unit.fileName) {
            showToast(`Downloaded ${unit.title} successfully!`, 'success');
        } else {
            showToast(`Unit ${unitNumber} file not available`, 'error');
        }

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

        // Track download
        trackEvent('download', 'unit', `${subject}-unit-${unitNumber}`);
    }, 2000);
}

// Visitor count tracking
function incrementVisitorCount() {
    const platformStats = JSON.parse(localStorage.getItem('platformStats') || '{}');
    platformStats.visitorCount = (platformStats.visitorCount || 0) + 1;
    platformStats.lastUpdate = new Date().toISOString();
    localStorage.setItem('platformStats', JSON.stringify(platformStats));
}

// Download count tracking
function incrementDownloadCount() {
    const platformStats = JSON.parse(localStorage.getItem('platformStats') || '{}');
    platformStats.downloadCount = (platformStats.downloadCount || 0) + 1;
    platformStats.lastUpdate = new Date().toISOString();
    localStorage.setItem('platformStats', JSON.stringify(platformStats));
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
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: var(--shadow-lg);
        z-index: 5000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Analytics tracking
function trackEvent(action, category, label) {
    console.log(`Analytics: ${category} - ${action} - ${label}`);
    // In a real app, you would send this to your analytics service
}


// Refresh units when returning to page (in case admin updated content)
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        // Page became visible - refresh current subject
        const activeTab = document.querySelector('.subject-tab.active');
        if (activeTab) {
            const reverseTabMapping = {
                'Tamil': 'tamil',
                'English': 'english',
                'Statistics': 'statistics',
                'Java': 'java',
                'Web Technology': 'html'
            };
            const currentSubject = reverseTabMapping[activeTab.textContent];
            updateSubjectTabs();
            showSubject(currentSubject);
        }
    }
});

// Auto-refresh content every 30 seconds when page is visible
setInterval(() => {
    if (!document.hidden) {
        const activeTab = document.querySelector('.subject-tab.active');
        if (activeTab) {
            const reverseTabMapping = {
                'Tamil': 'tamil',
                'English': 'english',
                'Statistics': 'statistics',
                'Java': 'java',
                'Web Technology': 'html'
            };
            const currentSubject = reverseTabMapping[activeTab.textContent];
            updateSubjectTabs();
            // Silently refresh current subject content
            const section = document.getElementById(`${currentSubject}-section`);
            if (section) {
                const unitsGrid = section.querySelector('.units-grid');
                if (unitsGrid) {
                    const currentContent = unitsGrid.innerHTML;
                    const newContent = loadUnitsForSubject(currentSubject);
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
    }
}, 30000); // 30 seconds