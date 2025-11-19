// Grouped bar chart by repository
function renderGroupedBarChart(ctx, selected, colors, backgroundPlugin) {
    // Filter models that have per_instance_details
    const modelsWithDetails = selected.filter(s => s.per_instance_details !== null);
    
    if (modelsWithDetails.length === 0) {
        return null;
    }

    // Generate distinct colors for each model
    const colorPalette = [
        'rgb(37, 99, 235)',   // blue
        'rgb(220, 38, 38)',   // red
        'rgb(22, 163, 74)',   // green
        'rgb(234, 88, 12)',   // orange
        'rgb(168, 85, 247)',  // purple
        'rgb(236, 72, 153)',  // pink
        'rgb(14, 165, 233)',  // cyan
        'rgb(234, 179, 8)',   // yellow
        'rgb(156, 163, 175)', // gray
        'rgb(251, 146, 60)',  // amber
    ];

    // Extract repository name from instance ID
    function getRepoFromInstanceId(instanceId) {
        // Format: org__repo-1234 -> repo (just the repo part)
        // Split by '-' and find where the number starts
        const parts = instanceId.split('-');
        let repoParts = [];
        
        for (let i = 0; i < parts.length; i++) {
            // Check if this part starts with a digit
            if (parts[i] && /^\d/.test(parts[i])) {
                // This is the start of the issue number, take everything before
                repoParts = parts.slice(0, i);
                break;
            }
        }
        
        if (repoParts.length === 0) {
            repoParts = parts; // No number found, use all parts
        }
        
        // Join parts back and replace __ with /
        const fullPath = repoParts.join('-').replace(/__/g, '/');
        
        // Extract just the repo name (after the last /)
        const pathParts = fullPath.split('/');
        return pathParts[pathParts.length - 1];
    }

    // Collect all repositories and count instances per repo
    // Use a Set per repo to avoid counting duplicates across models
    const repoInstanceSets = {};
    modelsWithDetails.forEach(model => {
        Object.keys(model.per_instance_details).forEach(instanceId => {
            const repo = getRepoFromInstanceId(instanceId);
            if (!repoInstanceSets[repo]) {
                repoInstanceSets[repo] = new Set();
            }
            repoInstanceSets[repo].add(instanceId);
        });
    });

    // Convert sets to counts
    const repoInstanceCounts = {};
    Object.keys(repoInstanceSets).forEach(repo => {
        repoInstanceCounts[repo] = repoInstanceSets[repo].size;
    });

    // Sort repositories by name
    const repos = Object.keys(repoInstanceCounts).sort();

    // For each model, calculate resolved percentage per repository
    const datasets = modelsWithDetails.map((model, idx) => {
        const repoData = repos.map(repo => {
            // Find all instances for this repo
            const instances = Object.entries(model.per_instance_details)
                .filter(([instanceId, _]) => getRepoFromInstanceId(instanceId) === repo);
            
            if (instances.length === 0) {
                return 0;
            }

            // Calculate resolved percentage
            const resolvedCount = instances.filter(([_, data]) => data.resolved === true).length;
            return (resolvedCount / instances.length) * 100;
        });

        const color = colorPalette[idx % colorPalette.length];

        return {
            label: model.name,
            data: repoData,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1
        };
    });

    // Limit to top N repositories if there are too many
    const maxRepos = 20;
    let displayRepos = repos;
    let displayDatasets = datasets;

    if (repos.length > maxRepos) {
        // Calculate average resolved percentage across all models for each repo
        const repoScores = repos.map((repo, idx) => {
            const avgScore = datasets.reduce((sum, dataset) => sum + dataset.data[idx], 0) / datasets.length;
            return { repo, idx, avgScore };
        });

        // Sort by average score descending and take top N
        repoScores.sort((a, b) => b.avgScore - a.avgScore);
        const topIndices = repoScores.slice(0, maxRepos).map(r => r.idx);
        
        displayRepos = topIndices.map(idx => repos[idx]);
        displayDatasets = datasets.map(dataset => ({
            ...dataset,
            data: topIndices.map(idx => dataset.data[idx])
        }));
    }

    // Create labels with instance counts
    const displayLabels = displayRepos.map(repo => {
        const instanceCount = repoInstanceCounts[repo];
        return `${repo} (${instanceCount})`;
    });

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: displayDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: repos.length > maxRepos ? `Repository (top ${maxRepos} by avg performance)` : 'Repository',
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: {
                        color: colors.textColor,
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Resolved (%)',
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: {
                        callback: (v) => v + '%',
                        color: colors.textColor,
                        font: { size: 12 }
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: colors.textColor,
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            }
        },
        plugins: [backgroundPlugin]
    });
}

