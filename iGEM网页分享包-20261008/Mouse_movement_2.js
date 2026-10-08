// 鼠标移动涟漪效果，仅在 main-wrapper 区域内激活
(function() {
    // =============================================
    // 1. 初始化主画布（固定于视口）
    // =============================================
    const backgroundCanvas = document.getElementById('backgroundCanvas');
    const backgroundContext = backgroundCanvas.getContext('2d');
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    function resizeCanvas() {
        // 画布尺寸与视口一致，背景不会被拉伸
        backgroundCanvas.width = window.innerWidth;
        backgroundCanvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // 同步更新背景管理器尺寸
        if (window.BackgroundManager) {
            BackgroundManager.init(canvas.width, canvas.height);
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // =============================================
    // 2. 区域激活控制（IntersectionObserver）
    // =============================================
    let isActive = false;
    const mainWrapper = document.getElementById('mainWrapper');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isActive = entry.isIntersecting;
            if (isActive) {
                // 重新进入时重置鼠标状态
                lastMouseX = 0;
                lastMouseY = 0;
                isFirstMouseMove = true;
            }
        });
    }, { threshold: 0 });  // 只要有一像素可见就激活

    observer.observe(mainWrapper);

    // =============================================
    // 3. 颜色工具函数
    // =============================================
    function sampleColor(x, y) {
        return BackgroundManager.sampleColor(x, y);
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgbStr(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }

    function hslToRgbaStr(h, s, l, a) {
        const rgb = hslToRgbStr(h, s, l);
        return rgb.replace('rgb', 'rgba').replace(')', `, ${a.toFixed(3)})`);
    }

    function generateRippleColor(r, g, b) {
        const hsl = rgbToHsl(r, g, b);
        let newH = hsl.h;
        let newS = Math.min(100, hsl.s + 30);
        let newL;
        if (hsl.l < 40) {
            newL = hsl.l + 40;
        } else if (hsl.l > 70) {
            newL = hsl.l - 30;
        } else {
            newL = hsl.l + 20;
        }
        newL = Math.max(10, Math.min(90, newL));
        newS = Math.max(40, newS);
        return { h: newH, s: newS, l: newL };
    }

    // =============================================
    // 4. 涟漪
    // =============================================
    let rippleIdCounter = 0;
    let ripples = [];
    let droplets = [];
    let lastEmitTime = 0;
    const emitInterval = 60;

    function createRipple(x, y, colorHsl) {
        const isEllipse = Math.random() > 0.5;

        const maxRadius = 25 + Math.random() * 35;
        const waveCount = 4 + Math.floor(Math.random() * 3);
        const wavelength = maxRadius / waveCount;
        const amplitude = 3.0 + Math.random() * 2.0;
        const damping = 0.65 + Math.random() * 0.15;
        let radiusX, radiusY, rotation;
        let mouseDist = 0;
        if (!isFirstMouseMove) {
            const dx = x - lastMouseX;
            const dy = y - lastMouseY;
            mouseDist = Math.sqrt(dx * dx + dy * dy);
        } else {
            isFirstMouseMove = false;
        }
        lastMouseX = x;
        lastMouseY = y;

        if (isEllipse) {
            const ratio = 0.6 + Math.random() * 0.8;
            if (Math.random() > 0.5) {
                radiusX = maxRadius;
                radiusY = maxRadius * ratio;
            } else {
                radiusX = maxRadius * ratio;
                radiusY = maxRadius;
            }
            rotation = Math.random() * Math.PI * 2;
        } else {
            radiusX = maxRadius;
            radiusY = maxRadius;
            rotation = 0;
        }

        const ringCount = 3 + Math.floor(Math.random() * 4);
        const rings = [];
        for (let i = 0; i < ringCount; i++) {
            const spacing = 0.2 + (i / ringCount) * 0.7;
            const ringAlpha = 0.8 - (i / ringCount) * 0.3;
            const ringWidth = 2.0 - (i / ringCount) * 0.8;
            const ringGrow = 1.0 + (i / ringCount) * 0.5;
            rings.push({
                spacing: spacing,
                alpha: ringAlpha,
                lineWidth: ringWidth,
                growSpeed: ringGrow,
                currentRadius: 2 * spacing
            });
        }

        return {
            id: rippleIdCounter++,
            x, y,
            radius: 2,
            radiusX: 2,
            radiusY: 2,
            maxRadiusX: radiusX,
            maxRadiusY: radiusY,
            maxRadius: maxRadius,
            isEllipse,
            rotation,
            rings: rings,
            ringCount: ringCount,
            alpha: 0.5,
            fadeSpeed: 0.005 + Math.random() * 0.01,
            growSpeed: 0.8 + Math.random() * 0.6,
            lineWidth: 1.5 + Math.random() * 1.5,
            colorHsl,
            waveCount,
            wavelength,
            amplitude,
            damping,
            progress: 0,
            progressSpeed: 0.015 + Math.random() * 0.01,
            glowIntensity: 0.3 + Math.random() * 0.2,
            glowSize: 8 + Math.random() * 12,
            collidedWith: new Set(),
            mouseDist: mouseDist
        };
    }

    // =============================================
    // 5. 水滴对象
    // =============================================
    function createDroplet(x, y, colorHsl, parentRipple) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.0;
        const size = 1.5 + Math.random() * 2.0;
        return {
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: size,
            alpha: 0.5 + Math.random() * 0.2,
            fadeSpeed: 0.008 + Math.random() * 0.015,
            gravity: 0.05 + Math.random() * 0.05,
            colorHsl: {
                h: colorHsl.h + (Math.random() - 0.5) * 20,
                s: colorHsl.s,
                l: colorHsl.l + (Math.random() - 0.5) * 15
            },
            shrinkSpeed: 0.005 + Math.random() * 0.01,
            rotation: Math.random() * Math.PI * 2,
            hasLanded: false,
            landCooldown: 0
        };
    }

    // =============================================
    // 6. 碰撞检测与溅射
    // =============================================
    function checkCollisions() {
        for (let i = 0; i < ripples.length; i++) {
            for (let j = i + 1; j < ripples.length; j++) {
                const a = ripples[i];
                const b = ripples[j];
                if (a.collidedWith.has(b.id)) continue;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const sumRadius = (a.radiusX + a.radiusY) / 2 + (b.radiusX + b.radiusY) / 2;
                if (dist < sumRadius && dist > 0) {
                    a.collidedWith.add(b.id);
                    b.collidedWith.add(a.id);
                    const aSizeRatio = (a.radiusX + a.radiusY) / 2 / a.maxRadius;
                    const bSizeRatio = (b.radiusX + b.radiusY) / 2 / b.maxRadius;
                    const sizeThreshold = 0.6;
                    if (aSizeRatio < sizeThreshold || bSizeRatio < sizeThreshold) {
                        continue;
                    }
                    const distThreshold = 80;
                    if (a.mouseDist < distThreshold || b.mouseDist < distThreshold) {
                        continue;
                    }
                    const collisionX = (a.x + b.x) / 2;
                    const collisionY = (a.y + b.y) / 2;
                    const mixedHsl = {
                        h: (a.colorHsl.h + b.colorHsl.h) / 2,
                        s: (a.colorHsl.s + b.colorHsl.s) / 2,
                        l: (a.colorHsl.l + b.colorHsl.l) / 2
                    };
                    const dropletCount = 1.5 + Math.floor(Math.random() * 3);
                    for (let k = 0; k < dropletCount; k++) {
                        const droplet = createDroplet(collisionX, collisionY, mixedHsl, a);
                        droplets.push(droplet);
                    }
                }
            }
        }
    }

    // =============================================
    // 7. 鼠标事件
    // =============================================
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isFirstMouseMove = true;

    document.addEventListener('mousemove', function(e) {
        if (!isActive) return;

        const now = Date.now();
        if (now - lastEmitTime < emitInterval) return;
        lastEmitTime = now;

        // 画布固定于视口，直接使用视口坐标
        const x = e.clientX;
        const y = e.clientY;

        const bgColor = sampleColor(x, y);
        const colorHsl = generateRippleColor(bgColor.r, bgColor.g, bgColor.b);
        const ripple = createRipple(x, y, colorHsl);
        ripples.push(ripple);
        if (ripples.length > 60) {
            ripples.splice(0, ripples.length - 60);
        }
    });

    document.addEventListener('touchmove', function(e) {
        if (!isActive) return;
        e.preventDefault();

        const touch = e.touches[0];
        if (!touch) return;

        const now = Date.now();
        if (now - lastEmitTime < emitInterval * 2) return;
        lastEmitTime = now;

        // 使用触摸点视口坐标
        const x = touch.clientX;
        const y = touch.clientY;

        const bgColor = sampleColor(x, y);
        const colorHsl = generateRippleColor(bgColor.r, bgColor.g, bgColor.b);
        const ripple = createRipple(x, y, colorHsl);
        ripples.push(ripple);
    }, { passive: false });

    // =============================================
    // 8. 主渲染循环
    // =============================================
    function animate(timestamp) {
        // 始终更新并绘制背景，不受 isActive 影响
        BackgroundManager.update(timestamp);
        BackgroundManager.drawToContext(backgroundContext);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 只有在激活状态下才处理涟漪
        if (isActive) {
            // 碰撞检测
            checkCollisions();

            // ---------- 更新和绘制涟漪 ----------
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i];
                r.radiusX += r.growSpeed;
                r.radiusY += r.growSpeed * (r.maxRadiusY / r.maxRadiusX);
                r.radius = (r.radiusX + r.radiusY) / 2;
                r.alpha -= r.fadeSpeed;
                r.progress += r.progressSpeed;
                r.alpha = 0.8 * (1 - r.progress);

                for (let ring of r.rings) {
                    ring.currentRadius += ring.growSpeed;
                    ring.alpha = (0.8 - (r.rings.indexOf(ring) / r.ringCount) * 0.3) * (r.alpha / 0.7);
                }

                if (r.alpha <= 0 || r.radius >= r.maxRadius || r.progress >= 1) {
                    ripples.splice(i, 1);
                    continue;
                }

                const hsl = r.colorHsl;
                const currentRadius = r.progress * r.maxRadius;

                // 绘制光环
                for (let ring of r.rings) {
                    const currentRingRadiusX = r.radiusX * ring.spacing;
                    const currentRingRadiusY = r.radiusY * ring.spacing;
                    if (ring.alpha <= 0) continue;
                    ctx.beginPath();
                    if (r.isEllipse) {
                        ctx.ellipse(r.x, r.y, currentRingRadiusX, currentRingRadiusY, r.rotation, 0, Math.PI * 2);
                    } else {
                        ctx.arc(r.x, r.y, currentRingRadiusX, 0, Math.PI * 2);
                    }
                    ctx.strokeStyle = hslToRgbaStr(hsl.h, hsl.s, hsl.l, ring.alpha);
                    ctx.lineWidth = ring.lineWidth * (r.alpha / 0.7);
                    ctx.stroke();
                }

                // 绘制波纹
                for (let w = 0; w < r.waveCount; w++) {
                    const waveRadius = (w + 0.5) * r.wavelength * r.progress;
                    if (waveRadius > currentRadius) break;
                    const waveAmplitude = r.amplitude * Math.pow(r.damping, w);
                    if (waveAmplitude < 0.2) continue;
                    const waveAlpha = r.alpha * Math.pow(0.7, w);
                    const waveLineWidth = (2.0 - w * 0.25) * (r.alpha / 0.8);
                    ctx.beginPath();
                    if (r.isEllipse) {
                        ctx.ellipse(r.x, r.y, waveRadius, waveRadius * (r.maxRadiusY / r.maxRadiusX), r.rotation, 0, Math.PI * 2);
                    } else {
                        ctx.arc(r.x, r.y, waveRadius, 0, Math.PI * 2);
                    }
                    const brightnessOffset = 10 * (w % 2 === 0 ? 1 : -1);
                    const waveL = Math.min(90, Math.max(10, hsl.l + brightnessOffset));
                    ctx.strokeStyle = hslToRgbaStr(hsl.h, hsl.s, waveL, waveAlpha);
                    ctx.lineWidth = waveLineWidth;
                    ctx.stroke();

                    const breath = 0.5 + 0.5 * Math.sin(Date.now() * 0.008 + r.id);
                    const glowAlpha = r.alpha * 0.12 * breath;
                    if (glowAlpha > 0.01) {
                        const glowRadius = currentRadius * 1.3;
                        ctx.beginPath();
                        if (r.isEllipse) {
                            ctx.ellipse(r.x, r.y, glowRadius, glowRadius * (r.maxRadiusY / r.maxRadiusX), r.rotation, 0, Math.PI * 2);
                        } else {
                            ctx.arc(r.x, r.y, glowRadius, 0, Math.PI * 2);
                        }
                        const glowColor = hslToRgbaStr(hsl.h, hsl.s, Math.min(95, hsl.l + 25), glowAlpha);
                        ctx.strokeStyle = glowColor;
                        ctx.lineWidth = 4 * breath;
                        ctx.stroke();
                    }
                }
            }

            // ---------- 更新和绘制水滴 ----------
            for (let i = droplets.length - 1; i >= 0; i--) {
                const d = droplets[i];
                d.vy += d.gravity;
                d.x += d.vx;
                d.y += d.vy;
                d.alpha -= d.fadeSpeed;
                d.radius -= d.shrinkSpeed;
                d.vx *= 0.99;
                d.vy *= 0.99;

                const willBeRemoved = (d.alpha <= 0 || d.radius <= 0.3);
                if (willBeRemoved) {
                    const bg = sampleColor(d.x, d.y);
                    const rippleColor = generateRippleColor(bg.r, bg.g, bg.b);
                    rippleColor.s = Math.max(20, rippleColor.s - 10);
                    rippleColor.l = Math.min(95, rippleColor.l + 5);
                    const dropletRipple = createRipple(d.x, d.y, rippleColor);
                    dropletRipple.maxRadius = 10 + Math.random() * 20;
                    dropletRipple.maxRadiusX = dropletRipple.maxRadius;
                    dropletRipple.maxRadiusY = dropletRipple.maxRadius;
                    dropletRipple.isEllipse = false;
                    dropletRipple.waveCount = 2 + Math.floor(Math.random() * 2);
                    dropletRipple.alpha = 0.45;
                    dropletRipple.progressSpeed = 0.025 + Math.random() * 0.015;
                    dropletRipple.fadeSpeed = 0.012;
                    dropletRipple.glowIntensity = 0.15;
                    dropletRipple.lineWidth = 1.0;
                    dropletRipple.wavelength = dropletRipple.maxRadius / dropletRipple.waveCount;
                    ripples.push(dropletRipple);
                    droplets.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
                ctx.fillStyle = hslToRgbaStr(d.colorHsl.h, d.colorHsl.s, d.colorHsl.l, d.alpha);
                ctx.fill();

                if (d.radius > 1.5) {
                    ctx.beginPath();
                    ctx.arc(d.x - d.radius * 0.2, d.y - d.radius * 0.2, d.radius * 0.3, 0, Math.PI * 2);
                    ctx.fillStyle = hslToRgbaStr(d.colorHsl.h, d.colorHsl.s, Math.min(95, d.colorHsl.l + 30), d.alpha * 0.5);
                    ctx.fill();
                }
            }

            if (droplets.length > 150) {
                droplets.splice(0, droplets.length - 150);
            }
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
})();