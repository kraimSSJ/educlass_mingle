import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, FileText, Loader2 } from 'lucide-react';
import { API_URL } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth';

interface StudyModule {
  id: string;
  title: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_URL}/modules/user/${userId}`)
      .then(r => r.json())
      .then(body => {
        const data = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        setModules(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const createModule = async () => {
    if (!title.trim() || !userId || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: userId, title: title.trim() }),
      });
      const body = await res.json();
      const created = body?.data ?? body;
      if (created?.id) {
        setModules(prev => [created, ...prev]);
        setTitle('');
      }
    } catch (e) {
      console.error('Failed to create module:', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Solo Study</h1>
      <p className="mt-2 text-ink/60">Create a module for each subject you're studying.</p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createModule()}
          placeholder="New module title"
          className="flex-1 rounded-lg border border-ink/15 bg-white px-4 py-2 outline-none focus:border-moss"
        />
        <button
          onClick={createModule}
          disabled={!userId || creating}
          className="flex items-center justify-center gap-2 rounded-lg bg-moss px-4 py-2 font-medium text-white disabled:opacity-50 hover:bg-moss/90 transition-colors"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2} />}
          Create module
        </button>
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
      ) : modules.length === 0 ? (
        <p className="mt-16 text-center text-ink/40 text-sm">No modules yet — create one above.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {modules.map(m => (
            <Link key={m.id} to={`/modules/${m.id}`} className="rounded-xl border border-ink/10 bg-white p-5 transition-shadow hover:shadow-md">
              <BookOpen className="h-5 w-5 text-clay" strokeWidth={2} />
              <div className="mt-3 font-display text-lg font-medium">{m.title}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-ink/50">
                <FileText className="h-3 w-3" strokeWidth={2} />
                Module workspace
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
