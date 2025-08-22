# Wikipedia Tracker Chrome Extension

A privacy-focused Chrome extension that tracks your Wikipedia reading habits, allows highlighting text, and taking notes - all stored locally on your device.

## Features

### 📊 Reading History
- Tracks all Wikipedia pages you visit
- Records visit count and time spent on each page
- Shows when you first and last visited each page
- All data stored locally in browser storage

### ✨ Text Highlighting
- Select any text on Wikipedia pages to highlight it
- Highlights are automatically saved and restored on page reload
- Double-click highlights to remove them
- View all highlights across pages in the popup

### 📝 Note Taking
- Add notes to any Wikipedia page
- Take notes about specific highlighted text
- Notes are timestamped and searchable
- View all notes organized by page

### 🔒 Privacy First
- All data stored locally in your browser
- No data sent to external servers
- No tracking or analytics
- Complete control over your data

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Wikipedia Tracker icon should appear in your extensions bar

## Usage

### Automatic Tracking
The extension automatically tracks your Wikipedia visits once installed. Just browse Wikipedia normally.

### Highlighting Text
1. Select any text on a Wikipedia page
2. Click the "📝 Highlight" button that appears
3. The text will be highlighted in yellow
4. Double-click any highlight to remove it

### Adding Notes
1. Select text and click "📄 Add Note" or use the toolbar button
2. Enter your note in the popup dialog
3. Notes are saved automatically and shown in the side panel

### Viewing Data
Click the extension icon to open the popup and view:
- **History**: All visited pages with stats
- **Highlights**: All your highlights across pages  
- **Notes**: All your notes organized by page
- **Stats**: Summary statistics of your usage

## Technical Details

### Files Structure
- `manifest.json` - Extension configuration
- `content.js` - Main content script for Wikipedia pages
- `content.css` - Styles for highlights and UI elements
- `background.js` - Background service worker
- `popup.html/js` - Extension popup interface
- `storage.js` - Local storage management

### Data Storage
All data is stored using Chrome's `chrome.storage.local` API with the following structure:

```javascript
{
  pages: {
    "en.wikipedia.org/wiki/Article": {
      url: "https://en.wikipedia.org/wiki/Article",
      title: "Article Title",
      visitCount: 5,
      totalTimeSpent: 120000, // milliseconds
      firstVisit: 1234567890000,
      lastVisit: 1234567890000
    }
  },
  highlights: {
    "en.wikipedia.org/wiki/Article": [
      {
        id: 1234567890000,
        text: "highlighted text",
        startOffset: 0,
        endOffset: 15,
        containerPath: "div.content > p:nth-child(2)",
        timestamp: 1234567890000
      }
    ]
  },
  notes: {
    "en.wikipedia.org/wiki/Article": [
      {
        id: 1234567890000,
        text: "my note about this article",
        timestamp: 1234567890000
      }
    ]
  }
}
```

### Browser Compatibility
- Chrome/Chromium 88+
- Uses Manifest V3
- Requires storage permission for local data

## Privacy Policy

This extension:
- ✅ Stores all data locally on your device
- ✅ Works completely offline after installation
- ✅ Does not collect any personal information
- ✅ Does not send data to any external servers
- ✅ Does not track your browsing outside Wikipedia
- ✅ Gives you full control to delete all data anytime

## Contributing

Feel free to submit issues or pull requests to improve the extension.

## License

MIT License - feel free to modify and distribute.