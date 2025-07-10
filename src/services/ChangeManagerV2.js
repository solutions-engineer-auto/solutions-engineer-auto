/**
 * ChangeManagerV2 - Manages document changes for the diff system
 * 
 * This is a simplified version focused on core functionality.
 * Stores changes in memory and notifies listeners of updates.
 */

export class ChangeManagerV2 {
  constructor() {
    // Editor will be accessed dynamically when needed, not stored
    this.changes = new Map(); // changeId -> change object
    this.batches = new Map(); // batchId -> array of changeIds
    this.listeners = new Set(); // subscriber callbacks
    this.changeCounter = 0;
  }

  /**
   * Add a single change
   * @param {Object} change - Change object with position, type, etc.
   * @returns {string} - Generated change ID
   */
  addChange(change) {
    const changeId = change.id || `change-${Date.now()}-${this.changeCounter++}`;
    
    const changeWithDefaults = {
      id: changeId,
      status: 'pending',
      createdAt: new Date(),
      ...change
    };
    
    this.changes.set(changeId, changeWithDefaults);
    this.notifyListeners('change-added', changeWithDefaults);
    
    return changeId;
  }

  /**
   * Add multiple changes as a batch
   * @param {string} batchId - Batch identifier
   * @param {Array} changes - Array of change objects
   */
  addBatch(batchId, changes) {
    const changeIds = [];
    
    changes.forEach(change => {
      const changeId = this.addChange({
        ...change,
        batchId
      });
      changeIds.push(changeId);
    });
    
    this.batches.set(batchId, changeIds);
    this.notifyListeners('batch-added', { batchId, changeIds });
  }

  /**
   * Get a specific change by ID
   * @param {string} changeId
   * @returns {Object|null}
   */
  getChange(changeId) {
    return this.changes.get(changeId) || null;
  }

  /**
   * Get changes filtered by criteria
   * @param {Object} filter - Filter criteria (e.g., { status: 'pending' })
   * @returns {Array}
   */
  getChanges(filter = {}) {
    const allChanges = Array.from(this.changes.values());
    
    if (Object.keys(filter).length === 0) {
      return allChanges;
    }
    
    return allChanges.filter(change => {
      return Object.entries(filter).every(([key, value]) => change[key] === value);
    });
  }

  /**
   * Accept a change
   * @param {string} changeId
   */
  acceptChange(changeId) {
    const change = this.changes.get(changeId);
    if (!change) return;
    
    change.status = 'accepted';
    change.acceptedAt = new Date();
    
    this.notifyListeners('change-updated', change);
  }

  /**
   * Reject a change
   * @param {string} changeId
   */
  rejectChange(changeId) {
    const change = this.changes.get(changeId);
    if (!change) return;
    
    change.status = 'rejected';
    change.rejectedAt = new Date();
    
    this.notifyListeners('change-updated', change);
  }

  /**
   * Update a change with new properties
   * @param {string} changeId
   * @param {Object} updates - Properties to update
   */
  updateChange(changeId, updates) {
    const change = this.changes.get(changeId);
    if (!change) return;
    
    Object.assign(change, updates);
    this.notifyListeners('change-updated', change);
  }

  /**
   * Remove a change
   * @param {string} changeId
   */
  removeChange(changeId) {
    const change = this.changes.get(changeId);
    if (!change) return;
    
    this.changes.delete(changeId);
    this.notifyListeners('change-removed', change);
  }

  /**
   * Subscribe to change events
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, data });
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    });
  }

  /**
   * Get statistics about changes
   * @returns {Object}
   */
  getStatistics() {
    const changes = Array.from(this.changes.values());
    
    return {
      total: changes.length,
      pending: changes.filter(c => c.status === 'pending').length,
      accepted: changes.filter(c => c.status === 'accepted').length,
      rejected: changes.filter(c => c.status === 'rejected').length,
      byType: {
        addition: changes.filter(c => c.type === 'addition').length,
        deletion: changes.filter(c => c.type === 'deletion').length,
        modification: changes.filter(c => c.type === 'modification').length
      }
    };
  }

  /**
   * Clear all changes
   */
  clear() {
    this.changes.clear();
    this.batches.clear();
    this.notifyListeners('cleared', {});
  }

  /**
   * Handle real-time updates (for future Supabase integration)
   * @param {Object} change
   */
  handleRealtimeChange(change) {
    // For future real-time support
    this.changes.set(change.id, change);
    this.notifyListeners('realtime-update', change);
  }

  /**
   * Handle batch updates (for future Supabase integration)
   * @param {Object} batch
   */
  handleBatchUpdate(batch) {
    // For future real-time support
    this.notifyListeners('batch-update', batch);
  }

  /**
   * Handle change updates (for future Supabase integration)
   * @param {Object} change
   */
  handleChangeUpdate(change) {
    // For future real-time support
    const existing = this.changes.get(change.id);
    if (existing) {
      Object.assign(existing, change);
      this.notifyListeners('change-updated', existing);
    }
  }
}

// Export default instance factory
export function createChangeManager() {
  return new ChangeManagerV2();
} 