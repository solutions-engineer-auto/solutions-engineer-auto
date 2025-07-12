
# Voice Input Modal Implementation Plan

This document outlines the implementation plan to refactor the existing voice input functionality from direct-to-chat transcription to a modal-based interface.

## 1. Feature Requirements

- The microphone button and a `Control + .` keyboard shortcut will open a voice input modal.
- The modal will display the live transcription of the user's speech.
- After a period of silence, the modal will automatically close.
- Upon closing, the transcribed text will be submitted to the AI chat to initiate a response.
- The existing AI chat input and conversation view will remain unchanged during this process.

## 2. Analysis of Existing Code

- **`useAIChat.js`**: Contains all the logic for the Web Speech API, including initialization, starting/stopping listening, and handling transcript results. The `toggleListening` function is tightly coupled with the `AIChatInput` component's state via a callback (`onTranscriptUpdate`).
- **`AIChatInput.jsx`**: Renders the microphone button and calls the `toggleListening` function from `useAIChat.js`, passing its `setMessage` state updater to display the transcript in the `textarea`.

## 3. Implementation Strategy

The core of this plan is to decouple the voice recognition logic from the chat input field and move it into a new, self-contained modal component.

### Step 1: Create `VoiceInputModal.jsx` Component

This new component will be responsible for the entire voice interaction lifecycle.

- **File Location**: `src/components/AIChat/VoiceInputModal.jsx`
- **Props**:
  - `isOpen`: boolean - To control the visibility of the modal.
  - `onClose`: function - To close the modal.
  - `onSubmit`: function(string) - To submit the final transcript to the AI chat.
- **Internal State**:
  - `transcript`: string - To store and display the live transcription.
  - `isListening`: boolean - To track the listening state for UI feedback within the modal.
- **Logic**:
  - It will contain its own instance of the `SpeechRecognition` API. We will refactor the logic from `useAIChat.js` into this component.
  - It will have a timeout that starts when the user stops speaking. If the user starts speaking again, the timeout will be reset. When the timeout completes, it will call `onSubmit(transcript)` and then `onClose()`.
  - The UI will feature a prominent display of the `transcript` and a visual indicator for the `isListening` state (e.g., a pulsing microphone icon).

### Step 2: Refactor `useAIChat.js`

The voice-related logic will be mostly removed from this hook, as it will now be managed by `VoiceInputModal.jsx`.

- **Remove**:
  - The `isListening`, `isSpeechSupported`, and `recognitionRef` state and refs.
  - The `useEffect` hook that initializes the SpeechRecognition API.
  - The `toggleListening` function.
- **No changes are needed for `sendMessage`**: The modal will call `sendMessage` (or a wrapper function) with the final transcript.

### Step 3: Update `AIChatPanel.jsx` (or a similar parent component)

This component will manage the state of the `VoiceInputModal`.

- **State Management**:
  - Add a new state variable: `const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);`
- **Render Logic**:
  - Render the `<VoiceInputModal />` component conditionally based on `isVoiceModalOpen`.
  - Pass the necessary props:
    - `isOpen={isVoiceModalOpen}`
    - `onClose={() => setIsVoiceModalOpen(false)}`
    - `onSubmit={(transcript) => { sendMessage(transcript); setIsVoiceModalOpen(false); }}`

### Step 4: Update `AIChatInput.jsx`

The microphone button will now control the modal instead of toggling listening directly.

- **Props**:
  - It will no longer need `isListening` or `toggleListening`.
  - It will need a new prop: `onMicrophoneClick`: function.
- **Functionality**:
  - The `onClick` handler for the microphone button will be simplified to call `onMicrophoneClick()`.
  - The `isSpeechSupported` check can be moved to the parent component (`AIChatPanel.jsx`) to conditionally render the microphone button.
  - The pulsing animation for the `isListening` state will be removed from this component and moved to the modal.

### Step 5: Implement Global Keyboard Shortcut

A global listener will be added to handle the `Control + .` shortcut.

- **Location**: This could be implemented in a high-level component like `App.jsx` or `DocumentEditorPage.jsx` using a `useEffect` hook.
- **Logic**:
  - The `useEffect` hook will add a `keydown` event listener to the `window` object when the component mounts.
  - The event listener will check for `e.ctrlKey && e.key === '.'`.
  - If the condition is met, it will call `setIsVoiceModalOpen(true)` to open the modal.
  - The hook should return a cleanup function to remove the event listener when the component unmounts.

## 4. Task Breakdown

1.  **[Task 1]** ✅ Create the basic structure of the `VoiceInputModal.jsx` component.
2.  **[Task 2]** ✅ Move the Speech Recognition logic from `useAIChat.js` to `VoiceInputModal.jsx` and implement the timeout feature.
3.  **[Task 3]** ✅ Refactor `useAIChat.js` to remove the old voice logic.
4.  **[Task 4]** ✅ Update `AIChatPanel.jsx` to manage and render the new modal.
5.  **[Task 5]** ✅ Update `AIChatInput.jsx` to trigger the modal's opening.
6.  **[Task 6]** Implement the `Control + .` global keyboard shortcut.
7.  **[Task 7]** Test the full end-to-end flow:
    -   Opening the modal with the button and shortcut.
    -   Correctly displaying the live transcript.
    -   Auto-closing and submitting the prompt on silence.
    -   Ensuring the AI responds to the submitted prompt.
    -   Verifying graceful degradation on unsupported browsers. 