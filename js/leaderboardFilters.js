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
        
        // Show/hide no results message
        if (visibleRowCount === 0 && activeFilters.size > 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
        }
    });
}

// Filter Button Logic
function updateActiveFilters(filter) {
    // Find the button for this filter
    const button = document.querySelector(`.filter-toggle[data-filter="${filter}"]`);
    
    if (activeFilters.has(filter)) {
        activeFilters.delete(filter);
        button.classList.remove('active');
    } else {
        activeFilters.add(filter);
        button.classList.add('active');
    }
    
    updateTable();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set initial active state for default filters
    document.querySelectorAll('.filter-toggle').forEach(button => {
        const filter = button.getAttribute('data-filter');
        if (activeFilters.has(filter)) {
            button.classList.add('active');
        }
    });

    // Add click event to filter buttons
    document.querySelectorAll('.filter-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            updateActiveFilters(filter);
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
});