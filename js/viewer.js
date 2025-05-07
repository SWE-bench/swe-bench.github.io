document.addEventListener('DOMContentLoaded', function() {
    function loadData() {
        return {
            repositories: ['django', 'flask', 'pandas', 'scikit-learn', 'transformers'],
            models: ['GPT-4', 'Claude-3', 'Llama-3', 'SWE-Llama', 'SWE-agent'],
            results: [
                { repo: 'django', model: 'GPT-4', status: 'pass', type: 'bug', id: 'DJANGO-123' },
                { repo: 'flask', model: 'GPT-4', status: 'fail', type: 'feature', id: 'FLASK-456' },
                { repo: 'pandas', model: 'Claude-3', status: 'pass', type: 'bug', id: 'PANDAS-789' },
                { repo: 'scikit-learn', model: 'Llama-3', status: 'pass', type: 'enhancement', id: 'SKLEARN-101' },
                { repo: 'transformers', model: 'SWE-agent', status: 'pass', type: 'bug', id: 'HF-202' }
            ]
        };
    }

    const data = loadData();
    
    function populateFilters() {
        const modelSelect = document.getElementById('model-select');
        const repoSelect = document.getElementById('repo-select');
        
        while (modelSelect.options.length > 1) {
            modelSelect.remove(1);
        }
        
        while (repoSelect.options.length > 1) {
            repoSelect.remove(1);
        }
        
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        
        data.repositories.forEach(repo => {
            const option = document.createElement('option');
            option.value = repo;
            option.textContent = repo;
            repoSelect.appendChild(option);
        });
    }
    
    function populateTable() {
        const tableBody = document.querySelector('#results-table tbody');
        tableBody.innerHTML = '';
        
        data.results.forEach(result => {
            const row = document.createElement('tr');
            
            const repoCell = document.createElement('td');
            repoCell.textContent = result.repo;
            row.appendChild(repoCell);
            
            const idCell = document.createElement('td');
            idCell.textContent = result.id;
            row.appendChild(idCell);
            
            const statusCell = document.createElement('td');
            statusCell.textContent = result.status === 'pass' ? '✅ Pass' : '❌ Fail';
            statusCell.className = result.status === 'pass' ? 'status-pass' : 'status-fail';
            row.appendChild(statusCell);
            
            const typeCell = document.createElement('td');
            typeCell.textContent = result.type;
            row.appendChild(typeCell);
            
            const modelCell = document.createElement('td');
            modelCell.textContent = result.model;
            row.appendChild(modelCell);
            
            const detailsCell = document.createElement('td');
            const detailsButton = document.createElement('button');
            detailsButton.textContent = 'View';
            detailsButton.className = 'details-btn';
            detailsButton.addEventListener('click', () => showIssueDetails(result));
            detailsCell.appendChild(detailsButton);
            row.appendChild(detailsCell);
            
            tableBody.appendChild(row);
        });
    }
    
    function showIssueDetails(issue) {
        const detailsSection = document.getElementById('issue-details');
        detailsSection.style.display = 'block';
        
        document.getElementById('issue-title').textContent = `Issue: ${issue.id}`;
        document.getElementById('issue-id').textContent = `ID: ${issue.id}`;
        document.getElementById('issue-repo').textContent = `Repository: ${issue.repo}`;
        
        document.getElementById('issue-description').innerHTML = `
            <p>This is a sample ${issue.type} issue in the ${issue.repo} repository.</p>
            <p>Status: ${issue.status === 'pass' ? 'Resolved' : 'Failed'} by model ${issue.model}</p>
        `;
        
        document.getElementById('solution-code').querySelector('code').textContent = 
            `# Solution by ${issue.model}\n` +
            `def example_fix():\n` +
            `    # This is a placeholder for the actual solution code\n` +
            `    print("${issue.repo} issue fixed")\n` +
            `    return True`;
    }
    
    populateFilters();
    populateTable();
    
    document.getElementById('model-select').addEventListener('change', function() {
        console.log('Model filter changed:', this.value);
    });
    
    document.getElementById('repo-select').addEventListener('change', function() {
        console.log('Repository filter changed:', this.value);
    });
}); 