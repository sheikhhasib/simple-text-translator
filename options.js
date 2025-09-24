document.addEventListener('DOMContentLoaded', function () {
  const languageListContainer = document.getElementById('language-list');
  const searchInput = document.getElementById('search-input');
  const saveButton = document.getElementById('save-button');
  const messageArea = document.getElementById('message-area');

  // Use the centralized language mapping
  const allLanguages = (typeof window.LanguageMap !== 'undefined')
    ? window.LanguageMap.ALL_LANGUAGES
    : [];

  let selectedLanguages = [];

  function renderLanguages(filter = '') {
    if (!languageListContainer) {
      console.error('Language list container not found');
      return;
    }

    try {
      languageListContainer.innerHTML = '';
      const lowerCaseFilter = filter.toLowerCase();

      const sortedLanguages = [...allLanguages].sort((a, b) => {
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
      console.error('Error rendering languages:', error);
      if (messageArea) {
        messageArea.textContent = 'Error displaying language options.';
        messageArea.style.color = 'red';
      }
    }
  }

  function saveSelectedLanguages() {
    try {
      // selectedLanguages is already updated via checkbox event listeners

      chrome.storage.sync.set({ 'selectedLanguages': selectedLanguages }, function () {
        if (chrome.runtime.lastError) {
          console.error('Error saving languages:', chrome.runtime.lastError);
          if (messageArea) {
            messageArea.textContent = 'Error saving languages. Please try again.';
            messageArea.style.color = 'red';
          }
        } else {
          if (messageArea) {
            messageArea.textContent = 'Languages saved!';
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
      console.error('Error in saveSelectedLanguages:', error);
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

  chrome.storage.sync.get('selectedLanguages', function (data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading saved languages:', chrome.runtime.lastError);
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

    try {
      renderLanguages();
    } catch (error) {
      console.error('Error rendering languages:', error);
      if (messageArea) {
        messageArea.textContent = 'Error loading language options.';
        messageArea.style.color = 'red';
      }
    }
  });
});