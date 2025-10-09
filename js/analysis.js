// Analysis and comparison features for leaderboard
(function() {
    let compareChart = null;
    let resizeObserver = null;
    let chartTheme = 'dark'; // 'light' or 'dark'

    function getLeaderboardData() {
        const dataScript = document.getElementById('leaderboard-data');
        if (!dataScript) return null;
        try {
            return JSON.parse(dataScript.textContent);
        } catch (e) {
            console.error('Error parsing leaderboard data:', e);
            return null;
        }
    }

    function getSelectedModels() {
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        if (!active) return [];
        const checkboxes = active.querySelectorAll('input.row-select:checked');
        
        // Get full leaderboard data (it's a direct array, not wrapped in a property)
        const leaderboardData = getLeaderboardData();
        
        const activeLeaderboard = leaderboardData?.find(lb => {
            return active.id === `leaderboard-${lb.name}`;
        });
        
        return Array.from(checkboxes).map(cb => {
            const row = cb.closest('tr');
            const costCell = row ? row.querySelector('td:nth-child(4) .number') : null;
            const costText = costCell ? costCell.textContent.trim().replace('$', '') : '';
            const cost = costText ? parseFloat(costText) : null;
            
            const modelName = cb.getAttribute('data-model');
            
            // Find full model data from leaderboard
            const fullModelData = activeLeaderboard?.results?.find(r => r.name === modelName);
            
            return {
                name: modelName,
                resolved: parseFloat(cb.getAttribute('data-resolved')) || 0,
                cost: cost,
                per_instance_details: fullModelData?.per_instance_details || null
            };
        });
    }

    function getThemeColors(theme) {
        if (theme === 'light') {
            return {
                background: '#ffffff',
                gridColor: 'rgba(0, 0, 0, 0.1)',
                textColor: '#333333',
                barBackground: 'rgba(37, 99, 235, 0.6)',
                barBorder: 'rgba(37, 99, 235, 1)'
            };
        } else {
            return {
                background: 'transparent',
                gridColor: 'rgba(255, 255, 255, 0.1)',
                textColor: '#ffffff',
                barBackground: 'rgba(37, 99, 235, 0.6)',
                barBorder: 'rgba(37, 99, 235, 1)'
            };
        }
    }

    function openModal() {
        const selected = getSelectedModels();
        if (!selected.length) {
            openNoSelectionModal();
            return;
        }
        const modal = document.getElementById('compare-modal');
        if (!modal) return;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        renderChart();
        setupResizeObserver();
    }

    function openNoSelectionModal() {
        const modal = document.getElementById('no-selection-modal');
        if (!modal) return;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeNoSelectionModal() {
        const modal = document.getElementById('no-selection-modal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    }

    function selectAll() {
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        if (!active) return;
        
        // First uncheck all
        const allCheckboxes = active.querySelectorAll('input.row-select');
        allCheckboxes.forEach(cb => cb.checked = false);
        
        // Get visible rows (not filtered out)
        const visibleRows = Array.from(active.querySelectorAll('tbody tr:not(.no-results)'))
            .filter(row => row.style.display !== 'none');
        
        // Select all visible rows
        visibleRows.forEach(row => {
            const checkbox = row.querySelector('input.row-select');
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        closeNoSelectionModal();
        openModal();
    }

    function selectTopN(n, openWeightsOnly = false) {
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        if (!active) return;
        
        // First uncheck all
        const allCheckboxes = active.querySelectorAll('input.row-select');
        allCheckboxes.forEach(cb => cb.checked = false);
        
        // Get visible rows (not filtered out)
        let visibleRows = Array.from(active.querySelectorAll('tbody tr:not(.no-results)'))
            .filter(row => row.style.display !== 'none');
        
        // Filter by open weights if requested
        if (openWeightsOnly) {
            visibleRows = visibleRows.filter(row => row.getAttribute('data-os_model') === 'true');
        }
        
        // Select top N visible rows (or all if n is null/undefined)
        const rowsToSelect = n ? visibleRows.slice(0, n) : visibleRows;
        rowsToSelect.forEach(row => {
            const checkbox = row.querySelector('input.row-select');
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        closeNoSelectionModal();
        openModal();
    }

    function closeModal() {
        const modal = document.getElementById('compare-modal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        teardownResizeObserver();
    }

    function setupResizeObserver() {
        const modalDialog = document.querySelector('#compare-modal .modal-dialog');
        if (!modalDialog) return;
        
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        
        resizeObserver = new ResizeObserver(() => {
            if (compareChart) {
                compareChart.resize();
            }
        });
        
        resizeObserver.observe(modalDialog);
    }

    function teardownResizeObserver() {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
    }

    function renderChart() {
        const selected = getSelectedModels();
        const empty = document.getElementById('compare-empty');
        const canvas = document.getElementById('compare-chart');
        if (!canvas) return;

        if (compareChart) {
            compareChart.destroy();
            compareChart = null;
        }

        if (!selected.length) {
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        const ctx = canvas.getContext('2d');
        const colors = getThemeColors(chartTheme);

        // Set canvas background via container
        const chartContainer = canvas.closest('.chart-container');
        if (chartContainer) {
            chartContainer.style.backgroundColor = colors.background;
        }

        // Plugin to draw background on the chart
        const backgroundPlugin = {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart, args, options) => {
                const {ctx, chartArea} = chart;
                if (!chartArea) return;
                ctx.save();
                ctx.fillStyle = colors.background;
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        };

        const chartTypeSelect = document.getElementById('compare-chart-type');
        const chartType = chartTypeSelect ? chartTypeSelect.value : 'bar';

        if (chartType === 'scatter') {
            // Filter out models without cost data
            const modelsWithCost = selected.filter(s => s.cost !== null && s.cost !== undefined && s.cost !== 0 && !isNaN(s.cost));
            
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
            
            if (modelsWithCost.length === 0) {
                if (empty) {
                    empty.textContent = 'No cost data available for selected models.';
                    empty.style.display = '';
                }
                return;
            }

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

            compareChart = new Chart(ctx, {
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
        } else if (chartType === 'cumulative-cost') {
            // Cumulative cost distribution
            const modelsWithDetails = selected.filter(s => s.per_instance_details !== null);
            
            if (modelsWithDetails.length === 0) {
                if (empty) {
                    empty.textContent = 'No per-instance cost data available for selected models.';
                    empty.style.display = '';
                }
                return;
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

            compareChart = new Chart(ctx, {
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
        } else {
            // Bar chart
            const labels = selected.map(s => s.name);
            const values = selected.map(s => s.resolved);

            compareChart = new Chart(ctx, {
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
    }

    function toggleChartTheme() {
        chartTheme = chartTheme === 'light' ? 'dark' : 'light';
        updateThemeButton();
        renderChart();
    }

    function updateThemeButton() {
        const btn = document.getElementById('chart-theme-toggle');
        if (!btn) return;
        if (chartTheme === 'light') {
            btn.innerHTML = '<i class="fa fa-moon"></i>&nbsp;Dark';
            btn.title = 'Switch to dark mode';
        } else {
            btn.innerHTML = '<i class="fa fa-sun"></i>&nbsp;Light';
            btn.title = 'Switch to light mode';
        }
    }

    function downloadJSON() {
        const selected = getSelectedModels();
        if (!selected.length) return;
        
        const data = {
            timestamp: new Date().toISOString(),
            models: selected.map(s => {
                const modelData = {
                    name: s.name,
                    resolved: s.resolved,
                    cost: s.cost
                };
                
                // Include per_instance_details if available
                if (s.per_instance_details) {
                    modelData.per_instance_details = s.per_instance_details;
                }
                
                return modelData;
            })
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swe-bench-comparison-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadPNG() {
        if (!compareChart) return;
        
        const canvas = document.getElementById('compare-chart');
        if (!canvas) return;
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `swe-bench-chart-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function initEvents() {
        // Open via delegated event to handle dynamic rendering
        document.addEventListener('click', (e) => {
            const trigger = e.target && typeof e.target.closest === 'function' ? e.target.closest('#compare-btn') : null;
            if (trigger) {
                e.preventDefault();
                e.stopPropagation();
                openModal();
            }
        });

        // Close via backdrop or close button/icon
        const modal = document.getElementById('compare-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                const closeEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-close="true"]') : null;
                if (closeEl) {
                    e.preventDefault();
                    closeModal();
                }
            });
        }

        const chartType = document.getElementById('compare-chart-type');
        if (chartType) {
            chartType.addEventListener('change', () => {
                // Future chart types can be handled here; for now just re-render
                renderChart();
            });
        }

        const themeToggle = document.getElementById('chart-theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleChartTheme();
            });
        }

        // Quickselect button handler
        const quickselectBtn = document.getElementById('quickselect-btn');
        if (quickselectBtn) {
            quickselectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal();
                openNoSelectionModal();
            });
        }

        // Download JSON button handler
        const downloadJsonBtn = document.getElementById('download-json-btn');
        if (downloadJsonBtn) {
            downloadJsonBtn.addEventListener('click', (e) => {
                e.preventDefault();
                downloadJSON();
            });
        }

        // Download PNG button handler
        const downloadPngBtn = document.getElementById('download-png-btn');
        if (downloadPngBtn) {
            downloadPngBtn.addEventListener('click', (e) => {
                e.preventDefault();
                downloadPNG();
            });
        }

        // No selection modal close handlers
        const noSelectionModal = document.getElementById('no-selection-modal');
        if (noSelectionModal) {
            noSelectionModal.addEventListener('click', (e) => {
                const closeEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-close="true"]') : null;
                if (closeEl) {
                    e.preventDefault();
                    closeNoSelectionModal();
                }
            });
        }

        // Quick select buttons
        const selectTop10 = document.getElementById('select-top-10');
        if (selectTop10) {
            selectTop10.addEventListener('click', () => selectTopN(10, false));
        }

        const selectTop20 = document.getElementById('select-top-20');
        if (selectTop20) {
            selectTop20.addEventListener('click', () => selectTopN(20, false));
        }

        const selectAllBtn = document.getElementById('select-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => selectAll());
        }

        const selectAllOW = document.getElementById('select-all-ow');
        if (selectAllOW) {
            selectAllOW.addEventListener('click', () => selectTopN(null, true));
        }

        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('row-select')) {
                if (document.getElementById('compare-modal')?.classList.contains('show')) {
                    renderChart();
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEvents);
    } else {
        initEvents();
    }
})();


