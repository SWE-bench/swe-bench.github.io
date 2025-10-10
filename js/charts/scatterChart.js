// Scatter chart for cost vs performance analysis
function renderScatterChart(ctx, selected, colors, backgroundPlugin) {
    // Filter out models without cost data
    const modelsWithCost = selected.filter(s => s.cost !== null && s.cost !== undefined && s.cost !== 0 && !isNaN(s.cost));
    
    if (modelsWithCost.length === 0) {
        return null;
    }

    // Plugin to draw labels on scatter plot
    const labelPlugin = {
        id: 'scatterLabels',
        afterDatasetsDraw: (chart, args, options) => {
            if (chart.config.type !== 'scatter') return;
            const {ctx, chartArea} = chart;
            if (!chartArea) return;
            
            ctx.save();
            ctx.font = '12px sans-serif';
            ctx.fillStyle = colors.textColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            chart.data.datasets[0].data.forEach((point, index) => {
                const meta = chart.getDatasetMeta(0);
                const element = meta.data[index];
                if (!element) return;
                
                const x = element.x;
                const y = element.y;
                const label = modelsWithCost[index].name;
                
                // Draw label with slight offset
                ctx.fillText(label, x + 5, y);
            });
            
            ctx.restore();
        }
    };

    const scatterData = modelsWithCost.map(s => ({
        x: s.cost,
        y: s.resolved
    }));

    // Calculate y-axis range with nice round numbers
    const resolvedValues = modelsWithCost.map(s => s.resolved);
    const minResolved = Math.min(...resolvedValues);
    const maxResolved = Math.max(...resolvedValues);
    
    // Round to nice values (multiples of 5)
    const yMinRaw = Math.max(0, minResolved * 0.9);
    const yMaxRaw = Math.min(100, maxResolved * 1.05);
    const yMin = Math.floor(yMinRaw / 5) * 5; // Round down to nearest 5
    const yMax = Math.ceil(yMaxRaw / 5) * 5;  // Round up to nearest 5
    
    // Calculate x-axis range with extra padding for labels
    const costValues = modelsWithCost.map(s => s.cost);
    const maxCost = Math.max(...costValues);
    const xMax = maxCost * 1.15; // Add 15% padding for labels

    return new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Models',
                data: scatterData,
                backgroundColor: colors.barBackground,
                borderColor: colors.barBorder,
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    min: yMin,
                    max: yMax,
                    title: { 
                        display: true, 
                        text: '% Resolved',
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: { 
                        stepSize: 5,
                        callback: (v) => v + '%',
                        color: colors.textColor,
                        font: { size: 12 }
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    beginAtZero: true,
                    max: xMax,
                    title: { 
                        display: true, 
                        text: 'Average Cost ($)',
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
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const model = modelsWithCost[ctx.dataIndex];
                            return `${model.name}: $${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            }
        },
        plugins: [backgroundPlugin, labelPlugin]
    });
}

