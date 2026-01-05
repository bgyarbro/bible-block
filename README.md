# Bible Block - Chrome Extension

A Chrome extension that replaces advertisements with Bible verses.

## Features

- Automatically detects and replaces ads with Bible verses
- Loads the complete King James Version (KJV) Bible from [openbible.com](https://openbible.com/textfiles/kjv.txt)
- Randomly selects from all 31,173 verses in the KJV
- Works on all websites
- Catches dynamically loaded ads using MutationObserver

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `bible-block` directory
5. The extension is now installed and active!

## Icon Files (Optional)

The manifest references icon files (`icon16.png`, `icon48.png`, `icon128.png`). If you want to add icons:

1. Create PNG images with the specified dimensions
2. Place them in the extension directory
3. Or remove the `icons` section from `manifest.json` if you don't need icons

## How It Works

The extension uses a content script that:
- Scans the page for common ad containers and patterns
- Replaces detected ads with randomly selected Bible verses
- Monitors the page for dynamically loaded ads
- Displays verses in a clean, readable format

## Bible Verses

The extension fetches and loads the complete King James Version Bible text file from [openbible.com](https://openbible.com/textfiles/kjv.txt), which contains all 31,173 verses. Each time an ad is detected, a random verse is selected from the entire KJV Bible.

If the fetch fails for any reason, the extension falls back to a few hardcoded verses to ensure it continues working.

## Development

To modify the extension:
- Edit `content.js` to change the ad detection logic or modify verse loading
- Edit `manifest.json` to change extension settings
- Reload the extension in `chrome://extensions/` after making changes

The extension requires internet access to fetch the KJV text file on first load. The verses are loaded asynchronously when the content script runs.

## Refreshing the Extension After Code Changes

After making any changes to the extension code, follow these steps to refresh it:

### Step-by-Step Instructions:

1. **Open Chrome Extensions Page**:
   - Type `chrome://extensions/` in your address bar and press Enter
   - **OR** click the three dots menu (☰) in the top right → "Extensions" → "Manage extensions"
   - Make sure "Developer mode" is enabled (toggle in the top right corner)

2. **Reload the Extension**:
   - Scroll down to find "Bible Block" in your extensions list
   - Look for the **circular arrow/reload button** (🔄) on the right side of the "Bible Block" card
   - Click the reload button - you should see a brief animation indicating it's reloading
   - The extension will now have your latest code changes

3. **Refresh Your Web Pages**:
   - Go back to any website where you want to test the extension
   - Press `F5` or `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to refresh the page
   - This is important because content scripts only run when pages load

### Quick Visual Guide:
```
chrome://extensions/ → Find "Bible Block" → Click 🔄 → Refresh your test page
```

### Troubleshooting:

- **If the reload button doesn't appear**: Make sure "Developer mode" is enabled
- **If changes don't show up**: 
  1. Make sure you saved your code files
  2. Reload the extension again
  3. Hard refresh the web page (`Ctrl+Shift+R` or `Cmd+Shift+R`)
  4. Check the browser console (F12) for any errors

- **If you modified `manifest.json`**: You may need to remove the extension and re-add it:
  1. Click "Remove" on the extension card
  2. Click "Load unpacked" again
  3. Select your `bible-block` folder

### Checking if It's Working:

1. Open the browser console (press `F12`)
2. Go to the "Console" tab
3. You should see messages like:
   - "Fetching KJV Bible from openbible.com..."
   - "✅ Successfully loaded X Bible verses from KJV"
4. When an ad is replaced, you'll see: "Selected random verse X/31173: [Reference]"

## License

MIT

