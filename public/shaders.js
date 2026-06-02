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
    "uniform vec2 u_texRes;",
    "uniform vec2 u_focus;",
    "uniform float u_time;",
    "uniform float u_harsh;",
    "uniform float u_barrel;",
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
    "vec2 coverUv(vec2 uv, vec2 texRes, vec2 screenRes, vec2 focus) {",
    "  float sr = screenRes.x / max(screenRes.y, 1.0);",
    "  float tr = texRes.x / max(texRes.y, 1.0);",
    "  vec2 s = uv;",
    "  if (sr > tr) {",
    "    float k = tr / sr;",
    "    s.x = (s.x - 0.5) * k + focus.x;",
    "  } else {",
    "    float k = sr / tr;",
    "    s.y = (s.y - 0.5) * k + focus.y;",
    "  }",
    "  return clamp(s, 0.001, 0.999);",
    "}",
    "",
    "void main() {",
    "  vec2 res = u_res;",
    "  vec2 uv = coverUv(v_uv, u_texRes, res, u_focus);",
    "",
    "  float t = u_time;",
    "  float beat = floor(t * 11.0);",
    "  float harsh = u_harsh;",
    "",
    "  float rows = mix(32.0, 48.0, harsh);",
    "  float row = floor(uv.y * rows);",
    "  float sliceGate = step(0.965, hash3(vec3(row, beat, 0.17)));",
    "  uv.x += sliceGate * (hash(vec2(row, beat)) - 0.5) * 0.14 * harsh;",
    "",
    "  vec2 block = floor(uv * vec2(16.0, 9.0));",
    "  if (hash3(vec3(block, beat * 0.31)) > 0.94) {",
    "    uv.x += (hash(block + beat) - 0.5) * 0.09 * harsh;",
    "    uv.y += (hash(block.yx + beat * 2.0) - 0.5) * 0.04 * harsh;",
    "  }",
    "",
    "  vec2 c = uv - u_focus;",
    "  float r = dot(c, c);",
    "  uv = u_focus + c * (1.0 + r * u_barrel);",
    "  uv.x += sin(uv.y * 80.0 + t * 18.0) * 0.0012 * harsh;",
    "",
    "  float ab = 0.003 + 0.002 * sin(t * 23.0);",
    "  vec2 dir = vec2(cos(t * 7.0), sin(t * 5.0)) * ab * harsh;",
    "  float rr = texture2D(u_tex, clamp(uv + dir, 0.001, 0.999)).r;",
    "  float gg = texture2D(u_tex, clamp(uv, 0.001, 0.999)).g;",
    "  float bb = texture2D(u_tex, clamp(uv - dir, 0.001, 0.999)).b;",
    "  vec3 col = vec3(rr, gg, bb);",
    "",
    "  col = pow(max(col, 0.0), vec3(0.82));",
    "  col = col * 1.12 - 0.06;",
    "  col = clamp(col, 0.0, 1.0);",
    "  col = smoothstep(0.02, 0.98, col);",
    "",
    "  float lum = dot(col, vec3(0.299, 0.587, 0.114));",
    "  col += vec3(0.15, 0.35, 0.05) * pow(lum, 3.0) * 0.35 * harsh;",
    "  col += vec3(0.4, 0.0, 0.2) * pow(lum, 5.0) * 0.2 * harsh;",
    "",
    "  float scan = 0.84 + 0.16 * sin(uv.y * res.y * 3.14159);",
    "  float roll = smoothstep(0.0, 0.02, abs(fract(uv.y * 3.0 - t * 0.7) - 0.5));",
    "  col *= scan;",
    "  col *= mix(0.6, 1.0, roll);",
    "",
    "  col += (hash(uv * res + t) - 0.5) * 0.09 * harsh;",
    "",
    "  float bar = step(0.992, hash(vec2(floor(t * 6.0), floor(uv.y * 6.0))));",
    "  col *= 1.0 - bar * 0.85 * harsh;",
    "",
    "  col *= 1.0 - r * 0.85;",
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

  function isPortrait() {
    return window.matchMedia("(orientation: portrait)").matches;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 899px)").matches;
  }

  function pickTexturePath() {
    if (isMobile() && isPortrait()) return "./assets/collage-mobile.jpg";
    if (isMobile()) return "./assets/collage.jpg";
    return "./assets/collage-full.jpg";
  }

  function pickFocus() {
    if (isMobile() && isPortrait()) return { x: 0.5, y: 0.42 };
    return { x: 0.5, y: 0.4 };
  }

  function pickBarrel() {
    if (isMobile() && isPortrait()) return 0.12;
    if (isMobile()) return 0.18;
    return 0.35;
  }

  function init() {
    var canvas = document.getElementById("breakcore-gl");
    var fallback = document.querySelector(".collage-bg");
    if (!canvas) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var harsh = reduced ? 0.35 : isMobile() ? 0.72 : 1.0;
    var animate = !reduced;

    var gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) {
      if (fallback) fallback.classList.add("visible");
      return;
    }

    var prog;
    try {
      prog = link(gl, compile(gl, gl.VERTEX_SHADER, VERT), compile(gl, gl.FRAGMENT_SHADER, FRAG));
    } catch (err) {
      console.warn("breakcore shader init failed", err);
      if (fallback) fallback.classList.add("visible");
      return;
    }

    var texW = 1920;
    var texH = 1280;
    var focus = pickFocus();
    var barrel = pickBarrel();
    var currentTexPath = "";

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(prog, "a_pos");
    var uTex = gl.getUniformLocation(prog, "u_tex");
    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTexRes = gl.getUniformLocation(prog, "u_texRes");
    var uFocus = gl.getUniformLocation(prog, "u_focus");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uHarsh = gl.getUniformLocation(prog, "u_harsh");
    var uBarrel = gl.getUniformLocation(prog, "u_barrel");

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var img = new Image();
    img.crossOrigin = "anonymous";

    function syncFallbackBg() {
      if (!fallback) return;
      var path = pickTexturePath();
      fallback.style.backgroundImage = 'url("' + path + '")';
      fallback.dataset.mode = isMobile() && isPortrait() ? "portrait" : isMobile() ? "landscape" : "desktop";
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
      var w = Math.floor((canvas.clientWidth || window.innerWidth) * dpr);
      var h = Math.floor((canvas.clientHeight || window.innerHeight) * dpr);
      if (w < 1 || h < 1) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }

    function draw(t) {
      resize();
      if (canvas.width < 1 || canvas.height < 1) return;
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uTex, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uTexRes, texW, texH);
      gl.uniform2f(uFocus, focus.x, focus.y);
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform1f(uHarsh, harsh);
      gl.uniform1f(uBarrel, barrel);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function reloadTexture(path, cb) {
      img.onload = function () {
        texW = img.naturalWidth || texW;
        texH = img.naturalHeight || texH;
        focus = pickFocus();
        barrel = pickBarrel();
        harsh = reduced ? 0.35 : isMobile() ? 0.72 : 1.0;
        syncFallbackBg();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        canvas.classList.add("ready");
        if (fallback) fallback.classList.remove("visible");
        if (cb) cb();
      };
      img.onerror = function () {
        if (fallback) fallback.classList.add("visible");
      };
      img.src = path;
      currentTexPath = path;
    }

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

    syncFallbackBg();
    reloadTexture(pickTexturePath(), startLoop);

    function onLayoutChange() {
      var next = pickTexturePath();
      if (next !== currentTexPath) {
        reloadTexture(next, function () {
          if (!animate) draw(0);
        });
      } else {
        focus = pickFocus();
        barrel = pickBarrel();
        syncFallbackBg();
        if (!animate) draw(0);
      }
    }

    window.matchMedia("(min-width: 900px)").addEventListener("change", onLayoutChange);
    window.matchMedia("(orientation: portrait)").addEventListener("change", onLayoutChange);
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
