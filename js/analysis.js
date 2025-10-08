// Analysis and comparison features for leaderboard
(function() {
    let compareChart = null;

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

    function openModal() {
        const selected = getSelectedModels();
        if (!selected.length) {
            alert('Please select at least one model using the checkboxes before comparing results.');
            return;
        }
        const modal = document.getElementById('compare-modal');
        if (!modal) return;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        renderChart();
    }

    function closeModal() {
        const modal = document.getElementById('compare-modal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
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

        compareChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '% Resolved',
                    data: values,
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '% Resolved' },
                        ticks: { callback: (v) => v + '%' }
                    },
                    x: {
                        title: { display: true, text: 'Model' }
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
            }
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


