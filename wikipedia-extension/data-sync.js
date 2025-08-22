class DataSync {
  constructor() {
    this.config = new Config();
    this.EXPORT_FILE = 'wikipedia-data.json';
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await this.config.loadConfig();
      this.initialized = true;
    }
  }

  getDataDir() {
    return this.config.getDataPath('wikipedia-extension');
  }

  async exportToFile() {
    const storage = new WikipediaStorage();
    const data = await storage.getData();
    
    if (!data) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.EXPORT_FILE;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importFromFile(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.data) {
        throw new Error('Invalid file format');
      }

      const storage = new WikipediaStorage();
      await storage.setData(importData.data);
      
      return {
        success: true,
        message: `Data imported successfully from ${importData.exportDate}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`
      };
    }
  }

  async syncWithCentralStorage() {
    await this.init();
    try {
      const dataDir = this.getDataDir();
      const response = await fetch(`file://${dataDir}/${this.EXPORT_FILE}`);
      if (response.ok) {
        const centralData = await response.json();
        const storage = new WikipediaStorage();
        await storage.setData(centralData.data);
        return { success: true, message: 'Synced with central storage' };
      }
    } catch (error) {
      console.log('Central storage not accessible, using local storage only');
    }
    return { success: false, message: 'Central storage not accessible' };
  }

  async saveToLocalFile() {
    await this.init();
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      const storage = new WikipediaStorage();
      const data = await storage.getData();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: data
      };

      try {
        const dataDir = this.getDataDir();
        await window.electronAPI.writeFile(
          `${dataDir}/${this.EXPORT_FILE}`,
          JSON.stringify(exportData, null, 2)
        );
        return { success: true, message: 'Data saved to central location' };
      } catch (error) {
        return { success: false, message: `Save failed: ${error.message}` };
      }
    } else {
      this.exportToFile();
      return { success: true, message: 'Data exported as download' };
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataSync;
}