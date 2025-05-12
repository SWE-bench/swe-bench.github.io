// Global active filters set
const activeFilters = new Set(['os_system']);

// Table Update Logic
function updateTable() {
    // Get all leaderboard tables
    const leaderboards = document.querySelectorAll('.tabcontent');
    const noResultsMessage = document.querySelector('#no-results');
    
    leaderboards.forEach(leaderboard => {
        // Only process visible leaderboard
        if (leaderboard.style.display !== 'block') return;
        
        const tableRows = leaderboard.querySelectorAll('.data-table tbody tr');
        let visibleRowCount = 0;
        
        tableRows.forEach(row => {
            // Show row by default
            let showRow = true;
            
            // Check filters
            for (const filter of activeFilters) {
                if (row.getAttribute(`data-${filter}`) !== 'true') {
                    showRow = false;
                    break;
                }
            }
            
            // Toggle row visibility
            row.style.display = showRow ? '' : 'none';
            if (showRow) visibleRowCount++;
        });
        
        const noResultsMessage = leaderboard.querySelector('.no-results');
        // Show/hide no results message
        if (visibleRowCount === 0 && activeFilters.size > 0) {
            noResultsMessage.style.display = 'table-row';
        } else {
            noResultsMessage.style.display = 'none';
        }
    });
}

// Updated Filter Button Logic
function updateActiveFilters(filter, isChecked) {
    if (isChecked) {
        activeFilters.add(filter);
    } else {
        activeFilters.delete(filter);
    }
    updateTable();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set initial active state for default filters
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        const filter = checkbox.getAttribute('data-filter');
        checkbox.checked = activeFilters.has(filter);
    });

    // Add change event to filter checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const filter = this.getAttribute('data-filter');
            updateActiveFilters(filter, this.checked);
        });
    });

    // Apply filters when switching tabs
    document.querySelectorAll('.tablinks').forEach(tab => {
        tab.addEventListener('click', function() {
            // Wait for the tab content to be shown
            setTimeout(updateTable, 0);
        });
    });

    // Initial application of filters
    setTimeout(updateTable, 0);

    // Multi-select dropdown logic
    const multiselect = document.getElementById('tag-multiselect');
    if (multiselect) {
        const selected = multiselect.querySelector('.multiselect-selected');
        const options = multiselect.querySelector('.multiselect-options');

        // Toggle dropdown open/close
        selected.addEventListener('click', function(e) {
            multiselect.classList.toggle('open');
            if (multiselect.classList.contains('open')) {
                options.style.display = 'block';
            } else {
                options.style.display = 'none';
            }
        });
        document.addEventListener('click', function(e) {
            if (!multiselect.contains(e.target)) {
                multiselect.classList.remove('open');
                options.style.display = 'none';
            }
        });

        // Search filter
        window.filterTagOptions = function(input) {
            const filter = input.value.toLowerCase();
            const opts = multiselect.querySelectorAll('.multiselect-option');
            opts.forEach(opt => {
                if (opt.textContent.toLowerCase().includes(filter) || opt.querySelector('input').value === 'All') {
                    opt.style.display = '';
                } else {
                    opt.style.display = 'none';
                }
            });
        };

        // Tag selection logic
        window.updateTagSelection = function() {
            const checkboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
            const checked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            // Clear previous content
            selected.innerHTML = '';
            if (checked.length === 0) {
                selected.innerHTML = '<span class="multiselect-placeholder">Select tags...</span>';
            } else if (checked.length === checkboxes.length) {
                selected.innerHTML = '<span class="multiselect-badge">(All Tags Selected)</span>';
                multiselect.querySelector('.tag-checkbox[value="All"]').checked = true;
            } else {
                checked.forEach(tag => {
                    const badge = document.createElement('span');
                    badge.className = 'multiselect-badge';
                    badge.textContent = tag;
                    // Add remove 'x' button
                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'multiselect-badge-remove';
                    removeBtn.textContent = '×';
                    removeBtn.style.marginLeft = '0.5em';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.onclick = function(e) {
                        e.stopPropagation();
                        // Uncheck the corresponding checkbox
                        const cb = Array.from(multiselect.querySelectorAll('.tag-checkbox')).find(cb => cb.value === tag);
                        if (cb) {
                            cb.checked = false;
                            window.updateTagSelection();
                        }
                    };
                    badge.appendChild(removeBtn);
                    selected.appendChild(badge);
                });
                multiselect.querySelector('.tag-checkbox[value="All"]').checked = false;
            }
            updateTable();
        };

        window.toggleAllTags = function(allCb) {
            const checkboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
            checkboxes.forEach(cb => cb.checked = allCb.checked);
            window.updateTagSelection();
        };

        // Initial selection
        window.updateTagSelection();
    }
});

// --- Tag Filtering Integration ---
function getSelectedTags() {
    const multiselect = document.getElementById('tag-multiselect');
    if (!multiselect) return [];
    const checkboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
    return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
}

// Patch the table update logic to include tag filtering
const originalUpdateTable = updateTable;
updateTable = function() {
    // Get selected tags
    const selectedTags = getSelectedTags();
    const multiselect = document.getElementById('tag-multiselect');
    const allTagsSelected = multiselect ? (selectedTags.length === multiselect.querySelectorAll('.tag-checkbox:not([value="All"])').length) : true;

    // Get all leaderboard tables
    const leaderboards = document.querySelectorAll('.tabcontent');
    const noResultsMessage = document.querySelector('#no-results');
    let anyVisible = false;

    leaderboards.forEach(leaderboard => {
        // Only process visible leaderboard
        if (leaderboard.style.display !== 'block') return;

        const tableRows = leaderboard.querySelectorAll('.data-table tbody tr');
        let visibleRowCount = 0;

        tableRows.forEach(row => {
            // Show row by default
            let showRow = true;

            // Check existing filters
            for (const filter of activeFilters) {
                if (row.getAttribute(`data-${filter}`) !== 'true') {
                    showRow = false;
                    break;
                }
            }

            // Check tag filter
            if (showRow && !allTagsSelected) {
                const rowTags = (row.getAttribute('data-tags') || '').split(',').map(t => t.trim()).filter(Boolean);
                if (!rowTags.some(tag => selectedTags.includes(tag))) {
                    showRow = false;
                }
            }

            // Toggle row visibility
            row.style.display = showRow ? '' : 'none';
            if (showRow) visibleRowCount++;
        });

        const noResultsMessage = leaderboard.querySelector('.no-results');
        // Show/hide no results message
        if (visibleRowCount === 0 && (activeFilters.size > 0 || !allTagsSelected)) {
            noResultsMessage.style.display = 'table-row';
        } else {
            noResultsMessage.style.display = 'none';
            if (visibleRowCount > 0) anyVisible = true;
        }
    });
};