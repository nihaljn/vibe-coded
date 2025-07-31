class PaperTracker {
    constructor() {
        this.papers = [];
        this.currentFilter = 'all';
        this.currentEditingPaper = null;
        this.allTags = new Set();
        this.sortColumn = 'dateAdded';
        this.sortDirection = 'desc';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPapers();
    }

    bindEvents() {
        document.getElementById('addPaperForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPaper();
        });

        document.getElementById('showAll').addEventListener('click', () => {
            this.setFilter('all');
        });

        document.getElementById('showHighlighted').addEventListener('click', () => {
            this.setFilter('highlighted');
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('editModal')) {
                this.closeModal();
            }
        });
    }

    async loadPapers() {
        try {
            const response = await fetch('/api/papers');
            this.papers = await response.json();
            this.updateAllTags();
            this.renderPapers();
        } catch (error) {
            this.showError('Failed to load papers');
        }
    }

    updateAllTags() {
        this.allTags.clear();
        this.papers.forEach(paper => {
            paper.tags.forEach(tag => {
                this.allTags.add(tag.toLowerCase());
            });
        });
    }

    async addPaper() {
        const url = document.getElementById('arxivUrl').value.trim();
        if (!url) return;

        const submitBtn = document.querySelector('#addPaperForm button');
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/papers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            this.papers.unshift(data);
            this.updateAllTags();
            this.renderPapers();
            document.getElementById('arxivUrl').value = '';
            this.showSuccess('Paper added successfully!');
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.textContent = 'Add Paper';
            submitBtn.disabled = false;
        }
    }

    async deletePaper(paperId) {
        if (!confirm('Are you sure you want to delete this paper?')) return;

        try {
            const response = await fetch(`/api/papers/${paperId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete paper');
            }

            this.papers = this.papers.filter(p => p.id !== paperId);
            this.renderPapers();
            this.showSuccess('Paper deleted successfully!');
        } catch (error) {
            this.showError(error.message);
        }
    }

    async toggleHighlight(paperId) {
        try {
            const paper = this.papers.find(p => p.id === paperId);
            if (!paper) return;

            const newHighlightState = !paper.highlighted;
            
            const response = await fetch(`/api/papers/${paperId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ highlighted: newHighlightState }),
            });

            const updatedPaper = await response.json();

            if (!response.ok) {
                throw new Error(updatedPaper.error);
            }

            const index = this.papers.findIndex(p => p.id === paperId);
            this.papers[index] = updatedPaper;
            this.renderPapers();
            this.showSuccess(`Paper ${newHighlightState ? 'highlighted' : 'unhighlighted'} successfully!`);
        } catch (error) {
            this.showError(error.message);
        }
    }

    editPaper(paperId) {
        const paper = this.papers.find(p => p.id === paperId);
        if (!paper) return;

        this.currentEditingPaper = paper;
        document.getElementById('editTags').value = paper.tags.join(', ');
        document.getElementById('editComments').value = paper.comments;
        document.getElementById('editModal').style.display = 'block';
        
        this.initTagAutocomplete();
    }

    initTagAutocomplete() {
        const input = document.getElementById('editTags');
        const dropdown = document.getElementById('tagDropdown');
        let selectedIndex = -1;

        input.addEventListener('input', () => {
            this.handleTagInput(input, dropdown);
            selectedIndex = -1;
        });

        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.tag-dropdown-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.updateSelection(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                this.updateSelection(items, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });
    }

    handleTagInput(input, dropdown) {
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // Find the current tag being typed
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        
        const lastComma = beforeCursor.lastIndexOf(',');
        const nextComma = afterCursor.indexOf(',');
        
        const currentTag = beforeCursor.substring(lastComma + 1).trim();
        
        if (currentTag.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        // Find matching tags
        const matches = Array.from(this.allTags).filter(tag => 
            tag.includes(currentTag.toLowerCase()) && tag !== currentTag.toLowerCase()
        );

        if (matches.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        // Show dropdown with matches
        dropdown.innerHTML = matches.slice(0, 5).map(tag => 
            `<div class="tag-dropdown-item" data-tag="${tag}">${tag}</div>`
        ).join('');

        dropdown.style.display = 'block';

        // Add click handlers
        dropdown.querySelectorAll('.tag-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const selectedTag = item.dataset.tag;
                const beforeTag = value.substring(0, lastComma + 1);
                const afterTag = nextComma >= 0 ? value.substring(cursorPos + nextComma) : '';
                
                const newValue = beforeTag + (beforeTag.trim() ? ' ' : '') + selectedTag + (afterTag ? ',' + afterTag : '');
                input.value = newValue;
                
                const newCursorPos = beforeTag.length + (beforeTag.trim() ? 1 : 0) + selectedTag.length;
                input.setSelectionRange(newCursorPos, newCursorPos);
                
                dropdown.style.display = 'none';
                input.focus();
            });
        });
    }

    updateSelection(items, selectedIndex) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }

    async saveEdit() {
        if (!this.currentEditingPaper) return;

        const tags = document.getElementById('editTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);
        const comments = document.getElementById('editComments').value.trim();

        try {
            const response = await fetch(`/api/papers/${this.currentEditingPaper.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tags, comments }),
            });

            const updatedPaper = await response.json();

            if (!response.ok) {
                throw new Error(updatedPaper.error);
            }

            const index = this.papers.findIndex(p => p.id === this.currentEditingPaper.id);
            this.papers[index] = updatedPaper;
            this.updateAllTags();
            this.renderPapers();
            this.closeModal();
            this.showSuccess('Paper updated successfully!');
        } catch (error) {
            this.showError(error.message);
        }
    }

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentEditingPaper = null;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const buttonId = filter === 'all' ? 'showAll' : 
                        filter === 'highlighted' ? 'showHighlighted' : 
                        `show${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
        document.getElementById(buttonId).classList.add('active');
        this.renderPapers();
    }

    getFilteredPapers() {
        let filtered;
        switch (this.currentFilter) {
            case 'highlighted':
                filtered = this.papers.filter(p => p.highlighted);
                break;
            default:
                filtered = this.papers;
        }
        
        return this.sortPapers(filtered);
    }

    sortPapers(papers) {
        return [...papers].sort((a, b) => {
            let aVal, bVal;
            
            switch (this.sortColumn) {
                case 'title':
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case 'abstract':
                    aVal = a.abstract.toLowerCase();
                    bVal = b.abstract.toLowerCase();
                    break;
                case 'authors':
                    aVal = a.authors.join(', ').toLowerCase();
                    bVal = b.authors.join(', ').toLowerCase();
                    break;
                case 'published':
                    aVal = new Date(a.published);
                    bVal = new Date(b.published);
                    break;
                case 'dateAdded':
                    aVal = new Date(a.dateAdded);
                    bVal = new Date(b.dateAdded);
                    break;
                case 'tags':
                    aVal = a.tags.join(', ').toLowerCase();
                    bVal = b.tags.join(', ').toLowerCase();
                    break;
                case 'comments':
                    aVal = (a.comments || '').toLowerCase();
                    bVal = (b.comments || '').toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            let comparison = 0;
            if (aVal > bVal) comparison = 1;
            else if (aVal < bVal) comparison = -1;
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderPapers();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        
        return `${month} ${day}, ${year}`;
    }

    renderPapers() {
        const container = document.getElementById('papers');
        const filteredPapers = this.getFilteredPapers();

        if (filteredPapers.length === 0) {
            const filterText = this.currentFilter === 'all' ? 'Add your first arXiv paper above!' : 
                              this.currentFilter === 'highlighted' ? 'No highlighted papers.' : 
                              `No ${this.currentFilter} papers.`;
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No papers found</h3>
                    <p>${filterText}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="papers-table-container">
                <table class="papers-table" id="papersTable">
                    <thead>
                        <tr>
                            <th class="resizable sortable" data-column="title">Title<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th class="resizable sortable" data-column="abstract">Abstract<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th class="resizable sortable" data-column="authors">Authors<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th class="resizable sortable" data-column="published">Published<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th class="resizable sortable" data-column="dateAdded">Date Added<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th class="resizable sortable" data-column="tags">Tags<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th class="resizable sortable" data-column="comments">Comments<span class="sort-arrow"></span><div class="resize-handle"></div></th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredPapers.map(paper => `
                            <tr class="paper-row ${paper.highlighted ? 'highlighted-row' : ''}" data-paper-id="${paper.id}" onclick="tracker.toggleRowWrap(this, event)">
                                <td class="title-cell">
                                    <a href="${paper.url}" target="_blank" onclick="event.stopPropagation()">${paper.title}</a>
                                </td>
                                <td class="abstract-cell">${paper.abstract}</td>
                                <td class="authors-cell">${paper.authors.join(', ')}</td>
                                <td class="date-cell">${this.formatDate(paper.published)}</td>
                                <td class="date-added-cell">${this.formatDate(paper.dateAdded)}</td>
                                <td class="tags-cell">
                                    ${paper.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                </td>
                                <td class="comments-cell">${paper.comments || ''}</td>
                                <td class="actions-cell">
                                    <button class="btn btn-edit" onclick="event.stopPropagation(); tracker.editPaper('${paper.id}')">Edit</button>
                                    <button class="btn btn-highlight ${paper.highlighted ? 'highlighted' : ''}" onclick="event.stopPropagation(); tracker.toggleHighlight('${paper.id}')">${paper.highlighted ? 'Unhighlight' : 'Highlight'}</button>
                                    <button class="btn btn-delete" onclick="event.stopPropagation(); tracker.deletePaper('${paper.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        this.initResizableColumns();
        this.initSorting();
    }

    initSorting() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't sort when clicking on resize handle
                if (e.target.classList.contains('resize-handle')) return;
                
                const column = header.dataset.column;
                this.handleSort(column);
                this.updateSortArrows();
            });
        });
        this.updateSortArrows();
    }

    updateSortArrows() {
        document.querySelectorAll('.sortable').forEach(header => {
            const arrow = header.querySelector('.sort-arrow');
            const column = header.dataset.column;
            
            if (column === this.sortColumn) {
                arrow.textContent = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
                header.classList.add('sorted');
            } else {
                arrow.textContent = ' ↕';
                header.classList.remove('sorted');
            }
        });
    }

    toggleRowWrap(row, event) {
        // Prevent toggling when clicking on buttons or links
        if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') {
            return;
        }
        
        row.classList.toggle('wrapped');
    }

    initResizableColumns() {
        const table = document.getElementById('papersTable');
        if (!table) return;

        const resizeHandles = table.querySelectorAll('.resize-handle');
        
        resizeHandles.forEach((handle) => {
            let isResizing = false;
            let startX = 0;
            let startWidth = 0;
            let column = null;

            handle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                column = handle.parentElement;
                startWidth = column.offsetWidth;
                
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing || !column) return;
                
                const diff = e.clientX - startX;
                const newWidth = Math.max(50, startWidth + diff);
                column.style.width = newWidth + 'px';
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    column = null;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        });
    }

    async exportData() {
        try {
            const response = await fetch('/api/export');
            const data = await response.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `papers-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess('Data exported successfully!');
        } catch (error) {
            this.showError('Failed to export data');
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const existing = document.querySelector('.message');
        if (existing) existing.remove();

        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = message;
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        `;

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
}

const tracker = new PaperTracker();