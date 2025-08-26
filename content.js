let tooltip;

document.addEventListener('mouseup', function(e) {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length > 0) {
    showTooltip(e.clientX, e.clientY, "Translating...");
    translateText(selectedText)
      .then(translation => {
        showTooltip(e.clientX, e.clientY, translation);
      })
      .catch(error => {
        console.error("Translation error:", error);
        showTooltip(e.clientX, e.clientY, "Translation failed");
      });
  }
});

document.addEventListener('mousedown', function() {
  if (tooltip) {
    tooltip.style.display = 'none';
  }
});

function showTooltip(x, y, text) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'translation-tooltip';
    document.body.appendChild(tooltip);
  }
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 20 + 'px';
  tooltip.style.display = 'block';
  tooltip.textContent = text;
}

async function translateText(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|bn`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.responseData) {
      return data.responseData.translatedText;
    } else {
      return "No translation found.";
    }
  } catch (error) {
    console.error("API call failed:", error);
    return "Translation service error.";
  }
}