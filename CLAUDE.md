# Vibe Coded - Claude Memory

## Project Structure
This repository contains multiple AI-assisted projects, each in its own subdirectory. All project data is centralized in the `data/` directory at the root level.

## Environment Configuration

**CRITICAL**: All projects use the `.env` file at the root to resolve the absolute path to the vibe-coded directory.

### .env File Structure
```bash
# .env (at project root)
PROJECT_ROOT=/absolute/path/to/vibe-coded
```

### Path Resolution Rules
1. **Never hardcode absolute paths** in project code
2. **Always use relative paths** from `PROJECT_ROOT`
3. **Projects automatically detect** PROJECT_ROOT from `.env`
4. **Fallback detection** if `.env` is unavailable

## Data Organization
```
data/
├── paper-tracker/        # arXiv paper tracking data
│   └── papers.json
└── wikipedia-extension/  # Wikipedia extension data exports
    ├── README.md
    └── wikipedia-data.json (when exported)
```

## Workflow Instructions

### Project-Specific Work
When asked to work on a specific project within this repository, always:
1. First search for and read the CLAUDE.md file within that project's subdirectory
2. Use the project-specific context and instructions from that CLAUDE.md
3. Follow any project-specific conventions, architecture notes, and implementation details
4. Remember that all data files are stored in `data/{project-name}/` at the root level
5. **NEVER hardcode absolute paths** - always use PROJECT_ROOT from `.env`

### Current Projects
- **paper-tracker/**: arXiv paper tracking web application
  - Data stored in `data/paper-tracker/papers.json`
  - Uses Node.js server with relative path `../data/paper-tracker/papers.json`
  
- **wikipedia-extension/**: Browser extension for Wikipedia tracking
  - Local browser storage with export/import to `data/wikipedia-extension/`
  - Uses config.js to resolve PROJECT_ROOT from .env
  - Supports data synchronization between browser and file system

## Data Benefits
- **Centralized**: All project data in one location for easy backup
- **Organized**: Each project has its own data subdirectory
- **Portable**: Data exists independently of project code via .env configuration
- **Backup-friendly**: Single `data/` directory can be synced/backed up
- **Version control**: Data directory can be optionally included in git
- **Machine-portable**: .env file allows easy migration between systems

## General Guidelines
- Each project may have different tech stacks, conventions, and requirements
- Always check the project's subdirectory for its own README.md and CLAUDE.md files
- Respect project-specific coding standards and architectural decisions
- All projects use the centralized data structure in `data/{project-name}/`

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.