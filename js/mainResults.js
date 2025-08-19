// Dictionary mapping status to natual language
const statusToNaturalLanguage = {
    'no_generation': 'No Generation',
    'generated': 'Generated',
    'with_logs': 'With Logs',
    'install_fail': 'Install Failed',
    'reset_failed': 'Reset Failed',
    'no_apply': 'Patch Apply Failed',
    'applied': 'Patch Applied',
    'test_errored': 'Test Errored',
    'test_timeout': 'Test Timed Out',
    'resolved': 'Resolved'
}

// Store loaded leaderboards to avoid re-rendering
const loadedLeaderboards = new Set();
let leaderboardData = null;

// Track current sort state (default sort by resolved desc)
// field can be resolved / date. direction can be asc / desc
const sortState = { field: 'resolved', direction: 'desc' };

function loadLeaderboardData() {
    if (!leaderboardData) {
        const dataScript = document.getElementById('leaderboard-data');
        if (dataScript) {
            leaderboardData = JSON.parse(dataScript.textContent);
        }
    }
    return leaderboardData;
}

function renderLeaderboardTable(leaderboard) {
    const container = document.getElementById('leaderboard-container');
    const isBashOnly = leaderboard.name.toLowerCase() === 'bash-only';

    // Prepare sorted results based on current sort state
    const results = leaderboard.results
        .filter(item => !item.warning)
        .slice()
        .sort((a, b) => {
            if (sortState.field === 'date') {
                const ad = a.date || '';
                const bd = b.date || '';
                if (ad === bd) return 0;
                return sortState.direction === 'asc' ? ad.localeCompare(bd) : bd.localeCompare(ad);
            } else { // resolved
                const ar = parseFloat(a.resolved) || 0;
                const br = parseFloat(b.resolved) || 0;
                return sortState.direction === 'asc' ? ar - br : br - ar;
            }
        });

    // Create table content
    const tableHtml = `
        <div class="tabcontent active" id="leaderboard-${leaderboard.name}">
            <div class="table-responsive">
                <table class="table scrollable data-table">
                    <thead>
                        <tr>
                            <th>Model</th>
                            <th class="sortable" data-sort="resolved">% Resolved <span class="sort-indicator"></span></th>
                            <th>Org</th>
                            <th class="sortable" data-sort="date">Date <span class="sort-indicator"></span></th>
                            <th>Logs</th>
                            <th>Trajs</th>
                            <th>Site</th>
                            ${isBashOnly ? '<th>Release</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(item => `
                                <tr
                                    data-os_model="${item.os_model ? 'true' : 'false'}"
                                    data-os_system="${item.os_system ? 'true' : 'false'}"
                                    data-checked="${item.checked ? 'true' : 'false'}"
                                    data-tags="${item.tags ? item.tags.join(',') : ''}"
                                >
                                    <td>
                                        <div class="flex items-center gap-1">
                                            <div class="model-badges">
                                                ${item.date >= "2025-04-25" ? '<span>🆕</span>' : ''}
                                                ${item.oss ? '<span>🤠</span>' : ''}
                                                ${item.checked ? '<span title="The agent run was performed by or directly verified by the SWE-bench team">✅</span>' : ''}
                                            </div>
                                            <span class="model-name font-mono fw-medium">${item.name}</span>
                                        </div>
                                    </td>
                                    <td><span class="number fw-medium text-primary">${parseFloat(item.resolved).toFixed(2)}</span></td>
                                    <td>
                                        ${item.logo && item.logo.length > 0 ? `
                                            <div style="display: flex; align-items: center;">
                                                ${item.logo.map(logoUrl => `<img src="${logoUrl}" style="height: 1.5em;" />`).join('')}
                                            </div>
                                        ` : '-'}
                                    </td>
                                    <td><span class="label-date text-muted">${item.date}</span></td>
                                    <td class="centered-text text-center">
                                        ${item.logs ? '<span class="text-success">✓</span>' : '<span class="text-muted">-</span>'}
                                    </td>
                                    <td class="centered-text text-center">
                                        ${item.trajs ? '<span class="text-success">✓</span>' : '<span class="text-muted">-</span>'}
                                    </td>
                                    <td class="centered-text text-center">
                                        ${item.site ? `<a href="${item.site}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i></a>` : '<span class="text-muted">-</span>'}
                                    </td>
                                    ${isBashOnly ? `<td><span class="text-muted font-mono">${item['mini-swe-agent_version'] || '-'}</span></td>` : ''}
                                </tr>
                            `).join('')}
                        <tr class="no-results" style="display: none;">
                            <td colspan="${isBashOnly ? '8' : '7'}" class="text-center">
                                No entries match the selected filters. Try adjusting your filters.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = tableHtml;
    loadedLeaderboards.add(leaderboard.name);

    updateSortIndicators();
    attachSortHandlers(leaderboard.name);
}

function attachSortHandlers(leaderboardName) {
    const container = document.getElementById('leaderboard-container');
    const tableWrapper = container.querySelector(`#leaderboard-${leaderboardName}`);
    if (!tableWrapper) return;
    const sortableHeaders = tableWrapper.querySelectorAll('th.sortable');
    sortableHeaders.forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            if (sortState.field === field) {
                // Toggle direction
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.field = field;
                // Default direction: desc
                sortState.direction = 'desc';
            }
            // Re-render leaderboard with new sort
            const data = loadLeaderboardData();
            if (!data) return;
            const leaderboard = data.find(lb => lb.name === leaderboardName);
            if (!leaderboard) return;
            renderLeaderboardTable(leaderboard);
        });
    });
}

