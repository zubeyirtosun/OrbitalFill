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
            // Robust test-friendly storage fallback
            const hasStorage = typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local;
            const storage = hasStorage ? chrome.storage.local : {
                get: (keys) => Promise.resolve({
                    templates: [
                        { text: "Statik Şablon", cat: "all", type: 'static', slot: 'N1' },
                        { text: "Dinamik Örnek 1", cat: "all", type: 'dynamic' }
                    ]
                }),
                set: (data) => Promise.resolve(console.log('Mock Set:', data))
            };

            const data = await storage.get(['templates', 'settings', 'recentlyUsed']);
            if (data.templates) {
                templates = data.templates.map(t => {
                    const txt = typeof t === 'string' ? t : (t.text || '');
                    return { text: txt, cat: t.cat || 'all', type: t.type || 'dynamic', slot: t.slot || null };
                });
            } else {
                templates = [{ text: "Örnek Şablon", cat: "all", type: 'dynamic' }];
            }
            if (data.settings) settings = { ...settings, ...data.settings };
            if (data.recentlyUsed) recentlyUsed = data.recentlyUsed;
            setupDOM(); attachListeners();
            console.log('🚀 AutoFill Pro v1.6.1 Ready');
        } catch (e) { console.error('Init Error:', e); }
    }

    function setupDOM() {
        document.querySelectorAll('#af-ui-host, .af-ui-container').forEach(el => el.remove());
        uiHost = document.createElement('div');
        uiHost.id = 'af-ui-host';
        uiHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
        document.documentElement.appendChild(uiHost);
        shadowRoot = uiHost.attachShadow({ mode: 'open' });

        const colors = themes[settings.theme] || themes.indigo;
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
            :host { 
                all: initial; font-family: 'Outfit', sans-serif;
                --af-main: ${colors.main}; --af-secondary: ${colors.secondary}; --af-accent: ${colors.accent};
                --af-static: ${settings.staticColor || '#ef4444'};
                --af-dynamic: ${settings.dynamicColor || '#3b82f6'};
                --af-gold: linear-gradient(135deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.8) 50%, rgba(255,215,0,0) 100%);
            }
            .af-ui-container { position: absolute; pointer-events: none; z-index: 2147483647; border: none; outline: none; }
            .af-ui-container * { pointer-events: auto; box-sizing: border-box; }
            
            .af-trigger-wrapper {
                position: absolute; display: flex; align-items: center; gap: 10px;
                transition: transform 0.2s cubic-bezier(0.2, 0, 0.2, 1); 
                padding: 10px; z-index: 2147483647; background: transparent;
            }

            .af-trigger-icon {
                width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s;
                opacity: 0.95; color: white; border: 1px solid rgba(255, 255, 255, 0.2);
                background: linear-gradient(135deg, var(--af-main), var(--af-secondary));
            }
            .af-trigger-icon:hover { transform: scale(1.1) rotate(5deg); border-radius: 50%; opacity: 1; }

            .af-add-btn {
                width: 32px; height: 32px; background: #10b981; color: white; border-radius: 10px;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                transition: 0.2s; font-weight: 800; font-size: 20px; box-shadow: 0 4px 10px rgba(16,185,129,0.25);
            }
            .af-add-btn:hover { background: #059669; transform: scale(1.1); }

            .af-radial-container {
                position: absolute; width: 500px; height: 500px; display: flex; align-items: center; justify-content: center;
                pointer-events: none; transform: translate(-50%, -50%); opacity: 0; 
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .af-radial-container.active { pointer-events: auto; opacity: 1; }

            .af-radial-menu {
                width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); transform: scale(0);
                position: relative; pointer-events: auto; color: white; cursor: pointer;
                background: linear-gradient(135deg, var(--af-main), var(--af-accent));
                border: 2px solid rgba(255, 255, 255, 0.4); z-index: 50;
            }
            .af-radial-container.active .af-radial-menu { transform: scale(1); box-shadow: 0 0 40px rgba(0,0,0,0.25); }

            .af-preview-item {
                position: absolute; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px);
                padding: 10px 18px; border-radius: 14px; border-left: 4px solid var(--af-dynamic);
                font-size: 13px; font-weight: 800; color: #1e293b; white-space: nowrap; max-width: 210px;
                overflow: hidden; text-overflow: ellipsis; cursor: pointer;
                box-shadow: 0 5px 15px rgba(0,0,0,0.08); transition: all 0.3s;
                opacity: 0; pointer-events: none; transform: scale(0.6); z-index: 40;
            }
            .af-preview-item.static { border-left-color: var(--af-static); }
            .af-radial-container.active .af-preview-item { opacity: 1; pointer-events: auto; transform: scale(1); }
            
            .af-preview-item:hover { 
                background: var(--af-main); color: white !important; transform: scale(1.08) translateY(-5px); 
                z-index: 100; box-shadow: 0 10px 20px rgba(0,0,0,0.15); border-left-color: transparent;
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
        triggerWrapper.style.display = 'none';
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
        radialContainer.style.display = 'none';
        uiContainer.appendChild(radialContainer);

        radialMenu = document.createElement('div');
        radialMenu.className = 'af-radial-menu';
        radialMenu.innerHTML = '<span style="font-size:10px; font-weight:800; pointer-events:none;">AUTO</span>';
        radialContainer.appendChild(radialMenu);

        catIndicator = document.createElement('div');
        catIndicator.className = 'af-cat-indicator';
        catIndicator.innerText = 'TÜMÜ';
        radialContainer.appendChild(catIndicator);

        searchInput = document.createElement('input');
        searchInput.className = 'af-search-input';
        searchInput.placeholder = 'Şablon ara...';
        radialContainer.appendChild(searchInput);
    }

    function attachListeners() {
        document.addEventListener('mousemove', (e) => { mouseX = e.pageX; mouseY = e.pageY; });
        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.code === 'KeyA' || e.key === 'a')) {
                const el = document.activeElement;
                if (isInputField(el)) showTrigger(el);
            }
        });
        document.addEventListener('mousedown', (e) => {
            if (isInputField(e.target)) {
                showTrigger(e.target);
            } else if (uiHost && !uiHost.contains(e.target)) {
                setTimeout(() => { 
                    const sel = window.getSelection();
                    if (sel.isCollapsed && document.activeElement !== currentTarget) hideAll(); 
                }, 200);
            }
        }, true);
        triggerIcon.addEventListener('mouseenter', () => { if (closeTimeout) clearTimeout(closeTimeout); playClickSound(0.05); expandMenu(); });
        radialContainer.addEventListener('mouseenter', () => { if (closeTimeout) clearTimeout(closeTimeout); });
        radialContainer.addEventListener('mouseleave', (e) => { if (!isSearchActive) closeTimeout = setTimeout(collapseMenu, 600); });
        radialMenu.addEventListener('click', (e) => {
            e.stopPropagation(); playClickSound(0.1);
            isSearchActive = !isSearchActive; searchInput.classList.toggle('active', isSearchActive);
            if (isSearchActive) searchInput.focus(); else renderPreviews();
        });
        searchInput.addEventListener('input', (e) => renderPreviews(e.target.value));
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { isSearchActive = false; searchInput.classList.remove('active'); searchInput.blur(); } e.stopPropagation(); });
        radialMenu.addEventListener('contextmenu', (e) => {
            e.preventDefault(); playClickSound(0.1);
            const cats = ['all', ...new Set(templates.filter(t => t.cat && t.cat !== 'all').map(t => t.cat))];
            const nextIdx = (cats.indexOf(currentCategory) + 1) % cats.length;
            currentCategory = cats[nextIdx]; catIndicator.innerText = currentCategory.toUpperCase(); renderPreviews();
        });
        document.addEventListener('mouseup', (e) => { mouseX = e.pageX; mouseY = e.pageY; setTimeout(handleTextSelection, 100); });
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (lastSelection) {
                const isDup = templates.some(t => t.text === lastSelection);
                if (!isDup) {
                    templates = [{ text: lastSelection, cat: currentCategory, type: 'dynamic' }, ...templates];
                    const hasStorage = typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local;
                    if (hasStorage) await chrome.storage.local.set({ templates });
                    playClickSound(0.2);
                    const orig = addBtn.innerHTML; addBtn.innerHTML = '✓'; addBtn.style.background = '#3b82f6';
                    setTimeout(() => { addBtn.innerHTML = orig; addBtn.style.background = '#10b981'; }, 800);
                }
            }
        });
    }

    function isInputField(el) {
        if (!el || !el.tagName) return false;
        const tagName = el.tagName; const type = (el.getAttribute('type') || 'text').toLowerCase();
        const textTypes = ['text', 'search', 'email', 'tel', 'url', 'number', 'password', 'date', 'datetime-local'];
        return (tagName === 'INPUT' && textTypes.includes(type)) || tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute('role') === 'textbox';
    }

    function showTrigger(el) {
        currentTarget = el; const rect = el.getBoundingClientRect();
        triggerWrapper.style.display = 'flex'; addBtn.style.display = 'none'; triggerIcon.style.display = 'flex';
        let top, left;
        if (settings.triggerPosition === 'mouse') {
            top = (mouseY - 40); left = (mouseX - 10);
        } else {
            top = (window.scrollY + rect.top - 28); left = (window.scrollX + rect.right - 8);
        }
        triggerWrapper.style.top = top + 'px'; triggerWrapper.style.left = left + 'px';
        radialContainer.style.display = 'none'; isSearchActive = false; searchInput.classList.remove('active');
    }

    function hideAll() {
        if (triggerWrapper) { triggerWrapper.style.display = 'none'; }
        if (radialContainer) { radialContainer.style.display = 'none'; radialContainer.classList.remove('active'); }
    }

    function expandMenu() {
        triggerWrapper.style.display = 'none'; radialContainer.style.display = 'flex';
        let top = 0, left = 0;
        if (settings.triggerPosition === 'mouse') { top = mouseY; left = mouseX; } 
        else {
            const rect = currentTarget.getBoundingClientRect();
            top = window.scrollY + rect.top + 26; left = window.scrollX + rect.right - 26;
        }
        const p = 250;
        if (left + p > window.scrollX + window.innerWidth) left -= 140;
        if (top + p > window.scrollY + window.innerHeight) top -= 140;
        radialContainer.style.top = top + 'px'; radialContainer.style.left = left + 'px';
        setTimeout(() => radialContainer.classList.add('active'), 10); renderPreviews();
    }

    function collapseMenu() {
        radialContainer.classList.remove('active');
        setTimeout(() => {
            if (!radialContainer.classList.contains('active')) {
                radialContainer.style.display = 'none';
                if (currentTarget && document.activeElement === currentTarget) showTrigger(currentTarget);
            }
        }, 300);
    }

    function renderPreviews(query = '') {
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
                if (!template || !template.text) continue;
                const item = document.createElement('div');
                item.classList.add('af-preview-item');
                if (template.type === 'static') item.classList.add('static');
                const text = template.text;
                item.innerText = text.substring(0, 18) + (text.length > 18 ? '...' : '');
                item.title = text;
                const dist = 90 + (i * 45); const angle = (dirIdx * 90) - 90; const spread = (i - (count + 1) / 2) * (count > 2 ? 15 : 22);
                const rad = (angle + spread) * (Math.PI / 180);
                const x = Math.cos(rad) * dist, y = Math.sin(rad) * dist;
                
                // UNIFIED POSITIONING SYSTEM: Always use LEFT/TOP, adjust anchor for West
                const anchorX = 250; const anchorY = 250;
                let finalX = anchorX + x;
                let finalY = anchorY + y;
                
                if (dir === 'west') finalX -= 100; // Shift west items slightly more left for layout
                else finalX -= 60; // Standard centering bias
                
                item.style.left = (finalX) + 'px';
                item.style.top = (finalY - 18) + 'px';
                item.style.right = 'auto'; // Force clear any accidental inheritance

                item.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); playClickSound(0.1); insertText(text); });
                radialContainer.appendChild(item);
            }
        });
    }

    function insertText(text) {
        if (!currentTarget) return;
        recentlyUsed = [text, ...recentlyUsed.filter(t => t !== text)].slice(0, 5);
        const hasStorage = typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local;
        if (hasStorage) chrome.storage.local.set({ recentlyUsed });
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
        } else if (selObj.rangeCount > 0) {
            rect = selObj.getRangeAt(0).getBoundingClientRect();
        }

        if (rect) {
            lastSelection = selection;
            triggerWrapper.style.display = 'flex';
            addBtn.style.display = 'flex';
            triggerIcon.style.display = isCurrentlyInInput ? 'flex' : 'none';

            let top, left;
            if (settings.triggerPosition === 'mouse') {
                top = (mouseY - 45); left = (mouseX - 20);
            } else {
                top = (window.scrollY + rect.top - 48); left = (window.scrollX + rect.right);
                if (left + 100 > window.scrollX + window.innerWidth) left -= 120;
            }
            triggerWrapper.style.top = top + 'px';
            triggerWrapper.style.left = left + 'px';
        }
    }

    function playClickSound(volume) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    }

    init();
})();
