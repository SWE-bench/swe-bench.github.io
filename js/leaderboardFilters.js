// Global active filters set
const activeFilters = new Set(['os_system']);

// Table Update Logic - Optimized for lazy loading
function updateTable() {
    // Only process the currently visible leaderboard table
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    const visibleLeaderboard = container.querySelector('.tabcontent[style*="display: block"], .tabcontent:not([style*="display: none"])');
    if (!visibleLeaderboard) return;
    
    const tableRows = visibleLeaderboard.querySelectorAll('.data-table tbody tr:not(.no-results)');
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
        
        // Check tag filter
        if (showRow) {
            const selectedTags = getSelectedTags();
            const allTagsSelected = isAllTagsSelected();
            
            if (!allTagsSelected) {
                const rowTags = (row.getAttribute('data-tags') || '').split(',').map(t => t.trim()).filter(Boolean);
                if (!rowTags.some(tag => selectedTags.includes(tag))) {
                    showRow = false;
                }
            }
        }
        
        // Toggle row visibility
        row.style.display = showRow ? '' : 'none';
        if (showRow) visibleRowCount++;
    });
    
    const noResultsMessage = visibleLeaderboard.querySelector('.no-results');
    // Show/hide no results message
    if (visibleRowCount === 0 && (activeFilters.size > 0 || !isAllTagsSelected())) {
        noResultsMessage.style.display = 'table-row';
    } else {
        noResultsMessage.style.display = 'none';
    }
}

function isAllTagsSelected() {
    const multiselect = document.getElementById('tag-multiselect');
    if (!multiselect) return true;
    const selectedTags = getSelectedTags();
    const allCheckboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
    return selectedTags.length === allCheckboxes.length;
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