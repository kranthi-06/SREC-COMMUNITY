/**
 * ProfileRing.jsx
 * -------------------------------------------------
 * Reusable Instagram-style profile ring component.
 * Wraps around an avatar with a rotating gradient border
 * that visually represents user roles.
 *
 * Roles:
 *   admin / editor_admin       → Gold rotating gradient ring
 *   black_hat_admin            → Neon purple faster rotating ring
 *   faculty / hod / teacher    → Copper/bronze slow rotating ring
 *   student (default)          → Plain gray static ring
 *
 * Props:
 *   role     — user role string (required)
 *   size     — diameter of the avatar in px (default: 36)
 *   children — the avatar content (letter, image, icon)
 * -------------------------------------------------
 */
import React from 'react';

/**
 * Returns the CSS modifier class for the role ring.
 */
const getRingClass = (role) => {
    switch (role) {
        case 'admin':
        case 'editor_admin':
            return 'admin-ring';
        case 'black_hat_admin':
        case 'blackhat_admin':
            return 'ai-ring';
        case 'faculty':
        case 'hod':
        case 'principal':
        case 'teacher':
            return 'faculty-ring';
        default:
            return 'student-ring';
    }
};

const ProfileRing = ({ role = 'student', size = 36, children, style = {}, className = '' }) => {
    const ringClass = getRingClass(role);

    return (
        <div
            className={`profile-ring ${ringClass} ${className}`}
            style={{
                ...style
            }}
        >
            <div
                className="profile-ring__inner"
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default ProfileRing;
