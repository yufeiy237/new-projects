// JavaScript Document
const BackgroundManager = (function() {
    // 离屏画布，用于生成背景图像
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

    // 背景更新间隔（毫秒）
    const BG_UPDATE_INTERVAL = 300;
    let animationProgress = 0;
    let lastBgUpdate = 0;

    // 底层图片
    const backgroundImage = new Image();
    backgroundImage.src = 'citrus.jpg'; // 确保图片与HTML同目录
    let imageLoaded = false;
    backgroundImage.onload = () => {
        imageLoaded = true;
        lastBgUpdate = 0; // 立即重绘
        drawBackground();
    };
    backgroundImage.onerror = () => {
        console.warn('citrus.jpg 加载失败，使用纯色后备');
        imageLoaded = false;
    };

    // 渐变配置
    const gradientConfig = {
        baseColor: "rgba(171, 240, 255, 0.9)",
        layers: [
            { color: "rgba(75,192,200,0.9)", size: 130, posX: -70, posY: -80 },
            { color: "rgba(0,201,255,0.9)", size: 80, posX: 60, posY: -50 },
            { color: "rgba(199,121,208,0.9)", size: 90, posX: 10, posY: -10 },
            { color: "rgba(255,209,148,0.9)", size: 110, posX: -30, posY: -30 },
            { color: "rgba(146,254,157,0.9)", size: 90, posX: 50, posY: 30 }
        ],
        keyframes: {
            0:   { sizes: [130, 80, 90, 110, 90], posX: [-70, 60, 10, -30, 50], posY: [-80, -50, -10, -30, 30] },
            25:  { sizes: [100, 90, 100, 90, 60], posX: [-80, 50, 0, -40, 40], posY: [-90, -60, -20, -40, 20] },
            50:  { sizes: [80, 110, 80, 60, 80], posX: [-70, 60, 10, -30, 50], posY: [-95, -65, -25, -45, 25] },
            75:  { sizes: [100, 90, 100, 90, 60], posX: [-80, 50, 0, -40, 40], posY: [-90, -60, -20, -40, 20] },
            100: { sizes: [130, 80, 90, 110, 90], posX: [-70, 60, 10, -30, 50], posY: [-80, -50, -10, -30, 30] }
        }
    };

    function drawBackground() {
        try {
            const w = offscreen.width;
            const h = offscreen.height;
            if (w === 0 || h === 0) return;

            offCtx.clearRect(0, 0, w, h);

            // 1. 底层图片（不透明）
            if (imageLoaded) {
                offCtx.drawImage(backgroundImage, 0, 0, w, h);
            } else {
                offCtx.fillStyle = '#1a1a1a';
                offCtx.fillRect(0, 0, w, h);
            }

            // 2. 半透明基色
            offCtx.fillStyle = gradientConfig.baseColor;
            offCtx.fillRect(0, 0, w, h);

            // 3. 插值动画
            const t = animationProgress;
            const keys = [0, 25, 50, 75, 100];
            const progressPercent = t * 100;
            let prevKey = 0, nextKey = 100, frac = 0;
            for (let i = 0; i < keys.length - 1; i++) {
                if (progressPercent >= keys[i] && progressPercent <= keys[i + 1]) {
                    prevKey = keys[i];
                    nextKey = keys[i + 1];
                    frac = (progressPercent - prevKey) / (nextKey - prevKey);
                    break;
                }
            }
            if (isNaN(frac)) frac = 0;

            const prevFrame = gradientConfig.keyframes[prevKey];
            const nextFrame = gradientConfig.keyframes[nextKey];
            const layerCount = gradientConfig.layers.length;

            // 4. 渐变光斑
            for (let i = 0; i < layerCount; i++) {
                const layer = gradientConfig.layers[i];
                const currentSize = prevFrame.sizes[i] + (nextFrame.sizes[i] - prevFrame.sizes[i]) * frac;
                const currentPosX = prevFrame.posX[i] + (nextFrame.posX[i] - prevFrame.posX[i]) * frac;
                const currentPosY = prevFrame.posY[i] + (nextFrame.posY[i] - prevFrame.posY[i]) * frac;

                const centerX = w * 0.5 + (currentPosX / 100) * w;
                const centerY = h * 0.5 + (currentPosY / 100) * h;
                const radius = (currentSize / 100) * Math.max(w, h) * 0.5;

                const match = layer.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (match) {
                    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
                    const gradient = offCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.75)`);
                    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                    offCtx.fillStyle = gradient;
                    offCtx.fillRect(0, 0, w, h);
                }
            }
        } catch (e) {
            console.error('Background draw error:', e);
        }
    }

    function init(width, height) {
        if (width === 0 || height === 0) {
            console.warn('BackgroundManager: invalid size', width, height);
            return;
        }
        offscreen.width = width;
        offscreen.height = height;
        lastBgUpdate = 0;
        drawBackground();
    }

    function update(timestamp) {
        animationProgress = (timestamp % 8000) / 8000;
        const now = performance.now();
        if (now - lastBgUpdate > BG_UPDATE_INTERVAL) {
            drawBackground();
            lastBgUpdate = now;
        }
    }

    function getImageData() {
        return offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    }

    // 将离屏画布绘制到指定上下文
    function drawToContext(context) {
        context.drawImage(offscreen, 0, 0);
    }

    return {
		init,
		update,
		getImageData,
		drawToContext,
		sampleColor(x, y) {
			x = Math.round(Math.max(0, Math.min(x, offscreen.width - 1)));
			y = Math.round(Math.max(0, Math.min(y, offscreen.height - 1)));
			const pixel = offCtx.getImageData(x, y, 1, 1).data;
			return { r: pixel[0], g: pixel[1], b: pixel[2] };
		}
	};
})();
// 暴露到全局
window.BackgroundManager = BackgroundManager;