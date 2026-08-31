/**
 * Leaderboard filtering.
 *
 * One "Filter" button opens a list of categories (Agent, Model, Reasoning effort,
 * ...); picking a category drills into its values. Everything currently applied is
 * shown as a removable chip next to the button, so the active filter state is never
 * hidden behind a closed menu.
 *
 * Facet values are read off the rendered rows (data-agent, data-model, ...) rather
 * than from the leaderboard JSON, so the menu always matches the visible table.
 */

// Category -> how to read a row's value(s) for it. `multi` categories can hold
// several values per row (tags); the rest are single-valued.
const FILTER_CATEGORIES = [
    { key: 'agent', label: 'Agent', attribute: 'data-agent' },
    { key: 'model', label: 'Model', attribute: 'data-model' },
    { key: 'effort', label: 'Reasoning effort', attribute: 'data-effort' },
    { key: 'model-org', label: 'Model org', attribute: 'data-model-org' },
    { key: 'agent-org', label: 'Agent org', attribute: 'data-agent-org' },
    { key: 'resolved', label: 'Resolution rate', buckets: true },
    { key: 'properties', label: 'Properties', properties: true },
    { key: 'attempts', label: 'Attempts', tagPrefix: 'System: Attempts - ' },
];

// Resolution-rate buckets, evaluated top to bottom
const RESOLVED_BUCKETS = [
    { label: '70% and above', test: v => v >= 70 },
    { label: '60 – 70%', test: v => v >= 60 && v < 70 },
    { label: '50 – 60%', test: v => v >= 50 && v < 60 },
    { label: '30 – 50%', test: v => v >= 30 && v < 50 },
    { label: 'Below 30%', test: v => v < 30 },
];

// Boolean row properties, exposed as one category
const ROW_PROPERTIES = [
    { label: 'Open weights', attribute: 'data-os_model' },
    { label: 'Open scaffold', attribute: 'data-os_system' },
    { label: 'Checked', attribute: 'data-checked' },
];

// Filters are kept per board. A value like "mini-SWE-agent" simply does not exist
// on Lite or Full, so a single shared selection would be pruned away the moment
// you looked at another tab -- and would not come back on the way home.
// board name -> Map(category key -> Set of selected values)
const filtersByBoard = new Map();
let activeBoard = null;

// category key -> Set of selected values for the board on screen. An absent or
// empty set means "all".
let selectedFilters = new Map();

// "Bash Only" is a preset rather than a mode: it means the Agent filter narrowed to
// mini-SWE-agent and nothing else selected, so every model ran in the same harness.
// Offered on the boards that mix harnesses or are entirely mini-SWE-agent runs; the
// others always start out showing everything.
const BASH_ONLY_BOARDS = new Set(['verified', 'multilingual']);
const BASH_ONLY_CATEGORY = 'agent';
const BASH_ONLY_VALUE = 'mini-SWE-agent';

let openCategory = null;

function isBashOnlyPreset() {
    if (selectedFilters.size !== 1) return false;
    const agents = selectedFilters.get(BASH_ONLY_CATEGORY);
    return !!agents && agents.size === 1 && agents.has(BASH_ONLY_VALUE);
}

function applyBashOnlyPreset() {
    selectedFilters.clear();
    selectedFilters.set(BASH_ONLY_CATEGORY, new Set([BASH_ONLY_VALUE]));
}

function clearAllFilters() {
    selectedFilters.clear();
}

// Reflects the preset state, and hides itself on boards that do not offer it
function updateBashOnlyToggle() {
    const wrapper = document.getElementById('bash-only-toggle-wrapper');
    if (!wrapper) return;

    const offered = BASH_ONLY_BOARDS.has(activeBoard);
    wrapper.style.display = offered ? '' : 'none';

    const checkbox = document.getElementById('bash-only-toggle');
    if (checkbox && offered) checkbox.checked = isBashOnlyPreset();
}

window.updateBashOnlyToggle = updateBashOnlyToggle;

function getSelectedFilterValues(categoryKey) {
    const selected = selectedFilters.get(categoryKey);
    return selected ? Array.from(selected) : [];
}

