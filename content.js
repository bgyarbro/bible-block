// Request verses from background service worker (bypasses CORS)
// Version: 2.1 - Added settings and themes
let DEBUG_MODE = false;

// Settings loaded from storage
let currentSettings = {
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
      currentSettings = { ...currentSettings, ...result.settings };
      DEBUG_MODE = currentSettings.debugMode;

      if (DEBUG_MODE) {
        console.log('[Content] Settings loaded:', currentSettings);
      }
    }
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('[Content] Error loading settings:', error);
    }
  }
}

// Initialize settings on load
loadSettings();

// Listen for settings reload messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reloadSettings') {
    loadSettings().then(() => {
      if (DEBUG_MODE) {
        console.log('[Content] Settings reloaded');
      }
      // Re-scan with new settings
      scanAndReplaceAds();
    });
  }
});

// Check if current domain is whitelisted
function isWhitelisted() {
  const hostname = window.location.hostname.toLowerCase();
  return currentSettings.whitelist.some(domain => {
    return hostname === domain || hostname.endsWith('.' + domain);
  });
}

// Only run if not whitelisted
if (isWhitelisted()) {
  if (DEBUG_MODE) {
    console.log(`[Content] Domain ${window.location.hostname} is whitelisted, skipping ad replacement`);
  }
} else {
  // Run ad replacement logic
  let versesLoaded = false;

// Function to get a random Bible verse from background script
async function getRandomVerse() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getRandomVerse' });
    if (response) {
      if (DEBUG_MODE) {
        console.log(`[Content] Received verse: ${response.reference}`);
      }
      return response;
    }
    // Fallback if no response
    return {
      text: "Loading Bible verses...",
      reference: ""
    };
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('[Content] Error getting verse:', error);
    }
    return {
      text: "Error loading verse",
      reference: ""
    };
  }
}

// Initialize - check if verses are available (optimized: just try to get a verse)
async function initializeVerses() {
  try {
    // Instead of loading all verses, just try to get one to verify it works
    const testVerse = await getRandomVerse();
    if (testVerse && testVerse.reference) {
      versesLoaded = true;
      if (DEBUG_MODE) {
        console.log('[Content] ✅ Verses available');
      }
      // Now scan for ads
      scanAndReplaceAds();
    } else {
      if (DEBUG_MODE) {
        console.warn('[Content] No verses available yet, will retry...');
      }
      // Retry after a short delay
      setTimeout(initializeVerses, 2000);
    }
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('[Content] Error initializing verses:', error);
    }
    // Still try to scan, verses will be loaded on demand
    versesLoaded = true;
    scanAndReplaceAds();
  }
}

// Initialize when script starts
initializeVerses();

