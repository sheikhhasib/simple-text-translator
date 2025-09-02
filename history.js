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

  function populateLanguageFilter() {
    const languagePairs = new Set();
    allHistory.forEach(item => {
      languagePairs.add(`${item.sourceLang} → ${item.targetLang}`);
    });

    languageFilter.innerHTML = '<option value="">All Languages</option>';
    Array.from(languagePairs).sort().forEach(pair => {
      const option = document.createElement('option');
      option.value = pair;
      option.textContent = pair;
      languageFilter.appendChild(option);
    });
  }

  function updateStatistics() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: allHistory.length,
      favorites: allHistory.filter(item => item.isFavorite).length,
      languagePairs: new Set(allHistory.map(item => `${item.sourceLang}-${item.targetLang}`)).size,
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
      // Search filter
      const matchesSearch = !searchTerm ||
        item.sourceText.toLowerCase().includes(searchTerm) ||
        item.translatedText.toLowerCase().includes(searchTerm) ||
        item.sourceLang.toLowerCase().includes(searchTerm) ||
        item.targetLang.toLowerCase().includes(searchTerm);

      // Language filter
      const matchesLanguage = !selectedLanguage ||
        `${item.sourceLang} → ${item.targetLang}` === selectedLanguage;

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
          const aPair = `${a.sourceLang}-${a.targetLang}`;
          const bPair = `${b.sourceLang}-${b.targetLang}`;
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

    return `
      <div class="history-card ${item.isFavorite ? 'favorite' : ''}" data-id="${item.id}" data-clickable="true">
        <div class="card-header">
          <div class="language-pair">${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()}</div>
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
        </div>

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

      // Save to storage
      chrome.storage.local.set({ translationHistory: allHistory }, function() {
        updateStatistics();
        // Re-apply filters if showing favorites only
        if (favoritesFilter.value === 'favorites') {
          applyFilters();
        }
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
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    });
  }



  function deleteItem(itemId) {
    if (confirm('Are you sure you want to delete this translation?')) {
      allHistory = allHistory.filter(h => h.id !== itemId);
      chrome.storage.local.set({ translationHistory: allHistory }, function() {
        updateStatistics();
        applyFilters();
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

    // Update favorite button
    const favoriteBtn = document.getElementById('detail-favorite');
    favoriteBtn.textContent = item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteBtn.className = `action-btn favorite-btn ${item.isFavorite ? 'active' : ''}`;

    // Add event listeners
    setupModalEventListeners(modal);
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
        fromOption.textContent = lang.name;
        fromOption.selected = lang.code === item.sourceLang;
        fromSelect.appendChild(fromOption);

        const toOption = document.createElement('option');
        toOption.value = lang.code;
        toOption.textContent = lang.name;
        toOption.selected = lang.code === item.targetLang;
        toSelect.appendChild(toOption);
      });
    });
  }

  function setupModalEventListeners(modal) {
    // Remove existing listeners to avoid duplicates
    const fromSelect = document.getElementById('from-lang-detail');
    const toSelect = document.getElementById('to-lang-detail');
    const swapBtn = document.getElementById('swap-languages-detail');
    const copyBtn = document.getElementById('detail-copy');
    const favoriteBtn = document.getElementById('detail-favorite');

    // Clone elements to remove all event listeners
    const newFromSelect = fromSelect.cloneNode(true);
    const newToSelect = toSelect.cloneNode(true);
    const newSwapBtn = swapBtn.cloneNode(true);
    const newCopyBtn = copyBtn.cloneNode(true);
    const newFavoriteBtn = favoriteBtn.cloneNode(true);

    fromSelect.parentNode.replaceChild(newFromSelect, fromSelect);
    toSelect.parentNode.replaceChild(newToSelect, toSelect);
    swapBtn.parentNode.replaceChild(newSwapBtn, swapBtn);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);

    // Add new event listeners
    newFromSelect.addEventListener('change', () => handleLanguageChange(modal));
    newToSelect.addEventListener('change', () => handleLanguageChange(modal));

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

  function handleLanguageChange(modal) {
    const item = modal.currentItem;
    const fromLang = document.getElementById('from-lang-detail').value;
    const toLang = document.getElementById('to-lang-detail').value;

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

    // Call MyMemory API
    const sourceText = item.sourceText;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=${fromLang}|${toLang}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data && data.responseData && data.responseData.translatedText) {
          const newTranslation = data.responseData.translatedText;

          // Update display
          targetEl.textContent = newTranslation;

          // Update item data
          item.sourceLang = fromLang;
          item.targetLang = toLang;
          item.translatedText = newTranslation;
          item.confidence = data.responseData.match || null;

          // Update confidence display
          if (item.confidence) {
            document.getElementById('confidence-info').style.display = 'block';
            document.getElementById('detail-confidence').textContent = `${Math.round(item.confidence * 100)}%`;
          } else {
            document.getElementById('confidence-info').style.display = 'none';
          }

          // Save updated item to storage
          chrome.storage.local.set({ translationHistory: allHistory }, function() {
            applyFilters(); // Refresh the main view
          });
        } else {
          targetEl.textContent = 'Translation failed';
        }
      })
      .catch(error => {
        console.error('Translation error:', error);
        targetEl.textContent = 'Translation failed';
      })
      .finally(() => {
        loadingEl.style.display = 'none';
        targetEl.style.opacity = '1';
      });
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
        targetLang: item.targetLang,
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
        console.error('Import error:', error);
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
      chrome.storage.local.set({ translationHistory: currentHistory }, function() {
        if (chrome.runtime.lastError) {
          alert('Error saving imported data: ' + chrome.runtime.lastError.message);
        } else {
          // Refresh the display
          allHistory = currentHistory;
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