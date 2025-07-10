/**
 * DIRECT DOM TEST - Can we add visual elements without decorations?
 * 
 * This tests if we can bypass the decoration system entirely
 * and use a different approach.
 */

(function() {
  console.log('🧪 DIRECT DOM MANIPULATION TEST')
  console.log('================================')
  
  // Step 1: Check editor
  if (!window.editor || !window.editor.view) {
    console.error('❌ No editor found')
    return
  }
  
  const view = window.editor.view
  const editorDOM = view.dom
  
  console.log('✅ Editor DOM found:', editorDOM)
  
  // Step 2: Find first text node
  let firstTextNode = null
  let textContent = ''
  
  function findTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
      firstTextNode = node
      textContent = node.textContent
      return true
    }
    
    for (let child of node.childNodes) {
      if (findTextNode(child)) return true
    }
    return false
  }
  
  findTextNode(editorDOM)
  
  if (!firstTextNode) {
    console.error('❌ No text content found')
    return
  }
  
  console.log('✅ Found text node:', textContent.substring(0, 50) + '...')
  
  // Step 3: Try wrapping part of text in a span
  console.log('\n🎯 Attempting direct DOM manipulation...')
  
  try {
    const parent = firstTextNode.parentNode
    const text = firstTextNode.textContent
    
    if (text.length < 10) {
      console.error('❌ Text too short')
      return
    }
    
    // Split the text node
    const beforeText = text.substring(0, 5)
    const highlightText = text.substring(5, 10)
    const afterText = text.substring(10)
    
    // Create new nodes
    const beforeNode = document.createTextNode(beforeText)
    const afterNode = document.createTextNode(afterText)
    
    // Create highlighted span
    const highlightSpan = document.createElement('span')
    highlightSpan.style.backgroundColor = '#10b981'
    highlightSpan.style.color = 'white'
    highlightSpan.style.padding = '2px 4px'
    highlightSpan.style.borderRadius = '3px'
    highlightSpan.textContent = highlightText
    highlightSpan.className = 'test-direct-highlight'
    
    // Replace original text node
    parent.replaceChild(afterNode, firstTextNode)
    parent.insertBefore(highlightSpan, afterNode)
    parent.insertBefore(beforeNode, highlightSpan)
    
    console.log('✅ DOM manipulation complete!')
    console.log('🔍 Check your document - you should see green highlighting')
    
    // Test if it persists
    setTimeout(() => {
      const highlight = editorDOM.querySelector('.test-direct-highlight')
      if (highlight) {
        console.log('✅ Highlight still exists after 2 seconds!')
        console.log('Style:', highlight.style.cssText)
      } else {
        console.log('❌ Highlight was removed by editor')
      }
    }, 2000)
    
  } catch (error) {
    console.error('❌ Error manipulating DOM:', error)
  }
  
  // Step 4: Alternative - Overlay approach
  console.log('\n🎯 Testing overlay approach...')
  
  try {
    // Get editor position
    // const editorRect = editorDOM.getBoundingClientRect()
    
    // Find position of first paragraph
    const firstParagraph = editorDOM.querySelector('p')
    if (!firstParagraph) {
      console.error('❌ No paragraph found')
      return
    }
    
    const paraRect = firstParagraph.getBoundingClientRect()
    
    // Create overlay div
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.left = paraRect.left + 'px'
    overlay.style.top = paraRect.top + 'px'
    overlay.style.width = '100px'
    overlay.style.height = '24px'
    overlay.style.backgroundColor = 'rgba(16, 185, 129, 0.3)'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '1000'
    overlay.className = 'test-overlay-highlight'
    
    document.body.appendChild(overlay)
    
    console.log('✅ Overlay added!')
    console.log('🔍 Green overlay should appear over first paragraph')
    
    // Remove after 5 seconds
    setTimeout(() => {
      overlay.remove()
      console.log('🧹 Overlay removed after 5 seconds')
    }, 5000)
    
  } catch (error) {
    console.error('❌ Error creating overlay:', error)
  }
  
  console.log('\n📝 Summary:')
  console.log('1. Direct DOM manipulation may be overridden by ProseMirror')
  console.log('2. Overlay approach works but requires position tracking')
  console.log('3. Need to find a ProseMirror-compatible solution')
  
})() 