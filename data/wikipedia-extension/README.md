# Wikipedia Extension Data

This directory stores data exported from the Wikipedia Tracker browser extension.

## Data Structure

The extension stores data in `wikipedia-data.json` with the following format:

```json
{
  "exportDate": "2025-01-01T00:00:00.000Z",
  "version": "1.0",
  "data": {
    "pages": {
      "en.wikipedia.org/wiki/Article": {
        "url": "https://en.wikipedia.org/wiki/Article",
        "title": "Article Title",
        "visitCount": 5,
        "totalTimeSpent": 120000,
        "firstVisit": 1234567890000,
        "lastVisit": 1234567890000
      }
    },
    "highlights": {
      "en.wikipedia.org/wiki/Article": [
        {
          "id": 1234567890000,
          "text": "highlighted text",
          "startOffset": 0,
          "endOffset": 15,
          "containerPath": "div.content > p:nth-child(2)",
          "timestamp": 1234567890000
        }
      ]
    },
    "notes": {
      "en.wikipedia.org/wiki/Article": [
        {
          "id": 1234567890000,
          "text": "my note about this article",
          "timestamp": 1234567890000
        }
      ]
    }
  }
}
```

## How to Use

### Export Data from Extension
1. Click the extension icon in your browser
2. Go to the "Stats" tab
3. Click "Export Data" button
4. The file will be downloaded or saved to this directory

### Import Data to Extension
1. Click the extension icon in your browser
2. Go to the "Stats" tab
3. Click "Import Data" button
4. Select a previously exported JSON file

## Data Privacy

All data is stored locally and never transmitted to external servers. The extension respects your privacy by keeping all Wikipedia reading history, highlights, and notes on your device only.

## Backup Recommendations

- Regularly export your data using the extension
- Keep backups of the exported JSON files
- The data directory can be synced with cloud storage if desired