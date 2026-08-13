// Scatter chart for resolved % vs model release date
function renderResolvedVsReleaseDateChart(ctx, selected, colors, backgroundPlugin) {
    // Filter models with release dates (prefer inline model_release_date, fallback to JS lookup)
    const modelsWithDates = selected.filter(s => {
        return s.model_release_date || getModelReleaseDate(s.tags);
    });

    if (modelsWithDates.length === 0) {
        return null;
    }

    // Plugin to draw labels on scatter plot
    const labelPlugin = {
        id: 'releaseDateLabels',
        afterDatasetsDraw: (chart, args, options) => {
            if (chart.config.type !== 'scatter') return;
            const {ctx, chartArea} = chart;
            if (!chartArea) return;

            ctx.save();
            ctx.font = '11px sans-serif';
            ctx.fillStyle = colors.textColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            chart.data.datasets[0].data.forEach((point, index) => {
                const meta = chart.getDatasetMeta(0);
                const element = meta.data[index];
                if (!element) return;

                const x = element.x;
                const y = element.y;
                const label = modelsWithDates[index].name;

                // Draw label with slight offset
                ctx.fillText(label, x + 8, y);
            });

            ctx.restore();
        }
    };

    // Prepare scatter data
    const scatterData = modelsWithDates.map(s => {
        const releaseDateInt = s.model_release_date || getModelReleaseDate(s.tags);
        const releaseDate = parseReleaseDateInt(releaseDateInt);
        return {
            x: releaseDate.getTime(),
            y: s.resolved
        };
    });

    // Calculate y-axis range with nice round numbers
    const resolvedValues = modelsWithDates.map(s => s.resolved);
    const minResolved = Math.min(...resolvedValues);
    const maxResolved = Math.max(...resolvedValues);

    // Round to nice values (multiples of 5)
    const yMinRaw = Math.max(0, minResolved * 0.9);
    const yMaxRaw = Math.min(100, maxResolved * 1.05);
    const yMin = Math.floor(yMinRaw / 5) * 5;
    const yMax = Math.ceil(yMaxRaw / 5) * 5;

    // Calculate x-axis (date) range with padding
    const dateValues = scatterData.map(d => d.x);
    const minDate = Math.min(...dateValues);
    const maxDate = Math.max(...dateValues);
    const dateRange = maxDate - minDate;
    const xMin = minDate - dateRange * 0.05;
    const xMax = maxDate + dateRange * 0.20; // More padding on right for labels

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
                    type: 'time',
                    min: xMin,
                    max: xMax,
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Model Release Date',
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: {
                        color: colors.textColor,
                        font: { size: 12 },
                        maxRotation: 45
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
                            const model = modelsWithDates[ctx.dataIndex];
                            const releaseDateInt = model.model_release_date || getModelReleaseDate(model.tags);
                            const releaseDate = parseReleaseDateInt(releaseDateInt);
                            const formattedDate = formatReleaseDate(releaseDate);
                            return `${model.name}: ${formattedDate}, ${ctx.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            }
        },
        plugins: [backgroundPlugin, labelPlugin]
    });
}
