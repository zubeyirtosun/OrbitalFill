let selectedTheme = 'indigo';

function save_options() {
    const settings = {
        directions: {
            north: parseInt(document.getElementById('north').value),
            east: parseInt(document.getElementById('east').value),
            south: parseInt(document.getElementById('south').value),
            west: parseInt(document.getElementById('west').value)
        },
        showRecentInSouth: false,
        theme: selectedTheme,
        triggerPosition: document.getElementById('triggerPosition').value,
        enableFloating: document.getElementById('enableFloating').value === 'true',
        radialStyle: document.getElementById('radialStyle').value,
        iconShape: document.getElementById('iconShape').value,
        staticColor: document.getElementById('staticColor').value,
        dynamicColor: document.getElementById('dynamicColor').value,
        excludedDomains: document.getElementById('excludedDomains').value
    };

    const templateRows = document.querySelectorAll('.template-row');
    const templates = Array.from(templateRows).map(row => {
        return {
            text: row.querySelector('.template-text').value,
            cat: row.querySelector('.cat-input').value || 'all',
            type: row.querySelector('.type-select').value,
            slot: row.querySelector('.slot-input').value.toUpperCase() || null
        };
    }).filter(t => t.text.trim() !== '');

    chrome.storage.local.set({ settings, templates }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 3000);
    });
}

function restore_options() {
    chrome.storage.local.get(['settings', 'templates'], (data) => {
        if (data.settings) {
            const s = data.settings;
            document.getElementById('north').value = s.directions.north || 1;
            document.getElementById('east').value = s.directions.east || 1;
            document.getElementById('south').value = s.directions.south || 1;
            document.getElementById('west').value = s.directions.west || 1;
            
            document.getElementById('triggerPosition').value = s.triggerPosition || 'mouse';
            document.getElementById('enableFloating').value = s.enableFloating === false ? 'false' : 'true';
            document.getElementById('radialStyle').value = s.radialStyle || 'standard';
            document.getElementById('iconShape').value = s.iconShape || 'square';
            document.getElementById('staticColor').value = s.staticColor || '#ef4444';
            document.getElementById('dynamicColor').value = s.dynamicColor || '#3b82f6';
            
            selectedTheme = s.theme || 'indigo';
            document.getElementById('excludedDomains').value = s.excludedDomains || '';
            updateThemeUI();
        }

        if (data.templates) {
            data.templates.forEach(t => addTemplateRow(t));
        } else {
            addTemplateRow({});
        }
    });
}

function addTemplateRow(t = {}) {
    const container = document.getElementById('templateList');
    const row = document.createElement('div');
    row.className = 'template-row';
    
    const text = t.text || '';
    const cat = t.cat || 'all';
    const type = t.type || 'dynamic';
    const slot = t.slot || '';

    row.innerHTML = `
        <input type="text" class="template-text" placeholder="Metin..." value="${text}">
        <input type="text" class="cat-input" placeholder="Kategori" value="${cat}">
        <select class="type-select">
            <option value="dynamic" ${type === 'dynamic' ? 'selected' : ''}>Dinamik</option>
            <option value="static" ${type === 'static' ? 'selected' : ''}>Statik</option>
        </select>
        <input type="text" class="slot-input" placeholder="N1, E2.." value="${slot}">
        <button class="btn btn-delete">×</button>
    `;
    
    row.querySelector('.btn-delete').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function updateThemeUI() {
    document.querySelectorAll('.theme-circle').forEach(c => {
        c.classList.toggle('active', c.dataset.theme === selectedTheme);
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('addTemplate').addEventListener('click', () => addTemplateRow({}));

document.getElementById('themeList').addEventListener('click', (e) => {
    if (e.target.classList.contains('theme-circle')) {
        selectedTheme = e.target.dataset.theme;
        updateThemeUI();
    }
});
