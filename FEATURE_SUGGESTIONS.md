# 🚀 NyayMitra — Feature Suggestions

> Based on a deep dive into the current codebase, architecture, and hackathon goals.  
> Prioritized by **impact × feasibility** for the March 4, 2026 deadline.

---

## 🔥 High Priority — Hackathon Differentiators

### 1. 📊 Legal Case Tracker Dashboard
**What:** A web dashboard where users can track their legal queries over time — with status updates, saved advice, and timelines.  
**Why:** Turns a one-shot Q&A bot into a persistent companion. Judges love "stickiness" in hackathon demos.  
**How:**
- Add a `sessions` table (or in-memory store for MVP) keyed by phone number / session ID
- Backend: New `/api/sessions/{id}` endpoints for history retrieval
- Frontend: New `CaseTracker.tsx` component with a timeline UI

---

### 2. 🗣️ Real Multilingual Voice Support
**What:** Replace the mock `transcribe.py` and `translate.py` with real AWS Transcribe + Translate (or use Whisper + IndicTrans2 for Indic languages).  
**Why:** The README promises voice-note support — making it actually work would be extremely impressive for demos. India has 22 official languages; many target users are more comfortable speaking than typing.  
**How:**
- Plug in AWS Transcribe Streaming or OpenAI Whisper for voice → text
- Use Amazon Translate or AI4Bharat IndicTrans2 for Hindi/Kannada/Tamil/Telugu ↔ English
- Update `_process_message` in `whatsapp.py` to route real audio

---

### 3. 📱 FIR / Complaint Draft Generator
**What:** Auto-generate formal complaint drafts (FIR, consumer complaint, labour complaint) that users can directly take to the police station or forum.  
**Why:** Provides *actionable* output beyond advice — a massive upgrade for underserved users who don't know how to draft formal legal documents.  
**How:**
- New service `complaint_drafter.py` using Claude with specialized prompts
- Templates for FIR (IPC sections), Consumer Forum, Labour Commissioner, POSH
- New frontend component `ComplaintDrafter.tsx` with form fields + PDF/WhatsApp export
- Backend route: `POST /api/draft-complaint`

---

### 4. 🆘 Emergency SOS Mode
**What:** A one-tap "I'm in danger" button on the web UI (and a WhatsApp keyword like "SOS") that immediately provides:
- Emergency numbers (Police 100, Women Helpline 181, Legal Aid 1516)
- Nearest police station based on location
- Quick safety tips for the situation
- Option to auto-share location with a trusted contact  
**Why:** Critical safety feature that shows real-world empathy and practical value.  
**How:**
- Frontend: Red SOS button in `ChatInterface.tsx` header
- Backend: Fast-path in `_process_message` that skips AI and returns hardcoded emergency data
- Bonus: Integrate Google Maps API for nearest police station lookup

---

## ⭐ Medium Priority — Strong Enhancements

### 5. 📋 Legal Document Scanner (Real OCR)
**What:** Replace the mock `textract.py` with real document scanning — users photograph a notice, lease agreement, or FIR and get AI analysis of key clauses and any red flags.  
**Why:** Many users receive legal documents they can't understand. This bridges literacy and legal-awareness gaps simultaneously.  
**How:**
- Integrate AWS Textract or Tesseract (free) for OCR
- Post-process extracted text through Claude for clause analysis
- Return a structured summary: "This document says X, the risks are Y, you should Z"

---

### 6. 🗺️ Expand Beyond Bengaluru — Pan-India Jurisdiction
**What:** Extend `helpers.py` jurisdiction mapping to support major metros (Mumbai, Delhi, Chennai, Hyderabad, Kolkata) and their local laws.  
**Why:** Makes the pitch scalable. "We built it for Bengaluru, but the architecture supports all of India."  
**How:**
- Add state-specific legal nuances to the Bedrock prompt (e.g., Maharashtra Rent Control Act vs Karnataka Rent Act)
- Expand `lawyers.json` with entries from other cities (even mock data)
- Add state-specific pincode mappings to `resolve_location()`

---

### 7. 💬 Conversation Memory & Context
**What:** Maintain chat history per user so follow-up questions work naturally ("What about the penalty?" after discussing a tenant dispute).  
**Why:** Current implementation is stateless — every message is treated independently. Contextual conversations feel dramatically more intelligent.  
**How:**
- In-memory dict or Redis store keyed by `session_id` / WhatsApp number
- Pass last N messages as context to Claude's system prompt
- Add `conversation_store.py` service

---

### 8. 📄 Legal Document Templates Library
**What:** A browsable library of downloadable legal templates — rental agreements, demand notices, RTI applications, consumer complaint forms — pre-filled with user details.  
**Why:** Empowers users to take action without a lawyer for common matters. Great for demo flow.  
**How:**
- New `TemplateBrowser.tsx` component with categories
- Backend serves templates (Markdown/PDF) from a `docs/templates/` directory
- AI can customize templates based on user's situation and location

