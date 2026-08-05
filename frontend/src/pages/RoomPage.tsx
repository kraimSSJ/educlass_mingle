import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PhoneCall, PhoneOff, Mic, MicOff, VideoOff, Video,
  NotebookPen, FileText, Copy, Check, Send, X, ArrowLeft
} from 'lucide-react';
import { supabase, API_URL } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

type SignalMessage = { from: string; to: string; type: 'offer' | 'answer' | 'ice-candidate'; data: any; };

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  type: 'text' | 'note' | 'summary';
  noteTitle?: string;
  timestamp: number;
}

interface Note { id: string; title: string; content: string; }
interface Module { id: string; title: string; }

export default function RoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const username = user?.email?.split('@')[0] ?? 'Guest';

  // Room info
  const [roomName, setRoomName] = useState('Study Room');
  const [copied, setCopied] = useState(false);

  // Video call state
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peers, setPeers] = useState<string[]>([]);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Share modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  // WebRTC refs
  const selfId = useRef<string>(Math.random().toString(36).slice(2, 10));
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());

  // ── Fetch room info ──────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    fetch(`${API_URL}/rooms/${roomId}`)
      .then(r => r.json())
      .then(body => {
        const r = body?.data ?? body;
        if (r?.name) setRoomName(r.name);
      }).catch(() => {});

    if (user?.id) {
      fetch(`${API_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});
    }
  }, [roomId, user]);

  // ── Real-time text chat ───────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    fetch(`${API_URL}/rooms/${roomId}/messages`)
      .then(r => r.json())
      .then(body => {
        const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        setMessages(list);
      })
      .catch(() => setMessages([]));

    const chatChannel = supabase.channel(`chat:${roomId}`)
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const incoming = payload as ChatMessage;
        setMessages(prev => prev.some(msg => msg.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .subscribe();
    chatChannelRef.current = chatChannel;

    return () => {
      chatChannelRef.current = null;
      supabase.removeChannel(chatChannel);
    };
  }, [roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChatMessage = async (text: string, type: ChatMessage['type'] = 'text', noteTitle?: string) => {
    if (!text.trim() || !roomId || !user?.id) return;

    const res = await fetch(`${API_URL}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        username,
        text,
        type,
        noteTitle,
      }),
    });

    const body = await res.json();
    const msg = body?.data ?? body;
    if (!msg?.id) return;

    chatChannelRef.current?.send({
      type: 'broadcast',
      event: 'message',
      payload: msg,
    });
    setMessages(prev => prev.some(item => item.id === msg.id) ? prev : [...prev, msg]);
    if (type === 'text') setChatText('');
  };

  // ── Share Notes / Summary modals ──────────────────────────────────
  const openNoteModal = async () => {
    if (!user?.id) return;
    const res = await fetch(`${API_URL}/notes/user/${user.id}`);
    const body = await res.json();
    const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    setNotes(list);
    setShowNoteModal(true);
  };

  const shareNote = (note: Note) => {
    sendChatMessage(note.content?.replace(/<[^>]*>/g, ' ').slice(0, 300) + '…', 'note', note.title);
    setShowNoteModal(false);
  };

  const openSummaryModal = async () => {
    if (!user?.id) return;
    const res = await fetch(`${API_URL}/modules/user/${user.id}`);
    const body = await res.json();
    const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    setModules(list);
    setShowSummaryModal(true);
  };

  const shareSummary = async (mod: Module) => {
    const res = await fetch(`${API_URL}/modules/${mod.id}/ai/summary`, { method: 'POST' });
    const body = await res.json();
    const content = body?.data?.content ?? 'No summary available yet.';
    sendChatMessage(content.slice(0, 400) + '…', 'summary', mod.title);
    setShowSummaryModal(false);
  };

  // ── Copy link ────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/rooms/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── WebRTC ───────────────────────────────────────────────────────
  const getOrCreatePC = useCallback((peerId: string) => {
    let pc = peerConnections.current.get(peerId);
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnections.current.set(peerId, pc);
    localStreamRef.current?.getTracks().forEach(t => pc!.addTrack(t, localStreamRef.current!));
    pc.onicecandidate = e => {
      if (e.candidate) sendSignal({ from: selfId.current, to: peerId, type: 'ice-candidate', data: e.candidate });
    };
    pc.ontrack = e => {
      const el = remoteVideoRefs.current.get(peerId);
      if (el) el.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc && ['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        peerConnections.current.delete(peerId);
        setPeers(prev => prev.filter(p => p !== peerId));
      }
    };
    return pc;
  }, []);

  const sendSignal = (msg: SignalMessage) =>
    channelRef.current?.send({ type: 'broadcast', event: 'webrtc-signal', payload: msg });

  const joinCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const ch = supabase.channel(`room:${roomId}`, { config: { presence: { key: selfId.current } } });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const others = Object.keys(ch.presenceState()).filter(k => k !== selfId.current);
      setPeers(others);
      others.forEach(pid => {
        if (selfId.current < pid && !peerConnections.current.has(pid)) {
          getOrCreatePC(pid).createOffer().then(async o => {
            await peerConnections.current.get(pid)!.setLocalDescription(o);
            sendSignal({ from: selfId.current, to: pid, type: 'offer', data: o });
          });
        }
      });
    }).on('broadcast', { event: 'webrtc-signal' }, async ({ payload }: { payload: SignalMessage }) => {
      if (payload.to !== selfId.current) return;
      const pc = getOrCreatePC(payload.from);
      if (payload.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ from: selfId.current, to: payload.from, type: 'answer', data: answer });
      } else if (payload.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      } else if (payload.type === 'ice-candidate') {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.data)); } catch {}
      }
    }).subscribe(async s => { if (s === 'SUBSCRIBED') await ch.track({ joinedAt: Date.now() }); });

    setInCall(true);
  };

  const leaveCall = () => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setPeers([]);
    setInCall(false);
  };

  useEffect(() => () => leaveCall(), [roomId]);

  const toggleMic = () => { localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = !micOn)); setMicOn(m => !m); };
  const toggleCam = () => { localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = !camOn)); setCamOn(c => !c); };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-parchment">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b border-ink/10 bg-white px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/rooms" className="text-ink/40 hover:text-ink transition-colors">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight">{roomName}</h1>
            <p className="text-xs text-ink/40 font-mono">{roomId}</p>
          </div>
        </div>
        <button onClick={copyLink}
          className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-ink/5 transition-colors">
          {copied ? <Check className="h-4 w-4 text-moss" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          {copied ? 'Copied!' : 'Share link'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Video + controls */}
        <div className="flex flex-col w-3/5 border-r border-ink/10 overflow-y-auto">
          {/* Video grid */}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="relative aspect-video bg-ink rounded-xl overflow-hidden">
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 text-xs text-white bg-black/50 rounded px-1.5 py-0.5">You</span>
            </div>
            {peers.map(pid => (
              <div key={pid} className="relative aspect-video bg-ink rounded-xl overflow-hidden">
                <video ref={el => remoteVideoRefs.current.set(pid, el)} autoPlay playsInline className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 text-xs text-white bg-black/50 rounded px-1.5 py-0.5">{pid.slice(0, 6)}</span>
              </div>
            ))}
          </div>

          {/* Call controls */}
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {!inCall ? (
              <button onClick={joinCall} className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2 text-sm font-medium text-white hover:bg-moss/90 transition-colors">
                <PhoneCall className="h-4 w-4" strokeWidth={2} /> Join call
              </button>
            ) : (
              <>
                <button onClick={leaveCall} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                  <PhoneOff className="h-4 w-4" strokeWidth={2} /> Leave
                </button>
                <button onClick={toggleMic} className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-ink/5 transition-colors">
                  {micOn ? <Mic className="h-4 w-4" strokeWidth={2} /> : <MicOff className="h-4 w-4" strokeWidth={2} />}
                  {micOn ? 'Mute' : 'Unmute'}
                </button>
                <button onClick={toggleCam} className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-ink/5 transition-colors">
                  {camOn ? <Video className="h-4 w-4" strokeWidth={2} /> : <VideoOff className="h-4 w-4" strokeWidth={2} />}
                  {camOn ? 'Stop cam' : 'Start cam'}
                </button>
              </>
            )}
            <button onClick={openNoteModal} className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-ink/5 transition-colors">
              <NotebookPen className="h-4 w-4" strokeWidth={2} /> Share note
            </button>
            <button onClick={openSummaryModal} className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-ink/5 transition-colors">
              <FileText className="h-4 w-4" strokeWidth={2} /> Share summary
            </button>
          </div>

          {/* Join info */}
          <div className="mx-4 mb-4 rounded-xl bg-moss/10 border border-moss/20 p-3 text-sm text-ink/70">
            <span className="font-medium text-ink">Room ID:</span>{' '}
            <span className="font-mono">{roomId}</span>
            <span className="ml-2 text-ink/50">— share this to invite friends</span>
          </div>
        </div>

        {/* RIGHT — Text Chat */}
        <div className="flex flex-col w-2/5 bg-white">
          <div className="border-b border-ink/10 px-4 py-3 font-display font-medium text-sm text-ink/70">Chat</div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-ink/30 pt-8">No messages yet. Say hello!</p>
            )}
            {messages.map(msg => {
              const isMe = msg.userId === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-xs text-ink/40 mb-1 ml-1">{msg.username}</span>}
                  {msg.type === 'text' ? (
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-moss text-white rounded-tr-sm' : 'bg-ink/5 text-ink rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  ) : (
                    <div className={`max-w-[90%] rounded-xl border p-3 text-sm ${msg.type === 'note' ? 'border-clay/30 bg-clay/5' : 'border-moss/30 bg-moss/5'}`}>
                      <div className="flex items-center gap-2 mb-1 font-medium text-xs text-ink/60">
                        {msg.type === 'note' ? <NotebookPen className="h-3 w-3" strokeWidth={2} /> : <FileText className="h-3 w-3" strokeWidth={2} />}
                        {msg.noteTitle ?? (msg.type === 'note' ? 'Note' : 'Summary')}
                      </div>
                      <p className="text-ink/80 line-clamp-4">{msg.text}</p>
                      <span className="text-xs text-ink/40">shared by {msg.username}</span>
                    </div>
                  )}
                  <span className="text-[10px] text-ink/30 mt-0.5">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <div className="border-t border-ink/10 p-3 flex gap-2">
            <input
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(chatText); } }}
              placeholder="Message..."
              className="flex-1 rounded-xl border border-ink/10 bg-parchment px-3 py-2 text-sm outline-none focus:border-moss"
            />
            <button onClick={() => sendChatMessage(chatText)} disabled={!chatText.trim()}
              className="rounded-xl bg-moss p-2 text-white hover:bg-moss/90 transition-colors disabled:opacity-40">
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Share note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Share a note</h2>
              <button onClick={() => setShowNoteModal(false)}><X className="h-5 w-5 text-ink/40 hover:text-ink" strokeWidth={2} /></button>
            </div>
            {notes.length === 0 ? <p className="text-ink/50 text-sm">No notes found.</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map(n => (
                  <button key={n.id} onClick={() => shareNote(n)}
                    className="w-full text-left rounded-xl border border-ink/10 px-4 py-3 text-sm hover:bg-ink/5 transition-colors">
                    <span className="font-medium">{n.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share summary modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Share a module summary</h2>
              <button onClick={() => setShowSummaryModal(false)}><X className="h-5 w-5 text-ink/40 hover:text-ink" strokeWidth={2} /></button>
            </div>
            {modules.length === 0 ? <p className="text-ink/50 text-sm">No modules found.</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {modules.map(m => (
                  <button key={m.id} onClick={() => shareSummary(m)}
                    className="w-full text-left rounded-xl border border-ink/10 px-4 py-3 text-sm hover:bg-ink/5 transition-colors">
                    <span className="font-medium">{m.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
