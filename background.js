// Background service worker to fetch Bible verses (bypasses CORS)
// This runs in the extension context, not the webpage context, so it can fetch from any URL
// Version: 2.0

console.log('[Background] Bible Block v2.0 - Service worker started');

let cachedVerses = null;
let loadingPromise = null;

// Function to fetch and parse KJV Bible text file
async function loadBibleVerses() {
  // Return cached verses if already loaded
  if (cachedVerses) {
    return cachedVerses;
  }
  
  // Return existing promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }
  
  // Start loading
  loadingPromise = (async () => {
    try {
      console.log('[Background] Fetching KJV Bible from openbible.com...');
      const response = await fetch('https://openbible.com/textfiles/kjv.txt');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log(`[Background] Fetched ${text.length} characters from KJV file`);
      
      // Parse the text file
      const lines = text.split('\n');
      const verses = [];
      let skippedLines = 0;
      let parsedLines = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) {
          skippedLines++;
          continue;
        }
        
        // Skip header lines (first few lines of the file)
        if (i < 5 && (
            trimmedLine.startsWith('KJV') || 
            trimmedLine.includes('King James Bible') || 
            trimmedLine.includes('Pure Cambridge Edition') ||
            trimmedLine.includes('Text courtesy') ||
            trimmedLine.includes('www.BibleProtector.com'))) {
          skippedLines++;
          continue;
        }
        
        // Split by tab character
        const tabIndex = trimmedLine.indexOf('\t');
        
        if (tabIndex === -1) {
          // No tab found - try space-separated
          const spaceMatch = trimmedLine.match(/^([A-Za-z0-9\s]+\s+\d+:\d+)\s+(.+)$/);
          if (spaceMatch) {
            const reference = spaceMatch[1].trim();
            const verseText = spaceMatch[2].trim();
            if (reference && verseText) {
              verses.push({ reference, text: verseText });
              parsedLines++;
            } else {
              skippedLines++;
            }
          } else {
            skippedLines++;
          }
          continue;
        }
        
        // Parse tab-separated format
        const reference = trimmedLine.substring(0, tabIndex).trim();
        const verseText = trimmedLine.substring(tabIndex + 1).trim();
        
        if (reference && verseText) {
          verses.push({ reference, text: verseText });
          parsedLines++;
        } else {
          skippedLines++;
        }
      }
      
      console.log(`[Background] Parsed ${parsedLines} verses, skipped ${skippedLines} lines`);
      console.log(`[Background] ✅ Successfully loaded ${verses.length} Bible verses from KJV`);
      
      if (verses.length === 0) {
        throw new Error('No verses were parsed from the file');
      }
      
      cachedVerses = verses;
      return verses;
    } catch (error) {
      console.error('[Background] ❌ Error loading Bible verses:', error);
      // Return fallback verses
      const fallback = [
        {
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          reference: "John 3:16"
        },
        {
          text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
          reference: "Proverbs 3:5"
        },
        {
          text: "I can do all things through Christ which strengtheneth me.",
          reference: "Philippians 4:13"
        }
      ];
      cachedVerses = fallback;
      console.log(`[Background] ⚠️ Using fallback: ${fallback.length} hardcoded verses`);
      return fallback;
    }
  })();
  
  return loadingPromise;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRandomVerse') {
    loadBibleVerses().then(verses => {
      if (verses.length === 0) {
        sendResponse({
          text: "Loading Bible verses...",
          reference: ""
        });
        return;
      }
      const randomIndex = Math.floor(Math.random() * verses.length);
      const verse = verses[randomIndex];
      console.log(`[Background] Selected random verse ${randomIndex + 1}/${verses.length}: ${verse.reference}`);
      sendResponse(verse);
    });
    return true; // Indicates we will send a response asynchronously
  }
  
  if (request.action === 'getAllVerses') {
    loadBibleVerses().then(verses => {
      sendResponse({ verses: verses, count: verses.length });
    });
    return true;
  }
});

// Preload verses when extension starts
loadBibleVerses();