---

### 9. ⭐ Lawyer Ratings & Reviews
**What:** Allow users to rate lawyers recommended by NyayMitra and see community ratings.  
**Why:** Builds trust and closes the feedback loop. Makes the lawyer directory feel like a real product, not mock data.  
**How:**
- Add `ratings` field to `lawyers.json` → migrate to a simple SQLite DB  
- New `POST /api/lawyers/{id}/review` endpoint
- Frontend: Star rating component in lawyer suggestion cards

---

### 10. 📤 Share & Export — WhatsApp-Friendly Cards
**What:** Let users share their Rights Card or legal advice summary via WhatsApp as a beautifully formatted image or PDF.  
**Why:** Viral growth — one user shares their card, their contacts discover NyayMitra.  
**How:**
- Extend `RightsCardGenerator.tsx` with "Share to WhatsApp" using the WhatsApp Share API (`https://wa.me/?text=...`)
- Generate a shareable image (already have `html2canvas`) with a QR code linking back to NyayMitra
- Backend: Generate short links for card previews

---

## 💡 Nice-to-Have — Polish & Innovation

### 11. 🤖 Legal Quiz / Know-Your-Rights Game
**What:** A gamified quiz ("Do you know your rights when police stop you?") that educates users and makes the app sticky.  
**Why:** Fun, viral, educational. Perfect for demos and student engagement.  
**How:**
- New `LegalQuiz.tsx` component with scenario-based MCQs
- Backend: Claude generates quiz questions based on Indian law
- Track scores and show "Legal Awareness Level"

---

### 12. 🌙 Dark Mode + Accessibility
**What:** Full dark mode support, high-contrast mode, font-size controls, and screen-reader compatible markup.  
**Why:** Shows thoughtfulness about inclusivity — judges notice this. Also, many users access WhatsApp/web at night.  
**How:**
- CSS custom properties for theme switching in `globals.css`
- Toggle button in the UI header
- ARIA labels and semantic HTML throughout

---

### 13. 📊 Admin Analytics Dashboard
**What:** A simple admin page showing usage stats — queries per day, top legal categories, most searched areas, response times.  
**Why:** Shows data-driven thinking. "We're not just building a tool, we're measuring legal access gaps."  
**How:**
- Log queries to a JSON file or SQLite
- New `/admin` page with charts (Chart.js or Recharts)
- Protected with a simple password

---

### 14. 🔔 Legal News & Alerts Feed
**What:** A sidebar or section showing recent legal news relevant to the user's state — new acts, Supreme Court rulings, deadline reminders (tax filing, RTI, etc.)  
**Why:** Keeps users coming back. Shows the app is "alive" and up-to-date.  
**How:**
- Scrape or use RSS from legal news sites (LiveLaw, Bar & Bench)
- Claude summarizes headlines in simple language
- New `LegalNewsFeed.tsx` component

---

### 15. 🧑‍🤝‍🧑 Community Forum (Stretch)
**What:** A simple anonymous Q&A forum where users can ask legal questions and see answers given to similar queries.  
**Why:** Builds community and reduces redundant queries (FAQs emerge naturally).  
**How:**
- New `Forum.tsx` page with question cards
- Backend: SQLite store for questions + AI-generated answers
- Upvote system for best answers

---

## 📋 Quick Wins (< 2 hours each)

| Feature | Effort | Impact |
|---------|--------|--------|
| **Auto-detect language** from user input and respond in same language | 1-2 hrs | 🔥 High |
| **Typing indicator** animation while AI is thinking | 30 min | ⭐ Medium |
| **Copy-to-clipboard** button on AI responses | 30 min | ⭐ Medium |
| **Pincode auto-complete** in location input | 1 hr | ⭐ Medium |
| **"Was this helpful?"** feedback buttons on responses | 1 hr | ⭐ Medium |
| **Loading skeleton** screens instead of spinners | 30 min | 💡 Polish |
| **Favicon + OG meta tags** for social sharing | 30 min | 💡 Polish |
| **Keyboard shortcuts** (Ctrl+Enter to send, Esc to close) | 30 min | 💡 Polish |

---

## 🏆 Recommended Hackathon Demo Flow

> If you can only pick **3 features** to build before the deadline:

1. **FIR / Complaint Draft Generator** (#3) — "Not just advice, we generate your legal documents"
2. **Emergency SOS Mode** (#4) — "When safety matters most, NyayMitra is there"
3. **Conversation Memory** (#7) — "It remembers your case, like a real lawyer would"

These three, combined with the existing chat + Rights Card features, tell a complete story:
> *"Ask about your rights → Get a downloadable rights card → Draft your complaint → Emergency help when you need it — all through WhatsApp."*

---

*Generated on Feb 27, 2026 • Based on analysis of the full NyayMitra codebase*