// Point `selectedFilters` at this board's own state. A board that offers the
// Bash Only preset falls back to it whenever it has nothing selected, so arriving
// with no filters means the same-harness view; an existing selection is kept.
function applyDefaultFilters(leaderboardName) {
    const board = (leaderboardName || '').toLowerCase();
    activeBoard = board;

    if (!filtersByBoard.has(board)) {
        filtersByBoard.set(board, new Map());
    }
    selectedFilters = filtersByBoard.get(board);

    if (BASH_ONLY_BOARDS.has(board) && selectedFilters.size === 0) {
        applyBashOnlyPreset();
    }
}

window.getSelectedFilterValues = getSelectedFilterValues;
window.applyDefaultFilters = applyDefaultFilters;

function activeTableRows() {
    const container = document.getElementById('leaderboard-container');
    const active = container ? container.querySelector('.tabcontent.active') : null;
    if (!active) return [];
    return Array.from(active.querySelectorAll('.data-table tbody tr:not(.no-results)'));
}

function rowValues(row, category) {
    if (category.properties) {
        return ROW_PROPERTIES.filter(p => row.getAttribute(p.attribute) === 'true').map(p => p.label);
    }
    if (category.buckets) {
        const resolved = parseFloat(row.getAttribute('data-resolved')) || 0;
        const bucket = RESOLVED_BUCKETS.find(b => b.test(resolved));
        return bucket ? [bucket.label] : [];
    }
    if (category.tagPrefix) {
        return (row.getAttribute('data-tags') || '')
            .split(',')
            .map(t => t.trim())
            .filter(t => t.startsWith(category.tagPrefix))
            .map(t => t.slice(category.tagPrefix.length));
    }
    const value = (row.getAttribute(category.attribute) || '').trim();
    return value ? [value] : [];
}

// Values available for a category, in the order they should be listed
function facetValues(category, rows) {
    const counts = new Map();
    rows.forEach(row => {
        rowValues(row, category).forEach(value => {
            counts.set(value, (counts.get(value) || 0) + 1);
        });
    });

    let values = Array.from(counts.keys());
    if (category.buckets) {
        const order = RESOLVED_BUCKETS.map(b => b.label);
        values.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    } else if (category.properties) {
        const order = ROW_PROPERTIES.map(p => p.label);
        values.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    } else {
        // Most common first, then alphabetically
        values.sort((a, b) => (counts.get(b) - counts.get(a)) || a.localeCompare(b));
    }
    return values.map(value => ({ value, count: counts.get(value) }));
}

function rowMatchesFilters(row) {
    for (const category of FILTER_CATEGORIES) {
        const selected = selectedFilters.get(category.key);
        if (!selected || selected.size === 0) continue;
        const values = rowValues(row, category);
        if (!values.some(value => selected.has(value))) return false;
    }
    return true;
}

// Rank is "position among what you are looking at", so it stays 1..N with no
// gaps whichever filters are applied, and always follows the score.
function renumberRanks(visibleRows) {
    visibleRows
        .slice()
        .sort((a, b) => (parseFloat(b.getAttribute('data-resolved')) || 0)
                      - (parseFloat(a.getAttribute('data-resolved')) || 0))
        .forEach((row, index) => {
            const cell = row.querySelector('.rank-cell');
            if (cell) cell.textContent = index + 1;
        });
}

