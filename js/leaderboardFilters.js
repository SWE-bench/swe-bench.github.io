// Global active filters set
const activeFilters = new Set(['os_system']);

// Table Update Logic - Optimized for lazy loading
function updateTable() {
    // Only process the currently visible leaderboard table
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    const visibleLeaderboard = container.querySelector('.tabcontent.active');
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
    const toggleButton = document.getElementById('tag-filter-toggle');
    const dropdownForm = document.getElementById('tag-multiselect-form');
    
    if (multiselect && toggleButton) {
        // Toggle dropdown open/close
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = dropdownForm.style.display === 'block';
            if (isOpen) {
                dropdownForm.style.display = 'none';
                toggleButton.querySelector('.tag-filter-icon').textContent = '▼';
            } else {
                dropdownForm.style.display = 'block';
                toggleButton.querySelector('.tag-filter-icon').textContent = '▲';
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const container = document.querySelector('.tag-filter-container');
            if (!container.contains(e.target)) {
                dropdownForm.style.display = 'none';
                toggleButton.querySelector('.tag-filter-icon').textContent = '▼';
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
            const summaryElement = document.getElementById('tag-filter-summary');
            
            if (checked.length === 0) {
                summaryElement.textContent = 'Select tags...';
            } else if (checked.length === checkboxes.length) {
                summaryElement.textContent = 'All Tags';
                multiselect.querySelector('.tag-checkbox[value="All"]').checked = true;
            } else if (checked.length === 1) {
                summaryElement.textContent = checked[0];
            } else {
                summaryElement.textContent = `${checked.length} Tags Selected`;
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

// --- Leaderboard Description Update ---
function updateLeaderboardDescription(leaderboardName) {
    const descriptionElement = document.getElementById('leaderboard-description');
    if (!descriptionElement) return;
    
    const descriptions = {
        'lite': 'Lite is a subset of 300 instances for less costly evaluation (<a href="lite.html">details</a>)',
        'verified-micro': 'Verified (micro-SWE-agent) uses the Verified dataset with micro-SWE-agent evaluation (<a href="verified-micro.html">details</a>)',
        'verified': 'Verified is a human-filtered subset of 500 instances (<a href="https://openai.com/index/introducing-swe-bench-verified/">details</a>)',
        'test': 'Full is a large benchmark made of 2000 instances (<a href="original.html">details</a>)',
        'multimodal': 'Multimodal features issues with visual elements (<a href="multimodal.html">details</a>)',
        'bash-only': 'Bash-only evaluates LMs with a minimal agent on 500 instances (<a href="bash-only.html">details</a>)'
    };
    
    const normalizedName = leaderboardName.toLowerCase();
    descriptionElement.innerHTML = descriptions[normalizedName] || '';
}

// Make the function globally available
window.updateLeaderboardDescription = updateLeaderboardDescription;

// --- Tag Filtering Integration ---
function getSelectedTags() {
    const multiselect = document.getElementById('tag-multiselect');
    if (!multiselect) return [];
    const checkboxes = multiselect.querySelectorAll('.tag-checkbox:not([value="All"])');
    return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
}