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

        // Delegate to specific chart renderers
        if (chartType === 'scatter') {
            compareChart = renderScatterChart(ctx, selected, colors, backgroundPlugin);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No cost data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'cumulative-cost') {
            compareChart = renderCumulativeChart(ctx, selected, colors, backgroundPlugin, 'cost', false);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance cost data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'cumulative-cost-resolved') {
            compareChart = renderCumulativeChart(ctx, selected, colors, backgroundPlugin, 'cost', true);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance cost data available for resolved instances.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'cumulative-steps') {
            compareChart = renderCumulativeChart(ctx, selected, colors, backgroundPlugin, 'api_calls', false);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance API call data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'cumulative-steps-resolved') {
            compareChart = renderCumulativeChart(ctx, selected, colors, backgroundPlugin, 'api_calls', true);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance API call data available for resolved instances.';
                    empty.style.display = '';
                }
            }
        } else {
            // Default to bar chart
            compareChart = renderBarChart(ctx, selected, colors, backgroundPlugin);
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


