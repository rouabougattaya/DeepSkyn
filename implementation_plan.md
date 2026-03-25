# Implementation Plan - DEV1 (Chatbed UI & Session)

This plan strictly isolates the DEV1 scope: Chat UI layout and Session Management, respecting boundaries with DEV2, DEV3, etc.

## Goal Description
Build the foundational interface (floating window or page) and the backend session endpoint for the DeepSkyn SaaS Chatbot. A "très belle" UI is requested, so we'll implement a modern, polished popover chat widget (bottom-right of the screen) using TailwindCSS and Lucide React.

## Proposed Changes

### Backend (Chat Session)

#### [NEW] `backend/src/chat/chat-session.entity.ts`
- Create `ChatSession` entity with [id](file:///c:/Users/mohamed/Downloads/DeepSkyn-openrouter%20%281%29/DeepSkyn-openrouter/DeepSkyn-openrouter/backend/src/ai/ai-analysis.service.ts#270-276) (UUID), `userId` (string), `isActive` (boolean, default true), and timestamps.

#### [NEW] `backend/src/chat/chat.service.ts`
- Implement `startSession(userId: string)`: Generates and returns a fresh chat session ID in the database.

#### [NEW] `backend/src/chat/chat.controller.ts`
- `POST /api/chat/start`: Protected route returning `{ sessionId }`.

#### [NEW] `backend/src/chat/chat.module.ts`
- Wires up the Chat controller and service with TypeORM integration.

#### [MODIFY] [backend/src/app.module.ts](file:///c:/Users/mohamed/Downloads/DeepSkyn-openrouter%20%281%29/DeepSkyn-openrouter/DeepSkyn-openrouter/backend/src/app.module.ts)
- Import `ChatModule` into the main backend application.

---

### Frontend (Chat UI)

#### [NEW] `frontend/src/components/chat/ChatWidget.tsx`
- **UI Structure**: A floating button that toggles a sleek chat window.
- **Design Elements**: Gradient header, glassmorphism chat body, elegant input area with a Send button.
- **Session Logic**: When opened, issues a `axios.post('/api/chat/start')` to get and store a `sessionId` (ready for DEV2's message sender to use).

#### [MODIFY] [frontend/src/components/AppLayout.tsx](file:///c:/Users/mohamed/Downloads/DeepSkyn-openrouter%20%281%29/DeepSkyn-openrouter/DeepSkyn-openrouter/frontend/src/components/AppLayout.tsx)
- Inject `<ChatWidget />` so it appears globally on all authenticated pages.

## Verification Plan

### Manual Verification
1. Login to the application.
2. Ensure the Chat widget bubble appears in the bottom right corner.
3. Open the widget and verify the UI looks modern, clean, and beautiful.
4. Open the Network tab, ensure `POST /api/chat/start` is called successfully and returns a `sessionId`.
