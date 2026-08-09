// Grouped bar chart by programming language (for multilingual leaderboard)
function renderGroupedBarChartByLanguage(ctx, selected, colors, backgroundPlugin) {
    // Filter models that have per_instance_details
    const modelsWithDetails = selected.filter(s => s.per_instance_details !== null);

    if (modelsWithDetails.length === 0) {
        return null;
    }

    // Check if language mapping functions are available
    if (typeof getLanguageFromInstanceId !== 'function' || typeof LANGUAGE_ORDER === 'undefined') {
        console.error('Language mapping not loaded. Make sure multilingualLanguageMap.js is included.');
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

    // Collect all languages and count instances per language
    // Use a Set per language to avoid counting duplicates across models
    const languageInstanceSets = {};
    modelsWithDetails.forEach(model => {
        Object.keys(model.per_instance_details).forEach(instanceId => {
            const language = getLanguageFromInstanceId(instanceId);
            if (language === "Unknown") return;

            if (!languageInstanceSets[language]) {
                languageInstanceSets[language] = new Set();
            }
            languageInstanceSets[language].add(instanceId);
        });
    });

    // Convert sets to counts
    const languageInstanceCounts = {};
    Object.keys(languageInstanceSets).forEach(lang => {
        languageInstanceCounts[lang] = languageInstanceSets[lang].size;
    });

    // Use predefined language order, filtered to only include languages present in data
    const languages = LANGUAGE_ORDER.filter(lang => languageInstanceCounts[lang] > 0);

    if (languages.length === 0) {
        return null;
    }

    // For each model, calculate resolved percentage per language
    const datasets = modelsWithDetails.map((model, idx) => {
        const languageData = languages.map(lang => {
            // Find all instances for this language
            const instances = Object.entries(model.per_instance_details)
                .filter(([instanceId, _]) => getLanguageFromInstanceId(instanceId) === lang);

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
            data: languageData,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1
        };
    });

    // Create labels with instance counts
    const displayLabels = languages.map(lang => {
        const instanceCount = languageInstanceCounts[lang];
        return `${lang} (${instanceCount})`;
    });

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Programming Language',
                        color: colors.textColor,
                        font: { size: 14 }
                    },
                    ticks: {
                        color: colors.textColor,
                        font: { size: 12 },
                        maxRotation: 0,
                        minRotation: 0
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
