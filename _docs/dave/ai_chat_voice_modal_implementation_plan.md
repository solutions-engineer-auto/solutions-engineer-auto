# AI Chat Voice Input with Modal: Implementation Plan

This document outlines the implementation plan for enhancing the AI chat's voice input feature. The primary change is the introduction of a modal window to display the live transcription of the user's voice, which can be triggered by a button or a keyboard shortcut. This plan refactors existing voice functionality into a dedicated hook for better modularity.

## 1. Project Goals

-   **Improve User Experience**: Provide clear, immediate feedback to the user about what the system is hearing via a modal.
-   **Enhance Accessibility**: Add a keyboard shortcut (`Cmd/Ctrl + .`) for starting voice input.
-   **Improve Code Structure**: Refactor existing voice recognition logic into a separate, reusable React hook.
-   **Fulfill Core Request**: When voice input is complete, populate the AI chat prompt and execute the query.

## 2. Analysis of Existing Code

-   `_docs/dave/code-state-v3.md`: Provides a general overview of the application architecture.
-   `_docs/dave/voice–implementation–plan.md`: Outlines a previous plan to implement voice-to-text directly into the input field.
-   `src/components/AIChat/AIChatInput.jsx`: Already contains a microphone button and props (`isListening`, `toggleListening`) for a voice feature.
-   `src/components/AIChat/useAIChat.js`: Contains partially implemented logic for the Web Speech API, including state and a `toggleListening` function that was designed to write the transcript directly to the input field.

## 3. High-Level Plan

The implementation will be broken down into four main phases:

1.  **Refactor & Create Voice Hook**: Move all voice recognition logic from `useAIChat.js` into a new, dedicated hook `useVoiceRecognition.js`.
2.  **Create UI Components**: Build a new `VoiceInputModal.jsx` component for live transcription display.
3.  **Integrate Components and Hooks**: Connect the new hook and modal to the existing chat components and add the keybinding.
4.  **Finalize and Test**: Ensure the full end-to-end flow works as expected and is robust.

## 4. Detailed Implementation Steps

### Phase 1: Create a Dedicated Voice Recognition Hook

This phase focuses on creating a clean, reusable hook for all voice-related logic.

**Task 1.1: Create `src/components/AIChat/hooks/useVoiceRecognition.js`** ✅

-   Create a new directory `src/components/AIChat/hooks/` for chat-related hooks.
-   Move the voice recognition logic from `useAIChat.js` into this new file.
-   The hook should manage the following:
    -   **State**: `isListening`, `transcript`, `isModalOpen`.
    -   **API Integration**: Encapsulate the `window.SpeechRecognition` setup and event handlers (`onresult`, `onerror`, `onend`).
    -   **Functions**: Expose functions to the component using the hook:
        -   `startListening()`: Opens the modal, starts recognition.
        -   `stopListening()`: Closes the modal, stops recognition, and returns the final transcript.
    -   **Timeout**: Implement a "no speech" timeout that automatically calls `stopListening`.
-   The hook should accept a callback function `onComplete` that it will call with the final transcript.

**Task 1.2: Refactor `useAIChat.js`** ✅

-   Remove all voice-related state and logic (`isListening`, `isSpeechSupported`, `toggleListening`, `recognitionRef`, and the associated `useEffect`).
-   This hook will now only be responsible for managing chat messages and communication with the agent.

### Phase 2: Create the Voice Input Modal UI

This phase focuses on the new UI element requested by the user.

**Task 2.1: Create `src/components/AIChat/VoiceInputModal.jsx`** ✅

-   Create a new modal component that will be displayed during voice input.
-   **Props**: It should accept `isOpen`, `transcript`, `isListening`, and `onClose`.
-   **UI Elements**:
    -   A title, e.g., "Listening..."
    -   A text area or `div` to display the live `transcript` prop.
    -   A visual indicator (e.g., a pulsing microphone icon) to show it's actively listening.
    -   A "Cancel" or "Close" button that calls the `onClose` function.
-   Base the styling on existing modals like `AccountCreationModal.jsx` for consistency.

### Phase 3: Integration

This phase connects the new hook and modal to the existing application.

**Task 3.1: Update `AIChatPanel.jsx`**

-   This component will now be the orchestrator.
-   Import and use the new `useVoiceRecognition` hook alongside the existing `useAIChat` hook.
-   ```jsx
    const { sendMessage } = useAIChat(...);
    const { isModalOpen, startListening, stopListening, transcript, isListening } = useVoiceRecognition({
      onComplete: (transcribedText) => {
        if (transcribedText) {
          sendMessage(transcribedText);
        }
      }
    });
    ```
-   Pass the `startListening` function down to `AIChatInput` as the `toggleListening` prop.
-   Render the `<VoiceInputModal>` component, controlling its state with the values from the `useVoiceRecognition` hook.

**Task 3.2: Update `AIChatInput.jsx`**

-   No major logic changes are needed here, as the props it expects (`toggleListening`, `isListening`) are still being provided, just from a different source. This component will trigger the start of the voice input flow.

**Task 3.3: Implement Global Keybinding**

-   In `AIChatPanel.jsx` (or a higher-level component like `DocumentEditorPage.jsx`), add a `useEffect` to listen for keyboard events.
-   ```jsx
    useEffect(() => {
      const handleKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === '.') {
          event.preventDefault();
          startListening();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [startListening]);
    ```

### Phase 4: Testing

-   **Manual Testing**:
    1.  Verify the microphone button in the chat input opens the `VoiceInputModal`.
    2.  Verify the `Cmd/Ctrl + .` shortcut also opens the modal.
    3.  Confirm the live transcript appears in the modal as you speak.
    4.  Check that the modal closes automatically after a period of silence.
    5.  Verify the transcribed text is submitted as a prompt to the AI chat.
    6.  Test the cancel/close button on the modal.
    7.  Test in browsers that do not support the Web Speech API to ensure the microphone button is not shown and the app doesn't crash.

## 5. File Manifest

### New Files

-   `_docs/dave/ai_chat_voice_modal_implementation_plan.md` (this file)
-   `src/components/AIChat/hooks/useVoiceRecognition.js`
-   `src/components/AIChat/VoiceInputModal.jsx`

### Modified Files

-   `src/components/AIChat/useAIChat.js` (to remove old voice logic)
-   `src/components/AIChat/AIChatPanel.jsx` (to integrate the new hook and modal)
-   `src/components/AIChat/AIChatInput.jsx` (minor prop-drilling verification)
-   `src/pages/DocumentEditorPage.jsx` (potential location for keybinding listener) 