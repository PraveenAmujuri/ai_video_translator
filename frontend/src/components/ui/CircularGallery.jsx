import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef } from 'react';

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
}

const DEFAULT_FONT = 'bold 30px Figtree';
// Figtree is not guaranteed to be available on the host page, so the component
// loads it on demand whenever the default font is used.
const DEFAULT_FONT_URL = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap';

function deriveFontFamilyFromUrl(url) {
  const fileName = (url.split('/').pop() || 'custom-font').split('?')[0];
  const base = fileName.replace(/\.(woff2?|ttf|otf|eot)$/i, '');
  return base.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'CircularGalleryFont';
}

async function loadFontFromStylesheet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch font stylesheet (${response.status})`);
  const cssText = await response.text();
  const faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
  let family = null;
  const fontFaces = [];
  for (const block of faceBlocks) {
    const familyMatch = block.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
    const urlMatch = block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (!familyMatch || !urlMatch) continue;
    family = familyMatch[1].trim();
    const descriptors = {};
    const weightMatch = block.match(/font-weight:\s*([^;]+);/);
    const styleMatch = block.match(/font-style:\s*([^;]+);/);
    const rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
    if (weightMatch) descriptors.weight = weightMatch[1].trim();
    if (styleMatch) descriptors.style = styleMatch[1].trim();
    if (rangeMatch) descriptors.unicodeRange = rangeMatch[1].trim();
    fontFaces.push(new FontFace(family, `url(${urlMatch[1]})`, descriptors));
  }
  if (!family) throw new Error('No @font-face rule found in the stylesheet');
  await Promise.allSettled(
    fontFaces.map(async face => {
      await face.load();
      document.fonts.add(face);
    })
  );
  return family;
}

async function loadFontFromFile(url) {
  const family = deriveFontFamilyFromUrl(url);
  const fontFace = new FontFace(family, `url(${url})`);
  await fontFace.load();
  document.fonts.add(fontFace);
  return family;
}

async function loadCustomFont(fontUrl) {
  const isStylesheet = fontUrl.includes('fonts.googleapis.com') || /\.css(\?.*)?$/i.test(fontUrl);
  return isStylesheet ? loadFontFromStylesheet(fontUrl) : loadFontFromFile(fontUrl);
}

// Loads `fontUrl` (a stylesheet such as a Google Fonts URL, or a direct font
// file) and returns a canvas-ready font string that keeps the size/weight from
// `font` but swaps in the freshly loaded family. Falls back to `font` on error.
async function resolveFont(font, fontUrl) {
  // Use the bundled Figtree stylesheet when the caller relies on the default
  // font, otherwise honor the explicit `fontUrl`.
  const effectiveUrl = fontUrl || (font === DEFAULT_FONT ? DEFAULT_FONT_URL : null);
  if (!effectiveUrl) {
    // A custom family was supplied without a URL – make sure it is ready (in
    // case the host page declares it) before we draw it to the canvas,
    // otherwise the first paint silently falls back to a system font.
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(font);
        await document.fonts.ready;
      } catch {
        // Ignore – fall back to whatever the browser provides.
      }
    }
    return font;
  }
  try {
    const family = await loadCustomFont(effectiveUrl);
    const sizeMatch = font.match(/^\s*(.*?\d+px)/);
    const prefix = sizeMatch ? sizeMatch[1].trim() : 'bold 30px';
    const resolved = `${prefix} "${family}"`;
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(resolved);
      } catch {
        // Ignore – we still attempt to render with the requested font.
      }
    }
    return resolved;
  } catch (error) {
    console.error('CircularGallery: unable to load font from', fontUrl, error);
    return font;
  }
}

function getFontSize(font) {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(gl, text, font = 'bold 30px monospace', color = 'black') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(getFontSize(font) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }
  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeight = this.plane.scale.y * 0.15;
    const textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font
  }) {
    this.extra = 0;
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }
  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: true
    });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        uniform float uHover;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          // Adjust image size calculation to consider the 350x450 single-card aspect ratio
          // since the texture contains both monochrome and colored sheets stacked vertically (350x900)
          vec2 imgSize = vec2(uImageSizes.x, uImageSizes.y * 0.5);
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (imgSize.x / imgSize.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (imgSize.y / imgSize.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          
          float clampedY = clamp(uv.y, 0.001, 0.999);
          // Top half (V: 0.5 to 1.0) corresponds to monochrome chrome card
          vec4 colorMono = texture2D(tMap, vec2(uv.x, clampedY * 0.5 + 0.5));
          // Bottom half (V: 0.0 to 0.5) corresponds to brand colored card
          vec4 colorColor = texture2D(tMap, vec2(uv.x, clampedY * 0.5));
          vec4 finalColor = mix(colorMono, colorColor, uHover);
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          
          // Smooth antialiasing for edges
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          
          gl_FragColor = vec4(finalColor.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
        uHover: { value: 0.0 }
      },
      transparent: true
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }
  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }
  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  }
  update(scroll, direction, mouseViewport, isMouseOver) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;
    const isMobile = this.screen.width < 768;
    const effectiveBend = isMobile ? this.bend * 0.4 : this.bend;

    if (effectiveBend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(effectiveBend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (effectiveBend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    // Calculate dynamic hover strength based on cursor distance
    let hoverTarget = 0.0;
    if (isMouseOver && mouseViewport) {
      const dx = this.plane.position.x - mouseViewport.x;
      const cardWidth = this.plane.scale.x;
      const dist = Math.abs(dx);
      
      // Affects the hovered card and fades smoothly into 2-3 adjacent cards
      const maxDist = cardWidth * 2.2;
      if (dist < maxDist) {
        hoverTarget = 1.0 - (dist / maxDist);
        hoverTarget = Math.pow(hoverTarget, 1.3);
      }
    }
    this.program.uniforms.uHover.value = lerp(this.program.uniforms.uHover.value, hoverTarget, 0.1);

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;

    while (this.plane.position.x + planeOffset < -viewportOffset) {
      this.extra -= this.widthTotal;
      this.plane.position.x += this.widthTotal;
    }
    while (this.plane.position.x - planeOffset > viewportOffset) {
      this.extra += this.widthTotal;
      this.plane.position.x -= this.widthTotal;
    }
  }
  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      if (this.plane.program.uniforms.uViewportSizes) {
        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
      }
    }
    this.extra = 0;
    const isMobile = this.screen.width < 768;
    if (isMobile) {
      this.plane.scale.x = this.viewport.width * 0.45;
      this.plane.scale.y = this.plane.scale.x * (450 / 350);
      this.padding = 0.6;
    } else {
      this.scale = this.screen.height / 1500;
      this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
      this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
      this.padding = 2;
    }
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  constructor(
    container,
    {
      items,
      bend,
      textColor = '#ffffff',
      borderRadius = 0,
      font = 'bold 30px Figtree',
      scrollSpeed = 2,
      scrollEase = 0.05,
      autoScrollSpeed = 0.05
    } = {}
  ) {
    document.documentElement.classList.remove('no-js');
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.autoScrollSpeed = autoScrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck, 200);
    
    // Mouse hover tracking
    this.mouse = { x: 0, y: 0 };
    this.mouseViewport = { x: -9999, y: -9999 };
    this.isMouseOver = false;

    this.isIntersecting = false;
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.setupIntersectionObserver();
    this.addEventListeners();
  }
  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }
  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }
  createScene() {
    this.scene = new Transform();
  }
  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
  }
  createMedias(items, bend = 1, textColor, borderRadius, font) {
    const defaultItems = [
      { image: `https://picsum.photos/seed/1/800/600?grayscale`, text: 'Bridge' },
      { image: `https://picsum.photos/seed/2/800/600?grayscale`, text: 'Desk Setup' },
      { image: `https://picsum.photos/seed/3/800/600?grayscale`, text: 'Waterfall' },
      { image: `https://picsum.photos/seed/4/800/600?grayscale`, text: 'Strawberries' },
      { image: `https://picsum.photos/seed/5/800/600?grayscale`, text: 'Deep Diving' },
      { image: `https://picsum.photos/seed/16/800/600?grayscale`, text: 'Train Track' },
      { image: `https://picsum.photos/seed/17/800/600?grayscale`, text: 'Santorini' },
      { image: `https://picsum.photos/seed/8/800/600?grayscale`, text: 'Blurry Lights' },
      { image: `https://picsum.photos/seed/9/800/600?grayscale`, text: 'New York' },
      { image: `https://picsum.photos/seed/10/800/600?grayscale`, text: 'Good Boy' },
      { image: `https://picsum.photos/seed/21/800/600?grayscale`, text: 'Coastline' },
      { image: `https://picsum.photos/seed/12/800/600?grayscale`, text: 'Palm Trees' }
    ];
    const galleryItems = items && items.length ? items : defaultItems;
    this.mediasImages = galleryItems.concat(galleryItems);
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font
      });
    });
  }
  onTouchDown(e) {
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches ? e.touches[0].clientX : e.clientX;
  }
  onTouchMove(e) {
    if (!this.isDown) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    if (e.touches && e.cancelable) {
      e.preventDefault();
    }
    const distance = (this.start - x) * (this.scrollSpeed * 0.015);
    this.scroll.target = this.scroll.position + distance;
  }
  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }
  onWheel(e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      this.scroll.target += e.deltaX * (this.scrollSpeed * 0.035);
      this.onCheckDebounce();
    }
  }

  onWindowScroll() {
    const currentScrollY = window.scrollY;
    if (this.lastWindowScrollY === undefined) {
      this.lastWindowScrollY = currentScrollY;
      return;
    }
    const diff = currentScrollY - this.lastWindowScrollY;
    this.lastWindowScrollY = currentScrollY;

    if (!this.isIntersecting) return;

    // Slide the carousel target slightly on page scroll (extremely smooth parallax effect)
    this.scroll.target += diff * (this.scrollSpeed * 0.015);
    this.onCheckDebounce();
  }
  onKeyDown(e) {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        this.scroll.target += this.scrollSpeed * 5;
        this.onCheckDebounce();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.scroll.target -= this.scrollSpeed * 5;
        this.onCheckDebounce();
        break;
      default:
        break;
    }
  }
  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }
  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    
    // Reset scroll values on resize to align cards correctly
    if (this.scroll) {
      this.scroll.current = 0;
      this.scroll.target = 0;
      this.scroll.last = 0;
    }

    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isIntersecting = entry.isIntersecting;
          if (this.isIntersecting) {
            if (!this.raf) {
              this.update();
            }
          } else {
            if (this.raf) {
              window.cancelAnimationFrame(this.raf);
              this.raf = null;
            }
          }
        });
      },
      { threshold: 0.05 }
    );
    this.observer.observe(this.container);
  }
  onMouseEnter() {
    this.isMouseOver = true;
  }
  onMouseLeave() {
    this.isMouseOver = false;
    this.mouseViewport = { x: -9999, y: -9999 };
  }
  onMouseMove(e) {
    this.isMouseOver = true;
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ndcX = (x / rect.width) * 2 - 1;
    const ndcY = -(y / rect.height) * 2 + 1;
    this.mouseViewport = {
      x: (ndcX * this.viewport.width) / 2,
      y: (ndcY * this.viewport.height) / 2
    };
  }
  update() {
    if (!this.isIntersecting) {
      this.raf = null;
      return;
    }
    if (!this.isDown && !this.isMouseOver) {
      this.scroll.target += this.autoScrollSpeed;
    }
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    if (this.medias) {
      this.medias.forEach(media => media.update(this.scroll, direction, this.mouseViewport, this.isMouseOver));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }
  addEventListeners() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnWindowScroll = this.onWindowScroll.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    
    this.boundOnMouseMoveHover = this.onMouseMove.bind(this);
    this.boundOnMouseEnter = this.onMouseEnter.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);

    window.addEventListener('resize', this.boundOnResize);
    window.addEventListener('scroll', this.boundOnWindowScroll);
    window.addEventListener('mousemove', this.boundOnTouchMove);
    window.addEventListener('mouseup', this.boundOnTouchUp);
    window.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundOnTouchUp);

    this.container?.addEventListener('mousedown', this.boundOnTouchDown);
    this.container?.addEventListener('touchstart', this.boundOnTouchDown);
    this.container?.addEventListener('keydown', this.boundOnKeyDown);
    this.container?.addEventListener('mousemove', this.boundOnMouseMoveHover);
    this.container?.addEventListener('mouseenter', this.boundOnMouseEnter);
    this.container?.addEventListener('mouseleave', this.boundOnMouseLeave);
    this.container?.addEventListener('wheel', this.boundOnWheel, { passive: false });
  }
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
    }
    window.removeEventListener('resize', this.boundOnResize);
    window.removeEventListener('scroll', this.boundOnWindowScroll);
    window.removeEventListener('mousemove', this.boundOnTouchMove);
    window.removeEventListener('mouseup', this.boundOnTouchUp);
    window.removeEventListener('touchmove', this.boundOnTouchMove);
    window.removeEventListener('touchend', this.boundOnTouchUp);

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }

    if (this.container) {
      this.container.removeEventListener('mousedown', this.boundOnTouchDown);
      this.container.removeEventListener('touchstart', this.boundOnTouchDown);
      this.container.removeEventListener('keydown', this.boundOnKeyDown);
      this.container.removeEventListener('mousemove', this.boundOnMouseMoveHover);
      this.container.removeEventListener('mouseenter', this.boundOnMouseEnter);
      this.container.removeEventListener('mouseleave', this.boundOnMouseLeave);
      this.container.removeEventListener('wheel', this.boundOnWheel);
    }
  }
}

export default function CircularGallery({
  items,
  bend = 3,
  textColor = '#ffffff',
  borderRadius = 0.05,
  font = 'bold 30px Figtree',
  fontUrl,
  scrollSpeed = 2,
  scrollEase = 0.05,
  autoScrollSpeed = 0.05
}) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    let app;
    let isMounted = true;
    resolveFont(font, fontUrl).then(resolvedFont => {
      if (!isMounted || !containerRef.current) return;
      app = new App(containerRef.current, {
        items,
        bend,
        textColor,
        borderRadius,
        font: resolvedFont,
        scrollSpeed,
        scrollEase,
        autoScrollSpeed
      });
    });
    return () => {
      isMounted = false;
      if (app) app.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, fontUrl, scrollSpeed, scrollEase, autoScrollSpeed]);
  return (
    <div
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      tabIndex={0}
      role="region"
      aria-label="Circular image gallery. Use Left and Right Arrow keys to navigate."
      ref={containerRef}
    />
  );
}
