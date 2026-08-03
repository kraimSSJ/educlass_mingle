import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { Settings, Plus, X, Camera, Grid, Maximize2, Share2, PenSquare, User as UserIcon } from 'lucide-react';
import { useParams } from 'react-router-dom';

const BACKGROUNDS = {
  Library: 'linear-gradient(135deg, #4e342e 0%, #3e2723 100%)',
  Space: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
  Forest: 'linear-gradient(to bottom, #1b5e20, #003300)',
  Café: 'linear-gradient(45deg, #d7ccc8 0%, #8d6e63 100%)',
  Galaxy: 'linear-gradient(to right, #240b36, #c31432)',
  Minimal: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
};

const ELEMENTS = {
  Furniture: [
    { id: 'chair1', icon: '🪑', label: 'Chair' },
    { id: 'desk1', icon: '🖥', label: 'Desk' },
    { id: 'bookshelf1', icon: '📚', label: 'Bookshelf' },
    { id: 'couch1', icon: '🛋', label: 'Couch' }
  ],
  Plants: [
    { id: 'plant1', icon: '🌿', label: 'Plant' },
    { id: 'cactus1', icon: '🌵', label: 'Cactus' },
    { id: 'flower1', icon: '🌸', label: 'Flower' }
  ],
  Decor: [
    { id: 'candle1', icon: '🕯', label: 'Candle' },
    { id: 'painting1', icon: '🖼', label: 'Painting' },
    { id: 'star1', icon: '⭐', label: 'Star' },
    { id: 'moon1', icon: '🌙', label: 'Moon lamp' }
  ],
  Pets: [
    { id: 'cat1', icon: '🐱', label: 'Cat' },
    { id: 'dog1', icon: '🐶', label: 'Dog' },
    { id: 'fish1', icon: '🐠', label: 'Fish tank' }
  ]
};

type RoomElement = {
  id: string;
  instanceId: string;
  icon: string;
  x: number;
  y: number;
};

export default function Profile() {
  const { user } = useAuth();
  const { roomId } = useParams<{ roomId?: string }>();
  
  const [background, setBackground] = useState<keyof typeof BACKGROUNDS>('Library');
  const [elements, setElements] = useState<RoomElement[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('Learning and growing every day! 🌱');
  
  const roomRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const isVisiting = !!roomId && roomId !== user?.id;
  const storageKey = isVisiting ? `room_${roomId}` : `room_${user?.id || 'default'}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.background) setBackground(parsed.background);
        if (parsed.elements) setElements(parsed.elements);
        if (parsed.bio && !isVisiting) setBio(parsed.bio);
      } catch (e) {
        console.error('Error loading room', e);
      }
    }
  }, [storageKey, isVisiting]);

  useEffect(() => {
    if (isVisiting) return; // Don't save if visiting
    const saveState = {
      background,
      elements,
      bio
    };
    localStorage.setItem(storageKey, JSON.stringify(saveState));
  }, [background, elements, bio, storageKey, isVisiting]);

  const addElement = (item: { id: string; icon: string }) => {
    if (isVisiting) return;
    const newElement: RoomElement = {
      id: item.id,
      instanceId: `${item.id}-${Date.now()}`,
      icon: item.icon,
      x: Math.random() * 60 + 20, // 20% to 80%
      y: Math.random() * 60 + 20
    };
    setElements([...elements, newElement]);
  };

  const removeElement = (instanceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVisiting) return;
    setElements(elements.filter(el => el.instanceId !== instanceId));
  };

  const handleMouseDown = (instanceId: string, e: React.MouseEvent) => {
    if (isVisiting) return;
    e.preventDefault();
    if (!roomRef.current) return;
    
    const rect = roomRef.current.getBoundingClientRect();
    const el = elements.find(el => el.instanceId === instanceId);
    if (!el) return;
    
    // Calculate percentage offset
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDraggingId(instanceId);
    setDragOffset({
      x: clickX - el.x,
      y: clickY - el.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !roomRef.current || isVisiting) return;
    
    const rect = roomRef.current.getBoundingClientRect();
    let newX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
    let newY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;
    
    // Keep within bounds roughly
    newX = Math.max(0, Math.min(newX, 90));
    newY = Math.max(0, Math.min(newY, 90));
    
    setElements(elements.map(el => 
      el.instanceId === draggingId 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-parchment p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink">
            {isVisiting ? "Visiting Room" : "My Room"}
          </h1>
          <p className="text-ink/60 mt-1">
            {isVisiting ? "You are visiting someone's study space." : "Decorate your personal study space."}
          </p>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Main Canvas */}
        <div 
          className="flex-1 rounded-2xl relative overflow-hidden shadow-xl border-4 border-ink/10 transition-all duration-500"
          style={{ background: BACKGROUNDS[background] }}
          ref={roomRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {background === 'Space' && (
            <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
          )}

          {/* Profile Overlay */}
          <div className="absolute top-6 left-6 w-80 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-2xl z-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-moss/80 flex items-center justify-center text-2xl shadow-inner border-2 border-white/50 font-bold">
                {user?.email?.[0].toUpperCase() || <UserIcon />}
              </div>
              <div>
                <h2 className="font-display font-bold text-xl drop-shadow-md">
                  {user?.email?.split('@')[0] || 'Student'}
                </h2>
                <div className="flex items-center gap-1 text-sm bg-black/20 rounded-full px-2 py-0.5 mt-1 w-fit">
                  <span className="text-gold">🪙</span>
                  <span>1,250 Coins</span>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              {isEditingBio ? (
                <textarea
                  className="w-full bg-black/20 border border-white/30 rounded-lg p-2 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={() => setIsEditingBio(false)}
                  autoFocus
                  rows={2}
                />
              ) : (
                <div className="text-sm text-white/90 drop-shadow-sm pr-6">
                  {bio}
                  {!isVisiting && (
                    <button 
                      onClick={() => setIsEditingBio(true)}
                      className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                    >
                      <PenSquare size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Render Elements */}
          {elements.map((el) => (
            <div
              key={el.instanceId}
              className={`absolute text-6xl select-none transition-transform duration-200 ${draggingId === el.instanceId ? 'scale-110 cursor-grabbing z-50' : 'cursor-grab hover:scale-105 z-20'} group`}
              style={{ left: `${el.x}%`, top: `${el.y}%`, textShadow: '0 10px 15px rgba(0,0,0,0.3)' }}
              onMouseDown={(e) => handleMouseDown(el.instanceId, e)}
            >
              {el.icon}
              {!isVisiting && (
                <button
                  className="absolute -top-2 -right-2 bg-clay text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  onClick={(e) => removeElement(el.instanceId, e)}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        {!isVisiting && (
          <div className="w-80 bg-white rounded-2xl shadow-sm border border-ink/10 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-ink/10 bg-parchment/50">
              <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
                <Grid size={18} />
                Backgrounds
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(BACKGROUNDS) as Array<keyof typeof BACKGROUNDS>).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBackground(bg)}
                    className={`h-12 rounded-lg border-2 transition-all ${background === bg ? 'border-moss scale-105 shadow-md' : 'border-transparent hover:border-ink/20'}`}
                    style={{ background: BACKGROUNDS[bg] }}
                    title={bg}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                <Plus size={18} />
                Elements
              </h3>
              
              {Object.entries(ELEMENTS).map(([category, items]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h4 className="text-xs font-bold text-ink/50 uppercase tracking-wider mb-3">
                    {category}
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addElement(item)}
                        className="aspect-square flex items-center justify-center text-3xl bg-parchment rounded-xl hover:bg-moss/10 hover:scale-105 transition-all border border-ink/5"
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
