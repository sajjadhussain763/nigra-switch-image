document.addEventListener("DOMContentLoaded", () => {
    const svg = document.getElementById('connections');
    const legendContainer = document.getElementById('flow-legend-container');

    // Tuned for maximum visibility on a white background
    const colorMap = {
        1: '#d6336c', 2: '#0077b6', 3: '#e67700', 4: '#7b2ff7',
        5: '#0ca678', 6: '#c92a2a', 7: '#b8860b', 8: '#1a53ff'
    };

    function resizeSVG() {
        const container = document.getElementById('diagram-container');
        svg.setAttribute('width',   container.offsetWidth);
        svg.setAttribute('height',  container.offsetHeight);
        svg.setAttribute('viewBox', `0 0 ${container.offsetWidth} ${container.offsetHeight}`);
    }

    resizeSVG();
    window.addEventListener('resize', () => { resizeSVG(); drawAllFlows(); });

    function getEdge(id, side) {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0 };

        const container = document.getElementById('diagram-container');
        const r  = el.getBoundingClientRect();
        const cr = container.getBoundingClientRect();

        const cx = r.left - cr.left + r.width  / 2;
        const cy = r.top  - cr.top  + r.height / 2;

        switch (side) {
            case 'top':    return { x: cx,              y: r.top    - cr.top };
            case 'bottom': return { x: cx,              y: r.bottom - cr.top };
            case 'left':   return { x: r.left - cr.left, y: cy };
            case 'right':  return { x: r.right - cr.left, y: cy };
            default:       return { x: cx,              y: cy };
        }
    }

    function drawPath(x1, y1, x2, y2, style, color, cp1y, cp2y, markerId) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + cp1y}, ${x2} ${y2 + cp2y}, ${x2} ${y2}`);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');

        if (style === 'dashed') {
            path.setAttribute('stroke-dasharray', '9,6');
            path.setAttribute('opacity', '0.9');
        } else if (style === 'dotted') {
            path.setAttribute('stroke-dasharray', '3,5');
            path.setAttribute('opacity', '0.8');
        } else {
            path.setAttribute('opacity', '1');
        }

        path.setAttribute('marker-end', `url(#${markerId})`);
        svg.appendChild(path);
    }

    function drawRoute(fromId, toId, style, color, markerId, curve = 'down', xOffset = 0) {
        let fromSide, toSide;
        switch (curve) {
            case 'down':       fromSide = 'bottom'; toSide = 'top';    break;
            case 'up':         fromSide = 'top';    toSide = 'bottom'; break;
            case 'inner':      fromSide = 'top';    toSide = 'top';    break;
            case 'inner-down': fromSide = 'bottom'; toSide = 'bottom'; break;
            case 'deep':       fromSide = 'bottom'; toSide = 'top';    break;
            default:           fromSide = 'center'; toSide = 'center'; break;
        }

        const p1 = getEdge(fromId, fromSide);
        const p2 = getEdge(toId,   toSide);
        if (p1.x === 0 && p1.y === 0) return;
        if (p2.x === 0 && p2.y === 0) return;

        const x1 = p1.x + xOffset;
        const x2 = p2.x + xOffset;
        const y1 = p1.y;
        const y2 = p2.y;

        let cp1, cp2;
        switch (curve) {
            case 'down':       cp1 =  200; cp2 = -160; break;
            case 'up':         cp1 = -200; cp2 =  160; break;
            case 'inner':      cp1 =  -50; cp2 =  -50; break;
            case 'inner-down': cp1 =   50; cp2 =   50; break;
            case 'deep':       cp1 =  280; cp2 = -280; break;
            default:           cp1 =   60; cp2 =  -60; break;
        }

        drawPath(x1, y1, x2, y2, style, color, cp1, cp2, markerId);
    }

    function buildDefs() {
        let d = '<defs>';
        for (let i = 1; i <= 8; i++) {
            const c = colorMap[i];
            d += `<marker id="arrow-flow${i}" markerWidth="5" markerHeight="4"
                         refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L5,2 L0,4 Z" fill="${c}"/>
                  </marker>`;
        }
        d += '</defs>';
        return d;
    }

    function buildLegend() {
        legendContainer.innerHTML = '';
        for (let i = 1; i <= 8; i++) {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:8px;';
            div.innerHTML = `
                <div style="width:14px;height:14px;border-radius:50%;background:${colorMap[i]};
                            border:2px solid rgba(0,0,0,0.15);flex-shrink:0;"></div>
                <span style="color:#333;font-size:11px;font-weight:bold;">Flow ${i}</span>`;
            legendContainer.appendChild(div);
        }
    }

    function drawAllFlows() {
        svg.innerHTML = buildDefs();
        buildLegend();

        /**
         * UPDATED MAPPING:
         * We pair network ports (9,11) and (13,15) to specific appliance ports.
         * Flow 1 (Uplink):   9 -> 1 -> 11   (Port 1 matches Port 11 as outward)
         * Flow 2 (Downlink): 11 -> 1 -> 9   (Port 1 matches Port 9 as outward)
         * This creates a bidirectional flow set sharing a single appliance port for each DPI link.
         */
        const flows = [
            // EX0 Pair 1 (DPI-1)
            { id: 1, inPort: 'ex0-9',  src: 'ex0-1', egress: 'ex0-11', mirror: 'ex0-10' },
            { id: 2, inPort: 'ex0-11', src: 'ex0-1', egress: 'ex0-9',  mirror: 'ex0-12' },
            // EX0 Pair 2 (DPI-2)
            { id: 3, inPort: 'ex0-13', src: 'ex0-3', egress: 'ex0-15', mirror: 'ex0-14' },
            { id: 4, inPort: 'ex0-15', src: 'ex0-3', egress: 'ex0-13', mirror: 'ex0-16' },
            // EX2 Pair 3 (DPI-3)
            { id: 5, inPort: 'ex2-10', src: 'ex2-8', egress: 'ex2-12', mirror: 'ex2-2'  },
            { id: 6, inPort: 'ex2-12', src: 'ex2-6', egress: 'ex2-10', mirror: 'ex2-4'  },
            // EX2 Pair 4 (DPI-4)
            { id: 7, inPort: 'ex2-13', src: 'ex2-5', egress: 'ex2-15', mirror: 'ex2-14' },
            { id: 8, inPort: 'ex2-15', src: 'ex2-7', egress: 'ex2-13', mirror: 'ex2-16' }
        ];

        flows.forEach(flow => {
            const color  = colorMap[flow.id];
            const marker = `arrow-flow${flow.id}`;
            const dpi    = Math.ceil(flow.id / 2);

            const off = (flow.id - 4.5) * 6;

            // 1. Cybernet IN  →  Network Port
            drawRoute('cloud-in',           flow.inPort, 'solid',  color, marker, 'down', off);
            // 2. Network Port  →  Appliance Port (Inner)
            drawRoute(flow.inPort,          flow.src,    'dotted', color, marker, 'inner',      0);
            // 3. Appliance Port  →  DPI Server
            drawRoute(flow.src,             `dpi-${dpi}`,'solid',  color, marker, 'down', off - 8);
            // 4. DPI Server  →  Appliance Port
            drawRoute(`dpi-${dpi}`,         flow.src,    'dashed', color, marker, 'up',   off + 8);
            // 5. Appliance Port  →  Egress Port (Inner)
            drawRoute(flow.src,             flow.egress, 'dotted', color, marker, 'inner-down', 0);
            // 6. Egress Port  →  Cybernet OUT
            drawRoute(flow.egress,          'cloud-out', 'dashed', color, marker, 'up',   off);
            // 7. Mirror Port  →  Mirror DPI Server
            drawRoute(flow.mirror,          `m-dpi-${dpi}`, 'dashed', color, marker, 'deep', off);
        });
    }

