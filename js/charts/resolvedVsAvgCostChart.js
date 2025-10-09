// Resolved vs Average Cost chart
function renderResolvedVsAvgCostChart(ctx, selected, colors, backgroundPlugin) {
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

    const datasets = modelsWithDetails.map((model, idx) => {
        const allDetails = Object.values(model.per_instance_details);
        const totalInstances = allDetails.length;
        
        // Get all instances with their data
        const instances = allDetails.map(d => ({
            api_calls: d.api_calls,
            cost: d.cost,
            resolved: d.resolved === true
        }));
        
        // Find max api_calls
        const maxApiCalls = Math.max(...instances.map(i => i.api_calls));
        
        // For each step limit, calculate resolved % and average cost
        const chartData = [];
        
        // Scan through step limits
        for (let stepLimit = 0; stepLimit <= maxApiCalls; stepLimit++) {
            // Filter instances with api_calls <= stepLimit
            const filteredInstances = instances.filter(i => i.api_calls <= stepLimit);
            
            if (filteredInstances.length === 0) {
                continue;
            }
            
            // Calculate resolved count
            const resolvedCount = filteredInstances.filter(i => i.resolved).length;
            const resolvedPercentage = (resolvedCount / totalInstances) * 100;
            
            // Calculate average cost of filtered instances
            const avgCost = filteredInstances.reduce((sum, i) => sum + i.cost, 0) / filteredInstances.length;
            
            chartData.push({ 
                x: avgCost, 
                y: resolvedPercentage,
                stepLimit: stepLimit,
                numInstances: filteredInstances.length
            });
        }
        
        const color = colorPalette[idx % colorPalette.length];
        
        return {
            label: `${model.name} (${model.resolved.toFixed(1)}%)`,
            data: chartData,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.1
        };
    });

    // Calculate max resolved percentage across all datasets
    const maxResolved = Math.max(...datasets.flatMap(d => d.data.map(p => p.y)));
    const tentativeMax = maxResolved * 1.1;
    // Round up to nearest 5 or 10 for cleaner y-axis labels
    let yAxisMax;
    if (tentativeMax > 100) {
        yAxisMax = 100;
    } else if (tentativeMax > 50) {
        yAxisMax = Math.ceil(tentativeMax / 10) * 10; // Round to nearest 10
    } else {
        yAxisMax = Math.ceil(tentativeMax / 5) * 5; // Round to nearest 5
    }

    return new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'linear',
                    beginAtZero: true,
                    title: { 
                        display: true, 
                        text: 'Average Cost per Instance ($)',
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: {
                        callback: (v) => '$' + v.toFixed(2),
                        color: colors.textColor,
                        font: { size: 12 }
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMax,
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
                    mode: 'nearest',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => {
                            const dataPoint = ctx.dataset.data[ctx.dataIndex];
                            return [
                                `${ctx.dataset.label}`,
                                `Avg cost: $${ctx.parsed.x.toFixed(3)}`,
                                `Resolved: ${ctx.parsed.y.toFixed(1)}%`,
                                `Step limit: ${dataPoint.stepLimit}`,
                                `Instances: ${dataPoint.numInstances}`
                            ];
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        },
        plugins: [backgroundPlugin]
    });
}

