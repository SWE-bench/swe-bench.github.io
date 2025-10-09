// Resolved vs cost/step limit chart
function renderResolvedVsLimitChart(ctx, selected, colors, backgroundPlugin, metric = 'cost') {
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
        
        // Get all values and resolved status
        const instances = allDetails.map(d => ({
            value: d[metric],
            resolved: d.resolved === true
        }));
        
        // Sort by value
        instances.sort((a, b) => a.value - b.value);
        
        // Find max value for this model
        const maxValue = Math.max(...instances.map(i => i.value));
        
        // Create data points - for each instance, calculate cumulative resolved %
        const chartData = [];
        let resolvedCount = 0;
        
        // Add point at 0
        chartData.push({ x: 0, y: 0 });
        
        // For each instance (sorted by value), check if resolved and update count
        instances.forEach((instance, i) => {
            if (instance.resolved) {
                resolvedCount++;
            }
            
            // Add a point at this value with the current resolved percentage
            const resolvedPercentage = (resolvedCount / totalInstances) * 100;
            chartData.push({ x: instance.value, y: resolvedPercentage });
        });
        
        const color = colorPalette[idx % colorPalette.length];
        
        return {
            label: model.name,
            data: chartData,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0,
            stepped: 'before'  // Step function to show threshold behavior
        };
    });

    // Calculate x-axis range across all models
    const allValues = modelsWithDetails.flatMap(m => 
        Object.values(m.per_instance_details).map(d => d[metric])
    );
    const maxValue = Math.max(...allValues);

    // Configure labels based on metric
    const isApiCalls = metric === 'api_calls';
    const xAxisLabel = isApiCalls ? 'API Call Limit' : 'Cost Limit ($)';
    const xTickCallback = isApiCalls ? (v) => v.toFixed(0) : (v) => '$' + v.toFixed(2);
    const tooltipCallback = isApiCalls 
        ? (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(0)} calls → ${ctx.parsed.y.toFixed(1)}% resolved`
        : (ctx) => `${ctx.dataset.label}: $${ctx.parsed.x.toFixed(2)} → ${ctx.parsed.y.toFixed(1)}% resolved`;

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
                    max: maxValue * 1.05,
                    title: { 
                        display: true, 
                        text: xAxisLabel,
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: {
                        callback: xTickCallback,
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
                        label: tooltipCallback
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

