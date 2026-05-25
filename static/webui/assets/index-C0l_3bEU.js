(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=document.querySelector(`#app`);if(!e)throw Error(`Missing app root`);e.innerHTML=`
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">PyAutoPainter</p>
        <h1>Paint a local image with brushstrokes.</h1>
        <p class="lede">Choose an image, tune the run, then watch the canvas update as the painter works.</p>
      </div>
      <div class="status-card">
        <span class="label">Status</span>
        <strong id="status">Loading</strong>
        <a id="gif-link" class="gif-link hidden" href="/progress.gif" target="_blank" rel="noreferrer">Open progress GIF</a>
      </div>
    </section>

    <section class="grid">
      <form id="controls" class="panel controls">
        <label class="dropzone" id="dropzone">
          <input id="file-input" type="file" accept="image/*" />
          <span class="drop-title">Choose or drop an image</span>
          <span id="file-hint" class="drop-hint">PNG, JPG, GIF, or WebP</span>
        </label>

        <button id="upload-button" class="secondary" type="button" disabled>Upload selected image</button>

        <label>
          Input image
          <select id="image"></select>
        </label>

        <label>
          Configuration
          <select id="configuration"></select>
        </label>

        <label>
          Palette
          <select id="palette"></select>
        </label>

        <label>
          Palette usage
          <select id="palette-usage">
            <option value="Retint">Retint to nearest color</option>
            <option value="Exact">Use exact palette colors</option>
          </select>
        </label>

        <div class="two-up">
          <label>
            Color distance
            <input id="color-distance" type="number" min="0" max="255" value="20" />
          </label>
          <label>
            Autocontrast
            <input id="autocontrast" type="number" min="0" max="100" placeholder="Off" />
          </label>
        </div>

        <div class="actions">
          <button id="start-button" type="submit">Start painting</button>
          <button id="stop-button" class="secondary" type="button">Stop</button>
        </div>
      </form>

      <section class="panel preview-panel">
        <div class="preview-header">
          <div>
            <span class="label">Preview</span>
            <h2 id="preview-title">Canvas</h2>
          </div>
          <a id="progress-link" href="/progress.jpg" target="_blank" rel="noreferrer">Open image</a>
        </div>
        <div class="preview-frame">
          <img id="preview-image" alt="Current painting progress" />
        </div>
      </section>
    </section>
  </main>
`;var t=R(`status`),n=R(`gif-link`),r=R(`file-input`),i=R(`file-hint`),a=R(`upload-button`),o=R(`image`),s=R(`configuration`),c=R(`palette`),l=R(`palette-usage`),u=R(`color-distance`),d=R(`autocontrast`),f=R(`controls`),p=R(`stop-button`),m=R(`preview-image`),h=R(`progress-link`),g=R(`preview-title`),_=R(`dropzone`),v=null,y=null,b;x();async function x(){S(),await C(),k(),A()}function S(){r.addEventListener(`change`,()=>{T(r.files?.[0]??null)}),a.addEventListener(`click`,()=>{E()}),f.addEventListener(`submit`,e=>{e.preventDefault(),D()}),p.addEventListener(`click`,async()=>{await fetch(`/stop`),M(`Idle`),j()}),o.addEventListener(`change`,()=>{o.value&&O(o.value)});for(let e of[`dragenter`,`dragover`])_.addEventListener(e,e=>{e.preventDefault(),_.classList.add(`dragging`)});for(let e of[`dragleave`,`drop`])_.addEventListener(e,e=>{e.preventDefault(),_.classList.remove(`dragging`)});_.addEventListener(`drop`,e=>{T(e.dataTransfer?.files?.[0]??null)})}async function C(e){let t=await P(`/api/options`);w(s,t.configNames,`quick`),w(c,t.paletteNames,`(None)`),w(o,t.imageNames,e??o.value),M(t.status),o.value?O(o.value):(g.textContent=`Canvas`,k())}function w(e,t,n){e.replaceChildren(...t.map(e=>{let t=document.createElement(`option`);return t.value=e,t.textContent=e,t})),n&&t.includes(n)&&(e.value=n)}function T(e){if(v=e,a.disabled=!e,y&&=(URL.revokeObjectURL(y),null),!e){i.textContent=`PNG, JPG, GIF, or WebP`;return}y=URL.createObjectURL(e),m.src=y,h.href=y,g.textContent=e.name,i.textContent=`${e.name} ready to upload`}async function E(){if(!v)return o.value;a.disabled=!0,a.textContent=`Uploading...`;let e=new FormData;e.append(`image`,v);try{let t=await F(`/api/images`,e);return v=null,r.value=``,i.textContent=`${t.filename} uploaded`,w(o,t.imageNames,t.filename),O(t.filename),t.filename}finally{a.textContent=`Upload selected image`,a.disabled=!v}}async function D(){let e=v?await E():o.value;if(!e){M(`Choose an image first`);return}M(`Starting`),n.classList.add(`hidden`),await I(`/start`,{image:e,configuration:s.value,palette:c.value,palette_usage:l.value,color_distance_threshold:u.value,autocontrast:d.value}),k(),A()}function O(e){let t=`/api/images/${encodeURIComponent(e)}`;g.textContent=e,m.src=t,h.href=t}function k(){let e=`/progress.jpg?${Date.now()}`;m.src=e,h.href=e}function A(){j(),b=window.setInterval(async()=>{let e=await N(`/status`);M(e),k(),e===`Done`?(n.href=`/progress.gif?${Date.now()}`,n.classList.remove(`hidden`),j()):e===`Idle`&&j()},2e3)}function j(){b&&=(window.clearInterval(b),void 0)}function M(e){t.textContent=e||`Idle`}async function N(e){let t=await fetch(e);if(!t.ok)throw Error(await t.text());return t.text()}async function P(e){return L(await fetch(e))}async function F(e,t){return L(await fetch(e,{method:`POST`,body:t}))}async function I(e,t){return L(await fetch(e,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)}))}async function L(e){let t=await e.json().catch(()=>null);if(!e.ok){let n=t&&typeof t==`object`&&`error`in t?String(t.error):e.statusText;throw Error(n)}return t}function R(e){let t=document.getElementById(e);if(!t)throw Error(`Missing #${e}`);return t}