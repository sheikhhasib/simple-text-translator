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
  if (tooltip && tooltip.tooltipElement && tooltip.tooltipElement.contains(e.target)) {
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
  if (isTooltipVisible && tooltip && tooltip.tooltipElement && tooltip.tooltipElement.contains(e.target)) {
    return;
  }
});

// Prevent original mouseup handler from triggering when interacting with tooltip
document.addEventListener('mouseup', function(e) {
  // If clicking on tooltip, prevent the original translation logic
  if (tooltip && tooltip.tooltipElement && tooltip.tooltipElement.contains(e.target)) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }
});

// Hide tooltip when window is resized
window.addEventListener('resize', function() {
  hideTooltip();
});

function hideTooltip() {
  if (tooltip && tooltip.tooltipElement) {
    tooltip.tooltipElement.style.display = 'none';
    tooltip.tooltipElement.classList.remove('tooltip-visible');
    isTooltipVisible = false;
  }
}

function showTooltip(x, y, text, sourceText, fromLang, toLang, fromContextMenu = false) {
  if (!tooltip) {
    // Create tooltip container
    tooltip = document.createElement('div');
    tooltip.id = 'translation-tooltip-container';

    // Create shadow root for style isolation
    const shadowRoot = tooltip.attachShadow({ mode: 'closed' });

    // Create styles for shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      /* Modern Translation Tooltip Styling */
      .translation-tooltip {
        position: absolute;
        background: #2d3748;
        color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 14px;
        display: none;
        max-width: 280px;
        min-width: 260px;
        width: 280px;
        opacity: 0;
        transform: translateY(10px) scale(0.95);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        user-select: none;
        pointer-events: auto;
      }

      .translation-tooltip.tooltip-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .tooltip-content {
        padding: 16px;
      }

      .language-container {
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 8px;
        text-align: center;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        width: 100%;
        box-sizing: border-box;
        flex-wrap: nowrap;
      }

      .source-lang-label {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
      }

      .lang-arrow {
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        margin: 0 2px;
        flex-shrink: 0;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .lang-arrow:hover {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .source-lang-select,
      .target-lang-select {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #ffffff;
        padding: 3px 4px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        width: 45%;
        max-width: 45%;
        min-width: 0;
        flex-shrink: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .source-lang-select:hover,
      .target-lang-select:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .source-lang-select:focus,
      .target-lang-select:focus {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(59, 130, 246, 0.8);
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
      }

      .source-lang-select option,
      .target-lang-select option {
        background: #2d3748;
        color: #ffffff;
        padding: 3px;
        font-size: 12px;
      }

      .translation-text {
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 12px;
        word-wrap: break-word;
        color: #ffffff;
        font-weight: 500;
      }

      .tooltip-buttons {
        display: flex;
        justify-content: center;
        margin-top: 12px;
      }

      .tooltip-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 6px 16px;
        margin-bottom: 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        backdrop-filter: blur(10px);
      }

      .tooltip-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.3);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .tooltip-btn:active {
        transform: translateY(0);
      }

      .tooltip-btn.success {
        background: rgba(59, 130, 246, 0.6);
        border-color: rgba(59, 130, 246, 0.7);
        color: #ffffff;
      }

      .tooltip-btn.success:hover {
        background: rgba(59, 130, 246, 0.75);
      }

      .tooltip-btn.error {
        background: rgba(244, 67, 54, 0.8);
        border-color: rgba(244, 67, 54, 0.9);
      }

      .tooltip-btn.error:hover {
        background: rgba(244, 67, 54, 0.9);
      }

      .loading-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 8px;
      }

      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .translation-tooltip::before {
        content: '';
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 6px solid #2d3748;
      }

      @media (max-width: 480px) {
        .translation-tooltip {
          max-width: 260px;
          min-width: 240px;
          width: 260px;
          font-size: 13px;
        }

        .tooltip-content {
          padding: 10px;
        }

        .language-container {
          padding: 4px 6px;
          font-size: 9px;
        }

        .lang-arrow {
          font-size: 9px;
          margin: 0 1px;
        }

        .source-lang-select,
        .target-lang-select {
          font-size: 8px;
          padding: 2px 3px;
        }

        .translation-text {
          font-size: 13px;
        }

        .tooltip-btn {
          padding: 6px 12px;
          font-size: 11px;
        }
      }

      @media (prefers-contrast: high) {
        .translation-tooltip {
          background: #000000;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        }

        .language-container {
          background: #ffffff;
          color: #000000;
        }

        .tooltip-btn {
          background: #ffffff;
          color: #000000;
          border: 1px solid #000000;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .translation-tooltip {
          transition: none;
        }

        .tooltip-btn {
          transition: none;
        }

        .spinner {
          animation: none;
        }
      }

      @media (prefers-color-scheme: dark) {
        .translation-tooltip {
          background: #1a202c;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .translation-tooltip::before {
          border-bottom-color: #1a202c;
        }
      }
    `;

    // Create the actual tooltip element within shadow DOM
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'translation-tooltip';

    // Append styles and tooltip to shadow root
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(tooltipElement);

    // Store references for easy access
    tooltip.shadowRoot = shadowRoot;
    tooltip.tooltipElement = tooltipElement;

    // Set positioning style on the container (outside shadow DOM)
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '999999';
    tooltip.style.pointerEvents = 'none';

    document.body.appendChild(tooltip);

    // Prevent events from propagating (attach to shadow DOM tooltip element)
    tooltipElement.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('mouseup', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('mousemove', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('mouseenter', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('mouseover', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('selectstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    tooltipElement.addEventListener('select', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });
  }

  // Get references to shadow DOM elements
  const tooltipElement = tooltip.tooltipElement;

  // Store current language state in tooltip data attributes
  tooltipElement.dataset.currentFromLang = fromLang;
  tooltipElement.dataset.currentToLang = toLang;

  // Store the source text in the tooltip data attributes for context menu translations
  tooltipElement.dataset.sourceText = sourceText;

  // Clear previous content
  tooltipElement.innerHTML = '';

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
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'hi', name: 'Hindi' }
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

      // Create arrow separator as a clickable button for swapping languages
      const arrowSeparator = document.createElement('button');
      arrowSeparator.className = 'lang-arrow';
      arrowSeparator.textContent = ' ⇄ '; // Using a double-headed arrow for swap
      arrowSeparator.title = 'Swap languages';
      arrowSeparator.style.background = 'none';
      arrowSeparator.style.border = 'none';
      arrowSeparator.style.color = 'rgba(255, 255, 255, 0.7)';
      arrowSeparator.style.fontSize = '11px';
      arrowSeparator.style.margin = '0 2px';
      arrowSeparator.style.flexShrink = '0';
      arrowSeparator.style.cursor = 'pointer';
      arrowSeparator.style.padding = '0';
      arrowSeparator.style.display = 'flex';
      arrowSeparator.style.alignItems = 'center';
      arrowSeparator.style.justifyContent = 'center';

      // Add click event for swapping languages
      arrowSeparator.addEventListener('click', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        const currentFromLang = sourceLangSelect.value;
        const currentToLang = targetLangSelect.value;

        // Swap the language values
        sourceLangSelect.value = currentToLang;
        targetLangSelect.value = currentFromLang;

        // Update the tooltip's stored language state
        tooltipElement.dataset.currentFromLang = currentToLang;
        tooltipElement.dataset.currentToLang = currentFromLang;

        // Save both language preferences
        chrome.storage.sync.set({
          fromLanguage: currentToLang,
          toLanguage: currentFromLang
        }, function() {
          if (chrome.runtime.lastError) {
            console.error('Error saving swapped language preferences:', chrome.runtime.lastError);
          } else {
            console.log('Successfully saved swapped language preferences');
          }
        });

        // Show loading state
        const translationTextEl = tooltipElement.querySelector('.translation-text');
        if (translationTextEl) {
          translationTextEl.textContent = 'Translating...';
        }

        // Get the source text from the stored data attribute (works for both text selection and context menu)
        const sourceText = tooltipElement.dataset.sourceText || window.getSelection().toString().trim();

        // Increment translation ID for new request
        const newTranslationId = ++currentTranslationId;

        // Fetch new translation with swapped languages
        translateText(sourceText, currentToLang, currentFromLang, newTranslationId)
          .then(translation => {
            if (newTranslationId === currentTranslationId && translation) {
              // Update the tooltip with new translation
              if (translationTextEl) {
                translationTextEl.textContent = translation;
              }

              // Save the new translation to history if successful
              if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
                saveTranslationToHistory(sourceText, translation, currentToLang, currentFromLang);
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
      });

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
        const currentFromLang = tooltipElement.dataset.currentFromLang;

        // Only translate if there's an actual change AND languages are different
        if (newSourceLang !== currentFromLang && newSourceLang !== currentTargetLang) {
          // Update stored language state
          tooltipElement.dataset.currentFromLang = newSourceLang;

          // Save the new source language preference
          chrome.storage.sync.set({ fromLanguage: newSourceLang }, function() {
            if (chrome.runtime.lastError) {
              console.error('Error saving fromLanguage preference:', chrome.runtime.lastError);
            } else {
              console.log('Successfully saved fromLanguage preference:', newSourceLang);
            }
          });

          // Show loading state
          const translationTextEl = tooltipElement.querySelector('.translation-text');
          if (translationTextEl) {
            translationTextEl.textContent = 'Translating...';
          }

          // Get the source text from the stored data attribute (works for both text selection and context menu)
          const sourceText = tooltipElement.dataset.sourceText || window.getSelection().toString().trim();

          // Increment translation ID for new request
          const newTranslationId = ++currentTranslationId;

          // Fetch new translation
          translateText(sourceText, newSourceLang, currentTargetLang, newTranslationId)
            .then(translation => {
              if (newTranslationId === currentTranslationId && translation) {
                // Update the tooltip with new translation
                if (translationTextEl) {
                  translationTextEl.textContent = translation;
                }

                // Save the new translation to history if successful
                if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
                  saveTranslationToHistory(sourceText, translation, newSourceLang, currentTargetLang);
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
        const currentToLang = tooltipElement.dataset.currentToLang;

        // Only translate if there's an actual change AND languages are different
        if (newTargetLang !== currentToLang && newTargetLang !== currentSourceLang) {
          // Update stored language state
          tooltipElement.dataset.currentToLang = newTargetLang;

          // Save the new target language preference
          chrome.storage.sync.set({ toLanguage: newTargetLang }, function() {
            if (chrome.runtime.lastError) {
              console.error('Error saving toLanguage preference:', chrome.runtime.lastError);
            } else {
              console.log('Successfully saved toLanguage preference:', newTargetLang);
            }
          });

          // Show loading state
          const translationTextEl = tooltipElement.querySelector('.translation-text');
          if (translationTextEl) {
            translationTextEl.textContent = 'Translating...';
          }

          // Get the source text from the stored data attribute (works for both text selection and context menu)
          const sourceText = tooltipElement.dataset.sourceText || window.getSelection().toString().trim();

          // Increment translation ID for new request
          const newTranslationId = ++currentTranslationId;

          // Fetch new translation
          translateText(sourceText, currentSourceLang, newTargetLang, newTranslationId)
            .then(translation => {
              if (newTranslationId === currentTranslationId && translation) {
                // Update the tooltip with new translation
                if (translationTextEl) {
                  translationTextEl.textContent = translation;
                }

                // Save the new translation to history if successful
                if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
                  saveTranslationToHistory(sourceText, translation, currentSourceLang, newTargetLang);
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

      // Always get the current translation text from the tooltip
      const currentTranslationEl = tooltipElement.querySelector('.translation-text');
      const currentTranslationText = currentTranslationEl ? currentTranslationEl.textContent : text;

      navigator.clipboard.writeText(currentTranslationText).then(() => {
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

  tooltipElement.appendChild(tooltipContent);

  // Position the tooltip
  positionTooltip(x, y, fromContextMenu);

  // Show tooltip with animation
  tooltipElement.style.display = 'block';
  // Force reflow for animation
  tooltipElement.offsetHeight;
  tooltipElement.classList.add('tooltip-visible');
  isTooltipVisible = true;
}

function positionTooltip(x, y, fromContextMenu = false) {
  if (!tooltip || !tooltip.tooltipElement) return;

  let rect;

  if (fromContextMenu) {
    // For context menu, use the provided coordinates directly
    rect = { left: x, right: x, top: y - 8, bottom: y }; // Slight offset for better positioning
  } else {
    // For text selection, try to get selection rectangle for better positioning
    const selection = window.getSelection();
    rect = { left: x, right: x, top: y, bottom: y };

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      rect = range.getBoundingClientRect();
    }
  }

  // Initial positioning
  let tooltipX = rect.left + window.scrollX;
  let tooltipY = rect.bottom + window.scrollY + 8; // 8px below selection

  // Temporarily show tooltip to get dimensions
  tooltip.tooltipElement.style.visibility = 'hidden';
  tooltip.tooltipElement.style.display = 'block';

  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width;
  const tooltipHeight = tooltipRect.height;

  // Hide again
  tooltip.tooltipElement.style.visibility = 'visible';
  tooltip.tooltipElement.style.display = 'none';

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

  // Check if text is longer than 500 characters
  if (text.length > 500) {
    console.log(`Long text detected (${text.length} chars), splitting into chunks...`);
    return await translateLongText(text, normalizedFromLang, normalizedToLang, requestId);
  }

  // For text under 500 characters, use the original logic
  return await translateSingleChunk(text, normalizedFromLang, normalizedToLang, requestId);
}

// Function to intelligently split long text and translate in chunks
async function translateLongText(text, fromLang, toLang, requestId) {
  // Split text intelligently based on sentence boundaries
  const chunks = splitTextIntelligently(text);
  console.log(`Split text into ${chunks.length} chunks:`, chunks.map(c => c.length));

  const translatedChunks = [];

  // Translate each chunk sequentially
  for (let i = 0; i < chunks.length; i++) {
    // Check if request is still valid before each chunk
    if (requestId && requestId !== currentTranslationId) {
      return null; // Request cancelled
    }

    console.log(`Translating chunk ${i + 1}/${chunks.length}: "${chunks[i].substring(0, 50)}..."`);

    try {
      const chunkTranslation = await translateSingleChunk(chunks[i], fromLang, toLang, requestId);

      // Check if chunk translation failed
      if (!chunkTranslation || chunkTranslation.includes('failed') || chunkTranslation.includes('error') || chunkTranslation.includes('limit exceeded')) {
        console.error(`Chunk ${i + 1} translation failed:`, chunkTranslation);
        return chunkTranslation; // Return the error message
      }

      translatedChunks.push(chunkTranslation);

      // Add a small delay between requests to be respectful to the API
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      }
    } catch (error) {
      console.error(`Error translating chunk ${i + 1}:`, error);
      return `Translation failed at segment ${i + 1}: ${error.message}`;
    }
  }

  // Stitch the translated chunks back together
  const finalTranslation = stitchTranslatedChunks(translatedChunks, chunks);
  console.log('Final stitched translation:', finalTranslation);

  return finalTranslation;
}

// Function to split text intelligently based on sentence boundaries
function splitTextIntelligently(text) {
  const chunks = [];
  let remainingText = text.trim();

  while (remainingText.length > 0) {
    if (remainingText.length <= 500) {
      // If remaining text is under limit, add it as final chunk
      chunks.push(remainingText);
      break;
    }

    // Find the best split point within 500 characters
    let chunkEnd = 500;
    let chunk = remainingText.substring(0, chunkEnd);

    // Try to find sentence boundaries (periods, exclamation marks, question marks)
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let bestSplit = -1;

    for (const ender of sentenceEnders) {
      const lastIndex = chunk.lastIndexOf(ender);
      if (lastIndex > 200 && lastIndex > bestSplit) { // Ensure minimum chunk size of 200 chars
        bestSplit = lastIndex + ender.length;
      }
    }

    // If no sentence boundary found, try other punctuation
    if (bestSplit === -1) {
      const otherPunctuation = ['; ', ', ', ': ', ' - ', ' – ', ' — '];
      for (const punct of otherPunctuation) {
        const lastIndex = chunk.lastIndexOf(punct);
        if (lastIndex > 300 && lastIndex > bestSplit) { // Higher threshold for weaker boundaries
          bestSplit = lastIndex + punct.length;
        }
      }
    }

    // If still no good split point, find last space
    if (bestSplit === -1) {
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > 200) {
        bestSplit = lastSpace + 1;
      } else {
        // Force split at 500 chars if no good boundary found
        bestSplit = 500;
      }
    }

    // Extract the chunk
    const finalChunk = remainingText.substring(0, bestSplit).trim();
    if (finalChunk.length > 0) {
      chunks.push(finalChunk);
    }

    // Update remaining text
    remainingText = remainingText.substring(bestSplit).trim();
  }

  return chunks;
}

// Function to stitch translated chunks back together
function stitchTranslatedChunks(translatedChunks, originalChunks) {
  let result = '';

  for (let i = 0; i < translatedChunks.length; i++) {
    result += translatedChunks[i];

    // Add appropriate spacing between chunks
    if (i < translatedChunks.length - 1) {
      // Check if original chunk ended with punctuation that creates natural breaks
      const originalChunk = originalChunks[i];
      const lastChar = originalChunk.charAt(originalChunk.length - 1);

      if (lastChar.match(/[.!?]/)) {
        result += ' '; // Add space after sentence-ending punctuation
      } else if (lastChar.match(/[,;:-]/)) {
        result += ' '; // Add space after other punctuation
      } else if (!translatedChunks[i].endsWith(' ') && !translatedChunks[i + 1].startsWith(' ')) {
        result += ' '; // Add space if neither chunk has spacing
      }
    }
  }

  return result.trim();
}

// Original translation function for single chunks
async function translateSingleChunk(text, fromLang, toLang, requestId) {
  // Check if this request is still valid
  if (requestId && requestId !== currentTranslationId) {
    return null; // Request cancelled
  }

  const langpair = `${fromLang}|${toLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

  console.log(`Translating chunk: "${text.substring(0, 50)}..." from ${fromLang} to ${toLang}`);

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

// Variable to store the last right-clicked element
let lastRightClickedElement = null;

// Store the element that was right-clicked
document.addEventListener('contextmenu', function(e) {
  lastRightClickedElement = e.target;
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'translateElement') {
    translateElementText();
  }
});

// Function to extract and translate text from the right-clicked element
function translateElementText() {
  if (!lastRightClickedElement) {
    console.warn('No element was right-clicked');
    return;
  }

  // Extract text from the element
  const elementText = extractTextFromElement(lastRightClickedElement);

  if (!elementText || elementText.trim().length === 0) {
    console.warn('No text found in the clicked element');
    return;
  }

  // Get translation preferences and translate
  chrome.runtime.sendMessage({ action: "getTranslationPreferences" }, function(items) {
    if (chrome.runtime.lastError) {
      console.error('Error getting translation preferences:', chrome.runtime.lastError);
      return;
    }

    if (!items || typeof items !== 'object') {
      console.warn('Invalid preferences response, using defaults');
      items = {};
    }

    const fromLang = items.fromLanguage || 'en';
    const toLang = items.toLanguage || 'bn';
    const isEnabled = (typeof items.isEnabled === 'boolean') ? items.isEnabled : true;

    if (!isEnabled) {
      console.log('Translation is disabled');
      return;
    }

    // Increment translation ID for this request
    const translationId = ++currentTranslationId;

    // Get element position for tooltip placement
    const rect = lastRightClickedElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.bottom; // Position below the element

    // Show translating tooltip
    showTooltip(x, y, "Translating...", elementText, fromLang, toLang, true);

    // Translate the text
    translateText(elementText, fromLang, toLang, translationId)
      .then(translation => {
        if (translationId === currentTranslationId && translation) {
          showTooltip(x, y, translation, elementText, fromLang, toLang, true);

          // Save successful translation to history
          if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
            saveTranslationToHistory(elementText, translation, fromLang, toLang);
          }
        }
      })
      .catch(error => {
        if (translationId === currentTranslationId) {
          console.error("Element translation error:", error);
          showTooltip(x, y, "Translation failed", elementText, fromLang, toLang, true);
        }
      });
  });
}

// Function to extract text from an element
function extractTextFromElement(element) {
  if (!element) return '';

  console.log({element});

  // Handle input and textarea elements
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return element.value || element.placeholder || '';
  }

  // Handle elements with title or alt attributes
  if (element.title) {
    return element.title;
  }

  if (element.alt) {
    return element.alt;
  }

  // Handle elements with aria-label
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }

  // For other elements, get the text content
  let text = element.textContent || element.innerText || '';

  // If the element has no direct text, try to get text from immediate child elements
  if (!text.trim() && element.children.length > 0) {
    // Try to get text from the first text-containing child
    for (let child of element.children) {
      const childText = child.textContent || child.innerText || '';
      if (childText.trim()) {
        text = childText;
        break;
      }
    }
  }

  // Clean up the text
  text = text.trim();

  return text;
}

