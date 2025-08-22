class Config {
  constructor() {
    this.projectRoot = null;
    this.loaded = false;
  }

  async loadConfig() {
    if (this.loaded) return;

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const envPath = await this.resolveProjectRoot();
        const envContent = await window.electronAPI.readFile(`${envPath}/.env`);
        this.parseEnvContent(envContent);
      } else {
        this.projectRoot = await this.detectProjectRoot();
      }
      this.loaded = true;
    } catch (error) {
      console.warn('Could not load .env file, using fallback detection');
      this.projectRoot = await this.detectProjectRoot();
      this.loaded = true;
    }
  }

  parseEnvContent(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('PROJECT_ROOT=')) {
        this.projectRoot = line.split('=')[1].trim();
        break;
      }
    }
  }

  async detectProjectRoot() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const currentPath = await window.electronAPI.getCurrentPath();
        return currentPath.replace(/\/wikipedia-extension.*$/, '');
      } catch (error) {
        console.error('Could not detect project root:', error);
      }
    }
    
    return null;
  }

  async resolveProjectRoot() {
    const extensionPath = chrome.runtime.getURL('');
    const pathMatch = extensionPath.match(/chrome-extension:\/\/[^\/]+\/(.*)/);
    if (pathMatch) {
      const relativePath = pathMatch[1];
      const parts = relativePath.split('/');
      const vibeCodedIndex = parts.findIndex(part => part === 'vibe-coded');
      if (vibeCodedIndex !== -1) {
        return '/' + parts.slice(0, vibeCodedIndex + 1).join('/');
      }
    }
    
    return this.detectProjectRoot();
  }

  getProjectRoot() {
    return this.projectRoot;
  }

  getDataPath(projectName) {
    if (!this.projectRoot) {
      console.warn('Project root not available, using relative path');
      return `data/${projectName}`;
    }
    return `${this.projectRoot}/data/${projectName}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}