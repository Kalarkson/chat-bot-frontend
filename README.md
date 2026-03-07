# AI Chat Frontend
Modern web client for AI chat application with real-time streaming responses, image generation, Markdown/LaTeX support, and JWT authentication.

## Technology Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (with custom components layer)
- **Lucide React** (icons)
- **Marked** + **KaTeX** (Markdown rendering + LaTeX math support)
- **Ollama API** (local LLM inference)
- **ComfyUI** (image generation via workflow API)
- **React Hook Form** / **Zod** (optional form validation, if used)
- **JWT** (client-side token storage & protected routes)

## Key Features
- Real-time streaming text generation from local Ollama model
- Image generation using ComfyUI workflows (prompt → image URL)
- Full Markdown support (bold, italic, code blocks, lists, tables, etc.)
- LaTeX rendering for mathematical expressions via KaTeX
- JWT-based authentication & protected chat history
- Responsive design (mobile, tablet, desktop)
- Toast notifications for success/error states
- Chat sidebar with pinned chats, creation, deletion, selection
- Abortable generation (stop button)
- Automatic scrolling to latest message

## Main Components & Hooks
- `useAI` — core hook for text & image generation
  - Ollama streaming: `/api/chat` with `stream: true`
  - ComfyUI image gen: `/prompt` → polling `/history` → `/view` URL
  - LibreTranslate / DeepL fallback for Russian prompts
- `useChats` — chat CRUD operations (create, fetch, pin, delete)
- `useAuth` — authentication state & token management
- `MessageBubble` — renders user/assistant messages, images, loading states
- `ChatInput` — input with send/stop buttons
- `Home` page — main chat interface with sidebar

## External Service Integrations

### Text Generation — Ollama
- Endpoint: `http://localhost:11434/api/chat` (default Ollama port)
- Streaming enabled for real-time typing effect
- AbortController support to stop generation

### Image Generation — ComfyUI
- Instance: ComfyUI running via https://github.com/mmartial/ComfyUI-Nvidia-Docker
- API base URL: `http://localhost:4004` (4004 ComfyUI port)
- Workflow-based generation:
  - Submit JSON workflow via `POST /prompt`
  - Poll `GET /history/{prompt_id}` until output appears
  - Retrieve image via `GET /view?filename=...&type=output`
- Result stored in chat as Markdown: `![Generated Image](http://localhost:8188/view?...)`
- Images loaded directly from ComfyUI (no base64 in database)
