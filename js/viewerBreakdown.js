/**
 * Renders the "% Resolved by ..." breakdown tables on the analysis viewer.
 *
 * The breakdown files live alongside results.json in the experiments repo:
 *   evaluation/<split>/<model>/results/resolved_by_repo.json
 *   evaluation/<split>/<model>/results/resolved_by_time.json
 * Both are shaped { "<key>": { "resolved": <int>, "total": <int> }, ... }.
 *
 * Not every submission publishes them (mini-SWE-agent entries carry a stored
 * resolve rate instead of a results/ directory), so a missing file is a normal empty
 * state, not an error.
 */

const EXPERIMENTS_EVAL_URL = 'https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation';

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// Returns the first candidate that fetches and parses, or null if none do.
// The legacy names are tried second so older submissions keep working.
async function fetchFirstJson(urls) {
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            return await response.json();
        } catch (error) {
            // fall through to the next candidate
        }
    }
    return null;
}

function breakdownUrls(split, model, names) {
    return names.map(name => `${EXPERIMENTS_EVAL_URL}/${split}/${model}/results/${name}.json`);
}

function setBreakdownMessage(tableId, message) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (tbody) {
        tbody.innerHTML = `<tr class="viewer-table-message"><td colspan="4">${escapeHtml(message)}</td></tr>`;
    }
}

function renderBreakdown(tableId, data, sortKeys, emptyMessage) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    const keys = data && typeof data === 'object' ? sortKeys(Object.keys(data)) : [];
    if (!keys.length) {
        setBreakdownMessage(tableId, emptyMessage);
        return;
    }

    const percentOf = key => {
        const entry = data[key] || {};
        const total = Number(entry.total) || 0;
        return total ? (Number(entry.resolved) || 0) / total * 100 : 0;
    };

    // Bars are scaled against the best row so the comparison stays readable
    // even for models with low absolute rates; the number carries the real value.
    const maxPercent = keys.reduce((max, key) => Math.max(max, percentOf(key)), 0) || 100;

    tbody.innerHTML = keys.map(key => {
        const entry = data[key] || {};
        const resolved = Number(entry.resolved) || 0;
        const total = Number(entry.total) || 0;
        const percent = percentOf(key);
        const barWidth = (percent / maxPercent) * 100;
        return `
            <tr>
                <td class="viewer-table-label">${escapeHtml(key)}</td>
                <td class="viewer-num">${resolved}</td>
                <td class="viewer-num">${total}</td>
                <td class="viewer-pct">
                    <span class="viewer-meter">
                        <span class="viewer-pct-value">${percent.toFixed(2)}%</span>
                        <span class="viewer-track"><span class="viewer-fill" style="width: ${barWidth.toFixed(1)}%"></span></span>
                    </span>
                </td>
            </tr>`;
    }).join('');
}

async function updateTableByRepo(split, model) {
    setBreakdownMessage('table-by-repo', 'Loading…');
    const data = await fetchFirstJson(breakdownUrls(split, model, ['resolved_by_repo', 'by_repo']));
    renderBreakdown(
        'table-by-repo',
        data,
        keys => keys.sort(),
        'No per-repository breakdown was published for this run.'
    );
}

async function updateTableByYear(split, model) {
    setBreakdownMessage('table-by-year', 'Loading…');
    const data = await fetchFirstJson(breakdownUrls(split, model, ['resolved_by_time', 'by_year']));
    renderBreakdown(
        'table-by-year',
        data,
        // Newest first; "Before 2020" has no leading digits so it sorts last
        keys => keys.sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0)),
        'No per-year breakdown was published for this run.'
    );
}
