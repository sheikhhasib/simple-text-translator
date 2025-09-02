// Create context menu on extension startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-element',
    title: 'Translate this element',
    contexts: ['all']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translate-element') {
    // Send message to content script to translate the clicked element
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateElement',
      frameId: info.frameId
    });
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getTranslationPreferences") {
    try {
      chrome.storage.sync.get(['fromLanguage', 'toLanguage', 'isEnabled'], function(items) {
        if (chrome.runtime.lastError) {
          console.error('Background script storage error:', chrome.runtime.lastError);
          // Send default values if storage fails
          sendResponse({
            fromLanguage: 'en',
            toLanguage: 'bn',
            isEnabled: true
          });
        } else {
          // Ensure we always send valid data
          const response = {
            fromLanguage: items.fromLanguage || 'en',
            toLanguage: items.toLanguage || 'bn',
            isEnabled: (typeof items.isEnabled === 'boolean') ? items.isEnabled : true
          };
          sendResponse(response);
        }
      });
    } catch (error) {
      console.error('Background script error:', error);
      // Send default values if there's an exception
      sendResponse({
        fromLanguage: 'en',
        toLanguage: 'bn',
        isEnabled: true
      });
    }
    return true; // Indicates that sendResponse will be called asynchronously
  }
});