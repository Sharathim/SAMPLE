(function () {
    'use strict';

    // DOM Elements
    const form = document.getElementById('selection-form');
    const departmentSelect = document.getElementById('department');
    const yearSelect = document.getElementById('year');
    const semesterSelect = document.getElementById('semester');
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');


    /**
     * Validates form fields
     */
    function validateForm() {
        const department = departmentSelect.value;
        const year = yearSelect.value;
        const semester = semesterSelect.value;

        if (!department || !year || !semester) {
            errorMessage.classList.add('show');
            return false;
        }

        errorMessage.classList.remove('show');
        return true;
    }

    /**
     * Handles form submission
     */
    function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Get selected values
        const department = departmentSelect.value;
        const year = yearSelect.value;
        const semester = semesterSelect.value;

        // Store selections in sessionStorage
        sessionStorage.setItem('selectedDepartment', department);
        sessionStorage.setItem('selectedYear', year);
        sessionStorage.setItem('selectedSemester', semester);

        // Add loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';

        // Simulate loading and redirect only if Odd semester
        setTimeout(() => {
            if (semester === "odd") {
                window.location.href = 'subject.html';
            } else if (semester === "even") {
                errorMessage.textContent = "Even Semester notes are not available yet.";
                errorMessage.classList.add("show");
                submitBtn.disabled = false;
                submitBtn.textContent = "Access Our Notes";
            }
        }, 500);
    }


    /**
     * Updates submit button state based on form completion
     */
    function updateSubmitButton() {
        const department = departmentSelect.value;
        const year = yearSelect.value;
        const semester = semesterSelect.value;

        if (department && year && semester) {
            submitBtn.disabled = false;
            errorMessage.classList.remove('show');
        } else {
            submitBtn.disabled = true;
        }
    }

    // Event Listeners
    form.addEventListener('submit', handleSubmit);
    departmentSelect.addEventListener('change', updateSubmitButton);
    yearSelect.addEventListener('change', updateSubmitButton);
    semesterSelect.addEventListener('change', updateSubmitButton);

    // Multiple event listeners for dark mode toggle to ensure it works
    darkModeToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Dark mode button clicked!');
        toggleDarkMode();
    });

    darkModeToggle.addEventListener('touchstart', function (e) {
        e.preventDefault();
        toggleDarkMode();
    });

    updateSubmitButton();

    // Keyboard navigation improvements
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && document.activeElement.tagName === 'SELECT') {
            // Allow enter key to open select dropdowns
            e.preventDefault();
            document.activeElement.click();
        }
    });

})();