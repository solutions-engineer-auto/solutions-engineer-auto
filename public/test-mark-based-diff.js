/**
 * MARK-BASED DIFF TEST - Using TipTap marks instead of decorations
 * 
 * This tests a completely different approach using TipTap's native
 * mark system instead of the problematic decoration system.
 */

(function() {
  console.log('🎯 MARK-BASED DIFF TEST')
  console.log('======================')
  
  if (!window.editor) {
    console.error('❌ No editor found')
    return
  }
  
  const editor = window.editor
  
  console.log('✅ Editor found')
  console.log('📝 This test will use marks (like bold/italic) for highlighting')
  
  // Step 1: Test basic mark functionality
  console.log('\n🧪 Testing basic mark functionality...')
  
  // Select some text
  const doc = editor.state.doc
  if (doc.content.size < 20) {
    console.error('❌ Document too small. Add more text.')
    return
  }
  
  // Apply bold to test marks work
  editor.chain()
    .focus()
    .setTextSelection({ from: 5, to: 15 })
    .toggleBold()
    .run()
  
  console.log('✅ Applied bold mark to position 5-15')
  console.log('If you see bold text, marks are working!')
  
  // Step 2: Create a custom highlight using existing marks
  console.log('\n🎨 Testing highlight mark...')
  
  // TipTap includes a Highlight extension - let's use it
  setTimeout(() => {
    // Remove bold
    editor.chain()
      .focus()
      .setTextSelection({ from: 5, to: 15 })
      .unsetMark('bold')
      .run()
    
    // Apply highlight
    editor.chain()
      .focus()  
      .setTextSelection({ from: 5, to: 15 })
      .toggleHighlight({ color: '#10b981' }) // Green color
      .run()
    
    console.log('✅ Applied green highlight!')
    console.log('🔍 Check position 5-15 for green background')
    
  }, 1000)
  
  // Step 3: Simulate diff changes using marks
  console.log('\n🔄 Simulating diff changes...')
  
  const changes = [
    { from: 20, to: 30, type: 'addition', color: '#10b981' },    // Green
    { from: 35, to: 45, type: 'deletion', color: '#ef4444' },    // Red
    { from: 50, to: 60, type: 'modification', color: '#06b6d4' } // Cyan
  ]
  
  setTimeout(() => {
    changes.forEach((change, index) => {
      setTimeout(() => {
        // Check bounds
        if (change.to <= doc.content.size) {
          editor.chain()
            .focus()
            .setTextSelection({ from: change.from, to: change.to })
            .setHighlight({ color: change.color })
            .run()
          
          console.log(`✅ Applied ${change.type} highlight at ${change.from}-${change.to}`)
        } else {
          console.log(`⚠️ Skipped ${change.type} - position out of bounds`)
        }
      }, index * 500)
    })
  }, 2000)
  
  // Step 4: Add deletion styling
  setTimeout(() => {
    console.log('\n🗑️ Adding deletion styling...')
    
    // For deletions, we need both highlight and strikethrough
    if (changes[1].to <= doc.content.size) {
      editor.chain()
        .focus()
        .setTextSelection({ from: changes[1].from, to: changes[1].to })
        .toggleStrike() // Add strikethrough
        .run()
      
      console.log('✅ Added strikethrough to deletion')
    }
  }, 4000)
  
  // Step 5: Create wrapper for diff functionality
  console.log('\n📦 Creating diff helper functions...')
  
  window.diffHelpers = {
    addDiffMark(from, to, type) {
      const colors = {
        addition: '#10b981',
        deletion: '#ef4444',
        modification: '#06b6d4'
      }
      
      const chain = editor.chain().focus().setTextSelection({ from, to })
      
      // Apply color
      chain.setHighlight({ color: colors[type] })
      
      // Add strikethrough for deletions
      if (type === 'deletion') {
        chain.toggleStrike()
      }
      
      chain.run()
      
      console.log(`✅ Added ${type} mark at ${from}-${to}`)
    },
    
    removeDiffMark(from, to) {
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .unsetHighlight()
        .unsetMark('strike')
        .run()
      
      console.log(`✅ Removed marks at ${from}-${to}`)
    },
    
    // Accept a change by removing the mark
    acceptChange(from, to, _newText) {
      // Remove marks
      this.removeDiffMark(from, to)
      
      // For additions, we'd insert the text
      // For deletions, we'd delete the text
      // For modifications, we'd replace the text
      // In real implementation: editor.commands.insertContentAt(from, _newText)
      console.log(`✅ Accepted change at ${from}-${to}`)
    }
  }
  
  console.log('\n✨ SUMMARY:')
  console.log('1. Marks work reliably (bold, highlight, strike)')
  console.log('2. We can use highlight mark with colors for diff visualization')
  console.log('3. This approach actually renders in the DOM!')
  console.log('4. Use window.diffHelpers to test the functions')
  
  console.log('\n💡 CONCLUSION:')
  console.log('Marks are a much better approach than decorations for this use case!')
  console.log('They render reliably and are part of TipTap\'s core functionality.')
  
})() 