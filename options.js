document.addEventListener('DOMContentLoaded', function () {
  const languageListContainer = document.getElementById('language-list');
  const searchInput = document.getElementById('search-input');
  const saveButton = document.getElementById('save-button');
  const messageArea = document.getElementById('message-area');

  const allLanguages = [
      { language: 'Afrikaans', code: 'af' },
      { language: 'Albanian', code: 'sq' },
      { language: 'Amharic', code: 'am' },
      { language: 'Arabic', code: 'ar' },
      { language: 'Armenian', code: 'hy' },
      { language: 'Azerbaijani', code: 'az' },
      { language: 'Bajan', code: 'bjs' },
      { language: 'Balkan Gipsy', code: 'rm' },
      { language: 'Basque', code: 'eu' },
      { language: 'Bemba', code: 'bem' },
      { language: 'Bengali', code: 'bn' },
      { language: 'Bielarus', code: 'be' },
      { language: 'Bislama', code: 'bi' },
      { language: 'Bosnian', code: 'bs' },
      { language: 'Breton', code: 'br' },
      { language: 'Bulgarian', code: 'bg' },
      { language: 'Burmese', code: 'my' },
      { language: 'Catalan', code: 'ca' },
      { language: 'Cebuano', code: 'ceb' },
      { language: 'Chamorro', code: 'ch' },
      { language: 'Chinese (Simplified)', code: 'zh-CN' },
      { language: 'Chinese Traditional', code: 'zh-TW' },
      { language: 'Comorian (Ngazidja)', code: 'zdj' },
      { language: 'Coptic', code: 'cop' },
      { language: 'Creole English (Antigua and Barbuda)', code: 'aig' },
      { language: 'Creole English (Bahamas)', code: 'bah' },
      { language: 'Creole English (Grenadian)', code: 'gcl' },
      { language: 'Creole English (Guyanese)', code: 'gyn' },
      { language: 'Creole English (Jamaican)', code: 'jam' },
      { language: 'Creole English (Vincentian)', code: 'svc' },
      { language: 'Creole English (Virgin Islands)', code: 'vic' },
      { language: 'Creole French (Haitian)', code: 'ht' },
      { language: 'Creole French (Saint Lucian)', code: 'acf' },
      { language: 'Creole French (Seselwa)', code: 'crs' },
      { language: 'Creole Portuguese (Upper Guinea)', code: 'pov' },
      { language: 'Croatian', code: 'hr' },
      { language: 'Czech', code: 'cs' },
      { language: 'Danish', code: 'da' },
      { language: 'Dutch', code: 'nl' },
      { language: 'Dzongkha', code: 'dz' },
      { language: 'English', code: 'en' },
      { language: 'Esperanto', code: 'eo' },
      { language: 'Estonian', code: 'et' },
      { language: 'Fanagalo', code: 'fn' },
      { language: 'Faroese', code: 'fo' },
      { language: 'Finnish', code: 'fi' },
      { language: 'French', code: 'fr' },
      { language: 'Galician', code: 'gl' },
      { language: 'Georgian', code: 'ka' },
      { language: 'German', code: 'de' },
      { language: 'Greek', code: 'el' },
      { language: 'Greek (Classical)', code: 'grc' },
      { language: 'Gujarati', code: 'gu' },
      { language: 'Hausa', code: 'ha' },
      { language: 'Hawaiian', code: 'haw' },
      { language: 'Hebrew', code: 'he' },
      { language: 'Hindi', code: 'hi' },
      { language: 'Hungarian', code: 'hu' },
      { language: 'Icelandic', code: 'is' },
      { language: 'Indonesian', code: 'id' },
      { language: 'Inuktitut (Greenlandic)', code: 'iu' },
      { language: 'Irish Gaelic', code: 'ga' },
      { language: 'Italian', code: 'it' },
      { language: 'Japanese', code: 'ja' },
      { language: 'Javanese', code: 'jv' },
      { language: 'Kabuverdianu', code: 'kea' },
      { language: 'Kabylian', code: 'kab' },
      { language: 'Kannada', code: 'kn' },
      { language: 'Kazakh', code: 'kk' },
      { language: 'Khmer', code: 'km' },
      { language: 'Kinyarwanda', code: 'rw' },
      { language: 'Kirundi', code: 'rn' },
      { language: 'Korean', code: 'ko' },
      { language: 'Kurdish', code: 'ku' },
      { language: 'Kurdish Sorani', code: 'ckb' },
      { language: 'Kyrgyz', code: 'ky' },
      { language: 'Lao', code: 'lo' },
      { language: 'Latin', code: 'la' },
      { language: 'Latvian', code: 'lv' },
      { language: 'Lithuanian', code: 'lt' },
      { language: 'Luxembourgish', code: 'lb' },
      { language: 'Macedonian', code: 'mk' },
      { language: 'Malagasy', code: 'mg' },
      { language: 'Malay', code: 'ms' },
      { language: 'Maldivian', code: 'dv' },
      { language: 'Maltese', code: 'mt' },
      { language: 'Manx Gaelic', code: 'gv' },
      { language: 'Maori', code: 'mi' },
      { language: 'Marshallese', code: 'mh' },
      { language: 'Mende', code: 'men' },
      { language: 'Mongolian', code: 'mn' },
      { language: 'Morisyen', code: 'mfe' },
      { language: 'Nepali', code: 'ne' },
      { language: 'Niuean', code: 'niu' },
      { language: 'Norwegian', code: 'no' },
      { language: 'Nyanja', code: 'ny' },
      { language: 'Pakistani', code: 'ur' },
      { language: 'Palauan', code: 'pau' },
      { language: 'Panjabi', code: 'pa' },
      { language: 'Papiamentu', code: 'pap' },
      { language: 'Pashto', code: 'ps' },
      { language: 'Persian', code: 'fa' },
      { language: 'Pijin', code: 'pis' },
      { language: 'Polish', code: 'pl' },
      { language: 'Portuguese', code: 'pt' },
      { language: 'Potawatomi', code: 'pot' },
      { language: 'Quechua', code: 'qu' },
      { language: 'Romanian', code: 'ro' },
      { language: 'Russian', code: 'ru' },
      { language: 'Samoan', code: 'sm' },
      { language: 'Sango', code: 'sg' },
      { language: 'Scots Gaelic', code: 'gd' },
      { language: 'Serbian', code: 'sr' },
      { language: 'Shona', code: 'sn' },
      { language: 'Sinhala', code: 'si' },
      { language: 'Slovak', code: 'sk' },
      { language: 'Slovenian', code: 'sl' },
      { language: 'Somali', code: 'so' },
      { language: 'Sotho, Southern', code: 'st' },
      { language: 'Spanish', code: 'es' },
      { language: 'Sranan Tongo', code: 'srn' },
      { language: 'Swahili', code: 'sw' },
      { language: 'Swedish', code: 'sv' },
      { language: 'Swiss German', code: 'gsw' },
      { language: 'Syriac (Aramaic)', code: 'syr' },
      { language: 'Tagalog', code: 'tl' },
      { language: 'Tajik', code: 'tg' },
      { language: 'Tamashek (Tuareg)', code: 'tmh' },
      { language: 'Tamil', code: 'ta' },
      { language: 'Telugu', code: 'te' },
      { language: 'Tetum', code: 'tet' },
      { language: 'Thai', code: 'th' },
      { language: 'Tibetan', code: 'bo' },
      { language: 'Tigrinya', code: 'ti' },
      { language: 'Tok Pisin', code: 'tpi' },
      { language: 'Tokelauan', code: 'tkl' },
      { language: 'Tongan', code: 'to' },
      { language: 'Tswana', code: 'tn' },
      { language: 'Turkish', code: 'tr' },
      { language: 'Turkmen', code: 'tk' },
      { language: 'Tuvaluan', code: 'tvl' },
      { language: 'Ukrainian', code: 'uk' },
      { language: 'Uma', code: 'ppk' },
      { language: 'Uzbek', code: 'uz' },
      { language: 'Vietnamese', code: 'vi' },
      { language: 'Wallisian', code: 'wls' },
      { language: 'Welsh', code: 'cy' },
      { language: 'Wolof', code: 'wo' },
      { language: 'Xhosa', code: 'xh' },
      { language: 'Yiddish', code: 'yi' },
      { language: 'Zulu', code: 'zu' },
  ];

  let selectedLanguages = [];

  function renderLanguages(filter = '') {
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
  }

  function saveSelectedLanguages() {
    const checkboxes = languageListContainer.querySelectorAll('input[type="checkbox"]:checked');
    selectedLanguages = Array.from(checkboxes).map(cb => ({
      code: cb.dataset.code,
      name: cb.dataset.name
    }));

    chrome.storage.sync.set({ 'selectedLanguages': selectedLanguages }, function () {
      messageArea.textContent = 'Languages saved!';
      setTimeout(() => {
        messageArea.textContent = '';
      }, 3000);
    });
  }

  searchInput.addEventListener('input', () => {
    renderLanguages(searchInput.value);
  });

  saveButton.addEventListener('click', saveSelectedLanguages);

  chrome.storage.sync.get('selectedLanguages', function (data) {
    const defaultLanguages = [
      { code: 'en', name: 'English' },
      { code: 'bn', name: 'Bangla' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'zh', name: 'Chinese' },
      { code: 'hi', name: 'Hindi' }
    ];

    if (data.selectedLanguages && data.selectedLanguages.length > 0) {
      selectedLanguages = data.selectedLanguages;
    } else {
      selectedLanguages = defaultLanguages;
    }
    renderLanguages();
  });
});