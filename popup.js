document.addEventListener('DOMContentLoaded', function () {
  const fromLangSelect = document.getElementById('from-lang-select');
  const toLangSelect = document.getElementById('to-lang-select');
  const messageArea = document.getElementById('message-area'); // Get message area
  const swapLanguagesButton = document.getElementById('swap-languages'); // Get swap button
  const toggleTranslate = document.getElementById('toggle-translate'); // Get toggle button
  const settingsIcon = document.getElementById('settings-icon');

  // Tab elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // History elements
  const historySearch = document.getElementById('history-search');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history');
  const exportHistoryBtn = document.getElementById('export-history');

  let translationHistory = [];

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
      translationHistory = result.translationHistory || [];
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
              <button class="history-btn" data-action="retranslate" data-source="${item.sourceText.replace(/"/g, '&quot;')}" data-from="${item.sourceLang}" data-to="${item.targetLang}">
                &#8635;
              </button>
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
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
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
      case 'retranslate':
        retranslateItem(e.target.dataset.source, e.target.dataset.from, e.target.dataset.to);
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

  function retranslateItem(sourceText, fromLang, toLang) {
    // Switch to translate tab and fill in the values
    document.querySelector('[data-tab="translate"]').click();
    fromLangSelect.value = fromLang;
    toLangSelect.value = toLang;

    // Show user feedback
    messageArea.textContent = `Ready to translate "${truncateText(sourceText, 30)}". Please select this text on a webpage.`;
    messageArea.style.color = '#4CAF50';
    setTimeout(() => {
      messageArea.textContent = '';
      messageArea.style.color = '';
    }, 5000);
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

  // Clear history
  clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all translation history?')) {
      chrome.storage.local.set({ translationHistory: [] }, function() {
        translationHistory = [];
        displayHistory([]);
      });
    }
  });

  // Export history
  exportHistoryBtn.addEventListener('click', function() {
    if (translationHistory.length === 0) {
      alert('No history to export!');
      return;
    }

    const exportData = translationHistory.map(item => {
      // Decode any HTML entities in the text
      const sourceText = decodeHtmlEntities(item.sourceText);
      const translatedText = decodeHtmlEntities(item.translatedText);

      return `${sourceText} (${item.sourceLang}) -> ${translatedText} (${item.targetLang}) - ${new Date(item.timestamp).toLocaleString()}`;
    }).join('\n');

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation_history.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  function populateLanguages(selectElement, languages) {
    selectElement.innerHTML = ''; // Clear existing options

    languages.sort((a, b) => a.name.localeCompare(b.name));

    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      selectElement.appendChild(option);
    });
  }

  // Function to save preferences
  function savePreferences() {
    const fromLanguage = fromLangSelect.value;
    const toLanguage = toLangSelect.value;
    const isEnabled = toggleTranslate.checked; // Get toggle state

    // Clear previous messages
    messageArea.textContent = '';

    // Validation: Prevent saving if fromLanguage and toLanguage are the same
    if (fromLanguage === toLanguage) {
      messageArea.textContent = 'Please select two distinct languages.';
      return; // Stop the function
    }

    chrome.storage.sync.set({
      fromLanguage: fromLanguage,
      toLanguage: toLanguage,
      isEnabled: isEnabled // Save toggle state
    });
  }

  // Load saved options
  chrome.storage.sync.get(['selectedLanguages', 'fromLanguage', 'toLanguage', 'isEnabled'], function (items) {
    const defaultLanguages = [
      { code: 'en', name: 'English' },
      { code: 'bn', name: 'Bangla' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'zh', name: 'Chinese' },
      { code: 'hi', name: 'Hindi' }
    ];
    const languages = items.selectedLanguages && items.selectedLanguages.length > 0 ? items.selectedLanguages : defaultLanguages;

    populateLanguages(fromLangSelect, languages);
    populateLanguages(toLangSelect, languages);

    fromLangSelect.value = items.fromLanguage || 'en'; // Default to English
    toLangSelect.value = items.toLanguage || 'bn'; // Default to Bangla
    toggleTranslate.checked = (typeof items.isEnabled === 'boolean') ? items.isEnabled : true; // Default to enabled
  });

  // Event listener for language swap button
  swapLanguagesButton.addEventListener('click', function () {
    const currentFrom = fromLangSelect.value;
    const currentTo = toLangSelect.value;

    // Swap values
    fromLangSelect.value = currentTo;
    toLangSelect.value = currentFrom;

    savePreferences(); // Save preferences after swap
  });

  // Save preferences on dropdown change
  fromLangSelect.addEventListener('change', savePreferences);
  toLangSelect.addEventListener('change', savePreferences);

  settingsIcon.addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });

  // Save preferences on toggle change
  toggleTranslate.addEventListener('change', savePreferences);
});