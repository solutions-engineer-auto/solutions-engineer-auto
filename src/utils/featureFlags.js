/**
 * Feature flag management utility
 * Checks environment variables or falls back to defaults
 */

const FEATURE_FLAGS = {
  // AI Diff System feature flag
  // In Vite, use import.meta.env instead of process.env
  ENABLE_DIFF: import.meta.env?.VITE_ENABLE_DIFF === 'true' || true, // Default to true for development
  
  // Future feature flags can be added here
  // ENABLE_COLLABORATION: import.meta.env?.VITE_ENABLE_COLLABORATION === 'true',
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - The name of the feature to check
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return FEATURE_FLAGS[featureName] || false;
}

/**
 * Get all feature flags for debugging
 * @returns {Object} All feature flags and their states
 */
export function getAllFeatureFlags() {
  return { ...FEATURE_FLAGS };
}

// Export individual flags for convenience
export const DIFF_ENABLED = FEATURE_FLAGS.ENABLE_DIFF; 