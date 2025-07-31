# Paper Tracker - Claude Memory

## Project Overview
A web application for tracking arXiv papers with features for managing reading status, tags, and comments. Built with Node.js/Express backend and vanilla HTML/CSS/JS frontend.

## Architecture
- **Backend**: Express.js server (`server.js`) with JSON file storage
- **Frontend**: Static files in `public/` directory
- **Data Storage**: `data/papers.json` file (portable JSON format)
- **No Database**: Uses simple file-based storage for easy data transfer

## Key Features Implemented

### 1. Paper Management
- Add papers by arXiv URL (automatically fetches metadata)
- Edit tags, comments, and reading status
- Delete papers
- Filter by read/unread status
- Export all data as JSON

### 2. Table Display
- **Column Order**: Title, Abstract, Authors, Published, Date Added, Tags, Comments, Actions
- **Full-width layout** with 30px left/right margins
- **Natural row heights** (not stretched to viewport)
- **Vertical column separators** (light gray `#f0f0f0`)
- **Resizable columns** with drag handles on headers

### 3. Column Details & Widths
```
Title: 300px
Abstract: 400px  
Authors: 250px
Published: 100px (MONTH DD, YYYY format)
Date Added: 120px (MONTH DD, YYYY format)
Tags: 150px
Comments: 200px
Actions: 90px (non-resizable)
```

### 4. Sorting System
- **All columns sortable** by clicking headers
- **Sort arrows**: `↕` (unsorted), `↑` (asc), `↓` (desc)
- **Default**: Date Added descending (newest first)
- **Sort logic**:
  - Text columns: Case-insensitive alphabetical
  - Date columns: Chronological
  - Tags: Alphabetical by joined string

### 5. Row Interaction
- **Click any row** to toggle text wrapping (expand/collapse)
- **Wrapped state**: Shows full text with normal wrapping
- **Collapsed state**: Single line with ellipsis (`...`)
- **Smart click handling**: Links and buttons don't trigger row toggle

### 6. Tag System
- **Autocomplete dropdown** with existing tags
- **Real-time suggestions** as you type (after each comma)
- **Keyboard navigation**: Arrow keys, Enter to select, Escape to close
- **Maintains tag database** from all papers (case-insensitive)
- **Click or keyboard selection** supported

### 7. UI Consistency
- **All text black** (`#000`) with **14px font size**
- **No browser autocomplete** (`autocomplete="off"` on all inputs)
- **Consistent header styling** (600 font-weight, 14px)
- **Minimal padding**: 8px cell padding
- **Clean borders**: Light vertical separators between columns

## API Endpoints
```
GET  /api/papers        - Get all papers
POST /api/papers        - Add new paper (requires: url)
PUT  /api/papers/:id    - Update paper (tags, comments, read)
DELETE /api/papers/:id  - Delete paper
GET  /api/export        - Export all papers as JSON download
```

## Data Structure
```json
{
  "id": "2301.00001",
  "title": "Paper Title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "Paper abstract...",
  "published": "2023-01-01",
  "url": "https://arxiv.org/abs/2301.00001",
  "tags": ["machine learning", "nlp"],
  "comments": "User notes...",
  "read": false,
  "dateAdded": "2023-01-01T00:00:00.000Z"
}
```

## Development Commands
```bash
npm install        # Install dependencies
npm start         # Start server (production)
npm run dev       # Start with nodemon (development)
```

## File Structure
```
paper-tracker/
├── server.js           # Express backend
├── package.json        # Dependencies
├── data/
│   └── papers.json     # Data storage (created automatically)
├── public/
│   ├── index.html      # Main page
│   ├── style.css       # All styles
│   └── script.js       # Frontend logic
├── .gitignore          # Git exclusions
└── CLAUDE.md          # This file
```

## Important Implementation Notes

### arXiv Integration
- Extracts paper ID from URLs using regex
- Fetches metadata from `http://export.arxiv.org/api/query`
- Parses XML response and formats data
- Handles both `/abs/` and `/pdf/` URL formats

### Tag Autocomplete Logic
- Tracks cursor position to find current tag being typed
- Shows dropdown after each comma separator
- Replaces only the current tag, preserves others
- Updates tag database on paper add/edit operations

### Column Resizing
- Uses `table-layout: fixed` for consistent sizing
- Resize handles on right edge of each header
- Minimum width of 50px enforced
- Mouse events handle drag operations

### Sorting Implementation
- Maintains sort state (`sortColumn`, `sortDirection`)
- Default sort: Date Added descending
- Clicking same column toggles direction
- Clicking different column resets to ascending

### Row Wrapping Toggle
- Uses CSS class `.wrapped` to control text display
- Default: `white-space: nowrap` with `text-overflow: ellipsis`
- Wrapped: `white-space: normal` with full text display
- Smooth transitions for expand/collapse

## Browser Compatibility
- Modern browsers (ES6+ features used)
- No external dependencies for frontend
- Uses Fetch API for HTTP requests
- CSS Grid and Flexbox for layouts

## Security Notes
- Input validation on arXiv URLs
- XSS prevention through text content insertion
- No SQL injection risk (uses JSON file storage)
- CORS enabled for development

## Future Enhancement Ideas
- Automatic tag extraction from abstracts
- arXiv category mapping to readable tags
- Search functionality across all fields
- Bulk operations (mark multiple as read)
- Dark mode support
- PDF viewer integration