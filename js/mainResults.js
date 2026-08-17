// Dictionary mapping status to natual language
// Store loaded leaderboards to avoid re-rendering
const loadedLeaderboards = new Set();
let leaderboardData = null;

const sortState = { field: 'resolved', direction: 'desc' };

// A cell that has nothing in it is not a small value: it sorts last whichever
// way the arrow points, so that "no per-instance results published" never reads
// as "the smallest error" or "the top group".
const MISSING = Symbol('missing');

function escapeAttr(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function loadLeaderboardData() {
    if (!leaderboardData) {
        const dataScript = document.getElementById('leaderboard-data');
        if (dataScript) {
            leaderboardData = JSON.parse(dataScript.textContent);
        }
    }
    return leaderboardData;
}

function sortItems(a, b, field, direction) {
    const getValue = (item, field) => {
        switch (field) {
            case 'name':
                return (item.name || '').toLowerCase();
            case 'model':
                return (item.model_display || item.name || '').toLowerCase();
            case 'agent':
                return (item.agent || '').toLowerCase();
            case 'resolved':
                return parseFloat(item.resolved) || 0;
            case 'org':
                return getOrgName(item);
            case 'date':
                return item.date || '';
            case 'logs':
            case 'trajs':
            case 'site':
                return item[field] ? 1 : 0;
            case 'instance_cost':
                return parseFloat(item.instance_cost) || 0;
            case 'trajs_docent':
                return item.trajs_docent && item.trajs_docent !== false ? 1 : 0;
            case 'release':
                return (item['mini-swe-agent_version'] || '').toLowerCase();
            // Entries without per-instance results have no SE and no group.
            case 'resolved_se':
                return item.resolved_se == null ? MISSING : parseFloat(item.resolved_se);
            case 'tie_group':
                return item.tie_group == null ? MISSING : parseInt(item.tie_group, 10);
            default:
                return '';
        }
    };
    
    const av = getValue(a, field);
    const bv = getValue(b, field);

    if (av === MISSING || bv === MISSING) {
        if (av === MISSING && bv === MISSING) return 0;
        return av === MISSING ? 1 : -1;
    }

    let result;
    if (typeof av === 'number' && typeof bv === 'number') {
        result = av - bv;
    } else {
        result = av.toString().localeCompare(bv.toString());
    }
    
    return direction === 'asc' ? result : -result;
}

// Display-only cleanup of model names. The raw `name` stays untouched so that
// data-model attributes, chart labels and shareable links keep matching the data.
//
// Only a fallback now: the table reads `model_display`, and `display_name` is
// used if some older data still carries it.
const DATE_SUFFIX_RE = /\s*\((?:\d{8}|\d{4}-\d{2}-\d{2})\)/g;

function formatModelName(name) {
    // "GPT-5.2 (2025-12-11) (high reasoning)" -> "GPT-5.2 (2025-12-11) (high)"
    return (name || '').replace(/\(([^)]*?)\s+reasoning\)/gi, '($1)');
}

// Drop the trailing version date, e.g. "Claude 4.5 Opus medium (20251101)" ->
// "Claude 4.5 Opus medium". The table already has a Date column, so the date is
// redundant -- except where it is the only thing telling two entries of the same
// product apart (e.g. "nFactorial (2024-11-05)" vs "nFactorial (2024-10-30)"),
// in which case that entry keeps its date.
function buildDisplayNames(results) {
    const strippedCounts = new Map();
    results.forEach(item => {
        const stripped = formatModelName(item.name).replace(DATE_SUFFIX_RE, '').trim();
        strippedCounts.set(stripped, (strippedCounts.get(stripped) || 0) + 1);
    });

    const displayNames = new Map();
    results.forEach(item => {
        if (item.display_name) {
            displayNames.set(item.name, item.display_name);
            return;
        }
        const withReasoningRemoved = formatModelName(item.name);
        const stripped = withReasoningRemoved.replace(DATE_SUFFIX_RE, '').trim();
        const isAmbiguous = strippedCounts.get(stripped) > 1;
        displayNames.set(item.name, isAmbiguous ? withReasoningRemoved : stripped);
    });
    return displayNames;
}

