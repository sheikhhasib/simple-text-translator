let tooltip;
let debounceTimeout;
let currentTranslationId = 0; // Track translation requests to prevent race conditions
let isTooltipVisible = false;

document.addEventListener('mouseup', function(e) {
  const selectedText = window.getSelection().toString().trim();

  // Clear any existing timeout to reset the debounce timer
  clearTimeout(debounceTimeout);

  if (selectedText.length > 0 && /\S/.test(selectedText)) {
    // Increment translation ID to track this specific request
    const translationId = ++currentTranslationId;

    // Request preferences from background script with error handling
    chrome.runtime.sendMessage({ action: "getTranslationPreferences" }, function(items) {
      // Check if this translation is still relevant (user hasn't made a new selection)
      if (translationId !== currentTranslationId) {
        return; // Ignore outdated requests
      }

      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.error('Error getting translation preferences:', chrome.runtime.lastError);
        return;
      }

      // Validate response
      if (!items || typeof items !== 'object') {
        console.warn('Invalid preferences response, using defaults');
        items = {};
      }

      const fromLang  = items.fromLanguage || 'en';
      const toLang    = items.toLanguage || 'bn';
      const isEnabled = (typeof items.isEnabled === 'boolean') ? items.isEnabled : true;

      if (isEnabled) {
        // Set a new timeout for the translation logic
        debounceTimeout = setTimeout(() => {
          // Double-check that this translation is still relevant
          if (translationId !== currentTranslationId) {
            return;
          }

          showTooltip(e.clientX, e.clientY, "Translating...", selectedText, fromLang, toLang);

          translateText(selectedText, fromLang, toLang, translationId)
            .then(translation => {
              // Only update if this is still the current translation request
              if (translationId === currentTranslationId && translation) {
                showTooltip(e.clientX, e.clientY, translation, selectedText, fromLang, toLang);

                // Save successful translation to history
                if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
                  saveTranslationToHistory(selectedText, translation, fromLang, toLang);
                }
              }
            })
            .catch(error => {
              if (translationId === currentTranslationId) {
                console.error("Translation error:", error);
                showTooltip(e.clientX, e.clientY, "Translation failed", selectedText, fromLang, toLang);
              }
            });
        }, 300);
      } else {
        hideTooltip();
      }
    });
  } else {
    // Hide tooltip if no text is selected
    hideTooltip();
  }
});

document.addEventListener('mousedown', function(e) {
  // Don't hide tooltip if clicking on the tooltip itself or its dropdown elements
  if (tooltip && (tooltip.contains(e.target) || e.target.closest('.translation-tooltip'))) {
    return;
  }

  hideTooltip();
  // Clear debounce timeout and increment translation ID to cancel pending requests
  clearTimeout(debounceTimeout);
  currentTranslationId++;
});

// Prevent tooltip from hiding on mouse movement when interacting with dropdowns
document.addEventListener('mousemove', function(e) {
  // If tooltip is visible and mouse is over tooltip or its elements, don't hide
  if (isTooltipVisible && tooltip && (tooltip.contains(e.target) || e.target.closest('.translation-tooltip'))) {
    return;
  }
});

// Prevent original mouseup handler from triggering when interacting with tooltip
document.addEventListener('mouseup', function(e) {
  // If clicking on tooltip, prevent the original translation logic
  if (tooltip && (tooltip.contains(e.target) || e.target.closest('.translation-tooltip'))) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }
});

// Hide tooltip when scrolling
document.addEventListener('scroll', function() {
  hideTooltip();
});

// Hide tooltip when window is resized
window.addEventListener('resize', function() {
  hideTooltip();
});

function hideTooltip() {
  if (tooltip) {
    tooltip.style.display = 'none';
    tooltip.classList.remove('tooltip-visible');
    isTooltipVisible = false;
  }
}

