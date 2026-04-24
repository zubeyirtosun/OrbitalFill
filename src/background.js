chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['templates', 'settings'], (data) => {
    if (!data.templates) {
      chrome.storage.local.set({
        templates: [
          "Örnek Adres: İstanbul, Türkiye",
          "Vergi No: 1234567890",
          "Telefon: +90 555 555 55 55"
        ]
      });
    }
    if (!data.settings) {
      chrome.storage.local.set({
        settings: {
          directions: { north: 1, south: 1, east: 1, west: 1 }
        }
      });
    }
  });
});