// Rows with no logo get a muted initial circle instead of an empty cell. The
// colour is derived from the agent, so one product looks the same on every board
// and across reloads; the circle is decorative, since the name is already in the
// row (hence aria-hidden).
const LOGO_PLACEHOLDER_COLOURS = 6;

function placeholderKey(item) {
    const agent = item.agent && item.agent !== 'Undisclosed' ? item.agent : '';
    return agent || item.model_display || item.name || '';
}

function placeholderInitial(item) {
    const match = placeholderKey(item).match(/[a-z0-9]/i);
    return match ? match[0].toUpperCase() : '?';
}

function placeholderColour(item) {
    const key = placeholderKey(item).toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return hash % LOGO_PLACEHOLDER_COLOURS;
}

function getOrgName(item) {
    if (item.tags && item.tags.length > 0) {
        const orgTag = item.tags.find(tag => tag.startsWith('Org: '));
        if (orgTag) {
            return orgTag.substring(5).toLowerCase(); // Remove 'Org: ' prefix
        }
    }
    return (item.name || '').toLowerCase();
}

function getDefaultSortDirection(field) {
    const textFields = ['name', 'model', 'agent', 'org', 'release'];
    return textFields.includes(field) ? 'asc' : 'desc';
}

// The Verified board cross-lists every mini-SWE-agent run, so what used to be the
// "Bash Only" board is Verified with the Agent filter set to that one agent. The
// filter is applied for you on first load (see DEFAULT_AGENT_FILTER in
// leaderboardFilters.js) rather than being a separate mode.
const MINI_SWE_AGENT = 'mini-SWE-agent';

function boardSupportsMiniView(leaderboard) {
    return leaderboard.name.toLowerCase() === 'verified';
}

// Some boards (Multilingual) are made up entirely of mini-SWE-agent runs
function boardIsAllMini(leaderboard) {
    const results = leaderboard.results || [];
    return results.length > 0 && results.every(item => item.agent === MINI_SWE_AGENT);
}

// Every board gets row selection and Compare. Boards outside the mini-SWE-agent
// runs only carry resolution rates, so the chart picker greys out the chart types
// that need cost or per-instance data (see CHART_REQUIREMENTS in analysis.js).
function boardSupportsCompare() {
    return true;
}

// Cost, trajectories and a harness version are only reported by mini-SWE-agent
// runs, so those columns appear exactly when the view is narrowed to that agent.
function showsHarnessColumns(leaderboard) {
    if (boardIsAllMini(leaderboard)) return true;
    if (!boardSupportsMiniView(leaderboard)) return false;
    const agents = typeof getSelectedFilterValues === 'function'
        ? getSelectedFilterValues('agent')
        : [];
    return agents.length === 1 && agents[0] === MINI_SWE_AGENT;
}

function visibleResults(leaderboard) {
    return leaderboard.results.filter(item => !item.warning);
}

