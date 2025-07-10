/**
 * MINIMAL TEST - Can we add a green span to the editor?
 * 
 * This is the absolute simplest test possible.
 * If this doesn't work, nothing will.
 */

(function() {
  console.log('🧪 MINIMAL GREEN SPAN TEST')
  console.log('=========================')
  
  // Step 1: Check editor exists
  if (!window.editor) {
    console.error('❌ No editor found. Open a document first.')
    return
  }
  
  console.log('✅ Editor found')
  
  // Step 2: Check if we can access the view
  const view = window.editor.view
  if (!view) {
    console.error('❌ No editor view found')
    return
  }
  
  console.log('✅ Editor view found')
  
  // Step 3: Get document info
  const doc = view.state.doc
  console.log('📄 Document size:', doc.content.size)
  
  if (doc.content.size < 5) {
    console.error('❌ Document too small. Add some text first.')
    return
  }
  
  // Step 4: Try the SIMPLEST possible decoration - a single inline decoration
  console.log('\n🎯 Attempting to add green decoration...')
  
  try {
    // Import decoration modules
    const { Decoration, DecorationSet } = window.editor.view
    
    // Create a single decoration at position 1-5
    const decoration = Decoration.inline(1, 5, {
      class: 'test-green-highlight',
      style: 'background-color: #10b981; color: white;'
    })
    
    console.log('✅ Decoration created:', decoration)
    
    // Create decoration set
    // const decorationSet = DecorationSet.create(doc, [decoration])
    console.log('✅ DecorationSet would be created here')
    
    // Apply decorations by dispatching a transaction
    // const tr = view.state.tr
    // TipTap/ProseMirror doesn't have setMeta for decorations directly
    // We need to use the plugin system
    
    console.log('❌ Direct decoration application not possible without plugin')
    console.log('📝 Need to test through the DiffExtension instead')
    
  } catch (error) {
    console.error('❌ Error creating decoration:', error)
  }
  
  // Step 5: Alternative approach - use the existing DiffExtension
  console.log('\n🎯 Testing through DiffExtension...')
  
  try {
    // Check if DiffExtension is loaded
    if (!window.editor.storage.diff) {
      console.error('❌ DiffExtension not loaded')
      return
    }
    
    console.log('✅ DiffExtension found')
    
    // Enable diff mode
    if (!window.editor.storage.diff.isActive) {
      window.editor.commands.toggleDiffMode()
      console.log('✅ Diff mode enabled')
    }
    
    // Add a SINGLE change
    const testChange = {
      id: 'minimal-test-' + Date.now(),
      type: 'addition',  // Should be green
      position: { from: 1, to: 5 },
      originalText: '',
      suggestedText: 'TEST',
      confidence: 1.0,
      reasoning: 'Minimal test',
      status: 'pending'
    }
    
    console.log('📝 Adding test change:', testChange)
    
    const success = window.editor.commands.addChange(testChange)
    
    if (success) {
      console.log('✅ Change added successfully!')
      console.log('\n🔍 LOOK AT YOUR DOCUMENT:')
      console.log('- Characters 1-5 should have green highlighting')
      console.log('- If not visible, the decoration system is broken')
      
      // Check what decorations exist
      const storage = window.editor.storage.diff
      const changes = storage.changeManager.getChanges()
      console.log('📊 Changes in system:', changes.length)
      console.log('Changes:', changes)
      
    } else {
      console.error('❌ Failed to add change')
    }
    
  } catch (error) {
    console.error('❌ Error using DiffExtension:', error)
    console.error('Stack:', error.stack)
  }
  
  // Step 6: Direct DOM inspection
  console.log('\n🔍 Checking DOM for green elements...')
  
  const editorElement = view.dom
  const greenElements = editorElement.querySelectorAll('.diff-addition')
  console.log('Green elements found:', greenElements.length)
  
  if (greenElements.length > 0) {
    console.log('✅ Green elements exist in DOM!')
    greenElements.forEach((el, i) => {
      console.log(`Element ${i}:`, {
        className: el.className,
        text: el.textContent,
        style: el.getAttribute('style')
      })
    })
  } else {
    console.log('❌ No green elements found in DOM')
    
    // Check for any diff-related elements
    const allDiffElements = editorElement.querySelectorAll('[class*="diff"]')
    console.log('All diff-related elements:', allDiffElements.length)
  }
  
  console.log('\n✅ Test complete. Check console output and document.')
  
})() 