// Ad detection selectors - organized by detection level
const adSelectors = {
  // Conservative: Only obvious ads
  conservative: [
    // Google AdSense
    '[id*="google_ads"]',
    '[id*="adsbygoogle"]',
    '[class*="adsbygoogle"]',

    // Explicit ad containers
    '[class*="advertisement"]',
    '[id*="advertisement"]',
    '[class*="ad-container"]',
    '[id*="ad-container"]',

    // Common ad networks
    '[id*="doubleclick"]',
    '[class*="doubleclick"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="googleadservices"]',

    // Standard IAB ad sizes
    '[id*="300x250"]',
    '[id*="728x90"]',
    '[id*="160x600"]',
    '[id*="320x50"]',
    '[id*="970x250"]'
  ],

  // Balanced: Default recommended settings
  balanced: [
    // All conservative selectors
    '[id*="google_ads"]',
    '[id*="google-ad"]',
    '[class*="google-ad"]',
    '[id*="adsbygoogle"]',
    '[class*="adsbygoogle"]',

    // General ad patterns
    '[id*="ad-"]',
    '[id*="-ad"]',
    '[class*="ad-"]',
    '[class*="-ad"]',
    '[class*="advertisement"]',
    '[id*="advertisement"]',
    '[class*="ad-container"]',
    '[id*="ad-container"]',
    '[class*="ad-wrapper"]',
    '[id*="ad-wrapper"]',
    '[class*="ad-banner"]',
    '[id*="ad-banner"]',
    '[class*="ad_banner"]',
    '[id*="ad_banner"]',
    '[class*="sponsored"]',
    '[id*="sponsored"]',
    '[class*="sponsoredContent"]',
    '[id*="sponsoredContent"]',

    // Common ad networks
    '[id*="doubleclick"]',
    '[class*="doubleclick"]',
    '[id*="adtech"]',
    '[class*="adtech"]',
    '[id*="advertising"]',
    '[class*="advertising"]',
    '[id*="adsense"]',
    '[class*="adsense"]',

    // Social media promoted content
    '[data-ad]',
    '[data-ad-preview]',
    '[data-testid*="ad"]',
    '[class*="promotedTweet"]',
    '[class*="promoted-tweet"]',

    // IFRAME ads
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="googleadservices"]',
    'iframe[src*="advertising"]',
    'iframe[id*="google_ads"]',
    'iframe[class*="ad"]',
    'iframe[id*="ad-"]',

    // Common ad sizes
    '[id*="300x250"]',
    '[id*="728x90"]',
    '[id*="160x600"]',
    '[id*="320x50"]',
    '[id*="970x250"]',
    '[id*="300x600"]',
    '[id*="320x100"]'
  ],

  // Aggressive: Replace more potential ads
  aggressive: [
    // All balanced selectors plus more
    '[id*="google"]',
    '[class*="google-ad"]',
    '[id*="adsbygoogle"]',
    '[class*="adsbygoogle"]',

    // Very broad ad patterns
    '[id*="ad"]',
    '[class*="ad"]',
    '[id*="banner"]',
    '[class*="banner"]',
    '[class*="advertisement"]',
    '[id*="advertisement"]',
    '[class*="ad-"]',
    '[class*="_ad"]',
    '[class*="Ad"]',
    '[id*="Ad"]',
    '[class*="sponsored"]',
    '[id*="sponsored"]',
    '[class*="promo"]',
    '[id*="promo"]',
    '[data-ad]',
    '[data-ad-slot]',
    '[data-ad-unit]',
    '[data-google-query-id]',

    // Ad networks
    '[id*="doubleclick"]',
    '[class*="doubleclick"]',
    '[id*="adtech"]',
    '[class*="adtech"]',
    '[id*="advertising"]',
    '[class*="advertising"]',
    '[id*="adsense"]',
    '[class*="adsense"]',
    '[id*="taboola"]',
    '[class*="taboola"]',
    '[id*="outbrain"]',
    '[class*="outbrain"]',

    // Social media
    '[data-testid*="ad"]',
    '[data-testid*="promoted"]',
    '[class*="promotedTweet"]',
    '[class*="promoted-tweet"]',
    '[aria-label*="Sponsored"]',
    '[aria-label*="promoted"]',

    // IFRAMEs
    'iframe[src*="ad"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="advertising"]',
    'iframe[id*="ad"]',
    'iframe[class*="ad"]',

    // All standard ad sizes
    '[id*="x"]', // This catches dimension patterns
    '[class*="300x250"]',
    '[class*="728x90"]',
    '[class*="160x600"]',
    '[class*="320x50"]',
    '[class*="970x250"]',
    '[class*="300x600"]',
    '[class*="320x100"]',
    '[class*="468x60"]',
    '[class*="234x60"]',
    '[class*="120x600"]',
    '[class*="120x240"]'
  ]
};

// Set to track already replaced elements
const replacedElements = new WeakSet();