function renderLeaderboardTable(leaderboard) {
    const container = document.getElementById('leaderboard-container');
    const withHarness = showsHarnessColumns(leaderboard);
    const withSelect = boardSupportsCompare(leaderboard);
    const unfiltered = visibleResults(leaderboard);

    // Rank reflects the score, not whichever column is currently sorted. Keyed by
    // the entry itself: submission names are not unique (several products have
    // more than one entry under the same name).
    const ranks = new Map();
    unfiltered
        .slice()
        .sort((a, b) => (parseFloat(b.resolved) || 0) - (parseFloat(a.resolved) || 0))
        .forEach((item, index) => ranks.set(item, index + 1));

    const results = unfiltered
        .slice()
        .sort((a, b) => sortItems(a, b, sortState.field, sortState.direction));

    // Scale the inline progress bars against the best score in this leaderboard
    const maxResolved = results.reduce((max, item) => Math.max(max, parseFloat(item.resolved) || 0), 0) || 100;

    const displayNames = buildDisplayNames(results);
    const modelName = item => item.model_display || displayNames.get(item.name) || item.name;
    // The two statistics columns need per-instance results, which only some
    // submissions publish. They are shown when the group anchor is the row the
    // reader is looking at the top of: either nothing on the board outranks it,
    // or the view has been narrowed to the harness whose runs publish them.
    // Anywhere else the column would be mostly dashes anchored on a row far
    // down the page, which says less than leaving it out and explaining why.
    const stats = leaderboard.statistics;
    const withStats = !!stats && stats.groups > 0
        && (withHarness || stats.unmeasured_above_anchor === 0);
    const columnCount = 5 + (withSelect ? 1 : 0) + (withHarness ? 3 : 1) + (withStats ? 2 : 0);

    // The table uses a fixed layout so the narrow columns keep their width no
    // matter how many other columns are on screen. Every column is sized here
    // except Model, which is left auto and therefore absorbs the leftover space.
    const colgroup = [
        withSelect ? '<col class="cw-select">' : '',
        '<col class="cw-rank">',
        '<col>',
        '<col class="cw-agent">',
        '<col class="cw-resolved">',
        withStats ? '<col class="cw-se">' : '',
        withStats ? '<col class="cw-tie">' : '',
        withHarness ? '<col class="cw-cost">' : '',
        withHarness ? '<col class="cw-trajs">' : '',
        '<col class="cw-org">',
        '<col class="cw-date">',
        withHarness ? '<col class="cw-release">' : '<col class="cw-site">'
    ].join('');

    const tableHtml = `
        <div class="tabcontent active" id="leaderboard-${leaderboard.name}">
            <div class="table-responsive">
                <table class="table scrollable data-table ${withSelect ? 'has-select-col' : ''}" data-harness="${withHarness}" data-stats="${withStats}">
                    <colgroup>${colgroup}</colgroup>
                    <thead>
                        <tr>
                            ${withSelect ? '<th class="select-col"><input type="checkbox" id="select-all-checkbox" aria-label="Select all models" title="Select all visible models"></th>' : ''}
                            <th class="col-rank">#</th>
                            <th class="sortable col-model" data-sort="model">Model</th>
                            <th class="sortable col-agent" data-sort="agent">Agent</th>
                            <th class="sortable col-resolved" data-sort="resolved">% Resolved</th>
                            ${withStats ? '<th class="sortable col-se" data-sort="resolved_se" title="Standard error of this entry\'s own resolve rate over the instances it was scored on: sqrt(p(1-p)/n), in percentage points. It is the precision of one number, not the error of a difference between two entries — two entries are scored on the same instances, so comparing them is a paired question, which is what the Tie column answers.">&plusmn; SE</th>' : ''}
                            ${withStats ? '<th class="sortable col-tie" data-sort="tie_group" title="Significance group from an exact two-sided McNemar test on the shared instances, alpha = 0.05. The highest ungrouped entry anchors a group and every entry that cannot be separated from that anchor joins it, so membership is a statement about the paired comparison with the anchor, not a property of an entry on its own and not a claim that all members are mutually indistinguishable. No multiplicity correction is applied; one would only make the groups larger.">Tie</th>' : ''}
                            ${withHarness ? '<th class="sortable" data-sort="instance_cost" title="Average cost per task instance in the benchmark">Avg. $</th>' : ''}
                            ${withHarness ? '<th class="sortable" data-sort="trajs_docent">Trajs</th>' : ''}
                            <th class="sortable col-org" data-sort="org">Org</th>
                            <th class="sortable" data-sort="date">Date</th>
                            ${withHarness
                                ? '<th class="sortable" data-sort="release" title="mini-swe-agent release with which the benchmark was run. Click the release to see the release note. Generally, results should be very comparable across releases.">Release</th>'
                                : '<th class="sortable" data-sort="site">Site</th>'}
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(item => `
                                <tr
                                    data-os_model="${item.os_model ? 'true' : 'false'}"
                                    data-os_system="${item.os_system ? 'true' : 'false'}"
                                    data-checked="${item.checked ? 'true' : 'false'}"
                                    data-agent="${escapeAttr(item.agent)}"
                                    data-model="${escapeAttr(modelName(item))}"
                                    data-effort="${escapeAttr(item.reasoning_effort || '')}"
                                    data-model-org="${escapeAttr(item.model_org || '')}"
                                    data-agent-org="${escapeAttr(item.agent_org || '')}"
                                    data-resolved="${parseFloat(item.resolved) || 0}"
                                    data-tags="${item.tags ? escapeAttr(item.tags.join(',')) : ''}"
                                >
                                    ${withSelect ? `<td class="select-col centered-text"><input type="checkbox" class="row-select" aria-label="Select ${escapeAttr(modelName(item))}" data-model="${escapeAttr(item.name)}" data-resolved="${parseFloat(item.resolved).toFixed(2)}" data-cost="${item.instance_cost != null && !isNaN(item.instance_cost) ? item.instance_cost : ''}"></td>` : ''}
                                    <td class="rank-cell">${ranks.get(item) || ''}</td>
                                    <td class="model-cell">
                                        <div class="model-cell-inner">
                                            <span class="model-name fw-medium">${modelName(item)}</span>
                                            ${item.reasoning_effort ? `<span class="model-effort" title="Reasoning effort">${item.reasoning_effort}</span>` : ''}
                                            ${item.os_model ? '<span class="model-tag model-tag-open" title="Open-weights model" aria-label="Open-weights model"><i class="fa-solid fa-lock-open"></i></span>' : ''}
                                            ${!withHarness && item.checked ? '<span class="model-tag model-tag-verified" title="The agent run was performed by or directly checked by the SWE-bench team" aria-label="Checked by the SWE-bench team"><i class="fa-solid fa-circle-check"></i></span>' : ''}
                                        </div>
                                    </td>
                                    <td class="agent-cell"><span class="agent-name">${item.agent || '—'}</span></td>
                                    <td class="resolved-cell">
                                        <span class="resolved-meter">
                                            <span class="resolved-value">${parseFloat(item.resolved).toFixed(2)}</span>
                                            <span class="resolved-track"><span class="resolved-fill" style="width: ${((parseFloat(item.resolved) || 0) / maxResolved * 100).toFixed(1)}%"></span></span>
                                        </span>
                                    </td>
                                    ${withStats ? `<td class="text-right stat-cell">${item.resolved_se != null
                                        ? `<span class="number" title="${item.n_instances} instances scored">&plusmn;${parseFloat(item.resolved_se).toFixed(2)}</span>`
                                        : '<span class="text-muted" title="No per-instance results published for this entry">&mdash;</span>'}</td>` : ''}
                                    ${withStats ? `<td class="centered-text text-center stat-cell">${item.tie_group != null
                                        ? `<span class="tie-group${item.tie_group === 1 ? ' tie-group-top' : ''}">${item.tie_group}</span>`
                                        : '<span class="text-muted" title="No per-instance results published for this entry, so no paired comparison with the top entry is possible">&mdash;</span>'}</td>` : ''}
                                    ${withHarness ? `<td class="text-right"><span class="number">${item.instance_cost !== null && item.instance_cost !== undefined && item.instance_cost !== 0 && !isNaN(item.instance_cost) ? '$' + parseFloat(item.instance_cost).toFixed(2) : ''}</span></td>` : ''}
                                    ${withHarness ? `<td class="centered-text text-center">
                                        ${item.trajs_docent && item.trajs_docent !== false ? `<a href="${item.trajs_docent}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i></a>` : '<span class="text-muted">-</span>'}
                                    </td>` : ''}
                                    <td class="org-cell">
                                        ${item.logo && item.logo.length > 0 ? `
                                            <div class="org-logos">
                                                ${item.logo.map(logoUrl => `<img src="${escapeAttr(logoUrl)}" alt="" class="org-logo" loading="lazy" onerror="this.remove()">`).join('')}
                                            </div>
                                        ` : `<span class="org-placeholder org-placeholder-${placeholderColour(item)}" aria-hidden="true">${placeholderInitial(item)}</span>`}
                                    </td>
                                    <td><span class="label-date text-muted">${item.date}</span></td>
                                    ${withHarness
                                        ? `<td><span class="text-muted font-mono">${item['mini-swe-agent_version'] && item['mini-swe-agent_version'] !== '0.0.0' ? `<a href="https://github.com/SWE-agent/mini-swe-agent/tree/v${item['mini-swe-agent_version']}" target="_blank" rel="noopener noreferrer">${item['mini-swe-agent_version']}</a>` : (item['mini-swe-agent_version'] || '-')}</span></td>`
                                        : `<td class="centered-text text-center">
                                        ${item.site ? `<a href="${item.site}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i></a>` : '<span class="text-muted">-</span>'}
                                    </td>`}
                                </tr>
                            `).join('')}
                        <tr class="no-results" style="display: none;">
                            <td colspan="${columnCount}" class="text-center">
                                No entries match the selected filters. Try adjusting your filters.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            ${withStats ? `
            <p class="stats-note text-muted">
                <b>&plusmn; SE</b> is the standard error of a single entry's resolve rate,
                <span class="font-mono">sqrt(p(1-p)/n)</span> in percentage points, over the
                instances that entry was scored on. Two entries are scored on the same
                instances, so whether they differ is a paired question and overlapping SEs are
                not the answer to it.
                <b>Tie</b> answers that paired question: entries an exact two-sided McNemar test
                cannot separate (&alpha;&nbsp;=&nbsp;0.05) from the group's anchor share its
                number, group 1 being anchored on
                <b>${stats ? escapeAttr(stats.anchor) : ''}</b>, the highest entry here that
                publishes per-instance results. It is a property of that comparison, not of an
                entry on its own. No multiplicity correction is applied, so the groups are if
                anything smaller than a corrected analysis would make them.
                Computed over the ${stats ? stats.with_per_instance : 0} of
                ${stats ? stats.entries : 0} entries on this board that publish per-instance
                results. A dash means an entry publishes none, so neither number exists for
                it &mdash; it does not mean the entry stands alone.
            </p>` : ''}
        </div>
    `;

    container.innerHTML = tableHtml;
    loadedLeaderboards.add(leaderboard.name);

    updateSortIndicators();
    attachSortHandlers(leaderboard.name);

    if (withSelect) {
        attachSelectAllHandler(leaderboard.name);
        updateSelectAllCheckbox();
    }
}

function attachSortHandlers(leaderboardName) {
    const container = document.getElementById('leaderboard-container');
    const tableWrapper = container.querySelector(`#leaderboard-${leaderboardName}`);
    if (!tableWrapper) return;
    
    const sortableHeaders = tableWrapper.querySelectorAll('th.sortable');
    sortableHeaders.forEach(th => {
        th.addEventListener('click', () => handleSortClick(th, leaderboardName));
    });
}

