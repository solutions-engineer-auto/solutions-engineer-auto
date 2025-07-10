// Simple Diff Test - Checks editor state carefully
// Copy and paste this directly into your browser console

(function() {
  console.log('🧪 Simple Diff Test Starting...')
  
  // Step 1: Check if editor exists
  if (!window.editor) {
    console.error('❌ No editor found. Make sure you are on a document page.')
    return
  }
  
  // Step 2: Check editor state
  const editor = window.editor
  const state = editor.state
  const doc = state.doc
  
  console.log('📋 Editor State Check:')
  console.log('- Editor exists:', !!editor)
  console.log('- State exists:', !!state)
  console.log('- Doc exists:', !!doc)
  console.log('- Doc size:', doc.content.size)
  console.log('- Doc type:', doc.type.name)
  console.log('- Selection:', {
    from: state.selection.from,
    to: state.selection.to,
    empty: state.selection.empty
  })
  
  // Step 3: Check if doc size is reasonable
  if (doc.content.size < 10) {
    console.error('❌ Document seems empty or too small. Size:', doc.content.size)
    console.log('Make sure you have a document with content loaded.')
    return
  }
  
  // Step 4: Find a safe position - look for heading text
  let testPosition = null
  let testText = ''
  
  doc.descendants((node, pos) => {
    // Look for the first text node with reasonable content
    if (!testPosition && node.isText && node.text.length > 5) {
      // Make sure we're not at the very end of the document
      if (pos + 10 <= doc.content.size) {
        testPosition = {
          from: pos,
          to: Math.min(pos + 10, pos + node.text.length, doc.content.size)
        }
        testText = node.text.substring(0, 10)
        console.log(`✅ Found test position: ${pos}-${testPosition.to}, text: "${testText}"`)
        return false // Stop searching
      }
    }
  })
  
  if (!testPosition) {
    console.error('❌ Could not find suitable text position')
    return
  }
  
  // Step 5: Enable diff mode
  console.log('\n🎯 Enabling diff mode...')
  try {
    // Check if diff extension exists
    if (!editor.storage.diff) {
      console.error('❌ Diff extension not loaded')
      return
    }
    
    // Toggle diff mode on
    if (!editor.storage.diff.isActive) {
      editor.commands.toggleDiffMode()
      console.log('✅ Diff mode enabled')
    } else {
      console.log('✅ Diff mode already active')
    }
  } catch (error) {
    console.error('❌ Error enabling diff mode:', error)
    return
  }
  
  // Step 6: Create a single test change
  const testChange = {
    id: 'test-' + Date.now(),
    type: 'modification',
    position: testPosition,
    originalText: testText,
    suggestedText: testText + ' (modified)',
    confidence: 0.9,
    reasoning: 'Test modification',
    status: 'pending'
  }
  
  console.log('\n📝 Creating test change:', testChange)
  
  // Step 7: Add the change
  try {
    // Double-check document size before adding
    const currentSize = editor.state.doc.content.size
    console.log('Document size before adding change:', currentSize)
    
    if (testPosition.to > currentSize) {
      console.error('❌ Position is out of bounds!')
      return
    }
    
    // Add single change
    editor.commands.addChange(testChange)
    
    console.log('✅ Change added successfully!')
    console.log('\n🎉 Look for highlighted text in your document')
    console.log('The modified text should be highlighted')
    
    // Check if decorations were created
    const pendingChanges = editor.storage.diff.changeManager.getChanges({ status: 'pending' })
    console.log('Pending changes:', pendingChanges.length)
    
  } catch (error) {
    console.error('❌ Error adding change:', error)
    console.error('Stack trace:', error.stack)
  }
})() 