import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Heart, Share2, Image as ImageIcon, FileText, Send, Trash2, Link as LinkIcon, AlertCircle, Plus, X } from 'lucide-react';

const Community = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

    // Roles include: Student, Faculty, Teacher, Admin, Super Admin
    // For now, let's assume everyone but students can post as per user request (or specify)
    const canCreatePost = ['black_hat_admin', 'admin', 'super_admin', 'faculty', 'teacher'].includes(user?.role);
    const isAdmin = ['black_hat_admin', 'admin', 'super_admin'].includes(user?.role);

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
            setIsCreateModalOpen(false);
            fetchPosts();
        } catch (error) {
            const errorMsg = error.response?.data?.error || '';
            const detailMsg = error.response?.data?.message || '';
            alert('Error creating post: ' + errorMsg + (detailMsg ? ' (' + detailMsg + ')' : ''));
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (postId) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/posts/${postId}/like`);
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
            setActiveComments(null);
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
            const commentsRes = await axios.get(`${import.meta.env.VITE_API_URL}/posts/${postId}/comments`);
            setComments(commentsRes.data);

            // Update counts locally
            setPosts(posts.map(p => p.id === postId ? { ...p, comments: parseInt(p.comments) + 1 } : p));
        } catch (error) {
            console.error('Error adding comment', error);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Delete this post permanently?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/posts/${postId}`);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (error) {
            alert(error.response?.data?.error || 'Cannot delete post');
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 0 6rem', maxWidth: '650px', margin: '0 auto' }}>
            {/* Header / Top Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                position: 'sticky',
                top: '100px',
                zIndex: 100,
                background: 'var(--bg-main)',
                padding: '10px 0'
            }}>
                <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '900' }}>CampusPulse Feed</h1>
            </div>

            {/* Floating Create Button - Top Right */}
            {canCreatePost && (
                <motion.button
                    whileHover={{ scale: 1.1, translateY: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{
                        position: 'fixed',
                        top: '120px',
                        right: '40px',
                        width: '55px', height: '55px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-green), var(--accent-olive))',
                        color: 'white', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                        zIndex: 1000
                    }}
                    title="Create Post"
                >
                    <Plus size={28} />
                </motion.button>
            )}

            {/* Main Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div className="loader" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>
                        <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>No community posts yet. Be the first to start a conversation!</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            user={user}
                            isAdmin={isAdmin}
                            onLike={() => handleLike(post.id)}
                            onDelete={() => handleDeletePost(post.id)}
                            onLoadComments={() => loadComments(post.id)}
                            isActiveComments={activeComments === post.id}
                            comments={comments}
                            newComment={newComment}
                            setNewComment={setNewComment}
                            onAddComment={() => handleAddComment(post.id)}
                        />
                    ))
                )}
            </div>

            {/* Create Post Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ maxWidth: '500px', width: '100%', padding: '2rem', position: 'relative' }}
                        >
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>

                            <h2 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Post</h2>

                            <textarea
                                placeholder="What's on your mind?"
                                value={newPost.content}
                                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                    color: 'var(--text-main)', fontSize: '1rem', minHeight: '120px',
                                    borderRadius: '12px', padding: '15px', resize: 'none', outline: 'none', marginBottom: '15px'
                                }}
                            />

                            {(selectedImage || selectedPdf || newPost.link_url) && (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--glass-border)' }}>
                                    {selectedImage && <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '5px' }}><ImageIcon size={12} /> {selectedImage.name}</p>}
                                    {selectedPdf && <p style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}><FileText size={12} /> {selectedPdf.name}</p>}
                                    {newPost.link_url && <p style={{ fontSize: '0.8rem', color: 'var(--g-blue)', display: 'flex', alignItems: 'center', gap: '5px' }}><LinkIcon size={12} /> {newPost.link_url}</p>}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <label style={{ cursor: 'pointer', color: 'var(--text-light)', opacity: 0.7 }}>
                                        <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
                                        <ImageIcon size={22} />
                                    </label>
                                    <label style={{ cursor: 'pointer', color: 'var(--text-light)', opacity: 0.7 }}>
                                        <input type="file" style={{ display: 'none' }} accept=".pdf" onChange={(e) => setSelectedPdf(e.target.files[0])} />
                                        <FileText size={22} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const link = prompt('Enter URL string:');
                                            if (link) setNewPost({ ...newPost, link_url: link });
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-light)', opacity: 0.7, cursor: 'pointer' }}
                                    >
                                        <LinkIcon size={22} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreatePost}
                                    disabled={posting || (!newPost.content && !selectedImage && !selectedPdf && !newPost.link_url)}
                                    className="btn btn-primary"
                                    style={{ padding: '10px 25px', borderRadius: '30px' }}
                                >
                                    {posting ? 'Posting...' : 'Publish'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PostCard = ({ post, user, isAdmin, onLike, onDelete, onLoadComments, isActiveComments, comments, newComment, setNewComment, onAddComment }) => {
    const isAuthor = post.author_name === user?.fullName;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
        >
            {/* Header */}
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-green), var(--accent-olive))',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: '800'
                    }}>
                        {post.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {post.author_name}
                            <span style={{
                                fontSize: '0.6rem', background: 'rgba(139, 154, 70, 0.2)', color: 'var(--accent-green-light)',
                                padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase'
                            }}>
                                {post.author_role}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(post.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                {(isAdmin || isAuthor) && (
                    <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Media/Image (Main focus for Instagram feel) */}
            {post.image_url && (
                <div style={{ background: '#000', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                        src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${post.image_url}`}
                        style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }}
                        alt="Post Content"
                    />
                </div>
            )}

            {/* Content Area */}
            <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '1rem', lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '800', marginRight: '8px' }}>{post.author_name}</span>
                    {post.content}
                </div>

                {/* Attachments */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    {post.link_url && (
                        <a href={post.link_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--g-blue)', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LinkIcon size={12} /> External Link
                        </a>
                    )}
                    {post.pdf_url && (
                        <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${post.pdf_url}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#ef4444', textDecoration: 'none', background: 'rgba(239, 68, 68, 0.1)', padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={12} /> Document
                        </a>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '15px' }}>
                    <button
                        onClick={onLike}
                        style={{ background: 'none', border: 'none', color: post.user_has_liked ? '#ef4444' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
                    >
                        <Heart size={22} fill={post.user_has_liked ? '#ef4444' : 'none'} /> {post.likes}
                    </button>
                    <button
                        onClick={onLoadComments}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
                    >
                        <MessageSquare size={22} /> {post.comments}
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {isActiveComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}
                    >
                        <div style={{ padding: '1rem' }}>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {comments.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No comments yet.</p>
                                ) : (
                                    comments.map(c => (
                                        <div key={c.id} style={{ fontSize: '0.88rem' }}>
                                            <span style={{ fontWeight: '800', marginRight: '6px' }}>{c.author_name}</span>
                                            <span style={{ color: 'var(--text-light)' }}>{c.content}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '8px 15px', color: 'white', fontSize: '0.9rem' }}
                                />
                                <button onClick={onAddComment} disabled={!newComment.trim()} style={{ background: 'none', border: 'none', color: 'var(--accent-green-light)', fontWeight: '700', cursor: 'pointer' }}>Post</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Community;
