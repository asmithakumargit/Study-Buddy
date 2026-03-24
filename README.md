
+# Study Buddy
+
+Study Buddy is a document-based learning application that allows users to upload a PDF and interact with it through summaries, quizzes, flashcards, a quiz game, and question-answer support.
+
+This build is prepared as a polished presentation demo for a specific PDF workflow, with smooth loading states, guided interactions, and document-specific output.
+
+## Features
+
+- Upload a PDF or TXT document
+- Generate a structured summary
+- Create multiple-choice quiz questions
+- View study flashcards
+- Play an interactive quiz game
+- Ask questions about the uploaded document
+
+## Tech Stack
+
+- Frontend: React
+- Backend: FastAPI
+- Styling: CSS / Tailwind-based utility setup
+
+## Project Structure
+
+```text
+study-buddy/
+|-- backend/
+|   |-- server.py
+|   `-- requirements.txt
+|-- frontend/
+|   |-- src/
+|   |-- public/
+|   `-- package.json
+|-- package.json
+`-- README.md
+```
+
+## How to Run
+
+### Backend
+
+1. Open the `backend` folder
+2. Install dependencies:
+
+```bash
+pip install -r requirements.txt
+```
+
+3. Start the backend:
+
+```bash
+uvicorn server:app --reload --host 0.0.0.0 --port 8000
+```
+
+### Frontend
+
+1. Open the `frontend` folder
+2. Install dependencies:
+
+```bash
+npm install
+```
+
+3. Start the frontend:
+
+```bash
+npm start
+```
+
+## Demo Notes
+
+- This version is optimized for presentation use
+- The prepared demo flow is designed for `UNIT 1.pdf`
+- Summary, quiz, flashcards, quiz game, and chat responses are tuned for a smooth demo experience
+
+## Author
+
+Asmitha Kumar  
+CSE  
+SRM Institute of Science and Technology
