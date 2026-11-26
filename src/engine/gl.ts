// Minimal WebGL2 helpers: program compilation, a full-screen quad, and
// ping-pong framebuffers so effects can be chained as passes.

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('Shader compile failed:\n' + log + '\n' + src);
  }
  return s;
}

export class Program {
  prog: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext, frag: string) {
    this.gl = gl;
    const v = compile(gl, gl.VERTEX_SHADER, VERT);
    const f = compile(gl, gl.FRAGMENT_SHADER, frag);
    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(p));
    }
    gl.deleteShader(v);
    gl.deleteShader(f);
    this.prog = p;
  }
  use() {
    this.gl.useProgram(this.prog);
  }
  loc(name: string) {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.prog, name));
    return this.uniforms.get(name)!;
  }
  f(name: string, v: number) {
    this.gl.uniform1f(this.loc(name), v);
  }
  i(name: string, v: number) {
    this.gl.uniform1i(this.loc(name), v);
  }
  v2(name: string, x: number, y: number) {
    this.gl.uniform2f(this.loc(name), x, y);
  }
  v3a(name: string, arr: Float32Array) {
    this.gl.uniform3fv(this.loc(name), arr);
  }
  fa(name: string, arr: Float32Array) {
    this.gl.uniform1fv(this.loc(name), arr);
  }
  tex(name: string, unit: number, tex: WebGLTexture) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.uniform1i(this.loc(name), unit);
  }
}

export function makeQuad(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export class RenderTarget {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w = 0;
  h = 0;
  gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext, w: number, h: number) {
    this.gl = gl;
    this.fb = gl.createFramebuffer()!;
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.resize(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb);
    this.gl.viewport(0, 0, this.w, this.h);
  }
  dispose() {
    this.gl.deleteFramebuffer(this.fb);
    this.gl.deleteTexture(this.tex);
  }
}

// The live stage keeps one long-lived Renderer; a hot update of the engine would leave it running stale shaders. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
