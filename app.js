document.addEventListener("DOMContentLoaded", () => {
    const svg = document.getElementById('connections');
    
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

    function createPath(startX, startY, endX, endY, classes, color, cp1yOffset, cp2yOffset) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${startX} ${startY} C ${startX} ${startY + cp1yOffset}, ${endX} ${endY + cp2yOffset}, ${endX} ${endY}`;
        path.setAttribute('d', d);
        path.setAttribute('class', classes);
        path.setAttribute('stroke', color);
        
        // Add directional arrows
        let markerId = '';
        if(color === '#58a6ff') markerId = 'url(#arrow-blue)';
        if(color === '#3fb950') markerId = 'url(#arrow-green)';
        if(color === '#d29922') markerId = 'url(#arrow-orange)';
        
        path.setAttribute('marker-end', markerId);
        
        svg.appendChild(path);
    }

    function drawRoute(idStr1, idStr2, classes, color, curveType='normal', offset=0) {
        const p1 = getCenter(idStr1);
        const p2 = getCenter(idStr2);
        
        if(p1.x === 0 || p2.x === 0) return;

        p1.x += offset;
        p2.x += offset;

        let cp1Offset, cp2Offset;
        if (curveType === 'down') {
            cp1Offset = 100; cp2Offset = -100;
        } else if (curveType === 'up') {
            cp1Offset = -100; cp2Offset = 100;
        } else if (curveType === 'inner') {
            cp1Offset = -25; cp2Offset = -25;
        } else if (curveType === 'inner-down') {
            cp1Offset = 25; cp2Offset = 25;
        } else if (curveType === 'deep') {
            cp1Offset = 200; cp2Offset = -200;
        } else {
            cp1Offset = 50; cp2Offset = -50;
        }

        createPath(p1.x, p1.y, p2.x, p2.y, classes, color, cp1Offset, cp2Offset);
    }

    function drawAllFlows() {
        svg.innerHTML = `
            <defs>
                <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orientation="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#58a6ff" />
                </marker>
                <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orientation="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#3fb950" />
                </marker>
                <marker id="arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orientation="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#d29922" />
                </marker>
            </defs>
        `;

        const flows = [
            // EX0 flows (1-4)
            { type: 'ex0', id: 1, inPort: 'ex0-9', src: 'ex0-1', egress: 'ex0-11', mirror: 'ex0-10' },
            { type: 'ex0', id: 2, inPort: 'ex0-11', src: 'ex0-3', egress: 'ex0-9', mirror: 'ex0-12' },
            { type: 'ex0', id: 3, inPort: 'ex0-13', src: 'ex0-7', egress: 'ex0-15', mirror: 'ex0-14' },
            { type: 'ex0', id: 4, inPort: 'ex0-15', src: 'ex0-5', egress: 'ex0-13', mirror: 'ex0-16' },
            // EX2 flows (5-8)
            { type: 'ex2', id: 5, inPort: 'ex2-10', src: 'ex2-2', egress: 'ex2-12', mirror: 'ex2-8' },
            { type: 'ex2', id: 6, inPort: 'ex2-12', src: 'ex2-4', egress: 'ex2-10', mirror: 'ex2-6' },
            { type: 'ex2', id: 7, inPort: 'ex2-13', src: 'ex2-5', egress: 'ex2-15', mirror: 'ex2-14' },
            { type: 'ex2', id: 8, inPort: 'ex2-15', src: 'ex2-7', egress: 'ex2-13', mirror: 'ex2-16' }
        ];

        flows.forEach(flow => {
            const color = flow.type === 'ex0' ? '#58a6ff' : '#3fb950';
            
            // Map 8 flows into 4 Primary/Mirror DPI servers.
            // Flow 1,2 -> DPI 1
            // Flow 3,4 -> DPI 2
            // Flow 5,6 -> DPI 3
            // Flow 7,8 -> DPI 4
            const dpiTargetId = Math.ceil(flow.id / 2);
            
            // Add a visual spread offset so overlapping flows from different sequences are distinct
            const offset = (flow.id % 2 === 0) ? 6 : -6;

            // 1. Cybernet In to InPort (Inward arrow)
            drawRoute('cloud-in', flow.inPort, 'path-uplink', color, 'down', offset);
            
            // 2. InPort to Source Port (Logical inner wire fwd)
            drawRoute(flow.inPort, flow.src, 'path-logical', color, 'inner', offset);
            
            // 3. Source Port to DPI (Uplink Physical inward to server)
            drawRoute(flow.src, `dpi-${dpiTargetId}`, 'path-uplink', color, 'down', offset - 4);
            
            // 4. DPI to Source Port (Downlink Physical outward from server)
            drawRoute(`dpi-${dpiTargetId}`, flow.src, 'path-return', color, 'up', offset + 4);
            
            // 5. Source Port to Egress Port (Logical inner wire fwd)
            drawRoute(flow.src, flow.egress, 'path-logical', color, 'inner-down', offset);
            
            // 6. Egress to Cybernet Out (Outward arrow)
            drawRoute(flow.egress, 'cloud-out', 'path-return', color, 'up', offset);
            
            // 7. Mirror Port to Mirror DPI (Crosses over standard DPIs, inward arrow)
            drawRoute(flow.mirror, `m-dpi-${dpiTargetId}`, 'path-mirror', '#d29922', 'deep', offset);
        });
    }

    setTimeout(drawAllFlows, 150);
});
