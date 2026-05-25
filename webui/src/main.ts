import './styles.css';

type OptionsResponse = {
  configNames: string[];
  imageNames: string[];
  paletteNames: string[];
  status: string;
};

type UploadResponse = {
  filename: string;
  imageNames: string[];
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing app root');
}

app.innerHTML = `
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
`;

const statusElement = getElement<HTMLSpanElement>('status');
const gifLink = getElement<HTMLAnchorElement>('gif-link');
const fileInput = getElement<HTMLInputElement>('file-input');
const fileHint = getElement<HTMLSpanElement>('file-hint');
const uploadButton = getElement<HTMLButtonElement>('upload-button');
const imageSelect = getElement<HTMLSelectElement>('image');
const configurationSelect = getElement<HTMLSelectElement>('configuration');
const paletteSelect = getElement<HTMLSelectElement>('palette');
const paletteUsageSelect = getElement<HTMLSelectElement>('palette-usage');
const colorDistanceInput = getElement<HTMLInputElement>('color-distance');
const autocontrastInput = getElement<HTMLInputElement>('autocontrast');
const controlsForm = getElement<HTMLFormElement>('controls');
const stopButton = getElement<HTMLButtonElement>('stop-button');
const progressImage = getElement<HTMLImageElement>('preview-image');
const progressLink = getElement<HTMLAnchorElement>('progress-link');
const previewTitle = getElement<HTMLHeadingElement>('preview-title');
const dropzone = getElement<HTMLLabelElement>('dropzone');

let pendingFile: File | null = null;
let pendingPreviewUrl: string | null = null;
let statusTimer: number | undefined;

void boot();

async function boot() {
  wireEvents();
  await refreshOptions();
  refreshProgressImage();
  startStatusPolling();
}

function wireEvents() {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0] ?? null;
    setPendingFile(file);
  });

  uploadButton.addEventListener('click', () => {
    void uploadPendingFile();
  });

  controlsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void startPainting();
  });

  stopButton.addEventListener('click', async () => {
    await fetch('/stop');
    setStatus('Idle');
    stopStatusPolling();
  });

  imageSelect.addEventListener('change', () => {
    if (imageSelect.value) {
      showServerImage(imageSelect.value);
    }
  });

  for (const eventName of ['dragenter', 'dragover']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragging');
    });
  }

  for (const eventName of ['dragleave', 'drop']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragging');
    });
  }

  dropzone.addEventListener('drop', (event) => {
    setPendingFile(event.dataTransfer?.files?.[0] ?? null);
  });
}

async function refreshOptions(selectedImage?: string) {
  const options = await getJson<OptionsResponse>('/api/options');
  fillSelect(configurationSelect, options.configNames, 'quick');
  fillSelect(paletteSelect, options.paletteNames, '(None)');
  fillSelect(imageSelect, options.imageNames, selectedImage ?? imageSelect.value);
  setStatus(options.status);

  if (imageSelect.value) {
    showServerImage(imageSelect.value);
  } else {
    previewTitle.textContent = 'Canvas';
    refreshProgressImage();
  }
}

function fillSelect(select: HTMLSelectElement, values: string[], preferredValue?: string) {
  select.replaceChildren(
    ...values.map((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      return option;
    }),
  );

  if (preferredValue && values.includes(preferredValue)) {
    select.value = preferredValue;
  }
}

function setPendingFile(file: File | null) {
  pendingFile = file;
  uploadButton.disabled = !file;

  if (pendingPreviewUrl) {
    URL.revokeObjectURL(pendingPreviewUrl);
    pendingPreviewUrl = null;
  }

  if (!file) {
    fileHint.textContent = 'PNG, JPG, GIF, or WebP';
    return;
  }

  pendingPreviewUrl = URL.createObjectURL(file);
  progressImage.src = pendingPreviewUrl;
  progressLink.href = pendingPreviewUrl;
  previewTitle.textContent = file.name;
  fileHint.textContent = `${file.name} ready to upload`;
}

async function uploadPendingFile() {
  if (!pendingFile) {
    return imageSelect.value;
  }

  uploadButton.disabled = true;
  uploadButton.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('image', pendingFile);

  try {
    const upload = await postForm<UploadResponse>('/api/images', formData);
    pendingFile = null;
    fileInput.value = '';
    fileHint.textContent = `${upload.filename} uploaded`;
    fillSelect(imageSelect, upload.imageNames, upload.filename);
    showServerImage(upload.filename);
    return upload.filename;
  } finally {
    uploadButton.textContent = 'Upload selected image';
    uploadButton.disabled = !pendingFile;
  }
}

async function startPainting() {
  const image = pendingFile ? await uploadPendingFile() : imageSelect.value;
  if (!image) {
    setStatus('Choose an image first');
    return;
  }

  setStatus('Starting');
  gifLink.classList.add('hidden');
  await postJson('/start', {
    image,
    configuration: configurationSelect.value,
    palette: paletteSelect.value,
    palette_usage: paletteUsageSelect.value,
    color_distance_threshold: colorDistanceInput.value,
    autocontrast: autocontrastInput.value,
  });
  refreshProgressImage();
  startStatusPolling();
}

function showServerImage(filename: string) {
  const url = `/api/images/${encodeURIComponent(filename)}`;
  previewTitle.textContent = filename;
  progressImage.src = url;
  progressLink.href = url;
}

function refreshProgressImage() {
  const url = `/progress.jpg?${Date.now()}`;
  progressImage.src = url;
  progressLink.href = url;
}

function startStatusPolling() {
  stopStatusPolling();
  statusTimer = window.setInterval(async () => {
    const status = await fetchText('/status');
    setStatus(status);
    refreshProgressImage();

    if (status === 'Done') {
      gifLink.href = `/progress.gif?${Date.now()}`;
      gifLink.classList.remove('hidden');
      stopStatusPolling();
    } else if (status === 'Idle') {
      stopStatusPolling();
    }
  }, 2000);
}

function stopStatusPolling() {
  if (statusTimer) {
    window.clearInterval(statusTimer);
    statusTimer = undefined;
  }
}

function setStatus(status: string) {
  statusElement.textContent = status || 'Idle';
}

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.text();
}

async function getJson<T>(url: string) {
  const response = await fetch(url);
  return parseJson<T>(response);
}

async function postForm<T>(url: string, body: FormData) {
  const response = await fetch(url, {
    method: 'POST',
    body,
  });
  return parseJson<T>(response);
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

async function parseJson<T = unknown>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String(data.error) : response.statusText;
    throw new Error(message);
  }
  return data as T;
}

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element as T;
}
