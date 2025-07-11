# AI Chat Voice Input Implementation Plan

This document outlines the plan to implement voice input functionality into the AI chat interface.

## 1. Overview

The goal is to allow users to provide input to the AI chat agent using their voice. This will be accomplished by integrating the Web Speech API into the existing React-based chat interface. The voice input will be transcribed into text and then processed in the same way as typed text input.

## 2. Affected Components

Based on the architecture described in `_docs/dave/code-state-v3.md`, the following frontend components will be primarily affected:

-   `src/components/AIChat/AIChatInput.jsx`: This component will be modified to include a UI element (e.g., a microphone icon) to trigger voice input.
-   `src/components/AIChat/useAIChat.js`: This custom hook will be updated to include the logic for voice recognition, transcription, and submission.
-   `src/components/AIChat/AIMessage.jsx`: This component will render the transcribed voice message in the chat history. No major changes are expected here as the transcribed text will be treated as a standard user message.

## 3. Implementation Steps

### Step 1: UI for Voice Input

-   **Task**: ✅ Add a microphone button to the `AIChatInput.jsx` component.
-   **Details**:
    -   ✅ The button will be placed next to the text input field or send button.
    -   ✅ The button's appearance will change to indicate the current state (e.g., idle, listening, processing).
    -   ✅ An appropriate icon library (e.g., React Icons) will be used for the microphone icon.

### Step 2: Integrate Web Speech API

-   **Task**: ✅ Implement voice recognition logic within the `useAIChat.js` hook.
-   **Details**:
    -   ✅ Check for browser support for the `SpeechRecognition` API when the component mounts. If not supported, the voice input button will be disabled or hidden.
    -   ✅ Create a new instance of `SpeechRecognition`.
    -   ✅ Implement functions to start and stop the voice recognition service.
    -   ✅ Handle the `onresult` event to get the transcribed text from the voice input.
    -   ✅ Handle `onerror` and `onend` events for robust error handling and state management.

### Step 3: Manage Voice Input State

-   **Task**: ✅ Add new state variables to `useAIChat.js` to manage the voice input process.
-   **Details**:
    -   ✅ `isListening`: A boolean to track if the microphone is actively listening.
    -   ✅ `transcript`: A string to store the real-time or final transcribed text.
    -   ✅ The `AIChatInput.jsx` component will use these state variables to update its UI accordingly.

### Step 4: Submit Transcribed Text

-   **Task**: ✅ Modify the submission logic in `useAIChat.js` to handle transcribed text.
-   **Details**:
    -   ✅ When the user finishes speaking (e.g., by clicking the button again or after a pause), the final transcript will be taken.
    -   ✅ The transcribed text will be used to update the chat input field's value.
    -   The existing message submission logic will be triggered, sending the transcribed text to the backend agent.
    -   The transcribed message will be added to the chat history and stored in the `chat_messages` table with the role `user`.

### Step 5: Displaying the Message

-   **Task**: Ensure the transcribed message is displayed correctly in the chat panel.
-   **Details**:
    -   The `AIMessage.jsx` component should already be capable of displaying user messages.
    -   Since the transcribed text is treated as a standard user message, no significant changes are anticipated for this component. The plan is to verify this behavior during testing.

## 4. Testing Plan

1.  **Component Testing**:
    -   Verify that the microphone button in `AIChatInput.jsx` renders correctly and changes its state visually.
    -   Test the voice input functionality in a browser that supports the Web Speech API (e.g., Chrome).
    -   Test in a browser that does not support the API to ensure the feature degrades gracefully.
2.  **Integration Testing**:
    -   Perform an end-to-end test of the voice input flow:
        1.  Click the microphone button.
        2.  Speak a phrase.
        3.  Verify the transcribed text appears in the input field.
        4.  Verify the message is sent to the agent.
        5.  Verify the message appears in the `AIMessage` list.
        6.  Verify the agent responds to the voice-based query.
    -   Test the handling of errors, such as microphone access being denied by the user.
    -   Verify that both voice and text inputs can be used interchangeably within the same chat session. 