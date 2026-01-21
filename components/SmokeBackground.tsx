import React, { useRef, useEffect } from 'react';

const SmokeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // --- SHADER SOURCES ---
    
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fractal Brownian Motion & Domain Warping Shader
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;

      // Random / Hash function
      float random (in vec2 _st) {
        return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      // Noise function
      float noise (in vec2 _st) {
        vec2 i = floor(_st);
        vec2 f = fract(_st);

        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
      }

      #define NUM_OCTAVES 5

      // Fractal Brownian Motion
      float fbm ( in vec2 _st) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        // Rotate to reduce axial bias
        mat2 rot = mat2(cos(0.5), sin(0.5),
                        -sin(0.5), cos(0.50));
        for (int i = 0; i < NUM_OCTAVES; ++i) {
          v += a * noise(_st);
          _st = rot * _st * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 st = gl_FragCoord.xy/u_resolution.xy;
        st.x *= u_resolution.x/u_resolution.y;

        // Domain Warping Logic for fluid smoke
        vec2 q = vec2(0.);
        q.x = fbm( st + 0.00 * u_time);
        q.y = fbm( st + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*u_time );
        r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*u_time);

        float f = fbm(st+r);

        // --- MODERN WHITE / BLUE PALETTE ---
        // Background: Pure White
        vec3 bg_color = vec3(1.0, 1.0, 1.0);

        // Smoke Colors: Varying shades of Aviation Blue
        vec3 light_blue = vec3(0.85, 0.92, 1.0); // Very faint blue
        vec3 deep_blue = vec3(0.0, 0.4, 0.9);   // Vibrant Aviation Blue

        float t = u_time * 0.1; // Slow movement
        float cycle = 0.5 + 0.5 * sin(t); 
        
        vec3 smoke_tint = mix(light_blue, deep_blue, cycle * 0.5);

        // Mix Background and Smoke
        // We want the smoke to be subtle trails on white
        
        float density = smoothstep(0.3, 0.8, f);
        
        // Invert density logic slightly for white background smoke
        vec3 color = mix(bg_color, smoke_tint, density * 0.6); 

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // --- WEBGL BOILERPLATE ---

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    // Look up locations
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");

    // Create buffer for a full-screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Render Loop
    let startTime = Date.now();
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }

      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(timeUniformLocation, (Date.now() - startTime) * 0.0005); 

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
    />
  );
};

export default SmokeBackground;