function updateSortIndicators() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    const headers = container.querySelectorAll('th.sortable');
    headers.forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        const field = th.getAttribute('data-sort');
        if (field === sortState.field) {
            indicator.textContent = sortState.direction === 'asc' ? '▲' : '▼';
        } else {
            indicator.textContent = '';
        }
    });
}

function updateLogViewer(inst_id, split, model) {
    if (inst_id == 'No Instance Selected') {
        const logViewer = document.querySelector('#log-viewer');
        logViewer.innerHTML = 'No instance selected.';
        return;
    }
    const url = `https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/${split}/${model}/logs/${inst_id}.${model}.eval.log`;
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const logViewer = document.querySelector('#log-viewer');
            logViewer.innerHTML = '';

            const inst_p = document.createElement('p');
            inst_p.textContent = `Instance ID: ${inst_id}`;
            logViewer.appendChild(inst_p);

            const pre = document.createElement('pre');
            pre.textContent = data;
            logViewer.appendChild(pre);
        })
        .catch(error => {
            console.error('Error fetching the JSON data:', error);
        });
}

function createTableHeader(keys, table) {
    const headerRowWrapper = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const status of keys) {
        const th = document.createElement('th');
        th.textContent = statusToNaturalLanguage[status];
        headerRow.appendChild(th);
    }
    headerRowWrapper.appendChild(headerRow);
    table.appendChild(headerRowWrapper);
}

function createTableBody(data, split, model, keys, table) {
    const bodyRowWrapper = document.createElement('tbody');
    const bodyRow = document.createElement('tr');
    for (const status of keys) {
        const td = document.createElement('td');

        const ids = data[status].slice().sort();

        ids.forEach(id => {
            const div = document.createElement('div');
            div.textContent = id;
            if (!(status === 'no_generation' || status === 'generated')) {
                div.classList.add('instance');
                div.classList.add(id);
            } else {
                div.classList.add('instance-not-clickable');
            }
            td.appendChild(div);
        });

        bodyRow.appendChild(td);
    }
    bodyRowWrapper.appendChild(bodyRow);
    table.appendChild(bodyRowWrapper);

    for (const status of keys) {
        const ids = data[status].slice().sort();
        ids.forEach(id => {
            if (!(status === 'no_generation' || status === 'generated')) {
                const divs = document.getElementsByClassName(id);
                Array.from(divs).forEach(div => {
                    div.addEventListener('click', () => {
                        updateLogViewer(id, split, model);
                    });
                });
            }
        });
    }
}

