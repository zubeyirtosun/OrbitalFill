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
        dynamicColor: '#3b82f6'
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
            if (data.settings) settings = { ...settings, ...data.settings };
            if (data.recentlyUsed) recentlyUsed = data.recentlyUsed;
            setupDOM(); attachListeners();
            console.log('🚀 OrbitalFill Pro-Active (v1.6.6) Ready');
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
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; 
                padding: 15px; z-index: 2147483647; opacity: 0.7;
            }
            .af-trigger-wrapper.pulse { opacity: 1; transform: scale(1.25); }
            .af-trigger-wrapper.drag-over { background: rgba(16, 185, 129, 0.1); border-radius: 15px; border: 2px dashed #10b981; }

            .af-trigger-icon {
                width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: 0.2s;
                color: white; border: 1px solid rgba(255, 255, 255, 0.2);
                background: linear-gradient(135deg, var(--af-main), var(--af-secondary));
                font-size: 18px;
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
            .af-radial-container.active { pointer-events: auto; opacity: 1; }

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
            .af-preview-item.drag-target { background: #fee2e2; border-bottom: 2px solid var(--af-main); transform: scale(1.1); }
            .af-preview-item.static { border-left-color: var(--af-static); }
            .af-radial-container.active .af-preview-item { opacity: 1; pointer-events: auto; transform: scale(1); }
            
            .af-preview-item:hover { 
                background: var(--af-main); color: white !important; transform: scale(1.05) translateY(-3px); 
                z-index: 100; box-shadow: 0 8px 16px rgba(0,0,0,0.15); border-left-color: transparent;
            }

            .af-preview-item::after {
                content: ''; position: absolute; top: -50%; left: -150%; width: 220%; height: 200%;
                background: var(--af-gold); transform: rotate(45deg); transition: none; pointer-events: none;
                opacity: 0; z-index: -1;
            }
            .af-preview-item:hover::after { animation: af-gold-sweep 0.8s ease-out forwards; opacity: 1; }

            @keyframes af-gold-sweep {
                0% { left: -150%; opacity: 0; }
                50% { opacity: 1; }
                100% { left: 150%; opacity: 0; }
            }

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
        // MOUSE TRACKING & SMART PULSE
        document.addEventListener('mousemove', (e) => { 
            mouseX = e.clientX; 
            mouseY = e.clientY; 
            
            if (triggerWrapper && triggerWrapper.style.display === 'flex') {
                const rect = triggerWrapper.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
                triggerWrapper.classList.toggle('pulse', dist < 80);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideAll();
            if (radialContainer && radialContainer.classList.contains('active') && !isSearchActive) {
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    e.preventDefault(); e.stopPropagation();
                    isSearchActive = true; searchInput.classList.add('active');
                    searchInput.value = e.key; searchInput.focus(); renderPreviews(e.key);
                    stopAutoCloseTimer();
                }
            }
            if (e.altKey && (e.code === 'KeyA' || e.key === 'a')) {
                const el = document.activeElement;
                if (isInputField(el)) showTrigger(el);
            }
        }, true);

        window.addEventListener('scroll', () => { if (!isSearchActive) hideAll(); }, { passive: true });

        document.addEventListener('mousedown', (e) => {
            if (isInputField(e.target)) {
                showTrigger(e.target);
            } else if (uiHost && !uiHost.contains(e.target)) {
                hideAll();
            }
        }, true);

        // DRAG & DROP SAVE (Feature #2)
        triggerWrapper.addEventListener('dragover', (e) => { e.preventDefault(); triggerWrapper.classList.add('drag-over'); });
        triggerWrapper.addEventListener('dragleave', () => { triggerWrapper.classList.remove('drag-over'); });
        triggerWrapper.addEventListener('drop', async (e) => {
            e.preventDefault(); triggerWrapper.classList.remove('drag-over');
            const droppedText = e.dataTransfer.getData('text');
            if (droppedText) {
                saveTemplate(droppedText.trim());
                playClickSound(0.2);
            }
        });

        triggerIcon.addEventListener('mouseenter', () => { if (closeTimeout) clearTimeout(closeTimeout); expandMenu(); });
        triggerIcon.addEventListener('click', (e) => {
            if (Date.now() - lastTriggerTime < 350) return;
            expandMenu();
        });
        
        radialContainer.addEventListener('mouseenter', () => { if (closeTimeout) clearTimeout(closeTimeout); stopAutoCloseTimer(); });
        radialContainer.addEventListener('mouseleave', () => { if (!isSearchActive) startAutoCloseTimer(); });
        
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
        
        radialMenu.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const cats = ['all', ...new Set(templates.filter(t => t.cat && t.cat !== 'all').map(t => t.cat))];
            const nextIdx = (cats.indexOf(currentCategory) + 1) % cats.length;
            currentCategory = cats[nextIdx]; catIndicator.innerText = currentCategory.toUpperCase(); renderPreviews();
        });

        document.addEventListener('mouseup', () => { 
            setTimeout(handleTextSelection, 100); 
        }, true);

        addBtn.addEventListener('click', (e) => {
            if (Date.now() - lastTriggerTime < 350) return;
            if (lastSelection) saveTemplate(lastSelection);
        });
    }

    async function saveTemplate(txt, slot = null) {
        const isDup = templates.some(t => t.text === txt && t.slot === slot);
        if (!isDup) {
            templates = [{ text: txt, cat: currentCategory, type: 'dynamic', slot: slot }, ...templates];
            if (typeof chrome !== 'undefined' && chrome.storage) await chrome.storage.local.set({ templates });
            const orig = addBtn.innerHTML; addBtn.innerHTML = '✓'; addBtn.style.background = '#3b82f6';
            setTimeout(() => { addBtn.innerHTML = orig; addBtn.style.background = '#10b981'; }, 800);
        }
    }

    function isInputField(el) {
        if (!el || !el.tagName) return false;
        const tagName = el.tagName; const type = (el.getAttribute('type') || 'text').toLowerCase();
        const textTypes = ['text', 'search', 'email', 'tel', 'url', 'number', 'password', 'date', 'datetime-local'];
        return (tagName === 'INPUT' && textTypes.includes(type)) || tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute('role') === 'textbox';
    }

    function analyzeFieldCategory(el) {
        const attrs = (el.id + el.name + el.placeholder + (el.getAttribute('aria-label') || '')).toLowerCase();
        if (attrs.includes('email') || attrs.includes('posta')) return 'emails';
        if (attrs.includes('address') || attrs.includes('adres') || attrs.includes('mahalle') || attrs.includes('sokak')) return 'addresses';
        if (attrs.includes('phone') || attrs.includes('tel') || attrs.includes('gsm') || attrs.includes('mobil')) return 'phones';
        if (attrs.includes('name') || attrs.includes('ad') || attrs.includes('soyad') || attrs.includes('unvan')) return 'names';
        if (attrs.includes('tax') || attrs.includes('vergi') || attrs.includes('tc') || attrs.includes('kimlik')) return 'legal';
        return 'all';
    }

    function showTrigger(el) {
        if (!triggerWrapper) return;
        currentTarget = el; const rect = el.getBoundingClientRect();
        lastTriggerTime = Date.now();
        
        // FEATURE #3: Field-Type Awareness
        const detectedCat = analyzeFieldCategory(el);
        if (detectedCat !== 'all') {
            currentCategory = detectedCat;
            catIndicator.innerText = detectedCat.toUpperCase();
        }

        triggerWrapper.style.display = 'flex'; addBtn.style.display = 'none'; triggerIcon.style.display = 'flex';
        let top, left;
        if (settings.triggerPosition === 'mouse') {
            top = (mouseY - 50); left = (mouseX + 25);
        } else {
            top = (rect.top - 28); left = (rect.right - 8);
        }
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
        else {
            const rect = currentTarget.getBoundingClientRect();
            top = rect.top + (rect.height / 2); left = rect.right - 20;
        }
        radialContainer.style.top = top + 'px'; radialContainer.style.left = left + 'px';
        setTimeout(() => radialContainer.classList.add('active'), 10); 
        renderPreviews(); startAutoCloseTimer();
    }

    function collapseMenu() {
        if (!radialContainer) return;
        radialContainer.classList.remove('active');
        setTimeout(() => {
            if (!radialContainer.classList.contains('active')) {
                radialContainer.style.display = 'none';
                if (currentTarget && document.activeElement === currentTarget) showTrigger(currentTarget);
            }
        }, 300);
    }

    function renderPreviews(query = '') {
        if (!radialContainer) return;
        radialContainer.querySelectorAll('.af-preview-item').forEach(i => i.remove());
        const filtered = templates.filter(t => (currentCategory === 'all' || t.cat === currentCategory) && (query === '' || (t.text && t.text.toLowerCase().includes(query.toLowerCase()))));
        const dirs = ['north', 'east', 'south', 'west'];
        let dynamicIdx = 0;
        
        dirs.forEach((dir, dirIdx) => {
            const count = settings.directions[dir] || 1;
            const dirKey = dir.charAt(0).toUpperCase();
            for (let i = 1; i <= count; i++) {
                const slotKey = dirKey + i;
                let template = templates.find(t => t.slot === slotKey && (currentCategory === 'all' || t.cat === currentCategory));
                if (!template) {
                    const pool = filtered.filter(t => !t.slot);
                    if (dynamicIdx < pool.length) template = pool[dynamicIdx++];
                }
                const item = document.createElement('div');
                item.classList.add('af-preview-item');
                
                // DRAG TO SLOT (Modified Feature #2 for open menu)
                item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-target'); });
                item.addEventListener('dragleave', () => { item.classList.remove('drag-target'); });
                item.addEventListener('drop', async (e) => {
                    e.preventDefault(); item.classList.remove('drag-target');
                    const txt = e.dataTransfer.getData('text');
                    if (txt) {
                        saveTemplate(txt.trim(), slotKey);
                        playClickSound(0.2);
                        renderPreviews(query);
                    }
                });

                if (!template || !template.text) {
                    // Empty ghost slot for dragging
                    item.innerText = slotKey;
                    item.style.opacity = '0.3';
                    item.style.border = '1px dashed #ccc';
                } else {
                    if (template.type === 'static') item.classList.add('static');
                    const text = template.text;
                    item.innerText = text.substring(0, 20) + (text.length > 20 ? '...' : '');
                    item.title = text;
                    item.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); insertText(text); });
                }
                
                const dist = 95 + (i * 45); const angle = (dirIdx * 90) - 90; const spread = (i - (count + 1) / 2) * (count > 2 ? 15 : 22);
                const rad = (angle + spread) * (Math.PI / 180);
                const x = Math.cos(rad) * dist, y = Math.sin(rad) * dist;
                const anchorX = 250; const anchorY = 250;
                let finalX = anchorX + x; let finalY = anchorY + y;
                if (dir === 'west') finalX -= 110; else finalX -= 65; 
                item.style.left = finalX + 'px'; item.style.top = (finalY - 20) + 'px';
                
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
            const start = currentTarget.selectionStart, end = currentTarget.selectionEnd;
            currentTarget.value = currentTarget.value.substring(0, start) + fullText + currentTarget.value.substring(end);
            currentTarget.selectionStart = currentTarget.selectionEnd = start + fullText.length;
        }
        currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
        currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
        hideAll();
    }

    function handleTextSelection() {
        const selObj = window.getSelection();
        const selection = (selObj.toString() || "").trim();
        if (!selection || selObj.isCollapsed) return;
        let rect = null;
        const activeEl = document.activeElement;
        const isCurrentlyInInput = isInputField(activeEl);
        if (isCurrentlyInInput && activeEl.selectionStart !== activeEl.selectionEnd) {
            const bounding = activeEl.getBoundingClientRect();
            rect = { top: bounding.top, right: bounding.right, bottom: bounding.bottom, left: bounding.left };
        } else if (selObj.rangeCount > 0) rect = selObj.getRangeAt(0).getBoundingClientRect();
        if (rect) {
            lastSelection = selection; lastTriggerTime = Date.now();
            if (!triggerWrapper) return;
            triggerWrapper.style.display = 'flex'; addBtn.style.display = 'flex';
            triggerIcon.style.display = isCurrentlyInInput ? 'flex' : 'none';
            let top, left;
            if (settings.triggerPosition === 'mouse') { top = (mouseY - 50); left = (mouseX + 25); }
            else { top = (rect.top - 48); left = (rect.right); }
            triggerWrapper.style.top = top + 'px'; triggerWrapper.style.left = left + 'px';
        }
    }

    function playClickSound(volume) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    }

    init();
})();
