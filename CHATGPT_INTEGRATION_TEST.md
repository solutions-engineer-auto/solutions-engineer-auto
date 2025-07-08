# ChatGPT Integration Test Checklist

## Prerequisites
- [ ] Ensure `.env` file exists with `VITE_OPENAI_API_KEY` set to a valid OpenAI API key
- [ ] Run `npm install` to ensure openai package is installed
- [ ] Start the development server with `npm run dev`

## Feature Tests

### 1. AI Chat Panel Integration
- [ ] Open any document in the editor
- [ ] Click the "🤖 AI Assistant" button or press Cmd/Ctrl+Shift+L
- [ ] Verify the AI chat panel opens on the right side
- [ ] Send a message like "What is this document about?"
- [ ] Verify you receive a streaming response from ChatGPT (not mock data)
- [ ] Test various queries:
  - [ ] "Help me improve this document"
  - [ ] "Summarize the main points"
  - [ ] "Add a conclusion section"
- [ ] Verify streaming shows character by character
- [ ] Close and reopen chat to verify conversation persists

### 2. Document Generation from Account Page
- [ ] Navigate to any account detail page
- [ ] Click the "Generate Document" button (sparkle icon)
- [ ] Verify the AI Generate modal appears
- [ ] If API key is missing, verify error message shows
- [ ] Enter a prompt like "Create a Statement of Work for Project Phoenix"
- [ ] Enter a title like "Project Phoenix SOW"
- [ ] Click "Generate Document"
- [ ] Verify:
  - [ ] Progress indicators show (thinking, generating)
  - [ ] Preview of generated content appears
  - [ ] Document is created and you're redirected to editor
  - [ ] Generated content appears in the editor

### 3. Text Regeneration in Editor
- [ ] Open any document in the editor
- [ ] Select some text
- [ ] Press Cmd/Ctrl+K
- [ ] Verify AI regeneration modal appears with selected text
- [ ] If API key is missing, verify error message shows
- [ ] Enter instruction like "Make this more formal"
- [ ] Click "Regenerate"
- [ ] Verify:
  - [ ] Loading spinner appears
  - [ ] Selected text is replaced with AI-generated version
  - [ ] Document shows "Unsaved changes"
  - [ ] Modal closes automatically

### 4. Error Handling
- [ ] Test with invalid API key
  - [ ] Set `VITE_OPENAI_API_KEY` to "invalid-key"
  - [ ] Try all three features above
  - [ ] Verify appropriate error messages appear
- [ ] Test rate limiting
  - [ ] Send multiple rapid requests
  - [ ] Verify exponential backoff works
- [ ] Test network errors
  - [ ] Disconnect internet
  - [ ] Try AI features
  - [ ] Verify error messages appear

### 5. Performance Tests
- [ ] Generate a long document (2000+ words)
- [ ] Verify streaming doesn't freeze UI
- [ ] Test with multiple chat messages
- [ ] Verify memory usage stays reasonable

## Common Issues & Solutions

### API Key Not Working
1. Check `.env` file exists in project root
2. Ensure key starts with `sk-`
3. Restart dev server after adding key
4. Check browser console for specific errors

### Streaming Not Working
1. Verify you're seeing character-by-character output
2. Check network tab for EventSource connections
3. Look for console errors about streams

### Rate Limiting
- The integration includes automatic retry with exponential backoff
- If you hit rate limits, wait a minute and try again

## Notes
- This is a "hacky" branch implementation as requested
- All AI features use the same OpenAI service module
- Streaming is implemented for better UX
- Error handling and retry logic included 