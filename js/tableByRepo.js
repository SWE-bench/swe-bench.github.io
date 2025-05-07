function updateTableByRepo(split, model) {
    const url = `https://raw.githubusercontent.com/swe-bench/experiments/main/evaluation/${split}/${model}/results/by_repo.json`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#table-by-repo tbody');
            tableBody.innerHTML = '';
            
            const repos = Object.keys(data).sort();
            
            repos.forEach(repo => {
                const row = document.createElement('tr');
                
                const repoCell = document.createElement('td');
                repoCell.textContent = repo;
                row.appendChild(repoCell);
                
                const resolvedCell = document.createElement('td');
                resolvedCell.textContent = data[repo].resolved;
                row.appendChild(resolvedCell);
                
                const totalCell = document.createElement('td');
                totalCell.textContent = data[repo].total;
                row.appendChild(totalCell);
                
                const percentCell = document.createElement('td');
                const percent = (data[repo].resolved / data[repo].total * 100).toFixed(2);
                percentCell.textContent = `${percent}%`;
                row.appendChild(percentCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching repository data:', error);
            document.querySelector('#table-by-repo tbody').innerHTML = 
                '<tr><td colspan="4">Error loading repository data</td></tr>';
        });
}
