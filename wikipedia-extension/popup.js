class PopupManager {
  constructor() {
    this.storage = new WikipediaStorage();
    this.init();
  }

  async init() {
    await this.storage.initializeStorage();
    this.setupTabs();
    this.setupDataSync();
    this.setupMessageListener();
    this.setupDeleteHandlers();
    this.loadData();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
      });
    });

    document.getElementById('clear-all-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all Wikipedia tracking data? This cannot be undone.')) {
        this.clearAllData();
      }
    });
  }

  setupDataSync() {    
    document.getElementById('export-data').addEventListener('click', async () => {
      try {
        await this.storage.exportToFile();
        alert('Data exported to Downloads/data/wikipedia-extension/wikipedia-data.json\n\nMove this file to your project\'s data/wikipedia-extension/ directory');
      } catch (error) {
        alert(`Export failed: ${error.message}`);
      }
    });

    document.getElementById('import-data').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const result = await this.storage.importFromFile(file);
        alert(result.message);
        if (result.success) {
          this.loadData();
        }
        e.target.value = '';
      }
    });
  }

  setupMessageListener() {
    // Listen for storage changes (more reliable than messages)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.wikipedia_tracker_data) {
        console.log('Sidebar: Storage changed, refreshing data');
        this.loadData();
      }
    });
    
    // Also listen for page changes from content script (backup method)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'pageChanged') {
        console.log('Sidebar: Page changed message received, refreshing data');
        this.loadData();
      }
    });
  }

  setupDeleteHandlers() {
    // Set up delete button handler for history items (only once)
    document.getElementById('history-list').addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-page-btn')) {
        const title = e.target.dataset.title;
        if (confirm(`Delete "${title}" from history?\n\nThis will also remove all highlights and notes for this page.`)) {
          const success = await this.storage.deletePage(title);
          if (success) {
            this.loadData(); // Refresh all data
          }
        }
      }
    });

    // Set up delete button handler for highlights
    document.getElementById('highlights-list').addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-highlight-btn')) {
        const highlightId = parseFloat(e.target.dataset.highlightId); // Parse as number since IDs can be floats
        const pageKey = e.target.dataset.pageKey;
        const highlightText = e.target.parentElement.querySelector('.highlight-text').textContent;
        
        if (confirm(`Delete this highlight?\n\n"${highlightText.substring(0, 100)}..."`)) {
          await this.storage.removeHighlightByPageKey(pageKey, highlightId);
          this.loadData(); // Refresh all data
        }
      }
    });

    // Set up delete button handler for notes
    document.getElementById('notes-list').addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-note-btn')) {
        const noteId = parseFloat(e.target.dataset.noteId); // Parse as number since IDs can be floats
        const pageKey = e.target.dataset.pageKey;
        const noteText = e.target.parentElement.querySelector('.note-content div').textContent;
        
        if (confirm(`Delete this note?\n\n"${noteText.substring(0, 100)}..."`)) {
          await this.storage.removeNoteByPageKey(pageKey, noteId);
          this.loadData(); // Refresh all data
        }
      }
    });
  }

  async loadData() {
    await Promise.all([
      this.loadHistory(),
      this.loadHighlights(),
      this.loadNotes(),
      this.loadStats()
    ]);
  }

  async loadHistory() {
    const pages = await this.storage.getPageHistory();
    const historyList = document.getElementById('history-list');
    
    if (Object.keys(pages).length === 0) {
      historyList.innerHTML = '<div class="empty-state">No Wikipedia pages visited yet</div>';
      return;
    }

    const sortedPages = Object.values(pages).sort((a, b) => b.lastVisit - a.lastVisit);
    
    historyList.innerHTML = sortedPages.map(page => `
      <div class="page-item">
        <div class="page-content">
          <div class="page-title">${this.escapeHtml(page.title)}</div>
          <div class="page-url">${this.escapeHtml(page.url)}</div>
          <div class="page-stats">
            <span class="stat">Visits: ${page.visitCount}</span>
            <span class="stat">Time: ${this.formatTime(page.totalTimeSpent)}</span>
            <span class="stat">Last: ${this.formatDate(page.lastVisit)}</span>
          </div>
        </div>
        <button class="delete-page-btn" data-title="${this.escapeHtml(page.title)}" title="Delete this entry">×</button>
      </div>
`).join('');
  }

  async loadHighlights() {
    const data = await this.storage.getData();
    const highlightsList = document.getElementById('highlights-list');
    const allHighlights = [];

    Object.entries(data.highlights || {}).forEach(([pageKey, highlights]) => {
      highlights.forEach(highlight => {
        allHighlights.push({
          ...highlight,
          pageKey,
          pageUrl: `https://${pageKey}`
        });
      });
    });

    if (allHighlights.length === 0) {
      highlightsList.innerHTML = '<div class="empty-state">No highlights created yet</div>';
      return;
    }

    allHighlights.sort((a, b) => b.timestamp - a.timestamp);

    highlightsList.innerHTML = allHighlights.map(highlight => `
      <div class="highlight-item">
        <div class="highlight-content">
          <div class="highlight-text">${this.escapeHtml(highlight.text)}</div>
          <div class="page-url">${this.escapeHtml(highlight.pageUrl)}</div>
          <div class="item-date">${this.formatDate(highlight.timestamp)}</div>
        </div>
        <button class="delete-highlight-btn" data-highlight-id="${highlight.id}" data-page-key="${this.escapeHtml(highlight.pageKey)}" title="Delete this highlight">×</button>
      </div>
    `).join('');
  }

  async loadNotes() {
    const data = await this.storage.getData();
    const notesList = document.getElementById('notes-list');
    const allNotes = [];

    Object.entries(data.notes || {}).forEach(([pageKey, notes]) => {
      notes.forEach(note => {
        allNotes.push({
          ...note,
          pageKey,
          pageUrl: `https://${pageKey}`
        });
      });
    });

    if (allNotes.length === 0) {
      notesList.innerHTML = '<div class="empty-state">No notes created yet</div>';
      return;
    }

    allNotes.sort((a, b) => b.timestamp - a.timestamp);

    notesList.innerHTML = allNotes.map(note => `
      <div class="note-item">
        <div class="note-content">
          <div>${this.escapeHtml(note.text)}</div>
          <div class="page-url">${this.escapeHtml(note.pageUrl)}</div>
          <div class="item-date">${this.formatDate(note.timestamp)}</div>
        </div>
        <button class="delete-note-btn" data-note-id="${note.id}" data-page-key="${this.escapeHtml(note.pageKey)}" title="Delete this note">×</button>
      </div>
    `).join('');
  }

  async loadStats() {
    const data = await this.storage.getData();
    const pages = data.pages || {};
    const highlights = data.highlights || {};
    const notes = data.notes || {};

    const totalPages = Object.keys(pages).length;
    const totalTime = Object.values(pages).reduce((sum, page) => sum + page.totalTimeSpent, 0);
    const totalHighlights = Object.values(highlights).reduce((sum, pageHighlights) => sum + pageHighlights.length, 0);
    const totalNotes = Object.values(notes).reduce((sum, pageNotes) => sum + pageNotes.length, 0);

    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('total-time').textContent = this.formatTime(totalTime);
    document.getElementById('total-highlights').textContent = totalHighlights;
    document.getElementById('total-notes').textContent = totalNotes;
  }

  async clearAllData() {
    await this.storage.setData({
      pages: {},
      highlights: {},
      notes: {}
    });
    this.loadData();
  }

  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '<1m';
    }
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});