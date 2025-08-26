chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getTranslationPreferences") {
    chrome.storage.sync.get(['fromLanguage', 'toLanguage', 'isEnabled'], function(items) {
      sendResponse(items);
    });
    return true; // Indicates that sendResponse will be called asynchronously
  }
});