// ── Download Feature ──────────────────────────────────────────────────
const downloadPngBtn = document.getElementById('download-png');
const downloadJpgBtn = document.getElementById('download-jpg');
const downloadPdfBtn = document.getElementById('download-pdf');

function captureAndDownload(fileName, mimeType, extension) {
    // Hide all download buttons during capture
    [downloadPngBtn, downloadJpgBtn, downloadPdfBtn].forEach(btn => btn && (btn.style.display = 'none'));
    const container = document.getElementById('diagram-container');
    html2canvas(container, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        if (extension === 'pdf') {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(fileName + '.pdf');
        } else {
            const link = document.createElement('a');
            link.download = fileName + '.' + extension;
            link.href = canvas.toDataURL(mimeType);
            link.click();
        }
        // Restore button visibility
        [downloadPngBtn, downloadJpgBtn, downloadPdfBtn].forEach(btn => btn && (btn.style.display = 'inline-block'));
    }).catch(err => console.error('Capture failed', err));
}

if (downloadPngBtn) {
    downloadPngBtn.addEventListener('click', () => captureAndDownload('NIAGARA_SWITCH_11_Diagram', 'image/png', 'png'));
}
if (downloadJpgBtn) {
    downloadJpgBtn.addEventListener('click', () => captureAndDownload('NIAGARA_SWITCH_11_Diagram', 'image/jpeg', 'jpg'));
}
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => captureAndDownload('NIAGARA_SWITCH_11_Diagram', null, 'pdf'));
}
    setTimeout(drawAllFlows, 350);
});
