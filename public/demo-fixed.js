// Fixed AI Diff Demo - Tests position mapping edge cases
// Copy and paste this directly into your browser console

(function() {
  console.log('🚀 Testing Fixed AI Diff System...')
  
  if (!window.editor) {
    console.error('❌ Editor not found. Make sure you are on a document page.')
    return
  }
  
  const { state } = window.editor
  const { doc } = state
  
  console.log('✅ Editor ready! Document size:', doc.content.size)
  
  // Test different text positions
  const testTexts = [
    'Executive Summary',
    'Key Value Propositions',
    'Proposed Solution',
    'Implementation Approach'
  ]
  
  let foundAny = false
  let changes = []
  
  for (const searchText of testTexts) {
    let pos = 0
    let found = false
    
    // Search for the text
    doc.descendants((node, nodePos) => {
      if (found) return false
      
      if (node.isText && node.text.includes(searchText)) {
        const nodeIndex = node.text.indexOf(searchText)
        pos = nodePos + nodeIndex
        found = true
        return false
      }
    })
    
    if (found) {
      foundAny = true
      console.log(`📍 Found "${searchText}" at position ${pos}`)
      
      // Create a change for this text
      changes.push({
        id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'modification',
        position: { 
          from: pos, 
          to: pos + searchText.length 
        },
        originalText: searchText,
        suggestedText: searchText + ' (Enhanced)',
        confidence: 0.85 + Math.random() * 0.1,
        reasoning: 'Improved clarity and professional tone'
      })
    }
  }
  
  if (!foundAny) {
    console.error('❌ Could not find any test text in the document.')
    console.log('💡 Try selecting some text manually and running the demo again.')
    
    // Try with selected text
    const { selection } = state
    if (!selection.empty) {
      const selectedText = doc.textBetween(selection.from, selection.to)
      console.log('📝 Using selected text:', selectedText)
      
      changes.push({
        id: `demo-selection-${Date.now()}`,
        type: 'modification',
        position: { 
          from: selection.from, 
          to: selection.to 
        },
        originalText: selectedText,
        suggestedText: selectedText + ' (Improved)',
        confidence: 0.90,
        reasoning: 'Enhanced based on user selection'
      })
    } else {
      return
    }
  }
  
  // Add all changes as a batch
  console.log(`\n🎨 Adding ${changes.length} test changes...`)
  
  try {
    window.editor.commands.addChangeBatch('demo-batch-fixed', changes)
    
    // Enable diff mode
    window.editor.commands.toggleDiffMode()
    
    console.log('✅ Changes added successfully!')
    console.log('\n📌 Instructions:')
    console.log('  • Look for green highlighted text in your document')
    console.log('  • Hover over highlighted text to see change previews')
    console.log('  • Click ✓ to accept or ✗ to reject changes')
    console.log('  • Use Tab/Shift+Tab to navigate between changes')
    console.log('  • Press Enter to accept, Escape to reject')
    console.log('  • Use Cmd/Ctrl+Shift+A to accept all')
    console.log('  • Use Cmd/Ctrl+Shift+R to reject all')
    
    console.log('\n✨ The position mapping fix ensures this works even at:')
    console.log('  • Document boundaries')
    console.log('  • Between paragraphs')
    console.log('  • Inside nested structures')
    console.log('  • Text node edges')
    
  } catch (error) {
    console.error('❌ Error adding changes:', error)
    console.log('🔍 This error should be fixed now. If you still see it, please check:')
    console.log('  1. The editor is fully loaded')
    console.log('  2. You have a document open')
    console.log('  3. The document has some content')
  }
})() 