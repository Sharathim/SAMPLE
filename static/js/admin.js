// UI Interactions for Admin Page - No hardcoded data, backend handles all operations
document.addEventListener('DOMContentLoaded', function() {
    // Navigation between sections
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.admin-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetSection = this.dataset.section;

            // Update active nav button
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });
        });
    });

    // File upload preview
    const fileInput = document.getElementById('unitFiles');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileList = Array.from(this.files);
            const preview = document.createElement('div');
            preview.className = 'file-preview';
            preview.innerHTML = '<h4>Selected Files:</h4>';
            
            fileList.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'preview-item';
                fileItem.innerHTML = `
                    <span>${file.name}</span>
                    <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                `;
                preview.appendChild(fileItem);
            });
            
            // Remove existing preview
            const existingPreview = this.parentNode.querySelector('.file-preview');
            if (existingPreview) {
                existingPreview.remove();
            }
            
            this.parentNode.appendChild(preview);
        });
    }

    // Form submission loading states
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
            }
        });
    });

    // Auto-hide flash messages
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
});

// Show create forms
function showCreateForm(type) {
    // Hide all forms first
    document.querySelectorAll('.create-form').forEach(form => {
        form.style.display = 'none';
    });

    // Show selected form
    const formId = type === 'subject' ? 'createSubjectForm' : 'createUnitForm';
    document.getElementById(formId).style.display = 'block';
}

// Edit subject - sends request to backend
function editSubject(subjectId) {
    fetch(`/admin/edit-subject/${subjectId}`)
        .then(response => response.text())
        .then(html => {
            showModal(html);
        })
        .catch(err => {
            alert('Error loading edit form');
        });
}

// Edit unit - sends request to backend
function editUnit(subjectId, unitId) {
    fetch(`/admin/edit-unit/${subjectId}/${unitId}`)
        .then(response => response.text())
        .then(html => {
            showModal(html);
        })
        .catch(err => {
            alert('Error loading edit form');
        });
}

// Delete subject with confirmation
function deleteSubject(subjectId) {
    if (confirm('Are you sure you want to delete this subject? This will also delete all units and files.')) {
        fetch(`/admin/delete-subject/${subjectId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error deleting subject: ' + data.message);
            }
        })
        .catch(err => {
            alert('Error deleting subject');
        });
    }
}

// Delete unit with confirmation
function deleteUnit(subjectId, unitId) {
    if (confirm('Are you sure you want to delete this unit? This will also delete all associated files.')) {
        fetch(`/admin/delete-unit/${subjectId}/${unitId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error deleting unit: ' + data.message);
            }
        })
        .catch(err => {
            alert('Error deleting unit');
        });
    }
}

// Show modal with content
function showModal(htmlContent) {
    const modalContainer = document.getElementById('modalContainer');}