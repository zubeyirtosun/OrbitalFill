(function() {
    let currentTarget = null;
    let uiHost = null;
    let shadowRoot = null;
    let triggerWrapper = null;
    let triggerIcon = null;
    let radialContainer = null;
    let radialMenu = null;
    let addBtn = null;
    let searchInput = null;
    let catIndicator = null;
    
    let lastSelection = '';
    let templates = []; 
    let recentlyUsed = [];
    let currentCategory = 'all';
    let isSearchActive = false;
    let mouseX = 0;
    let mouseY = 0;
    let closeTimeout = null;
    let autoCloseTimer = null;
    let lastTriggerTime = 0;

    let settings = {
        directions: { north: 1, south: 1, east: 1, west: 1 },
        showRecentInSouth: false,
        theme: 'indigo',
        triggerPosition: 'mouse',
        radialStyle: 'standard',
        staticColor: '#ef4444',
        dynamicColor: '#3b82f6',
        excludedDomains: ""
    };

    const themes = {
        indigo: { main: '#6366f1', secondary: '#8b5cf6', accent: '#a855f7' },
        dark: { main: '#1e293b', secondary: '#334155', accent: '#475569' },
        emerald: { main: '#10b981', secondary: '#059669', accent: '#34d399' },
        rose: { main: '#f43f5e', secondary: '#e11d48', accent: '#fb7185' }
    };

    async function init() {
        try {
            const hasStorage = typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local;
            const storage = hasStorage ? chrome.storage.local : {
                get: (keys) => Promise.resolve({ templates: [] }),
                set: (data) => Promise.resolve()
            };

            const data = await storage.get(['templates', 'settings', 'recentlyUsed']);
            if (data.templates) {
                templates = data.templates.map(t => {
                    const txt = typeof t === 'string' ? t : (t.text || '');
                    return { text: txt, cat: (t.cat || 'all').toLowerCase(), type: t.type || 'dynamic', slot: t.slot || null };
                });
            }
            if (data.settings) {
                settings = { ...settings, ...data.settings };
                const domain = window.location.hostname.toLowerCase();
                const blacklist = (settings.excludedDomains || "").split(",").map(d => d.trim().toLowerCase()).filter(d => d !== "");
                if (blacklist.some(d => domain.includes(d))) {
                    console.log('🚀 OrbitalFill: Site blacklisted.');
                    return;
                }
            }
            if (data.recentlyUsed) recentlyUsed = data.recentlyUsed;
            setupDOM(); attachListeners();
            console.log('🚀 OrbitalFill Precision (v1.6.8) Ready');
        } catch (e) { console.error('Init Error:', e); }
    }

    function setupDOM() {
        document.querySelectorAll('#af-ui-host').forEach(el => el.remove());
        uiHost = document.createElement('div');
        uiHost.id = 'af-ui-host';
        uiHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none; overflow: visible;';
        document.documentElement.appendChild(uiHost);
        shadowRoot = uiHost.attachShadow({ mode: 'open' });

        const colors = themes[settings.theme] || themes.indigo;
        const style = document.createElement('style');
        style.textContent = `
            :host { 
                all: initial; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                --af-main: ${colors.main}; --af-secondary: ${colors.secondary}; --af-accent: ${colors.accent};
                --af-static: ${settings.staticColor || '#ef4444'};
                --af-dynamic: ${settings.dynamicColor || '#3b82f6'};
                --af-gold: linear-gradient(135deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.8) 50%, rgba(255,215,0,0) 100%);
            }
            .af-ui-container { position: absolute; pointer-events: none; width: 100%; height: 100%; top: 0; left: 0; }
            .af-ui-container * { pointer-events: auto; box-sizing: border-box; }
            .af-trigger-wrapper {
                position: absolute; display: none; align-items: center; gap: 8px;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; padding: 15px; z-index: 2147483647; opacity: 0.7;
            }
            .af-trigger-wrapper.pulse { opacity: 1; transform: scale(1.25); }
            .af-trigger-icon {
                width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: 0.2s;
                color: white; border: 1px solid rgba(255, 255, 255, 0.2);
                background: linear-gradient(135deg, var(--af-main), var(--af-secondary)); font-size: 18px;
            }
            .af-add-btn {
                width: 32px; height: 32px; background: #10b981; color: white; border-radius: 10px;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                transition: 0.2s; font-weight: 800; font-size: 20px; box-shadow: 0 4px 10px rgba(16,185,129,0.25);
            }
            .af-radial-container {
                position: absolute; width: 500px; height: 500px; display: flex; align-items: center; justify-content: center;
                pointer-events: none; transform: translate(-50%, -50%); opacity: 0; 
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .af-radial-container.active { opacity: 1; }
            .af-radial-menu {
                width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); transform: scale(0);
                position: relative; pointer-events: auto; color: white; cursor: pointer;
                background: linear-gradient(135deg, var(--af-main), var(--af-accent));
                border: 2px solid rgba(255, 255, 255, 0.4); z-index: 50;
            }
            .af-radial-container.active .af-radial-menu { transform: scale(1); box-shadow: 0 0 40px rgba(0,0,0,0.25); }
            .af-preview-item {
                position: absolute; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px);
                padding: 10px 18px; border-radius: 12px; border-left: 4px solid var(--af-dynamic);
                font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; max-width: 220px;
                overflow: hidden; text-overflow: ellipsis; cursor: pointer;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: all 0.2s;
                opacity: 0; pointer-events: none; transform: scale(0.6); z-index: 40;
            }
            .af-radial-container.active .af-preview-item { opacity: 1; pointer-events: auto; transform: scale(1); }
            .af-preview-item:hover { background: var(--af-main); color: white !important; transform: scale(1.05) translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.15); border-left-color: transparent; }
            .af-search-input {
                position: absolute; width: 140px; background: white; border-radius: 20px;
                border: 2px solid var(--af-main); padding: 5px 12px; font-family: inherit;
                font-size: 12px; outline: none; bottom: 130px; transform: scale(0);
                transition: all 0.3s; opacity: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 60;
            }
            .af-search-input.active { transform: scale(1); opacity: 1; pointer-events: auto; }
            .af-cat-indicator {
                position: absolute; top: 145px; font-size: 10px; font-weight: 800;
                background: var(--af-secondary); color: white; padding: 2px 10px; border-radius: 20px;
                opacity: 0; transition: 0.3s; z-index: 60; text-transform: uppercase;
            }
            .af-radial-container.active .af-cat-indicator { opacity: 1; }
        `;
        shadowRoot.appendChild(style);

        const uiContainer = document.createElement('div');
        uiContainer.className = 'af-ui-container';
        shadowRoot.appendChild(uiContainer);

        triggerWrapper = document.createElement('div');
        triggerWrapper.className = 'af-trigger-wrapper';
        uiContainer.appendChild(triggerWrapper);

        addBtn = document.createElement('div');
        addBtn.className = 'af-add-btn';
        addBtn.innerHTML = '+';
        triggerWrapper.appendChild(addBtn);

        triggerIcon = document.createElement('div');
        triggerIcon.className = 'af-trigger-icon';
        triggerIcon.innerHTML = '⚡';
        triggerWrapper.appendChild(triggerIcon);

        radialContainer = document.createElement('div');
        radialContainer.className = 'af-radial-container';
        uiContainer.appendChild(radialContainer);

        radialMenu = document.createElement('div');
        radialMenu.className = 'af-radial-menu';
        radialMenu.innerHTML = '<span style="font-size:11px; font-weight:800; pointer-events:none;">ORBIT</span>';
        radialContainer.appendChild(radialMenu);

        catIndicator = document.createElement('div');
        catIndicator.className = 'af-cat-indicator';
        catIndicator.innerText = 'ALL';
        radialContainer.appendChild(catIndicator);

        searchInput = document.createElement('input');
        searchInput.className = 'af-search-input';
        searchInput.placeholder = 'Search...';
        radialContainer.appendChild(searchInput);
    }

    function startAutoCloseTimer() {
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(() => { if (!isSearchActive) collapseMenu(); }, 2000);
    }

    function stopAutoCloseTimer() { if (autoCloseTimer) clearTimeout(autoCloseTimer); }

    function attachListeners() {
        document.addEventListener('mousemove', (e) => { 
            mouseX = e.clientX; mouseY = e.clientY; 
            if (triggerWrapper && triggerWrapper.style.display === 'flex') {
                const rect = triggerWrapper.getBoundingClientRect();
                const dist = Math.hypot(mouseX - (rect.left + rect.width/2), mouseY - (rect.top + rect.height/2));
                triggerWrapper.classList.toggle('pulse', dist < 80);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideAll();
            if (radialContainer && radialContainer.classList.contains('active') && !isSearchActive) {
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    isSearchActive = true; searchInput.classList.add('active');
                    searchInput.value = e.key; searchInput.focus(); renderPreviews(e.key);
                    stopAutoCloseTimer();
                }
            }
        }, true);

        triggerIcon.addEventListener('mouseenter', () => { if (closeTimeout) clearTimeout(closeTimeout); expandMenu(); });
        
        // PRECISION FOCUS: Only specific components stop the timer
        radialMenu.addEventListener('mouseenter', stopAutoCloseTimer);
        radialMenu.addEventListener('mouseleave', () => { if (!isSearchActive) startAutoCloseTimer(); });
        
        radialMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            isSearchActive = !isSearchActive; searchInput.classList.toggle('active', isSearchActive);
            if (isSearchActive) { searchInput.focus(); stopAutoCloseTimer(); } else renderPreviews();
        });

        searchInput.addEventListener('input', (e) => renderPreviews(e.target.value));
        searchInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { isSearchActive = false; searchInput.classList.remove('active'); searchInput.blur(); } 
            e.stopPropagation(); 
        });

        document.addEventListener('mousedown', (e) => {
            if (isInputField(e.target)) showTrigger(e.target);
            else if (uiHost && !uiHost.contains(e.target)) hideAll();
        }, true);

        document.addEventListener('mouseup', () => { setTimeout(handleTextSelection, 100); }, true);
    }

    function isInputField(el) {
        if (!el || !el.tagName) return false;
        const role = (el.getAttribute('role') || '').toLowerCase();
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        const textTypes = ['text', 'search', 'email', 'tel', 'url', 'number', 'password', 'date', 'datetime-local'];
        return (el.tagName === 'INPUT' && (textTypes.includes(type) || role === 'combobox')) || el.tagName === 'TEXTAREA' || el.isContentEditable || role === 'textbox';
    }

    function analyzeFieldCategory(el) {
        const attrs = (el.id + el.name + el.placeholder + (el.getAttribute('aria-label') || '')).toLowerCase();
        if (attrs.includes('email') || attrs.includes('posta')) return 'emails';
        if (attrs.includes('address') || attrs.includes('adres')) return 'addresses';
        if (attrs.includes('phone') || attrs.includes('tel')) return 'phones';
        if (attrs.includes('name') || attrs.includes('ad')) return 'names';
        return 'all';
    }

    function showTrigger(el) {
        if (!triggerWrapper) return;
        currentTarget = el; const rect = el.getBoundingClientRect();
        const detectedCat = analyzeFieldCategory(el);
        if (detectedCat !== 'all') { currentCategory = detectedCat; catIndicator.innerText = detectedCat.toUpperCase(); }
        triggerWrapper.style.display = 'flex'; addBtn.style.display = 'none'; triggerIcon.style.display = 'flex';
        let top, left;
        if (settings.triggerPosition === 'mouse') { top = (mouseY - 50); left = (mouseX + 25); }
        else { top = (rect.top - 28); left = (rect.right - 8); }
        triggerWrapper.style.top = top + 'px'; triggerWrapper.style.left = left + 'px';
        radialContainer.style.display = 'none'; isSearchActive = false;
    }

    function hideAll() {
        if (triggerWrapper) { triggerWrapper.style.display = 'none'; }
        if (radialContainer) { radialContainer.style.display = 'none'; radialContainer.classList.remove('active'); }
        isSearchActive = false; if (searchInput) searchInput.classList.remove('active');
        stopAutoCloseTimer();
    }

    function expandMenu() {
        if (!radialContainer) return;
        triggerWrapper.style.display = 'none'; radialContainer.style.display = 'flex';
        let top = 0, left = 0;
        if (settings.triggerPosition === 'mouse') { top = mouseY; left = mouseX; } 
        else { const rect = currentTarget.getBoundingClientRect(); top = rect.top + (rect.height / 2); left = rect.right - 20; }
        radialContainer.style.top = top + 'px'; radialContainer.style.left = left + 'px';
        setTimeout(() => radialContainer.classList.add('active'), 10); 
        renderPreviews(); startAutoCloseTimer();
    }

    function collapseMenu() {
        if (!radialContainer) return;
        radialContainer.classList.remove('active');
        setTimeout(() => { if (!radialContainer.classList.contains('active')) { radialContainer.style.display = 'none'; if (currentTarget && document.activeElement === currentTarget) showTrigger(currentTarget); } }, 300);
    }

    function renderPreviews(query = '') {
        if (!radialContainer) return;
        radialContainer.querySelectorAll('.af-preview-item').forEach(i => i.remove());
        const filtered = templates.filter(t => (currentCategory === 'all' || t.cat === currentCategory) && (query === '' || (t.text && t.text.toLowerCase().includes(query.toLowerCase()))));
        const dirs = ['north', 'east', 'south', 'west'];
        let dynamicIdx = 0;
        dirs.forEach((dir, dirIdx) => {
            const count = settings.directions[dir] || 1;
            for (let i = 1; i <= count; i++) {
                const slotKey = dir.charAt(0).toUpperCase() + i;
                let template = templates.find(t => t.slot === slotKey && (currentCategory === 'all' || t.cat === currentCategory));
                if (!template) { const pool = filtered.filter(t => !t.slot); if (dynamicIdx < pool.length) template = pool[dynamicIdx++]; }
                const item = document.createElement('div');
                item.classList.add('af-preview-item');
                if (!template || !template.text) { item.innerText = slotKey; item.style.opacity = '0.3'; } 
                else {
                    if (template.type === 'static') item.classList.add('static');
                    item.innerText = template.text.substring(0, 20) + (template.text.length > 20 ? '...' : '');
                    item.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); insertText(template.text); });
                }
                const dist = 95 + (i * 45); const angle = (dirIdx * 90) - 90; const rad = (angle + (i - (count + 1) / 2) * (count > 2 ? 15 : 22)) * (Math.PI / 180);
                const anchorX = 250, anchorY = 250;
                let finalX = anchorX + Math.cos(rad) * dist, finalY = anchorY + Math.sin(rad) * dist;
                if (dir === 'west') finalX -= 110; else finalX -= 65; 
                item.style.left = finalX + 'px'; item.style.top = (finalY - 20) + 'px';
                
                // PRECISION FOCUS: Each item also guards the timer
                item.addEventListener('mouseenter', stopAutoCloseTimer);
                item.addEventListener('mouseleave', () => { if (!isSearchActive) startAutoCloseTimer(); });
                radialContainer.appendChild(item);
            }
        });
    }

    function insertText(text) {
        if (!currentTarget) return;
        recentlyUsed = [text, ...recentlyUsed.filter(t => t !== text)].slice(0, 5);
        if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ recentlyUsed });
        let val = currentTarget.isContentEditable ? currentTarget.innerText : (currentTarget.value || "");
        const fullText = ((val.length > 0 && !val.endsWith(' ') && !val.endsWith('\n')) ? " " : "") + text;
        if (currentTarget.isContentEditable) { currentTarget.focus(); document.execCommand('insertText', false, fullText); }
        else {
            const start = currentTarget.selectionStart;
            currentTarget.value = currentTarget.value.substring(0, start) + fullText + currentTarget.value.substring(currentTarget.selectionEnd);
            currentTarget.selectionStart = currentTarget.selectionEnd = start + fullText.length;
        }
        currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
        hideAll();
    }

    function handleTextSelection() {
        const selObj = window.getSelection(); const selection = (selObj.toString() || "").trim();
        if (!selection || selObj.isCollapsed) return;
        let rect = null; const activeEl = document.activeElement;
        if (isInputField(activeEl) && activeEl.selectionStart !== activeEl.selectionEnd) {
            const b = activeEl.getBoundingClientRect(); rect = { top: b.top, right: b.right, bottom: b.bottom, left: b.left };
        } else if (selObj.rangeCount > 0) rect = selObj.getRangeAt(0).getBoundingClientRect();
        if (rect) {
            lastSelection = selection; lastTriggerTime = Date.now();
            triggerWrapper.style.display = 'flex'; addBtn.style.display = 'flex'; triggerIcon.style.display = isInputField(activeEl) ? 'flex' : 'none';
            if (settings.triggerPosition === 'mouse') { triggerWrapper.style.top = (mouseY - 50) + 'px'; triggerWrapper.style.left = (mouseX + 25) + 'px'; }
            else { triggerWrapper.style.top = (rect.top - 48) + 'px'; triggerWrapper.style.left = (rect.right) + 'px'; }
        }
    }

    init();
})();
