// Bar chart for performance comparison
function renderBarChart(ctx, selected, colors, backgroundPlugin) {
    const labels = selected.map(s => s.name);
    const values = selected.map(s => s.resolved);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '% Resolved',
                data: values,
                backgroundColor: colors.barBackground,
                borderColor: colors.barBorder,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { 
                        display: true, 
                        text: '% Resolved',
                        color: colors.textColor
                    },
                    ticks: { 
                        callback: (v) => v + '%',
                        color: colors.textColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    title: { 
                        display: true, 
                        text: 'Model',
                        color: colors.textColor
                    },
                    ticks: {
                        color: colors.textColor
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
                        label: (ctx) => `${ctx.parsed.y.toFixed(2)}%`
                    }
                }
            }
        },
        plugins: [backgroundPlugin]
    });
}

