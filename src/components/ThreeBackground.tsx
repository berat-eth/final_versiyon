import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  intensity?: number;
  preset?: 'glitch' | 'warning' | 'aurora' | 'nature' | 'space';
}

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ intensity = 0.8, preset = 'glitch' }) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <GLView
      style={styles.gl}
      pointerEvents="none"
      onContextCreate={async (gl) => {
        const renderer = new Renderer({ gl, antialias: true });
        (renderer as unknown as any).setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        // Arka planı saydam yap ki SafeAreaView rengi görünsün
        (renderer as unknown as any).setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          75,
          gl.drawingBufferWidth / gl.drawingBufferHeight,
          0.1,
          1000
        );
        camera.position.z = 2.2;

        const geometry = new THREE.PlaneGeometry(5, 5, 64, 64);

        const fragmentGlitch = `
            precision highp float;
            varying vec2 vUv;
            uniform float u_time;
            uniform float u_intensity;

            float hash(vec2 p){
              p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
              return fract(sin(p.x+p.y)*43758.5453123);
            }
            float noise(vec2 p){
              vec2 i = floor(p);
              vec2 f = fract(p);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              vec2 u = f*f*(3.0-2.0*f);
              return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
            }

            void main() {
              vec2 uv = vUv;
              float t = u_time * 0.02;

              vec3 baseA = vec3(0.03, 0.04, 0.06);
              vec3 baseB = vec3(0.10, 0.11, 0.16);
              float grad = smoothstep(0.0, 1.0, uv.y);
              vec3 base = mix(baseA, baseB, grad);

              float scan = sin(uv.y * 1200.0) * 0.04;

              float bandFreq = 6.0;
              float band = step(0.96, fract(uv.y * bandFreq + t*0.7 + noise(vec2(t, uv.y))));
              float band2 = step(0.98, fract(uv.y * (bandFreq*1.7) - t*0.9 + noise(vec2(uv.y, t))));
              float glitchAmount = (band * 1.0 + band2 * 1.5) * u_intensity;

              float jitter = (noise(vec2(uv.y*20.0, t*10.0)) - 0.5) * 0.08 * glitchAmount;
              float shift = jitter + (band>0.0 ? (sin(t*50.0)*0.02) : 0.0);

              vec2 uvR = uv + vec2(shift + 0.0025*glitchAmount, 0.0);
              vec2 uvG = uv + vec2(shift, 0.0);
              vec2 uvB = uv + vec2(shift - 0.0025*glitchAmount, 0.0);

              float gR = smoothstep(0.0,1.0,uvR.y + 0.02*noise(uvR*5.0 + t));
              float gG = smoothstep(0.0,1.0,uvG.y + 0.02*noise(uvG*5.0 + t*1.1));
              float gB = smoothstep(0.0,1.0,uvB.y + 0.02*noise(uvB*5.0 + t*1.2));
              vec3 colR = mix(baseA, baseB, gR);
              vec3 colG = mix(baseA, baseB, gG);
              vec3 colB = mix(baseA, baseB, gB);
              vec3 rgb = vec3(colR.r, colG.g, colB.b);

              float grain = (noise(uv*800.0 + t*30.0) - 0.5) * 0.08 * (0.3 + 0.7*u_intensity);
              vec3 color = rgb + scan + grain;
              color = clamp(color, 0.0, 1.0);
              gl_FragColor = vec4(color, 1.0);
            }
        `;

        const fragmentWarning = `
            precision highp float;
            varying vec2 vUv;
            uniform float u_time;
            uniform float u_intensity;

            vec2 rotate(vec2 p, float a){
              float s = sin(a), c = cos(a);
              return mat2(c,-s,s,c) * p;
            }
            float stripe(vec2 p, float w){
              float s = step(0.5 - w, fract(p.x)) * step(fract(p.x), 0.5 + w);
              return s;
            }

            // Ring helper kaldırıldı

            // Chevron corner mask
            float chevron(vec2 p){
              // simple V-shape mask
              p = abs(p);
              return smoothstep(0.08, 0.02, p.y - p.x*0.7);
            }

            void main(){
              vec2 uv = vUv;
              float t = u_time * 0.02;

              // Diagonal hazard stripes (background)
              vec2 rp = rotate(uv - 0.5, -0.6) * 7.0 + vec2(t*0.25, 0.0);
              float s1 = stripe(rp, 0.22);
              float s2 = stripe(rp + vec2(0.5,0.0), 0.22);
              float stripes = max(s1, 1.0 - s2);
              vec3 amber = vec3(1.0, 0.82, 0.0);
              vec3 black = vec3(0.30); // siyah alanı gri yap
              vec3 color = mix(black, amber, stripes);

              // Merkez halkalar kaldırıldı
              vec2 c = uv - 0.5;

              // Corner chevrons (minimal uyarı dokusu)
              vec2 q = (uv - 0.5);
              float ch = 0.0;
              ch += chevron(q*2.2 + vec2( 1.0,  1.0));
              ch += chevron(q*2.2 + vec2(-1.0,  1.0));
              ch += chevron(q*2.2 + vec2( 1.0, -1.0));
              ch += chevron(q*2.2 + vec2(-1.0, -1.0));
              color = mix(color, vec3(0.98,0.98,0.98), smoothstep(0.8,1.8,ch)*0.25);

              // Vignette
              color = mix(color, vec3(0.1), 1.0 - smoothstep(0.95, 0.72, length(c)));
              color = clamp(color, 0.0, 1.0);
              gl_FragColor = vec4(color, 1.0);
            }
        `;

        const fragmentAurora = `
            precision highp float;
            varying vec2 vUv;
            uniform float u_time;
            uniform float u_intensity;

            float hash(vec2 p){
              p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
              return fract(sin(p.x+p.y)*43758.5453123);
            }
            float noise(vec2 p){
              vec2 i = floor(p);
              vec2 f = fract(p);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              vec2 u = f*f*(3.0-2.0*f);
              return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
            }

            vec3 auroraColor(float x){
              // Mavi-yeşil-mor geçişleri
              vec3 c1 = vec3(0.0, 0.8, 0.9);
              vec3 c2 = vec3(0.1, 0.9, 0.4);
              vec3 c3 = vec3(0.6, 0.2, 0.8);
              vec3 m = mix(c1, c2, smoothstep(0.0, 0.5, x));
              return mix(m, c3, smoothstep(0.5, 1.0, x));
            }

            void main(){
              vec2 uv = vUv;
              float t = u_time * 0.015;

              // Yumuşak gece arka planı
              vec3 bgTop = vec3(0.03, 0.05, 0.10);
              vec3 bgBottom = vec3(0.00, 0.01, 0.03);
              vec3 bg = mix(bgBottom, bgTop, smoothstep(0.0, 1.0, uv.y));

              // Dalgalanan aurora bantları
              float wave1 = sin(uv.x*6.0 + t*2.0 + noise(uv*3.0 + t*0.5)*3.0);
              float wave2 = sin(uv.x*9.0 - t*1.5 + noise(uv*4.0 - t*0.4)*2.0);
              float mask = smoothstep(0.35, 0.75, uv.y + wave1*0.08 + wave2*0.05);

              float glow = smoothstep(0.2, 0.9, uv.y + wave1*0.06) * 0.8;
              float flicker = noise(vec2(uv.x*5.0, t*2.0))*0.2;
              float band = clamp(mask + glow + flicker, 0.0, 1.0);
              band *= (0.5 + 0.5*u_intensity);

              vec3 aurora = auroraColor(uv.x*0.5 + 0.5) * band;

              // İnce yıldızlar
              float stars = step(0.995, fract(sin(dot(uv*vec2(800.0, 600.0) + t*10.0, vec2(12.9898,78.233)))*43758.5453));
              stars *= 0.6;

              vec3 color = bg + aurora + stars*vec3(0.8);
              color = clamp(color, 0.0, 1.0);
              gl_FragColor = vec4(color, 1.0);
            }
        `;

        const fragmentNature = `
            precision highp float;
            varying vec2 vUv;
            uniform float u_time;
            uniform float u_intensity;

            float hash(vec2 p){
              p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
              return fract(sin(p.x+p.y)*43758.5453123);
            }
            float noise(vec2 p){
              vec2 i = floor(p);
              vec2 f = fract(p);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              vec2 u = f*f*(3.0-2.0*f);
              return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
            }
            float fbm(vec2 p){
              float v = 0.0;
              float a = 0.5;
              for(int i=0;i<5;i++){
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
              }
              return v;
            }

            void main(){
              vec2 uv = vUv;
              float t = u_time * 0.01;

              // Gökyüzü gradyanı (sabaha yakın mavi)
              vec3 skyTop = vec3(0.30, 0.60, 0.95);
              vec3 skyBottom = vec3(0.85, 0.93, 1.0);
              vec3 sky = mix(skyBottom, skyTop, smoothstep(0.0, 1.0, uv.y));

              // Uzak dağ silüeti
              float mountain = fbm(uv * vec2(2.0, 0.8) + vec2(0.0, t*0.1));
              float horizon = 0.35 + mountain * 0.12; // dağ yüksekliği
              float isSky = step(uv.y, horizon);

              // Güneş (yumuşak disk)
              vec2 sunPos = vec2(0.8, 0.8);
              float sun = smoothstep(0.12, 0.10, distance(uv, sunPos));
              vec3 sunColor = vec3(1.0, 0.9, 0.6) * sun * 0.8;

              // Bulutlar
              float clouds = fbm(uv * vec2(3.0, 1.2) + vec2(t*0.2, 0.0));
              clouds = smoothstep(0.55, 0.9, clouds);
              vec3 cloudCol = mix(vec3(1.0), vec3(1.0, 1.0, 1.0), clouds) * 0.4;

              // Çimenli tepe
              float hill = fbm(uv * vec2(1.6, 0.6) - vec2(0.0, t*0.05));
              float groundLine = 0.22 + hill * 0.10;
              float isGround = step(groundLine, uv.y);
              vec3 grassA = vec3(0.08, 0.45, 0.12);
              vec3 grassB = vec3(0.20, 0.65, 0.25);
              float stripe = smoothstep(0.0, 1.0, fbm(uv*vec2(20.0,5.0)));
              vec3 grass = mix(grassA, grassB, stripe);
              grass *= (0.7 + 0.3*u_intensity);

              // Hafif rüzgar efekti (çimen dalgası)
              float wind = sin(uv.x*20.0 + t*3.0 + fbm(uv*vec2(10.0,2.0))*4.0) * 0.02 * u_intensity;
              grass *= 1.0 + wind;

              // Renk birleştirme
              vec3 skyLayer = sky + sunColor + cloudCol*isSky*(1.0 - step(0.5, clouds));
              vec3 groundLayer = grass;
              vec3 color = mix(groundLayer, skyLayer, step(uv.y, groundLine));

              color = clamp(color, 0.0, 1.0);
              gl_FragColor = vec4(color, 1.0);
            }
        `;

        const fragmentSpace = `
            precision highp float;
            varying vec2 vUv;
            uniform float u_time;
            uniform float u_intensity;

            float hash(vec2 p){
              p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
              return fract(sin(p.x+p.y)*43758.5453123);
            }
            float noise(vec2 p){
              vec2 i = floor(p);
              vec2 f = fract(p);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              vec2 u = f*f*(3.0-2.0*f);
              return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
            }
            float fbm(vec2 p){
              float v = 0.0;
              float a = 0.5;
              for(int i=0;i<5;i++){
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
              }
              return v;
            }

            void main(){
              vec2 uv = vUv;
              float t = u_time * 0.015;

              // Derin uzay arka planı (koyu lacivert -> siyah)
              vec3 deep = vec3(0.02, 0.03, 0.08);
              vec3 black = vec3(0.0);
              vec3 bg = mix(deep, black, smoothstep(0.2, 1.0, uv.y));

              // Nebula (girdaplı renk bulutu)
              vec2 nuv = uv * 2.0 - 1.0; // merkezle
              float swirl = fbm((nuv*1.2) + vec2(t*0.3, -t*0.2));
              float swirl2 = fbm((nuv.yx*1.4) + vec2(-t*0.25, t*0.18));
              float neb = smoothstep(0.5, 0.95, swirl*0.6 + swirl2*0.5);
              neb *= (0.4 + 0.6*u_intensity);
              vec3 nebulaColA = vec3(0.7, 0.2, 0.9);
              vec3 nebulaColB = vec3(0.1, 0.6, 1.0);
              vec3 nebula = mix(nebulaColA, nebulaColB, clamp(uv.x, 0.0, 1.0)) * neb;

              // Yıldızlar (iki katman: küçük ve parlak)
              float starsSmall = step(0.997, fract(sin(dot(uv*vec2(900.0, 700.0) + t*5.0, vec2(12.9898,78.233)))*43758.5453));
              float starsBright = step(0.9993, fract(sin(dot(uv*vec2(1400.0, 1100.0) - t*4.0, vec2(39.3468,11.135)))*24634.6345));
              float twinkle = 0.5 + 0.5*sin(t*6.0 + uv.x*30.0);
              vec3 stars = vec3(1.0) * (starsSmall*0.35 + starsBright*0.9*twinkle);

              // Gezegen diski (sol altta yumuşak kenarlı)
              vec2 planetPos = vec2(0.18, 0.22);
              float d = distance(uv, planetPos);
              float planet = smoothstep(0.22, 0.20, d);
              vec3 planetCol = vec3(0.15, 0.5, 0.9);
              // basit gradyan ve gölge
              float shade = 1.0 - smoothstep(0.0, 0.22, d) + 0.15;
              vec3 planetPix = planetCol * shade * planet;

              vec3 color = bg + nebula + stars + planetPix;
              color = clamp(color, 0.0, 1.0);
              gl_FragColor = vec4(color, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
          uniforms: {
            u_time: { value: 0 },
            u_intensity: { value: intensity }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: (
            preset === 'warning' ? fragmentWarning :
            preset === 'aurora' ? fragmentAurora :
            preset === 'space' ? fragmentSpace :
            preset === 'nature' ? fragmentNature :
            fragmentGlitch
          ),
        });
        material.transparent = true;
        material.opacity = 0.6;

        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        const animate = (time: number) => {
          (material.uniforms.u_time as any).value = time / 16.6667;
          plane.rotation.z += 0.0005;
          (renderer as unknown as any).render(scene, camera);
          gl.endFrameEXP();
          requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        const onResize = () => {
          (renderer as unknown as any).setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
          camera.aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
          camera.updateProjectionMatrix();
        };
        // GLView boyutu değiştiğinde Expo içte yeniden yaratır; burada temel ayar yeterli
      }}
    />
  );
};

const styles = StyleSheet.create({
  gl: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default ThreeBackground;


