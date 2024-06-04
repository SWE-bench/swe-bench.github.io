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

function createTableBody(keys, data, table) {
    const bodyRowWrapper = document.createElement('tbody');
    const bodyRow = document.createElement('tr');
    for (const status of keys) {
        const td = document.createElement('td');

        // Sort ids alphabetically
        const ids = data[status].slice().sort();

        ids.forEach(id => {
            const div = document.createElement('div');
            div.textContent = id;
            td.appendChild(div);
        });

        bodyRow.appendChild(td);
    }
    bodyRowWrapper.appendChild(bodyRow);
    table.appendChild(bodyRowWrapper);
}

// Function to update the outcome table
function updateMainResultsHelper(data) {
    const outcomeTable1 = document.querySelector('#table-by-statuses-1');
    const outcomeTable2 = document.querySelector('#table-by-statuses-2');
    outcomeTable1.innerHTML = '';
    outcomeTable2.innerHTML = '';

    // Split the data keys into two halves
    const keys = Object.keys(data);
    const mid = Math.ceil(keys.length / 2);
    const firstHalfKeys = keys.slice(0, mid);
    const secondHalfKeys = keys.slice(mid);

    // Create table header rows
    createTableHeader(firstHalfKeys, outcomeTable1);
    createTableHeader(secondHalfKeys, outcomeTable2);

    // Create table body row
    createTableBody(firstHalfKeys, data, outcomeTable1);
    createTableBody(secondHalfKeys, data, outcomeTable2);
}

function updateMainResults(split, model) {
    const url = `https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/${split}/${model}/results/results.json`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            updateMainResultsHelper(data);
        })
        .catch(error => {
            console.error('Error fetching the JSON data:', error);
        });
}
