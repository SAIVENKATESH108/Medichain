# MediChain Verify Enterprise v2.0

**Autonomous Multi-Agent Pharmaceutical Verification, CDSCO Regulatory Compliance & Cryptographic SHA-256 Ledger Platform**

*NewStart 2026 — Problem Statement #5: Domain-Specialized AI Agents with Statutory Compliance Guardrails*  
**Lead Engineer & Architect:** V.A. SAI VENKATESH

---

## 🏛️ Architecture Overview

MediChain Verify is an enterprise-grade pharmaceutical verification platform engineered to detect and isolate counterfeit medications while strictly adhering to statutory compliance frameworks (**CDSCO Drugs & Cosmetics Act 1940 / Rules 1945**, **US FDA National Drug Code (NDC) & Recall Enforcement**, and **WHO Model List of Essential Medicines**).

```
                      ┌────────────────────────────────────────┐
                      │          Incoming Packaging Photo      │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Agent 0: Content Safety Guardrail      │
                      │ (NVIDIA Nemotron 3.5 Content Safety)   │
                      └───────────────────┬────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ Agent 1: Image Analysis (Vision OCR) │     │ Agent 2: Database Cross-Reference    │
│ • Google Gemini 3.6 Flash / Nemotron │     │ • OpenFDA API (NDC & Recalls)        │
│ • Packaging micro-typography         │     │ • 10,000+ Indian Medicines Master    │
│ • Batch, Mfg, Exp, License extract   │     │ • 7-Day TTL In-Memory O(1) LRU Cache │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                             │
                   └──────────────────────┬──────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Agent 3: Regulatory Compliance Engine  │
                      │ • CDSCO Drug Schedules (H / H1 / X / G)│
                      │ • 12-point Mandatory Label Check       │
                      │ • Section 18 Expiry Infractions        │
                      │ • WHO Model Essential Medicines List   │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Agent 4: Risk Assessor & Decision Core │
                      │ (ModelRouter: Z.ai GLM 5.2 / Gemma 4)  │
                      └───────────────────┬────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ Agent 5: Human Review & Governance   │     │ Cryptographic Audit Ledger Explorer  │
│ • Draft Quarantine Isolation Orders  │     │ • Sequential SHA-256 Hash Chain      │
│ • Draft CDSCO Form 19 Reports        │     │ • Immutable PostgreSQL Trigger       │
│ • Mandatory Pharmacist Sign-Off      │     │ • Zero Mutation / Deletion Invariant │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 🔒 Enterprise Guardrails, Invariants & CS Foundations

### 1. Human-in-the-Loop Regulatory Review Governance
- The platform **never** autonomously submits legal claims or regulatory filings.
- All quarantine isolation orders and statutory **CDSCO Form 19** violation dossiers are created as **DRAFTS** in `public.regulatory_review_queue` requiring explicit digital sign-off by a licensed pharmacist or regulatory drug inspector.

### 2. Cryptographic Tamper-Evident SHA-256 Audit Trail
- The `audit_log` table implements sequential block chaining:
  $$\text{Block Hash}_n = \text{SHA256}(\text{Block Hash}_{n-1} \parallel \text{canonicalJSON}(P_n) \parallel T_n \parallel \text{seq}_n)$$
- Protected by PostgreSQL database triggers forbidding `UPDATE` and `DELETE` queries, guaranteeing non-repudiation during regulatory audits.

### 3. Enterprise OOP Design Patterns
- **Strategy & Factory Pattern**: `ModelRouter` abstracts inference across **Google Gemini 3.6 Flash** and **OpenRouter Free Tier (`NVIDIA Nemotron 3.5`, `Google Gemma 4 26B/31B`, `Z.ai GLM 5.2`)**.
- **3-Strike Autonomous Circuit Breaker**: Automatically fails over to redundant zero-cost model pools upon 3 consecutive 429/5xx upstream anomalies.
- **Chain of Responsibility**: Coordinates the sequential handoff from Agent 0 through Agent 5 with end-to-end audit step recording.

### 4. Advanced Data Structures & Dynamic Programming Algorithms
- **Generic $O(1)$ LRU Cache with TTL** (`src/lib/dataStructures/LRUCache.ts`): Generic doubly-linked list with hash map caching OpenFDA lookups, model outputs, and 10,000+ Indian medicine records with 7-day TTL expiration.
- **Memory-Optimized Levenshtein Distance** (`src/lib/algorithms/fuzzyMatcher.ts`): Two-row memory optimized dynamic programming ($O(N)$ space) calculating edit distances for typo-tolerant medicine brand matching.
- **Tri-Gram Jaccard Tokenizer**: Sub-word similarity ranking for pharmaceutical salt compositions.

---

## 🛠️ Tech Stack & Model Infrastructure

| Component | Technology |
|---|---|
| **Frontend Framework** | React 18 / 19 + TypeScript (Strict Mode) |
| **Build Tool & Bundler** | Vite 8 (Sub-850ms Hot Reload & Production Build) |
| **Styling & Design System**| Tailwind CSS v4 + Vanilla CSS Design Tokens (Dual Light & Dark Theme) |
| **Motion & 3D Visuals** | Framer Motion + Lucide React + Laser Scan Animations |
| **Primary Multimodal Vision** | Google Gemini 3.6 Flash REST API |
| **Free OpenRouter Model Pool**| NVIDIA Nemotron 3.5 (Safety), Google Gemma 4 31B (Chat), Z.ai GLM 5.2 (1M Reasoning) |
| **Database & Auth** | Supabase PostgreSQL + Row-Level Security (RLS) + Storage |
| **Testing Framework** | Vitest + Testing Library + JSDOM (`41/41 tests passing`) |
| **Documentation & Reports**| ReportLab 5.0 + PyMuPDF (`29-page Executive Specification PDF`) |

---

## 📑 20 System Modules & Complete Documentation

Full architectural documentation and visual walk-throughs are available in [`doc/MediChain_Verify_Enterprise_Specification.pdf`](doc/MediChain_Verify_Enterprise_Specification.pdf).

1. **Module 1**: Call-To-Action Gateway & Enterprise Deployment Matrix (`/`)
2. **Module 2**: Frequently Asked Questions (FAQ) Accordion (`/`)
3. **Module 3**: Tamper-Evident SHA-256 Audit Ledger Visualizer (`/`)
4. **Module 4**: 6 Specialized Domain AI Agents Architecture Blueprint (`/`)
5. **Module 5**: Interactive 3D Medicine Sandbox Simulator (`/`)
6. **Module 6**: Autonomous AI for Medicine Authentication — Hero Section (`/`)
7. **Module 7**: Sign In to Workspace & Quick Role Credentials (`/login`)
8. **Module 8**: Settings & Enterprise Organization Controls (`/settings`)
9. **Module 9**: Verification Records & Compliance Dossiers Repository (`/reports`)
10. **Module 10**: AI Health Safety Assistant — Real-Time Guidance (`/assistant`)
11. **Module 11**: AI Health Safety Assistant — Workspace Interface (`/assistant`)
12. **Module 12**: Cryptographic Audit Ledger Block Explorer (`/ledger-explorer`)
13. **Module 13**: CDSCO Drug Schedules & Indian Medicine Directory (`/cdsco-hub`)
14. **Module 14**: CDSCO & Global Medicine Registry Hub (`/cdsco-hub`)
15. **Module 15**: Batch Quarantine & Lot Isolation Vault (`/quarantine-vault`)
16. **Module 16**: Regulatory Incident & Review Queue (`/review-queue`)
17. **Module 17**: Packaging OCR Findings & 6-Agent Audit Trail (`/verify`)
18. **Module 18**: Verify Medicine Authenticity — Evaluation Verdict (`/verify`)
19. **Module 19**: AI Decrypted Packaging Form Fields (`/verify`)
20. **Module 20**: Verify Medicine Authenticity — Image Upload & Scan (`/verify`)

---

## 🧪 Testing & Verification

The comprehensive Vitest test suite validates compliance rules, OpenFDA network fault tolerance, circuit breaker fallbacks, data structures, and cryptographic hash chain integrity.

```bash
# Run unit & integration tests (41/41 passing)
npm test

# Run tests in watch mode
npm run test:watch

# Run production build and TypeScript strict check
npm run build
```

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd HackthonProject
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_OPENROUTER_API_KEY=your-openrouter-key (free tier enabled)
```

### 3. Start Development Server
```bash
npm run dev
```

---

## 📜 Engineering Documentation
- **Executive Engineering Specification PDF**: [`doc/MediChain_Verify_Enterprise_Specification.pdf`](doc/MediChain_Verify_Enterprise_Specification.pdf)

---

## ⚖️ License
Built for **NewStart 2026** by **V.A. SAI VENKATESH**. Certified for production deployment.
