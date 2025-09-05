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

// Store cached preferences in memory for faster access
let cachedPreferences = {
  fromLanguage: 'en',
  toLanguage: 'bn',
  isEnabled: true
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getTranslationPreferences") {
    try {
      chrome.storage.sync.get(['fromLanguage', 'toLanguage', 'isEnabled'], function(items) {
        if (chrome.runtime.lastError) {
          console.error('Background script storage error:', chrome.runtime.lastError);
          // Send cached values if storage fails
          sendResponse(cachedPreferences);
        } else {
          // Ensure we always send valid data
          const response = {
            fromLanguage: items.fromLanguage || cachedPreferences.fromLanguage,
            toLanguage: items.toLanguage || cachedPreferences.toLanguage,
            isEnabled: (typeof items.isEnabled === 'boolean') ? items.isEnabled : cachedPreferences.isEnabled
          };

          // Update cache with retrieved values
          cachedPreferences = response;

          sendResponse(response);
        }
      });
    } catch (error) {
      console.error('Background script error:', error);
      // Send cached values if there's an exception
      sendResponse(cachedPreferences);
    }
    return true; // Indicates that sendResponse will be called asynchronously
  }
  else if (request.action === "updateTranslationPreferences") {
    // Update cached preferences
    if (request.fromLanguage !== undefined) {
      cachedPreferences.fromLanguage = request.fromLanguage;
    }
    if (request.toLanguage !== undefined) {
      cachedPreferences.toLanguage = request.toLanguage;
    }

    // Send response immediately
    sendResponse({ status: "success" });
    return false; // Synchronous response
  }
});