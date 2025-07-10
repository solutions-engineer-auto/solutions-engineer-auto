// AI Diff System Demo Script
// This script tests the diff visualization functionality
// Run this in the browser console after the editor has loaded

(function() {
  console.log('🚀 AI Diff Demo - Starting...')
  
  // Wait for editor to be ready
  function waitForEditor() {
    return new Promise((resolve) => {
      const checkEditor = setInterval(() => {
        if (window.editor && window.editor.state && window.editor.state.doc) {
          clearInterval(checkEditor)
          resolve()
        }
      }, 100)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkEditor)
        console.error('❌ Editor not found after 5 seconds')
      }, 5000)
    })
  }
  
  async function runDemo() {
    // Wait for editor
    await waitForEditor()
    console.log('✅ Editor ready')
    
    // Check if diff mode is available
    if (!window.editor.commands.addChangeBatch) {
      console.error('❌ Diff extension not loaded')
      return
    }
    
    // Get the current selection or use default text
    const { state } = window.editor
    const { selection } = state
    let targetRange = null
    
    if (!selection.empty) {
      // Use current selection
      targetRange = {
        from: selection.from,
        to: selection.to,
        text: state.doc.textBetween(selection.from, selection.to)
      }
      console.log('📝 Using selected text:', targetRange.text)
    } else {
      // Find some text to modify
      const textContent = state.doc.textContent
      const searchText = 'Pricing'
      const index = textContent.indexOf(searchText)
      
      if (index === -1) {
        console.error('❌ Could not find "Pricing" text. Please select some text manually.')
        return
      }
      
      // Calculate position in the document
      let pos = 0
      let found = false
      
      state.doc.descendants((node, nodePos) => {
        if (found) return false
        
        if (node.isText && node.text.includes(searchText)) {
          const nodeIndex = node.text.indexOf(searchText)
          pos = nodePos + nodeIndex
          found = true
          return false
        }
      })
      
      if (!found) {
        console.error('❌ Could not locate text position')
        return
      }
      
      targetRange = {
        from: pos,
        to: pos + searchText.length,
        text: searchText
      }
      console.log('📝 Found text at position:', pos)
    }
    
    // Add test changes
    console.log('🎨 Adding test changes...')
    
    const changes = [
      {
        id: 'test-1',
        type: 'modification',
        position: { 
          from: targetRange.from, 
          to: targetRange.to 
        },
        originalText: targetRange.text,
        suggestedText: targetRange.text + ' & Investment',
        confidence: 0.87,
        reasoning: 'Improved clarity and impact of this section'
      }
    ]
    
    // Add the batch
    window.editor.commands.addChangeBatch('test-batch-1', changes)
    
    console.log('✅ Changes added successfully!')
    console.log('📌 Instructions:')
    console.log('  - Hover over the highlighted text to see the preview')
    console.log('  - Click ✓ to accept or ✗ to reject')
    console.log('  - Press Tab to navigate between changes')
    console.log('  - Press Cmd+Shift+A to accept all')
    console.log('  - Press Cmd+Shift+R to reject all')
    
    // Show diff panel
    window.editor.commands.toggleDiffMode()
  }
  
  // Run the demo
  runDemo().catch(err => {
    console.error('❌ Demo failed:', err)
  })
})() 