function updateTable() {
    // Changing which agents are selected can add or remove whole columns, which
    // means a fresh table. Re-run against the new rows; the second pass finds the
    // columns already correct, so this cannot recurse further.
    if (typeof refreshLeaderboardColumns === 'function' && refreshLeaderboardColumns()) {
        updateTable();
        return;
    }

    const rows = activeTableRows();
    let visible = 0;

    rows.forEach(row => {
        const show = rowMatchesFilters(row);
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    renumberRanks(rows.filter(row => row.style.display !== 'none'));

    const container = document.getElementById('leaderboard-container');
    const active = container ? container.querySelector('.tabcontent.active') : null;
    const noResults = active ? active.querySelector('.no-results') : null;
    if (noResults) {
        noResults.style.display = visible === 0 && rows.length > 0 ? 'table-row' : 'none';
    }

    if (typeof updateSelectAllCheckbox === 'function') {
        updateSelectAllCheckbox();
    }
    renderFilterChips();
    updateBashOnlyToggle();
}

/* ------------------------------------------------------------------ menu ---- */

function filterMenu() {
    return document.getElementById('filter-menu');
}

function closeFilterMenu() {
    const menu = filterMenu();
    if (menu) menu.style.display = 'none';
    const toggle = document.getElementById('filter-toggle-btn');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    openCategory = null;
}

function openFilterMenu() {
    const menu = filterMenu();
    if (!menu) return;
    menu.style.display = 'block';
    const toggle = document.getElementById('filter-toggle-btn');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    renderFilterMenu();
}

function renderFilterMenu() {
    const menu = filterMenu();
    if (!menu) return;

    const rows = activeTableRows();

    if (!openCategory) {
        menu.innerHTML = `
            <div class="filter-menu-list">
                ${FILTER_CATEGORIES.map(category => {
                    const selected = selectedFilters.get(category.key);
                    const count = selected ? selected.size : 0;
                    const available = facetValues(category, rows).length;
                    if (!available) return '';
                    return `
                        <button type="button" class="filter-menu-item" data-category="${category.key}">
                            <span>${category.label}</span>
                            <span class="filter-menu-item-meta">
                                ${count ? `<span class="filter-menu-count">${count}</span>` : ''}
                                <i class="fa-solid fa-chevron-right"></i>
                            </span>
                        </button>`;
                }).join('')}
            </div>
            ${selectedFilters.size ? '<button type="button" class="filter-menu-clear" data-clear-all="true">Clear all filters</button>' : ''}
        `;
        return;
    }

    const category = FILTER_CATEGORIES.find(c => c.key === openCategory);
    const values = facetValues(category, rows);
    const selected = selectedFilters.get(category.key) || new Set();

    menu.innerHTML = `
        <div class="filter-menu-header">
            <button type="button" class="filter-menu-back" data-back="true">
                <i class="fa-solid fa-chevron-left"></i> ${category.label}
            </button>
            ${selected.size ? `<button type="button" class="filter-menu-clear-one" data-clear="${category.key}">Clear</button>` : ''}
        </div>
        ${values.length > 8 ? '<input type="text" class="form-control form-control-sm filter-menu-search" placeholder="Search…">' : ''}
        <div class="filter-menu-values">
            ${values.map(({ value, count }) => `
                <label class="filter-menu-value">
                    <input type="checkbox" value="${escapeFilterAttr(value)}" ${selected.has(value) ? 'checked' : ''}>
                    <span class="filter-menu-value-label">${escapeFilterHtml(value)}</span>
                    <span class="filter-menu-value-count">${count}</span>
                </label>`).join('')}
        </div>
    `;

    const search = menu.querySelector('.filter-menu-search');
    if (search) {
        search.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            menu.querySelectorAll('.filter-menu-value').forEach(el => {
                el.style.display = el.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
        search.focus();
    }
}

function escapeFilterHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function escapeFilterAttr(value) {
    return escapeFilterHtml(value);
}

function renderFilterChips() {
    const holder = document.getElementById('filter-chips');
    if (!holder) return;

    const chips = [];
    FILTER_CATEGORIES.forEach(category => {
        const selected = selectedFilters.get(category.key);
        if (!selected || !selected.size) return;
        selected.forEach(value => {
            chips.push(`
                <button type="button" class="filter-chip" data-category="${category.key}" data-value="${escapeFilterAttr(value)}">
                    <span class="filter-chip-category">${category.label}</span>
                    <span>${escapeFilterHtml(value)}</span>
                    <i class="fa-solid fa-xmark"></i>
                </button>`);
        });
    });

    holder.innerHTML = chips.join('');
    holder.style.display = chips.length ? '' : 'none';
}

function toggleFilterValue(categoryKey, value, on) {
    const selected = selectedFilters.get(categoryKey) || new Set();
    if (on) {
        selected.add(value);
    } else {
        selected.delete(value);
    }
    if (selected.size) {
        selectedFilters.set(categoryKey, selected);
    } else {
        selectedFilters.delete(categoryKey);
    }
    updateTable();
}

// Drop selections whose value is gone from this board's own rows (data changed
// under us). Selections for other boards live in their own maps and are untouched.
function rebuildFilterFacets() {
    const rows = activeTableRows();
    if (!rows.length) return;

    FILTER_CATEGORIES.forEach(category => {
        const selected = selectedFilters.get(category.key);
        if (!selected) return;
        const available = new Set(facetValues(category, rows).map(v => v.value));
        Array.from(selected).forEach(value => {
            if (!available.has(value)) selected.delete(value);
        });
        if (!selected.size) selectedFilters.delete(category.key);
    });

    renderFilterChips();
    if (filterMenu() && filterMenu().style.display === 'block') renderFilterMenu();
}

window.rebuildFilterFacets = rebuildFilterFacets;
window.updateTable = updateTable;

/* ------------------------------------------------------------- lifecycle ---- */

document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('filter-toggle-btn');
    const menu = filterMenu();
    if (!toggle || !menu) return;

    toggle.addEventListener('click', e => {
        e.stopPropagation();
        if (menu.style.display === 'block') {
            closeFilterMenu();
        } else {
            openFilterMenu();
        }
    });

    menu.addEventListener('click', e => {
        // Handling a click re-renders the menu, which detaches e.target. The
        // outside-click listener below would then see a node that is no longer in
        // the bar and close the menu, so keep menu clicks from reaching it.
        e.stopPropagation();

        const categoryButton = e.target.closest('.filter-menu-item');
        if (categoryButton) {
            openCategory = categoryButton.getAttribute('data-category');
            renderFilterMenu();
            return;
        }
        if (e.target.closest('[data-back]')) {
            openCategory = null;
            renderFilterMenu();
            return;
        }
        const clearOne = e.target.closest('[data-clear]');
        if (clearOne) {
            selectedFilters.delete(clearOne.getAttribute('data-clear'));
            updateTable();
            renderFilterMenu();
            return;
        }
        if (e.target.closest('[data-clear-all]')) {
            selectedFilters.clear();
            updateTable();
            renderFilterMenu();
        }
    });

    menu.addEventListener('change', e => {
        if (e.target.matches('.filter-menu-value input[type="checkbox"]')) {
            toggleFilterValue(openCategory, e.target.value, e.target.checked);
            renderFilterMenu();
        }
    });

    const bashOnly = document.getElementById('bash-only-toggle');
    if (bashOnly) {
        bashOnly.addEventListener('change', e => {
            if (e.target.checked) {
                applyBashOnlyPreset();
            } else {
                clearAllFilters();
            }
            closeFilterMenu();
            updateTable();
        });
    }

    const chips = document.getElementById('filter-chips');
    if (chips) {
        chips.addEventListener('click', e => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            e.stopPropagation();
            toggleFilterValue(chip.getAttribute('data-category'), chip.getAttribute('data-value'), false);
        });
    }

    document.addEventListener('click', e => {
        const bar = document.getElementById('filter-bar');
        if (bar && !bar.contains(e.target)) closeFilterMenu();
    });
});

/* ----------------------------------------------------------- description ---- */

function updateLeaderboardDescription(leaderboardName) {
    const textContainer = document.getElementById('leaderboard-description-text');
    if (!textContainer) return;

    const descriptions = {
        'lite': '<em>Lite</em> is a subset of 300 instances for less costly evaluation (<a href="lite.html">details</a>)',
        // One description regardless of the filters, so it does not shift under you
        'verified': '<em>Verified</em> is a human-filtered subset of 500 instances ' +
            '(<a href="https://openai.com/index/introducing-swe-bench-verified/">details</a>). ' +
            'Defaults to <a href="/bash-only"><i>bash-only</i></a> setting ' +
            '(run with <a href="https://github.com/SWE-agent/mini-swe-agent">mini-SWE-agent</a>).',
        'test': '<em>Full</em> is a large benchmark made of 2294 instances (<a href="original.html">details</a>)',
        'multimodal': '<em>Multimodal</em> features issues with visual elements (<a href="multimodal.html">details</a>). ' +
            'V2 retains 480 tasks selected for reproducible evaluation.',
        'multilingual': '<em>Multilingual</em> spans 300 instances across 9 programming languages ' +
            '(<a href="multilingual.html">details</a>).'
    };

    textContainer.innerHTML = descriptions[(leaderboardName || '').toLowerCase()] || '';
}

window.updateLeaderboardDescription = updateLeaderboardDescription;
