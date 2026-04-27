document.addEventListener("DOMContentLoaded", () => {
    const svg = document.getElementById('connections');
    const legendContainer = document.getElementById('flow-legend-container');
    
    // Unique colors for 8 different flow sets
    const colorMap = {
        1: '#ff0055', 2: '#00d2ff', 3: '#ffaa00', 4: '#a600ff',
        5: '#00ff88', 6: '#ff5500', 7: '#ffff00', 8: '#0055ff'
    };

    function resizeSVG() {
        const container = document.getElementById('diagram-container');
        svg.setAttribute('width', container.offsetWidth);
        svg.setAttribute('height', container.offsetHeight);
        svg.setAttribute('viewBox', `0 0 ${container.offsetWidth} ${container.offsetHeight}`);
    }

    resizeSVG();
    window.addEventListener('resize', () => { resizeSVG(); drawAllFlows(); });

    function getCenter(id) {
        const el = document.getElementById(id);
        const container = document.getElementById('diagram-container');
        if (!el) return {x: 0, y: 0};
        
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        return {
            x: rect.left - containerRect.left + (rect.width / 2),
            y: rect.top - containerRect.top + (rect.height / 2)
        };
    }

    function createPath(startX, startY, endX, endY, strokeStyle, color, cp1yOffset, cp2yOffset, markerId) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${startX} ${startY} C ${startX} ${startY + cp1yOffset}, ${endX} ${endY + cp2yOffset}, ${endX} ${endY}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('fill', 'none');
        
        if (strokeStyle === 'dashed') {
            path.setAttribute('stroke-dasharray', '8, 6');
            path.setAttribute('opacity', '0.8');
        } else if (strokeStyle === 'dotted') {
            path.setAttribute('stroke-dasharray', '3, 4');
            path.setAttribute('opacity', '0.6');
        }

        path.setAttribute('marker-end', `url(#${markerId})`);
        svg.appendChild(path);
    }

    function createTextLabel(x, y, textContent, color) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('fill', '#ffffff'); // Bold white text
        text.setAttribute('font-size', '13px'); // Extra large and readable
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        
        // This adds a painted border exactly matching the line color, acting as a clear visual box!
        text.style.paintOrder = "stroke fill";
        text.style.stroke = color;
        text.style.strokeWidth = "5px";
        text.style.strokeLinecap = "round";
        text.style.strokeLinejoin = "round";
        
        text.textContent = textContent;
        svg.appendChild(text);
    }

    function drawRoute(idStr1, idStr2, strokeStyle, color, markerId, curveType='normal', offset=0, labelText='') {
        const p1 = getCenter(idStr1);
        const p2 = getCenter(idStr2);
        
        if(p1.x === 0 || p2.x === 0) return;

        p1.x += offset;
        p2.x += offset;

        let cp1Offset, cp2Offset;
        if (curveType === 'down') {
            cp1Offset = 180; cp2Offset = -150;
        } else if (curveType === 'up') {
            cp1Offset = -180; cp2Offset = 150;
        } else if (curveType === 'inner') {
            cp1Offset = -40; cp2Offset = -40;
        } else if (curveType === 'inner-down') {
            cp1Offset = 40; cp2Offset = 40;
        } else if (curveType === 'deep') {
            cp1Offset = 250; cp2Offset = -250;
        } else {
            cp1Offset = 50; cp2Offset = -50;
        }

        createPath(p1.x, p1.y, p2.x, p2.y, strokeStyle, color, cp1Offset, cp2Offset, markerId);

        // Render port number on the wire!
        if (labelText) {
            let textX = p1.x;
            let textY = p1.y;
            
            // Push it far enough down the wire so it fully clears the HTML port box bounds
            if (curveType === 'down') {
                textY = p1.y + 60; 
            } else if (curveType === 'up') {
                textX = p2.x; 
                textY = p2.y + 60; 
            } else if (curveType === 'deep') {
                textY = p1.y + 90; 
            }

            createTextLabel(textX, textY, labelText, color);
        }
    }

    function buildDefs() {
        let defsHtml = '<defs>';
        for(let i = 1; i <= 8; i++) {
            defsHtml += `<marker id="arrow-flow${i}" markerWidth="8" markerHeight="8" refX="7" refY="4" orientation="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${colorMap[i]}" /></marker>`;
        }
        defsHtml += '</defs>';
        return defsHtml;
    }

    function buildLegend() {
        legendContainer.innerHTML = '';
        for (let i = 1; i <= 8; i++) {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '8px';
            div.innerHTML = `<div style="width:15px; height:15px; border-radius:50%; background:${colorMap[i]}"></div> <span style="color:#ccc; font-size:11px; font-weight:bold;">Flow ${i}</span>`;
            legendContainer.appendChild(div);
        }
    }

    function drawAllFlows() {
        svg.innerHTML = buildDefs();
        buildLegend();

        const flows = [
            { id: 1, inPort: 'ex0-9', src: 'ex0-1', egress: 'ex0-11', mirror: 'ex0-10' },
            { id: 2, inPort: 'ex0-11', src: 'ex0-3', egress: 'ex0-9', mirror: 'ex0-12' },
            { id: 3, inPort: 'ex0-13', src: 'ex0-7', egress: 'ex0-15', mirror: 'ex0-14' },
            { id: 4, inPort: 'ex0-15', src: 'ex0-5', egress: 'ex0-13', mirror: 'ex0-16' },
            { id: 5, inPort: 'ex2-10', src: 'ex2-2', egress: 'ex2-12', mirror: 'ex2-8' },
            { id: 6, inPort: 'ex2-12', src: 'ex2-4', egress: 'ex2-10', mirror: 'ex2-6' },
            { id: 7, inPort: 'ex2-13', src: 'ex2-5', egress: 'ex2-15', mirror: 'ex2-14' },
            { id: 8, inPort: 'ex2-15', src: 'ex2-7', egress: 'ex2-13', mirror: 'ex2-16' }
        ];

        flows.forEach(flow => {
            const color = colorMap[flow.id];
            const marker = `arrow-flow${flow.id}`;
            const dpiTargetId = Math.ceil(flow.id / 2);
            
            const offset = (flow.id * 5) - 22; 

            // 1. Cybernet In to Network Side Port
            drawRoute('cloud-in', flow.inPort, 'solid', color, marker, 'down', offset, `In: ${flow.inPort}`);
            
            // 2. Logic: Network Side Port -> Appliance Side Port
            drawRoute(flow.inPort, flow.src, 'dotted', color, marker, 'inner', 0);
            
            // 3. Appliance Side Port -> DPI Server
            drawRoute(flow.src, `dpi-${dpiTargetId}`, 'solid', color, marker, 'down', offset - 10, `Out: ${flow.src}`);
            
            // 4. DPI Server -> Appliance Side Port (Return)
            drawRoute(`dpi-${dpiTargetId}`, flow.src, 'dashed', color, marker, 'up', offset + 10, `Ret: ${flow.src}`);
            
            // 5. Logic: Appliance Side Port -> Egress Network side Port
            drawRoute(flow.src, flow.egress, 'dotted', color, marker, 'inner-down', 0);
            
            // 6. Egress Network Side Port -> Cybernet Out
            drawRoute(flow.egress, 'cloud-out', 'dashed', color, marker, 'up', offset, `Out: ${flow.egress}`);
            
            // 7. Mirror Port to Mirror DPI
            drawRoute(flow.mirror, `m-dpi-${dpiTargetId}`, 'dashed', color, marker, 'deep', offset, `Mir: ${flow.mirror}`);
        });
    }

    setTimeout(drawAllFlows, 300);
});
