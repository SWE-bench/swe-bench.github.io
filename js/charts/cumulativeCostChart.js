// Cumulative cost distribution chart
function renderCumulativeCostChart(ctx, selected, colors, backgroundPlugin) {
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
        // Extract costs from per_instance_details
        const costs = Object.values(model.per_instance_details).map(d => d.cost);
        
        // Sort costs
        const sortedCosts = [...costs].sort((a, b) => a - b);
        
        // Create cumulative distribution
        const cumulativeData = sortedCosts.map((cost, i) => ({
            x: cost,
            y: ((i + 1) / sortedCosts.length) * 100
        }));
        
        const color = colorPalette[idx % colorPalette.length];
        
        return {
            label: model.name,
            data: cumulativeData,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0,
            stepped: false
        };
    });

    // Calculate x-axis range
    const allCosts = modelsWithDetails.flatMap(m => 
        Object.values(m.per_instance_details).map(d => d.cost)
    );
    const maxCost = Math.max(...allCosts);

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
                    max: maxCost * 1.05,
                    title: { 
                        display: true, 
                        text: 'Cost per Instance ($)',
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
                    max: 100,
                    title: { 
                        display: true, 
                        text: 'Cumulative % of Instances',
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
                            return `${ctx.dataset.label}: $${ctx.parsed.x.toFixed(2)} (${ctx.parsed.y.toFixed(1)}%)`;
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

