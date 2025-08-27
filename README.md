# Simple Text Translator

![Extension Icon](images/icon128.png)

A simple yet powerful Chrome Extension that allows you to translate selected text on any webpage.

## Features

*   **On-the-fly Translation:** Select any text on a webpage to see its translation in a subtle tooltip.
*   **Customizable Language List:** Choose your favorite languages to display in the popup for quick access.
*   **Language Selection:** Choose your preferred source and target languages from your customized list.
*   **Language Swap:** Easily swap between source and target languages with a dedicated button.
*   **Copy to Clipboard:** A "Copy" button is available in the translation tooltip to copy the translated text.
*   **Enable/Disable:** Quickly enable or disable the translation functionality from the popup.
*   **Automatic Saving:** Your language preferences and settings are saved automatically.
*   **Debounced Translation:** Prevents excessive API calls by debouncing translation requests.
*   **MyMemory API:** Utilizes the MyMemory API for reliable translation.

## Screenshots

*(Add screenshots of the popup, the tooltip in action, and the options page here)*

## Installation

To install this extension in Google Chrome:

1.  **Download the repository:** Clone or download this repository to your local machine.
2.  **Open Chrome Extensions page:** Navigate to `chrome://extensions` in your Chrome browser.
3.  **Enable Developer mode:** Toggle on the "Developer mode" switch in the top right corner.
4.  **Load unpacked:** Click on the "Load unpacked" button.
5.  **Select the extension directory:** Browse to the directory where you downloaded/cloned this repository and select it.
6.  **Pin the extension (optional):** Click the puzzle piece icon in your Chrome toolbar, find "Simple Text Translator," and click the pin icon to make it easily accessible.

## Usage

1.  **Select Text:** On any webpage, simply select the text you wish to translate.
2.  **View Translation:** A small tooltip will appear near the selected text showing the translation.
3.  **Copy Translation:** Click the "Copy" button in the tooltip to copy the translated text to your clipboard.

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

## Translation API

This extension uses the [MyMemory API](https://mymemory.translated.net/) for translations. It's a free, public API. Please be mindful of their usage policies.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the GitHub repository. If you'd like to contribute code, please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.