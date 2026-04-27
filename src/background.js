chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['templates', 'settings'], (data) => {
    if (!data.templates) {
      chrome.storage.local.set({
        templates: [
          { text: "mail@example.com", cat: "emails", type: "dynamic" },
          { text: "İstanbul, Türkiye", cat: "addresses", type: "dynamic" }
        ]
      });
    }
    if (!data.settings) {
      chrome.storage.local.set({
        settings: {
          directions: { north: 1, south: 1, east: 1, west: 1 },
          excludedDomains: "example.com, junk.org"
        }
      });
    }
  });
});

// OMNIBOX SUPPORT: Type 'of ' in URL bar
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.local.get(['templates'], (data) => {
    const templates = data.templates || [];
    const matches = templates.filter(t => t.text.toLowerCase().includes(text.toLowerCase()));
    const suggestions = matches.map(t => ({
      content: t.text,
      description: `Copy to clipboard: ${t.text.substring(0, 30)}${t.text.length > 30 ? '...' : ''}`
    }));
    suggest(suggestions);
  });
});

chrome.omnibox.onInputEntered.addListener((text) => {
    // In background scripts, we don't have document, so we use a small hack or just a notification
    // Proper way to copy to clipboard in MV3 background is tricky, 
    // but we can send a message to the active tab to copy it.
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (txt) => {
                    const el = document.createElement('textarea');
                    el.value = txt;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    console.log('OrbitalFill: Copied from URL bar ->', txt);
                },
                args: [text]
            });
        }
    });
});
