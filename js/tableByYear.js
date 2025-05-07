
console.log("Table by year script loaded");

function updateTableByYear(split, model) {
    const url = `https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/${split}/${model}/results/by_year.json`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#table-by-year tbody');
            tableBody.innerHTML = '';  // Clear existing rows
            
            // Sort years in descending order (newest first)
            const years = Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a));
            
            years.forEach(year => {
                const row = document.createElement('tr');
                
                // Year column
                const yearCell = document.createElement('td');
                yearCell.textContent = year;
                row.appendChild(yearCell);
                
                // Resolved count column
                const resolvedCell = document.createElement('td');
                resolvedCell.textContent = data[year].resolved;
                row.appendChild(resolvedCell);
                
                // Total count column
                const totalCell = document.createElement('td');
                totalCell.textContent = data[year].total;
                row.appendChild(totalCell);
                
                // Percentage column
                const percentCell = document.createElement('td');
                const percent = (data[year].resolved / data[year].total * 100).toFixed(2);
                percentCell.textContent = `${percent}%`;
                row.appendChild(percentCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching year data:', error);
            document.querySelector('#table-by-year tbody').innerHTML = 
                '<tr><td colspan="4">Error loading year data</td></tr>';
        });
}
