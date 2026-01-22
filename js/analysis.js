// Analysis and comparison features for leaderboard
(function() {
    let compareChart = null;
    let resizeObserver = null;
    
    // Initialize chartTheme based on global dark mode state
    function getGlobalTheme() {
        return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    }
    
    let chartTheme = getGlobalTheme();

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
                per_instance_details: fullModelData?.per_instance_details || null,
                tags: fullModelData?.tags || null
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
        
        // Sync chart theme with global theme when opening modal
        chartTheme = getGlobalTheme();
        updateThemeButton();
        
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

        // Hide matrix tooltip if it exists (safety check)
        const matrixTooltip = document.getElementById('matrix-tooltip');
        if (matrixTooltip) {
            matrixTooltip.style.display = 'none';
        }

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
        } else if (chartType === 'grouped-bar') {
            compareChart = renderGroupedBarChart(ctx, selected, colors, backgroundPlugin);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'grouped-bar-language') {
            compareChart = renderGroupedBarChartByLanguage(ctx, selected, colors, backgroundPlugin);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance data available for selected models, or language mapping not loaded.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'resolved-instances-matrix') {
            // Show all instances by default (null chunkSize), drag to zoom, double-click to reset
            compareChart = renderResolvedInstancesMatrix(ctx, selected, colors, backgroundPlugin, 0, null);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'resolved-vs-avg-cost') {
            compareChart = renderResolvedVsAvgCostChart(ctx, selected, colors, backgroundPlugin);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'resolved-vs-cost-limit') {
            compareChart = renderResolvedVsLimitChart(ctx, selected, colors, backgroundPlugin, 'cost');
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance cost data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'resolved-vs-step-limit') {
            compareChart = renderResolvedVsLimitChart(ctx, selected, colors, backgroundPlugin, 'api_calls');
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No per-instance API call data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else if (chartType === 'resolved-vs-release-date') {
            compareChart = renderResolvedVsReleaseDateChart(ctx, selected, colors, backgroundPlugin);
            if (!compareChart) {
                if (empty) {
                    empty.textContent = 'No release date data available for selected models.';
                    empty.style.display = '';
                }
            }
        } else {
            // Default to bar chart
            compareChart = renderBarChart(ctx, selected, colors, backgroundPlugin);
        }
    }

    function toggleChartTheme() {
        // Toggle global dark mode
        document.body.classList.toggle('dark-mode');
        
        // Update localStorage to persist the preference
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        // Update chart theme to match global theme
        chartTheme = getGlobalTheme();
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

    function copyShareableLink() {
        const selected = getSelectedModels();
        if (selected.length === 0) {
            alert('Please select at least one model to share.');
            return;
        }

        const chartType = document.getElementById('compare-chart-type');
        const chartTypeValue = chartType ? chartType.value : 'bar';
        
        // Get current leaderboard
        const container = document.getElementById('leaderboard-container');
        const active = container ? container.querySelector('.tabcontent.active') : null;
        const leaderboardId = active ? active.id.replace('leaderboard-', '') : 'verified';
        
        // Build URL parameters
        const params = new URLSearchParams();
        params.set('leaderboard', leaderboardId);
        params.set('chart', chartTypeValue);
        params.set('models', selected.map(m => m.name).join(','));
        
        // Create full URL
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?${params.toString()}`;
        
        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                // Visual feedback
                const btn = document.getElementById('copy-link-btn');
                if (btn) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fa fa-check"></i>&nbsp;Copied!';
                    btn.classList.add('btn-success');
                    btn.classList.remove('btn-outline-secondary');
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.classList.remove('btn-success');
                        btn.classList.add('btn-outline-secondary');
                    }, 2000);
                }
            }).catch(err => {
                console.error('Failed to copy link:', err);
                alert('Failed to copy link to clipboard. Please copy manually:\n' + shareUrl);
            });
        } else {
            // Fallback for older browsers
            alert('Copy this link:\n' + shareUrl);
        }
    }

    function restoreStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        if (!params.has('models')) {
            return; // No state to restore
        }
        
        const leaderboardName = params.get('leaderboard') || 'verified';
        const chartType = params.get('chart') || 'bar';
        const modelNames = params.get('models').split(',').filter(m => m.trim());
        
        if (modelNames.length === 0) {
            return;
        }
        
        // Switch to the correct leaderboard tab
        const leaderboardTab = document.querySelector(`[data-leaderboard="${leaderboardName}"]`);
        if (leaderboardTab) {
            leaderboardTab.click();
        }
        
        // Wait a bit for the tab to load, then select models
        setTimeout(() => {
            const container = document.getElementById('leaderboard-container');
            const active = container ? container.querySelector('.tabcontent.active') : null;
            if (!active) return;
            
            // Deselect all first
            const allCheckboxes = active.querySelectorAll('input.row-select');
            allCheckboxes.forEach(cb => cb.checked = false);
            
            // Select the models from URL
            modelNames.forEach(modelName => {
                const checkbox = active.querySelector(`input.row-select[data-model="${modelName}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            // Open the compare modal
            openModal();
            
            // Set the chart type
            const chartTypeSelect = document.getElementById('compare-chart-type');
            if (chartTypeSelect) {
                chartTypeSelect.value = chartType;
            }
            
            // Render the chart
            renderChart();
        }, 300);
    }

    function initEvents() {
        // Listen for global theme changes (e.g., from sidebar toggle)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const newTheme = getGlobalTheme();
                    if (newTheme !== chartTheme) {
                        chartTheme = newTheme;
                        updateThemeButton();
                        // Only re-render if modal is open
                        if (document.getElementById('compare-modal')?.classList.contains('show')) {
                            renderChart();
                        }
                    }
                }
            });
        });
        observer.observe(document.body, { attributes: true });
        
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
        const chunkSelector = document.getElementById('matrix-chunk-selector');
        
        if (chartType) {
            chartType.addEventListener('change', () => {
                // Keep chunk selector hidden - drag-to-zoom is now built into the chart
                if (chunkSelector) {
                    chunkSelector.style.display = 'none';
                }
                renderChart();
            });
        }
        
        // Chunk selector is no longer used - drag-to-zoom functionality is built into the chart
        // Keeping this code commented for reference
        // if (chunkSelector) {
        //     chunkSelector.addEventListener('change', () => {
        //         if (chartType && chartType.value === 'resolved-instances-matrix') {
        //             renderChart();
        //         }
        //     });
        // }

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

        // Copy link button handler
        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                copyShareableLink();
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
        
        // Restore state from URL if present
        restoreStateFromURL();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEvents);
    } else {
        initEvents();
    }
})();


