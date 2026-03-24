from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List
import PyPDF2
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# In-memory storage for document chunks
document_storage = {
    'text': '',
    'chunks': [],
    'filename': ''
}

DEMO_FILENAME = "unit 1.pdf"
DEMO_ONLY_MESSAGE = (
    "This presentation build is prepared only for UNIT 1.pdf. "
    "Please upload that file to use summary, quiz, flashcards, quiz game, and chat."
)

DEMO_SUMMARY = """Unit I introduces the fundamentals of computer networks and the physical layer.

The document begins with data communication, defined as the exchange of data between devices through a transmission medium. A good communication system depends on delivery, accuracy, timeliness, and jitter control. It also explains the five basic components of data communication: message, sender, receiver, transmission medium, and protocol. Data flow modes are simplex, half-duplex, and full-duplex.

The notes then describe network criteria such as performance, reliability, and security, followed by types of connections like point-to-point and multipoint. Different network topologies are covered:
- Bus topology uses a single cable and is simple and inexpensive, but one cable failure can affect the whole network.
- Ring topology connects each device to two neighbors and supports orderly transmission, but troubleshooting is difficult.
- Star topology connects all devices to a central hub, making it easy to manage, though hub failure stops the network.
- Mesh topology provides direct links between nodes, offering robustness and privacy at high cost.
- Tree and hybrid topologies support hierarchical and mixed arrangements.

The document next explains network types:
- LAN covers a small area such as a home, office, or campus.
- MAN covers a city-sized area.
- WAN connects networks across large geographical distances.

Protocol layering is introduced through the OSI model, which divides communication into seven layers. The physical layer handles bit transmission, line configuration, transmission mode, topology, and signals. The data-link layer provides framing, physical addressing, flow control, error control, and access control. The network layer handles addressing and routing. The transport layer ensures end-to-end delivery and segmentation. The session layer manages dialog control and synchronization. The presentation layer handles translation, encryption, and compression. The application layer provides services through protocols such as HTTP, SMTP, DNS, SNMP, TELNET, and FTP.

The physical layer section also explains transmission media. Guided media include twisted pair cable, coaxial cable, and optical fiber. Unguided media include radio waves, microwaves, and infrared. Each medium is compared based on cost, bandwidth, interference, distance, and ease of installation.

Finally, the unit covers switching. In circuit switching, a dedicated path is established before communication, and the process includes setup, data transfer, and teardown. In packet switching, messages are divided into packets and resources are allocated on demand. Datagram networks are connectionless and may deliver packets out of order. Virtual-circuit networks combine features of both circuit-switched and packet-switched networks by using setup and teardown phases while still transferring packetized data.

Overall, the unit provides a foundation in network basics, protocol architecture, physical transmission methods, and switching techniques."""

DEMO_QUIZ = {
    "questions": [
        {
            "question": "Which four characteristics determine the effectiveness of a data communication system?",
            "options": [
                "Delivery, accuracy, timeliness, and jitter",
                "Speed, routing, bandwidth, and voltage",
                "Switching, framing, coding, and routing",
                "Reliability, topology, protocol, and media"
            ],
            "correct_answer": 0
        },
        {
            "question": "Which topology connects all devices to a central hub?",
            "options": [
                "Bus topology",
                "Ring topology",
                "Star topology",
                "Mesh topology"
            ],
            "correct_answer": 2
        },
        {
            "question": "What is the main function of the network layer in the OSI model?",
            "options": [
                "Data compression",
                "Routing and logical addressing",
                "Bit transmission",
                "Dialog control"
            ],
            "correct_answer": 1
        },
        {
            "question": "Which of the following is a guided transmission medium?",
            "options": [
                "Microwave",
                "Infrared",
                "Radio wave",
                "Optical fiber"
            ],
            "correct_answer": 3
        },
        {
            "question": "In a circuit-switched network, communication normally takes place in which three phases?",
            "options": [
                "Encoding, routing, and decoding",
                "Setup, data transfer, and teardown",
                "Framing, acknowledgment, and retransmission",
                "Login, transmission, and logout"
            ],
            "correct_answer": 1
        }
    ]
}

