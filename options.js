document.addEventListener('DOMContentLoaded', function () {
  const languageListContainer = document.getElementById('language-list');
  const searchInput = document.getElementById('search-input');
  const saveButton = document.getElementById('save-button');
  const messageArea = document.getElementById('message-area');
  const apiMymemory = document.getElementById('api-mymemory');
  const apiChrome = document.getElementById('api-chrome');
  const apiDescription = document.getElementById('api-description');
  const apiWarning = document.getElementById('api-warning');

  // Use the centralized language mapping
  const allLanguages = (typeof window.LanguageMap !== 'undefined')
    ? window.LanguageMap.ALL_LANGUAGES
    : [];

  let selectedLanguages = [];
  let selectedApi = 'mymemory'; // Default to MyMemory API

  // Function to get all languages (no filtering)
  function getFilteredLanguages() {
    // Show all languages regardless of API selection
    return allLanguages;
  }

  // Check if Chrome's APIs are available
  function checkChromeApiAvailability() {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
    const chromeVersion = isChrome && chromeVersionMatch ? parseInt(chromeVersionMatch[1]) : 0;

    const isTranslatorAvailable = 'Translator' in self;
    const isLanguageDetectorAvailable = 'LanguageDetector' in self;

    const isChromeApiAvailable = isChrome && chromeVersion >= 138 && isTranslatorAvailable && isLanguageDetectorAvailable;

    // Show warning message if API is not available
    if (apiWarning) {
      if (!isChromeApiAvailable) {
        let reason = "";
        if (!isChrome) {
          reason = "Not using Chrome browser. ";
        } else if (chromeVersion < 138) {
          reason = `Chrome version ${chromeVersion} is too old (requires 138+). `;
        } else if (!isTranslatorAvailable) {
          reason = "Translator API not available in this Chrome version. ";
        } else if (!isLanguageDetectorAvailable) {
          reason = "Language Detector API not available in this Chrome version. ";
        }
        apiWarning.textContent = "Chrome Built-in Translator API not available: " + reason + "Falling back to MyMemory API.";
        apiWarning.style.display = 'block';
      } else {
        apiWarning.style.display = 'none';
      }
    }

    if (apiChrome) {
      if (!isChromeApiAvailable) {
        apiChrome.disabled = true;
        let reason = "";
        if (!isChrome) {
          reason = "Not using Chrome browser";
        } else if (chromeVersion < 138) {
          reason = `Chrome version ${chromeVersion} is too old, requires 138+`;
        } else if (!isTranslatorAvailable) {
          reason = "Translator API not available";
        } else if (!isLanguageDetectorAvailable) {
          reason = "Language Detector API not available";
        }
        apiChrome.parentElement.title = `Chrome Built-in Translator API not available: ${reason}`;
      } else {
        apiChrome.disabled = false;
        apiChrome.parentElement.title = "";
      }
    }

    return isChromeApiAvailable;
  }

  // Update API description when selection changes
  function updateApiDescription() {
    if (apiMymemory.checked) {
      apiDescription.textContent = 'Using MyMemory API - Requires internet connection';
      selectedApi = 'mymemory';
      // Re-render language list with all languages
      renderLanguages(searchInput ? searchInput.value : '');
    } else if (apiChrome.checked) {
      if (checkChromeApiAvailability()) {
        apiDescription.textContent = 'Using Chrome Built-in Translator - Works offline (Chrome 138+)';
        selectedApi = 'chrome';
        // Re-render language list with all languages (no filtering)
        renderLanguages(searchInput ? searchInput.value : '');
      } else {
        apiDescription.textContent = 'Chrome Built-in Translator not available - Requires Chrome 138+';
        // Automatically switch back to MyMemory if Chrome API is not available
        apiMymemory.checked = true;
        selectedApi = 'mymemory';
        updateApiDescription();
      }
    }
  }

  // Add event listeners for API selection
  if (apiMymemory) {
    apiMymemory.addEventListener('change', updateApiDescription);
  }
  if (apiChrome) {
    apiChrome.addEventListener('change', updateApiDescription);
  }

  function renderLanguages(filter = '') {
    if (!languageListContainer) {
      return;
    }

    try {
      languageListContainer.innerHTML = '';
      const lowerCaseFilter = filter.toLowerCase();

      // Get all languages (no filtering based on API)
      const languages = getFilteredLanguages();

      const sortedLanguages = [...languages].sort((a, b) => {
        const aIsSelected = selectedLanguages.some(l => l.code === a.code);
        const bIsSelected = selectedLanguages.some(l => l.code === b.code);
        return bIsSelected - aIsSelected;
      });

      sortedLanguages.forEach(lang => {
        if (lang.language.toLowerCase().includes(lowerCaseFilter)) {
          const isChecked = selectedLanguages.some(selected => selected.code === lang.code);
          const item = `
            <div class="language-item">
              <input type="checkbox" id="checkbox-${lang.code}" ${isChecked ? 'checked' : ''} data-code="${lang.code}" data-name="${lang.language}">
              <label for="checkbox-${lang.code}">${lang.language}</label>
            </div>
          `;
          languageListContainer.insertAdjacentHTML('beforeend', item);
        }
      });

      // Add event listeners to checkboxes
      const checkboxes = languageListContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const langCode = this.dataset.code;
          const langName = this.dataset.name;

          if (this.checked) {
            // Add language if not already selected
            if (!selectedLanguages.some(l => l.code === langCode)) {
              selectedLanguages.push({ code: langCode, name: langName });
            }
          } else {
            // Remove language from selected list
            selectedLanguages = selectedLanguages.filter(l => l.code !== langCode);
          }
        });
      });

    } catch (error) {
      if (messageArea) {
        messageArea.textContent = 'Error displaying language options.';
        messageArea.style.color = 'red';
      }
    }
  }

  function saveSelectedLanguages() {
    try {
      // selectedLanguages is already updated via checkbox event listeners

      chrome.storage.sync.set({
        'selectedLanguages': selectedLanguages,
        'selectedApi': selectedApi
      }, function () {
        if (chrome.runtime.lastError) {
          if (messageArea) {
            messageArea.textContent = 'Error saving languages. Please try again.';
            messageArea.style.color = 'red';
          }
        } else {
          if (messageArea) {
            messageArea.textContent = 'Languages and API settings saved!';
            messageArea.style.color = 'green';
          }
        }
        if (messageArea) {
          setTimeout(() => {
            messageArea.textContent = '';
          }, 3000);
        }
      });
    } catch (error) {
      if (messageArea) {
        messageArea.textContent = 'Error saving languages. Please try again.';
        messageArea.style.color = 'red';
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderLanguages(searchInput.value);
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', saveSelectedLanguages);
  }

  // Load saved settings
  chrome.storage.sync.get(['selectedLanguages', 'selectedApi'], function (data) {
    if (chrome.runtime.lastError) {
      // Handle error silently
    }

    const defaultLanguages = [
      { code: 'en', name: 'English' },
      { code: 'bn', name: 'Bangla' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'hi', name: 'Hindi' }
    ];

    if (data.selectedLanguages && Array.isArray(data.selectedLanguages) && data.selectedLanguages.length > 0) {
      // Handle both old and new data structures for backward compatibility
      selectedLanguages = data.selectedLanguages.map(lang => ({
        code: lang.code,
        name: lang.name || lang.language || lang.code
      }));
    } else {
      selectedLanguages = defaultLanguages;
    }

    // Set API selection
    if (data.selectedApi) {
      selectedApi = data.selectedApi;
      if (selectedApi === 'chrome' && apiChrome) {
        // Check if Chrome API is available before selecting it
        if (checkChromeApiAvailability()) {
          apiChrome.checked = true;
        } else {
          // Fall back to MyMemory if Chrome API is not available
          apiMymemory.checked = true;
          selectedApi = 'mymemory';
        }
      } else if (apiMymemory) {
        apiMymemory.checked = true; // Default to MyMemory
      }
    } else {
      // Default to MyMemory API
      if (apiMymemory) {
        apiMymemory.checked = true;
      }
    }

    // Update API description
    updateApiDescription();

    try {
      renderLanguages();
    } catch (error) {
      if (messageArea) {
        messageArea.textContent = 'Error loading language options.';
        messageArea.style.color = 'red';
      }
    }
  });
});