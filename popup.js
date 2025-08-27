document.addEventListener('DOMContentLoaded', function () {
  const fromLangSelect = document.getElementById('from-lang-select');
  const toLangSelect = document.getElementById('to-lang-select');
  const messageArea = document.getElementById('message-area'); // Get message area
  const swapLanguagesButton = document.getElementById('swap-languages'); // Get swap button
  const toggleTranslate = document.getElementById('toggle-translate'); // Get toggle button
  const settingsIcon = document.getElementById('settings-icon');

  settingsIcon.addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
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

  // Save preferences on toggle change
  toggleTranslate.addEventListener('change', savePreferences);
});