import { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { Upload, Sparkles, Brain, CreditCard, Gamepad2, MessageSquare, FileText, Loader2, Send, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [file, setFile] = useState(null);
  const [hasDocument, setHasDocument] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [summary, setSummary] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    checkDocumentStatus();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const waitForEffect = (ms = 3200) => new Promise((resolve) => setTimeout(resolve, ms));

  const typeMessage = async (fullText) => {
    setTypingMessage('');
    for (let i = 0; i < fullText.length; i += 1) {
      setTypingMessage(fullText.slice(0, i + 1));
      await new Promise((resolve) => setTimeout(resolve, 14));
    }
    setTypingMessage('');
  };

  const getErrorMessage = (error, fallbackMessage) => {
    return error?.response?.data?.detail || fallbackMessage;
  };

  const checkDocumentStatus = async () => {
    try {
      const response = await axios.get(`${API}/document-status`);
      setHasDocument(response.data.has_document);
    } catch (error) {
      console.error('Error checking document status:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.pdf') && !selectedFile.name.endsWith('.txt')) {
      toast.error('Please upload a PDF or TXT file');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setLoadingMessage('Analyzing document...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setHasDocument(true);
      setSummary('');
      setQuiz(null);
      setFlashcards([]);
      setChatMessages([]);
      setGameState(null);
      setActiveTab('summary');
      toast.success(`${response.data.filename} uploaded successfully!`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload file'));
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!hasDocument) {
      toast.error('Please upload a document first');
      return;
    }
    setLoading(true);
    setLoadingMessage('Generating summary...');
    setActiveTab('summary');
    try {
      await waitForEffect();
      const response = await axios.post(`${API}/generate-summary`);
      setSummary(response.data.summary);
      toast.success('Summary generated!');
    } catch (error) {
      setSummary('');
      toast.error(getErrorMessage(error, 'Failed to generate summary'));
      console.error('Summary error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!hasDocument) {
      toast.error('Please upload a document first');
      return;
    }
    setLoading(true);
    setLoadingMessage('Preparing quiz...');
    setActiveTab('quiz');
    try {
      await waitForEffect();
      const response = await axios.post(`${API}/generate-quiz`);
      setQuiz(response.data);
      toast.success('Quiz generated!');
    } catch (error) {
      setQuiz(null);
      toast.error(getErrorMessage(error, 'Failed to generate quiz'));
      console.error('Quiz error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    if (!hasDocument) {
      toast.error('Please upload a document first');
      return;
    }
    setLoading(true);
    setLoadingMessage('Preparing flashcards...');
    setActiveTab('flashcards');
    try {
      await waitForEffect();
      const response = await axios.post(`${API}/generate-flashcards`);
      setFlashcards(response.data.flashcards);
      setFlippedCards(new Set());
      toast.success('Flashcards generated!');
    } catch (error) {
      setFlashcards([]);
      toast.error(getErrorMessage(error, 'Failed to generate flashcards'));
      console.error('Flashcards error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!hasDocument) {
      toast.error('Please upload a document first');
      return;
    }
    setLoading(true);
    setLoadingMessage('Preparing quiz game...');
    setActiveTab('game');
    try {
      await waitForEffect();
      const response = await axios.post(`${API}/generate-quiz`);
      setGameState(response.data);
      setCurrentQuestion(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowResult(false);
      toast.success('Game started!');
    } catch (error) {
      setGameState(null);
      toast.error(getErrorMessage(error, 'Failed to start game'));
      console.error('Game error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = () => {
    if (!hasDocument) {
      toast.error('Please upload a document first');
      return;
    }
    setActiveTab('chat');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !hasDocument) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setLoading(true);
    setLoadingMessage('Analyzing question...');

    try {
      await waitForEffect(1800);
      const response = await axios.post(`${API}/chat`, { message: chatInput });
      await typeMessage(response.data.response);
      const aiMessage = { role: 'ai', content: response.data.response };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to get response'));
      console.error('Chat error:', error);
      setTypingMessage('');
    } finally {
      setLoading(false);
    }
  };

  const flipCard = (index) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(index)) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
    }
    setFlippedCards(newFlipped);
  };

  const selectAnswer = (answerIndex) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    if (answerIndex === gameState.questions[currentQuestion].correct_answer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < gameState.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  const restartGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="App min-h-screen p-6">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-3">
            <span className="gradient-text">Study Buddy</span>
          </h1>
          <p className="text-lg text-slate-600 font-medium">Your AI-Powered Learning Assistant</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Upload & Tools */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* File Upload */}
            <div className="glass-panel rounded-3xl p-6" data-testid="upload-section">
              <h3 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-study-pink" />
                Upload Document
              </h3>
              <div className="file-upload-zone rounded-2xl p-8 text-center" data-testid="file-upload-zone">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-input"
                  data-testid="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  {file ? (
                    <div>
                      <FileText className="w-12 h-12 mx-auto mb-3 text-study-pink" />
                      <p className="font-medium text-slate-700">{file.name}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <p className="font-medium text-slate-600">Drop your PDF or TXT file here</p>
                      <p className="text-sm text-slate-500 mt-2">or click to browse</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Tools */}
            <div className="glass-panel rounded-3xl p-6" data-testid="tools-section">
              <h3 className="text-xl font-heading font-semibold mb-4">Learning Tools</h3>
              <div className="space-y-3">
                <button
                  onClick={generateSummary}
                  className={`tool-button w-full rounded-2xl p-4 flex items-center gap-3 font-semibold ${activeTab === 'summary' ? 'active' : ''} ${!hasDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasDocument}
                  data-testid="summary-button"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Summary
                </button>
                
                <button
                  onClick={generateQuiz}
                  className={`tool-button w-full rounded-2xl p-4 flex items-center gap-3 font-semibold ${activeTab === 'quiz' ? 'active' : ''} ${!hasDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasDocument}
                  data-testid="quiz-button"
                >
                  <Brain className="w-5 h-5" />
                  Create Quiz
                </button>
                
                <button
                  onClick={generateFlashcards}
                  className={`tool-button w-full rounded-2xl p-4 flex items-center gap-3 font-semibold ${activeTab === 'flashcards' ? 'active' : ''} ${!hasDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasDocument}
                  data-testid="flashcards-button"
                >
                  <CreditCard className="w-5 h-5" />
                  Flashcards
                </button>
                
                <button
                  onClick={startGame}
                  className={`tool-button w-full rounded-2xl p-4 flex items-center gap-3 font-semibold ${activeTab === 'game' ? 'active' : ''} ${!hasDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasDocument}
                  data-testid="game-button"
                >
                  <Gamepad2 className="w-5 h-5" />
                  Quiz Game
                </button>
                
                <button
                  onClick={openChat}
                  className={`tool-button w-full rounded-2xl p-4 flex items-center gap-3 font-semibold ${activeTab === 'chat' ? 'active' : ''} ${!hasDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasDocument}
                  data-testid="chat-button"
                >
                  <MessageSquare className="w-5 h-5" />
                  Ask Questions
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-2" data-testid="output-panel">
            <div className="glass-panel rounded-3xl p-8 min-h-[600px]">
              {loading && (
                <div className="flex flex-col items-center justify-center h-full" data-testid="loading-state">
                  <Loader2 className="w-12 h-12 animate-spin text-study-pink mb-4" />
                  <p className="text-slate-600 font-medium">{loadingMessage}</p>
                </div>
              )}

              {!loading && !hasDocument && (
                <div className="flex flex-col items-center justify-center h-full text-center" data-testid="welcome-state">
                  <div className="mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-study-pink to-study-purple flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-3 text-slate-800">Welcome to Study Buddy!</h2>
                  <p className="text-slate-600 text-lg max-w-md">Upload a document to get started with AI-powered summaries, quizzes, flashcards, and more.</p>
                </div>
              )}

              {!loading && hasDocument && activeTab === 'summary' && summary && (
                <div data-testid="summary-display">
                  <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-study-pink" />
                    Summary
                  </h2>
                  <div className="prose prose-slate max-w-none">
                    <div className="bg-white/50 rounded-2xl p-6 whitespace-pre-wrap text-slate-700 leading-relaxed">
                      {summary}
                    </div>
                  </div>
                </div>
              )}

              {!loading && hasDocument && activeTab === 'quiz' && quiz && (
                <div data-testid="quiz-display">
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                    <Brain className="w-6 h-6 text-study-pink" />
                    Quiz
                  </h2>
                  <div className="space-y-6">
                    {quiz.questions.map((q, idx) => (
                      <div key={idx} className="bg-white/70 rounded-2xl p-6" data-testid={`quiz-question-${idx}`}>
                        <p className="font-semibold text-lg mb-4 text-slate-800">{idx + 1}. {q.question}</p>
                        <div className="space-y-2">
                          {q.options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-xl border-2 ${
                                optIdx === q.correct_answer
                                  ? 'bg-green-50 border-green-400 text-green-700'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                              data-testid={`quiz-option-${idx}-${optIdx}`}
                            >
                              <span className="font-medium">{String.fromCharCode(65 + optIdx)}.</span> {option}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && hasDocument && activeTab === 'flashcards' && flashcards.length > 0 && (
                <div data-testid="flashcards-display">
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-study-pink" />
                    Flashcards
                  </h2>
                  <p className="text-sm text-slate-600 mb-6">Click on a card to flip it</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flashcards.map((card, idx) => (
                      <div
                        key={idx}
                        className={`flashcard ${flippedCards.has(idx) ? 'flipped' : ''}`}
                        onClick={() => flipCard(idx)}
                        data-testid={`flashcard-${idx}`}
                      >
                        <div className="flashcard-inner">
                          <div className="flashcard-front">
                            <p className="text-center font-medium text-slate-800">{card.question}</p>
                          </div>
                          <div className="flashcard-back">
                            <p className="text-center font-medium text-slate-800">{card.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && hasDocument && activeTab === 'game' && gameState && !showResult && (
                <div data-testid="game-display">
                  <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                      <Gamepad2 className="w-6 h-6 text-study-pink" />
                      Quiz Game
                    </h2>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Question {currentQuestion + 1} of {gameState.questions.length}</p>
                      <p className="font-bold text-study-purple" data-testid="game-score">Score: {score}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/70 rounded-2xl p-8">
                    <p className="text-xl font-semibold mb-6 text-slate-800" data-testid="game-question">
                      {gameState.questions[currentQuestion].question}
                    </p>
                    <div className="space-y-3 mb-6">
                      {gameState.questions[currentQuestion].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectAnswer(idx)}
                          disabled={selectedAnswer !== null}
                          className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                            selectedAnswer === null
                              ? 'bg-white hover:bg-study-pink/10 border-2 border-slate-200 hover:border-study-pink'
                              : idx === gameState.questions[currentQuestion].correct_answer
                              ? 'bg-green-100 border-2 border-green-400 text-green-700'
                              : idx === selectedAnswer
                              ? 'bg-red-100 border-2 border-red-400 text-red-700'
                              : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}
                          data-testid={`game-option-${idx}`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + idx)}.</span> {option}
                        </button>
                      ))}
                    </div>
                    {selectedAnswer !== null && (
                      <button
                        onClick={nextQuestion}
                        className="bg-gradient-to-r from-study-pink to-study-purple text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-all"
                        data-testid="game-next-button"
                      >
                        {currentQuestion < gameState.questions.length - 1 ? 'Next Question' : 'Finish'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!loading && hasDocument && activeTab === 'game' && showResult && (
                <div className="text-center" data-testid="game-result">
                  <div className="mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-study-pink to-study-purple flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl font-bold text-white">{score}/{gameState.questions.length}</span>
                    </div>
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-3">Quiz Complete!</h2>
                  <p className="text-xl text-slate-600 mb-6">
                    You scored {score} out of {gameState.questions.length}
                  </p>
                  <button
                    onClick={restartGame}
                    className="bg-gradient-to-r from-study-pink to-study-purple text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-all inline-flex items-center gap-2"
                    data-testid="game-restart-button"
                  >
                    <RotateCw className="w-5 h-5" />
                    Play Again
                  </button>
                </div>
              )}

              {!loading && hasDocument && activeTab === 'chat' && (
                <div className="flex flex-col h-[550px]" data-testid="chat-display">
                  <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-study-pink" />
                    Ask Questions
                  </h2>
                  
                  <div className="flex-1 overflow-y-auto mb-4 space-y-3 thin-scrollbar pr-2" data-testid="chat-messages">
                    {chatMessages.length === 0 && (
                      <p className="text-slate-500 text-center mt-8">Start a conversation about your document</p>
                    )}
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`chat-message-${idx}`}
                      >
                        <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {typingMessage && (
                      <div className="flex justify-start" data-testid="chat-typing-message">
                        <div className="chat-bubble-ai">
                          {typingMessage}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Ask a question about your document..."
                      className="flex-1 bg-white/50 border-transparent focus:border-study-blue focus:ring-2 focus:ring-study-blue/20 rounded-full px-6 py-3 outline-none transition-all placeholder:text-slate-400"
                      disabled={loading}
                      data-testid="chat-input"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || loading}
                      className="bg-gradient-to-r from-study-pink to-study-purple text-white p-3 rounded-full hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="chat-send-button"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
