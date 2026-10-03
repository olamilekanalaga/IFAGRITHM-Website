"use client";

// The IFAGRITHM mark rebuilt as a lit 3D object over an original GLSL
// backdrop. One painter owns the whole hero backdrop (fog and the background
// variants), so layers can never clash. The mark renders in the main bundle —
// no extra fetch — sits perfectly still on load, then spins up.
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SPIN_DELAY = 2.2;  // seconds the mark holds still on load
const CYCLE = 10.0;      // spin, settle back to the arranged pose, hold, repeat
const SPIN_LEN = 5.6;
const SETTLE_LEN = 1.8;
const SPIN_SPEED = 0.0085;

const FRAGMENT = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uVariant;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0; float a = 0.55;
    for(int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.04 + vec2(11.3, 7.9); a *= 0.52; }
    return v;
  }
  void main(){
    vec2 uv = vUv;
    vec2 p = uv * vec2(3.2, 1.9);
    float t = uTime * 0.028;
    vec3 base = vec3(0.040, 0.040, 0.049);
    vec3 gold = vec3(0.898, 0.745, 0.192);
    vec3 col = base;
    float focus = distance(uv, vec2(0.30, 0.45));

    if (uVariant < 0.5) {
      // HORIZON: fog drifting in from the left, thinning toward the mark
      float side = 0.45 + 0.55 * smoothstep(1.0, 0.1, uv.x);
      float q = fbm(p * 1.6 + vec2(-t * 0.7, t * 0.45));
      float n = fbm(p + vec2(t, -t * 0.55) + q * 0.9);
      float wisp = pow(smoothstep(0.42, 0.88, n), 1.6);
      col += vec3(0.62, 0.42, 0.10) * wisp * 0.38 * side;
      col += gold * pow(smoothstep(0.60, 0.95, n), 2.0) * 0.20 * side;
    } else if (uVariant < 1.5) {
      // EMBER: dense dark smoke, higher contrast
      float n = fbm(p * 2.1 + vec2(t * 1.4, -t * 0.8));
      float wisp = pow(smoothstep(0.38, 0.92, n), 1.2);
      col += vec3(0.55, 0.35, 0.08) * wisp * 0.5;
      col += gold * pow(smoothstep(0.72, 0.98, n), 2.0) * 0.28;
    } else if (uVariant < 2.5) {
      // AURORA: slow golden curtains
      float band = sin(uv.x * 6.0 + fbm(vec2(uv.x * 3.0, t * 0.5)) * 4.0 + uTime * 0.21);
      float curtain = pow(smoothstep(0.55, 1.0, band), 3.0) * smoothstep(0.02, 0.45, uv.y) * smoothstep(1.05, 0.55, uv.y);
      col += gold * curtain * 0.22;
      col += vec3(0.50, 0.33, 0.08) * fbm(p * 1.2 + t * 0.1) * 0.08;
    } else if (uVariant < 3.5) {
      // CLEAN: minimal, crystal gradient only
      col += gold * smoothstep(0.9, 0.0, focus) * 0.05;
      col += vec3(0.10, 0.09, 0.06) * smoothstep(1.0, 0.2, uv.y) * 0.5;
    } else {
      // NEBULA: layered deep amber clouds
      float n1 = fbm(p * 1.4 + vec2(t * 0.5, -t * 0.3));
      float n2 = fbm(p * 2.8 - vec2(t * 0.3, t * 0.4) + n1);
      col += vec3(0.45, 0.18, 0.05) * pow(smoothstep(0.40, 0.90, n1), 1.5) * 0.40;
      col += gold * pow(smoothstep(0.55, 0.95, n2), 2.2) * 0.30;
    }

    col *= smoothstep(1.08, 0.30, focus);
    col = max(col, base * 0.98);
    gl_FragColor = vec4(col, 1.0);
  }`;

export default function HeroScene({ variant = 0, onReady }: { variant?: number; onReady?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef({ uTime: { value: 0 }, uVariant: { value: variant } });
  const readyRef = useRef(onReady);

  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { uniformsRef.current.uVariant.value = variant; }, [variant]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.autoClear = false;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 60);
    camera.position.set(0, 0, 10.5);

    // cheap canvas-painted environment instead of rendering a whole room:
    // bright warm panels + a gold horizon, so the metal reads vivid gold
    function makeEnv(): THREE.Texture {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#fffbef");   // bright sky above
      g.addColorStop(0.42, "#ffe89a"); // warm upper glow
      g.addColorStop(0.52, "#e5a92e"); // gold horizon line
      g.addColorStop(0.62, "#2a2008"); // dark ground for contrast
      g.addColorStop(1, "#0a0804");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
      const panel = (x: number, y: number, w: number, h: number, alpha: number) => {
        ctx.fillStyle = `rgba(255, 252, 240, ${alpha})`;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill();
      };
      panel(40, 34, 130, 58, 0.95);    // big softbox left
      panel(330, 26, 120, 50, 0.85);   // softbox right
      panel(210, 66, 90, 26, 0.7);     // center strip
      const blob = (x: number, y: number, r: number, inner: string) => {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, inner); rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      blob(150, 130, 90, "rgba(255, 214, 110, 0.75)");
      blob(400, 138, 80, "rgba(255, 190, 80, 0.6)");
      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
    const env = makeEnv();
    scene.environment = env;

    // backdrop: own scene, rendered first — draw order can never bury the mark
    const bgScene = new THREE.Scene();
    const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fog = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: uniformsRef.current,
        depthWrite: false,
        depthTest: false,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: FRAGMENT,
      })
    );
    fog.frustumCulled = false;
    bgScene.add(fog);
    renderer.autoClear = false;

    // tuned so the rendered tone visually matches the UI accent #e5be31
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2cd3d, metalness: 0.82, roughness: 0.22, envMapIntensity: 1.7 });
    const goldDim = new THREE.MeshStandardMaterial({ color: 0xd9ab1e, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.35 });

    // rig handles pointer parallax; mark inside it handles the spin and bob
    const rig = new THREE.Group();
    const mark = new THREE.Group();
    rig.add(mark);
    scene.add(rig);

    function dumbbell(): THREE.Group {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 24), goldDim);
      bar.rotation.z = Math.PI / 2;
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.58, 40, 40), gold);
      s1.position.x = -0.66;
      const s2 = s1.clone();
      s2.position.x = 0.66;
      g.add(bar, s1, s2);
      return g;
    }

    const bell1 = dumbbell();
    bell1.position.y = 1.66;
    bell1.rotation.z = -0.06;
    const bell2 = dumbbell();
    bell2.position.y = -1.66;
    bell2.rotation.z = 0.08;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 48), gold);
    orb.position.x = -1.1;
    const chev = new THREE.Group();
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.34, 0.34), gold);
    blade1.rotation.z = -0.62;
    blade1.position.set(0.34, 0.32, 0);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.34, 0.34), gold);
    blade2.rotation.z = 0.62;
    blade2.position.set(0.34, -0.32, 0);
    chev.add(blade1, blade2);
    chev.position.x = 0.78;
    mark.add(bell1, bell2, orb, chev);

    const key = new THREE.DirectionalLight(0xfff1c9, 2.4);
    key.position.set(4, 6, 6);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(-6, -3, -4);
    scene.add(key, rim, new THREE.AmbientLight(0x332f22, 0.55));

    let baseY = 0.1;
    let baseScale = 1.0;
    function pose() {
      const w = mount!.clientWidth;
      // mobile: canvas is viewport-height and top-anchored; mark sits in the
      // top band, clear of the copy that starts below it
      if (w < 860) { mark.position.x = 0; baseY = 2.3; baseScale = 0.5; }
      else { mark.position.x = 3.05; baseY = 0.1; baseScale = 1.0; }
      mark.position.y = baseY;
    }
    pose();

    let tx = 0, ty = 0;
    const onPointer = (event: PointerEvent) => {
      tx = (event.clientX / window.innerWidth - 0.5) * 0.24;
      ty = (event.clientY / window.innerHeight - 0.5) * 0.16;
    };
    window.addEventListener("pointermove", onPointer);

    const ro = new ResizeObserver(() => {
      const w = mount!.clientWidth, h = mount!.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      pose();
    });
    ro.observe(mount);

    const clock = new THREE.Clock();
    let prevT = 0;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(mount);

    let announced = false;
    function renderFrame() {
      renderer.clear();
      renderer.render(bgScene, bgCam);
      renderer.render(scene, camera);
      if (!announced) { announced = true; readyRef.current?.(); }
    }
    function renderStatic() {
      fogUniformsStill();
      mark.scale.setScalar(baseScale);
      renderFrame();
    }
    function fogUniformsStill() {
      uniformsRef.current.uTime.value = 7.0;
    }
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(t - prevT, 0.05);
      prevT = t;
      uniformsRef.current.uTime.value = t;
      // cycle: spin freely, settle exactly front, hold the arranged pose, repeat
      mark.scale.setScalar(baseScale);
      mark.position.y = baseY + Math.sin(t * 0.6) * 0.13;
      const c = Math.max(0, t - SPIN_DELAY);
      const phase = c % CYCLE;
      if (phase < SPIN_LEN) {
        const pulse = Math.sin(Math.PI * (phase / SPIN_LEN));
        mark.rotation.y += SPIN_SPEED * 2.4 * pulse * (dt * 60);
        bell1.rotation.z += 0.0018 * pulse * (dt * 60);
        bell2.rotation.z -= 0.0016 * pulse * (dt * 60);
        orb.rotation.y += 0.005 * pulse * (dt * 60);
        chev.rotation.z = Math.sin(t * 0.8) * 0.16 * pulse;
      } else {
        // ease the whole arrangement back to a clean front-facing pose
        const twoPi = Math.PI * 2;
        const target = Math.ceil((mark.rotation.y - 0.001) / twoPi) * twoPi;
        const pull = phase < SPIN_LEN + SETTLE_LEN ? Math.min(1, dt * 3.4) : 1;
        mark.rotation.y += (target - mark.rotation.y) * pull;
        bell1.rotation.z *= 0.97;
        bell2.rotation.z *= 0.97;
        chev.rotation.z *= 0.94;
      }
      rig.rotation.x += (ty - rig.rotation.x) * 0.05;
      rig.rotation.y += (tx - rig.rotation.y) * 0.05;
      renderFrame();
    }

    if (reduced) {
      renderStatic();
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      fog.geometry.dispose();
      (fog.material as THREE.ShaderMaterial).dispose();
      gold.dispose();
      goldDim.dispose();
      env.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="hero-scene" ref={mountRef} aria-hidden="true" />;
}
