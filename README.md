# Simple Text Translator

![Extension Icon](images/icon128.png)

A simple yet powerful Chrome Extension that allows you to translate selected text on any webpage.

## Features

*   **On-the-fly Translation:** Select any text on a webpage to see its translation in a subtle tooltip.
*   **Context Menu Translation:** Right-click on any element to translate its text content.
*   **Customizable Language List:** Choose your favorite languages to display in the popup for quick access.
*   **Language Selection:** Choose your preferred source and target languages from your customized list.
*   **Language Swap:** Easily swap between source and target languages with a dedicated button in both popup and tooltip.
*   **Persistent Language Preferences:** Language preferences are saved and synchronized across devices.
*   **Copy to Clipboard:** A "Copy" button is available in the translation tooltip to copy the translated text.
*   **Enable/Disable:** Quickly enable or disable the translation functionality from the popup.
*   **Automatic Saving:** Your language preferences and settings are saved automatically.
*   **Translation History:** View and manage your translation history with search and filter capabilities.
*   **Debounced Translation:** Prevents excessive API calls by debouncing translation requests.
*   **MyMemory API:** Utilizes the MyMemory API for reliable translation.
*   **Long Text Support:** Automatically splits and translates long text selections.

## Screenshots

<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702471/stt-popup-1_iehchv.png" alt="Popup interface showing translation options">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702470/stt-popup-2_tv8nap.png" alt="Popup interface with history tab">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702471/stt-translate-1_me3puv.png" alt="Tooltip translation on webpage">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702471/stt-translate-2_sb07u4.png" alt="Tooltip with language selection">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702470/stt-options-page_nslgj8.png" alt="Options page for language customization">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702470/stt-history-details-1_y0fiws.png" alt="History page with translation entries">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702470/stt-history-details-2_ocimkq.png" alt="History page with favorite translations">
<img src="https://res.cloudinary.com/dd1qlozhf/image/upload/v1758702470/stt-history-page_rxlolu.png" alt="History page with search functionality">

## Installation

### For Regular Users (Chrome Web Store)
1. Visit the Chrome Web Store
2. Search for "Simple Text Translator"
3. Click "Add to Chrome"

### For Developers (Local Installation)
1.  **Download the repository:** Clone or download this repository to your local machine.
2.  **Open Chrome Extensions page:** Navigate to `chrome://extensions` in your Chrome browser.
3.  **Enable Developer mode:** Toggle on the "Developer mode" switch in the top right corner.
4.  **Load unpacked:** Click on the "Load unpacked" button.
5.  **Select the extension directory:** Browse to the directory where you downloaded/cloned this repository and select it.
6.  **Pin the extension (optional):** Click the puzzle piece icon in your Chrome toolbar, find "Simple Text Translator," and click the pin icon to make it easily accessible.

## Compatibility
This extension requires Google Chrome version 88 or higher.

## Usage

### Text Selection Translation

1.  **Select Text:** On any webpage, simply select the text you wish to translate.
2.  **View Translation:** A small tooltip will appear near the selected text showing the translation.
3.  **Change Languages:** Use the dropdowns in the tooltip to change source and target languages.
4.  **Swap Languages:** Click the swap arrow button in the tooltip to quickly switch source and target languages.
5.  **Copy Translation:** Click the "Copy" button in the tooltip to copy the translated text to your clipboard.

### Context Menu Translation

1.  **Right-click Element:** Right-click on any element containing text (buttons, links, paragraphs, etc.).
2.  **Select "Translate this element":** Choose the context menu option to translate the element's text.
3.  **View Translation:** A tooltip will appear below the element showing the translation.

### Translation History

1.  **Access History:** Click the history icon in the popup or open the dedicated history page.
2.  **Search and Filter:** Use the search bar and filters to find specific translations.
3.  **Manage Translations:** Mark translations as favorites, copy text, or delete entries.

## Configuration

You can configure the extension from the popup and the options page.

### Popup Configuration

1.  **Click the Extension Icon:** Click on the "Simple Text Translator" icon in your Chrome toolbar.
2.  **Enable/Disable:** Use the toggle switch to enable or disable the translator.
3.  **Set Languages:**
    *   **Translate From:** Select the source language.
    *   **Translate To:** Select the target language for the translation.
4.  **Swap Languages:** Use the swap button (&#8644;) between the language dropdowns to quickly switch your "from" and "to" language selections.

Your preferences will be saved automatically as you make changes.

### Options Page

The options page allows you to customize the list of languages that appear in the popup's dropdown menus.

1.  **Open Options Page:** Click the settings icon in the popup, or right-click the extension icon and select "Options".
2.  **Search and Select:** Use the search bar to find languages, and check the boxes next to the languages you want to include in the popup.
3.  **Save:** Click the "Save" button to save your customized language list.

## Troubleshooting

* **Translations not appearing**: Ensure the extension is enabled in the popup
* **API errors**: Check your internet connection; the MyMemory API might be temporarily unavailable
* **Languages not saving**: Try refreshing the page after changing language preferences

## Privacy
This extension does not collect or store any personal data. Translations are performed using the MyMemory API, and no text is stored on our servers. All settings and history are stored locally in your browser.

## Translation API

This extension uses the [MyMemory API](https://mymemory.translated.net/) for translations. It's a free, public API. Please be mindful of their usage policies.

## Contributing

Contributions are welcome! Here's how you can help:

1. **Bug Reports**: Open an issue with a detailed description and steps to reproduce
2. **Feature Requests**: Open an issue describing the feature and use case
3. **Code Contributions**:
   * Fork the repository
   * Create a feature branch (`git checkout -b feature/AmazingFeature`)
   * Commit your changes (`git commit -m 'Add some AmazingFeature'`)
   * Push to the branch (`git push origin feature/AmazingFeature`)
   * Open a pull request

Please ensure your code follows the existing style and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.