/**
 * TEST MARK-BASED DIFF V2
 * 
 * Tests the new simplified diff system that uses marks instead of decorations.
 * This should fix all position tracking issues!
 */

(function() {
  console.log('🚀 TESTING NEW MARK-BASED DIFF SYSTEM V2')
  console.log('========================================')
  
  if (!window.editor) {
    console.error('❌ No editor found')
    return
  }
  
  const editor = window.editor
  const diffV2 = window.diffV2 || editor.storage.diffV2
  
  if (!diffV2) {
    console.error('❌ DiffV2 extension not found')
    console.log('Make sure the page has reloaded with the new extension')
    return
  }
  
  console.log('✅ Editor and DiffV2 found!')
  console.log('Document size:', editor.state.doc.content.size)
  
  // Step 1: Enable diff mode
  console.log('\n📝 Enabling diff mode...')
  editor.commands.toggleDiffMode()
  console.log('Diff mode active:', diffV2.isActive)
  
  // Step 2: Test with proper position validation
  console.log('\n🎯 Adding test changes with proper positions...')
  
  const docSize = editor.state.doc.content.size
  console.log('Document size:', docSize)
  
  // Find safe positions for testing
  const testPositions = []
  
  // Find first text node with reasonable content
  let foundPositions = false
  editor.state.doc.descendants((node, pos) => {
    if (!foundPositions && node.isText && node.text.length >= 20) {
      testPositions.push({
        from: pos + 5,
        to: pos + 15,
        text: node.text.substring(5, 15)
      })
      
      if (pos + 30 < docSize) {
        testPositions.push({
          from: pos + 20,
          to: pos + 30,
          text: node.text.substring(20, 30)
        })
      }
      
      foundPositions = true
      return false
    }
  })
  
  if (testPositions.length === 0) {
    console.error('❌ Could not find suitable text positions')
    console.log('Add more text to the document')
    return
  }
  
  console.log('Found test positions:', testPositions)
  
  // Step 3: Add different types of changes
  const changes = [
    {
      id: 'test-mod-' + Date.now(),
      type: 'modification',
      position: testPositions[0],
      originalText: testPositions[0].text,
      suggestedText: testPositions[0].text.toUpperCase(),
      confidence: 0.9,
      reasoning: 'Made text more emphatic',
      status: 'pending'
    }
  ]
  
  // Add second change if we have position
  if (testPositions[1]) {
    changes.push({
      id: 'test-del-' + Date.now() + 1,
      type: 'deletion',
      position: testPositions[1],
      originalText: testPositions[1].text,
      suggestedText: '',
      confidence: 0.8,
      reasoning: 'Removed redundant text',
      status: 'pending'
    })
  }
  
  // Add an addition at cursor position
  const cursorPos = editor.state.selection.from
  changes.push({
    id: 'test-add-' + Date.now() + 2,
    type: 'addition',
    position: { from: cursorPos, to: cursorPos },
    originalText: '',
    suggestedText: '[INSERTED TEXT]',
    confidence: 0.85,
    reasoning: 'Added clarification',
    status: 'pending'
  })
  
  console.log('Adding changes:', changes)
  
  // Add changes as a batch
  editor.commands.addChangeBatch('test-batch-v2', changes)
  
  // Step 4: Check if marks were applied
  setTimeout(() => {
    console.log('\n🔍 Checking for marks in DOM...')
    
    const marks = editor.view.dom.querySelectorAll('.diff-mark')
    console.log('Diff marks found:', marks.length)
    
    marks.forEach((mark, index) => {
      console.log(`Mark ${index}:`, {
        type: mark.getAttribute('data-diff-type'),
        changeId: mark.getAttribute('data-change-id'),
        text: mark.textContent,
        classes: mark.className
      })
    })
    
    if (marks.length > 0) {
      console.log('✅ SUCCESS! Marks are visible in the document!')
      console.log('\n💡 Try clicking on a highlighted section to see accept/reject buttons')
    } else {
      console.log('❌ No marks found - something went wrong')
    }
    
    // Test accept/reject
    console.log('\n🧪 Testing accept/reject functionality...')
    console.log('Commands available:')
    console.log('- editor.commands.acceptChange(changeId)')
    console.log('- editor.commands.rejectChange(changeId)')
    console.log('- editor.commands.acceptAllChanges()')
    console.log('- editor.commands.rejectAllChanges()')
    console.log('- editor.commands.applyAcceptedChanges()')
    
    // Get change manager stats
    const changeManager = diffV2.changeManager
    if (changeManager) {
      const stats = changeManager.getStatistics()
      console.log('\n📊 Change statistics:', stats)
    }
    
  }, 100)
  
  // Step 5: Test keyboard interaction
  console.log('\n⌨️  Keyboard shortcuts:')
  console.log('- Cmd/Ctrl+K: Request AI edit on selection')
  console.log('- Click marked text to show accept/reject buttons')
  
  // Helper functions for testing
  window.testDiffV2 = {
    acceptFirst() {
      const changes = diffV2.changeManager.getChanges({ status: 'pending' })
      if (changes.length > 0) {
        editor.commands.acceptChange(changes[0].id)
        console.log('✅ Accepted first change')
      }
    },
    
    rejectFirst() {
      const changes = diffV2.changeManager.getChanges({ status: 'pending' })
      if (changes.length > 0) {
        editor.commands.rejectChange(changes[0].id)
        console.log('✅ Rejected first change')
      }
    },
    
    applyAccepted() {
      editor.commands.applyAcceptedChanges()
      console.log('✅ Applied all accepted changes to document')
    },
    
    clearAll() {
      editor.commands.rejectAllChanges()
      console.log('✅ Cleared all changes')
    }
  }
  
  console.log('\n🎮 Test helpers available:')
  console.log('- testDiffV2.acceptFirst()')
  console.log('- testDiffV2.rejectFirst()')
  console.log('- testDiffV2.applyAccepted()')
  console.log('- testDiffV2.clearAll()')
  
})() 