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
    "uniform sampler2D u_texA;",
    "uniform sampler2D u_texB;",
    "uniform vec2 u_res;",
    "uniform vec2 u_texResA;",
    "uniform vec2 u_texResB;",
    "uniform vec2 u_focus;",
    "uniform float u_time;",
    "uniform float u_harsh;",
    "uniform float u_barrel;",
    "uniform float u_mix;",
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
    "vec3 sampleTex(sampler2D tex, vec2 texRes, vec2 uv, vec2 res, vec2 focus, float t, float harsh, float beat) {",
    "  vec2 tuv = coverUv(uv, texRes, res, focus);",
    "  float rows = mix(32.0, 48.0, harsh);",
    "  float row = floor(tuv.y * rows);",
    "  float sliceGate = step(0.965, hash3(vec3(row, beat, 0.17)));",
    "  tuv.x += sliceGate * (hash(vec2(row, beat)) - 0.5) * 0.14 * harsh;",
    "  vec2 block = floor(tuv * vec2(16.0, 9.0));",
    "  if (hash3(vec3(block, beat * 0.31)) > 0.94) {",
    "    tuv.x += (hash(block + beat) - 0.5) * 0.09 * harsh;",
    "    tuv.y += (hash(block.yx + beat * 2.0) - 0.5) * 0.04 * harsh;",
    "  }",
    "  vec2 c = tuv - focus;",
    "  float r = dot(c, c);",
    "  tuv = focus + c * (1.0 + r * u_barrel);",
    "  tuv.x += sin(tuv.y * 80.0 + t * 18.0) * 0.0012 * harsh;",
    "  float ab = 0.003 + 0.002 * sin(t * 23.0);",
    "  vec2 dir = vec2(cos(t * 7.0), sin(t * 5.0)) * ab * harsh;",
    "  float rr = texture2D(tex, clamp(tuv + dir, 0.001, 0.999)).r;",
    "  float gg = texture2D(tex, clamp(tuv, 0.001, 0.999)).g;",
    "  float bb = texture2D(tex, clamp(tuv - dir, 0.001, 0.999)).b;",
    "  vec3 col = vec3(rr, gg, bb);",
    "  col = pow(max(col, 0.0), vec3(0.82));",
    "  col = col * 1.12 - 0.06;",
    "  col = clamp(col, 0.0, 1.0);",
    "  col = smoothstep(0.02, 0.98, col);",
    "  float lum = dot(col, vec3(0.299, 0.587, 0.114));",
    "  col += vec3(0.15, 0.35, 0.05) * pow(lum, 3.0) * 0.35 * harsh;",
    "  col += vec3(0.4, 0.0, 0.2) * pow(lum, 5.0) * 0.2 * harsh;",
    "  float scan = 0.84 + 0.16 * sin(tuv.y * res.y * 3.14159);",
    "  float roll = smoothstep(0.0, 0.02, abs(fract(tuv.y * 3.0 - t * 0.7) - 0.5));",
    "  col *= scan;",
    "  col *= mix(0.6, 1.0, roll);",
    "  col += (hash(tuv * res + t) - 0.5) * 0.09 * harsh;",
    "  float bar = step(0.992, hash(vec2(floor(t * 6.0), floor(tuv.y * 6.0))));",
    "  col *= 1.0 - bar * 0.85 * harsh;",
    "  col *= 1.0 - r * 0.85;",
    "  return col;",
    "}",
    "",
    "void main() {",
    "  vec2 res = u_res;",
    "  float t = u_time;",
    "  float beat = floor(t * 11.0);",
    "  float harsh = u_harsh;",
    "  vec3 a = sampleTex(u_texA, u_texResA, v_uv, res, u_focus, t, harsh, beat);",
    "  vec3 b = sampleTex(u_texB, u_texResB, v_uv, res, u_focus, t, harsh, beat);",
    "  float m = u_mix;",
    "  m = m * m * (3.0 - 2.0 * m);",
    "  float burst = step(0.35, m) * step(m, 0.65) * (hash(vec2(floor(t * 40.0), floor(v_uv.y * 24.0))) - 0.5) * 0.12 * harsh;",
    "  vec3 col = mix(a, b, clamp(m + burst, 0.0, 1.0));",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  var DEFAULT_MANIFEST = {
    variants: ["remix", "grid", "slice", "scatter", "flyers"],
    cycleSec: 9,
    fadeSec: 1.4,
    pathTemplate: "./assets/collages/{variant}-{suffix}.jpg",
    suffixDesktop: "desktop",
    suffixMobile: "mobile",
  };

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

  function pickSuffix(manifest) {
    if (isMobile() && isPortrait()) return manifest.suffixMobile || "mobile";
    return manifest.suffixDesktop || "desktop";
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

  function variantPath(manifest, variant, suffix) {
    return (manifest.pathTemplate || DEFAULT_MANIFEST.pathTemplate)
      .replace("{variant}", variant)
      .replace("{suffix}", suffix);
  }

  function setVariantLabel(name) {
    var el = document.getElementById("collage-variant-label");
    if (el) el.textContent = "collage: " + name;
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

    var manifest = DEFAULT_MANIFEST;
    var suffix = pickSuffix(manifest);
    var focus = pickFocus();
    var barrel = pickBarrel();

    var slotA = { tex: null, w: 1920, h: 1280, variant: "" };
    var slotB = { tex: null, w: 1920, h: 1280, variant: "" };
    var curIdx = 0;
    var mixVal = 0;
    var fadeStart = 0;
    var fadeMs = (manifest.fadeSec || 1.4) * 1000;
    var cycleMs = (manifest.cycleSec || 9) * 1000;
    var cycleTimer = null;
    var fading = false;
    var ready = false;

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(prog, "a_pos");
    var uTexA = gl.getUniformLocation(prog, "u_texA");
    var uTexB = gl.getUniformLocation(prog, "u_texB");
    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTexResA = gl.getUniformLocation(prog, "u_texResA");
    var uTexResB = gl.getUniformLocation(prog, "u_texResB");
    var uFocus = gl.getUniformLocation(prog, "u_focus");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uHarsh = gl.getUniformLocation(prog, "u_harsh");
    var uBarrel = gl.getUniformLocation(prog, "u_barrel");
    var uMix = gl.getUniformLocation(prog, "u_mix");

    function makeTex() {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    }

    slotA.tex = makeTex();
    slotB.tex = makeTex();

    function syncFallbackBg(variant) {
      if (!fallback) return;
      var v = variant || manifest.variants[curIdx] || "remix";
      fallback.style.backgroundImage = 'url("' + variantPath(manifest, v, suffix) + '")';
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
      if (!ready) return;
      resize();
      if (canvas.width < 1 || canvas.height < 1) return;

      if (fading && fadeStart > 0) {
        mixVal = Math.min(1, (t - fadeStart) / fadeMs);
        if (mixVal >= 1) {
          fading = false;
          mixVal = 0;
          fadeStart = 0;
          var tmp = slotA;
          slotA = slotB;
          slotB = tmp;
          curIdx = (curIdx + 1) % manifest.variants.length;
          setVariantLabel(manifest.variants[curIdx]);
          syncFallbackBg(manifest.variants[curIdx]);
        }
      }

      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, slotA.tex);
      gl.uniform1i(uTexA, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, slotB.tex);
      gl.uniform1i(uTexB, 1);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uTexResA, slotA.w, slotA.h);
      gl.uniform2f(uTexResB, slotB.w, slotB.h);
      gl.uniform2f(uFocus, focus.x, focus.y);
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform1f(uHarsh, harsh);
      gl.uniform1f(uBarrel, barrel);
      gl.uniform1f(uMix, mixVal);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function uploadSlot(slot, img, variant) {
      slot.w = img.naturalWidth || slot.w;
      slot.h = img.naturalHeight || slot.h;
      slot.variant = variant;
      gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }

    function loadVariant(idx, slot, cb) {
      var variant = manifest.variants[idx % manifest.variants.length];
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        uploadSlot(slot, img, variant);
        if (cb) cb(variant);
      };
      img.onerror = function () {
        if (fallback) fallback.classList.add("visible");
        if (cb) cb(null);
      };
      img.src = variantPath(manifest, variant, suffix);
    }

    function startCycle() {
      if (cycleTimer) clearInterval(cycleTimer);
      if (manifest.variants.length < 2) return;
      cycleTimer = setInterval(function () {
        if (fading) return;
        var nextIdx = (curIdx + 1) % manifest.variants.length;
        loadVariant(nextIdx, slotB, function (variant) {
          if (!variant) return;
          fading = true;
          fadeStart = performance.now();
        });
      }, cycleMs);
    }

    function boot(m) {
      manifest = m || DEFAULT_MANIFEST;
      suffix = pickSuffix(manifest);
      focus = pickFocus();
      barrel = pickBarrel();
      harsh = reduced ? 0.35 : isMobile() ? 0.72 : 1.0;
      fadeMs = (manifest.fadeSec || 1.4) * 1000;
      cycleMs = reduced ? (manifest.cycleSec || 9) * 2000 : (manifest.cycleSec || 9) * 1000;
      curIdx = 0;
      mixVal = 0;
      fading = false;

      loadVariant(0, slotA, function (v0) {
        if (!v0) return;
        setVariantLabel(v0);
        syncFallbackBg(v0);
        if (manifest.variants.length > 1) {
          loadVariant(1, slotB, function () {
            ready = true;
            canvas.classList.add("ready");
            if (fallback) fallback.classList.remove("visible");
            startCycle();
          });
        } else {
          ready = true;
          canvas.classList.add("ready");
          if (fallback) fallback.classList.remove("visible");
        }
      });
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

    function onLayoutChange() {
      var nextSuffix = pickSuffix(manifest);
      if (nextSuffix === suffix && ready) {
        focus = pickFocus();
        barrel = pickBarrel();
        syncFallbackBg(manifest.variants[curIdx]);
        if (!animate) draw(0);
        return;
      }
      suffix = nextSuffix;
      focus = pickFocus();
      barrel = pickBarrel();
      ready = false;
      fading = false;
      mixVal = 0;
      if (cycleTimer) clearInterval(cycleTimer);
      boot(manifest);
    }

    fetch("./assets/collage-manifest.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : DEFAULT_MANIFEST; })
      .catch(function () { return DEFAULT_MANIFEST; })
      .then(function (m) {
        boot(m);
        startLoop();
      });

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
