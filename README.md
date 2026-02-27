# NyayMitra — न्याय मित्र
### AI-Powered WhatsApp Legal Helper for India
**Hackathon MVP | Team NyayMitra | Target: March 4, 2026**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?logo=next.js)](https://nextjs.org/)
[![AWS Bedrock](https://img.shields.io/badge/AI-Claude%203.5%20Sonnet-orange?logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![Twilio](https://img.shields.io/badge/Messaging-Twilio%20WhatsApp-red?logo=twilio)](https://twilio.com/)

---

## 🎯 What is NyayMitra?

NyayMitra ("न्याय मित्र" = Friend of Justice) is a **WhatsApp-based AI legal assistant** for Indian citizens who lack access to affordable legal help. Citizens send a WhatsApp message describing their problem, and NyayMitra replies in seconds with:

- ✅ Simple explanation of their legal rights
- ✅ Relevant Indian laws and acts
- ✅ Practical next steps
- ✅ Local lawyer / NGO contacts for Bengaluru
- ✅ Support for voice notes, document photos, and text
- ✅ Hyperlocal advice (pincode/area → Karnataka / Bengaluru jurisdiction)

---

## 🏗️ Architecture

```
WhatsApp User
     │
     ▼ (message: text / voice / photo)
┌─────────────┐
│   Twilio    │  WhatsApp Business API (Sandbox)
│  Sandbox    │
└──────┬──────┘
       │ POST /api/whatsapp (TwiML webhook)
       ▼
┌──────────────────────────────────────────┐
│         FastAPI Backend (Python)          │
│                                          │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Message    │  │  helpers.py      │  │
│  │  Router     │  │  - jurisdiction  │  │
│  │  (webhook)  │  │  - lawyer search │  │
│  └──────┬──────┘  └──────────────────┘  │
│         │                               │
│  ┌──────▼──────────────────────────┐    │
│  │         AWS Services            │    │
│  │  ┌─────────────────────────┐   │    │
│  │  │ Amazon Bedrock          │   │    │
│  │  │ Claude 3.5 Sonnet       │   │    │
│  │  │ (Legal AI reasoning)    │   │    │
│  │  └─────────────────────────┘   │    │
│  │  ┌──────────┐ ┌─────────────┐  │    │
│  │  │Transcribe│ │  Textract   │  │    │
│  │  │(voice→  │ │(doc OCR)    │  │    │
│  │  │ text)   │ │  [mock]     │  │    │
│  │  │[mock]   │ └─────────────┘  │    │
│  │  └──────────┘                  │    │
│  │  ┌──────────────────────────┐  │    │
│  │  │ Amazon Translate [mock]  │  │    │
│  │  └──────────────────────────┘  │    │
│  └─────────────────────────────────┘   │
│                                        │
│  POST /api/chat ◄── Next.js Frontend   │
└────────────────────────────────────────┘
       │
       ▼ TwiML XML / JSON
┌─────────────┐
│   Twilio    │ → WhatsApp reply to user
└─────────────┘

┌───────────────────────────────┐
│     Next.js Frontend          │
│   (Web chat fallback UI)      │
│   localhost:3000              │
└───────────────────────────────┘

Data:
  docs/lawyers.json  ← 10 Bengaluru lawyers/NGOs (mock)
```

---

## 📁 Project Structure

```
Nyay-Mitra/
├── backend/
│   ├── .env                    ← Fill with your credentials
│   ├── requirements.txt
│   └── app/
│       ├── main.py             ← FastAPI entry point
│       ├── config.py           ← Settings from .env
│       ├── routes/
│       │   └── whatsapp.py     ← Twilio webhook + /api/chat
│       └── services/
│           ├── helpers.py      ← Jurisdiction + lawyer search
│           └── aws/
│               ├── bedrock.py  ← Claude 3.5 Sonnet (Bedrock)
│               ├── transcribe.py  ← Voice→text (mock)
│               ├── translate.py   ← Translation (mock)
│               └── textract.py    ← OCR (mock)
├── frontend/               ← Next.js 14 web chat UI
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       └── ChatInterface.tsx
├── docs/
│   └── lawyers.json        ← Mock lawyer database
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- AWS account (for Bedrock) — optional (mock mode works without it)
- Twilio account (for WhatsApp Sandbox) — optional for local testing

### 1. Clone & Setup

```bash
git clone https://github.com/chiranthanHY/Nyay-Mitra.git
cd Nyay-Mitra
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env and fill in your AWS + Twilio credentials
# (App runs in mock mode if credentials are not set)

# Run the server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API Docs (Swagger): **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

### 4. Twilio Webhook Testing (WhatsApp Bot)

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`) and in Twilio Console:
- Go to **Messaging → Try it out → Send a WhatsApp message**
- Set webhook to: `https://abc123.ngrok-free.app/api/whatsapp`
- Method: `POST`
- Send "join <sandbox-keyword>" from WhatsApp to `+1-415-523-8886`

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | For real Bedrock |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | For real Bedrock |
| `AWS_REGION` | AWS region (default: ap-south-1) | For real Bedrock |
| `BEDROCK_MODEL_ID` | Claude model ID | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | For WhatsApp |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | For WhatsApp |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp number | For WhatsApp |

> ⚠️ The app runs in **mock mode** without AWS credentials — all legal advice is pre-configured for hackathon demos.

---

## 🤖 Supported Message Types

| Type | What happens |
|---|---|
| **Text** | Language detected → translated to English → Bedrock legal analysis |
| **Voice note** | Mock Transcribe → legal analysis of transcribed text |
| **Document photo** | Mock Textract OCR → extracts key info → legal analysis |
| **Shared location** | Captures GPS/address for jurisdiction resolution |
| **"hi" / "start"** | Welcome message with instructions |

---

## 📍 Jurisdiction Support

Currently focused on **Karnataka / Bengaluru Urban** with:
- 40+ pincode → area mappings
- 30+ area keyword mappings (Koramangala, Whitefield, Indiranagar, etc.)
- Automatic fallback to "Bengaluru" if area not recognized

---

## 👥 Mock Lawyer Database

10 Bengaluru lawyers/NGOs across specialties:
- Family law, domestic violence (Adv. Kavitha Reddy)
- Property/rent disputes (Adv. Mohammed Farhan)  
- Labour/migrant workers (Samara Legal Aid Foundation — FREE)
- Criminal/FIR (Adv. Priya Nair)
- All legal matters free (Karnataka Legal Services Authority — FREE)
- Consumer/RERA (Adv. Rajan Shetty)
- Women's safety (Vanitha Sahaya Kendra — FREE)
- Cyber law (Adv. Suresh Kumar G.)
- Employment/POSH (Adv. Ananya Krishnamurthy)
- Human rights/Dalit rights (Jeevana Human Rights Org — FREE)

---

## 🚀 Deployment

### Option A: AWS App Runner
```bash
# Build Docker image
docker build -t nyaymitra-backend ./backend

# Push to ECR
aws ecr create-repository --repository-name nyaymitra-backend
docker tag nyaymitra-backend:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/nyaymitra-backend:latest
docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/nyaymitra-backend:latest

# Deploy via AWS Console: App Runner → Create service → Select ECR image
```

### Option B: Render / Railway (Free Tier)
1. Push repo to GitHub
2. Connect Render/Railway to the repo
3. Set **Root Directory** to `backend`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in dashboard

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

---

## 🧪 Testing the API

```bash
# Health check
curl http://localhost:8000/api/health

# Chat endpoint (JSON)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "My landlord won't return my deposit", "location": "Koramangala, Bengaluru"}'

# Simulate WhatsApp webhook
curl -X POST http://localhost:8000/api/whatsapp \
  -d "From=whatsapp:+919876543210&Body=My employer hasn't paid salary for 2 months&NumMedia=0"
```

---

## ⚠️ Disclaimer

> This application provides **general legal information only** and does not constitute legal advice. Laws may have changed. Always consult a qualified and licensed lawyer for advice specific to your situation. NyayMitra and its creators are not liable for any decisions made based on information provided by this application.

---

## 📄 License

MIT License — See LICENSE file.

---

*Built with ❤️ for making justice accessible to every Indian citizen.*
