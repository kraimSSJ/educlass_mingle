import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/supabaseClient';
import { Plus, Users, Copy, Check, ArrowRight, X } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinId, setJoinId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/rooms`);
      const body = await res.json();
      // Backend returns { data: [...] } or plain array
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setRooms(list);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinById = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      navigate(`/rooms/${joinId.trim()}`);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !user) return;
    try {
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, createdBy: user.id })
      });
      const body = await res.json();
      // Backend returns { data: { id, name, ... }, error } or plain object
      const room = body?.data ?? body;
      if (room?.id) {
        setRooms(prev => [room, ...prev]);
        setIsModalOpen(false);
        setNewRoomName('');
        navigate(`/rooms/${room.id}`);
      }
    } catch (err) {
      console.error('Failed to create room', err);
    }
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/rooms/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink sm:text-4xl">Group Study Rooms</h1>
          <p className="text-ink/60 mt-1 text-base sm:text-lg">Collaborate and learn together in real-time.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 bg-moss hover:bg-moss/90 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm sm:w-auto"
        >
          <Plus size={20} />
          Create Room
        </button>
      </div>

      {/* Join By ID Section */}
      <div className="bg-white border border-ink/10 rounded-xl p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-ink mb-4">Join an existing room</h2>
        <form onSubmit={handleJoinById} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            className="flex-1 px-4 py-3 border border-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss"
          />
          <button
            type="submit"
            disabled={!joinId.trim()}
            className="flex items-center justify-center gap-2 bg-ink text-white px-6 py-3 rounded-xl font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join <ArrowRight size={18} />
          </button>
        </form>
      </div>

      {/* Rooms List */}
      <div>
        <h2 className="text-2xl font-display font-bold text-ink mb-6">Active Rooms</h2>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss"></div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-ink/10">
            <Users className="mx-auto h-12 w-12 text-ink/20 mb-4" />
            <h3 className="text-lg font-medium text-ink">No active rooms</h3>
            <p className="text-ink/60 mt-1">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div key={room.id} className="bg-white border border-ink/10 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow sm:p-6">
                <div className="flex-1 mb-6">
                  <h3 className="text-xl font-bold text-ink mb-2 truncate">{room.name}</h3>
                  <div className="flex items-center text-ink/60 text-sm gap-4">
                    <span className="flex items-center gap-1"><Users size={16} /> {room.memberCount || 0} members</span>
                    <span className="text-xs font-mono bg-parchment px-2 py-1 rounded">ID: {room.id.substring(0, 8)}...</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    className="flex-1 bg-moss/10 hover:bg-moss/20 text-moss font-medium py-2 rounded-xl transition-colors text-center"
                  >
                    Enter Room
                  </button>
                  <button
                    onClick={() => handleCopyLink(room.id)}
                    className="p-2 border border-ink/10 hover:bg-parchment rounded-xl text-ink/60 hover:text-ink transition-colors"
                    title="Copy Link"
                  >
                    {copiedId === room.id ? <Check size={20} className="text-moss" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold text-ink">Create Room</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink/50 hover:text-ink">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink/80 mb-2">Room Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Physics 101 Study Group"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-3 border border-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-ink/70 hover:bg-ink/5 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="flex-1 bg-moss text-white px-4 py-3 rounded-xl font-medium hover:bg-moss/90 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
