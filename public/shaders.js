(function () {
  "use strict";

  var VERT = [
    "attribute vec2 a_pos;",
    "varying vec2 v_uv;",
    "void main() {",
    "  v_uv = a_pos * 0.5 + 0.5;",
    "  v_uv.y = 1.0 - v_uv.y;",
    "  gl_Position = vec4(a_pos, 0.0, 1.0);",
    "}",
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",
    "uniform vec2 u_res;",
    "uniform float u_time;",
    "uniform float u_harsh;",
    "varying vec2 v_uv;",
    "",
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
    "}",
    "",
    "float hash3(vec3 p) {",
    "  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);",
    "}",
    "",
    "vec2 coverUv(vec2 uv, vec2 texRes, vec2 screenRes) {",
    "  float sr = screenRes.x / screenRes.y;",
    "  float tr = texRes.x / texRes.y;",
    "  vec2 s = uv;",
    "  if (sr > tr) {",
    "    float k = tr / sr;",
    "    s.x = (s.x - 0.5) * k + 0.5;",
    "  } else {",
    "    float k = sr / tr;",
    "    s.y = (s.y - 0.5) * k + 0.5;",
    "  }",
    "  return s;",
    "}",
    "",
    "void main() {",
    "  vec2 res = u_res;",
    "  vec2 uv = v_uv;",
    "  vec2 texRes = vec2(1920.0, 1280.0);",
    "  uv = coverUv(uv, texRes, res);",
    "",
    "  float t = u_time;",
    "  float beat = floor(t * 11.0);",
    "",
    "  // horizontal slice tears",
    "  float rows = 48.0;",
    "  float row = floor(uv.y * rows);",
    "  float sliceGate = step(0.965, hash3(vec3(row, beat, 0.17)));",
    "  uv.x += sliceGate * (hash(vec2(row, beat)) - 0.5) * 0.14 * u_harsh;",
    "",
    "  // block glitch windows",
    "  vec2 block = floor(uv * vec2(16.0, 9.0));",
    "  if (hash3(vec3(block, beat * 0.31)) > 0.94) {",
    "    uv.x += (hash(block + beat) - 0.5) * 0.09 * u_harsh;",
    "    uv.y += (hash(block.yx + beat * 2.0) - 0.5) * 0.04 * u_harsh;",
    "  }",
    "",
    "  // wobble + barrel",
    "  vec2 c = uv - 0.5;",
    "  float r = dot(c, c);",
    "  uv = 0.5 + c * (1.0 + r * 0.35 * u_harsh);",
    "  uv.x += sin(uv.y * 80.0 + t * 18.0) * 0.0015 * u_harsh;",
    "",
    "  // chromatic split",
    "  float ab = 0.004 + 0.003 * sin(t * 23.0);",
    "  vec2 dir = vec2(cos(t * 7.0), sin(t * 5.0)) * ab * u_harsh;",
    "  float rr = texture2D(u_tex, uv + dir).r;",
    "  float gg = texture2D(u_tex, uv).g;",
    "  float bb = texture2D(u_tex, uv - dir).b;",
    "  vec3 col = vec3(rr, gg, bb);",
    "",
    "  // harsh grade",
    "  col = pow(max(col, 0.0), vec3(0.78));",
    "  col = col * 1.15 - 0.08;",
    "  col = clamp(col, 0.0, 1.0);",
    "  col = smoothstep(0.02, 0.98, col);",
    "",
    "  // acid spill on highlights",
    "  float lum = dot(col, vec3(0.299, 0.587, 0.114));",
    "  col += vec3(0.15, 0.35, 0.05) * pow(lum, 3.0) * 0.4 * u_harsh;",
    "  col += vec3(0.4, 0.0, 0.2) * pow(lum, 5.0) * 0.25 * u_harsh;",
    "",
    "  // scanlines + rolling bar",
    "  float scan = 0.82 + 0.18 * sin(uv.y * res.y * 3.14159);",
    "  float roll = smoothstep(0.0, 0.02, abs(fract(uv.y * 3.0 - t * 0.7) - 0.5));",
    "  col *= scan;",
    "  col *= mix(0.55, 1.0, roll);",
    "",
    "  // noise grain",
    "  col += (hash(uv * res + t) - 0.5) * 0.11 * u_harsh;",
    "",
    "  // random blackout bars",
    "  float bar = step(0.992, hash(vec2(floor(t * 6.0), floor(uv.y * 6.0))));",
    "  col *= 1.0 - bar * 0.85 * u_harsh;",
    "",
    "  // vignette",
    "  col *= 1.0 - r * 1.1;",
    "",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
    }
    return sh;
  }

  function link(gl, vs, fs) {
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || "shader link failed");
    }
    return prog;
  }

  function pickTexturePath() {
    return window.matchMedia("(min-width: 900px)").matches
      ? "./assets/collage-full.jpg"
      : "./assets/collage.jpg";
  }

  function init() {
    var canvas = document.getElementById("breakcore-gl");
    var fallback = document.querySelector(".collage-bg");
    if (!canvas) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var harsh = reduced ? 0.35 : 1.0;
    var animate = !reduced;

    var gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) {
      if (fallback) fallback.style.opacity = "1";
      return;
    }

    var prog;
    try {
      prog = link(gl, compile(gl, gl.VERTEX_SHADER, VERT), compile(gl, gl.FRAGMENT_SHADER, FRAG));
    } catch (err) {
      console.warn("breakcore shader init failed", err);
      if (fallback) fallback.style.opacity = "1";
      return;
    }

    if (fallback) fallback.style.opacity = "0";

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(prog, "a_pos");
    var uTex = gl.getUniformLocation(prog, "u_tex");
    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uHarsh = gl.getUniformLocation(prog, "u_harsh");

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var img = new Image();
    img.crossOrigin = "anonymous";

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.floor(canvas.clientWidth * dpr);
      var h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }

    function draw(t) {
      resize();
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uTex, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform1f(uHarsh, harsh);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    var texPath = pickTexturePath();

    function startLoop() {
      if (animate) {
        function frame(t) {
          draw(t);
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      } else {
        draw(0);
      }
    }

    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      canvas.classList.add("ready");
      startLoop();
    };

    img.onerror = function () {
      if (fallback) fallback.style.opacity = "1";
    };

    img.src = texPath;

    window.matchMedia("(min-width: 900px)").addEventListener("change", function () {
      var next = pickTexturePath();
      if (img.src.indexOf(next) === -1) {
        img.src = next;
      }
    });

    window.addEventListener("resize", function () {
      if (!animate) draw(0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