function updateMainResults(split, model) {
    const url = `https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/${split}/${model}/results/results.json`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.resolved) {
                const resolved = data.resolved.length;
                                const total = 
                    split === 'lite' ? 300 : 
                    split === 'verified' ? 500 : 
                    split === 'multimodal' ? 517 : 
                    split === 'bash-only' ? 500 : 2294;
                const percentResolved = (resolved / total * 100).toFixed(2);
                const resolvedElement = document.getElementById('selectedResolved');
                resolvedElement.textContent = percentResolved;
            } else {
                console.error('Invalid results data format:', data);
                document.getElementById('selectedResolved').textContent = 'N/A';
            }
        })
        .catch(error => {
            console.error('Error fetching the results data:', error);
            document.getElementById('selectedResolved').textContent = 'Error';
        });
}

function openLeaderboard(leaderboardName) {
    const data = loadLeaderboardData();
    if (!data) return;
    
    // Find the leaderboard data
    const leaderboard = data.find(lb => lb.name === leaderboardName);
    if (!leaderboard) return;
    
    // Render the table if not already loaded
    if (!loadedLeaderboards.has(leaderboardName)) {
        renderLeaderboardTable(leaderboard);
    } else {
        // Just show the existing table
        const container = document.getElementById('leaderboard-container');
        const existingTable = container.querySelector(`#leaderboard-${leaderboardName}`);
        if (existingTable) {
            // Hide all other tables and show this one
            container.querySelectorAll('.tabcontent').forEach(content => {
                content.classList.remove('active');
            });
            existingTable.classList.add('active');
        } else {
            // Re-render if somehow missing
            renderLeaderboardTable(leaderboard);
        }
    }
    
    // Update tab button states
    const tablinks = document.querySelectorAll('.tablinks');
    tablinks.forEach(link => link.classList.remove('active'));
    
    const activeButton = document.querySelector(`.tablinks[data-leaderboard="${leaderboardName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Update the leaderboard description text
    if (typeof updateLeaderboardDescription === 'function') {
        updateLeaderboardDescription(leaderboardName);
    }
    
    // Update filter visibility based on leaderboard type
    if (typeof updateFilterVisibility === 'function') {
        updateFilterVisibility(leaderboardName);
    }
    
    // Update tags dropdown for the new leaderboard
    if (typeof updateTagsForLeaderboard === 'function') {
        updateTagsForLeaderboard(leaderboardName);
    }
    
    // Apply current filters to the newly displayed table
    if (typeof updateTable === 'function') {
        setTimeout(updateTable, 0);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop().split('.')[0] || 'index';
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        
        link.classList.remove('active');
        
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
        
        if (currentPage === 'index' && window.location.hash) {
            const currentHash = window.location.hash.substring(1);
            
            if (linkPage === currentHash && !['bash-only', 'verified', 'lite', 'test', 'multimodal'].includes(currentHash.toLowerCase())) {
                link.classList.add('active');
            }
        }
    });
    
    const tabLinks = document.querySelectorAll('.tablinks');
    tabLinks.forEach(tab => {
        tab.addEventListener('click', function() {
            const leaderboardType = this.getAttribute('data-leaderboard');
            openLeaderboard(leaderboardType);
        });
    });
    
    // Load initial tab based on hash or default to Verified (mini-SWE-agent)
    const hash = window.location.hash.slice(1).toLowerCase();
    const validTabs = ['bash-only', 'verified', 'lite', 'test', 'multimodal'];
    
    if (hash && validTabs.includes(hash)) {
        const tabName = hash.charAt(0).toUpperCase() + hash.slice(1);
        openLeaderboard(tabName);
    } else {
        openLeaderboard('bash-only');
    }
});
