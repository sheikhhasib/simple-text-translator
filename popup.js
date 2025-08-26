document.addEventListener('DOMContentLoaded', function() {
  const fromLangSelect      = document.getElementById('from-lang-select');
  const toLangSelect        = document.getElementById('to-lang-select');
  const messageArea         = document.getElementById('message-area');      // Get message area
  const swapLanguagesButton = document.getElementById('swap-languages');    // Get swap button
  const toggleTranslate     = document.getElementById('toggle-translate');  // Get toggle button

  // Simplified list of languages for demonstration.
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'bn', name: 'Bangla' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'hi', name: 'Hindi' }
  ];

  function populateLanguages(selectElement) {
    languages.forEach(lang => {
      const option = document.createElement('option');

      option.value       = lang.code;
      option.textContent = lang.name;

      selectElement.appendChild(option);
    });
  }

  populateLanguages(fromLangSelect);
  populateLanguages(toLangSelect);

  // Function to save preferences
  function savePreferences() {
    const fromLanguage = fromLangSelect.value;
    const toLanguage   = toLangSelect.value;
    const isEnabled    = toggleTranslate.checked; // Get toggle state

    // Clear previous messages
    messageArea.textContent = '';

    // Validation: Prevent saving if fromLanguage and toLanguage are the same and not 'auto'
    if (fromLanguage !== 'auto' && fromLanguage === toLanguage) {
      messageArea.textContent = 'Please select two distinct languages.';
      return; // Stop the function
    }

    chrome.storage.sync.set({
      fromLanguage: fromLanguage,
      toLanguage: toLanguage,
      isEnabled: isEnabled // Save toggle state
    }, function() {
      // No visual cue needed as saving is automatic
    });
  }

  // Load saved options
  chrome.storage.sync.get(['fromLanguage', 'toLanguage', 'isEnabled'], function(items) {
    fromLangSelect.value = items.fromLanguage || 'en';  // Default to English
    toLangSelect.value   = items.toLanguage || 'bn';    // Default to Bangla
    toggleTranslate.checked = (typeof items.isEnabled === 'boolean') ? items.isEnabled : true; // Default to enabled
  });

  // Event listener for language swap button
  swapLanguagesButton.addEventListener('click', function() {
    const currentFrom = fromLangSelect.value;
    const currentTo   = toLangSelect.value;

    // Swap values
    fromLangSelect.value = currentTo;
    toLangSelect.value   = currentFrom;

    savePreferences(); // Save preferences after swap
  });

  // Save preferences on dropdown change
  fromLangSelect.addEventListener('change', savePreferences);
  toLangSelect.addEventListener('change', savePreferences);

  // Save preferences on toggle change
  toggleTranslate.addEventListener('change', savePreferences);
});