function showTooltip(x, y, text, sourceText, fromLang, toLang) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'translation-tooltip';
    tooltip.className = 'translation-tooltip';
    document.body.appendChild(tooltip);

    // Prevent events from propagating
    tooltip.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('mouseup', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('mousemove', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('mouseenter', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('mouseover', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('selectstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltip.addEventListener('select', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });
  }

  // Store current language state in tooltip data attributes
  tooltip.dataset.currentFromLang = fromLang;
  tooltip.dataset.currentToLang = toLang;

  // Clear previous content
  tooltip.innerHTML = '';

  // Create tooltip content structure
  const tooltipContent = document.createElement('div');
  tooltipContent.className = 'tooltip-content';

  // Add language indicators and dropdowns if not "Translating..."
  if (text !== "Translating..." && fromLang && toLang) {
    const langContainer = document.createElement('div');
    langContainer.className = 'language-container';

    // Get available languages from storage
    chrome.storage.sync.get(['selectedLanguages'], function(items) {
      // Default languages if none are selected
      const defaultLanguages = [
        { code: 'en', name: 'English' },
        { code: 'bn', name: 'Bangla' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh-CN', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'tr', name: 'Turkish' },
        { code: 'nl', name: 'Dutch' },
        { code: 'sv', name: 'Swedish' },
        { code: 'pl', name: 'Polish' },
        { code: 'cs', name: 'Czech' }
      ];

      let languages = defaultLanguages;
      if (items.selectedLanguages && Array.isArray(items.selectedLanguages) && items.selectedLanguages.length > 0) {
        languages = items.selectedLanguages.map(lang => ({
          code: lang.code,
          name: lang.name || lang.language || lang.code
        }));
      }

      // Sort languages alphabetically
      languages.sort((a, b) => a.name.localeCompare(b.name));

      // Create source language dropdown
      const sourceLangSelect = document.createElement('select');
      sourceLangSelect.className = 'source-lang-select';
      sourceLangSelect.title = 'Change source language';

      // Populate source language options
      languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        option.selected = lang.code === fromLang;
        sourceLangSelect.appendChild(option);
      });

      // Create arrow separator
      const arrowSeparator = document.createElement('span');
      arrowSeparator.className = 'lang-arrow';
      arrowSeparator.textContent = ' → ';

      // Create target language dropdown
      const targetLangSelect = document.createElement('select');
      targetLangSelect.className = 'target-lang-select';
      targetLangSelect.title = 'Change target language';

      // Populate target language options
      languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        option.selected = lang.code === toLang;
        targetLangSelect.appendChild(option);
      });

      // Handle source language change
      sourceLangSelect.addEventListener('change', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        const newSourceLang = e.target.value;
        const currentTargetLang = targetLangSelect.value;
        const currentFromLang = tooltip.dataset.currentFromLang;

        // Only translate if there's an actual change AND languages are different
        if (newSourceLang !== currentFromLang && newSourceLang !== currentTargetLang) {
          // Update stored language state
          tooltip.dataset.currentFromLang = newSourceLang;

          // Show loading state
          const translationTextEl = tooltip.querySelector('.translation-text');
          if (translationTextEl) {
            translationTextEl.textContent = 'Translating...';
          }

          // Get the source text from the current selection
          const selectedText = window.getSelection().toString().trim();

          // Increment translation ID for new request
          const newTranslationId = ++currentTranslationId;

          // Fetch new translation
          translateText(selectedText, newSourceLang, currentTargetLang, newTranslationId)
            .then(translation => {
              if (newTranslationId === currentTranslationId && translation) {
                // Update the tooltip with new translation
                if (translationTextEl) {
                  translationTextEl.textContent = translation;
                }

                // Save the new translation to history if successful
                if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
                  saveTranslationToHistory(selectedText, translation, newSourceLang, currentTargetLang);
                }
              }
            })
            .catch(error => {
              if (newTranslationId === currentTranslationId) {
                console.error('Re-translation error:', error);
                if (translationTextEl) {
                  translationTextEl.textContent = 'Translation failed';
                }
              }
            });
        }
      });

      // Handle target language change
      targetLangSelect.addEventListener('change', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        const newTargetLang = e.target.value;
        const currentSourceLang = sourceLangSelect.value;
        const currentToLang = tooltip.dataset.currentToLang;

        // Only translate if there's an actual change AND languages are different
        if (newTargetLang !== currentToLang && newTargetLang !== currentSourceLang) {
          // Update stored language state
          tooltip.dataset.currentToLang = newTargetLang;

          // Show loading state
          const translationTextEl = tooltip.querySelector('.translation-text');
          if (translationTextEl) {
            translationTextEl.textContent = 'Translating...';
          }

          // Get the source text from the current selection
          const selectedText = window.getSelection().toString().trim();

          // Increment translation ID for new request
          const newTranslationId = ++currentTranslationId;

          // Fetch new translation
          translateText(selectedText, currentSourceLang, newTargetLang, newTranslationId)
            .then(translation => {
              if (newTranslationId === currentTranslationId && translation) {
                // Update the tooltip with new translation
                if (translationTextEl) {
                  translationTextEl.textContent = translation;
                }

                // Save the new translation to history if successful
                if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
                  saveTranslationToHistory(selectedText, translation, currentSourceLang, newTargetLang);
                }
              }
            })
            .catch(error => {
              if (newTranslationId === currentTranslationId) {
                console.error('Re-translation error:', error);
                if (translationTextEl) {
                  translationTextEl.textContent = 'Translation failed';
                }
              }
            });
        }
      });

      // Prevent dropdown events from closing tooltip
      [sourceLangSelect, targetLangSelect].forEach(select => {
        select.addEventListener('mousedown', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('mouseup', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('click', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('focus', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('mouseenter', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('mouseover', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('mousemove', function(e) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });

        select.addEventListener('selectstart', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        });
      });

      // Assemble the language container
      langContainer.appendChild(sourceLangSelect);
      langContainer.appendChild(arrowSeparator);
      langContainer.appendChild(targetLangSelect);

      tooltipContent.appendChild(langContainer);
    });
  }

  // Add translation text
  const textContainer = document.createElement('div');
  textContainer.className = 'translation-text';
  textContainer.textContent = text;
  tooltipContent.appendChild(textContainer);

  // Add copy button if not "Translating..."
  if (text !== "Translating..." && !text.includes('failed') && !text.includes('error')) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'tooltip-buttons';

    const copyButton = document.createElement('button');
    copyButton.className = 'tooltip-btn copy-btn';
    copyButton.innerHTML = 'Copy';
    copyButton.title = 'Copy translation';

    copyButton.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
      navigator.clipboard.writeText(text).then(() => {
        copyButton.innerHTML = 'Copied!';
        copyButton.classList.add('success');
        setTimeout(() => {
          copyButton.innerHTML = 'Copy';
          copyButton.classList.remove('success');
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        copyButton.innerHTML = 'Failed';
        copyButton.classList.add('error');
        setTimeout(() => {
          copyButton.innerHTML = 'Copy';
          copyButton.classList.remove('error');
        }, 1500);
      });
    });

    buttonContainer.appendChild(copyButton);
    tooltipContent.appendChild(buttonContainer);
  }

  // Add loading indicator for "Translating..."
  if (text === "Translating...") {
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.innerHTML = '<div class="spinner"></div>';
    tooltipContent.appendChild(loader);
  }

  tooltip.appendChild(tooltipContent);

  // Position the tooltip
  positionTooltip(x, y);

  // Show tooltip with animation
  tooltip.style.display = 'block';
  // Force reflow for animation
  tooltip.offsetHeight;
  tooltip.classList.add('tooltip-visible');
  isTooltipVisible = true;
}

