# Paper Tracker

A simple web application for tracking arXiv papers with features for managing reading status, tags, and comments.

## Features

- Add papers by pasting arXiv URLs
- Automatically fetches paper metadata (title, authors, abstract, publication date)
- Track reading status (read/unread)
- Add custom tags and comments
- Filter papers by reading status
- Export data as JSON for easy transfer
- Simple, clean interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## Usage

1. Paste an arXiv URL (e.g., `https://arxiv.org/abs/2301.00001`) into the input field
2. The app will automatically fetch paper details from arXiv
3. Use the "Edit" button to add tags, comments, or mark as read
4. Filter papers using the All/Unread/Read buttons
5. Export your data anytime using the "Export Data" button

## Data Storage

Papers are stored in `papers.json` as an array of objects with the following structure:

```json
{
  "id": "2301.00001",
  "title": "Paper Title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "Paper abstract...",
  "published": "2023-01-01",
  "url": "https://arxiv.org/abs/2301.00001",
  "tags": ["machine learning", "nlp"],
  "comments": "Interesting approach to...",
  "read": false,
  "dateAdded": "2023-01-01T00:00:00.000Z"
}
```

## Development

Run with auto-restart:
```bash
npm run dev
```