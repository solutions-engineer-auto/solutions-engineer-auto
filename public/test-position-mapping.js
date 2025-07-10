// Test script for position mapping edge cases
// Run this in the browser console to verify the fix

(async function() {
  console.log('🧪 Testing Position Mapping Edge Cases...')
  
  if (!window.editor) {
    console.error('❌ Editor not found. Please open a document first.')
    return
  }
  
  const { state } = window.editor
  const { doc } = state
  
  console.log('📄 Document structure:', {
    nodeSize: doc.nodeSize,
    childCount: doc.childCount,
    content: doc.textContent.substring(0, 100) + '...'
  })
  
  // Test cases for different positions
  const testCases = [
    { name: 'Start of document', pos: 0 },
    { name: 'End of document', pos: doc.content.size },
    { name: 'Middle position', pos: Math.floor(doc.content.size / 2) },
    { name: 'Inside first text node', pos: 1 },
    { name: 'Between paragraphs', pos: null }, // Will be calculated
  ]
  
  // Find a position between paragraphs
  let betweenParaPos = null
  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && betweenParaPos === null) {
      betweenParaPos = pos + node.nodeSize
      return false
    }
  })
  
  if (betweenParaPos !== null && betweenParaPos < doc.content.size) {
    testCases[4].pos = betweenParaPos
  } else {
    testCases.splice(4, 1) // Remove this test case if not applicable
  }
  
  // Import the position mapping utilities
  const { createPositionAnchor, createRangeReference } = await import('./src/utils/positionMapping.js')
  
  console.log('\n🔍 Testing position anchors:')
  
  // Test each position
  let allTestsPassed = true
  
  for (const testCase of testCases) {
    if (testCase.pos === null) continue
    
    try {
      // Test createPositionAnchor
      const anchor = createPositionAnchor(doc, testCase.pos)
      
      console.log(`\n✓ ${testCase.name} (pos: ${testCase.pos})`)
      console.log('  Anchor created:', {
        pos: anchor.pos,
        pathLength: anchor.path.length,
        contextBefore: anchor.before.substring(0, 20) + '...',
        contextAfter: '...' + anchor.after.substring(0, 20)
      })
      
      // Verify the anchor has required properties
      if (anchor.pos === undefined || !anchor.path || anchor.before === undefined || anchor.after === undefined) {
        throw new Error('Anchor missing required properties')
      }
      
    } catch (error) {
      console.error(`\n❌ ${testCase.name} (pos: ${testCase.pos})`)
      console.error('  Error:', error.message)
      allTestsPassed = false
    }
  }
  
  // Test range references
  console.log('\n\n🔍 Testing range references:')
  
  const rangeTests = [
    { name: 'Single word', from: 5, to: 10 },
    { name: 'Across paragraphs', from: 0, to: Math.min(50, doc.content.size) },
    { name: 'Empty range', from: 5, to: 5 }
  ]
  
  for (const test of rangeTests) {
    if (test.from >= doc.content.size || test.to > doc.content.size) {
      console.log(`\n⚠️  Skipping ${test.name} - out of bounds`)
      continue
    }
    
    try {
      const rangeRef = createRangeReference(doc, test.from, test.to)
      console.log(`\n✓ ${test.name} (${test.from}-${test.to})`)
      console.log('  Range reference created:', {
        content: rangeRef.content.substring(0, 30) + '...',
        checksum: rangeRef.checksum
      })
    } catch (error) {
      console.error(`\n❌ ${test.name} (${test.from}-${test.to})`)
      console.error('  Error:', error.message)
      allTestsPassed = false
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  if (allTestsPassed) {
    console.log('✅ All position mapping tests passed!')
  } else {
    console.log('❌ Some tests failed. Please check the errors above.')
  }
  
  // Test with the diff system
  console.log('\n\n🎯 Testing with diff system:')
  
  try {
    // Try to add a test change at a safe position
    const safePos = Math.min(10, doc.content.size - 10)
    const testChange = {
      id: 'position-test-' + Date.now(),
      type: 'modification',
      position: { from: safePos, to: safePos + 5 },
      originalText: doc.textBetween(safePos, safePos + 5),
      suggestedText: 'TEST',
      confidence: 0.99,
      reasoning: 'Position mapping test'
    }
    
    window.editor.commands.addChange(testChange)
    console.log('✅ Successfully added test change without position errors')
    
    // Clean up
    setTimeout(() => {
      window.editor.commands.rejectChange(testChange.id)
      console.log('🧹 Test change cleaned up')
    }, 2000)
    
  } catch (error) {
    console.error('❌ Failed to add test change:', error)
  }
  
})() 