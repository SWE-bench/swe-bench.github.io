// Cumulative distribution chart (generic for cost or api_calls)
// Parameters:
//   metric: 'cost' or 'api_calls'
//   resolvedOnly: if true, only include instances where resolved === true
function renderCumulativeChart(ctx, selected, colors, backgroundPlugin, metric = 'cost', resolvedOnly = false) {
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
        // Extract values from per_instance_details
        const allDetails = Object.values(model.per_instance_details);
        const totalInstances = allDetails.length;
        
        // Debug: Check what resolved values we have
        if (idx === 0) {
            const resolvedTypes = {};
            allDetails.slice(0, 5).forEach(d => {
                resolvedTypes[`${typeof d.resolved}:${d.resolved}`] = (resolvedTypes[`${typeof d.resolved}:${d.resolved}`] || 0) + 1;
            });
            console.log('Sample resolved values (first 5):', resolvedTypes);
            console.log('Filter condition - resolvedOnly:', resolvedOnly);
        }
        
        let values = allDetails
            .filter(d => !resolvedOnly || d.resolved === true)
            .map(d => d[metric]);
        
        // Debug logging
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        
        const metricLabel = metric === 'api_calls' ? 'calls' : '$';
        const formatValue = metric === 'api_calls' ? (v) => v.toFixed(0) : (v) => v.toFixed(3);
        
        if (resolvedOnly) {
            console.log(`[Resolved Only] ${model.name}: ${values.length}/${totalInstances} instances (${(values.length/totalInstances*100).toFixed(1)}% resolved) | Median: ${metricLabel}${formatValue(median)}, Q1: ${metricLabel}${formatValue(q1)}, Q3: ${metricLabel}${formatValue(q3)}`);
        } else {
            console.log(`[All Instances] ${model.name}: ${values.length} instances | Median: ${metricLabel}${formatValue(median)}, Q1: ${metricLabel}${formatValue(q1)}, Q3: ${metricLabel}${formatValue(q3)}`);
        }
        
        // If no values after filtering, skip this model
        if (values.length === 0) {
            return null;
        }
        
        // Sort values
        const sortedValues = sorted;
        
        // Create cumulative distribution
        const cumulativeData = sortedValues.map((value, i) => ({
            x: value,
            y: ((i + 1) / sortedValues.length) * 100
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
    }).filter(d => d !== null);

    // If no valid datasets after filtering, return null
    if (datasets.length === 0) {
        return null;
    }

    // Calculate x-axis range
    const allValues = modelsWithDetails.flatMap(m => 
        Object.values(m.per_instance_details)
            .filter(d => !resolvedOnly || d.resolved === true)
            .map(d => d[metric])
    );
    const maxValue = Math.max(...allValues);

    // Configure labels based on metric
    const isApiCalls = metric === 'api_calls';
    const xAxisLabel = isApiCalls ? 'API Calls per Instance' : 'Cost per Instance ($)';
    const xTickCallback = isApiCalls ? (v) => v.toFixed(0) : (v) => '$' + v.toFixed(2);
    const tooltipCallback = isApiCalls 
        ? (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(0)} calls (${ctx.parsed.y.toFixed(1)}%)`
        : (ctx) => `${ctx.dataset.label}: $${ctx.parsed.x.toFixed(2)} (${ctx.parsed.y.toFixed(1)}%)`;

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

// Backward compatibility wrapper
function renderCumulativeCostChart(ctx, selected, colors, backgroundPlugin) {
    return renderCumulativeChart(ctx, selected, colors, backgroundPlugin, 'cost', false);
}

