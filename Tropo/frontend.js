(function() {
    if (document.getElementById('tropo-condition-monitor')) return;

    const GOLD = '#dba642'; // COLOR
    const MY_LAT = 49.12; // COORDINATIONS LAT
    const MY_LON = 16.19; // COORDINATIONS LON
    const CACHE_KEY = 'tropo_data_cache';
    let minPathLength = 200;

    // --- 1. ICON INTEGRATION ---
    const targetContainer = document.querySelector('.scrollable-container');
    if (targetContainer) {
        const btn = document.createElement('button');
        btn.className = 'no-bg color-4 hover-brighten tooltip';
        btn.id = 'tropo-toggle-button';
        btn.style.cssText = 'padding: 6px; width: 64px; min-width: 64px; cursor: pointer;';
        btn.setAttribute('data-tooltip', 'Tropo Focus Monitor');
        btn.setAttribute('data-tooltip-placement', 'bottom');
        btn.innerHTML = `
            <i class="fa-solid fa-tower-broadcast fa-lg top-10" style="color:${GOLD}"></i><br>
            <span style="font-size: 10px; color: var(--color-main-bright) !important;">Tropo</span>
        `;
        targetContainer.appendChild(btn);
        btn.onclick = toggleMonitor;
    }

    // --- 2. STYLE WITH DRAGGABLE SUPPORT ---
    const style = document.createElement('style');
    style.innerHTML = `
        #tropo-condition-monitor {
            position: fixed; top: 120px; right: 20px;
            width: 350px; background: rgba(15, 15, 15, 0.98); 
            border: 1px solid ${GOLD}; border-radius: 8px; color: #eee; 
            z-index: 20000; font-family: sans-serif; display: none;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); overflow: hidden;
            touch-action: none; /* Prevents scrolling while dragging */
        }
        .tropo-header { 
            padding: 12px; background: rgba(219, 166, 66, 0.15); 
            font-weight: bold; color: ${GOLD}; border-bottom: 1px solid #333; 
            display: flex; justify-content: space-between; align-items: center;
            cursor: move; /* Drag handle indicator */
        }
        .tropo-sub-header { padding: 6px 12px; font-size: 9px; color: #777; border-bottom: 1px solid #222; display: flex; justify-content: space-between; }
        .tropo-controls { padding: 10px; background: #111; border-bottom: 1px solid #333; display: flex; gap: 6px; justify-content: center; }
        .filter-btn { background: #252525; border: 1px solid #444; color: #888; padding: 5px 8px; font-size: 10px; cursor: pointer; border-radius: 4px; }
        .filter-btn.active { background: ${GOLD}; color: #000; font-weight: bold; border-color: ${GOLD}; }
        .tropo-close { cursor: pointer; font-size: 20px; color: #666; transition: 0.2s; padding: 0 5px; }
        .tropo-close:hover { color: #ff4444; }
        .tropo-item { padding: 12px; border-bottom: 1px solid #222; position: relative; }
        .cond-tag { font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 3px; color: #000; margin-left: 8px; }
        .compass-box { width: 42px; height: 42px; border: 1px solid #444; border-radius: 50%; position: absolute; right: 12px; top: 12px; background: #000; }
        .compass-needle { width: 2px; height: 16px; background: #ff3333; position: absolute; left: 50%; bottom: 50%; transform-origin: bottom center; }
        .azimuth-val { color: #fff; font-weight: bold; font-size: 19px; }
        .loading-spin { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media screen and (max-width: 600px) { #tropo-condition-monitor { width: 95vw; right: 2.5vw; left: auto !important; } }
    `;
    document.head.appendChild(style);

    // --- 3. WINDOW CONSTRUCTION ---
    const container = document.createElement('div');
    container.id = 'tropo-condition-monitor';
    container.innerHTML = `
        <div class="tropo-header" id="tropo-header">
            <span>TROPO FOCUS MONITOR</span>
            <div style="display:flex; gap:12px; align-items:center;">
                <button class="filter-btn" style="background:${GOLD};color:black;border:none;font-weight:bold" id="manual-refresh">REFRESH</button>
                <span class="tropo-close" id="tropo-close-btn">&times;</span>
            </div>
        </div>
        <div class="tropo-sub-header">
            <span id="last-update">Waiting for data...</span>
            <span id="tropo-loader" class="loading-spin" style="display:none;">?</span>
        </div>
        <div class="tropo-controls" id="filter-container">
            <button class="filter-btn" data-val="150">150+</button>
            <button class="filter-btn active" data-val="200">200+</button>
            <button class="filter-btn" data-val="300">300+</button>
            <button class="filter-btn" data-val="500">500+</button>
            <button class="filter-btn" data-val="750">750+</button>
        </div>
        <div id="tropo-list-data" style="max-height: 500px; overflow-y: auto;"></div>
    `;
    document.body.appendChild(container);

    // --- 4. DRAGGABLE LOGIC ---
    let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
    const header = document.getElementById("tropo-header");

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === header || header.contains(e.target)) isDragging = true;
    }
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }
    function dragEnd() { isDragging = false; }

    // --- 5. DATA LOGIC (English) ---
    function toggleMonitor() {
        const isVisible = container.style.display === 'block';
        container.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) fetchData();
    }

    document.getElementById('tropo-close-btn').onclick = () => container.style.display = 'none';

    function getMidpoint(lat1, lon1, lat2, lon2) { const dLon = (lon2 - lon1) * Math.PI / 180; lat1 = lat1 * Math.PI / 180; lat2 = lat2 * Math.PI / 180; const Bx = Math.cos(lat2) * Math.cos(dLon); const By = Math.cos(lat2) * Math.sin(dLon); const midLat = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2)); const midLon = (lon1 * Math.PI / 180) + Math.atan2(By, Math.cos(lat1) + Bx); return { lat: midLat * 180 / Math.PI, lon: midLon * 180 / Math.PI }; }
    function getDistance(lat1, lon1, lat2, lon2) { const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); }
    function getBearing(lat1, lon1, lat2, lon2) { const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180); const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
    function locatorToLatLon(loc) { if (!loc || loc.length < 4) return null; loc = loc.toUpperCase(); const lon = (loc.charCodeAt(0) - 65) * 20 + (loc.charCodeAt(2) - 48) * 2 - 180 + 1; const lat = (loc.charCodeAt(1) - 65) * 10 + (loc.charCodeAt(3) - 48) * 1 - 90 + 0.5; return { lat, lon }; }
    function getCondition(dist) { if (dist >= 750) return { label: 'V. STRONG', color: '#ff0000' }; if (dist >= 500) return { label: 'STRONG', color: '#ff8c00' }; if (dist >= 250) return { label: 'MODERATE', color: '#ffff00' }; return { label: 'LIGHT', color: '#90ee90' }; }

    async function fetchData(ignoreCache = false) {
        const updateEl = document.getElementById('last-update');
        const loader = document.getElementById('tropo-loader');
        if (!ignoreCache) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < 120000) {
                    renderData(data.content);
                    updateEl.innerText = "Updated: " + new Date(data.timestamp).toLocaleTimeString();
                    return;
                }
            }
        }
        loader.style.display = 'inline-block';
        const rawUrl = 'https://vhf.dxview.org/text_display?reg=Europe&dist=150';
        try {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}` + (ignoreCache ? '&t=' + Date.now() : ''));
            const text = await res.text();
            if (text.length > 100) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), content: text }));
                renderData(text);
                updateEl.innerText = "Updated: " + new Date().toLocaleTimeString();
            }
        } catch (e) { console.error("Fetch failed"); }
        loader.style.display = 'none';
    }

    function renderData(text) {
        const listEl = document.getElementById('tropo-list-data');
        const regex = /([A-Z]{2}[0-9]{2})[A-Z\s]+([0-9]+)\s*km\s+to\s+([A-Z]{2}[0-9]{2})/gi;
        let match, results = [];
        while ((match = regex.exec(text)) !== null) {
            const pathLen = parseInt(match[2]);
            if (pathLen < minPathLength) continue; 
            const c1 = locatorToLatLon(match[1]), c2 = locatorToLatLon(match[3]);
            if (c1 && c2) {
                const mid = getMidpoint(c1.lat, c1.lon, c2.lat, c2.lon);
                const bearing = Math.round(getBearing(MY_LAT, MY_LON, mid.lat, mid.lon));
                const distToFocus = getDistance(MY_LAT, MY_LON, mid.lat, mid.lon);
                results.push({ label: `${match[1]}-${match[3]}`, pathLen, distToFocus, bearing, cond: getCondition(pathLen) });
            }
        }
        results.sort((a,b) => a.distToFocus - b.distToFocus);
        listEl.innerHTML = results.slice(0, 15).map(r => `
            <div class="tropo-item" style="border-left: 4px solid ${r.cond.color}">
                <div style="font-size:10px; color:#aaa;">${r.label} (Path: ${r.pathLen} km) <span class="cond-tag" style="background:${r.cond.color}">${r.cond.label}</span></div>
                <div><span class="azimuth-val">${r.bearing}&deg;</span> <span style="font-size:10px; color:#666; letter-spacing:1px;">AZIMUTH</span></div>
                <div style="font-size:11px; margin-top:3px;">Focus: <b>${r.distToFocus} km</b> away</div>
                <div class="compass-box"><div class="compass-needle" style="transform: translateX(-50%) rotate(${r.bearing}deg)"></div></div>
            </div>
        `).join('');
    }

    document.getElementById('filter-container').onclick = (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            minPathLength = parseInt(e.target.dataset.val);
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) renderData(JSON.parse(cached).content);
        }
    };

    document.getElementById('manual-refresh').onclick = () => fetchData(true);
    fetchData();
    setInterval(fetchData, 300000);
})();