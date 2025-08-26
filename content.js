let tooltip;
let debounceTimeout; // Declare debounceTimeout variable

document.addEventListener('mouseup', function(e) {
  const selectedText = window.getSelection().toString().trim();

  // Clear any existing timeout to reset the debounce timer
  clearTimeout(debounceTimeout);

  if (selectedText.length > 0 && /\S/.test(selectedText)) {
    // Request preferences from background script
    chrome.runtime.sendMessage({ action: "getTranslationPreferences" }, function(items) {
      const fromLang  = items.fromLanguage || 'auto'; // Default to auto-detect
      const toLang    = items.toLanguage || 'bn'; // Default to Bangla
      const isEnabled = (typeof items.isEnabled === 'boolean') ? items.isEnabled : true; // Default to enabled

      if (isEnabled) { // Only proceed if translation is enabled
        // Set a new timeout for the translation logic
        debounceTimeout = setTimeout(() => {
          showTooltip(e.clientX, e.clientY, "Translating...");

          translateText(selectedText, fromLang, toLang)
            .then(translation => {
              showTooltip(e.clientX, e.clientY, translation);
            })
            .catch(error => {
              console.error("Translation error:", error);
              showTooltip(e.clientX, e.clientY, "Translation failed");
            });
        }, 300); // Debounce time of 300 milliseconds
      } else {
        // If translation is disabled, hide any existing tooltip
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      }
    });
  }
});

document.addEventListener('mousedown', function() {
  if (tooltip) {
    tooltip.style.display = 'none';
  }
  // Also clear debounce timeout on mousedown to immediately hide tooltip and prevent delayed translation
  clearTimeout(debounceTimeout);
});

function showTooltip(x, y, text) {
  if (!tooltip) {
    tooltip    = document.createElement('div');
    tooltip.id = 'translation-tooltip';
    document.body.appendChild(tooltip);

    // Prevent mousedown events on the tooltip from propagating to the document
    tooltip.addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
  }

  // Clear previous content and add translated text
  tooltip.innerHTML = ''; // Clear existing content
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  tooltip.appendChild(textSpan);

  // Only add copy button if text is not "Translating..."
  if (text !== "Translating...") {
    const copyButton = document.createElement('button');

    copyButton.textContent           = 'Copy';
    copyButton.style.marginLeft      = '10px';     // Add some spacing
    copyButton.style.padding         = '2px 5px';
    copyButton.style.fontSize        = '12px';
    copyButton.style.cursor          = 'pointer';
    copyButton.style.backgroundColor = '#555';
    copyButton.style.color           = '#fff';
    copyButton.style.border          = 'none';
    copyButton.style.borderRadius    = '3px';

    copyButton.onclick = function() {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 1000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    };
    tooltip.appendChild(copyButton);
  }

  // Get the bounding rectangle of the selected text
  const selection = window.getSelection();
  if (!selection.rangeCount) return; // No selection

  const range = selection.getRangeAt(0);
  const rect  = range.getBoundingClientRect();

  // Calculate desired position
  let tooltipX = rect.left + window.scrollX;
  let tooltipY = rect.bottom + window.scrollY + 5; // 5px below the selected text

  // Basic viewport checking (prevent going off-screen to the right)
  // This is a simplified check. More robust solutions would consider top/bottom/left.
  if (tooltipX + tooltip.offsetWidth > window.innerWidth + window.scrollX) {
    tooltipX = window.innerWidth + window.scrollX - tooltip.offsetWidth - 10; // 10px padding from right edge
  }
  if (tooltipX < window.scrollX) { // Prevent going off-screen to the left
    tooltipX = window.scrollX + 10; // 10px padding from left edge
  }

  tooltip.style.left    = tooltipX + 'px';
  tooltip.style.top     = tooltipY + 'px';
  tooltip.style.display = 'block';
}

async function translateText(text, fromLang, toLang) {
  const langpair = `${fromLang}|${toLang}`;
  const url      = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.responseData) {
      return data.responseData.translatedText;
    } else if (data.responseStatus === 403) {
        return "MyMemory API daily limit exceeded or invalid request.";
    }
    else {
      return "No translation found.";
    }
  } catch (error) {
    console.error("API call failed (MyMemory):", error);
    return "Translation service error (MyMemory).";
  }
}

