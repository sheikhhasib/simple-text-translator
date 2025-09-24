document.addEventListener('DOMContentLoaded', function () {
  // Get DOM elements with validation
  const fromLangSelect = document.getElementById('from-lang-select');
  const toLangSelect = document.getElementById('to-lang-select');
  const messageArea = document.getElementById('message-area');
  const swapLanguagesButton = document.getElementById('swap-languages');
  const toggleTranslate = document.getElementById('toggle-translate');
  const settingsIcon = document.getElementById('settings-icon');
  const historyIcon = document.getElementById('history-icon');

  // Validate critical DOM elements
  if (!fromLangSelect || !toLangSelect) {
    console.error('Critical DOM elements not found: language select dropdowns');
    return;
  }

  // Tab elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // History elements
  const historySearch = document.getElementById('history-search');
  const historyList = document.getElementById('history-list');

  let translationHistory = [];

  // Listen for storage changes to update UI when preferences change from tooltip
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync') {
      if (changes.fromLanguage) {
        fromLangSelect.value = changes.fromLanguage.newValue;
      }
      if (changes.toLanguage) {
        toLangSelect.value = changes.toLanguage.newValue;
      }
    }
  });

  // Tab switching functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.dataset.tab;

      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      document.getElementById(targetTab + '-tab').classList.add('active');

      // Load history if switching to history tab
      if (targetTab === 'history') {
        loadHistory();
      }
    });
  });

  // History functionality
  function loadHistory() {
    chrome.storage.local.get(['translationHistory'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('Error loading translation history:', chrome.runtime.lastError);
        translationHistory = [];
      } else {
        translationHistory = result.translationHistory || [];
      }
      displayHistory(translationHistory);
    });
  }

  function displayHistory(history) {
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="no-history">
          <p>No translation history yet.</p>
          <p>Start translating text to see your history here!</p>
        </div>
      `;
      return;
    }

    // Show only recent 10 items in popup
    const recentHistory = history.slice(0, 10);
    const hasMore = history.length > 10;

    historyList.innerHTML = recentHistory.map(item => {
      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-text">
            <span class="history-source">${truncateText(item.sourceText, 20)}</span>
            <span class="history-arrow">&rarr;</span>
            <span class="history-target">${truncateText(item.translatedText, 25)}</span>
          </div>
          <div class="history-meta">
            <span class="history-languages">${item.sourceLang} &rarr; ${item.targetLang}</span>
            <div class="history-actions-item">
              <button class="history-btn favorite ${item.isFavorite ? 'active' : ''}" data-action="favorite" data-id="${item.id}">
                ${item.isFavorite ? '&#9733;' : '&#9734;'}
              </button>
              <button class="history-btn" data-action="copy" data-text="${item.translatedText.replace(/"/g, '&quot;')}">Copy</button>
              <button class="history-btn delete" data-action="delete" data-id="${item.id}">
                &times;
              </button>
            </div>
          </div>
          <div class="history-meta">
            <span>${formatTimeAgo(item.timestamp)}</span>
            ${item.confidence ? `<span>Confidence: ${Math.round(item.confidence * 100)}%</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Always show "View All" button
    const totalItems = history.length;
    historyList.innerHTML += `
      <div class="view-all-container">
        <button id="view-all-history" class="view-all-btn">
          View All History (${totalItems} item${totalItems === 1 ? '' : 's'}) &rarr;
        </button>
      </div>
    `;

    // Add event listeners for history buttons
    addHistoryButtonListeners();

    // Add event listener for "View All" button
    const viewAllBtn = document.getElementById('view-all-history');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('Error creating new tab:', chrome.runtime.lastError);
          }
        });
      });
    }
  }

  function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Add event listeners for history buttons using delegation
  function addHistoryButtonListeners() {
    // Remove existing listeners to avoid duplicates
    historyList.removeEventListener('click', handleHistoryButtonClick);
    // Add event listener for all history buttons
    historyList.addEventListener('click', handleHistoryButtonClick);
  }

  function handleHistoryButtonClick(e) {
    if (!e.target.classList.contains('history-btn')) return;

    const action = e.target.dataset.action;

    switch (action) {
      case 'favorite':
        toggleFavoriteItem(e.target.dataset.id);
        break;
      case 'copy':
        copyToClipboardItem(e.target.dataset.text);
        break;

      case 'delete':
        deleteHistoryItemConfirm(e.target.dataset.id);
        break;
    }
  }

  function toggleFavoriteItem(itemId) {
    const item = translationHistory.find(h => h.id === itemId);
    if (item) {
      item.isFavorite = !item.isFavorite;
      chrome.storage.local.set({ translationHistory: translationHistory }, function() {
        displayHistory(translationHistory);
      });
    }
  }

  function copyToClipboardItem(text) {
    navigator.clipboard.writeText(text).then(() => {
      // Show brief success feedback
      const buttons = document.querySelectorAll('[data-action="copy"]');
      buttons.forEach(btn => {
        if (btn.dataset.text === text) {
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 1000);
        }
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    });
  }



  function deleteHistoryItemConfirm(itemId) {
    if (confirm('Delete this translation from history?')) {
      translationHistory = translationHistory.filter(h => h.id !== itemId);
      chrome.storage.local.set({ translationHistory: translationHistory }, function() {
        displayHistory(translationHistory);
      });
    }
  }

  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  function decodeHtmlEntities(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  }

  // History search functionality
  historySearch.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const filteredHistory = translationHistory.filter(item =>
      item.sourceText.toLowerCase().includes(searchTerm) ||
      item.translatedText.toLowerCase().includes(searchTerm) ||
      item.sourceLang.toLowerCase().includes(searchTerm) ||
      item.targetLang.toLowerCase().includes(searchTerm)
    );
    displayHistory(filteredHistory);
  });

  function populateLanguages(selectElement, languages) {
    // Validate input parameters
    if (!selectElement || !languages || !Array.isArray(languages)) {
      console.error('Invalid parameters for populateLanguages:', { selectElement, languages });
      return;
    }

    try {
      selectElement.innerHTML = ''; // Clear existing options

      // Validate and sort languages
      const validLanguages = languages.filter(lang =>
        lang && typeof lang === 'object' && lang.code && (lang.name || lang.language)
      );

      if (validLanguages.length === 0) {
        console.warn('No valid languages found, using defaults');
        // Add a default option if no valid languages
        const defaultOption = document.createElement('option');
        defaultOption.value = 'en';
        defaultOption.textContent = 'English';
        selectElement.appendChild(defaultOption);
        return;
      }

      validLanguages.sort((a, b) => {
        const nameA = a.name || a.language || a.code;
        const nameB = b.name || b.language || b.code;
        return nameA.localeCompare(nameB);
      });

      validLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name || lang.language || lang.code;
        selectElement.appendChild(option);
      });

    } catch (error) {
      console.error('Error in populateLanguages:', error);
    }
  }

  // Function to save preferences with error handling
  function savePreferences() {
    // Validate DOM elements exist
    if (!fromLangSelect || !toLangSelect || !toggleTranslate) {
      console.error('Required DOM elements not found for saving preferences');
      return;
    }

    const fromLanguage = fromLangSelect.value;
    const toLanguage = toLangSelect.value;
    const isEnabled = toggleTranslate.checked;

    // Clear previous messages
    if (messageArea) {
      messageArea.textContent = '';
    }

    // Validation: Prevent saving if fromLanguage and toLanguage are the same
    if (fromLanguage === toLanguage) {
      if (messageArea) {
        messageArea.textContent = 'Please select two distinct languages.';
      }
      return;
    }

    // Validate language codes
    if (!fromLanguage || !toLanguage) {
      if (messageArea) {
        messageArea.textContent = 'Please select valid languages.';
      }
      return;
    }

    chrome.storage.sync.set({
      fromLanguage: fromLanguage,
      toLanguage: toLanguage,
      isEnabled: isEnabled
    }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving preferences:', chrome.runtime.lastError);
        if (messageArea) {
          messageArea.textContent = 'Error saving preferences. Please try again.';
        }
      }
    });
  }

  // Load saved options with proper error handling
  function loadLanguageSettings() {
    chrome.storage.sync.get(['selectedLanguages', 'fromLanguage', 'toLanguage', 'isEnabled'], function (items) {
      // Check for Chrome storage errors
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        // Use default languages if storage fails
        initializeWithDefaults();
        return;
      }

      // Use the centralized language mapping
      let languages = (typeof window.LanguageMap !== 'undefined')
        ? window.LanguageMap.ALL_LANGUAGES.map(lang => ({
          code: lang.code,
          name: lang.language
        }))
        : [];

      // Ensure we have valid language data
      if (items.selectedLanguages && Array.isArray(items.selectedLanguages) && items.selectedLanguages.length > 0) {
        // Validate language structure and convert if needed
        languages = items.selectedLanguages.map(lang => {
          // Handle both old and new data structures
          return {
            code: lang.code,
            name: lang.name || lang.language || lang.code
          };
        });
      }

      // Validate DOM elements exist
      if (!fromLangSelect || !toLangSelect) {
        console.error('Language select elements not found in DOM');
        return;
      }

      try {
        populateLanguages(fromLangSelect, languages);
        populateLanguages(toLangSelect, languages);

        // Set default values with validation
        const fromLang = items.fromLanguage || 'en';
        const toLang = items.toLanguage || 'bn';

        // Ensure the selected values exist in the dropdown
        if (fromLangSelect.querySelector(`option[value="${fromLang}"]`)) {
          fromLangSelect.value = fromLang;
        } else {
          fromLangSelect.value = 'en'; // Fallback to English
        }

        if (toLangSelect.querySelector(`option[value="${toLang}"]`)) {
          toLangSelect.value = toLang;
        } else {
          toLangSelect.value = 'bn'; // Fallback to Bangla
        }

        toggleTranslate.checked = (typeof items.isEnabled === 'boolean') ? items.isEnabled : true;
      } catch (error) {
        console.error('Error populating language dropdowns:', error);
        initializeWithDefaults();
      }
    });
  }

  function initializeWithDefaults() {
    // Use the centralized language mapping
    let defaultLanguages = (typeof window.LanguageMap !== 'undefined')
      ? window.LanguageMap.ALL_LANGUAGES.map(lang => ({
        code: lang.code,
        name: lang.language
      }))
      : [];

    if (fromLangSelect && toLangSelect) {
      populateLanguages(fromLangSelect, defaultLanguages);
      populateLanguages(toLangSelect, defaultLanguages);
      fromLangSelect.value = 'en';
      toLangSelect.value = 'bn';
      if (toggleTranslate) {
        toggleTranslate.checked = true;
      }
    }
  }

  // Call the load function
  loadLanguageSettings();

  // Event listener for language swap button with validation
  if (swapLanguagesButton) {
    swapLanguagesButton.addEventListener('click', function () {
      if (!fromLangSelect || !toLangSelect) {
        console.error('Language select elements not available for swap');
        return;
      }

      const currentFrom = fromLangSelect.value;
      const currentTo = toLangSelect.value;

      // Validate that we have valid values to swap
      if (!currentFrom || !currentTo) {
        console.warn('Cannot swap: invalid language values');
        return;
      }

      // Swap values
      fromLangSelect.value = currentTo;
      toLangSelect.value = currentFrom;

      savePreferences(); // Save preferences after swap
    });
  }

  // Save preferences on dropdown change with validation
  if (fromLangSelect) {
    fromLangSelect.addEventListener('change', savePreferences);
  }
  if (toLangSelect) {
    toLangSelect.addEventListener('change', savePreferences);
  }

  if (settingsIcon) {
    settingsIcon.addEventListener('click', function () {
      chrome.runtime.openOptionsPage();
    });
  }

  if (historyIcon) {
    historyIcon.addEventListener('click', function () {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
  }

  // Save preferences on toggle change
  if (toggleTranslate) {
    toggleTranslate.addEventListener('change', savePreferences);
  }
});