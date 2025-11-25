// Resolved instances matrix chart (GitHub contribution style)
function renderResolvedInstancesMatrix(ctx, selected, colors, backgroundPlugin, chunkStart = 0, chunkSize = null) {
    // Filter models that have per_instance_details
    const modelsWithDetails = selected.filter(s => s.per_instance_details !== null);
    
    if (modelsWithDetails.length === 0) {
        return null;
    }

    // Get all unique instance IDs across all models
    const allInstanceIds = new Set();
    modelsWithDetails.forEach(model => {
        Object.keys(model.per_instance_details).forEach(id => allInstanceIds.add(id));
    });
    
    // Calculate solve rate for each instance (how many models solved it)
    const instanceSolveCount = {};
    Array.from(allInstanceIds).forEach(instanceId => {
        let solvedCount = 0;
        modelsWithDetails.forEach(model => {
            const instanceData = model.per_instance_details[instanceId];
            if (instanceData && instanceData.resolved) {
                solvedCount++;
            }
        });
        instanceSolveCount[instanceId] = solvedCount;
    });
    
    // Sort by solve rate (descending), then alphabetically by instance ID
    const allSortedInstanceIds = Array.from(allInstanceIds).sort((a, b) => {
        const solveRateA = instanceSolveCount[a];
        const solveRateB = instanceSolveCount[b];
        
        // First, sort by solve rate (higher solve rate first)
        if (solveRateB !== solveRateA) {
            return solveRateB - solveRateA;
        }
        
        // Then, sort alphabetically by instance ID
        return a.localeCompare(b);
    });
    
    const canvas = ctx.canvas;
    
    // Internal function to draw the matrix without setting up event listeners
    function drawMatrix(start, size) {
        // Use all instances if size is null, otherwise slice to get the current chunk
        const sortedInstanceIds = size === null 
            ? allSortedInstanceIds 
            : allSortedInstanceIds.slice(start, start + size);
    
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;

        // Calculate margins and dimensions
        const leftMargin = 200; // Space for model names (increased for longer names)
        const topMargin = 30; // Minimal top margin
        const rightMargin = 10;
        const bottomMargin = 30; // Space for hover text
        
        const availableWidth = width - leftMargin - rightMargin;
        const availableHeight = height - topMargin - bottomMargin;
        
        const cellWidth = Math.max(2, availableWidth / sortedInstanceIds.length);
        const cellHeight = Math.max(20, availableHeight / modelsWithDetails.length);

        // Clear canvas and draw background
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        // Calculate percentage of instances resolved by at least one model
        let instancesResolvedByAtLeastOne = 0;
        Array.from(allInstanceIds).forEach(instanceId => {
            if (instanceSolveCount[instanceId] > 0) {
                instancesResolvedByAtLeastOne++;
            }
        });
        const percentageResolvedByAtLeastOne = ((instancesResolvedByAtLeastOne / allInstanceIds.size) * 100).toFixed(2);

        // Draw title
        ctx.fillStyle = colors.textColor;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`Resolved Instances Matrix (hover for details, drag to zoom) - ${percentageResolvedByAtLeastOne}% of instances resolved by at least one model`, 10, 15);

        // Draw model names (y-axis labels) with line breaks
        ctx.fillStyle = colors.textColor;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        modelsWithDetails.forEach((model, rowIdx) => {
            const y = topMargin + rowIdx * cellHeight + cellHeight / 2;
            
            // Calculate percentage resolved for this model
            let totalInstances = 0;
            let resolvedInstances = 0;
            Object.values(model.per_instance_details).forEach(instanceData => {
                totalInstances++;
                if (instanceData.resolved) {
                    resolvedInstances++;
                }
            });
            const resolvePercentage = ((resolvedInstances / totalInstances) * 100).toFixed(2);
            
            // Create display name with percentage
            const displayName = `${model.name} (${resolvePercentage}%)`;
            const lines = [];
            for (let i = 0; i < displayName.length; i += 25) {
                lines.push(displayName.substring(i, i + 25));
            }
            
            // Draw each line
            const lineHeight = 12;
            const totalHeight = lines.length * lineHeight;
            const startY = y - (totalHeight / 2) + (lineHeight / 2);
            
            lines.forEach((line, lineIdx) => {
                ctx.fillText(line, leftMargin - 5, startY + lineIdx * lineHeight);
            });
        });

        // Draw matrix cells
        modelsWithDetails.forEach((model, rowIdx) => {
            sortedInstanceIds.forEach((instanceId, colIdx) => {
                const instanceData = model.per_instance_details[instanceId];
                const x = leftMargin + colIdx * cellWidth;
                const y = topMargin + rowIdx * cellHeight;
                
                // Draw cell
                if (!instanceData) {
                    // Instance not in this model's data
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.1)';
                } else if (instanceData.resolved) {
                    // Resolved - green for all models
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
                } else {
                    // Not resolved - gray
                    ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
                }
                
                ctx.fillRect(x, y, Math.max(1, cellWidth - 0.5), cellHeight - 1);
            });
        });
        
        // Return dimensions for use in event handlers
        return { 
            sortedInstanceIds, 
            leftMargin, 
            topMargin, 
            rightMargin, 
            bottomMargin, 
            width, 
            height, 
            cellWidth, 
            cellHeight 
        };
    }
    
    // Initial draw
    let currentStart = chunkStart;
    let currentSize = chunkSize;
    let dims = drawMatrix(currentStart, currentSize);

    // Create tooltip element if it doesn't exist
    let tooltip = document.getElementById('matrix-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'matrix-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontFamily = 'sans-serif';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '10000';
        tooltip.style.display = 'none';
        tooltip.style.whiteSpace = 'nowrap';
        document.body.appendChild(tooltip);
    }

    // Create zoom out button if it doesn't exist
    let zoomOutBtn = document.getElementById('matrix-zoom-out-btn');
    if (!zoomOutBtn) {
        zoomOutBtn = document.createElement('button');
        zoomOutBtn.id = 'matrix-zoom-out-btn';
        zoomOutBtn.textContent = 'Zoom Out';
        zoomOutBtn.style.position = 'absolute';
        zoomOutBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
        zoomOutBtn.style.color = 'white';
        zoomOutBtn.style.border = 'none';
        zoomOutBtn.style.padding = '6px 12px';
        zoomOutBtn.style.borderRadius = '4px';
        zoomOutBtn.style.fontSize = '12px';
        zoomOutBtn.style.fontFamily = 'sans-serif';
        zoomOutBtn.style.cursor = 'pointer';
        zoomOutBtn.style.zIndex = '10001';
        zoomOutBtn.style.display = 'none';
        zoomOutBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        document.body.appendChild(zoomOutBtn);
        
        // Hover effect
        zoomOutBtn.addEventListener('mouseenter', () => {
            zoomOutBtn.style.backgroundColor = 'rgba(59, 130, 246, 1)';
        });
        zoomOutBtn.addEventListener('mouseleave', () => {
            zoomOutBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
        });
    }
    
    // Function to update zoom button position and visibility
    function updateZoomButton() {
        const rect = canvas.getBoundingClientRect();
        const isZoomed = currentSize !== null && (currentStart !== 0 || currentSize !== allSortedInstanceIds.length);
        
        if (isZoomed) {
            zoomOutBtn.style.display = 'block';
            zoomOutBtn.style.left = (rect.right - 100) + 'px';
            zoomOutBtn.style.top = (rect.top + 5) + 'px';
        } else {
            zoomOutBtn.style.display = 'none';
        }
    }
    
    // Initial button state
    updateZoomButton();

    // State for drag-to-zoom
    let isDragging = false;
    let dragStartX = null;
    let dragCurrentX = null;

    // Store event handlers for cleanup
    const mouseMoveHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update drag selection if dragging
        if (isDragging && mouseX >= dims.leftMargin && mouseX < dims.width - dims.rightMargin) {
            dragCurrentX = mouseX;
            
            // Redraw with selection overlay
            drawMatrix(currentStart, currentSize);
            
            // Draw selection overlay
            const startX = Math.min(dragStartX, dragCurrentX);
            const endX = Math.max(dragStartX, dragCurrentX);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.lineWidth = 2;
            ctx.fillRect(startX, dims.topMargin, endX - startX, dims.height - dims.topMargin - dims.bottomMargin);
            ctx.strokeRect(startX, dims.topMargin, endX - startX, dims.height - dims.topMargin - dims.bottomMargin);
            
            tooltip.style.display = 'none';
            return;
        }
        
        // Check if mouse is over the matrix area (normal hover behavior)
        if (mouseX >= dims.leftMargin && mouseX < dims.width - dims.rightMargin &&
            mouseY >= dims.topMargin && mouseY < dims.height - dims.bottomMargin) {
            
            // Calculate which column
            const colIdx = Math.floor((mouseX - dims.leftMargin) / dims.cellWidth);
            
            if (colIdx >= 0 && colIdx < dims.sortedInstanceIds.length) {
                const instanceId = dims.sortedInstanceIds[colIdx];
                
                // Calculate resolve rate for this instance
                const solvedCount = instanceSolveCount[instanceId];
                const totalModels = modelsWithDetails.length;
                const resolveRate = ((solvedCount / totalModels) * 100).toFixed(2);
                
                // Show tooltip with instance ID and resolve rate
                tooltip.textContent = `${instanceId} (${resolveRate}% resolved)`;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY - 30) + 'px';
            } else {
                tooltip.style.display = 'none';
            }
        } else {
            tooltip.style.display = 'none';
        }
    };
    
    const mouseDownHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if click is in the matrix area
        if (mouseX >= dims.leftMargin && mouseX < dims.width - dims.rightMargin &&
            mouseY >= dims.topMargin && mouseY < dims.height - dims.bottomMargin) {
            isDragging = true;
            dragStartX = mouseX;
            dragCurrentX = mouseX;
            canvas.style.cursor = 'col-resize';
        }
    };
    
    const mouseUpHandler = (e) => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'default';
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Calculate the selected range in terms of instance indices
            const startX = Math.min(dragStartX, mouseX);
            const endX = Math.max(dragStartX, mouseX);
            
            const startColIdx = Math.floor((startX - dims.leftMargin) / dims.cellWidth);
            const endColIdx = Math.ceil((endX - dims.leftMargin) / dims.cellWidth);
            
            // Only zoom if there's a meaningful selection (at least 5 pixels)
            if (Math.abs(endX - startX) > 5) {
                const newStart = Math.max(0, startColIdx);
                const newEnd = Math.min(dims.sortedInstanceIds.length, endColIdx);
                const newSize = newEnd - newStart;
                
                if (newSize > 0) {
                    // Calculate absolute indices in the full dataset
                    const absoluteStart = currentStart + newStart;
                    const absoluteEnd = currentStart + newEnd;
                    
                    // Update current range and redraw
                    currentStart = absoluteStart;
                    currentSize = absoluteEnd - absoluteStart;
                    dims = drawMatrix(currentStart, currentSize);
                    
                    // Update the metadata
                    chartInstance._matrixMetadata.chunkStart = currentStart;
                    chartInstance._matrixMetadata.chunkSize = currentSize;
                    
                    // Update zoom button visibility
                    updateZoomButton();
                }
            }
            
            dragStartX = null;
            dragCurrentX = null;
        }
    };
    
    const mouseLeaveHandler = () => {
        tooltip.style.display = 'none';
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'default';
            dragStartX = null;
            dragCurrentX = null;
            
            // Redraw without selection overlay
            drawMatrix(currentStart, currentSize);
        }
    };
    
    const zoomOutHandler = (e) => {
        // Reset to show all instances
        currentStart = 0;
        currentSize = null;
        dims = drawMatrix(currentStart, currentSize);
        
        // Update the metadata
        chartInstance._matrixMetadata.chunkStart = currentStart;
        chartInstance._matrixMetadata.chunkSize = allSortedInstanceIds.length;
        
        // Update zoom button visibility
        updateZoomButton();
    };
    
    // Add event listeners
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mousedown', mouseDownHandler);
    canvas.addEventListener('mouseup', mouseUpHandler);
    canvas.addEventListener('mouseleave', mouseLeaveHandler);
    zoomOutBtn.addEventListener('click', zoomOutHandler);

    // Return a Chart-like object for compatibility
    const chartInstance = {
        destroy: () => {
            // Remove event listeners
            canvas.removeEventListener('mousemove', mouseMoveHandler);
            canvas.removeEventListener('mousedown', mouseDownHandler);
            canvas.removeEventListener('mouseup', mouseUpHandler);
            canvas.removeEventListener('mouseleave', mouseLeaveHandler);
            zoomOutBtn.removeEventListener('click', zoomOutHandler);
            
            // Hide tooltip when chart is destroyed
            const tooltip = document.getElementById('matrix-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
            
            // Hide zoom button when chart is destroyed
            const zoomBtn = document.getElementById('matrix-zoom-out-btn');
            if (zoomBtn) {
                zoomBtn.style.display = 'none';
            }
        },
        resize: () => {
            dims = drawMatrix(currentStart, currentSize);
            updateZoomButton();
        },
        update: () => {},
        data: { datasets: [] },
        options: {},
        _matrixMetadata: {
            totalInstances: allSortedInstanceIds.length,
            chunkStart: chunkStart,
            chunkSize: chunkSize === null ? allSortedInstanceIds.length : chunkSize
        }
    };
    
    return chartInstance;
}

