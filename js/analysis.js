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
        return Array.from(checkboxes).map(cb => ({
            name: cb.getAttribute('data-model'),
            resolved: parseFloat(cb.getAttribute('data-resolved')) || 0
        }));
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

    function selectTopN(n) {
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        if (!active) return;
        
        // First uncheck all
        const allCheckboxes = active.querySelectorAll('input.row-select');
        allCheckboxes.forEach(cb => cb.checked = false);
        
        // Get visible rows (not filtered out)
        const visibleRows = Array.from(active.querySelectorAll('tbody tr:not(.no-results)'))
            .filter(row => row.style.display !== 'none');
        
        // Select top N visible rows
        const rowsToSelect = visibleRows.slice(0, n);
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
        const labels = selected.map(s => s.name);
        const values = selected.map(s => s.resolved);
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

    function toggleChartTheme() {
        chartTheme = chartTheme === 'light' ? 'dark' : 'light';
        updateThemeButton();
        renderChart();
    }

    function updateThemeButton() {
        const btn = document.getElementById('chart-theme-toggle');
        if (!btn) return;
        if (chartTheme === 'light') {
            btn.innerHTML = '<i class="fa fa-moon"></i> Dark mode';
            btn.title = 'Switch to dark mode';
        } else {
            btn.innerHTML = '<i class="fa fa-sun"></i> Light mode';
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
        const selectTop5 = document.getElementById('select-top-5');
        if (selectTop5) {
            selectTop5.addEventListener('click', () => selectTopN(5));
        }

        const selectTop10 = document.getElementById('select-top-10');
        if (selectTop10) {
            selectTop10.addEventListener('click', () => selectTopN(10));
        }

        const selectTop20 = document.getElementById('select-top-20');
        if (selectTop20) {
            selectTop20.addEventListener('click', () => selectTopN(20));
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


