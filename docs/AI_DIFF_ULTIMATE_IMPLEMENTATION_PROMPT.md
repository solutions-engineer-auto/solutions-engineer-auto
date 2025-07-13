# The Ultimate AI Diff System Implementation Prompt for Claude Opus

```xml
<role>
You are an elite Senior React/TypeScript Developer with 10+ years of experience. You specialize in AI integrations and API development. You are extremely careful to never reimplement existing functionality.
</role>

<critical_context>
THE DIFF VISUALIZATION SYSTEM IS 100% COMPLETE AND WORKING! 

Current working flow:
1. User selects text
2. Clicks "Test Diff" button
3. System creates a diff mark showing "TEST" as replacement
4. User clicks the mark to see overlay
5. Accept/reject works perfectly

YOUR ONLY JOB: Replace "TEST" with AI-generated suggestions.
</critical_context>

<existing_working_system>
COMPLETE AND WORKING:
✅ DiffExtensionV2.js - Mark-based diff system
✅ DiffMark.js - Visual highlights (green/red/cyan)
✅ DiffOverlay.jsx - Accept/reject UI
✅ ChangeManagerV2.js - State management
✅ Position tracking with findMarkPositionById()
✅ Test button in toolbar that creates diffs

Working Test Button Code (DocumentEditorPage.jsx line 762):
```javascript
onClick={() => {
  const { selection } = editor.state;
  const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
  
  const change = {
    type: 'modification',
    originalText: selectedText,
    suggestedText: 'TEST', // <-- ONLY THIS NEEDS TO CHANGE
    position: { from: selection.from, to: selection.to },
    instruction: 'Debug test replacement'
  };
  
  if (!editor.storage.diffV2?.isActive) {
    editor.commands.toggleDiffMode();
  }
  
  editor.commands.addChange(change);
}}
```
</existing_working_system>

<what_you_need_to_implement>
1. Create mockAIService.js that returns AI suggestions instead of "TEST"
2. Create editProcessor.js to handle multiple edits from AI response
3. Update the button to call AI service
4. Parse AI responses into the format addChange() expects

THAT'S IT. NOTHING ELSE.
</what_you_need_to_implement>

<ai_response_format>
{
  "edits": [
    {
      "id": "edit-001",
      "type": "modification", // or "deletion", "addition"
      "target": "exact text to find",
      "replacement": "new text or null for deletions",
      "occurrences": [1, 3, 5], // 1-based: which occurrences to edit
      "confidence": 0.95,
      "reason": "Improved clarity"
    }
  ]
}
</ai_response_format>

<code_patterns>
<!-- Existing button handler to modify -->
<current_button>
// This already works - just needs AI integration
onClick={() => {
  const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
  
  const change = {
    type: 'modification',
    originalText: selectedText,
    suggestedText: 'TEST', // Replace with AI suggestion
    position: { from: selection.from, to: selection.to }
  };
  
  editor.commands.addChange(change);
}}
</current_button>

<target_implementation>
onClick={async () => {
  const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
  const instruction = "make it more formal"; // Get from user input
  
  // Get AI suggestions
  const aiResponse = await mockAIService.generateEdits(selectedText, instruction);
  const edits = parseAIResponse(aiResponse);
  
  // Process each edit
  for (const edit of edits) {
    const positions = findAllOccurrences(editor, edit.target);
    
    // Apply to specified occurrences
    edit.occurrences.forEach(occurrence => {
      const index = occurrence - 1; // Convert to 0-based
      if (positions[index]) {
        editor.commands.addChange({
          type: edit.type,
          originalText: edit.target,
          suggestedText: edit.replacement,
          position: positions[index],
          metadata: {
            confidence: edit.confidence,
            reason: edit.reason
          }
        });
      }
    });
  }
}}
</target_implementation>

<success_notification>
// Use existing pattern from your codebase
const successMessage = document.createElement('div')
successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50'
successMessage.innerHTML = `
  <div class="flex items-center space-x-2">
    <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    <span class="text-white">AI suggestions applied</span>
  </div>
`
document.body.appendChild(successMessage)
setTimeout(() => successMessage.remove(), 3000)
</success_notification>
</code_patterns>

<implementation_steps>
1. Create mockAIService.js:
   - generateEdits(text, instruction) returns mock AI response
   - Include variety of edit types
   - Test different scenarios

2. Create editProcessor.js:
   - findAllOccurrences(editor, text) returns positions
   - parseAIResponse(response) extracts edits
   - validateTextMatch(editor, text, position) ensures accuracy

3. Update button handler:
   - Get instruction from user (modal/input)
   - Call AI service
   - Process response
   - Apply edits using existing addChange()

4. Test thoroughly:
   - Multiple occurrences
   - Different edit types
   - Position accuracy
   - Edge cases
</implementation_steps>

<common_pitfalls>
DO NOT:
- Reimplement the diff system (IT WORKS!)
- Create new mark types (use existing)
- Build new overlay UI (use existing)
- Change position tracking (IT WORKS!)

DO:
- Use existing editor.commands.addChange()
- Follow existing UI patterns
- Test with the working system
- Keep it simple
</common_pitfalls>

<testing_approach>
// The diff system already works! Test by:
1. Manually creating a change to verify system works:
   editor.commands.addChange({
     type: 'modification',
     originalText: 'test',
     suggestedText: 'AI suggestion here',
     position: { from: 10, to: 14 }
   })

2. Then test your AI integration:
   - Mock responses first
   - Single edits
   - Multiple edits
   - Edge cases
</testing_approach>

<your_task>
REMEMBER: The diff system is COMPLETE. You're ONLY adding AI integration.

1. Create mockAIService.js with realistic responses
2. Create editProcessor.js for parsing/processing
3. Update the Test Diff button to use AI
4. Test with the existing, working diff system

DO NOT touch:
- DiffExtensionV2.js
- DiffMark.js
- DiffOverlay.jsx
- ChangeManagerV2.js

They already work perfectly!

Begin implementation now.
</your_task>

<thinking>
The user has made it crystal clear - the diff system works completely. I just need to:
1. Create a mock AI service
2. Parse AI responses
3. Feed them to the existing addChange() command
That's it. No reimplementation of anything.
</thinking> 