/* eslint-env jest */

import { ChangeManagerV2 } from '../ChangeManagerV2';

describe('ChangeManagerV2', () => {
  let changeManager;
  let mockEditor;
  
  beforeEach(() => {
    mockEditor = { type: 'mock-editor' };
    changeManager = new ChangeManagerV2(mockEditor);
  });

  describe('addChange', () => {
    it('should add a change and return its ID', () => {
      const change = {
        type: 'addition',
        position: { from: 10, to: 20 },
        originalText: '',
        suggestedText: 'New text'
      };

      const changeId = changeManager.addChange(change);
      
      expect(changeId).toBeTruthy();
      expect(changeManager.getChange(changeId)).toMatchObject({
        ...change,
        id: changeId,
        status: 'pending'
      });
    });

    it('should use provided ID if available', () => {
      const change = {
        id: 'custom-id',
        type: 'deletion',
        position: { from: 30, to: 40 }
      };

      const changeId = changeManager.addChange(change);
      
      expect(changeId).toBe('custom-id');
    });

    it('should notify listeners when change is added', () => {
      const listener = jest.fn();
      changeManager.subscribe(listener);

      const change = { type: 'modification' };
      changeManager.addChange(change);

      expect(listener).toHaveBeenCalledWith({
        event: 'change-added',
        data: expect.objectContaining({ type: 'modification' })
      });
    });
  });

  describe('addBatch', () => {
    it('should add multiple changes as a batch', () => {
      const changes = [
        { type: 'addition', position: { from: 0, to: 0 } },
        { type: 'deletion', position: { from: 10, to: 20 } },
        { type: 'modification', position: { from: 30, to: 40 } }
      ];

      changeManager.addBatch('batch-1', changes);
      
      const allChanges = changeManager.getChanges();
      expect(allChanges).toHaveLength(3);
      expect(allChanges.every(c => c.batchId === 'batch-1')).toBe(true);
    });
  });

  describe('getChanges', () => {
    beforeEach(() => {
      changeManager.addChange({ type: 'addition', status: 'pending' });
      changeManager.addChange({ type: 'deletion', status: 'accepted' });
      changeManager.addChange({ type: 'modification', status: 'pending' });
      changeManager.addChange({ type: 'addition', status: 'rejected' });
    });

    it('should return all changes when no filter provided', () => {
      const changes = changeManager.getChanges();
      expect(changes).toHaveLength(4);
    });

    it('should filter by status', () => {
      const pendingChanges = changeManager.getChanges({ status: 'pending' });
      expect(pendingChanges).toHaveLength(2);
      expect(pendingChanges.every(c => c.status === 'pending')).toBe(true);
    });

    it('should filter by type', () => {
      const additions = changeManager.getChanges({ type: 'addition' });
      expect(additions).toHaveLength(2);
      expect(additions.every(c => c.type === 'addition')).toBe(true);
    });

    it('should filter by multiple criteria', () => {
      const pendingAdditions = changeManager.getChanges({ 
        type: 'addition', 
        status: 'pending' 
      });
      expect(pendingAdditions).toHaveLength(1);
    });
  });

  describe('acceptChange', () => {
    it('should update change status to accepted', () => {
      const changeId = changeManager.addChange({ type: 'addition' });
      
      changeManager.acceptChange(changeId);
      
      const change = changeManager.getChange(changeId);
      expect(change.status).toBe('accepted');
      expect(change.acceptedAt).toBeInstanceOf(Date);
    });

    it('should notify listeners when change is accepted', () => {
      const listener = jest.fn();
      changeManager.subscribe(listener);
      
      const changeId = changeManager.addChange({ type: 'addition' });
      listener.mockClear(); // Clear the add notification
      
      changeManager.acceptChange(changeId);
      
      expect(listener).toHaveBeenCalledWith({
        event: 'change-updated',
        data: expect.objectContaining({ 
          status: 'accepted',
          id: changeId 
        })
      });
    });

    it('should handle non-existent change gracefully', () => {
      expect(() => {
        changeManager.acceptChange('non-existent');
      }).not.toThrow();
    });
  });

  describe('rejectChange', () => {
    it('should update change status to rejected', () => {
      const changeId = changeManager.addChange({ type: 'deletion' });
      
      changeManager.rejectChange(changeId);
      
      const change = changeManager.getChange(changeId);
      expect(change.status).toBe('rejected');
      expect(change.rejectedAt).toBeInstanceOf(Date);
    });
  });

  describe('removeChange', () => {
    it('should remove change from storage', () => {
      const changeId = changeManager.addChange({ type: 'modification' });
      
      changeManager.removeChange(changeId);
      
      expect(changeManager.getChange(changeId)).toBeNull();
      expect(changeManager.getChanges()).toHaveLength(0);
    });

    it('should notify listeners when change is removed', () => {
      const listener = jest.fn();
      const changeId = changeManager.addChange({ type: 'addition' });
      
      changeManager.subscribe(listener);
      listener.mockClear();
      
      changeManager.removeChange(changeId);
      
      expect(listener).toHaveBeenCalledWith({
        event: 'change-removed',
        data: expect.objectContaining({ id: changeId })
      });
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should allow subscribing to events', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      changeManager.subscribe(listener1);
      changeManager.subscribe(listener2);
      
      changeManager.addChange({ type: 'addition' });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should allow unsubscribing from events', () => {
      const listener = jest.fn();
      const unsubscribe = changeManager.subscribe(listener);
      
      changeManager.addChange({ type: 'addition' });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      listener.mockClear();
      
      changeManager.addChange({ type: 'deletion' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      changeManager.addChange({ type: 'addition', status: 'pending' });
      changeManager.addChange({ type: 'deletion', status: 'accepted' });
      changeManager.addChange({ type: 'modification', status: 'pending' });
      changeManager.addChange({ type: 'addition', status: 'rejected' });
      
      const stats = changeManager.getStatistics();
      
      expect(stats).toEqual({
        total: 4,
        pending: 2,
        accepted: 1,
        rejected: 1,
        byType: {
          addition: 2,
          deletion: 1,
          modification: 1
        }
      });
    });
  });

  describe('clear', () => {
    it('should remove all changes and batches', () => {
      changeManager.addBatch('batch-1', [
        { type: 'addition' },
        { type: 'deletion' }
      ]);
      
      expect(changeManager.getChanges()).toHaveLength(2);
      
      changeManager.clear();
      
      expect(changeManager.getChanges()).toHaveLength(0);
    });

    it('should notify listeners when cleared', () => {
      const listener = jest.fn();
      changeManager.subscribe(listener);
      
      changeManager.clear();
      
      expect(listener).toHaveBeenCalledWith({
        event: 'cleared',
        data: {}
      });
    });
  });
}); 