// Function to check if element is likely an ad
function isAdElement(element) {
  try {
    if (!element || typeof element !== 'object') {
      return false;
    }

    if (replacedElements.has(element)) {
      return false;
    }

    // Get appropriate selectors based on detection level
    const detectionLevel = currentSettings.detection || 'balanced';
    const selectorsToUse = adSelectors[detectionLevel] || adSelectors.balanced;

    // Check if element matches any ad selector
    for (const selector of selectorsToUse) {
      try {
        if (element.matches && typeof element.matches === 'function') {
          if (element.matches(selector)) {
            return true;
          }
        }
      } catch (e) {
        // Invalid selector or element, skip
        continue;
      }
    }

    // Check parent elements (with safety checks)
    try {
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 3) {
        for (const selector of selectorsToUse) {
          try {
            if (parent.matches && typeof parent.matches === 'function') {
              if (parent.matches(selector)) {
                return true;
              }
            }
          } catch (e) {
            // Invalid selector, skip
            continue;
          }
        }
        parent = parent.parentElement;
        depth++;
      }
    } catch (e) {
      // Error checking parents, just return false
      return false;
    }

    return false;
  } catch (e) {
    // Any unexpected error, return false
    return false;
  }
}

// Function to detect the main background color of the page
function getPageBackgroundColor() {
  try {
    // Try to get background color from body, html, or document element
    const elements = [document.body, document.documentElement];
    
    for (const el of elements) {
      if (!el) continue;
      
      try {
        const computedStyle = window.getComputedStyle(el);
        const bgColor = computedStyle.backgroundColor;
        
        // If we got a valid color (not transparent or empty)
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          return bgColor;
        }
      } catch (e) {
        // Skip this element if there's an error
        continue;
      }
    }
  } catch (e) {
    // Fall through to fallback
  }
  
  // Fallback to white if we can't detect
  return 'rgb(255, 255, 255)';
}

// Function to determine if a color is light or dark
function isLightColor(rgbString) {
  try {
    if (!rgbString || typeof rgbString !== 'string') return false;
    
    // Parse RGB string like "rgb(255, 255, 255)" or "rgba(255, 255, 255, 1)"
    const match = rgbString.match(/\d+/g);
    if (!match || match.length < 3) return false;
    
    const r = parseInt(match[0], 10);
    const g = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    
    // Validate RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    
    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5;
  } catch (e) {
    // Default to dark background on error
    return false;
  }
}

// Function to get appropriate text colors based on background
function getTextColors(isLightBg) {
  if (isLightBg) {
    return {
      verseText: '#1a1a1a',
      reference: '#4a5568',
      border: '#6b9fff'
    };
  } else {
    return {
      verseText: '#f0f0f0',
      reference: '#a0a0a0',
      border: '#6b9fff'
    };
  }
}

