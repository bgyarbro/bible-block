// Request verses from background service worker (bypasses CORS)
// Version: 2.0 - Using background script to bypass CORS
console.log('[Content] Bible Block v2.0 - Using background script');

// Whitelist of domains where the extension should NOT run
const WHITELISTED_DOMAINS = [
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
];

// Check if current domain is whitelisted
function isWhitelisted() {
  const hostname = window.location.hostname.toLowerCase();
  return WHITELISTED_DOMAINS.some(domain => {
    return hostname === domain || hostname.endsWith('.' + domain);
  });
}

// Only run if not whitelisted
if (isWhitelisted()) {
  console.log(`[Content] Domain ${window.location.hostname} is whitelisted, skipping ad replacement`);
} else {
  // Run ad replacement logic
  let versesLoaded = false;

// Function to get a random Bible verse from background script
async function getRandomVerse() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getRandomVerse' });
    if (response) {
      console.log(`[Content] Received verse: ${response.reference}`);
      return response;
    }
    // Fallback if no response
    return {
      text: "Loading Bible verses...",
      reference: ""
    };
  } catch (error) {
    console.error('[Content] Error getting verse:', error);
    return {
      text: "Error loading verse",
      reference: ""
    };
  }
}

// Initialize - check if verses are available
async function initializeVerses() {
  try {
    console.log('[Content] Requesting verse count from background...');
    const response = await chrome.runtime.sendMessage({ action: 'getAllVerses' });
    if (response && response.count) {
      versesLoaded = true;
      console.log(`[Content] ✅ Verses available: ${response.count} verses loaded`);
      // Now scan for ads
      scanAndReplaceAds();
    } else {
      console.warn('[Content] No verses available yet, will retry...');
      // Retry after a short delay
      setTimeout(initializeVerses, 1000);
    }
  } catch (error) {
    console.error('[Content] Error initializing verses:', error);
    // Still try to scan, verses will be loaded on demand
    versesLoaded = true;
    scanAndReplaceAds();
  }
}

// Initialize when script starts
initializeVerses();

// Common ad selectors and patterns
const adSelectors = [
  // Google AdSense
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
  '[class*="sponsored"]',
  '[id*="sponsored"]',
  '[class*="promo"]',
  '[id*="promo"]',
  
  // Common ad network containers
  '[id*="doubleclick"]',
  '[class*="doubleclick"]',
  '[id*="adtech"]',
  '[class*="adtech"]',
  '[id*="advertising"]',
  '[class*="advertising"]',
  
  // IFRAME ads
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  'iframe[src*="advertising"]',
  'iframe[id*="google_ads"]',
  'iframe[class*="ad"]',
  
  // Common ad sizes (standard ad dimensions)
  '[id*="300x250"]',
  '[id*="728x90"]',
  '[id*="160x600"]',
  '[id*="320x50"]'
];

// Set to track already replaced elements
const replacedElements = new WeakSet();

// Function to check if element is likely an ad
function isAdElement(element) {
  if (!element || replacedElements.has(element)) {
    return false;
  }
  
  // Check if element matches any ad selector
  for (const selector of adSelectors) {
    try {
      if (element.matches && element.matches(selector)) {
        return true;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Check parent elements
  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    for (const selector of adSelectors) {
      try {
        if (parent.matches && parent.matches(selector)) {
          return true;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    parent = parent.parentElement;
    depth++;
  }
  
  return false;
}

// Function to replace ad with Bible verse
async function replaceAdWithVerse(element) {
  if (replacedElements.has(element)) {
    return;
  }
  
  const verse = await getRandomVerse();
  
  // Create a new div for the Bible verse
  const verseContainer = document.createElement('div');
  verseContainer.style.cssText = `
    padding: 20px;
    margin: 10px 0;
    background-color: #1a1a1a;
    border-left: 4px solid #6b9fff;
    font-family: Georgia, serif;
    font-size: 16px;
    line-height: 1.6;
    color: #e0e0e0;
    text-align: left;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  
  const verseText = document.createElement('p');
  verseText.textContent = `"${verse.text}"`;
  verseText.style.cssText = `
    margin: 0 0 10px 0;
    font-style: italic;
    color: #f0f0f0;
  `;
  
  const verseReference = document.createElement('p');
  verseReference.textContent = `— ${verse.reference}`;
  verseReference.style.cssText = `
    margin: 0;
    font-size: 14px;
    color: #a0a0a0;
    font-weight: bold;
  `;
  
  verseContainer.appendChild(verseText);
  verseContainer.appendChild(verseReference);
  
  // Replace the ad element
  if (element.parentNode) {
    element.parentNode.replaceChild(verseContainer, element);
    replacedElements.add(verseContainer);
  }
}

// Function to scan and replace ads
async function scanAndReplaceAds() {
  // Get all elements that might be ads
  const allElements = document.querySelectorAll('*');
  
  for (const element of allElements) {
    if (isAdElement(element)) {
      await replaceAdWithVerse(element);
    }
  }
  
  // Also check for iframes
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    if (isAdElement(iframe)) {
      await replaceAdWithVerse(iframe);
    }
  }
}

// Initial scan (will be called after verses are loaded)
if (versesLoaded) {
  scanAndReplaceAds();
}

// Use MutationObserver to catch dynamically loaded ads
const observer = new MutationObserver((mutations) => {
  if (!versesLoaded) return;
  
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        if (isAdElement(node)) {
          replaceAdWithVerse(node); // Fire and forget for async
        }
        // Also check children of added nodes
        const children = node.querySelectorAll ? node.querySelectorAll('*') : [];
        children.forEach(child => {
          if (isAdElement(child)) {
            replaceAdWithVerse(child); // Fire and forget for async
          }
        });
      }
    });
  });
});

// Start observing (will only process after verses are loaded)
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  // Wait for body to be available
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

  // Periodic scan as backup (in case observer misses something)
  setInterval(() => {
    if (versesLoaded) {
      scanAndReplaceAds(); // Fire and forget for async
    }
  }, 2000);
}