function handleSortClick(header, leaderboardName) {
    const field = header.getAttribute('data-sort');
    
    if (sortState.field === field) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.field = field;
        sortState.direction = getDefaultSortDirection(field);
    }
    
    const data = loadLeaderboardData();
    if (!data) return;
    
    const leaderboard = data.find(lb => lb.name === leaderboardName);
    if (leaderboard) {
        renderLeaderboardTable(leaderboard);
    }
}

function updateSortIndicators() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    const headers = container.querySelectorAll('th.sortable');
    headers.forEach(th => {
        const field = th.getAttribute('data-sort');
        const isActive = field === sortState.field;
        
        th.classList.remove('sort-active', 'sort-inactive', 'sort-asc', 'sort-desc');
        th.classList.add(isActive ? 'sort-active' : 'sort-inactive');
        if (isActive) {
            th.classList.add(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function attachSelectAllHandler(leaderboardName) {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (!selectAllCheckbox) return;
    
    selectAllCheckbox.addEventListener('change', (e) => {
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        if (!active) return;
        
        const visibleCheckboxes = Array.from(active.querySelectorAll('tbody tr:not(.no-results)'))
            .filter(row => row.style.display !== 'none')
            .map(row => row.querySelector('input.row-select'))
            .filter(cb => cb !== null);
        
        const isChecked = e.target.checked;
        visibleCheckboxes.forEach(cb => {
            cb.checked = isChecked;
        });
        
        // Trigger chart update if modal is open
        if (document.getElementById('compare-modal')?.classList.contains('show')) {
            // Dispatch change event to trigger chart update
            const changeEvent = new Event('change', { bubbles: true });
            if (visibleCheckboxes.length > 0) {
                visibleCheckboxes[0].dispatchEvent(changeEvent);
            }
        }
    });
    
    // Listen for changes to individual checkboxes to update select-all state
    const container = document.getElementById('leaderboard-container');
    if (container) {
        container.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('row-select')) {
                updateSelectAllCheckbox();
            }
        });
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (!selectAllCheckbox) return;
    
    const container = document.getElementById('leaderboard-container');
    const active = container ? container.querySelector('.tabcontent.active') : null;
    if (!active) return;
    
    const visibleCheckboxes = Array.from(active.querySelectorAll('tbody tr:not(.no-results)'))
        .filter(row => row.style.display !== 'none')
        .map(row => row.querySelector('input.row-select'))
        .filter(cb => cb !== null);
    
    if (visibleCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    
    const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === visibleCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Make the function globally accessible for filter updates
window.updateSelectAllCheckbox = updateSelectAllCheckbox;

let currentLeaderboardName = null;

function findLeaderboard(name) {
    const data = loadLeaderboardData();
    if (!data) return null;
    return data.find(lb => lb.name === name) || null;
}

function openLeaderboard(leaderboardName) {
    const leaderboard = findLeaderboard(leaderboardName);
    if (!leaderboard) return;

    currentLeaderboardName = leaderboardName;

    if (typeof applyDefaultFilters === 'function') {
        applyDefaultFilters(leaderboardName);
    }

    // Always re-render: which columns and rows are shown depends on the
    // mini-SWE-agent view, which can change between visits to a tab.
    renderLeaderboardTable(leaderboard);

    const tablinks = document.querySelectorAll('.tablinks');
    tablinks.forEach(link => link.classList.remove('active'));

    const activeButton = document.querySelector(`.tablinks[data-leaderboard="${leaderboardName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    if (typeof updateLeaderboardDescription === 'function') {
        updateLeaderboardDescription(leaderboardName);
    }

    if (typeof rebuildFilterFacets === 'function') {
        rebuildFilterFacets();
    }

    if (typeof updateBashOnlyToggle === 'function') {
        updateBashOnlyToggle();
    }

    if (typeof updateTable === 'function') {
        setTimeout(updateTable, 0);
    }


    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.style.display = boardSupportsCompare(leaderboard) ? '' : 'none';
    }
}

// Re-render when the filter selection changes the set of columns that apply
function refreshLeaderboardColumns() {
    if (!currentLeaderboardName) return false;
    const leaderboard = findLeaderboard(currentLeaderboardName);
    if (!leaderboard) return false;

    const container = document.getElementById('leaderboard-container');
    const table = container ? container.querySelector('.data-table') : null;
    const rendered = table ? table.getAttribute('data-harness') === 'true' : false;
    if (rendered === showsHarnessColumns(leaderboard)) return false;

    renderLeaderboardTable(leaderboard);
    return true;
}

window.refreshLeaderboardColumns = refreshLeaderboardColumns;

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

    // Load the tab named in the hash, defaulting to Verified. #bash-only is kept
    // as an alias for the mini-SWE-agent view of Verified so old links still work.
    const hash = window.location.hash.slice(1).toLowerCase();
    const tabsByHash = {
        'bash-only': 'Verified',
        'verified': 'Verified',
        'lite': 'Lite',
        'test': 'Test',
        'multimodal': 'Multimodal',
        'multilingual': 'Multilingual'
    };

    openLeaderboard(tabsByHash[hash] || 'Verified');
});