// Get theme styles based on selected theme
function getThemeStyles(theme, isLightBg, pageBgColor) {
  const themes = {
    classic: {
      container: `
        padding: 20px;
        margin: 10px 0;
        background-color: ${currentSettings.autoBackground ? (pageBgColor.startsWith('rgb(') ? pageBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.95)') : pageBgColor) : (isLightBg ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.95)')};
        border-left: 4px solid #6b9fff;
        font-family: Georgia, serif;
        font-size: 16px;
        line-height: 1.6;
        color: ${isLightBg ? '#1a1a1a' : '#f0f0f0'};
        text-align: left;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `,
      verseText: `
        margin: 0 0 10px 0;
        font-style: italic;
        color: ${isLightBg ? '#1a1a1a' : '#f0f0f0'};
      `,
      reference: `
        margin: 0;
        font-size: 14px;
        color: ${isLightBg ? '#4a5568' : '#a0a0a0'};
        font-weight: bold;
      `
    },
    modern: {
      container: `
        padding: 24px;
        margin: 12px 0;
        background: ${isLightBg ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' : 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'};
        border-left: 4px solid #ff6b9d;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 16px;
        line-height: 1.7;
        color: ${isLightBg ? '#2d3748' : '#e2e8f0'};
        text-align: left;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      `,
      verseText: `
        margin: 0 0 12px 0;
        font-style: italic;
        font-weight: 400;
        color: ${isLightBg ? '#2d3748' : '#e2e8f0'};
        letter-spacing: 0.3px;
      `,
      reference: `
        margin: 0;
        font-size: 15px;
        color: #ff6b9d;
        font-weight: 600;
        letter-spacing: 0.5px;
      `
    },
    minimal: {
      container: `
        padding: 16px;
        margin: 8px 0;
        background: ${isLightBg ? 'rgba(255, 255, 255, 0.9)' : 'rgba(45, 55, 72, 0.9)'};
        border: 1px solid ${isLightBg ? '#e2e8f0' : '#4a5568'};
        font-family: Arial, sans-serif;
        font-size: 15px;
        line-height: 1.5;
        color: ${isLightBg ? '#4a5568' : '#cbd5e0'};
        text-align: left;
        border-radius: 2px;
      `,
      verseText: `
        margin: 0 0 8px 0;
        font-style: normal;
        color: ${isLightBg ? '#4a5568' : '#cbd5e0'};
      `,
      reference: `
        margin: 0;
        font-size: 13px;
        color: ${isLightBg ? '#718096' : '#a0aec0'};
        font-weight: 500;
      `
    },
    bold: {
      container: `
        padding: 28px;
        margin: 15px 0;
        background: ${isLightBg ? '#2d3748' : '#1a202c'};
        border-left: 6px solid #fbbf24;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 18px;
        line-height: 1.6;
        color: white;
        text-align: left;
        border-radius: 8px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      `,
      verseText: `
        margin: 0 0 14px 0;
        font-style: italic;
        font-weight: 700;
        color: white;
        font-size: 18px;
        letter-spacing: 0.3px;
      `,
      reference: `
        margin: 0;
        font-size: 16px;
        color: #fbbf24;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
      `
    }
  };

  return themes[theme] || themes.classic;
}

// Function to replace ad with Bible verse
async function replaceAdWithVerse(element) {
  try {
    // Validate element
    if (!element || !element.parentNode) {
      return;
    }
    
    if (replacedElements.has(element)) {
      return;
    }
    
    // Mark as processing to prevent duplicate replacements
    replacedElements.add(element);
    
    let verse;
    try {
      verse = await getRandomVerse();
      if (!verse || !verse.text) {
        // If verse fetch fails, silently skip
        return;
      }
    } catch (e) {
      // If verse fetch fails, silently skip
      return;
    }
    
    // Detect page background color with error handling
    let pageBgColor;
    let isLightBg;
    try {
      pageBgColor = getPageBackgroundColor();
      isLightBg = isLightColor(pageBgColor);
    } catch (e) {
      // Fallback to dark theme on error
      isLightBg = false;
      pageBgColor = 'rgb(26, 26, 26)';
    }

    // Get theme styles
    const theme = currentSettings.theme || 'classic';
    const themeStyles = getThemeStyles(theme, isLightBg, pageBgColor);

    // Create a new div for the Bible verse
    const verseContainer = document.createElement('div');
    try {
      verseContainer.style.cssText = themeStyles.container;

      const verseText = document.createElement('p');
      verseText.textContent = `"${verse.text}"`;
      verseText.style.cssText = themeStyles.verseText;

      const verseReference = document.createElement('p');
      verseReference.textContent = `— ${verse.reference || ''}`;
      verseReference.style.cssText = themeStyles.reference;
      
      verseContainer.appendChild(verseText);
      verseContainer.appendChild(verseReference);
      
      // Replace the ad element
      if (element.parentNode) {
        element.parentNode.replaceChild(verseContainer, element);
        replacedElements.add(verseContainer);
      }
    } catch (e) {
      // If DOM manipulation fails, remove from tracking so it can be retried
      replacedElements.delete(element);
      throw e;
    }
  } catch (e) {
    // Silently handle all errors - don't crash the extension
    // Remove from tracking so it can be retried later if needed
    if (element) {
      replacedElements.delete(element);
    }
  }
}

