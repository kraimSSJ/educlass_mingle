import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Bold, Italic, Heading1, Heading2, List, Image as ImageIcon, StickyNote, Trash2, Save, FileText, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/supabaseClient';

interface Note {
  id: string;
  title: string;
  content: string;
  moduleId?: string;
  updatedAt: string;
}

interface Module {
  id: string;
  name: string;
  color?: string;
}

interface Sticky {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export default function Notes() {
  const { user } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('Untitled Note');
  const [content, setContent] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [stickies, setStickies] = useState<Sticky[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const STICKY_COLORS = ['#FEFAE0', '#F4A261', '#E9C46A', '#8AB17D', '#E76F51'];

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchModules();
    }
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/notes/user/${user.id}`);
      const body = await res.json();
      const data = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setNotes(data);
      if (data.length > 0 && !activeNoteId) {
        selectNote(data[0]);
      }
    } catch (err) {
      console.error('Error fetching notes', err);
    }
  };

  const fetchModules = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/modules/user/${user.id}`);
      const body = await res.json();
      const data = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      // Backend uses 'title' not 'name' — normalise here
      setModules(data.map((m: any) => ({ id: m.id, name: m.title ?? m.name ?? 'Untitled' })));
    } catch (err) {
      console.error('Error fetching modules', err);
    }
  };

  const selectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setTitle(note.title || 'Untitled Note');
    setContent(note.content || '');
    setSelectedModule(note.moduleId || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || '';
    }
    setStickies([]); // reset stickies on note change for now
  };

  const createNote = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title: 'New Note', content: '', moduleId: null }),
      });
      const body = await res.json();
      const created = body?.data ?? body;
      if (created?.id) {
        setNotes(prev => [created, ...prev]);
        selectNote(created);
      }
    } catch (err) {
      console.error('Error creating note', err);
    }
  };

  const saveNote = useCallback(async (noteId: string, updatedTitle: string, updatedContent: string, updatedModule: string) => {
    if (!user || !noteId) return;
    setIsSaving(true);
    try {
      await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: updatedTitle, content: updatedContent, moduleId: updatedModule || null }),
      });
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, title: updatedTitle, content: updatedContent, moduleId: updatedModule, updatedAt: new Date().toISOString() } : n));
    } catch (err) {
      console.error('Error saving note', err);
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const handleEditorInput = () => {
    if (!editorRef.current || !activeNoteId) return;
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(activeNoteId, title, newContent, selectedModule);
    }, 1000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(activeNoteId!, newTitle, content, selectedModule);
    }, 1000);
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modId = e.target.value;
    setSelectedModule(modId);
    if (activeNoteId) {
      saveNote(activeNoteId, title, content, modId);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleEditorInput();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // In a real app we'd upload to cloud storage, here we insert base64 for simplicity
        document.execCommand('insertImage', false, base64);
        handleEditorInput();
      };
      reader.readAsDataURL(file);
    }
  };

  const addStickyNote = () => {
    const newSticky: Sticky = {
      id: Math.random().toString(36).substring(7),
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      text: '',
      color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
    };
    setStickies([...stickies, newSticky]);
  };

  const updateSticky = (id: string, text: string) => {
    setStickies(stickies.map(s => s.id === id ? { ...s, text } : s));
  };
  
  const removeSticky = (id: string) => {
    setStickies(stickies.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col bg-[#FAFAFA] text-[#2F3E46] font-sans md:h-screen md:flex-row md:overflow-hidden">
      
      {/* Sidebar - Notes List */}
      <div className="w-full bg-white border-b border-[#E0E0E0] flex flex-col z-10 shadow-[4px_0_15px_rgba(0,0,0,0.03)] md:h-full md:w-80 md:border-b-0 md:border-r">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#F4F1DE] flex justify-between items-center md:p-6">
          <h2 className="text-xl font-display font-bold text-[#3D405B] md:text-2xl">My Notes</h2>
          <button 
            onClick={createNote}
            className="p-2 bg-[#E07A5F] text-white rounded-lg hover:bg-[#D46A50] shadow-md transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="p-3 border-b border-[#E0E0E0] md:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
            />
          </div>
        </div>

        <div className="flex max-h-48 gap-2 overflow-x-auto p-2 md:max-h-none md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto">
          {notes.map(note => {
            const mod = modules.find(m => m.id === note.moduleId);
            return (
              <div 
                key={note.id}
                onClick={() => selectNote(note)}
                className={`min-w-56 p-3 rounded-xl cursor-pointer transition-all duration-200 border md:mb-2 md:min-w-0 md:p-4 ${
                  activeNoteId === note.id 
                    ? 'bg-[#F4F1DE] border-[#E07A5F] shadow-sm' 
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="font-semibold text-base mb-1 truncate md:text-lg">{note.title || 'Untitled Note'}</div>
                <div className="flex justify-between items-center mt-2">
                  {mod ? (
                    <span className="text-xs px-2 py-1 rounded-md bg-[#81B29A] text-white font-medium">
                      {mod.name}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-200 text-gray-600 font-medium">
                      General
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(note.updatedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Area - Notebook Editor */}
      <div className="flex-1 bg-[#EBEBEB] relative overflow-y-auto flex justify-center px-0 py-0 md:py-12 md:px-8">
        
        {/* The Notebook */}
        <div className="w-full bg-[#FFFCF5] min-h-[calc(100vh-16rem)] relative border-gray-200 md:max-w-4xl md:min-h-[1056px] md:rounded-r-2xl md:rounded-l-md md:border md:shadow-[15px_15px_30px_rgba(0,0,0,0.1)]">
          
          {/* Spiral Binding Effect */}
          <div className="absolute left-0 top-0 bottom-0 hidden w-6 flex-col justify-evenly items-center py-8 bg-[#EBEBEB] border-r border-[#D4D4D4] z-20 rounded-l-md shadow-[inset_-2px_0_4px_rgba(0,0,0,0.05)] md:flex">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="relative w-4 h-4">
                <div className="w-4 h-4 rounded-full bg-[#333] shadow-inner absolute z-10" />
                <div className="w-8 h-2 bg-gray-400 absolute top-1 left-2 rounded-full transform -rotate-12 shadow-sm z-0" />
              </div>
            ))}
          </div>

          {/* Red Margin Line */}
          <div className="absolute left-20 top-0 bottom-0 hidden w-[2px] bg-[#E07A5F] opacity-40 z-10 md:block" />

          {/* Notebook Lines Background */}
          <div
            className="absolute inset-0 z-0 pointer-events-none mt-48 md:mt-40"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(129, 178, 154, 0.2) 31px, rgba(129, 178, 154, 0.2) 32px)',
              backgroundSize: '100% 32px'
            }}
          />

          {/* Header & Toolbar Area */}
          <div className="relative z-20 bg-[#FFFCF5] px-4 pb-4 pt-5 md:rounded-tr-2xl md:pl-28 md:pr-12 md:pt-12 md:pb-6">
            
            <div className="flex flex-col gap-3 mb-4 md:mb-6 md:flex-row md:items-start md:justify-between">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="w-full text-2xl font-display font-bold text-[#3D405B] bg-transparent border-none focus:outline-none md:w-2/3 md:text-4xl"
                placeholder="Note Title..."
              />
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className={`text-sm flex items-center gap-1 transition-opacity duration-300 ${isSaving ? 'opacity-100 text-[#E07A5F]' : 'opacity-50 text-gray-500'}`}>
                  <Save size={16} /> {isSaving ? 'Saving...' : 'Saved'}
                </span>
                <select 
                  value={selectedModule}
                  onChange={handleModuleChange}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#81B29A] outline-none"
                >
                  <option value="">No Module</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="sticky top-2 flex items-center gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white px-2 py-2 shadow-sm md:top-4 md:gap-2 md:px-4">
              <button onClick={() => formatText('bold')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700" title="Bold"><Bold size={18} /></button>
              <button onClick={() => formatText('italic')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700" title="Italic"><Italic size={18} /></button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => formatText('formatBlock', 'H1')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700" title="Heading 1"><Heading1 size={18} /></button>
              <button onClick={() => formatText('formatBlock', 'H2')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700" title="Heading 2"><Heading2 size={18} /></button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => formatText('insertUnorderedList')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700" title="Bullet List"><List size={18} /></button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700" title="Insert Image"><ImageIcon size={18} /></button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <button onClick={addStickyNote} className="p-2 hover:bg-gray-100 rounded-lg text-[#F4A261]" title="Add Sticky Note"><StickyNote size={18} /></button>
            </div>
          </div>

          {/* Editor Area */}
          <div 
            ref={editorRef}
            className="relative z-10 min-h-[420px] px-4 pb-24 text-base leading-[32px] text-[#3D405B] outline-none md:min-h-[800px] md:pl-28 md:pr-12 md:text-lg"
            contentEditable
            onInput={handleEditorInput}
            style={{
              paddingTop: '6px' // align text with line background
            }}
          />
          
          {/* Page Number */}
          <div className="absolute bottom-6 right-5 text-gray-400 font-serif z-10 md:right-10">
            pg. {activeNoteId ? notes.findIndex(n => n.id === activeNoteId) + 1 : 1}
          </div>

          {/* Sticky Notes Render Area */}
          {stickies.map(sticky => (
            <div 
              key={sticky.id}
              className="absolute w-40 min-h-40 shadow-lg p-4 rounded-br-2xl transform rotate-1 cursor-move transition-transform hover:scale-105 hover:z-50 z-30 md:w-48 md:min-h-48"
              style={{
                backgroundColor: sticky.color,
                left: `${sticky.x}px`,
                top: `${sticky.y}px`,
                boxShadow: '4px 4px 15px rgba(0,0,0,0.15)'
              }}
              draggable
              onDragEnd={(e) => {
                const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
                if (rect) {
                  setStickies(stickies.map(s => s.id === sticky.id ? { ...s, x: e.clientX - rect.left - 50, y: e.clientY - rect.top - 50 } : s));
                }
              }}
            >
              <button onClick={() => removeSticky(sticky.id)} className="absolute top-2 right-2 text-black/40 hover:text-black/80"><X size={16} /></button>
              <textarea 
                value={sticky.text}
                onChange={(e) => updateSticky(sticky.id, e.target.value)}
                placeholder="Sticky note..."
                className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-800 font-medium placeholder-gray-800/40 mt-4"
              />
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