function positionTooltip(x, y) {
  if (!tooltip) return;

  // Get selection rectangle for better positioning
  const selection = window.getSelection();
  let rect = { left: x, right: x, top: y, bottom: y };

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    rect = range.getBoundingClientRect();
  }

  // Initial positioning
  let tooltipX = rect.left + window.scrollX;
  let tooltipY = rect.bottom + window.scrollY + 8; // 8px below selection

  // Temporarily show tooltip to get dimensions
  tooltip.style.visibility = 'hidden';
  tooltip.style.display = 'block';

  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width;
  const tooltipHeight = tooltipRect.height;

  // Hide again
  tooltip.style.visibility = 'visible';
  tooltip.style.display = 'none';

  // Adjust horizontal position
  if (tooltipX + tooltipWidth > window.innerWidth + window.scrollX) {
    tooltipX = window.innerWidth + window.scrollX - tooltipWidth - 10;
  }
  if (tooltipX < window.scrollX) {
    tooltipX = window.scrollX + 10;
  }

  // Adjust vertical position (show above if not enough space below)
  if (tooltipY + tooltipHeight > window.innerHeight + window.scrollY) {
    tooltipY = rect.top + window.scrollY - tooltipHeight - 8; // Show above selection
  }
  if (tooltipY < window.scrollY) {
    tooltipY = window.scrollY + 10;
  }

  tooltip.style.left = tooltipX + 'px';
  tooltip.style.top = tooltipY + 'px';
}

