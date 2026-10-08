// JavaScript Document
(function() {
    // ---------- 可调参数 ----------
    const RENDER_SCALE = 1.00;
    const SIM_SCALE = 0.6;
    const DAMPING = 0.96;
    const REFRACTION_STRENGTH = 25;
    const RIPPLE_RADIUS = 15;
    const SINGLE_RIPPLE_STRENGTH = 3.0;
    const CONTINUOUS_STRENGTH_MIN = 2.5;
    const CONTINUOUS_STRENGTH_MAX = 3.5;
    const CLICK_RIPPLE_STRENGTH = 5.0;
    const RANDOM_PHASE = 0.05;

    const HIGH_SPEED_THRESHOLD = 0.6;
    const LOW_SPEED_THRESHOLD = 0.3;
    const SPEED_EMA_ALPHA = 0.2;
    const PAUSE_THRESHOLD = 150;
    const EXIT_DELAY = 200;

    const VORTEX_TRIGGER_ANGLE = Math.PI / 3;
    const VORTEX_MIN_SPEED = 0.5;
    const VORTEX_RADIUS = 20;
    const VORTEX_STEPS = 8;
    const VORTEX_STRENGTH = 2.5;
    const VORTEX_INTERVAL_FRAMES = 2;

    const WIDTH_GROWTH_RATE = 0.05;
    const MAX_RIPPLE_RADIUS = 150;

    // 文字层配置
    const TEXT_LAYERS = [
        {
            text: "NariViva",
            font: 'bold 240px "Adobe Poetica", "Times New Roman", serif',
            fontSize: 240,
            xRatio: 0.5,
            yRatio: 0.48,
            align: 'center',
            baseline: 'middle',
            fillGradientColors: ['#D693A1', '#E2F5FF', '#8FC9BD'],
            strokeGradientColors: ['#B36D82', '#B8E2FF', '#6B9F96'],
            lineWidth: 4,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 4
        },
        {
            text: "This is the introduction.",
            font: 'italic 28px "Helvetica Neue", Arial, sans-serif',
            fontSize: 28,
            color: '#ffffff',
            xRatio: 0.5,
            yRatio: 0.62,
            align: 'center',
            baseline: 'middle',
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 2
        }
    ];

    // ---------- 状态变量 ----------
    let simWidth, simHeight, cellSizeX, cellSizeY;
    let heightCurr, heightPrev;
    let gradXField, gradYField;
    let recentPoints = [];
    let lastMousePos = null;
    let lastMoveTime = 0;
    let lastEventTime = 0;
    let isContinuous = false;
	let interactionEnabled = false;
    let smoothedSpeed = 0;
    let continuousExitTimer = 0;
    let continuousTrailLength = 0;

    let lastVelocityX = 0, lastVelocityY = 0;
    let hasLastVelocity = false;

    let vortexQueue = [];
    let frameCount = 0;

    let pendingMouseEvent = null;
    let pendingTouchEvent = null;
    let simFrameSkip = 0;
    const SIM_UPDATE_INTERVAL = 2;

    // 文字动画进度
    let textRevealStartTime = 0;
    let typewriterStartTime = 0;
    const TOTAL_ANIMATION_DURATION = 5000;   // 总动画时长（ms）
    const TYPEWRITER_DURATION = 2500;        // 第二层打字机时长
    let text1Progress = 0;
    let text2Progress = 0;

    // ---------- 第一层文字弹入动画参数 ----------
    const ENTRANCE_ANGLE = 50 * Math.PI / 180;      // 右上50°
    const AMPLITUDE_MIN = 1.3;                      // 最小振幅比例
    const AMPLITUDE_MAX = 1.6;                      // 最大振幅比例
    const STAGGER_DELAY = 200;                      // 字母间延迟（ms）
    const ENTRANCE_DURATION = 4000;                 // 单个字母动画持续时间（含振荡）
    const OSCILLATION_COUNT = 4;                    // 回弹振荡次数
    const OSCILLATION_DECAY = 6;                    // 振荡衰减系数
    const CURVE_HEIGHT_RATIO = 0.3;                 // 曲线控制点高度比例（相对于振幅）
    const ROTATION_AMPLITUDE = 0.3;                 // 旋转幅度（弧度）
    const SCALE_VARIATION = 0.1;                    // 缩放变化比例（±10%）

    let charInfos = [];          // 存储每个字符的信息
    let totalTextWidth = 0;
    let textStartX = 0;
    let clipHeight1 = 0;
    let waveStartTime = 0;
    let waveAccumulatedPause = 0;
    let wavePaused = false;
    let wavePauseStartTime = 0;
    let lastUserInteractionTime = 0;

    // ---------- 画布 ----------
    const bgCanvas = document.getElementById('backgroundCanvas');
    const bgCtx = bgCanvas.getContext('2d');
    const canvas = document.getElementById('waterCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const textCanvas = document.getElementById('textCanvas');
    const textCtx = textCanvas.getContext('2d');

    const BackgroundManager = window.BackgroundManager;

    let offscreenTextCanvas, offscreenTextCtx, textImageData;

    // ---------- 水波擦除接口 ----------
    window.waterEraser = {
        active: false,
        centerX: 0,
        centerY: 0,
        radius: 0,
        maxRadius: 0
    };

    // ---------- 尺寸调整 ----------
    function resizeCanvas() {
        const displayWidth = Math.floor(window.innerWidth * RENDER_SCALE);
        const displayHeight = Math.floor(window.innerHeight * RENDER_SCALE);

        bgCanvas.width = displayWidth;
        bgCanvas.height = displayHeight;
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        textCanvas.width = displayWidth;
        textCanvas.height = displayHeight;

        BackgroundManager.init(displayWidth, displayHeight);

        simWidth = Math.max(2, Math.floor(canvas.width * SIM_SCALE));
        simHeight = Math.max(2, Math.floor(canvas.height * SIM_SCALE));
        cellSizeX = canvas.width / simWidth;
        cellSizeY = canvas.height / simHeight;

        heightCurr = new Float32Array(simWidth * simHeight);
        heightPrev = new Float32Array(simWidth * simHeight);
        gradXField = new Float32Array(simWidth * simHeight);
        gradYField = new Float32Array(simWidth * simHeight);

        recentPoints = [];
        lastMousePos = null;
        lastMoveTime = 0;
        lastEventTime = 0;
        isContinuous = false;
        smoothedSpeed = 0;
        continuousExitTimer = 0;
        continuousTrailLength = 0;
        lastVelocityX = 0; lastVelocityY = 0;
        hasLastVelocity = false;
        vortexQueue = [];
        frameCount = 0;
        pendingMouseEvent = null;
        pendingTouchEvent = null;
        lastUserInteractionTime = 0;

        initTextCanvas();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ---------- 文字离屏画布初始化 ----------
    function initTextCanvas() {
        offscreenTextCanvas = document.createElement('canvas');
        offscreenTextCanvas.width = canvas.width;
        offscreenTextCanvas.height = canvas.height;
        offscreenTextCtx = offscreenTextCanvas.getContext('2d');
        textImageData = null;

        const layer = TEXT_LAYERS[0];
        const font = layer.font;
        const fontSize = layer.fontSize;
        clipHeight1 = fontSize * 1.2;

        offscreenTextCtx.font = font;
        totalTextWidth = offscreenTextCtx.measureText(layer.text).width;
        const xCenter = layer.xRatio * offscreenTextCanvas.width;
        const yCenter = layer.yRatio * offscreenTextCanvas.height;
        textStartX = xCenter - totalTextWidth / 2;

        charInfos = [];
        let cumulativeWidth = 0;
        const chars = layer.text.split('');
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const charWidth = offscreenTextCtx.measureText(char).width;
            const centerX = textStartX + cumulativeWidth + charWidth / 2;
            const baseY = yCenter;

            // 随机振幅比例（130%-160%）
            const amplitudeRatio = AMPLITUDE_MIN + Math.random() * (AMPLITUDE_MAX - AMPLITUDE_MIN);
            const amplitude = amplitudeRatio * fontSize;

            // 初始偏移方向：右上50°（y轴向下，负角度表示向上）
            const angle = -ENTRANCE_ANGLE;
            const offsetX = Math.cos(angle) * amplitude;
            const offsetY = Math.sin(angle) * amplitude; // 负值向上

            // 确保初始位置在画布内（留边距）
            const margin = 50;
            let adjustedOffsetX = offsetX;
            let adjustedOffsetY = offsetY;
            const initialX = centerX + offsetX;
            const initialY = baseY + offsetY;
            if (initialX < margin || initialX > offscreenTextCanvas.width - margin) {
                adjustedOffsetX *= Math.min(1, (offscreenTextCanvas.width - margin - centerX) / Math.abs(offsetX));
            }
            if (initialY < margin || initialY > offscreenTextCanvas.height - margin) {
                const availableUp = baseY - margin;
                const availableDown = offscreenTextCanvas.height - margin - baseY;
                if (offsetY < 0 && Math.abs(offsetY) > availableUp) {
                    adjustedOffsetY = -availableUp * 0.8;
                } else if (offsetY > 0 && offsetY > availableDown) {
                    adjustedOffsetY = availableDown * 0.8;
                }
            }

            // 随机初始旋转和缩放
            const initialRotation = (Math.random() > 0.5 ? 1 : -1) * ROTATION_AMPLITUDE * Math.random();
            const initialScale = 1 + (Math.random() > 0.5 ? 1 : -1) * SCALE_VARIATION * Math.random();

            // 曲线控制点（形成弧线轨迹）
            const curveControlX = centerX + (adjustedOffsetX * 0.6);
            const curveControlY = baseY + adjustedOffsetY - amplitude * CURVE_HEIGHT_RATIO;

            charInfos.push({
                char,
                centerX,
                baseY,
                width: charWidth,
                delay: i * STAGGER_DELAY,
                duration: ENTRANCE_DURATION,
                offsetX: adjustedOffsetX,
                offsetY: adjustedOffsetY,
                initialRotation,
                initialScale,
                curveControlX,
                curveControlY,
                amplitude,
            });
            cumulativeWidth += charWidth;
        }
    }

    // ---------- 曲线运动和振荡计算 ----------
    function applyCurveAndOscillation(t, info) {
        t = Math.max(0, Math.min(1, t));
        const {
            offsetX, offsetY, curveControlX, curveControlY,
            initialRotation, initialScale, amplitude
        } = info;

        const curveDuration = 0.4; // 前40%时间完成主要曲线运动
        let currentOffsetX, currentOffsetY, currentRotation, currentScale;

        if (t <= curveDuration) {
            const u = t / curveDuration;
            const invU = 1 - u;
            // 二次贝塞尔曲线
            const bezierX = invU * invU * offsetX + 2 * invU * u * curveControlX + u * u * 0;
            const bezierY = invU * invU * offsetY + 2 * invU * u * curveControlY + u * u * 0;
            currentOffsetX = bezierX;
            currentOffsetY = bezierY;
            currentRotation = initialRotation * (1 - u);
            currentScale = 1 + (initialScale - 1) * (1 - u);
        } else {
            const u = (t - curveDuration) / (1 - curveDuration);
            // 衰减正弦振荡
            const oscillation = Math.sin(u * OSCILLATION_COUNT * Math.PI * 2) * Math.exp(-OSCILLATION_DECAY * u);
            currentOffsetX = 0;
            currentOffsetY = oscillation * amplitude * 0.3; // 振荡幅度为原振幅的30%
            currentRotation = oscillation * 0.05;           // 轻微旋转
            currentScale = 1 + oscillation * 0.03;          // 轻微缩放
        }

        return { currentOffsetX, currentOffsetY, currentRotation, currentScale };
    }

    // ---------- 绘制文字 ----------
    function updateTextCanvas(elapsed) {
        offscreenTextCtx.clearRect(0, 0, offscreenTextCanvas.width, offscreenTextCanvas.height);

        // === 第一组：字母从右上曲线弹入并振荡 ===
        const layer1 = TEXT_LAYERS[0];

        // 创建整体渐变
        const gradFill = offscreenTextCtx.createLinearGradient(
            textStartX, 0, textStartX + totalTextWidth, 0
        );
        gradFill.addColorStop(0, layer1.fillGradientColors[0]);
        gradFill.addColorStop(0.5, layer1.fillGradientColors[1]);
        gradFill.addColorStop(1, layer1.fillGradientColors[2]);

        const gradStroke = offscreenTextCtx.createLinearGradient(
            textStartX, 0, textStartX + totalTextWidth, 0
        );
        gradStroke.addColorStop(0, layer1.strokeGradientColors[0]);
        gradStroke.addColorStop(0.5, layer1.strokeGradientColors[1]);
        gradStroke.addColorStop(1, layer1.strokeGradientColors[2]);

        for (let i = 0; i < charInfos.length; i++) {
            const info = charInfos[i];
            const { char, centerX, baseY, delay, duration } = info;

            const localTime = (elapsed - delay) / duration;
            const t = Math.max(0, Math.min(1, localTime));
            if (t <= 0) continue;

            // 获取曲线+振荡后的状态
            const { currentOffsetX, currentOffsetY, currentRotation, currentScale } = applyCurveAndOscillation(t, info);

            // 透明度快速淡入
            const alpha = Math.min(1, t * 5);

            offscreenTextCtx.save();
            offscreenTextCtx.font = layer1.font;
            offscreenTextCtx.textAlign = 'center';
            offscreenTextCtx.textBaseline = 'middle';
            offscreenTextCtx.globalAlpha = alpha;
            offscreenTextCtx.shadowColor = layer1.shadowColor;
            offscreenTextCtx.shadowBlur = layer1.shadowBlur;
            const baseShadowOffset = layer1.fontSize * 0.05;
            offscreenTextCtx.shadowOffsetX = baseShadowOffset + currentOffsetX * 0.1;
            offscreenTextCtx.shadowOffsetY = baseShadowOffset + currentOffsetY * 0.15;
            offscreenTextCtx.fillStyle = gradFill;
            offscreenTextCtx.strokeStyle = gradStroke;
            offscreenTextCtx.lineWidth = layer1.lineWidth;
            offscreenTextCtx.lineJoin = 'round';

            // 变换：先平移到偏移位置，再旋转缩放
            offscreenTextCtx.translate(centerX + currentOffsetX, baseY + currentOffsetY);
            offscreenTextCtx.rotate(currentRotation);
            offscreenTextCtx.scale(currentScale, currentScale);
            offscreenTextCtx.translate(-centerX, -baseY);

            offscreenTextCtx.strokeText(char, centerX, baseY);
            offscreenTextCtx.fillText(char, centerX, baseY);

            offscreenTextCtx.restore();
        }

        // === 第二组：打字机效果 ===
        const layer2 = TEXT_LAYERS[1];
        const fullText2 = layer2.text;
        const visibleChars = Math.floor(fullText2.length * text2Progress);
        const displayText2 = fullText2.substring(0, visibleChars);

        offscreenTextCtx.save();
        offscreenTextCtx.font = layer2.font;
        offscreenTextCtx.textAlign = layer2.align;
        offscreenTextCtx.textBaseline = layer2.baseline;
        if (layer2.shadowColor) {
            offscreenTextCtx.shadowColor = layer2.shadowColor;
            offscreenTextCtx.shadowBlur = layer2.shadowBlur;
        }
        offscreenTextCtx.fillStyle = layer2.color;
        const x2 = layer2.xRatio * offscreenTextCanvas.width;
        const y2 = layer2.yRatio * offscreenTextCanvas.height;
        offscreenTextCtx.fillText(displayText2, x2, y2);
        offscreenTextCtx.restore();

        textImageData = offscreenTextCtx.getImageData(0, 0, offscreenTextCanvas.width, offscreenTextCanvas.height);
    }

    // ---------- 高光查找表 ----------
    const SPECULAR_LUT_SIZE = 1024;
    const specularLUT = new Float32Array(SPECULAR_LUT_SIZE);
    for (let i = 0; i < SPECULAR_LUT_SIZE; i++) {
        const dot = i / (SPECULAR_LUT_SIZE - 1);
        specularLUT[i] = Math.pow(dot, 30.0) * 0.4;
    }

    // ---------- 扰动函数 ----------
    function addDisturbance(screenX, screenY, strength, isEllipse = false, rx = 1, ry = 1, customRadius = null) {
        const gx = screenX / cellSizeX;
        const gy = screenY / cellSizeY;
        const radius = Math.max(2, Math.floor((customRadius || RIPPLE_RADIUS) / cellSizeX));
        const radiusSq = radius * radius;
        const startX = Math.max(0, Math.floor(gx - radius));
        const endX = Math.min(simWidth - 1, Math.floor(gx + radius));
        const startY = Math.max(0, Math.floor(gy - radius));
        const endY = Math.min(simHeight - 1, Math.floor(gy + radius));

        for (let py = startY; py <= endY; py++) {
            for (let px = startX; px <= endX; px++) {
                const dx = px - gx;
                const dy = py - gy;
                let normDx = dx, normDy = dy;
                if (isEllipse) {
                    normDx = dx / (rx || 1);
                    normDy = dy / (ry || 1);
                }
                const distSq = normDx * normDx + normDy * normDy;
                if (distSq <= radiusSq) {
                    const dist = Math.sqrt(distSq);
                    const t = 1 - dist / radius;
                    const falloff = t * t * t;
                    const idx = py * simWidth + px;
                    const randomPhase = 1.0 + (Math.random() - 0.5) * RANDOM_PHASE;
                    const pressure = falloff * strength * randomPhase;
                    heightCurr[idx] += pressure;
                    heightPrev[idx] += pressure * 0.8;
                }
            }
        }
    }

    function addSingleRipple(x, y) {
        addDisturbance(x, y, SINGLE_RIPPLE_STRENGTH);
    }

    function addClickShockwave(x, y) {
        addDisturbance(x, y, CLICK_RIPPLE_STRENGTH);
        addDisturbance(x, y, CLICK_RIPPLE_STRENGTH * 0.4, false, 1.3, 1.3);
    }

    // ---------- 连续波纹生成 ----------
    function addRippleLine(p1, p2, strength, baseRadius) {
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const step = 0.3;
        const steps = Math.max(1, Math.floor(dist / step));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = p1.x + (p2.x - p1.x) * t;
            const y = p1.y + (p2.y - p1.y) * t;
            const growthFactor = Math.pow(continuousTrailLength * WIDTH_GROWTH_RATE, 0.7);
            const dynamicRadius = Math.min(baseRadius + growthFactor * 5, MAX_RIPPLE_RADIUS);
            addDisturbance(x, y, strength, false, 1, 1, dynamicRadius);
            continuousTrailLength += step;
        }
    }

    function addRippleCurveSegment(p0, p1, p2, p3, strength, baseRadius) {
        const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const step = 0.3;
        const steps = Math.max(1, Math.floor(segDist / step));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const t2 = t * t;
            const t3 = t2 * t;
            const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
            const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
            const growthFactor = Math.pow(continuousTrailLength * WIDTH_GROWTH_RATE, 0.7);
            const dynamicRadius = Math.min(baseRadius + growthFactor * 5, MAX_RIPPLE_RADIUS);
            addDisturbance(x, y, strength, false, 1, 1, dynamicRadius);
            continuousTrailLength += step;
        }
    }

    // ---------- 涡流处理 ----------
    function createVortex(x, y, direction, radius, steps, strength, interval) {
        vortexQueue.push({
            cx: x, cy: y, dir: direction, radius, steps,
            currentStep: 0, strength, interval, frameCounter: 0, active: true
        });
    }

    function processVortexQueue() {
        for (let i = vortexQueue.length - 1; i >= 0; i--) {
            const v = vortexQueue[i];
            if (!v.active) {
                vortexQueue.splice(i, 1);
                continue;
            }
            if (frameCount % v.interval === 0) {
                const jitter = (Math.random() - 0.5) * 0.5;
                const angle = (v.currentStep / v.steps) * Math.PI * 2 * v.dir + jitter;
                const x = v.cx + Math.cos(angle) * v.radius;
                const y = v.cy + Math.sin(angle) * v.radius;
                const fade = 1 - v.currentStep / v.steps;
                addDisturbance(x, y, v.strength * fade);
                v.currentStep++;
                if (v.currentStep >= v.steps) v.active = false;
            }
        }
    }

    // ---------- 事件处理 ----------
    function isWaterVisible() {
        return window.scrollY < window.innerHeight;
    }

    function handleMove(x, y, time) {
		if (!interactionEnabled) return;
        if (!isWaterVisible()) return;
        lastUserInteractionTime = time;

        const canvasX = x * (canvas.width / window.innerWidth);
        const canvasY = y * (canvas.height / window.innerHeight);
        const currentTime = time;

        if (lastMousePos) {
            recentPoints.push({ x: canvasX, y: canvasY, time: currentTime });
            if (recentPoints.length > 4) recentPoints.shift();
        } else {
            recentPoints = [{ x: canvasX, y: canvasY, time: currentTime }];
        }

        let speed = 0;
        let vx = 0, vy = 0;
        if (lastMousePos && lastMoveTime > 0) {
            const dt = currentTime - lastMoveTime;
            if (dt > 0) {
                const dist = Math.hypot(canvasX - lastMousePos.x, canvasY - lastMousePos.y);
                speed = dist / dt;
                vx = (canvasX - lastMousePos.x) / dt;
                vy = (canvasY - lastMousePos.y) / dt;
            }
        }
        smoothedSpeed = SPEED_EMA_ALPHA * speed + (1 - SPEED_EMA_ALPHA) * smoothedSpeed;
        const speedFactor = Math.min(1, smoothedSpeed / HIGH_SPEED_THRESHOLD);

        const dynamicAngleThreshold = VORTEX_TRIGGER_ANGLE * (1 - 0.3 * speedFactor);
        if (hasLastVelocity && speed > VORTEX_MIN_SPEED) {
            const dot = lastVelocityX * vx + lastVelocityY * vy;
            const mag1 = Math.hypot(lastVelocityX, lastVelocityY);
            const mag2 = Math.hypot(vx, vy);
            if (mag1 > 0 && mag2 > 0) {
                const cosAngle = dot / (mag1 * mag2);
                const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
                if (angle > dynamicAngleThreshold) {
                    const cross = lastVelocityX * vy - lastVelocityY * vx;
                    const dir = cross >= 0 ? 1 : -1;
                    const vortexRadius = VORTEX_RADIUS * (0.5 + speedFactor * 1.5);
                    const vortexSteps = Math.floor(VORTEX_STEPS * (0.8 + speedFactor * 1.2));
                    const vortexStrength = VORTEX_STRENGTH * (0.5 + speedFactor * 1.5);
                    const vortexInterval = Math.max(1, VORTEX_INTERVAL_FRAMES - Math.floor(speedFactor * 2));
                    createVortex(canvasX, canvasY, dir, vortexRadius, vortexSteps, vortexStrength, vortexInterval);
                }
            }
        }

        lastVelocityX = vx;
        lastVelocityY = vy;
        hasLastVelocity = true;

        if (!isContinuous) {
            if (smoothedSpeed > HIGH_SPEED_THRESHOLD && (currentTime - lastEventTime) < PAUSE_THRESHOLD) {
                isContinuous = true;
                continuousExitTimer = 0;
                continuousTrailLength = 0;
            } else {
                addSingleRipple(canvasX, canvasY);
            }
        } else {
            if (smoothedSpeed < LOW_SPEED_THRESHOLD || (currentTime - lastEventTime) > PAUSE_THRESHOLD) {
                continuousExitTimer += (currentTime - lastEventTime);
                if (continuousExitTimer > EXIT_DELAY) {
                    isContinuous = false;
                    continuousExitTimer = 0;
                    addSingleRipple(canvasX, canvasY);
                }
            } else {
                continuousExitTimer = 0;
            }
        }

        if (isContinuous) {
            const strength = CONTINUOUS_STRENGTH_MIN + (CONTINUOUS_STRENGTH_MAX - CONTINUOUS_STRENGTH_MIN) * speedFactor;
            const baseRadius = RIPPLE_RADIUS * (0.2 + speedFactor * 0.8);

            if (recentPoints.length >= 3) {
                const points = recentPoints.slice(-4);
                while (points.length < 4) points.unshift(points[0]);
                addRippleCurveSegment(points[0], points[1], points[2], points[3], strength, baseRadius);
            } else if (recentPoints.length === 2) {
                addRippleLine(recentPoints[0], recentPoints[1], strength, baseRadius);
            } else {
                addDisturbance(canvasX, canvasY, strength, false, 1, 1, baseRadius);
            }
        }

        lastMousePos = { x: canvasX, y: canvasY };
        lastMoveTime = currentTime;
        lastEventTime = currentTime;
    }

    document.addEventListener('mousemove', (e) => {
        if (!isWaterVisible()) return;
        if (window.transitionPauseWater) return;
        pendingMouseEvent = { x: e.clientX, y: e.clientY, time: e.timeStamp || Date.now() };
    });

    document.addEventListener('click', (e) => {
        if (!isWaterVisible()) return;
        if (window.transitionPauseWater) return;
		if (!interactionEnabled) return;
        const canvasX = e.clientX * (canvas.width / window.innerWidth);
        const canvasY = e.clientY * (canvas.height / window.innerHeight);
        addClickShockwave(canvasX, canvasY);
        lastUserInteractionTime = e.timeStamp || Date.now();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isWaterVisible()) return;
        if (window.transitionPauseWater) return;
		if (!interactionEnabled) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
            pendingTouchEvent = { x: touch.clientX, y: touch.clientY, time: Date.now() };
        }
    }, { passive: false });

    document.addEventListener('touchstart', (e) => {
        if (!isWaterVisible()) return;
        if (window.transitionPauseWater) return;
		if (!interactionEnabled) return;
        const touch = e.touches[0];
        if (touch) {
            const canvasX = touch.clientX * (canvas.width / window.innerWidth);
            const canvasY = touch.clientY * (canvas.height / window.innerHeight);
            addClickShockwave(canvasX, canvasY);
            lastUserInteractionTime = Date.now();
        }
    }, { passive: false });

    function resetInteraction() {
        recentPoints = [];
        lastMousePos = null;
        lastMoveTime = 0;
        lastEventTime = 0;
        isContinuous = false;
        smoothedSpeed = 0;
        continuousExitTimer = 0;
        continuousTrailLength = 0;
        hasLastVelocity = false;
        lastVelocityX = 0; lastVelocityY = 0;
        pendingMouseEvent = null;
        pendingTouchEvent = null;
    }
    document.addEventListener('mouseleave', resetInteraction);
    document.addEventListener('touchend', resetInteraction);

    // ---------- 物理更新 ----------
    function updateSimulation() {
        const w = simWidth;
        const h = simHeight;
        const temp = heightPrev;
        heightPrev = heightCurr;
        heightCurr = temp;

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const left = heightPrev[idx - 1];
                const right = heightPrev[idx + 1];
                const up = heightPrev[idx - w];
                const down = heightPrev[idx + w];
                let newHeight = (left + right + up + down) / 2 - heightCurr[idx];
                newHeight *= DAMPING;
                heightCurr[idx] = newHeight;
            }
        }

        for (let x = 0; x < w; x++) {
            heightCurr[x] = heightPrev[w + x];
            heightCurr[(h - 1) * w + x] = heightPrev[(h - 2) * w + x];
        }
        for (let y = 0; y < h; y++) {
            heightCurr[y * w] = heightPrev[y * w + 1];
            heightCurr[y * w + (w - 1)] = heightPrev[y * w + (w - 2)];
        }
    }

    // ---------- 渲染 ----------
    function renderWater() {
        const imageData = BackgroundManager.getImageData();
        const srcData = imageData.data;
        const outputData = ctx.createImageData(canvas.width, canvas.height);
        const dstData = outputData.data;
        const src32 = new Uint32Array(srcData.buffer);
        const dst32 = new Uint32Array(dstData.buffer);

        for (let y = 0; y < simHeight; y++) {
            for (let x = 0; x < simWidth; x++) {
                const idx = y * simWidth + x;
                const left = (x > 0) ? idx - 1 : idx;
                const right = (x < simWidth - 1) ? idx + 1 : idx;
                const up = (y > 0) ? idx - simWidth : idx;
                const down = (y < simHeight - 1) ? idx + simWidth : idx;
                gradXField[idx] = (heightCurr[right] - heightCurr[left]) * 0.5;
                gradYField[idx] = (heightCurr[down] - heightCurr[up]) * 0.5;
            }
        }

        const lightX = -0.3, lightY = 0.9, lightZ = 0.3;
        const diffuseStrength = 0.15;
        const lightScale = 200;
        const width = canvas.width;
        const height = canvas.height;
        const cellSizeXLocal = cellSizeX;
        const cellSizeYLocal = cellSizeY;
        const simWidthLocal = simWidth;

        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const gx = px / cellSizeXLocal;
                const gy = py / cellSizeYLocal;
                const i = Math.floor(gx);
                const j = Math.floor(gy);
                const fx = gx - i;
                const fy = gy - j;

                const i0 = Math.max(0, Math.min(simWidthLocal - 1, i));
                const j0 = Math.max(0, Math.min(simHeight - 1, j));
                const i1 = Math.min(simWidthLocal - 1, i0 + 1);
                const j1 = Math.min(simHeight - 1, j0 + 1);

                const idx00 = j0 * simWidthLocal + i0;
                const idx10 = j0 * simWidthLocal + i1;
                const idx01 = j1 * simWidthLocal + i0;
                const idx11 = j1 * simWidthLocal + i1;

                const gradX = (gradXField[idx00] * (1 - fx) + gradXField[idx10] * fx) * (1 - fy) +
                              (gradXField[idx01] * (1 - fx) + gradXField[idx11] * fx) * fy;
                const gradY = (gradYField[idx00] * (1 - fx) + gradYField[idx10] * fx) * (1 - fy) +
                              (gradYField[idx01] * (1 - fx) + gradYField[idx11] * fx) * fy;

                const offsetX = gradX * REFRACTION_STRENGTH;
                const offsetY = gradY * REFRACTION_STRENGTH;

                let sx = px + offsetX;
                let sy = py + offsetY;
                sx = Math.max(0, Math.min(width - 1, sx));
                sy = Math.max(0, Math.min(height - 1, sy));

                const sampleX = Math.floor(sx);
                const sampleY = Math.floor(sy);
                const sampleIdx = sampleY * width + sampleX;

                const srcPixel = src32[sampleIdx];
                const r = srcPixel & 0xff;
                const g = (srcPixel >> 8) & 0xff;
                const b = (srcPixel >> 16) & 0xff;

                const nx = -gradX * 2.0;
                const ny = 0.5;
                const nz = -gradY * 2.0;
                const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                const dot = Math.max(0, (nx * lightX + ny * lightY + nz * lightZ) * invLen);

                const lutIndex = Math.min(SPECULAR_LUT_SIZE - 1, Math.floor(dot * (SPECULAR_LUT_SIZE - 1)));
                const specular = specularLUT[lutIndex];
                const diffuse = dot * diffuseStrength;
                const light = (diffuse + specular) * lightScale;

                const newR = Math.min(255, r + light);
                const newG = Math.min(255, g + light);
                const newB = Math.min(255, b + light);
                const dstIdx = py * width + px;
                dst32[dstIdx] = (0xff << 24) | (newB << 16) | (newG << 8) | newR;
            }
        }
        ctx.putImageData(outputData, 0, 0);

        // 应用水波擦除（转场时）
        applyWaterEraser();
    }

    // ---------- 水波擦除函数 ----------
    function applyWaterEraser() {
        if (!window.waterEraser || !window.waterEraser.active) return;
        const eraser = window.waterEraser;
        const eraserCtx = ctx;
        eraserCtx.save();
        eraserCtx.globalCompositeOperation = 'destination-out';
        // 绘制不规则擦除形状（使用水波高度场调制）
        const points = 360;
        const angleStep = (Math.PI * 2) / points;
        const baseR = eraser.radius;
        const cellX = cellSizeX;
        const cellY = cellSizeY;
        const simW = simWidth;
        const simH = simHeight;
        const heightField = heightCurr;

        if (baseR < 20) {
            eraserCtx.beginPath();
            eraserCtx.arc(eraser.centerX, eraser.centerY, baseR, 0, Math.PI * 2);
            eraserCtx.fillStyle = 'rgba(215,236,246,0.6)';
            eraserCtx.fill();
            eraserCtx.restore();
            return;
        }

        eraserCtx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = i * angleStep;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            let px = eraser.centerX + cosA * baseR;
            let py = eraser.centerY + sinA * baseR;

            const gx = px / cellX;
            const gy = py / cellY;
            const ix = Math.max(0, Math.min(simW - 1, Math.floor(gx)));
            const iy = Math.max(0, Math.min(simH - 1, Math.floor(gy)));
            const idx = iy * simW + ix;
            const waveHeight = heightField[idx] || 0;

            const waveModulation = waveHeight * 1.5 * (1 - baseR / eraser.maxRadius);
            const ripple1 = Math.sin(angle * 6 + baseR * 0.1) * baseR * 0.06;
            const ripple2 = Math.cos(angle * 13 - baseR * 0.05) * baseR * 0.04;
            const ripple3 = Math.sin(angle * 2.5 + baseR * 0.15) * baseR * 0.03;

            let modulation = waveModulation + ripple1 + ripple2 + ripple3;
            modulation = Math.max(-baseR * 0.3, Math.min(baseR * 0.3, modulation));
            const r = baseR + modulation;

            px = eraser.centerX + cosA * r;
            py = eraser.centerY + sinA * r;

            if (i === 0) eraserCtx.moveTo(px, py);
            else eraserCtx.lineTo(px, py);
        }
        eraserCtx.closePath();
        eraserCtx.fillStyle = 'rgba(0,0,0,1)';
        eraserCtx.fill();
        eraserCtx.restore();
    }

    // ---------- 扭曲文字渲染 ----------
    function renderDistortedText() {
        if (!textImageData) return;
        const srcData = textImageData.data;
        const outputData = textCtx.createImageData(canvas.width, canvas.height);
        const dstData = outputData.data;
        const src32 = new Uint32Array(srcData.buffer);
        const dst32 = new Uint32Array(dstData.buffer);

        const width = canvas.width;
        const height = canvas.height;
        const cellSizeXLocal = cellSizeX;
        const cellSizeYLocal = cellSizeY;
        const simWidthLocal = simWidth;

        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const gx = px / cellSizeXLocal;
                const gy = py / cellSizeYLocal;
                const i = Math.floor(gx);
                const j = Math.floor(gy);
                const fx = gx - i;
                const fy = gy - j;

                const i0 = Math.max(0, Math.min(simWidthLocal - 1, i));
                const j0 = Math.max(0, Math.min(simHeight - 1, j));
                const i1 = Math.min(simWidthLocal - 1, i0 + 1);
                const j1 = Math.min(simHeight - 1, j0 + 1);

                const idx00 = j0 * simWidthLocal + i0;
                const idx10 = j0 * simWidthLocal + i1;
                const idx01 = j1 * simWidthLocal + i0;
                const idx11 = j1 * simWidthLocal + i1;

                const gradX = (gradXField[idx00] * (1 - fx) + gradXField[idx10] * fx) * (1 - fy) +
                              (gradXField[idx01] * (1 - fx) + gradXField[idx11] * fx) * fy;
                const gradY = (gradYField[idx00] * (1 - fx) + gradYField[idx10] * fx) * (1 - fy) +
                              (gradYField[idx01] * (1 - fx) + gradYField[idx11] * fx) * fy;

                const offsetX = gradX * REFRACTION_STRENGTH;
                const offsetY = gradY * REFRACTION_STRENGTH;

                let sx = px + offsetX;
                let sy = py + offsetY;
                sx = Math.max(0, Math.min(width - 1, sx));
                sy = Math.max(0, Math.min(height - 1, sy));

                const sampleX = Math.floor(sx);
                const sampleY = Math.floor(sy);
                const srcIdx = sampleY * width + sampleX;
                const dstIdx = py * width + px;
                dst32[dstIdx] = src32[srcIdx];
            }
        }
        textCtx.putImageData(outputData, 0, 0);
    }

    // ---------- 主循环 ----------
    function animate(timestamp) {
        BackgroundManager.update(timestamp);
        BackgroundManager.drawToContext(bgCtx);

        if (isWaterVisible()) {
            if (pendingMouseEvent) {
                const evt = pendingMouseEvent;
                pendingMouseEvent = null;
                handleMove(evt.x, evt.y, evt.time);
            } else if (pendingTouchEvent) {
                const evt = pendingTouchEvent;
                pendingTouchEvent = null;
                handleMove(evt.x, evt.y, evt.time);
            }

            frameCount++;
            processVortexQueue();

            simFrameSkip++;
            if (simFrameSkip >= SIM_UPDATE_INTERVAL) {
                simFrameSkip = 0;
                updateSimulation();
            }

            renderWater();

            // 转场期间暂停文字渲染
            if (!window.transitionPauseWater) {
                // === 更新文字动画进度 ===
                if (textRevealStartTime === 0) {
                    textRevealStartTime = timestamp;
                    typewriterStartTime = timestamp;
                    waveStartTime = timestamp;
                }

                // 检测用户交互暂停动画
                const interactionPauseWindow = 200;
                if (timestamp - lastUserInteractionTime < interactionPauseWindow) {
                    if (!wavePaused) {
                        wavePaused = true;
                        wavePauseStartTime = timestamp;
                    }
                } else {
                    if (wavePaused) {
                        wavePaused = false;
                        waveAccumulatedPause += (timestamp - wavePauseStartTime);
                    }
                }

                let waveElapsed = 0;
                if (wavePaused) {
                    waveElapsed = Math.max(0, wavePauseStartTime - waveStartTime - waveAccumulatedPause);
                } else {
                    waveElapsed = Math.max(0, timestamp - waveStartTime - waveAccumulatedPause);
                }
                text1Progress = Math.min(1, waveElapsed / TOTAL_ANIMATION_DURATION);
				
                text2Progress = Math.min(1, (timestamp - typewriterStartTime) / TYPEWRITER_DURATION);
                updateTextCanvas(waveElapsed);
				if (!interactionEnabled && text1Progress >= 1 && text2Progress >= 1) {
    				interactionEnabled = true;
				}
                renderDistortedText();
            } else {
                // 转场期间清除文字画布
                textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
            }
        }

        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // 暴露水波变量供转场使用
    window.waterSim = {
        get heightCurr() { return heightCurr; },
        get cellSizeX() { return cellSizeX; },
        get cellSizeY() { return cellSizeY; },
        get simWidth() { return simWidth; },
        get simHeight() { return simHeight; }
    };
})();