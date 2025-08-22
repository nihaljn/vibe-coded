class WikipediaStorage {
  constructor() {
    this.DB_KEY = 'wikipedia_tracker_data';
    this.SESSION_KEY = 'wikipedia_session_visits';
    this.sessionVisits = new Set(); // Track what we've visited this session
  }

  async initializeStorage() {
    const data = await this.getData();
    if (!data) {
      await this.setData({
        pages: {},
        highlights: {},
        notes: {}
      });
    } else {
      // Clean up existing data by merging entries with cleaned titles
      await this.cleanupExistingData(data);
    }
  }

  async cleanupExistingData(data) {
    let hasChanges = false;
    const newPages = {};
    
    // Merge pages with cleaned titles
    for (const [oldKey, pageData] of Object.entries(data.pages || {})) {
      const cleanedTitle = this.cleanTitle(pageData.title);
      const newKey = cleanedTitle;
      
      if (newPages[newKey]) {
        // Merge with existing entry
        newPages[newKey].visitCount += pageData.visitCount;
        newPages[newKey].totalTimeSpent += pageData.totalTimeSpent;
        newPages[newKey].firstVisit = Math.min(newPages[newKey].firstVisit, pageData.firstVisit);
        newPages[newKey].lastVisit = Math.max(newPages[newKey].lastVisit, pageData.lastVisit);
        hasChanges = true;
      } else {
        // Update title and use as new entry
        newPages[newKey] = {
          ...pageData,
          title: cleanedTitle
        };
        if (oldKey !== newKey) {
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      console.log('Cleaning up Wikipedia titles and merging entries');
      data.pages = newPages;
      await this.setData(data);
    }
  }

  async getData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.DB_KEY, (result) => {
        resolve(result[this.DB_KEY] || null);
      });
    });
  }

  async setData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.DB_KEY]: data }, resolve);
    });
  }

  async exportToFile() {
    const data = await this.getData();
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: data
    };
    
    // Use Chrome downloads API to save with correct path
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    try {
      if (chrome.downloads) {
        await new Promise((resolve, reject) => {
          chrome.downloads.download({
            url: url,
            filename: 'data/wikipedia-extension/wikipedia-data.json',
            saveAs: false,
            conflictAction: 'overwrite'
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error('Download failed:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log('Data exported to downloads/data/wikipedia-extension/');
              resolve(downloadId);
            }
          });
        });
      } else {
        throw new Error('Downloads API not available');
      }
    } catch (error) {
      console.log('Falling back to regular download');
      // Fallback: regular download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wikipedia-data.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    URL.revokeObjectURL(url);
  }

  async importFromFile(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.data) {
        throw new Error('Invalid file format');
      }
      
      await this.setData(importData.data);
      return {
        success: true,
        message: `Data imported successfully from ${importData.exportDate || 'unknown date'}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`
      };
    }
  }

  async updatePageHistory(url, title, timeSpent = 0) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(title); // Clean the title first
    const pageKey = this.getPageKey(cleanedTitle); // Use cleaned title as key
    
    // Check if we've already visited this page in this session
    const alreadyVisitedThisSession = this.sessionVisits.has(pageKey);
    
    if (!data.pages[pageKey]) {
      data.pages[pageKey] = {
        url,
        title: cleanedTitle, // Store the cleaned title
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        visitCount: 0,
        totalTimeSpent: 0
      };
    } else {
      // Update URL in case of redirects, and ensure title is cleaned
      data.pages[pageKey].url = url;
      data.pages[pageKey].title = cleanedTitle; // Always use cleaned title
    }
    
    data.pages[pageKey].lastVisit = Date.now();
    
    // Only increment visit count if this is the first time in this session
    if (!alreadyVisitedThisSession) {
      data.pages[pageKey].visitCount++;
      this.sessionVisits.add(pageKey);
      console.log('New visit to:', cleanedTitle, 'Count now:', data.pages[pageKey].visitCount);
    } else {
      console.log('Already visited this session:', cleanedTitle, 'Count remains:', data.pages[pageKey].visitCount);
    }
    
    data.pages[pageKey].totalTimeSpent += timeSpent;
    
    await this.setData(data);
    return data.pages[pageKey];
  }

  async getPageHistory() {
    const data = await this.getData();
    return data.pages || {};
  }

  async deletePage(title) {
    const data = await this.getData();
    const pageKey = this.getPageKey(title);
    
    if (data.pages[pageKey]) {
      delete data.pages[pageKey];
      
      // Also delete associated highlights and notes
      if (data.highlights[pageKey]) {
        delete data.highlights[pageKey];
      }
      if (data.notes[pageKey]) {
        delete data.notes[pageKey];
      }
      
      await this.setData(data);
      return true;
    }
    return false;
  }

  async addHighlight(url, highlight) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(document.title); // Clean current page title
    const pageKey = cleanedTitle; // Use cleaned title directly as key
    
    console.log('Adding highlight for page:', pageKey, 'Title:', cleanedTitle);
    console.log('Input highlight data:', highlight);
    
    if (!data.highlights[pageKey]) {
      data.highlights[pageKey] = [];
    }
    
    const highlightObj = {
      id: Date.now() + Math.random(), // Ensure unique ID
      text: highlight.text,
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      containerPath: highlight.containerPath,
      timestamp: Date.now()
    };
    
    console.log('Created highlight object:', highlightObj);
    data.highlights[pageKey].push(highlightObj);
    console.log('Total highlights for this page after adding:', data.highlights[pageKey].length);
    
    await this.setData(data);
    console.log('Highlight saved to storage successfully');
    return highlightObj;
  }

  async getHighlights(url) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(document.title); // Clean current page title
    const pageKey = cleanedTitle; // Use cleaned title directly as key
    
    console.log('Getting highlights for page:', pageKey, 'Title:', cleanedTitle);
    console.log('All highlights data:', data.highlights);
    console.log('Highlights for this page:', data.highlights[pageKey] || []);
    
    return data.highlights[pageKey] || [];
  }

  async removeHighlight(url, highlightId) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(document.title); // Clean current page title
    const pageKey = cleanedTitle; // Use cleaned title directly as key
    
    if (data.highlights[pageKey]) {
      data.highlights[pageKey] = data.highlights[pageKey].filter(h => h.id !== highlightId);
      await this.setData(data);
    }
  }

  async removeHighlightByPageKey(pageKey, highlightId) {
    const data = await this.getData();
    
    if (data.highlights[pageKey]) {
      data.highlights[pageKey] = data.highlights[pageKey].filter(h => h.id !== highlightId);
      // Remove empty highlight arrays
      if (data.highlights[pageKey].length === 0) {
        delete data.highlights[pageKey];
      }
      await this.setData(data);
    }
  }

  async addNote(url, note) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(document.title); // Clean current page title
    const pageKey = cleanedTitle; // Use cleaned title directly as key
    
    if (!data.notes[pageKey]) {
      data.notes[pageKey] = [];
    }
    
    const noteObj = {
      id: Date.now(),
      text: note,
      timestamp: Date.now()
    };
    
    data.notes[pageKey].push(noteObj);
    await this.setData(data);
    return noteObj;
  }

  async getNotes(url) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(document.title); // Clean current page title
    const pageKey = cleanedTitle; // Use cleaned title directly as key
    return data.notes[pageKey] || [];
  }

  async removeNote(url, noteId) {
    const data = await this.getData();
    const cleanedTitle = this.cleanTitle(document.title); // Clean current page title
    const pageKey = cleanedTitle; // Use cleaned title directly as key
    
    if (data.notes[pageKey]) {
      data.notes[pageKey] = data.notes[pageKey].filter(n => n.id !== noteId);
      await this.setData(data);
    }
  }

  async removeNoteByPageKey(pageKey, noteId) {
    const data = await this.getData();
    
    if (data.notes[pageKey]) {
      data.notes[pageKey] = data.notes[pageKey].filter(n => n.id !== noteId);
      // Remove empty note arrays
      if (data.notes[pageKey].length === 0) {
        delete data.notes[pageKey];
      }
      await this.setData(data);
    }
  }

  cleanTitle(title) {
    // Remove "- Wikipedia" suffix and any language variants
    return title
      .replace(/\s*-\s*Wikipedia$/i, '')
      .replace(/\s*-\s*Wikipedia.*$/i, '')
      .trim();
  }

  getPageKey(titleOrUrl) {
    // If it looks like a title (no protocol), clean it and use it
    if (!titleOrUrl.startsWith('http')) {
      return this.cleanTitle(titleOrUrl);
    }
    // Otherwise, extract from URL (fallback for legacy compatibility)
    return titleOrUrl.replace(/^https?:\/\//, '').split('#')[0].split('?')[0];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WikipediaStorage;
}