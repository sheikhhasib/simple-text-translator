// History Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const historySearch = document.getElementById('history-search');
  const clearSearchBtn = document.getElementById('clear-search');
  const languageFilter = document.getElementById('language-filter');
  const favoritesFilter = document.getElementById('favorites-filter');
  const sortOptions = document.getElementById('sort-options');
  const historyList = document.getElementById('history-list');
  const noResults = document.getElementById('no-results');
  const resultsCount = document.getElementById('results-count');
  const clearAllBtn = document.getElementById('clear-all-history');
  const exportBtn = document.getElementById('export-history');
  const importBtn = document.getElementById('import-history');
  const importFileInput = document.getElementById('import-file-input');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const pagination = document.getElementById('pagination');

  // Statistics elements
  const totalTranslationsEl = document.getElementById('total-translations');
  const favoriteCountEl = document.getElementById('favorite-count');
  const languagePairsEl = document.getElementById('language-pairs');
  const thisMonthEl = document.getElementById('this-month');

  // State variables
  let allHistory = [];
  let filteredHistory = [];
  let currentPage = 1;
  const itemsPerPage = 12;

  // Initialize the page
  init();

  function init() {
    loadHistory();
    setupEventListeners();
  }

  function setupEventListeners() {
    // Search functionality
    historySearch.addEventListener('input', debounce(handleSearch, 300));
    clearSearchBtn.addEventListener('click', clearSearch);

    // Filter functionality
    languageFilter.addEventListener('change', applyFilters);
    favoritesFilter.addEventListener('change', applyFilters);
    sortOptions.addEventListener('change', applyFilters);

    // Action buttons
    clearAllBtn.addEventListener('click', clearAllHistory);
    exportBtn.addEventListener('click', exportHistory);
    importBtn.addEventListener('click', importHistory);
    importFileInput.addEventListener('change', handleImportFile);

    // Pagination
    prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
  }

  function loadHistory() {
    chrome.storage.local.get(['translationHistory'], function(result) {
      allHistory = result.translationHistory || [];
      populateLanguageFilter();
      updateStatistics();
      applyFilters();
    });
  }

  // Function to reload history from storage and refresh the display
  function refreshHistory() {
    chrome.storage.local.get(['translationHistory'], function(result) {
      allHistory = result.translationHistory || [];
      updateStatistics();
      applyFilters();
    });
  }

  function populateLanguageFilter() {
    const languagePairs = new Set();
    allHistory.forEach(item => {
      // Only add pairs where source and target languages are different
      if (item.sourceLang !== item.targetLang) {
        languagePairs.add(`${item.sourceLang} → ${item.targetLang}`);
      }
    });

    languageFilter.innerHTML = '<option value="">All Languages</option>';
    Array.from(languagePairs).sort().forEach(pair => {
      const option = document.createElement('option');
      option.value = pair;

      // Convert language codes to human-readable names
      const [sourceCode, targetCode] = pair.split(' → ');
      const sourceName = getLanguageName(sourceCode);
      const targetName = getLanguageName(targetCode);

      option.textContent = `${sourceName} → ${targetName}`;
      languageFilter.appendChild(option);
    });
  }

  function updateStatistics() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: allHistory.length,
      favorites: allHistory.filter(item => item.isFavorite).length,
      languagePairs: new Set(allHistory.map(item => `${getLanguageName(item.sourceLang)}-${getLanguageName(item.targetLang)}`)).size,
      thisMonth: allHistory.filter(item => new Date(item.timestamp) >= thisMonth).length
    };

    // Animate counter updates
    animateCounter(totalTranslationsEl, stats.total);
    animateCounter(favoriteCountEl, stats.favorites);
    animateCounter(languagePairsEl, stats.languagePairs);
    animateCounter(thisMonthEl, stats.thisMonth);
  }

  function animateCounter(element, targetValue) {
    const startValue = 0;
    const duration = 1000;
    const increment = targetValue / (duration / 16);
    let currentValue = startValue;

    const timer = setInterval(() => {
      currentValue += increment;
      if (currentValue >= targetValue) {
        element.textContent = targetValue;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(currentValue);
      }
    }, 16);
  }

  function handleSearch() {
    applyFilters();
  }

  function clearSearch() {
    historySearch.value = '';
    applyFilters();
  }

  function applyFilters() {
    const searchTerm = historySearch.value.toLowerCase();
    const selectedLanguage = languageFilter.value;
    const favoritesOnly = favoritesFilter.value;
    const sortBy = sortOptions.value;

    // Filter history
    filteredHistory = allHistory.filter(item => {
      // Search filter - include human-readable language names in search
      const matchesSearch = !searchTerm ||
        item.sourceText.toLowerCase().includes(searchTerm) ||
        item.translatedText.toLowerCase().includes(searchTerm) ||
        item.sourceLang.toLowerCase().includes(searchTerm) ||
        item.targetLang.toLowerCase().includes(searchTerm) ||
        getLanguageName(item.sourceLang).toLowerCase().includes(searchTerm) ||
        getLanguageName(item.targetLang).toLowerCase().includes(searchTerm);

      // Language filter - convert human-readable name back to code format for comparison
      let matchesLanguage = true;
      if (selectedLanguage) {
        // Convert the selected human-readable language back to code format for comparison
        const [sourceName, targetName] = selectedLanguage.split(' → ');
        const sourceCode = getLanguageCode(sourceName);
        const targetCode = getLanguageCode(targetName);

        matchesLanguage = `${item.sourceLang} → ${item.targetLang}` === `${sourceCode} → ${targetCode}`;
      }

      // Favorites filter
      let matchesFavorites = true;
      if (favoritesOnly === 'favorites') {
        matchesFavorites = item.isFavorite;
      } else if (favoritesOnly === 'recent') {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        matchesFavorites = item.timestamp >= thirtyDaysAgo;
      }

      return matchesSearch && matchesLanguage && matchesFavorites;
    });

    // Sort filtered results
    sortHistory(sortBy);

    // Reset to first page
    currentPage = 1;

    // Display results
    displayHistory();
    updateResultsInfo();
    setupPagination();
  }

  function sortHistory(sortBy) {
    switch (sortBy) {
      case 'newest':
        filteredHistory.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filteredHistory.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'source':
        filteredHistory.sort((a, b) => a.sourceText.localeCompare(b.sourceText));
        break;
      case 'target':
        filteredHistory.sort((a, b) => a.translatedText.localeCompare(b.translatedText));
        break;
      case 'language':
        filteredHistory.sort((a, b) => {
          const aPair = `${getLanguageName(a.sourceLang)}-${getLanguageName(a.targetLang)}`;
          const bPair = `${getLanguageName(b.sourceLang)}-${getLanguageName(b.targetLang)}`;
          return aPair.localeCompare(bPair);
        });
        break;
    }
  }

  function displayHistory() {
    if (filteredHistory.length === 0) {
      historyList.style.display = 'none';
      noResults.style.display = 'block';
      return;
    }

    historyList.style.display = 'grid';
    noResults.style.display = 'none';

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredHistory.slice(startIndex, endIndex);

    // Generate HTML
    historyList.innerHTML = pageItems.map(item => createHistoryCard(item)).join('');

    // Add event listeners
    setupCardEventListeners();
  }

  function createHistoryCard(item) {
    const date = new Date(item.timestamp);
    const timeAgo = formatTimeAgo(item.timestamp);
    const fullDateTime = date.toLocaleString(); // Full date and time for hover
    const confidence = item.confidence ? Math.round(item.confidence * 100) : null;

    // Check if this is a failed translation
    const isFailedTranslation = item.translatedText.includes('failed') ||
                               item.translatedText.includes('error') ||
                               item.translatedText.includes('limit exceeded');

    return `
      <div class="history-card ${item.isFavorite ? 'favorite' : ''} ${isFailedTranslation ? 'failed-translation' : ''}" data-id="${item.id}" data-clickable="true">
        <div class="card-header">
          <div class="language-pair">${getLanguageName(item.sourceLang)} → ${getLanguageName(item.targetLang)}</div>
          <div class="card-actions">
            <button class="card-btn favorite ${item.isFavorite ? 'active' : ''}"
                    data-action="favorite" data-id="${item.id}"
                    title="${item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
              ${item.isFavorite ? '&#9733;' : '&#9734;'}
            </button>
            <button class="card-btn copy" data-action="copy"
                    data-text="${item.translatedText.replace(/"/g, '&quot;')}"
                    title="Copy translation">
              Copy
            </button>
            <button class="card-btn delete" data-action="delete"
                    data-id="${item.id}" title="Delete">
              &times;
            </button>
          </div>
        </div>

        <div class="translation-content">
          <div class="source-text">${escapeHtml(item.sourceText)}</div>
          <div class="translation-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M13 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="translated-text">${escapeHtml(item.translatedText)}</div>
        </div>

        <div class="card-footer">
          <span class="timestamp" title="${fullDateTime}">${timeAgo}</span>
          ${confidence ? `<span class="confidence">${confidence}% confidence</span>` : ''}
          ${item.usedApi ? `<span class="used-api">API: ${item.usedApi}</span>` : ''}
        </div>

        ${isFailedTranslation ? '<div class="failed-translation-warning">Translation failed</div>' : ''}
      </div>
    `;
  }

  function setupCardEventListeners() {
    historyList.addEventListener('click', function(e) {
      // Handle button clicks
      if (e.target.classList.contains('card-btn')) {
        e.stopPropagation(); // Prevent card click when clicking buttons
        const action = e.target.dataset.action;

        switch (action) {
          case 'favorite':
            toggleFavorite(e.target.dataset.id, e.target);
            break;
          case 'copy':
            copyToClipboard(e.target.dataset.text, e.target);
            break;
          case 'delete':
            deleteItem(e.target.dataset.id);
            break;
        }
        return;
      }

      // Handle card clicks
      const card = e.target.closest('.history-card[data-clickable="true"]');
      if (card) {
        const itemId = card.dataset.id;
        const item = allHistory.find(h => h.id === itemId);
        if (item) {
          showDetailsModal(item);
        }
      }
    });
  }

  function toggleFavorite(itemId, button) {
    const item = allHistory.find(h => h.id === itemId);
    if (item) {
      item.isFavorite = !item.isFavorite;

      // Update button appearance
      button.classList.toggle('active');
      button.innerHTML = item.isFavorite ? '&#9733;' : '&#9734;';
      button.title = item.isFavorite ? 'Remove from favorites' : 'Add to favorites';

      // Update card appearance
      const card = button.closest('.history-card');
      card.classList.toggle('favorite', item.isFavorite);

      // Save to storage with proper history limiting
      saveHistory(allHistory, function(limitedHistory) {
        allHistory = limitedHistory;
        refreshHistory(); // Ensure the display is updated with the latest data
      });
    }
  }

  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = '✓';
      button.style.backgroundColor = '#4CAF50';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
      }, 1000);
    }).catch(err => {
      // Failed to copy text
      alert('Failed to copy to clipboard');
    });
  }

  function deleteItem(itemId) {
    if (confirm('Are you sure you want to delete this translation?')) {
      allHistory = allHistory.filter(h => h.id !== itemId);
      saveHistory(allHistory, function(limitedHistory) {
        allHistory = limitedHistory;
        refreshHistory(); // Ensure the display is updated with the latest data
      });
    }
  }

  function updateResultsInfo() {
    const totalItems = filteredHistory.length;
    const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalItems === 0) {
      resultsCount.textContent = 'No results found';
    } else if (totalItems <= itemsPerPage) {
      resultsCount.textContent = `Showing ${totalItems} translation${totalItems === 1 ? '' : 's'}`;
    } else {
      resultsCount.textContent = `Showing ${startItem}-${endItem} of ${totalItems} translations`;
    }
  }

  function showDetailsModal(item) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('details-modal');
    if (!modal) {
      modal = createDetailsModal();
      document.body.appendChild(modal);
    }

    // Populate modal with item data
    populateDetailsModal(modal, item);

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function createDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'details-modal';
    modal.className = 'details-modal';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Translation Details</h2>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>

        <div class="modal-body">
          <div class="language-selection">
            <div class="language-selector">
              <label for="from-lang-detail">From:</label>
              <select id="from-lang-detail" class="language-select"></select>
            </div>
            <button id="swap-languages-detail" class="swap-btn" title="Swap languages">
              ⇄
            </button>
            <div class="language-selector">
              <label for="to-lang-detail">To:</label>
              <select id="to-lang-detail" class="language-select"></select>
            </div>
          </div>

          <!-- API Selection Section -->
          <div class="api-selection-section">
            <label for="api-selection-detail">Translation API:</label>
            <select id="api-selection-detail" class="api-select">
              <option value="mymemory">MyMemory API (Online)</option>
              <option value="chrome">Chrome Built-in Translator (Offline)</option>
            </select>
          </div>

          <div class="translation-section">
            <div class="text-section">
              <label>Original Text:</label>
              <div class="text-content source-content" id="source-content"></div>
            </div>

            <div class="translation-arrow-detail">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M13 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>

            <div class="text-section">
              <label>Translation:</label>
              <div class="text-content target-content" id="target-content"></div>
              <div class="loading-indicator" id="detail-loading" style="display: none;">
                <div class="spinner"></div>
                <span>Translating...</span>
              </div>
            </div>
          </div>

          <div class="details-info">
            <div class="info-item">
              <span class="info-label">Timestamp:</span>
              <span id="detail-timestamp"></span>
            </div>
            <div class="info-item" id="confidence-info" style="display: none;">
              <span class="info-label">Confidence:</span>
              <span id="detail-confidence"></span>
            </div>
            <div class="info-item" id="api-info" style="display: none;">
              <span class="info-label">Translated with:</span>
              <span id="detail-api"></span>
            </div>
          </div>

          <div class="modal-actions">
            <button id="detail-copy" class="action-btn copy-btn">Copy Translation</button>
            <button id="detail-favorite" class="action-btn favorite-btn">Toggle Favorite</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    modal.addEventListener('click', function(e) {
      if (e.target === modal || e.target.id === 'modal-close') {
        closeDetailsModal();
      }
    });

    return modal;
  }

  function populateDetailsModal(modal, item) {
    // Store current item reference
    modal.currentItem = item;

    // Populate language selectors
    populateLanguageSelectors(modal, item);

    // Populate API selection
    populateApiSelection(modal, item);

    // Populate content
    document.getElementById('source-content').textContent = item.sourceText;
    document.getElementById('target-content').textContent = item.translatedText;

    // Populate details
    const timestamp = new Date(item.timestamp).toLocaleString();
    document.getElementById('detail-timestamp').textContent = timestamp;

    if (item.confidence) {
      document.getElementById('confidence-info').style.display = 'block';
      document.getElementById('detail-confidence').textContent = `${Math.round(item.confidence * 100)}%`;
    } else {
      document.getElementById('confidence-info').style.display = 'none';
    }

    // Display API information if available
    if (item.usedApi) {
      document.getElementById('api-info').style.display = 'block';
      const apiName = item.usedApi === 'chrome' ? 'Chrome Built-in Translator' : 'MyMemory API';
      document.getElementById('detail-api').textContent = apiName;
    } else {
      document.getElementById('api-info').style.display = 'none';
    }

    // Update favorite button
    const favoriteBtn = document.getElementById('detail-favorite');
    favoriteBtn.textContent = item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteBtn.className = `action-btn favorite-btn ${item.isFavorite ? 'active' : ''}`;

    // Add event listeners
    setupModalEventListeners(modal);

    // Check if this is a failed translation and show warning
    const isFailedTranslation = item.translatedText.includes('failed') ||
                               item.translatedText.includes('error') ||
                               item.translatedText.includes('limit exceeded');

    if (isFailedTranslation) {
      const targetContent = document.getElementById('target-content');
      targetContent.classList.add('failed-translation-text');
    } else {
      const targetContent = document.getElementById('target-content');
      targetContent.classList.remove('failed-translation-text');
    }
  }

  function populateApiSelection(modal, item) {
    // Get selected API from storage
    chrome.storage.sync.get(['selectedApi'], function(result) {
      const selectedApi = result.selectedApi || 'mymemory';
      const apiSelect = document.getElementById('api-selection-detail');

      if (apiSelect) {
        apiSelect.value = selectedApi;

        // Check Chrome API availability
        if (selectedApi === 'chrome') {
          checkChromeApiAvailabilityForModal(apiSelect);
        }
      }
    });
  }

  function checkChromeApiAvailabilityForModal(apiSelect) {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
    const chromeVersion = isChrome && chromeVersionMatch ? parseInt(chromeVersionMatch[1]) : 0;

    const isTranslatorAvailable = 'Translator' in self;
    const isLanguageDetectorAvailable = 'LanguageDetector' in self;

    const isChromeApiAvailable = isChrome && chromeVersion >= 138 && isTranslatorAvailable && isLanguageDetectorAvailable;

    if (!isChromeApiAvailable && apiSelect) {
      // Show warning by changing option text
      const chromeOption = apiSelect.querySelector('option[value="chrome"]');
      if (chromeOption) {
        chromeOption.textContent = 'Chrome Built-in Translator (Not Available)';
        chromeOption.disabled = true;
      }

      // Switch back to MyMemory API
      apiSelect.value = 'mymemory';
    }
  }

  function populateLanguageSelectors(modal, item) {
    // Get available languages from storage
    chrome.storage.sync.get(['selectedLanguages'], function(result) {
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
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'tr', name: 'Turkish' },
        { code: 'nl', name: 'Dutch' },
        { code: 'sv', name: 'Swedish' },
        { code: 'pl', name: 'Polish' },
        { code: 'cs', name: 'Czech' }
      ];

      let languages = defaultLanguages;
      if (result.selectedLanguages && Array.isArray(result.selectedLanguages) && result.selectedLanguages.length > 0) {
        languages = result.selectedLanguages.map(lang => ({
          code: lang.code,
          name: lang.name || lang.language || lang.code
        }));
      }

      // Sort languages alphabetically
      languages.sort((a, b) => a.name.localeCompare(b.name));

      // Populate selectors
      const fromSelect = document.getElementById('from-lang-detail');
      const toSelect = document.getElementById('to-lang-detail');

      fromSelect.innerHTML = '';
      toSelect.innerHTML = '';

      languages.forEach(lang => {
        const fromOption = document.createElement('option');
        fromOption.value = lang.code;
        fromOption.textContent = getLanguageName(lang.code);
        fromOption.selected = lang.code === item.sourceLang;
        fromSelect.appendChild(fromOption);

        const toOption = document.createElement('option');
        toOption.value = lang.code;
        toOption.textContent = getLanguageName(lang.code);
        toOption.selected = lang.code === item.targetLang;
        toSelect.appendChild(toOption);
      });
    });
  }

  function setupModalEventListeners(modal) {
    // Remove existing listeners to avoid duplicates
    const fromSelect = document.getElementById('from-lang-detail');
    const toSelect = document.getElementById('to-lang-detail');
    const apiSelect = document.getElementById('api-selection-detail');
    const swapBtn = document.getElementById('swap-languages-detail');
    const copyBtn = document.getElementById('detail-copy');
    const favoriteBtn = document.getElementById('detail-favorite');

    // Clone elements to remove all event listeners
    const newFromSelect = fromSelect.cloneNode(true);
    const newToSelect = toSelect.cloneNode(true);
    const newApiSelect = apiSelect ? apiSelect.cloneNode(true) : null;
    const newSwapBtn = swapBtn.cloneNode(true);
    const newCopyBtn = copyBtn.cloneNode(true);
    const newFavoriteBtn = favoriteBtn.cloneNode(true);

    fromSelect.parentNode.replaceChild(newFromSelect, fromSelect);
    toSelect.parentNode.replaceChild(newToSelect, toSelect);
    if (apiSelect && newApiSelect) {
      apiSelect.parentNode.replaceChild(newApiSelect, apiSelect);
    }
    swapBtn.parentNode.replaceChild(newSwapBtn, swapBtn);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);

    // Add new event listeners
    newFromSelect.addEventListener('change', () => handleLanguageChange(modal));
    newToSelect.addEventListener('change', () => handleLanguageChange(modal));

    if (newApiSelect) {
      newApiSelect.addEventListener('change', () => {
        // Save the API preference
        chrome.storage.sync.set({ selectedApi: newApiSelect.value });
        // Trigger translation with the new API
        handleLanguageChange(modal);
      });
    }

    newSwapBtn.addEventListener('click', () => {
      const fromValue = newFromSelect.value;
      const toValue = newToSelect.value;
      newFromSelect.value = toValue;
      newToSelect.value = fromValue;
      handleLanguageChange(modal);
    });

    newCopyBtn.addEventListener('click', () => {
      const targetContent = document.getElementById('target-content').textContent;
      navigator.clipboard.writeText(targetContent).then(() => {
        newCopyBtn.textContent = 'Copied!';
        setTimeout(() => {
          newCopyBtn.textContent = 'Copy Translation';
        }, 1500);
      });
    });

    newFavoriteBtn.addEventListener('click', () => {
      const item = modal.currentItem;
      item.isFavorite = !item.isFavorite;

      // Update modal button
      newFavoriteBtn.textContent = item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
      newFavoriteBtn.className = `action-btn favorite-btn ${item.isFavorite ? 'active' : ''}`;

      // Save to storage and update main view
      chrome.storage.local.set({ translationHistory: allHistory }, function() {
        updateStatistics();
        applyFilters(); // Refresh the main view
      });
    });
  }

  // Intelligent text splitting functions for handling 500+ character texts
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

  async function translateLongText(text, fromLang, toLang) {
    // Split text intelligently based on sentence boundaries
    const chunks = splitTextIntelligently(text);
    // Split text into chunks

    const translatedChunks = [];

    // Translate each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      // Translating chunk

      try {
        const chunkTranslation = await translateSingleChunk(chunks[i], fromLang, toLang);

        // Check if chunk translation failed
        if (!chunkTranslation || chunkTranslation.includes('failed') || chunkTranslation.includes('error') || chunkTranslation.includes('limit exceeded')) {
          // Chunk translation failed
          return chunkTranslation; // Return the error message
        }

        translatedChunks.push(chunkTranslation);

        // Add a small delay between requests to be respectful to the API
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        }
      } catch (error) {
        // Error translating chunk
        return `Translation failed at segment ${i + 1}: ${error.message}`;
      }
    }

    // Stitch the translated chunks back together
    const finalTranslation = stitchTranslatedChunks(translatedChunks, chunks);
    // Final stitched translation

    return finalTranslation;
  }

  async function translateSingleChunk(text, fromLang, toLang) {
    const langpair = `${fromLang}|${toLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

    // Translating chunk

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Translation API response

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
      // Translation API call failed
      return `Translation service error: ${error.message}`;
    }
  }

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

  function handleLanguageChange(modal) {
    const item = modal.currentItem;
    const fromLang = document.getElementById('from-lang-detail').value;
    const toLang = document.getElementById('to-lang-detail').value;
    const selectedApi = document.getElementById('api-selection-detail') ? document.getElementById('api-selection-detail').value : 'mymemory';

    // Prevent translation if languages are the same
    if (fromLang === toLang) {
      alert('Source and target languages cannot be the same.');
      return;
    }

    // Show loading indicator
    const loadingEl = document.getElementById('detail-loading');
    const targetEl = document.getElementById('target-content');

    loadingEl.style.display = 'flex';
    targetEl.style.opacity = '0.5';

    const sourceText = item.sourceText;

    // Use intelligent text splitting for texts over 500 characters
    if (sourceText.length > 500) {
      // For long texts, we'll use the appropriate API
      translateLongTextWithApi(sourceText, fromLang, toLang, selectedApi)
        .then(translation => {
          if (translation && !translation.includes('failed') && !translation.includes('error') && !translation.includes('limit exceeded')) {
            // Update display
            targetEl.textContent = translation;

            // Update item data
            item.sourceLang = fromLang;
            item.targetLang = toLang;
            item.translatedText = translation;
            item.confidence = null; // Multi-chunk translations don't have single confidence score

            // Hide confidence display for multi-chunk translations
            document.getElementById('confidence-info').style.display = 'none';

            // Save updated item to storage
            saveHistory(allHistory, function(limitedHistory) {
              allHistory = limitedHistory;
              refreshHistory(); // Ensure the display is updated with the latest data
            });
          } else {
            targetEl.textContent = translation || 'Translation failed';
          }
        })
        .catch(error => {
          // Long text translation error
          targetEl.textContent = 'Translation failed';
        })
        .finally(() => {
          loadingEl.style.display = 'none';
          targetEl.style.opacity = '1';
        });
    } else {
      // For short texts, use the appropriate API
      translateTextWithSelectedApi(sourceText, fromLang, toLang, selectedApi)
        .then(result => {
          if (result && result.translation && !result.translation.includes('failed') && !result.translation.includes('error') && !result.translation.includes('limit exceeded')) {
            const newTranslation = result.translation;

            // Update display
            targetEl.textContent = newTranslation;

            // Update item data
            item.sourceLang = fromLang;
            item.targetLang = toLang;
            item.translatedText = newTranslation;
            item.confidence = result.confidence || null;

            // Update confidence display
            if (item.confidence) {
              document.getElementById('confidence-info').style.display = 'block';
              document.getElementById('detail-confidence').textContent = `${Math.round(item.confidence * 100)}%`;
            } else {
              document.getElementById('confidence-info').style.display = 'none';
            }

            // Save updated item to storage
            saveHistory(allHistory, function(limitedHistory) {
              allHistory = limitedHistory;
              refreshHistory(); // Ensure the display is updated with the latest data
            });
          } else {
            targetEl.textContent = result.translation || 'Translation failed';
          }
        })
        .catch(error => {
          // Translation error
          targetEl.textContent = 'Translation failed';
        })
        .finally(() => {
          loadingEl.style.display = 'none';
          targetEl.style.opacity = '1';
        });
    }
  }

  async function translateTextWithSelectedApi(text, fromLang, toLang, selectedApi) {
    if (selectedApi === 'chrome') {
      // Check if Chrome API is available
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
      const chromeVersion = isChrome && chromeVersionMatch ? parseInt(chromeVersionMatch[1]) : 0;
      const isTranslatorAvailable = 'Translator' in self;

      if (isChrome && chromeVersion >= 138 && isTranslatorAvailable) {
        try {
          // Use Chrome's built-in Translator API
          const translation = await translateTextWithChrome(text, fromLang, toLang);
          return { translation, confidence: null };
        } catch (error) {
          // Fall back to MyMemory API if Chrome translation fails
          return await translateWithMyMemory(text, fromLang, toLang);
        }
      } else {
        // Fall back to MyMemory API if Chrome API is not available
        return await translateWithMyMemory(text, fromLang, toLang);
      }
    } else {
      // Use MyMemory API
      return await translateWithMyMemory(text, fromLang, toLang);
    }
  }

  async function translateWithMyMemory(text, fromLang, toLang) {
    const langpair = `${fromLang}|${toLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.responseData && data.responseData.translatedText) {
        const translatedText = data.responseData.translatedText;

        // Check if translation is actually different from source
        if (translatedText.toLowerCase().trim() === text.toLowerCase().trim()) {
          return { translation: `No translation needed (same text in both languages).`, confidence: null };
        }

        return { translation: translatedText, confidence: data.responseData.match || null };
      } else if (data.responseStatus === 403) {
        return { translation: "MyMemory API daily limit exceeded. Please try again tomorrow.", confidence: null };
      } else if (data.responseStatus === 404) {
        return { translation: "Translation not available for this language pair.", confidence: null };
      } else {
        return { translation: `Translation error: ${data.responseDetails || 'Unknown error'}`, confidence: null };
      }
    } catch (error) {
      return { translation: `Translation service error: ${error.message}`, confidence: null };
    }
  }

  async function translateTextWithChrome(text, fromLang, toLang) {
    // Normalize language codes to match what Chrome API expects
    const normalizeLanguageCode = (lang) => {
      const chromeLanguageMap = {
        'zh-CN': 'zh',
        'zh-TW': 'zh-Hant',
        'pt-BR': 'pt',
        'pt-PT': 'pt'
      };
      return chromeLanguageMap[lang] || lang;
    };

    const normalizedFromLang = normalizeLanguageCode(fromLang);
    const normalizedToLang = normalizeLanguageCode(toLang);

    // Create translator instance
    const translator = await Translator.create({
      sourceLanguage: normalizedFromLang,
      targetLanguage: normalizedToLang,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          // Progress tracking can be added here if needed
        });
      }
    });

    // Translate the text
    const translation = await translator.translate(text);

    // Clean up the translator instance
    if (translator.destroy) {
      translator.destroy();
    }

    return translation;
  }

  async function translateLongTextWithApi(text, fromLang, toLang, selectedApi) {
    // Split text intelligently based on sentence boundaries
    const chunks = splitTextIntelligently(text);
    const translatedChunks = [];

    // Translate each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      try {
        const result = await translateTextWithSelectedApi(chunks[i], fromLang, toLang, selectedApi);
        const chunkTranslation = result.translation;

        // Check if chunk translation failed
        if (!chunkTranslation || chunkTranslation.includes('failed') || chunkTranslation.includes('error') || chunkTranslation.includes('limit exceeded')) {
          return chunkTranslation; // Return the error message
        }

        translatedChunks.push(chunkTranslation);

        // Add a small delay between requests to be respectful to the API
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        }
      } catch (error) {
        return `Translation failed at segment ${i + 1}: ${error.message}`;
      }
    }

    // Stitch the translated chunks back together
    const finalTranslation = stitchTranslatedChunks(translatedChunks, chunks);
    return finalTranslation;
  }

  function closeDetailsModal() {
    const modal = document.getElementById('details-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  function setupPagination() {
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  function changePage(newPage) {
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      displayHistory();
      updateResultsInfo();
      setupPagination();

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function clearAllHistory() {
    if (confirm('Are you sure you want to clear ALL translation history? This action cannot be undone.')) {
      chrome.storage.local.set({ translationHistory: [] }, function() {
        allHistory = [];
        filteredHistory = [];
        updateStatistics();
        displayHistory();
        updateResultsInfo();
        setupPagination();
        populateLanguageFilter();
      });
    }
  }

  // Add this constant at the top of the file, after the existing variable declarations
  const HISTORY_LIMIT = 500;

  // Helper function to limit history to HISTORY_LIMIT items
  function limitHistory(history) {
    if (history.length > HISTORY_LIMIT) {
      return history.slice(0, HISTORY_LIMIT);
    }
    return history;
  }

  // Helper function to save history with proper limiting
  function saveHistory(newHistory, callback) {
    const limitedHistory = limitHistory(newHistory);
    chrome.storage.local.set({ translationHistory: limitedHistory }, function() {
      if (chrome.runtime.lastError) {
        // Error saving history to storage
      }
      if (callback) callback(limitedHistory);
    });
  }

  // Helper function to reload history from storage
  function reloadHistory(callback) {
    chrome.storage.local.get(['translationHistory'], function(result) {
      allHistory = result.translationHistory || [];
      if (callback) callback();
    });
  }

  function exportHistory() {
    if (allHistory.length === 0) {
      alert('No history to export!');
      return;
    }

    // Create JSON export with metadata
    const exportData = {
      metadata: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalItems: allHistory.length,
        source: 'Simple Text Translator'
      },
      translations: allHistory.map(item => ({
        id: item.id,
        sourceText: decodeHtmlEntities(item.sourceText),
        translatedText: decodeHtmlEntities(item.translatedText),
        sourceLang: item.sourceLang,
        sourceLangName: getLanguageName(item.sourceLang),
        targetLang: item.targetLang,
        targetLangName: getLanguageName(item.targetLang),
        timestamp: item.timestamp,
        isFavorite: item.isFavorite || false,
        confidence: item.confidence || null
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_history_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importHistory() {
    importFileInput.click();
  }

  function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);

        // Validate the imported data structure
        if (!validateImportData(importedData)) {
          alert('Invalid file format. Please select a valid translation history JSON file.');
          return;
        }

        // Confirm import action
        const confirmMessage = `Import ${importedData.translations.length} translations?\n\nThis will merge with your existing history. Duplicates will be skipped.`;
        if (!confirm(confirmMessage)) {
          return;
        }

        // Process imported translations
        processImportedData(importedData);

      } catch (error) {
        // Import error
        alert('Error reading file. Please check that it\'s a valid JSON file.');
      }
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  }

  function validateImportData(data) {
    // Check if data has the expected structure
    if (!data || typeof data !== 'object') return false;
    if (!data.translations || !Array.isArray(data.translations)) return false;

    // Validate each translation item
    for (const item of data.translations) {
      if (!item.sourceText || !item.translatedText || !item.sourceLang || !item.targetLang) {
        return false;
      }
    }

    return true;
  }

  function processImportedData(importedData) {
    const importedTranslations = importedData.translations;
    let mergedCount = 0;
    let skippedCount = 0;

    // Get current history
    chrome.storage.local.get(['translationHistory'], function(result) {
      let currentHistory = result.translationHistory || [];

      // Process each imported translation
      importedTranslations.forEach(importedItem => {
        // Check if this translation already exists
        const exists = currentHistory.some(existingItem =>
          existingItem.sourceText === importedItem.sourceText &&
          existingItem.translatedText === importedItem.translatedText &&
          existingItem.sourceLang === importedItem.sourceLang &&
          existingItem.targetLang === importedItem.targetLang
        );

        if (!exists) {
          // Generate new ID if not provided or if ID already exists
          const newItem = {
            id: importedItem.id && !currentHistory.find(h => h.id === importedItem.id)
              ? importedItem.id
              : Date.now().toString() + Math.random().toString(36).substr(2, 9),
            sourceText: importedItem.sourceText,
            translatedText: importedItem.translatedText,
            sourceLang: importedItem.sourceLang,
            targetLang: importedItem.targetLang,
            timestamp: importedItem.timestamp || Date.now(),
            isFavorite: importedItem.isFavorite || false,
            confidence: importedItem.confidence || null
          };

          currentHistory.push(newItem);
          mergedCount++;
        } else {
          skippedCount++;
        }
      });

      // Save merged history
      saveHistory(currentHistory, function(limitedHistory) {
        if (chrome.runtime.lastError) {
          alert('Error saving imported data: ' + chrome.runtime.lastError.message);
        } else {
          // Refresh the display
          allHistory = limitedHistory;
          populateLanguageFilter();
          updateStatistics();
          applyFilters();

          // Show import summary
          alert(`Import completed!\n\nImported: ${mergedCount} translations\nSkipped (duplicates): ${skippedCount} translations`);
        }
      });
    });
  }

  // Utility functions
  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    if (diff < 2592000000) return `${Math.floor(diff / 604800000)}w ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function decodeHtmlEntities(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  }

  function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
});

// Helper function to get human-readable language name from code
function getLanguageName(code) {
  // Use the centralized language mapping
  if (typeof window.LanguageMap !== 'undefined') {
    return window.LanguageMap.getLanguageName(code);
  }

  // Simple fallback for essential languages only
  const languageMap = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-CN': 'Chinese (Simplified)',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish',
    'cs': 'Czech'
  };

  return languageMap[code] || code;
}

// Helper function to get language code from human-readable name
function getLanguageCode(name) {
  // Use the centralized language mapping
  if (typeof window.LanguageMap !== 'undefined') {
    return window.LanguageMap.getLanguageCode(name);
  }

  // Simple fallback for essential languages only
  const languageMap = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-CN': 'Chinese (Simplified)',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish',
    'cs': 'Czech'
  };

  // Find the code that corresponds to the name
  const code = Object.keys(languageMap).find(key => languageMap[key] === name);
  return code || name;
}
