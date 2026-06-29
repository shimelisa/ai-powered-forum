# AI-Powered Evangadi Forum

A comprehensive Q&A forum platform enhanced with AI capabilities, including semantic search, intelligent question assistance, and a private PDF knowledge base powered by RAG (Retrieval-Augmented Generation) technology.

**Developed by:** Evangadi Coding Academy, Nov 29, 2025 Batch - Group 3  
**Documentation:** Complete task breakdown available in `/tasks` folder

## 📋 Project Overview

This project delivers a modern forum platform built progressively through three major milestones, each adding increasingly sophisticated AI capabilities:

1. **Authentication Foundation** - Secure user management and access control
2. **AI-Enhanced Forum** - Community Q&A with intelligent writing assistance and semantic search
3. **RAG Knowledge Base** - Private document library with AI-powered question answering

The platform enables users to ask technical questions, receive community answers with AI guidance, and maintain a personal library of searchable PDF documents for instant information retrieval.

## 🎯 Milestone Breakdown

### Milestone 1: Authentication ✅
**Foundation of secure user access and session management**

**Backend:**
- User registration with bcrypt password hashing
- JWT-based login and session management
- Protected route middleware

**Frontend:**
- Combined Login/Register page with Framer Motion transitions
- Global AuthContext for state management
- Protected route guards
- Public landing page for unauthenticated users

**Key Features:**
- Secure password storage
- Token-based authentication
- Automatic token attachment to requests
- Session persistence

---

### Milestone 2: Questions & Answers ✅
**Core community forum with AI writing assistance**

**Backend:**
- Create questions with automatic embedding generation
- List questions with keyword search and personal filter
- Single question detail with all answers
- Semantic search using vector similarity
- Similar question recommendations
- Answer creation with ownership validation
- **AI Draft Coach** - Real-time question writing feedback
- **AI Answer Fit** - Evaluate answer relevance before posting

**Frontend:**
- Dashboard with question list and search
- Post Question page with integrated AI Draft Coach
- Question Detail page with answers and AI Answer Fit
- My Questions page for personal question tracking
- Layout shell with Navbar and Sidebar navigation

**Key Features:**
- Vector embeddings for semantic understanding
- Cosine similarity for finding related questions
- AI-powered writing assistance for questions and answers
- Prevent users from answering their own questions
- Real-time AI feedback during composition

---

### Milestone 3: RAG Knowledge Base ✅
**Advanced document management with AI-powered retrieval**

**Backend:**
- PDF upload with secure storage (user-isolated)
- Asynchronous background processing pipeline:
  - Text extraction from PDF
  - Intelligent chunking (1000 chars, 150 overlap)
  - Vector embedding generation
  - Database storage with status tracking
- Semantic search within documents
- AI Q&A grounded in document content with citations
- Document metadata and status retrieval
- PDF streaming for browser preview
- List user documents
- Secure document deletion with cascade cleanup

**Frontend:**
- Unified RAG Documents page with three-panel interface:
  - Left: Document library with upload
  - Right: Active document viewer with tabs
    - **Ask AI** - Query documents with grounded answers
    - **Search** - Semantic search within document
    - **Preview** - In-browser PDF viewer
- Real-time status updates (polling every 3 seconds)
- Automatic transition from PROCESSING → READY
- File validation (type, size, duplicates)
- Blob URL memory management

**Key Features:**
- Background processing (non-blocking uploads)
- Real-time status tracking with polling
- Vector-based semantic document search
- RAG pipeline for accurate, grounded AI answers
- Citation extraction from source documents
- Automatic PDF preview loading

## 🛠️ Tech Stack

**Frontend:**
- React 18 with Hooks
- React Router v6
- Framer Motion (animations)
- Axios (HTTP client with interceptors)
- Lucide Icons
- React Markdown (AI response rendering)
- CSS Modules

**Backend:**
- Node.js / Express
- MySQL with connection pooling
- JWT (JSON Web Tokens)
- bcrypt (password hashing)
- Multer (file upload handling)
- pdf2json (PDF text extraction)

**AI/ML:**
- Google Gemini API
  - text-embedding-004 (768-dim vectors)
  - gemini-1.5-flash (text generation)
- Vector similarity (cosine distance)
- RAG (Retrieval-Augmented Generation)

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- MySQL v8+
- Google Gemini API key

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd AI-Powered-Evangadi-Forum

# 2. Backend setup
cd Backend
npm install
cp .env.example .env
# Edit .env with your credentials (see below)

# 3. Database setup
mysql -u root -p < db/schema.sql

# 4. Frontend setup
cd ../Frontend
npm install

# 5. Run application
# Terminal 1 - Backend
cd Backend
npm run dev

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=evangadi_forum

