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
    const confidence = item.confidence ? Math.round(item.confidence * 100) : null;

    return `
      <div class="history-card ${item.isFavorite ? 'favorite' : ''}" data-id="${item.id}">
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
          <div class="translation-arrow">↓</div>
          <div class="translated-text">${escapeHtml(item.translatedText)}</div>
        </div>

        <div class="card-footer">
          <span class="timestamp">${timeAgo}</span>
          ${confidence ? `<span class="confidence">${confidence}% confidence</span>` : ''}
        </div>
      </div>
    `;
  }

  function setupCardEventListeners() {
    historyList.addEventListener('click', function(e) {
      if (!e.target.classList.contains('card-btn')) return;

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

    const exportData = allHistory.map(item => {
      const date = new Date(item.timestamp).toLocaleString();
      const favorite = item.isFavorite ? ' [Favorite]' : '';
      const confidence = item.confidence ? ` (${Math.round(item.confidence * 100)}% confidence)` : '';

      // Decode any HTML entities in the text
      const sourceText = decodeHtmlEntities(item.sourceText);
      const translatedText = decodeHtmlEntities(item.translatedText);

      return `${sourceText} (${item.sourceLang}) -> ${translatedText} (${item.targetLang})${favorite}${confidence} - ${date}`;
    }).join('\n');

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_history_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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