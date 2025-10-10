// Resolved instances matrix chart (GitHub contribution style)
function renderResolvedInstancesMatrix(ctx, selected, colors, backgroundPlugin, chunkStart = 0, chunkSize = 100) {
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
    const allSortedInstanceIds = Array.from(allInstanceIds).sort();
    
    // Slice to get the current chunk
    const sortedInstanceIds = allSortedInstanceIds.slice(chunkStart, chunkStart + chunkSize);

    const canvas = ctx.canvas;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    // Calculate margins and dimensions
    const leftMargin = 120; // Space for model names
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

    // Draw title
    ctx.fillStyle = colors.textColor;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Resolved Instances Matrix (hover to see instance ID)', 10, 15);

    // Draw model names (y-axis labels) with line breaks
    ctx.fillStyle = colors.textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    modelsWithDetails.forEach((model, rowIdx) => {
        const y = topMargin + rowIdx * cellHeight + cellHeight / 2;
        
        // Insert line breaks every 12 characters
        const displayName = model.name;
        const lines = [];
        for (let i = 0; i < displayName.length; i += 12) {
            lines.push(displayName.substring(i, i + 12));
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

    // Store event handlers for cleanup
    const mouseMoveHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if mouse is over the matrix area
        if (mouseX >= leftMargin && mouseX < width - rightMargin &&
            mouseY >= topMargin && mouseY < height - bottomMargin) {
            
            // Calculate which column
            const colIdx = Math.floor((mouseX - leftMargin) / cellWidth);
            
            if (colIdx >= 0 && colIdx < sortedInstanceIds.length) {
                const instanceId = sortedInstanceIds[colIdx];
                
                // Show tooltip
                tooltip.textContent = instanceId;
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
    
    const mouseLeaveHandler = () => {
        tooltip.style.display = 'none';
    };
    
    // Add event listeners
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mouseleave', mouseLeaveHandler);

    // Return a Chart-like object for compatibility
    return {
        destroy: () => {
            // Remove event listeners
            canvas.removeEventListener('mousemove', mouseMoveHandler);
            canvas.removeEventListener('mouseleave', mouseLeaveHandler);
            
            // Hide tooltip when chart is destroyed
            const tooltip = document.getElementById('matrix-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        },
        resize: () => {
            renderResolvedInstancesMatrix(ctx, selected, colors, backgroundPlugin, chunkStart, chunkSize);
        },
        update: () => {},
        data: { datasets: [] },
        options: {},
        _matrixMetadata: {
            totalInstances: allSortedInstanceIds.length,
            chunkStart: chunkStart,
            chunkSize: chunkSize
        }
    };
}