async function translateText(text, fromLang, toLang, requestId) {
  // Check if this request is still valid
  if (requestId && requestId !== currentTranslationId) {
    return null; // Request cancelled
  }

  // Validate and normalize language codes for MyMemory API
  const normalizeLanguageCode = (lang) => {
    // Common language code mappings for MyMemory API
    const languageMap = {
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'zh': 'zh-CN', // Default Chinese to Simplified
      'pt-BR': 'pt',
      'pt-PT': 'pt'
    };
    return languageMap[lang] || lang;
  };

  const normalizedFromLang = normalizeLanguageCode(fromLang);
  const normalizedToLang = normalizeLanguageCode(toLang);

  // Validate that we have different languages
  if (normalizedFromLang === normalizedToLang) {
    return "Source and target languages cannot be the same.";
  }

  const langpair = `${normalizedFromLang}|${normalizedToLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

  console.log(`Translating: "${text}" from ${normalizedFromLang} to ${normalizedToLang}`);

  try {
    const response = await fetch(url);

    // Check again if request is still valid
    if (requestId && requestId !== currentTranslationId) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Translation API response:', data);

    if (data.responseData && data.responseData.translatedText) {
      const translatedText = data.responseData.translatedText;

      // Check if translation is actually different from source
      if (translatedText.toLowerCase().trim() === text.toLowerCase().trim()) {
        return `No translation needed (same text in both languages).`;
      }

      return translatedText;
    } else if (data.responseStatus === 403) {
      return "MyMemory API daily limit exceeded. Please try again tomorrow.";
    } else if (data.responseStatus === 404) {
      return "Translation not available for this language pair.";
    } else {
      return `Translation error: ${data.responseDetails || 'Unknown error'}`;
    }
  } catch (error) {
    console.error("Translation API call failed:", error);
    return `Translation service error: ${error.message}`;
  }
}

// Function to save translation to history
function saveTranslationToHistory(sourceText, translatedText, sourceLang, targetLang, confidence = null) {
  // Don't save very short or empty translations
  if (!sourceText || sourceText.trim().length < 2 || !translatedText || translatedText.trim().length < 2) {
    return;
  }

  // Don't save if source and translation are the same (no actual translation occurred)
  if (sourceText.trim().toLowerCase() === translatedText.trim().toLowerCase()) {
    return;
  }

  const historyItem = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    sourceText: sourceText.trim(),
    translatedText: translatedText.trim(),
    sourceLang: sourceLang,
    targetLang: targetLang,
    timestamp: Date.now(),
    isFavorite: false,
    confidence: confidence
  };

  // Get existing history and add new item
  chrome.storage.local.get(['translationHistory'], function(result) {
    let history = result.translationHistory || [];

    // Check if this exact translation already exists
    const existingIndex = history.findIndex(item =>
      item.sourceText === historyItem.sourceText &&
      item.translatedText === historyItem.translatedText &&
      item.sourceLang === historyItem.sourceLang &&
      item.targetLang === historyItem.targetLang
    );

    if (existingIndex !== -1) {
      // Update timestamp and move to front
      history[existingIndex].timestamp = Date.now();
      const item = history.splice(existingIndex, 1)[0];
      history.unshift(item);
    } else {
      // Add new item to the beginning
      history.unshift(historyItem);

      // Limit history to 100 items
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
    }

    // Save updated history
    chrome.storage.local.set({ translationHistory: history });
  });
}

