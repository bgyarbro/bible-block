// Options page script for Bible Block
// Handles saving and loading user preferences

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'classic',
  detection: 'balanced',
  whitelist: [
    'chatgpt.com',
    'github.com',
    'github.io',
    'stackoverflow.com',
    'stackexchange.com',
    'reddit.com',
    'youtube.com',
    'gmail.com',
    'google.com',
    'localhost',
    '127.0.0.1'
  ],
  replaceIframes: true,
  autoBackground: true,
  debugMode: false
};

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    if (result.settings) {
      return { ...DEFAULT_SETTINGS, ...result.settings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to storage
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set({ settings });
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Populate form with current settings
async function populateForm() {
  const settings = await loadSettings();

  // Set theme
  const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
  if (themeRadio) {
    themeRadio.checked = true;
  }

  // Set detection level
  const detectionRadio = document.querySelector(`input[name="detection"][value="${settings.detection}"]`);
  if (detectionRadio) {
    detectionRadio.checked = true;
  }

  // Set whitelist
  const whitelistTextarea = document.getElementById('whitelist');
  if (whitelistTextarea) {
    whitelistTextarea.value = settings.whitelist.join('\n');
  }

  // Set checkboxes
  document.getElementById('replaceIframes').checked = settings.replaceIframes;
  document.getElementById('autoBackground').checked = settings.autoBackground;
  document.getElementById('debugMode').checked = settings.debugMode;
}

// Get current form values
function getFormValues() {
  // Get selected theme
  const themeRadio = document.querySelector('input[name="theme"]:checked');
  const theme = themeRadio ? themeRadio.value : 'classic';

  // Get detection level
  const detectionRadio = document.querySelector('input[name="detection"]:checked');
  const detection = detectionRadio ? detectionRadio.value : 'balanced';

  // Get whitelist
  const whitelistTextarea = document.getElementById('whitelist');
  const whitelistText = whitelistTextarea.value.trim();
  const whitelist = whitelistText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Get checkboxes
  const replaceIframes = document.getElementById('replaceIframes').checked;
  const autoBackground = document.getElementById('autoBackground').checked;
  const debugMode = document.getElementById('debugMode').checked;

  return {
    theme,
    detection,
    whitelist,
    replaceIframes,
    autoBackground,
    debugMode
  };
}

// Show save status message
function showStatus(message, isSuccess = true) {
  const statusDiv = document.getElementById('saveStatus');
  statusDiv.textContent = message;
  statusDiv.className = `save-status ${isSuccess ? 'success' : 'error'}`;

  // Clear after 3 seconds
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'save-status';
  }, 3000);
}

// Handle save button click
async function handleSave() {
  const settings = getFormValues();
  const success = await saveSettings(settings);

  if (success) {
    showStatus('✓ Settings saved successfully!', true);

    // Notify all content scripts to reload settings
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: 'reloadSettings' }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }
    } catch (error) {
      // Ignore if we can't notify tabs
    }
  } else {
    showStatus('✗ Error saving settings', false);
  }
}

// Handle reset button click
async function handleReset() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    const success = await saveSettings(DEFAULT_SETTINGS);

    if (success) {
      await populateForm();
      showStatus('✓ Settings reset to defaults!', true);

      // Notify all content scripts to reload settings
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, { action: 'reloadSettings' }).catch(() => {
            // Ignore errors
          });
        }
      } catch (error) {
        // Ignore if we can't notify tabs
      }
    } else {
      showStatus('✗ Error resetting settings', false);
    }
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Populate form with current settings
  await populateForm();

  // Add event listeners
  document.getElementById('saveBtn').addEventListener('click', handleSave);
  document.getElementById('resetBtn').addEventListener('click', handleReset);

  // Add keyboard shortcut (Ctrl/Cmd + S to save)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  });
});