DEMO_FLASHCARDS = {
    "flashcards": [
        {
            "question": "What are the five components of a data communication system?",
            "answer": "Message, sender, receiver, transmission medium, and protocol."
        },
        {
            "question": "What is simplex communication?",
            "answer": "A unidirectional mode in which one device only sends and the other only receives."
        },
        {
            "question": "What is the main drawback of bus topology?",
            "answer": "If the main cable fails, the whole network can fail."
        },
        {
            "question": "Why is star topology easy to troubleshoot?",
            "answer": "Because each node has its own connection to the central hub."
        },
        {
            "question": "What does LAN stand for?",
            "answer": "Local Area Network."
        },
        {
            "question": "What is the primary role of the physical layer?",
            "answer": "To transmit individual bits from one node to another."
        },
        {
            "question": "Name the three major types of guided media.",
            "answer": "Twisted pair cable, coaxial cable, and optical fiber cable."
        },
        {
            "question": "How is packet switching different from circuit switching?",
            "answer": "Packet switching sends packetized data without reserving resources in advance, while circuit switching creates a dedicated path before transfer."
        }
    ]
}

DEMO_CHAT_RESPONSES = {
    "what are the characteristics of data communication": "The four characteristics are delivery, accuracy, timeliness, and jitter. Delivery means data must reach the correct destination, accuracy means it must arrive without errors, timeliness means it should arrive when needed, and jitter refers to variation in packet arrival time, especially important for audio and video.",
    "what is the difference between lan man and wan": "LAN covers a small area like a room, building, or campus. MAN covers a larger area such as a city. WAN connects networks over very large geographical distances, including across countries or worldwide.",
    "what is the difference between circuit switching and packet switching": "Circuit switching creates a dedicated path before communication and uses setup, data transfer, and teardown phases. Packet switching divides messages into packets and sends them on demand without reserving resources in advance, so packets may face delay, travel different paths, or arrive out of order."
}

DEMO_SUGGESTED_QUESTIONS = [
    "What are the characteristics of data communication?",
    "What is the difference between LAN, MAN, and WAN?",
    "What is the difference between circuit switching and packet switching?"
]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]

class Flashcard(BaseModel):
    question: str
    answer: str

class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]

class SummaryResponse(BaseModel):
    summary: str

class DocumentStatus(BaseModel):
    has_document: bool
    filename: str
    chunk_count: int

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    pdf_file = io.BytesIO(file_content)
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    
    return chunks

def is_demo_document() -> bool:
    return document_storage["filename"].strip().lower() == DEMO_FILENAME

def get_demo_chat_response(message: str) -> str:
    normalized = " ".join(message.strip().lower().split())
    for key, response in DEMO_CHAT_RESPONSES.items():
        if key in normalized:
            return response
    return (
        "For this demo, try one of these questions: "
        + " | ".join(DEMO_SUGGESTED_QUESTIONS)
    )

# Routes
@api_router.get("/")
async def root():
    return {"message": "Study Buddy API"}

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process PDF or TXT file"""
    try:
        content = await file.read()
        
        # Extract text based on file type
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(content)
        elif file.filename.endswith('.txt'):
            text = content.decode('utf-8')
        else:
            raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
        
        # Chunk the text
        chunks = chunk_text(text)
        
        # Store in memory
        document_storage['text'] = text
        document_storage['chunks'] = chunks
        document_storage['filename'] = file.filename
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "chunks": len(chunks),
            "text_length": len(text)
        }
    except Exception as e:
        logging.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/document-status", response_model=DocumentStatus)
async def get_document_status():
    """Check if a document is uploaded"""
    return DocumentStatus(
        has_document=bool(document_storage['text']),
        filename=document_storage['filename'],
        chunk_count=len(document_storage['chunks'])
    )

@api_router.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary():
    """Generate a summary of the uploaded document"""
    if not document_storage['text']:
        raise HTTPException(status_code=400, detail="No document uploaded")

    if is_demo_document():
        return SummaryResponse(summary=DEMO_SUMMARY)

    raise HTTPException(status_code=400, detail=DEMO_ONLY_MESSAGE)

@api_router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz():
    """Generate a multiple-choice quiz from the document"""
    if not document_storage['text']:
        raise HTTPException(status_code=400, detail="No document uploaded")

    if is_demo_document():
        return QuizResponse(**DEMO_QUIZ)

    raise HTTPException(status_code=400, detail=DEMO_ONLY_MESSAGE)

@api_router.post("/generate-flashcards", response_model=FlashcardsResponse)
async def generate_flashcards():
    """Generate flashcards from the document"""
    if not document_storage['text']:
        raise HTTPException(status_code=400, detail="No document uploaded")

    if is_demo_document():
        return FlashcardsResponse(**DEMO_FLASHCARDS)

    raise HTTPException(status_code=400, detail=DEMO_ONLY_MESSAGE)

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest):
    """Chat with the uploaded document"""
    if not document_storage['text']:
        raise HTTPException(status_code=400, detail="No document uploaded")

    if is_demo_document():
        return ChatResponse(response=get_demo_chat_response(request.message))

    raise HTTPException(status_code=400, detail=DEMO_ONLY_MESSAGE)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
