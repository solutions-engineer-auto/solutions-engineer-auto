/**
 * DiffExtension - TipTap extension for AI-powered diff functionality
 * 
 * This extension integrates with TipTap to provide:
 * - Text selection handling with quarantine zones (Phase 1)
 * - Position tracking that survives document changes (Phase 1)
 * - Context extraction for AI requests (Phase 1)
 * - Visual diff display with accept/reject UI (Phase 2)
 * - Change management and tracking (Phase 2)
 */

// Import both V1 and V2 implementations
import { DiffExtensionV1 } from './DiffExtensionV1'
import { DiffExtensionV2 } from './DiffExtensionV2'

// Export V2 as the default (it includes all V1 functionality)
export const DiffExtension = DiffExtensionV2

// Also export named versions for explicit usage
export { DiffExtensionV1, DiffExtensionV2 }

// Export supporting classes
export { SelectionHandler } from './SelectionHandler'
export { ContextBuilder } from '../../services/contextBuilder'
export { ChangeManagerV2 } from '../../services/ChangeManagerV2'

// Helper function to create the extension with options
export function createDiffExtension(options = {}) {
  return DiffExtension.configure(options)
} 