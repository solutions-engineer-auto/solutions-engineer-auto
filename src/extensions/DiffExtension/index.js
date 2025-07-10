/**
 * DiffExtension - TipTap extension for AI-powered diff functionality
 * 
 * This extension integrates with TipTap to provide:
 * - Visual diff display with accept/reject UI (Phase 2)
 * - Change management and tracking (Phase 2)
 * 
 * Note: Phase 1 components (SelectionHandler, ContextBuilder) are deprecated
 * in favor of the V2 mark-based implementation.
 */

// Import only V2 implementation
// V1 is deprecated and no longer exported
import { DiffExtensionV2 } from './DiffExtensionV2.js'

// Export V2 as the default
export const DiffExtension = DiffExtensionV2

// Also export as named export for explicit usage
export { DiffExtensionV2 }

// Export only the actively used V2 dependency
export { ChangeManagerV2 } from '../../services/ChangeManagerV2.js'

// Helper function to create the extension with options
export function createDiffExtension(options = {}) {
  return DiffExtension.configure(options)
} 