// Throttle to prevent excessive scanning
let isScanning = false;
let scanTimeout = null;

// Function to scan and replace ads (throttled)
async function scanAndReplaceAds() {
  if (isScanning) return;
  isScanning = true;

  try {
    // Get appropriate selectors based on detection level
    const detectionLevel = currentSettings.detection || 'balanced';
    const selectorsToUse = adSelectors[detectionLevel] || adSelectors.balanced;

    // Only check elements that match ad selectors (more efficient)
    for (const selector of selectorsToUse) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          try {
            if (element && isAdElement(element)) {
              await replaceAdWithVerse(element);
            }
          } catch (e) {
            // Skip this element if there's an error
            continue;
          }
        }
      } catch (e) {
        // Invalid selector, skip
        continue;
      }
    }

    // Check iframes separately if enabled
    if (currentSettings.replaceIframes) {
      try {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          try {
            if (iframe && isAdElement(iframe)) {
              await replaceAdWithVerse(iframe);
            }
          } catch (e) {
            // Skip this iframe if there's an error
            continue;
          }
        }
      } catch (e) {
        // Skip iframe check if there's an error
      }
    }
  } catch (e) {
    // Silently handle errors
  } finally {
    isScanning = false;
  }
}

// Initial scan (will be called after verses are loaded)
if (versesLoaded) {
  scanAndReplaceAds();
}

// Use MutationObserver to catch dynamically loaded ads (optimized)
// Ensure only one observer exists per page
if (window.bibleBlockObserver) {
  // Observer already exists, disconnect the old one
  try {
    window.bibleBlockObserver.disconnect();
  } catch (e) {
    // Ignore errors
  }
}

let observerTimeout = null;
const observer = new MutationObserver((mutations) => {
  try {
    if (!versesLoaded) return;
    
    // Throttle observer callbacks
    if (observerTimeout) return;
    
    observerTimeout = setTimeout(() => {
      try {
        observerTimeout = null;
        
        // Only check newly added nodes, not all children
        mutations.forEach((mutation) => {
          try {
            mutation.addedNodes.forEach((node) => {
              try {
                if (node && node.nodeType === 1) { // Element node
                  // Check the node itself first
                  if (isAdElement(node)) {
                    replaceAdWithVerse(node).catch(() => {}); // Fire and forget, catch errors
                    return; // Skip children if parent is already an ad
                  }
                  
                  // Only check direct children, not all descendants
                  if (node.children && node.children.length > 0) {
                    for (const child of node.children) {
                      try {
                        if (child && isAdElement(child)) {
                          replaceAdWithVerse(child).catch(() => {}); // Fire and forget, catch errors
                        }
                      } catch (e) {
                        // Skip this child on error
                        continue;
                      }
                    }
                  }
                }
              } catch (e) {
                // Skip this node on error
              }
            });
          } catch (e) {
            // Skip this mutation on error
          }
        });
      } catch (e) {
        // Silently handle observer errors
      }
    }, 100); // Throttle to 100ms
  } catch (e) {
    // Silently handle observer setup errors
  }
});

// Start observing (will only process after verses are loaded)
// Store observer globally to prevent duplicates
window.bibleBlockObserver = observer;

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  // Wait for body to be available
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body && window.bibleBlockObserver) {
      window.bibleBlockObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  try {
    if (window.bibleBlockObserver) {
      window.bibleBlockObserver.disconnect();
      window.bibleBlockObserver = null;
    }
    if (observerTimeout) {
      clearTimeout(observerTimeout);
      observerTimeout = null;
    }
  } catch (e) {
    // Ignore cleanup errors
  }
});

  // Periodic scan as backup (reduced frequency to save memory)
  setInterval(() => {
    try {
      if (versesLoaded && !isScanning) {
        scanAndReplaceAds().catch(() => {}); // Fire and forget, catch errors
      }
    } catch (e) {
      // Silently handle interval errors
    }
  }, 10000); // Reduced from 2000ms to 10000ms (10 seconds)
}

