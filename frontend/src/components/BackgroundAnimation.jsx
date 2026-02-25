import React, { useRef, useEffect, useCallback } from 'react';

const BackgroundAnimation = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    const shapesRef = useRef([]);
    const shootingStarsRef = useRef([]);
    const ringsRef = useRef([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    const getThemeColors = useCallback(() => {
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        return {
            isDark,
            particleColor: isDark ? 'rgba(138, 138, 130,' : 'rgba(100, 116, 100,',
            lineColor: isDark ? 'rgba(139, 154, 70,' : 'rgba(107, 122, 61,',
            accentColors: [
                { r: 139, g: 154, b: 70 },   // Olive green
                { r: 156, g: 175, b: 136 },   // Sage
                { r: 196, g: 160, b: 82 },    // Gold
                { r: 107, g: 122, b: 61 },    // Dark olive
                { r: 163, g: 179, b: 86 },    // Light green
            ],
        };
    }, []);

    const createElements = useCallback((width, height) => {
        // --- Particles (more of them, varied sizes) ---
        const area = width * height;
        const particleCount = Math.min(Math.max(Math.floor(area / 12000), 50), 120);
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const isAccent = Math.random() < 0.25;
            const isLarge = Math.random() < 0.12; // 12% chance of a larger glowing particle
            const baseRadius = isLarge ? Math.random() * 4 + 3 : Math.random() * 2.3 + 0.7;

            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: baseRadius,
                baseRadius,
                opacity: isLarge ? Math.random() * 0.4 + 0.35 : Math.random() * 0.55 + 0.2,
                baseOpacity: isLarge ? Math.random() * 0.4 + 0.35 : Math.random() * 0.55 + 0.2,
                isAccent,
                isLarge,
                accentIndex: Math.floor(Math.random() * 5),
                pulseSpeed: Math.random() * 0.01 + 0.004,
                pulseOffset: Math.random() * Math.PI * 2,
            });
        }

        // --- Floating Geometric Shapes ---
        const shapeCount = Math.min(Math.max(Math.floor(area / 200000), 4), 10);
        const shapes = [];
        const shapeTypes = ['triangle', 'square', 'hexagon', 'diamond'];

        for (let i = 0; i < shapeCount; i++) {
            shapes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                size: Math.random() * 25 + 15,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.003,
                opacity: Math.random() * 0.12 + 0.05,
                type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
                accentIndex: Math.floor(Math.random() * 5),
                pulseSpeed: Math.random() * 0.006 + 0.002,
                pulseOffset: Math.random() * Math.PI * 2,
            });
        }

        // --- Pulsing Rings ---
        const rings = [];
        for (let i = 0; i < 3; i++) {
            rings.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: 0,
                maxRadius: Math.random() * 80 + 50,
                speed: Math.random() * 0.3 + 0.15,
                opacity: 0,
                accentIndex: Math.floor(Math.random() * 5),
                delay: Math.random() * 600,
                active: false,
                timer: Math.random() * 400,
            });
        }

        return { particles, shapes, rings };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        let width, height;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = document.documentElement.scrollHeight || window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const elements = createElements(width, height);
            particlesRef.current = elements.particles;
            shapesRef.current = elements.shapes;
            ringsRef.current = elements.rings;
            shootingStarsRef.current = [];
        };

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY + window.scrollY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        const CONNECTION_DISTANCE = 150;
        const MOUSE_RADIUS = 200;
        let lastShootingStar = 0;

        // ============================================
        // Draw helpers
        // ============================================
        const drawTriangle = (x, y, size, rotation) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                const px = Math.cos(angle) * size;
                const py = Math.sin(angle) * size;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.restore();
        };

        const drawSquare = (x, y, size, rotation) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();
            ctx.rect(-size / 2, -size / 2, size, size);
            ctx.restore();
        };

        const drawDiamond = (x, y, size, rotation) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.6, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.6, 0);
            ctx.closePath();
            ctx.restore();
        };

        const drawHexagon = (x, y, size, rotation) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const px = Math.cos(angle) * size;
                const py = Math.sin(angle) * size;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.restore();
        };

        // ============================================
        // Main draw loop
        // ============================================
        const draw = (time) => {
            ctx.clearRect(0, 0, width, height);
            const colors = getThemeColors();
            const particles = particlesRef.current;
            const shapes = shapesRef.current;
            const shootingStars = shootingStarsRef.current;
            const rings = ringsRef.current;
            const mouse = mouseRef.current;

            // ---- 1. DRAW FLOATING GEOMETRIC SHAPES ----
            for (const shape of shapes) {
                const pulse = Math.sin(time * shape.pulseSpeed + shape.pulseOffset);
                const currentOpacity = shape.opacity + pulse * 0.03;
                shape.rotation += shape.rotationSpeed;
                shape.x += shape.vx;
                shape.y += shape.vy;

                // Wrap
                if (shape.x < -40) shape.x = width + 40;
                if (shape.x > width + 40) shape.x = -40;
                if (shape.y < -40) shape.y = height + 40;
                if (shape.y > height + 40) shape.y = -40;

                const c = colors.accentColors[shape.accentIndex];
                const strokeColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(currentOpacity, 0.01)})`;

                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 1.3;

                if (shape.type === 'triangle') drawTriangle(shape.x, shape.y, shape.size, shape.rotation);
                else if (shape.type === 'square') drawSquare(shape.x, shape.y, shape.size, shape.rotation);
                else if (shape.type === 'diamond') drawDiamond(shape.x, shape.y, shape.size, shape.rotation);
                else drawHexagon(shape.x, shape.y, shape.size, shape.rotation);

                ctx.stroke();
            }

            // ---- 2. DRAW PULSING RINGS ----
            for (const ring of rings) {
                ring.timer++;

                if (!ring.active && ring.timer > ring.delay) {
                    ring.active = true;
                    ring.radius = 0;
                    ring.opacity = 0.18;
                    ring.x = Math.random() * width;
                    ring.y = Math.random() * height;
                    ring.timer = 0;
                    ring.delay = Math.random() * 500 + 300;
                }

                if (ring.active) {
                    ring.radius += ring.speed;
                    ring.opacity = 0.18 * (1 - ring.radius / ring.maxRadius);

                    if (ring.radius >= ring.maxRadius) {
                        ring.active = false;
                        ring.timer = 0;
                    } else {
                        const c = colors.accentColors[ring.accentIndex];
                        ctx.beginPath();
                        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(ring.opacity, 0)})`;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            }

            // ---- 3. DRAW PARTICLES & CONNECTIONS ----
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Pulse
                const pulse = Math.sin(time * p.pulseSpeed + p.pulseOffset);
                p.radius = p.baseRadius + pulse * (p.isLarge ? 1.0 : 0.5);
                p.opacity = p.baseOpacity + pulse * 0.13;

                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Wrap
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10;
                if (p.y > height + 10) p.y = -10;

                // Mouse interaction
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_RADIUS && dist > 0) {
                    const force = (1 - dist / MOUSE_RADIUS) * 0.02;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // Damping
                p.vx *= 0.998;
                p.vy *= 0.998;

                // Draw glow for large particles
                if (p.isLarge) {
                    const c = colors.accentColors[p.accentIndex];
                    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 5);
                    gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${p.opacity * 0.45})`);
                    gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius * 5, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }

                // Draw particle
                let fillColor;
                if (p.isAccent || p.isLarge) {
                    const c = colors.accentColors[p.accentIndex];
                    fillColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.opacity})`;
                } else {
                    fillColor = `${colors.particleColor} ${p.opacity})`;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const cdx = p.x - p2.x;
                    const cdy = p.y - p2.y;
                    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

                    if (cdist < CONNECTION_DISTANCE) {
                        const lineOpacity = (1 - cdist / CONNECTION_DISTANCE) * 0.18;

                        // Use accent color for lines between accent particles
                        let lineStroke;
                        if ((p.isAccent || p.isLarge) && (p2.isAccent || p2.isLarge)) {
                            const c = colors.accentColors[p.accentIndex];
                            lineStroke = `rgba(${c.r}, ${c.g}, ${c.b}, ${lineOpacity})`;
                        } else {
                            lineStroke = `${colors.lineColor} ${lineOpacity})`;
                        }

                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = lineStroke;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }

                // Mouse connection lines
                if (dist < MOUSE_RADIUS) {
                    const mouseLineOpacity = (1 - dist / MOUSE_RADIUS) * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `${colors.lineColor} ${mouseLineOpacity})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }

            // ---- 4. SHOOTING STARS ----
            // Spawn new shooting star occasionally
            if (time - lastShootingStar > 3000 + Math.random() * 4000) {
                lastShootingStar = time;
                const startX = Math.random() * width * 0.8;
                const startY = Math.random() * height * 0.3;
                shootingStars.push({
                    x: startX,
                    y: startY,
                    vx: Math.random() * 4 + 2.5,
                    vy: Math.random() * 2 + 1,
                    life: 1,
                    decay: Math.random() * 0.007 + 0.005,
                    length: Math.random() * 80 + 50,
                    accentIndex: Math.floor(Math.random() * 3),
                });
            }

            // Draw & update shooting stars
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const s = shootingStars[i];
                s.x += s.vx;
                s.y += s.vy;
                s.life -= s.decay;

                if (s.life <= 0) {
                    shootingStars.splice(i, 1);
                    continue;
                }

                const c = colors.accentColors[s.accentIndex];
                const tailX = s.x - (s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length;
                const tailY = s.y - (s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length;

                const gradient = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
                gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
                gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, ${s.life * 0.7})`);

                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(s.x, s.y);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Head glow
                const headGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 10);
                headGlow.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${s.life * 0.8})`);
                headGlow.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
                ctx.beginPath();
                ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = headGlow;
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        resize();
        animationRef.current = requestAnimationFrame(draw);

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        const resizeObserver = new ResizeObserver(() => {
            const newHeight = document.documentElement.scrollHeight;
            if (Math.abs(newHeight - height) > 50) {
                resize();
            }
        });
        resizeObserver.observe(document.body);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            resizeObserver.disconnect();
        };
    }, [createElements, getThemeColors]);

    return (
        <canvas
            ref={canvasRef}
            className="bg-particles"
            aria-hidden="true"
        />
    );
};

export default React.memo(BackgroundAnimation);
