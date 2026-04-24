document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('templateList');
    const { templates } = await chrome.storage.local.get('templates');

    if (templates && templates.length > 0) {
        templates.forEach(text => {
            const div = document.createElement('div');
            div.className = 'template-item';
            div.innerText = text;
            div.title = text;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:12px;">Henüz şablon eklenmemiş.</p>';
    }

    document.getElementById('optionsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});
