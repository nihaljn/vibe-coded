class WikipediaTracker {
  constructor() {
    this.storage = new WikipediaStorage();
    this.startTime = Date.now();
    this.isActive = true;
    this.selectedText = '';
    this.highlights = [];
    this.notes = [];
    this.init();
  }

  async init() {
    await this.storage.initializeStorage();
    this.setupEventListeners();
    this.createToolbar();
    
    // Track the initial page visit ONLY once per page load
    await this.trackPageVisit();
    
    // Load highlights and notes after DOM is fully ready
    let highlightsLoaded = false;
    const loadContent = () => {
      if (!highlightsLoaded) {
        highlightsLoaded = true;
        this.loadHighlights();
        this.loadNotes();
      }
    };
    
    setTimeout(loadContent, 1000); // Single load attempt with longer delay
  }

  async trackPageVisit() {
    const url = window.location.href;
    const title = document.title;
    console.log('trackPageVisit called for:', { url, title });
    await this.storage.updatePageHistory(url, title);
  }

  setupEventListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordTimeSpent();
        this.isActive = false;
      } else {
        this.startTime = Date.now();
        this.isActive = true;
      }
    });

    window.addEventListener('beforeunload', () => {
      this.recordTimeSpent();
    });

    document.addEventListener('mouseup', (e) => {
      setTimeout(() => this.handleTextSelection(e), 10);
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.clearSelection();
      }
    });
  }

  recordTimeSpent() {
    if (this.isActive) {
      const timeSpent = Date.now() - this.startTime;
      const url = window.location.href;
      const title = document.title;
      this.storage.updatePageHistory(url, title, timeSpent);
    }
  }

  handleTextSelection(e) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      this.selectedText = selection.toString().trim();
      if (this.selectedText.length > 0) {
        this.showSelectionToolbar(e);
      }
    } else {
      this.hideSelectionToolbar();
    }
  }

  showSelectionToolbar(e) {
    this.hideSelectionToolbar();
    
    const toolbar = document.createElement('div');
    toolbar.id = 'wiki-selection-toolbar';
    toolbar.innerHTML = `
      <button id="wiki-highlight-btn">📝 Highlight</button>
      <button id="wiki-note-btn">📄 Add Note</button>
    `;
    
    toolbar.style.cssText = `
      position: absolute;
      top: ${e.pageY - 50}px;
      left: ${e.pageX}px;
      z-index: 10000;
      background: #f8f9fa;
      border: 1px solid #a2a9b1;
      border-radius: 4px;
      padding: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(toolbar);
    
    document.getElementById('wiki-highlight-btn').onclick = () => this.highlightSelection();
    document.getElementById('wiki-note-btn').onclick = () => this.addNoteToSelection();
  }

  hideSelectionToolbar() {
    const toolbar = document.getElementById('wiki-selection-toolbar');
    if (toolbar) {
      toolbar.remove();
    }
  }

  clearSelection() {
    window.getSelection().removeAllRanges();
    this.hideSelectionToolbar();
  }

  async highlightSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    console.log('Creating highlight for text:', selectedText);
    
    try {
      // Use a more robust highlighting method that works across elements
      const highlightedElements = this.createHighlightAcrossElements(range, selectedText);
      
      if (highlightedElements.length > 0) {
        // Save the highlight data
        const highlight = {
          text: selectedText,
          // Store element path for restoration
          containerPath: this.getElementPath(range.commonAncestorContainer),
          startOffset: range.startOffset,
          endOffset: range.endOffset
        };
        
        console.log('Saving highlight to storage...');
        console.log('Highlight data being saved:', highlight);
        const savedHighlight = await this.storage.addHighlight(window.location.href, highlight);
        console.log('Highlight saved with ID:', savedHighlight.id);
        
        // Add event listeners to all created highlight spans
        highlightedElements.forEach(span => {
          span.dataset.highlightId = savedHighlight.id;
          span.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.removeHighlight(span, savedHighlight.id);
          });
        });
        
        this.clearSelection();
        this.hideSelectionToolbar();
      }
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  }

  createHighlightAcrossElements(range, selectedText) {
    const highlightedElements = [];
    
    try {
      // First, try the simple method for single-element selections
      if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        const span = document.createElement('span');
        span.className = 'wiki-highlight';
        span.style.backgroundColor = '#ffeb3b';
        span.style.padding = '0 2px';
        
        range.surroundContents(span);
        highlightedElements.push(span);
        return highlightedElements;
      }
      
      // For complex selections, use a different approach
      const contents = range.extractContents();
      const span = document.createElement('span');
      span.className = 'wiki-highlight';
      span.style.backgroundColor = '#ffeb3b';
      span.style.padding = '0 2px';
      
      span.appendChild(contents);
      range.insertNode(span);
      highlightedElements.push(span);
      
    } catch (error) {
      console.log('Complex highlighting failed, trying text-based approach');
      
      // Fallback: Find and highlight individual text segments
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        if (textNode.textContent && selectedText.includes(textNode.textContent.trim())) {
          try {
            const span = document.createElement('span');
            span.className = 'wiki-highlight';
            span.style.backgroundColor = '#ffeb3b';
            span.style.padding = '0 2px';
            
            const parent = textNode.parentNode;
            parent.insertBefore(span, textNode);
            span.appendChild(textNode);
            highlightedElements.push(span);
          } catch (e) {
            console.log('Could not highlight text node:', e);
          }
        }
      }
    }
    
    return highlightedElements;
  }

  async addNoteToSelection() {
    const note = prompt(`Add a note about: "${this.selectedText.substring(0, 50)}..."`);
    if (note) {
      await this.storage.addNote(window.location.href, `"${this.selectedText}" - ${note}`);
      this.clearSelection();
      this.hideSelectionToolbar();
      this.updateNotesDisplay();
    }
  }

  async loadHighlights() {
    console.log('loadHighlights() called for URL:', window.location.href);
    console.log('Current page title:', document.title);
    
    const highlights = await this.storage.getHighlights(window.location.href);
    console.log('Number of highlights found:', highlights.length);
    console.log('Highlights data:', highlights);
    
    if (highlights.length === 0) {
      console.log('No highlights to restore');
      return;
    }
    
    highlights.forEach((highlight, index) => {
      try {
        console.log(`Attempting to restore highlight ${index + 1}:`, highlight.text);
        
        // Use text-based restoration as primary method for reliability
        this.restoreHighlightByText(highlight);
        
      } catch (error) {
        console.error('Error restoring highlight:', error);
      }
    });
  }

  restoreHighlightByText(highlight) {
    console.log('restoreHighlightByText called for:', highlight.text);
    console.log('Highlight ID:', highlight.id);
    
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
      console.log('Highlight already exists:', highlight.id);
      return;
    }
    
    console.log('Searching for text in document body...');
    
    // Find text nodes containing the exact highlight text
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null, // Remove the filter to see all text nodes
      false
    );
    
    let textNode;
    let foundNodes = 0;
    let searchedNodes = 0;
    
    while (textNode = walker.nextNode()) {
      foundNodes++;
      
      // Skip already highlighted nodes
      if (textNode.parentNode && textNode.parentNode.classList && 
          textNode.parentNode.classList.contains('wiki-highlight')) {
        continue;
      }
      
      const text = textNode.textContent;
      searchedNodes++;
      
      // Log first few text nodes for debugging
      if (searchedNodes <= 3) {
        console.log(`Text node ${searchedNodes}:`, text.substring(0, 50));
      }
      
      const startIndex = text.indexOf(highlight.text);
      
      // Debug: check for partial matches to see if text is split
      if (searchedNodes <= 10 && (text.includes("shortest computer program") || text.includes("Kolmogorov") || text.includes("predetermined programming"))) {
        console.log(`Partial match in node ${searchedNodes}:`, text);
      }
      
      if (startIndex !== -1) {
        console.log('Found matching text node! Text preview:', text.substring(0, 100));
        console.log('Match starts at index:', startIndex);
        
        try {
          // Check if the exact text matches (avoid partial matches)
          const exactText = text.substring(startIndex, startIndex + highlight.text.length);
          console.log('Exact text match check:', exactText === highlight.text);
          console.log('Expected text:', highlight.text);
          console.log('Found text:', exactText);
          
          if (exactText === highlight.text) {
            console.log('Creating highlight span...');
            const range = document.createRange();
            range.setStart(textNode, startIndex);
            range.setEnd(textNode, startIndex + highlight.text.length);
            
            const span = document.createElement('span');
            span.className = 'wiki-highlight';
            span.style.backgroundColor = '#ffeb3b';
            span.style.padding = '0 2px';
            span.dataset.highlightId = highlight.id;
            
            range.surroundContents(span);
            
            span.addEventListener('dblclick', (e) => {
              e.stopPropagation();
              this.removeHighlight(span, highlight.id);
            });
            
            console.log('Successfully restored highlight by text search');
            return; // Exit function successfully
          }
        } catch (error) {
          console.error('Error creating highlight span:', error);
        }
      }
    }
    
    if (foundNodes === 0) {
      console.log('No text nodes found by TreeWalker');
    } else {
      console.log(`Searched through ${foundNodes} text nodes, no matches found`);
    }
    
    // Fallback check: is the text even on the page?
    const bodyText = document.body.textContent || document.body.innerText;
    const textExists = bodyText.includes(highlight.text);
    console.log('Text exists in page body:', textExists);
    
    if (textExists) {
      console.log('Text found in body but TreeWalker failed. Trying alternative approach...');
      this.fallbackHighlightRestore(highlight);
      
      // Try a completely different approach: use document.createRange().selectNodeContents
      console.log('Trying range-based text search...');
      this.rangeBasedHighlightRestore(highlight);
      
      // Try innerHTML approach as last resort
      console.log('Trying innerHTML-based approach...');
      this.innerHTMLHighlightRestore(highlight);
    }
    
    console.log('restoreHighlightByText completed for:', highlight.text);
  }

  rangeBasedHighlightRestore(highlight) {
    console.log('Range-based highlight restore for:', highlight.text);
    
    // Use window.find() if available (works in some browsers)
    if (window.find && window.find(highlight.text, false, false, true, false, true, false)) {
      console.log('Found text using window.find()');
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        try {
          const span = document.createElement('span');
          span.className = 'wiki-highlight';
          span.style.backgroundColor = '#ffeb3b';
          span.style.padding = '0 2px';
          span.dataset.highlightId = highlight.id;
          
          range.surroundContents(span);
          
          span.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.removeHighlight(span, highlight.id);
          });
          
          console.log('Successfully created range-based highlight');
          selection.removeAllRanges(); // Clear selection
          return;
        } catch (error) {
          console.log('Range-based highlight failed:', error);
        }
      }
    }
    
    console.log('Range-based approach failed');
  }

  innerHTMLHighlightRestore(highlight) {
    console.log('innerHTML-based highlight restore for:', highlight.text);
    
    // Find the main content area (Wikipedia specific)
    const contentArea = document.querySelector('.mw-parser-output') || 
                       document.querySelector('#mw-content-text') || 
                       document.querySelector('#content') ||
                       document.body;
    
    if (!contentArea) {
      console.log('No content area found');
      return;
    }
    
    const originalHTML = contentArea.innerHTML;
    const highlightText = highlight.text;
    
    // Escape special regex characters
    const escapedText = highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a regex to find the text (case-sensitive)
    const regex = new RegExp(`(${escapedText})`, 'g');
    
    if (regex.test(originalHTML)) {
      console.log('Found text in innerHTML, replacing...');
      
      // Create the highlight span HTML
      const highlightHTML = `<span class="wiki-highlight" style="background-color: #ffeb3b; padding: 0 2px;" data-highlight-id="${highlight.id}">$1</span>`;
      
      // Replace the first occurrence
      const newHTML = originalHTML.replace(regex, highlightHTML);
      
      if (newHTML !== originalHTML) {
        contentArea.innerHTML = newHTML;
        
        // Re-add event listeners to the new highlight
        const highlightSpan = contentArea.querySelector(`[data-highlight-id="${highlight.id}"]`);
        if (highlightSpan) {
          highlightSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.removeHighlight(highlightSpan, highlight.id);
          });
          
          console.log('Successfully created innerHTML-based highlight');
          return;
        }
      }
    }
    
    console.log('innerHTML-based approach failed');
  }

  fallbackHighlightRestore(highlight) {
    console.log('Fallback highlight restore for:', highlight.text);
    
    // Use a more aggressive approach - search all elements for the text
    const allElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, li, td, th');
    
    for (let element of allElements) {
      if (element.textContent && element.textContent.includes(highlight.text)) {
        console.log('Found element containing text:', element.tagName, element.textContent.substring(0, 100));
        
        // Try to highlight within this element using a TreeWalker on the element
        const elementWalker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let elementTextNode;
        while (elementTextNode = elementWalker.nextNode()) {
          if (elementTextNode.textContent.includes(highlight.text)) {
            console.log('Found text node in element:', elementTextNode.textContent.substring(0, 100));
            
            try {
              const text = elementTextNode.textContent;
              const startIndex = text.indexOf(highlight.text);
              
              if (startIndex !== -1) {
                const exactText = text.substring(startIndex, startIndex + highlight.text.length);
                if (exactText === highlight.text) {
                  const range = document.createRange();
                  range.setStart(elementTextNode, startIndex);
                  range.setEnd(elementTextNode, startIndex + highlight.text.length);
                  
                  const span = document.createElement('span');
                  span.className = 'wiki-highlight';
                  span.style.backgroundColor = '#ffeb3b';
                  span.style.padding = '0 2px';
                  span.dataset.highlightId = highlight.id;
                  
                  range.surroundContents(span);
                  
                  span.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.removeHighlight(span, highlight.id);
                  });
                  
                  console.log('Successfully created fallback highlight');
                  return; // Success, exit
                }
              }
            } catch (error) {
              console.log('Fallback highlight failed for this node:', error);
            }
          }
        }
      }
    }
    
    console.log('All fallback attempts failed');
  }

  restoreHighlight(element, highlight) {
    const textNode = this.findTextNode(element, highlight.text);
    if (textNode) {
      const range = document.createRange();
      range.setStart(textNode, highlight.startOffset);
      range.setEnd(textNode, highlight.endOffset);
      
      const span = document.createElement('span');
      span.className = 'wiki-highlight';
      span.style.backgroundColor = '#ffeb3b';
      span.style.padding = '0 2px';
      span.dataset.highlightId = highlight.id;
      
      try {
        range.surroundContents(span);
        span.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.removeHighlight(span, highlight.id);
        });
      } catch (error) {
        console.error('Error restoring highlight:', error);
      }
    }
  }

  async removeHighlight(span, highlightId) {
    if (confirm('Remove this highlight?')) {
      await this.storage.removeHighlight(window.location.href, highlightId);
      const parent = span.parentNode;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    }
  }

  async loadNotes() {
    this.notes = await this.storage.getNotes(window.location.href);
    this.updateNotesDisplay();
  }

  updateNotesDisplay() {
    let notesPanel = document.getElementById('wiki-notes-panel');
    if (!notesPanel && this.notes.length > 0) {
      this.createNotesPanel();
      notesPanel = document.getElementById('wiki-notes-panel');
    }
    
    if (notesPanel) {
      const notesList = notesPanel.querySelector('.notes-list');
      notesList.innerHTML = this.notes.map(note => `
        <div class="note-item" data-note-id="${note.id}">
          <div class="note-text">${note.text}</div>
          <div class="note-date">${new Date(note.timestamp).toLocaleDateString()}</div>
          <button class="delete-note" onclick="this.parentElement.dispatchEvent(new CustomEvent('deleteNote', {detail: ${note.id}}))">×</button>
        </div>
      `).join('');
      
      notesList.addEventListener('deleteNote', async (e) => {
        if (confirm('Delete this note?')) {
          await this.storage.removeNote(window.location.href, e.detail);
          await this.loadNotes();
        }
      });
    }
  }

  createNotesPanel() {
    const panel = document.createElement('div');
    panel.id = 'wiki-notes-panel';
    panel.innerHTML = `
      <div class="notes-header">
        <h3>Notes for this page</h3>
        <button id="toggle-notes">−</button>
      </div>
      <div class="notes-list"></div>
    `;
    
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: #f8f9fa;
      border: 1px solid #a2a9b1;
      border-radius: 4px;
      padding: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      overflow-y: auto;
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('toggle-notes').onclick = () => {
      const notesList = panel.querySelector('.notes-list');
      const toggleBtn = document.getElementById('toggle-notes');
      if (notesList.style.display === 'none') {
        notesList.style.display = 'block';
        toggleBtn.textContent = '−';
      } else {
        notesList.style.display = 'none';
        toggleBtn.textContent = '+';
      }
    };
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'wiki-tracker-toolbar';
    toolbar.innerHTML = `
      <button id="wiki-add-note-btn">📝 Add Note</button>
      <button id="wiki-view-history-btn">📊 History</button>
    `;
    
    toolbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background: #0645ad;
      color: white;
      border-radius: 4px;
      padding: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toolbar);
    
    document.getElementById('wiki-add-note-btn').onclick = () => {
      const note = prompt('Add a note about this page:');
      if (note) {
        this.storage.addNote(window.location.href, note);
        this.loadNotes();
      }
    };
    
    document.getElementById('wiki-view-history-btn').onclick = () => {
      chrome.runtime.sendMessage({action: 'openSidePanel'});
    };
  }

  getElementPath(node) {
    // Handle text nodes by using their parent element
    let element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE && element !== document.body) {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
      } else if (element.className && element.className.trim()) {
        selector += '.' + element.className.trim().split(/\s+/).join('.');
      } else {
        // Add nth-child selector for elements without id/class
        const parent = element.parentNode;
        if (parent) {
          const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            selector += `:nth-child(${index})`;
          }
        }
      }
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.join(' > ');
  }

  getElementByPath(path) {
    try {
      return document.querySelector(path);
    } catch (error) {
      return null;
    }
  }

  findTextNode(element, text) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        return node;
      }
    }
    return null;
  }
}

// Global tracker instance to prevent multiple initializations
let globalTracker = null;

function initializeTracker() {
  if (window.location.hostname.includes('wikipedia.org') && !globalTracker) {
    console.log('Initializing Wikipedia Tracker for:', window.location.href);
    globalTracker = new WikipediaTracker();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracker);
} else {
  initializeTracker();
}

// Simple approach: just track every page load and let storage handle deduplication
// No complex navigation detection needed

// Also listen for background script messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageLoaded' && !globalTracker) {
    initializeTracker();
  }
});