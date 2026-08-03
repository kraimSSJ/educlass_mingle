import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/supabaseClient';
import { Plus, Heart, MessageCircle, Send, X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface Story {
  id: string;
  user_id: string;
  username?: string;
  image_url?: string;
  media_url?: string;
  text?: string;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  username?: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  username?: string;
  content?: string;     // new column
  caption?: string;     // original column
  image_url?: string;   // new column
  likes?: number;
  comments?: Comment[];
  created_at: string;
}

export default function Social() {
  const { user } = useAuth();
  
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Create post state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageFile, setNewPostImageFile] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  
  // Story viewer state
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  useEffect(() => {
    fetchFeed();
    fetchStories();
  }, []);

  // Auto-advance story
  useEffect(() => {
    if (activeStoryIndex === null) {
      setStoryProgress(0);
      return;
    }
    
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [activeStoryIndex]);

  const fetchFeed = async () => {
    try {
      const res = await fetch(`${API_URL}/social/feed`);
      const body = await res.json();
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setPosts(list);
    } catch {
      setPosts([]);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_URL}/social/stories`);
      const body = await res.json();
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setStories(list);
    } catch {
      setStories([]);
    }
  };

  // Post image: keep the real File for upload, base64 only for the preview thumbnail.
  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPostImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewPostImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImageFile) return;
    if (!user) return;
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('content', newPostContent);
      formData.append('username', user.email?.split('@')[0] ?? 'User');
      if (newPostImageFile) formData.append('file', newPostImageFile);

      await fetch(`${API_URL}/social/posts/upload`, {
        method: 'POST',
        body: formData,
      });
      setNewPostContent('');
      setNewPostImageFile(null);
      setNewPostImagePreview(null);
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  // Story image: upload the real File directly, no base64 round-trip.
  const handleStoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('username', user.email?.split('@')[0] ?? 'User');
      formData.append('file', file);

      await fetch(`${API_URL}/social/stories/upload`, {
        method: 'POST',
        body: formData,
      });
      fetchStories();
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = ''; // allow re-selecting the same file later
    }
  };

  const handleStoryClick = (index: number) => {
    setActiveStoryIndex(index);
    setStoryProgress(0);
  };

  const handlePrevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setStoryProgress(0);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setStoryProgress(0);
    } else {
      setActiveStoryIndex(null); // close
    }
  };

  const handleAddComment = async (postId: string, commentText: string) => {
    if (!commentText.trim() || !user) return;
    try {
      await fetch(`${API_URL}/social/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          userId: user.id,
          content: commentText,
          username: user.email?.split('@')[0] ?? 'User',
        })
      });
      fetchFeed();
    } catch(err) {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      
      {/* Stories Bar */}
      <div className="bg-white border border-ink/10 rounded-2xl p-4 shadow-sm overflow-hidden">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 items-center">
          {/* Add Story */}
          <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => storyFileInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-full bg-parchment border-2 border-dashed border-ink/20 flex items-center justify-center relative hover:bg-ink/5 transition-colors">
              <Plus className="text-ink/40" />
              <div className="absolute -bottom-1 -right-1 bg-moss text-white rounded-full p-0.5 border-2 border-white">
                <Plus size={12} />
              </div>
            </div>
            <span className="text-xs font-medium text-ink/70">Add Story</span>
            <input type="file" hidden accept="image/*" ref={storyFileInputRef} onChange={handleStoryFileSelect} />
          </div>

          {/* User Stories */}
          {stories.map((story, idx) => (
            <div key={story.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => handleStoryClick(idx)}>
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gold via-clay to-moss">
                <div className="w-full h-full bg-white rounded-full p-0.5">
                  <div className="w-full h-full rounded-full bg-parchment overflow-hidden flex items-center justify-center font-bold text-lg text-ink/40">
                    {(story.image_url || story.media_url) ? (
                       <img src={story.image_url ?? story.media_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                       (story.username ?? 'U').substring(0, 2).toUpperCase()
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-ink/80 truncate w-16 text-center">{story.username ?? 'User'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Post Form */}
      <div className="bg-white border border-ink/10 rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleCreatePost}>
          <textarea
            placeholder="Share an update or study notes..."
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            className="w-full bg-transparent resize-none focus:outline-none min-h-[80px] text-ink"
          />
          
          {newPostImagePreview && (
            <div className="relative mb-3 inline-block">
              <img src={newPostImagePreview} alt="Upload preview" className="max-h-48 rounded-xl object-contain bg-ink/5" />
              <button
                type="button"
                onClick={() => { setNewPostImageFile(null); setNewPostImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-3 border-t border-ink/10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-moss hover:bg-moss/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <ImageIcon size={20} />
              <span className="hidden sm:inline">Photo</span>
            </button>
            <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handlePostImageSelect} />
            
            <button
              type="submit"
              disabled={!newPostContent.trim() && !newPostImageFile}
              className="bg-moss text-white px-6 py-2 rounded-xl font-medium hover:bg-moss/90 transition-colors disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Post Feed */}
      <div className="space-y-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onAddComment={handleAddComment} />
        ))}
        {posts.length === 0 && (
          <div className="text-center p-12 text-ink/40">No posts yet.</div>
        )}
      </div>

      {/* Full Screen Story Viewer */}
      {activeStoryIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center animate-fade-in">
          <div className="relative w-full h-full sm:h-auto sm:w-auto sm:aspect-[9/16] sm:max-h-[90vh] bg-black flex flex-col overflow-hidden sm:rounded-2xl">

            {/* Progress Bar */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {stories.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-50 linear"
                    style={{ 
                      width: i === activeStoryIndex ? `${storyProgress}%` : i < activeStoryIndex ? '100%' : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase">
                  {(stories[activeStoryIndex].username ?? 'U').substring(0, 2)}
                </div>
                <span className="font-medium shadow-sm">{stories[activeStoryIndex].username ?? 'User'}</span>
              </div>
              <button onClick={() => setActiveStoryIndex(null)} className="text-white p-2 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            {/* Navigation Areas */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrevStory} />
            <div className="absolute inset-y-0 right-0 w-2/3 z-10" onClick={handleNextStory} />

            {/* Content */}
            <div className="flex-1 flex items-center justify-center relative pointer-events-none overflow-hidden">
              {(stories[activeStoryIndex].image_url || stories[activeStoryIndex].media_url) ? (
                <>
                  {/* Blurred backdrop so the full image is always visible, no matter its aspect ratio */}
                  <img
                    src={stories[activeStoryIndex].image_url ?? stories[activeStoryIndex].media_url}
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
                    alt=""
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  {/* Full image, never cropped */}
                  <img
                    src={stories[activeStoryIndex].image_url ?? stories[activeStoryIndex].media_url}
                    className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain"
                    alt="Story"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-moss to-clay flex items-center justify-center p-8 text-center">
                  <h2 className="text-white text-3xl font-display font-bold">{stories[activeStoryIndex].text || 'Story'}</h2>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onAddComment }: { post: Post, onAddComment: (id: string, text: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    onAddComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <div className="bg-white border border-ink/10 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-clay/20 text-clay flex items-center justify-center font-bold uppercase">
          {(post.username ?? 'U').substring(0,2)}
        </div>
        <div>
          <h4 className="font-bold text-ink">{post.username ?? 'User'}</h4>
          <span className="text-xs text-ink/50">{new Date(post.created_at).toLocaleString()}</span>
        </div>
      </div>
      
      {(post.image_url) && (
        <div className="w-full aspect-[4/5] bg-ink/5 overflow-hidden">
          <img src={post.image_url} alt="Post content" className="w-full h-full object-cover" />
        </div>
      )}
      
      {(post.content || post.caption) && (
        <div className="p-4 text-ink">
          <p className="whitespace-pre-wrap">{post.content ?? post.caption}</p>
        </div>
      )}
      
      <div className="p-4 border-t border-ink/5 flex gap-4">
        <button className="flex items-center gap-2 text-ink/60 hover:text-clay transition-colors">
          <Heart size={20} />
          <span className="text-sm font-medium">{post.likes || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-ink/60 hover:text-moss transition-colors">
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{post.comments?.length || 0}</span>
        </button>
      </div>

      {showComments && (
        <div className="bg-ink/5 p-4 border-t border-ink/5">
          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {post.comments?.map(c => (
              <div key={c.id} className="text-sm">
                <span className="font-bold text-ink mr-2">{c.username}</span>
                <span className="text-ink/80">{c.content}</span>
              </div>
            ))}
            {!post.comments?.length && <p className="text-xs text-ink/40">No comments yet. Be the first!</p>}
          </div>
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="flex-1 bg-white border border-ink/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-moss"
            />
            <button type="submit" disabled={!commentText.trim()} className="text-moss disabled:opacity-50 p-2">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}