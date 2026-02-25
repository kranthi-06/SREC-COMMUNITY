import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Heart, Share2, Image as ImageIcon, FileText, Send, Trash2, Link as LinkIcon, AlertCircle } from 'lucide-react';

const Community = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Post Creation State
    const [newPost, setNewPost] = useState({ content: '', link_url: '' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [posting, setPosting] = useState(false);

    // Comment State
    const [activeComments, setActiveComments] = useState(null); // stores Post ID
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    const fetchPosts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/posts`);
            setPosts(res.data);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const canCreatePost = ['black_hat_admin', 'admin', 'editor_admin', 'faculty'].includes(user?.role);
    const isAdmin = ['black_hat_admin', 'admin', 'editor_admin'].includes(user?.role);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPost.content && !selectedImage && !selectedPdf && !newPost.link_url) return;

        setPosting(true);
        const formData = new FormData();
        formData.append('content', newPost.content);
        if (newPost.link_url) formData.append('link_url', newPost.link_url);
        if (selectedImage) formData.append('image', selectedImage);
        if (selectedPdf) formData.append('pdf', selectedPdf);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/posts`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setNewPost({ content: '', link_url: '' });
            setSelectedImage(null);
            setSelectedPdf(null);
            fetchPosts();
        } catch (error) {
            alert('Error creating post ' + (error.response?.data?.error || ''));
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (postId) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/posts/${postId}/like`);
            // Optimistic update
            const updatedPosts = posts.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        user_has_liked: !p.user_has_liked,
                        likes: p.user_has_liked ? parseInt(p.likes) - 1 : parseInt(p.likes) + 1
                    };
                }
                return p;
            });
            setPosts(updatedPosts);
        } catch (error) {
            console.error('Error liking post', error);
        }
    };

    const loadComments = async (postId) => {
        if (activeComments === postId) {
            setActiveComments(null); // toggle off
            return;
        }
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/posts/${postId}/comments`);
            setComments(res.data);
            setActiveComments(postId);
        } catch (error) {
            console.error('Error loading comments', error);
        }
    };

    const handleAddComment = async (postId) => {
        if (!newComment.trim()) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/posts/${postId}/comments`, { content: newComment });
            setNewComment('');

            // Refresh counts and comments
            const postsRes = await axios.get(`${import.meta.env.VITE_API_URL}/posts`);
            setPosts(postsRes.data);

            const commentsRes = await axios.get(`${import.meta.env.VITE_API_URL}/posts/${postId}/comments`);
            setComments(commentsRes.data);
        } catch (error) {
            console.error('Error adding comment', error);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Delete this post permanently?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/posts/${postId}`);
            fetchPosts();
        } catch (error) {
            alert(error.response?.data?.error || 'Cannot delete post');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/posts/comments/${commentId}`);
            // Refresh current comments
            if (activeComments) {
                const commentsRes = await axios.get(`${import.meta.env.VITE_API_URL}/posts/${activeComments}/comments`);
                setComments(commentsRes.data);
                fetchPosts(); // For count update
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Cannot delete comment');
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 0', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Campus Feed</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Discussions, announcements, and knowledge sharing.</p>
                </div>
            </div>

            {/* Post Creation Area - Hidden for Students */}
            {canCreatePost && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '3rem', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{
                            width: '45px', height: '45px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', fontWeight: '800', flexShrink: 0
                        }}>
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <textarea
                                placeholder="Share an announcement, question, or resources..."
                                value={newPost.content}
                                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                style={{
                                    width: '100%', background: 'transparent', border: 'none',
                                    color: 'var(--text-main)', fontSize: '1.1rem', minHeight: '80px',
                                    resize: 'none', outline: 'none', marginBottom: '10px'
                                }}
                            />

                            {(selectedImage || selectedPdf || newPost.link_url) && (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--glass-border)' }}>
                                    {selectedImage && <p style={{ fontSize: '0.85rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '5px' }}><ImageIcon size={14} /> {selectedImage.name}</p>}
                                    {selectedPdf && <p style={{ fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}><FileText size={14} /> {selectedPdf.name}</p>}
                                    {newPost.link_url && <p style={{ fontSize: '0.85rem', color: 'var(--g-blue)', display: 'flex', alignItems: 'center', gap: '5px' }}><LinkIcon size={14} /> {newPost.link_url}</p>}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <label style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
                                        <ImageIcon size={20} className="hover-color-primary" />
                                    </label>
                                    <label style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input type="file" style={{ display: 'none' }} accept=".pdf" onChange={(e) => setSelectedPdf(e.target.files[0])} />
                                        <FileText size={20} className="hover-color-red" />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const link = prompt('Enter URL string (Include https://):');
                                            if (link) setNewPost({ ...newPost, link_url: link });
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <LinkIcon size={20} className="hover-color-blue" />
                                    </button>
                                </div>
                                <button onClick={handleCreatePost} disabled={posting || (!newPost.content && !selectedImage && !selectedPdf && !newPost.link_url)} className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Send size={16} /> {posting ? 'Posting...' : 'Publish'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!canCreatePost && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={18} /> Students have read-only access to broadcast mechanics. Engage via comments and likes below.
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                </div>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>
                    <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No community posts yet. Check back later.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {posts.map(post => {
                        const isAuthor = post.author_name === user?.fullName; // Simplified ownership check
                        const canDelete = isAdmin || isAuthor;

                        return (
                            <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                                {/* Post Header */}
                                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: '700'
                                        }}>
                                            {post.author_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {post.author_name}
                                                <span style={{
                                                    fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px',
                                                    background: post.author_role === 'student' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                                    color: post.author_role === 'student' ? '#60a5fa' : 'var(--accent-purple-light)'
                                                }}>
                                                    {post.author_role.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(post.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {canDelete && (
                                        <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <Trash2 size={16} className="hover-color-red" />
                                        </button>
                                    )}
                                </div>

                                {/* Post Content */}
                                <div style={{ padding: '0 1.5rem 1.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem' }}>
                                    {post.content}
                                </div>

                                {/* Attachments */}
                                {post.link_url && (
                                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                                        <a href={post.link_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--g-blue)', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 16px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '500' }}>
                                            <LinkIcon size={14} /> Open External Link
                                        </a>
                                    </div>
                                )}
                                {post.pdf_url && (
                                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                                        <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${post.pdf_url}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', textDecoration: 'none', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '500' }}>
                                            <FileText size={14} /> View Attached Document
                                        </a>
                                    </div>
                                )}
                                {post.image_url && (
                                    <div style={{ maxWidth: '100%', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
                                        <img src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${post.image_url}`} style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', display: 'block' }} alt="Post Attachment" />
                                    </div>
                                )}

                                {/* Interaction Bar */}
                                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '2rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                                    <button
                                        onClick={() => handleLike(post.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: post.user_has_liked ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}
                                    >
                                        <Heart size={20} fill={post.user_has_liked ? '#ef4444' : 'none'} /> {post.likes}
                                    </button>
                                    <button
                                        onClick={() => loadComments(post.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}
                                    >
                                        <MessageSquare size={20} /> {post.comments} {parseInt(post.comments) === 1 ? 'Comment' : 'Comments'}
                                    </button>
                                </div>

                                {/* Comments Section Drawer */}
                                <AnimatePresence>
                                    {activeComments === post.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                                            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                                                {/* Add Comment */}
                                                <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Write a comment..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        className="form-input-wrapper"
                                                        style={{ flex: 1, padding: '10px 15px', borderRadius: '30px' }}
                                                    />
                                                    <button onClick={() => handleAddComment(post.id)} className="btn btn-primary" style={{ borderRadius: '30px', padding: '10px 20px' }}>Post</button>
                                                </div>

                                                {/* Comment List */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                                    {comments.map((comment) => {
                                                        const isCommentAuthor = comment.author_name === user?.fullName; // Simplified
                                                        const canDelComment = isAdmin || isCommentAuthor;

                                                        return (
                                                            <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>
                                                                    {comment.author_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '0 16px 16px 16px', position: 'relative' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{comment.author_name}</span>
                                                                        {canDelComment && (
                                                                            <button onClick={() => handleDeleteComment(comment.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                                                <Trash2 size={14} className="hover-color-red" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p style={{ margin: '5px 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{comment.content}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Community;