# Server
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your_strong_secret_key
JWT_EXPIRES_IN=7d

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads/documents
```

**Get Gemini API Key:** [Google AI Studio](https://makersuite.google.com/app/apikey)

## 📂 Project Structure

```
AI-Powered-Evangadi-Forum/
├── tasks/                    # Complete milestone documentation
│   ├── MASTER_TASK_LIST.md  # All tasks breakdown
│   ├── Frontend    #frontend tasks            
│   ├── Backend/    #Backend tasks         
│  
│                   
│
├── Backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth/         # User authentication (M1)
│   │   │   ├── question/     # Q&A + AI coach (M2)
│   │   │   ├── answers/      # Answer management (M2)
│   │   │   └── rag/          # Knowledge base (M3)
│   │   ├── middleware/       # Auth, error handling
│   │   └── utils/            # Helpers, chunking
│   ├── db/                   # Schema, config
│   └── uploads/documents/    # User PDFs
│
└── Frontend/
    └── src/
        ├── pages/
        │   ├── Auth/         # Login/Register (M1)
        │   ├── Landing/      # Public homepage (M1)
        │   ├── Dashboard/    # Question list (M2)
        │   ├── PostQuestion/ # Ask + AI coach (M2)
        │   ├── QuestionDetail/ # Q&A + AI fit (M2)
        │   ├── MyQuestions/  # User's questions (M2)
        │   └── RagDocuments/ # PDF library (M3)
        ├── components/       # Layout, Navbar, Sidebar
        ├── context/          # AuthContext
        └── services/         # API clients
```

## 🔑 Key API Endpoints

### Authentication (M1)
```
POST   /api/auth/register     # Create new user
POST   /api/auth/login        # Get JWT token
```

### Questions & Answers (M2)
```
GET    /api/questions                          # List all questions
POST   /api/questions                          # Create question + embed
GET    /api/questions/:questionHash            # Get question details
GET    /api/questions/search?query=text        # Semantic search
GET    /api/questions/:questionHash/similar    # Find similar questions
POST   /api/answers                            # Post answer
POST   /api/questions/draft-coach              # AI writing feedback
POST   /api/questions/:questionHash/answer-fit # Evaluate answer fit
```

### RAG Documents (M3)
```
GET    /api/rag/documents                    # List user documents
POST   /api/rag/documents                    # Upload PDF
GET    /api/rag/documents/:id                # Get document metadata
GET    /api/rag/documents/:id/file           # Stream PDF
DELETE /api/rag/documents/:id                # Delete document
GET    /api/rag/documents/:id/search?query=  # Search in document
POST   /api/rag/documents/:id/query          # AI Q&A on document
```

## 🎨 Technical Highlights

### RAG Processing Pipeline (M3)
```
Upload → Pending Status → Background Processing → Ready/Failed
                          ├─ PDF text extraction
                          ├─ Text chunking (1000 chars, 150 overlap)
                          ├─ Embedding generation (Gemini API)
                          └─ Vector storage (MySQL)
```

**Real-time Updates:**
- Frontend polls every 3 seconds for processing documents
- Automatic UI refresh when status changes
- Auto-loads PDF preview when document becomes ready
- Polling auto-stops when no processing documents exist

### AI Writing Assistance (M2)
**Draft Coach:**
- Real-time feedback while composing questions
- Suggestions for clarity, completeness, and tone
- Powered by Gemini 1.5 Flash

**Answer Fit Evaluation:**
- Analyzes how well draft answer addresses the question
- Confidence scoring before posting
- Reduces off-topic or unhelpful answers

### Semantic Search (M2 & M3)
- Vector embeddings for questions and documents
- Cosine similarity for relevance ranking
- Find conceptually similar content, not just keyword matches

## 🎯 Development Guidelines

### Git Workflow
```bash
# Create feature branch
git checkout -b milestone2/draft-coach

# Commit with convention
git commit -m "[BE] Implement AI draft coach endpoint"

# Push and create PR
git push origin milestone2/draft-coach
```


### Code Review Checklist
- [ ] Follows milestone task specification
- [ ] Error handling implemented
- [ ] Loading states for async operations
- [ ] Memory cleanup (useEffect cleanup functions)
- [ ] No console.log in production code
- [ ] Responsive design tested
- [ ] API responses validated

## 🐛 Common Issues & Solutions

**"Cannot connect to database"**
```bash
# Ensure MySQL is running and database exists
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS evangadi_forum;"
mysql -u root -p evangadi_forum < Backend/db/schema.sql
```

**"PDF processing stays in PROCESSING"**
- Verify `GEMINI_API_KEY` in Backend/.env
- Check backend console for processing errors
- Ensure PDF is not corrupted or password-protected

**"Semantic search returns no results"**
- Verify embeddings were generated (check database)
- Try broader search terms
- Ensure at least one document/question has been indexed

**"401 Unauthorized on API calls"**
- Check JWT token in localStorage
- Verify token hasn't expired (7 day default)
- Re-login to get fresh token

## 📚 Documentation

Complete technical specifications for each task are available in the `/tasks` folder:
- `MASTER_TASK_LIST.md` - All milestones overview
- `/Backend/*` - Backend task details
- `/Frontend/*` - Frontend tasks and designs


## 📝 License

This project was developed as part of the Evangadi Coding Academy curriculum.

---

**Built with ❤️ by Evangadi Nov 29, 2025 Batch - Group 3**
