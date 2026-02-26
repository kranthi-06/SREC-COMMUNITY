export const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;

    // Fallback: Ensure relative paths are correctly prefixed
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseUrl = apiUrl.replace(/\/api$/, '');

    // If baseUrl is empty (relative /api or undefined), we rely on root-relative paths for Vercel
    // But for local dev (Vite on 5173, Backend on 5000), we need to point to 5000
    if (!baseUrl && window.location.hostname === 'localhost') {
        return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
    }

    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
