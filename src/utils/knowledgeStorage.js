// Frontend-only storage for global knowledge markers
const GLOBAL_KNOWLEDGE_KEY = 'se_auto_global_knowledge';

export const knowledgeStorage = {
  // Mark document as global
  markAsGlobal(documentId) {
    try {
      const globals = this.getGlobalDocuments();
      if (!globals.includes(documentId)) {
        globals.push(documentId);
        localStorage.setItem(GLOBAL_KNOWLEDGE_KEY, JSON.stringify(globals));
        
        // Dispatch custom event for cross-tab sync
        window.dispatchEvent(new CustomEvent('globalKnowledgeUpdated', {
          detail: { action: 'add', documentId }
        }));
      }
    } catch (error) {
      console.error('Error marking document as global:', error);
    }
  },
  
  // Get all global document IDs
  getGlobalDocuments() {
    try {
      const stored = localStorage.getItem(GLOBAL_KNOWLEDGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading global documents:', error);
      return [];
    }
  },
  
  // Check if document is marked as global
  isGlobal(documentId) {
    return this.getGlobalDocuments().includes(documentId);
  },
  
  // Remove global marker
  unmarkAsGlobal(documentId) {
    try {
      const globals = this.getGlobalDocuments();
      const filtered = globals.filter(id => id !== documentId);
      localStorage.setItem(GLOBAL_KNOWLEDGE_KEY, JSON.stringify(filtered));
      
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent('globalKnowledgeUpdated', {
        detail: { action: 'remove', documentId }
      }));
    } catch (error) {
      console.error('Error unmarking document as global:', error);
    }
  },
  
  // Clear all global markers (for testing/reset)
  clearAll() {
    try {
      localStorage.removeItem(GLOBAL_KNOWLEDGE_KEY);
      window.dispatchEvent(new CustomEvent('globalKnowledgeUpdated', {
        detail: { action: 'clear' }
      }));
    } catch (error) {
      console.error('Error clearing global documents:', error);
    }
  }
}; 