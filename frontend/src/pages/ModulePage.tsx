import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { API_URL, supabase } from '../lib/supabaseClient';
import { 
  FileText, Upload, Brain, HelpCircle, FileQuestion, BookOpen, 
  RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, File
} from 'lucide-react';

type AIResults = {
  flashcards?: { question: string; answer: string }[];
  quiz?: { question: string; options: string[]; answer: string; explanation: string }[];
  qa?: { question: string; answer: string }[];
  summary?: string;
};

type PDF = {
  id: string;
  filename: string;
  file_url: string;
};

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { user, token } = useAuth();
  
  const [moduleName, setModuleName] = useState('Loading module...');
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [aiResults, setAiResults] = useState<AIResults>({});
  const [activeView, setActiveView] = useState<'flashcards' | 'quiz' | 'qa' | 'summary' | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);

  // Load Module Data
  useEffect(() => {
    if (!moduleId || !token) return;

    const loadData = async () => {
      try {
        // Mock get module name
        const userRes = await fetch(`${API_URL}/modules/user/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (userRes.ok) {
          const data = await userRes.json();
          const mod = data.find((m: any) => m.id === moduleId);
          if (mod) setModuleName(mod.name);
        }

        // Load PDFs
        const pdfRes = await fetch(`${API_URL}/modules/${moduleId}/pdfs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (pdfRes.ok) {
          const pdfData = await pdfRes.json();
          setPdfs(pdfData);
        }

        // Load AI Results
        const aiRes = await fetch(`${API_URL}/modules/${moduleId}/ai/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiResults(aiData);
        }
      } catch (e) {
        console.error('Error loading module data', e);
      }
    };

    loadData();
  }, [moduleId, token, user?.id]);

  const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !moduleId || !token) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadProgress(10);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const res = await fetch(`${API_URL}/modules/${moduleId}/pdfs/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      clearInterval(progressInterval);
      
      if (res.ok) {
        setUploadProgress(100);
        // Refresh PDFs
        const pdfRes = await fetch(`${API_URL}/modules/${moduleId}/pdfs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (pdfRes.ok) {
          setPdfs(await pdfRes.json());
        }
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleCallAI = async (type: 'flashcards' | 'quiz' | 'qa' | 'summary', regenerate = false) => {
    if (!regenerate && aiResults[type] && (Array.isArray(aiResults[type]) ? (aiResults[type] as any[]).length > 0 : aiResults[type])) {
      setActiveView(type);
      return;
    }

    setLoadingAI(true);
    setActiveView(type);
    try {
      const endpoint = type === 'qa' ? 'qa-practice' : type;
      const res = await fetch(`${API_URL}/modules/${moduleId}/ai/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ regenerate })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResults(prev => ({ ...prev, [type]: data[type] || data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-ink">{moduleName}</h1>
        <p className="text-ink/60">Manage study materials and generate AI content.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* Left Column: Materials */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
          
          <div className="bg-white rounded-2xl p-6 border border-ink/10 shadow-sm">
            <h2 className="text-xl font-display font-bold text-ink mb-4 flex items-center gap-2">
              <FileText className="text-moss" />
              Documents
            </h2>
            
            <div className="space-y-3 mb-4">
              {pdfs.map(pdf => (
                <div key={pdf.id} className="flex items-center justify-between p-3 bg-parchment rounded-xl border border-ink/5 hover:border-moss/30 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File className="text-clay shrink-0" size={20} />
                    <span className="truncate text-sm font-medium text-ink">{pdf.filename}</span>
                  </div>
                  <button 
                    onClick={() => setViewingPdf(pdf.file_url)}
                    className="text-xs bg-white px-3 py-1.5 rounded-lg font-medium text-moss border border-moss/20 hover:bg-moss/5 transition-colors"
                  >
                    View
                  </button>
                </div>
              ))}
              {pdfs.length === 0 && (
                <div className="text-center p-6 bg-parchment/50 rounded-xl border border-dashed border-ink/20 text-ink/50 text-sm">
                  No documents uploaded yet.
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleUploadPDF}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={uploading}
              />
              <div className={`w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${uploading ? 'border-moss/50 bg-moss/5' : 'border-ink/20 hover:border-moss hover:bg-moss/5'}`}>
                <Upload className={uploading ? 'text-moss animate-bounce' : 'text-ink/40'} />
                <span className="text-sm font-medium text-ink/70">
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Upload PDF'}
                </span>
                {uploading && (
                  <div className="w-full max-w-[150px] bg-ink/10 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-moss h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI Assistant */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-ink/10 shadow-sm overflow-hidden">
          
          {/* AI Header */}
          <div className="p-4 bg-parchment border-b border-ink/10 flex items-center gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 mr-4 font-display font-bold text-ink">
              <Brain className="text-moss" />
              AI Study
            </div>
            
            <AIButton 
              icon={<BookOpen size={18} />} label="Flashcards" 
              active={activeView === 'flashcards'} 
              hasData={!!(aiResults.flashcards?.length)} 
              onClick={() => handleCallAI('flashcards')} 
            />
            <AIButton 
              icon={<FileQuestion size={18} />} label="Quiz" 
              active={activeView === 'quiz'} 
              hasData={!!(aiResults.quiz?.length)} 
              onClick={() => handleCallAI('quiz')} 
            />
            <AIButton 
              icon={<HelpCircle size={18} />} label="Q&A" 
              active={activeView === 'qa'} 
              hasData={!!(aiResults.qa?.length)} 
              onClick={() => handleCallAI('qa')} 
            />
            <AIButton 
              icon={<FileText size={18} />} label="Summary" 
              active={activeView === 'summary'} 
              hasData={!!aiResults.summary} 
              onClick={() => handleCallAI('summary')} 
            />
          </div>

          {/* AI Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-parchment/30">
            {loadingAI ? (
              <div className="h-full flex flex-col items-center justify-center text-ink/50 space-y-4">
                <RefreshCw className="animate-spin text-moss" size={32} />
                <p className="font-medium animate-pulse">AI is generating content...</p>
              </div>
            ) : !activeView ? (
              <div className="h-full flex flex-col items-center justify-center text-ink/40 text-center max-w-sm mx-auto space-y-4">
                <Brain size={48} className="text-ink/20" />
                <p>Select a study mode above to generate intelligent study materials from your uploaded documents.</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={() => handleCallAI(activeView, true)}
                    className="flex items-center gap-2 text-sm text-ink/60 hover:text-moss transition-colors px-3 py-1.5 rounded-lg hover:bg-moss/10"
                  >
                    <RefreshCw size={14} />
                    Regenerate
                  </button>
                </div>
                
                {activeView === 'flashcards' && aiResults.flashcards && <FlashcardsView cards={aiResults.flashcards} />}
                {activeView === 'quiz' && aiResults.quiz && <QuizView quiz={aiResults.quiz} />}
                {activeView === 'qa' && aiResults.qa && <QAView qa={aiResults.qa} />}
                {activeView === 'summary' && aiResults.summary && <SummaryView summary={aiResults.summary} />}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* PDF Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
          <div className="bg-white w-full max-w-5xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-ink/10 bg-parchment">
              <h3 className="font-bold text-ink">Document Viewer</h3>
              <button onClick={() => setViewingPdf(null)} className="p-2 hover:bg-ink/10 rounded-full transition-colors">
                <XCircle size={24} className="text-ink/60" />
              </button>
            </div>
            <div className="flex-1 bg-ink/5">
              {viewingPdf ? (
                <iframe src={viewingPdf} className="w-full h-full border-none" title="PDF Viewer" />
              ) : (
                <div className="flex h-full items-center justify-center text-ink/50">Preview not available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIButton({ icon, label, active, hasData, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
        active ? 'bg-moss text-white shadow-md' : 'bg-white text-ink border border-ink/10 hover:border-moss/30 hover:bg-parchment'
      }`}
    >
      {icon}
      {label}
      {hasData && !active && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-moss rounded-full border-2 border-parchment"></span>
      )}
    </button>
  );
}

// Subcomponents for AI Views

function FlashcardsView({ cards }: { cards: { question: string, answer: string }[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) return <div>No flashcards generated.</div>;

  const handleNext = () => { setFlipped(false); setIndex(p => Math.min(p + 1, cards.length - 1)); };
  const handlePrev = () => { setFlipped(false); setIndex(p => Math.max(p - 1, 0)); };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full">
      <div className="text-sm font-medium text-ink/50 mb-4">Card {index + 1} of {cards.length}</div>
      
      <div 
        className="w-full aspect-[3/2] bg-white rounded-3xl shadow-lg border-2 border-ink/5 cursor-pointer perspective-1000 relative group"
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`absolute inset-0 p-8 flex items-center justify-center text-center transition-all duration-500 transform-style-3d ${flipped ? 'rotate-y-180 opacity-0' : 'opacity-100'}`}>
          <h3 className="text-2xl font-display font-medium text-ink">{cards[index].question}</h3>
        </div>
        <div className={`absolute inset-0 p-8 flex items-center justify-center text-center transition-all duration-500 transform-style-3d bg-moss rounded-3xl text-white ${flipped ? 'opacity-100' : 'rotate-y-180 opacity-0'}`}>
          <p className="text-xl font-medium">{cards[index].answer}</p>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-ink/40 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to flip
        </div>
      </div>

      <div className="flex items-center gap-6 mt-8">
        <button onClick={handlePrev} disabled={index === 0} className="p-3 bg-white rounded-full shadow-sm border border-ink/10 disabled:opacity-50 hover:bg-parchment">
          <ChevronLeft />
        </button>
        <button onClick={handleNext} disabled={index === cards.length - 1} className="p-3 bg-white rounded-full shadow-sm border border-ink/10 disabled:opacity-50 hover:bg-parchment">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

function QuizView({ quiz }: { quiz: any[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = Object.keys(answers).reduce((acc, idx) => {
    return acc + (answers[Number(idx)] === quiz[Number(idx)].answer ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-8 pb-8">
      {submitted && (
        <div className="bg-moss/10 text-moss p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 className="text-3xl font-display font-bold mb-2">{score} / {quiz.length}</h3>
          <p className="font-medium">You got {Math.round((score / quiz.length) * 100)}% correct!</p>
          <button 
            onClick={() => { setAnswers({}); setSubmitted(false); }}
            className="mt-4 px-6 py-2 bg-moss text-white rounded-xl font-medium shadow-sm hover:bg-moss/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {quiz.map((q, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-ink/10">
          <h4 className="font-display font-medium text-lg text-ink mb-4">{i + 1}. {q.question}</h4>
          <div className="space-y-2">
            {q.options.map((opt: string) => {
              const isSelected = answers[i] === opt;
              const isCorrect = submitted && q.answer === opt;
              const isWrong = submitted && isSelected && !isCorrect;

              let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all ";
              if (submitted) {
                if (isCorrect) btnClass += "border-moss bg-moss/10 text-moss";
                else if (isWrong) btnClass += "border-clay bg-clay/10 text-clay";
                else btnClass += "border-ink/5 bg-parchment opacity-50";
              } else {
                if (isSelected) btnClass += "border-moss bg-moss/5 text-moss";
                else btnClass += "border-ink/10 bg-white hover:border-moss/30 hover:bg-parchment";
              }

              return (
                <button
                  key={opt}
                  onClick={() => !submitted && setAnswers({ ...answers, [i]: opt })}
                  disabled={submitted}
                  className={btnClass}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {submitted && isCorrect && <CheckCircle size={18} className="text-moss" />}
                    {submitted && isWrong && <XCircle size={18} className="text-clay" />}
                  </div>
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className="mt-4 p-4 bg-parchment rounded-xl text-sm text-ink/70 border border-ink/5">
              <span className="font-bold text-ink mr-2">Explanation:</span>
              {q.explanation}
            </div>
          )}
        </div>
      ))}
      
      {!submitted && quiz.length > 0 && (
        <button 
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < quiz.length}
          className="w-full py-4 bg-moss text-white rounded-xl font-bold shadow-md hover:bg-moss/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Quiz
        </button>
      )}
    </div>
  );
}

function QAView({ qa }: { qa: any[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {qa.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-ink/10 overflow-hidden">
          <button 
            className="w-full text-left p-5 font-display font-medium text-ink hover:bg-parchment transition-colors flex justify-between items-center"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            <span>{item.question}</span>
            <ChevronRight className={`transform transition-transform ${openIdx === i ? 'rotate-90' : ''}`} size={20} />
          </button>
          <div className={`transition-all duration-300 ease-in-out ${openIdx === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-5 pt-0 text-ink/80 border-t border-ink/5 mt-2">
              {item.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryView({ summary }: { summary: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-ink/10 prose prose-ink max-w-none">
      <h3 className="text-2xl font-display font-bold text-ink mb-6">Study Summary</h3>
      <div className="text-ink/80 whitespace-pre-wrap leading-relaxed">
        {summary}
      </div>
    </div>
  );
}