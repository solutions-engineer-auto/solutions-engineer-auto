# AI Diff Implementation - Missing Pieces & Improvements

## 🔍 What We Found in Your Codebase

### ✅ Existing Patterns to Follow
1. **API Error Handling**: Consistent `getRequestBody` helper with connection checks
2. **Supabase Realtime**: Well-implemented subscriptions in `useAIChat.js`
3. **UI Components**: Beautiful glassmorphic modals with `glass-panel` class
4. **Authentication**: Proper `supabase.auth` usage with RLS policies
5. **Success Notifications**: Temporary DOM elements pattern (3s timeout)
6. **Loading States**: Progress indicators with percentage tracking

### 🎨 UI/UX Patterns to Maintain
- **Colors**: Cyan primary (`cyan-400/500`), white with opacity
- **Animations**: `animate-in fade-in zoom-in duration-200`
- **Modals**: Using `createPortal` to document.body
- **Keyboard**: Escape key handling, Cmd/Ctrl shortcuts
- **Hover States**: `hover:bg-white/10` pattern

## 🚨 Missing Pieces That Could Cause Issues

### 1. Database Schema for AI Edits
**Problem**: No tables for storing AI suggestions
**Solution**: Create these tables:

```sql
-- AI edit requests table
CREATE TABLE ai_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  instruction TEXT NOT NULL,
  selected_text TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- AI suggestions table  
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ai_edit_requests(id) ON DELETE CASCADE,
  suggestions JSONB NOT NULL, -- Store the full JSON response
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_suggestions;
```

### 2. Rate Limiting Configuration
**Problem**: No rate limiting visible for AI calls
**Solution**: Add to your implementation:

```javascript
// src/utils/rateLimiter.js
const userRequestCounts = new Map();

export function checkRateLimit(userId, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const userRequests = userRequestCounts.get(userId) || [];
  
  // Filter out old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= limit) {
    return { allowed: false, retryAfter: windowMs - (now - recentRequests[0]) };
  }
  
  recentRequests.push(now);
  userRequestCounts.set(userId, recentRequests);
  return { allowed: true };
}
```

### 3. Environment Variables Needed
Add to `.env.local`:
```bash
# AI Service Configuration
VITE_AI_SERVICE=openai # or anthropic, custom
VITE_OPENAI_API_KEY=sk-...
VITE_AI_MODEL=gpt-4-turbo-preview
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.3

# Feature Flags
VITE_AI_EDIT_ENABLED=true
VITE_AI_EDIT_RATE_LIMIT=10
VITE_AI_EDIT_RATE_WINDOW=60000

# Performance
VITE_MAX_DOCUMENT_SIZE=100000 # characters
VITE_AI_TIMEOUT_MS=30000
```

### 4. Error Recovery Patterns
**Problem**: Need graceful handling of partial failures
**Solution**: Implement these patterns:

```javascript
// src/utils/errorRecovery.js
export class EditRecoveryManager {
  constructor() {
    this.pendingEdits = new Map();
  }
  
  saveEditState(editId, state) {
    sessionStorage.setItem(`edit_recovery_${editId}`, JSON.stringify({
      state,
      timestamp: Date.now()
    }));
  }
  
  recoverEdit(editId) {
    const saved = sessionStorage.getItem(`edit_recovery_${editId}`);
    if (saved) {
      const { state, timestamp } = JSON.parse(saved);
      // Only recover if less than 1 hour old
      if (Date.now() - timestamp < 3600000) {
        return state;
      }
    }
    return null;
  }
}
```

### 5. Input Sanitization
**Problem**: AI prompts need validation
**Solution**: Add sanitizer:

```javascript
// src/utils/promptSanitizer.js
export function sanitizePrompt(instruction, maxLength = 500) {
  // Remove potential injection attempts
  let sanitized = instruction
    .replace(/[<>]/g, '') // Remove HTML
    .replace(/\\/g, '') // Remove escape chars
    .trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  // Check for minimum meaningful length
  if (sanitized.length < 3) {
    throw new Error('Instruction too short');
  }
  
  return sanitized;
}
```

### 6. Performance Monitoring
**Problem**: No visibility into AI performance
**Solution**: Add telemetry:

```javascript
// src/utils/performanceMonitor.js
export function trackAIOperation(operation, metadata = {}) {
  const start = performance.now();
  
  return {
    complete: (success = true) => {
      const duration = performance.now() - start;
      
      // Log to console in dev
      if (import.meta.env.DEV) {
        console.log(`[AI Performance] ${operation}:`, {
          duration: `${duration.toFixed(2)}ms`,
          success,
          ...metadata
        });
      }
      
      // Could send to analytics service
      // analytics.track('ai_operation', { operation, duration, success, ...metadata });
    }
  };
}
```

### 7. Testing Helpers
**Problem**: Need consistent test data
**Solution**: Create factories:

```javascript
// src/test/factories.js
export const createMockEdit = (overrides = {}) => ({
  id: 'edit-' + Math.random().toString(36).substr(2, 9),
  type: 'modification',
  target: 'sample text',
  replacement: 'improved text',
  confidence: 0.95,
  reason: 'Improved clarity',
  occurrences: [1],
  ...overrides
});

export const createMockAIResponse = (edits = []) => ({
  edits: edits.length ? edits : [createMockEdit()],
  summary: 'Made improvements to text clarity',
  confidence: 0.92
});
```

## 🎯 Implementation Recommendations

### 1. Start with Mock Service Configuration
```javascript
// src/services/mockAIService.js
export const MOCK_RESPONSES = {
  formal: {
    patterns: [
      { match: /make.*formal/i, replacements: ['therefore', 'consequently', 'furthermore'] },
      { match: /remove.*casual/i, deletions: ['like', 'kind of', 'sort of'] }
    ]
  },
  // Add more patterns...
};
```

### 2. Use Existing UI Components
Follow the pattern from `ConfirmationModal.jsx`:
- Glass panel styling
- Portal rendering
- Escape key handling
- Loading states

### 3. Follow Existing API Patterns
From `api/langgraph/start.js`:
- Universal body parser
- Connection state checking
- Proper error responses

### 4. Integrate with Existing State
Use the `documentProcessor` service pattern for handling AI responses.

## 📋 Pre-Implementation Checklist

Before starting, ensure you have:
- [ ] Database migrations written for AI tables
- [ ] Environment variables configured
- [ ] Rate limiting strategy decided
- [ ] Error recovery approach planned
- [ ] Mock data prepared for testing
- [ ] Performance budgets set (response times)
- [ ] Browser support requirements confirmed
- [ ] Accessibility requirements reviewed

## 🚀 Quick Wins

1. **Reuse `FileUploadDropzone` pattern** for the AI instruction input
2. **Copy `AgentActivity` component** for AI processing status
3. **Use existing `glass-panel` classes** for all UI elements
4. **Follow `useAIChat` hook pattern** for state management
5. **Leverage `supabase` realtime** for suggestion delivery

With these additions, your AI implementation will be much more robust! 