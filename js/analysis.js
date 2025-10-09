// Analysis and comparison features for leaderboard
(function() {
    let compareChart = null;
    let resizeObserver = null;
    let chartTheme = 'dark'; // 'light' or 'dark'

    function getSelectedModels() {
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        if (!active) return [];
        const checkboxes = active.querySelectorAll('input.row-select:checked');
        return Array.from(checkboxes).map(cb => {
            const row = cb.closest('tr');
            const costCell = row ? row.querySelector('td:nth-child(4) .number') : null;
            const costText = costCell ? costCell.textContent.trim().replace('$', '') : '';
            const cost = costText ? parseFloat(costText) : null;
            
            return {
                name: cb.getAttribute('data-model'),
                resolved: parseFloat(cb.getAttribute('data-resolved')) || 0,
                cost: cost
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
            const modelsWithCost = selected.filter(s => s.cost !== null && s.cost !== undefined);
            
            // Plugin to draw labels on scatter plot
            const labelPlugin = {
                id: 'scatterLabels',
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
                                color: colors.textColor
                            },
                            ticks: { 
                                stepSize: 5,
                                callback: (v) => v + '%',
                                color: colors.textColor
                            },
                            grid: {
                                color: colors.gridColor
                            }
                        },
                        x: {
                            beginAtZero: true,
                            title: { 
                                display: true, 
                                text: 'Average Cost ($)',
                                color: colors.textColor
                            },
                            ticks: {
                                callback: (v) => '$' + v.toFixed(2),
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
            btn.innerHTML = '<i class="fa fa-moon"></i>';
            btn.title = 'Switch to dark mode';
        } else {
            btn.innerHTML = '<i class="fa fa-sun"></i>';
            btn.title = 'Switch to light mode';
        }
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


