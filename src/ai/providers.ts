import type { AiConfig } from '../store/types';

// ---------------------------------------------------------------------------
// Bring-your-own-key providers. Everything runs from the browser: no server,
// no proxy, no key ever leaves your machine except to the provider you chose.
// ---------------------------------------------------------------------------

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  text: string;
  provider: string;
  model: string;
}

export const DEFAULT_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434',
  custom: '',
  offline: '',
};

export const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  openrouter: ['anthropic/claude-sonnet-4', 'openai/gpt-4o-mini', 'google/gemini-2.5-pro', 'meta-llama/llama-3.3-70b-instruct'],
  ollama: ['llama3.1', 'qwen2.5:14b', 'mistral-nemo'],
  custom: ['your-model'],
  offline: ['protocol-engine'],
};

const trimBase = (b: string) => b.replace(/\/+$/, '');

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 90000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 400);
      try {
        const j = JSON.parse(text);
        detail = j?.error?.message ?? j?.error ?? detail;
      } catch {
        /* keep raw */
      }
      throw new Error(`${res.status} ${res.statusText} — ${detail}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

/** Chat completion across the six supported shapes. */
export async function callLlm(
  cfg: AiConfig,
  messages: LlmMessage[],
  opts: { json?: boolean } = {},
): Promise<LlmResult> {
  const base = trimBase(cfg.baseUrl || DEFAULT_BASE[cfg.provider] || '');
  const key = cfg.apiKey.trim();

  if (cfg.provider !== 'ollama' && cfg.provider !== 'offline' && !key) {
    throw new Error('No API key set. Add one in Settings, or switch to the offline protocol engine.');
  }

  if (cfg.provider === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const rest = messages.filter((m) => m.role !== 'system');
    const data = await postJson(
      `${base}/v1/messages`,
      {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      {
        model: cfg.model,
        max_tokens: 4096,
        temperature: cfg.temperature,
        system,
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      },
    );
    const text = (data.content ?? [])
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n');
    return { text, provider: 'anthropic', model: cfg.model };
  }

  if (cfg.provider === 'gemini') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const data = await postJson(
      `${base}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(key)}`,
      {},
      {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: cfg.temperature,
          maxOutputTokens: 8192,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      },
    );
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('\n');
    return { text, provider: 'gemini', model: cfg.model };
  }

  if (cfg.provider === 'ollama') {
    const data = await postJson(
      `${base}/api/chat`,
      {},
      {
        model: cfg.model,
        stream: false,
        options: { temperature: cfg.temperature },
        messages,
        ...(opts.json ? { format: 'json' } : {}),
      },
    );
    return { text: data.message?.content ?? '', provider: 'ollama', model: cfg.model };
  }

  // OpenAI-compatible: openai, openrouter, custom
  const headers: Record<string, string> = { authorization: `Bearer ${key}` };
  if (cfg.provider === 'openrouter') {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'Manhwa Maker Studio';
  }
  const data = await postJson(
    `${base}/chat/completions`,
    headers,
    {
      model: cfg.model,
      temperature: cfg.temperature,
      messages,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    },
  );
  const text = data.choices?.[0]?.message?.content ?? '';
  return { text, provider: cfg.provider, model: cfg.model };
}

/** Pull JSON out of a model response, tolerating fences and chatter. */
export function extractJson<T>(text: string): T {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  const tryParse = (s: string): T | null => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  };
  const direct = tryParse(cleaned);
  if (direct) return direct;

  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');
  let start = -1;
  if (objStart === -1) start = arrStart;
  else if (arrStart === -1) start = objStart;
  else start = Math.min(objStart, arrStart);
  if (start === -1) throw new Error('The model did not return JSON.');

  const openCh = cleaned[start];
  const closeCh = openCh === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        const parsed = tryParse(slice);
        if (parsed) return parsed;
        break;
      }
    }
  }
  throw new Error('Could not parse the JSON returned by the model. Try again or lower the temperature.');
}

/** Models that accept a reference image next to the prompt. */
export const IMAGE_MODELS: Record<string, string[]> = {
  openai: ['gpt-image-1', 'gpt-image-1-mini', 'dall-e-3'],
  gemini: ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation'],
  pollinations: ['flux', 'turbo'],
  upload: [],
  placeholder: [],
};

/** Can this provider condition on the studio's character reference sheets? */
export function supportsReferences(cfg: AiConfig): boolean {
  if (cfg.imageProvider === 'gemini') return true;
  if (cfg.imageProvider === 'openai') return (cfg.imageModel || 'gpt-image-1').includes('gpt-image');
  return false;
}

export interface ImageOptions {
  negative?: string;
  aspect?: string;
  seed?: number;
  /** Reference sheets (data: or http URLs) to condition on — character memory. */
  refs?: string[];
}

const splitDataUrl = (url: string): { mime: string; b64: string } | null => {
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(url);
  return m ? { mime: m[1], b64: m[2] } : null;
};

function dataUrlToBlob(url: string): Blob {
  const parts = splitDataUrl(url);
  if (!parts) throw new Error('A reference image could not be read (expected a data URL).');
  const bin = atob(parts.b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: parts.mime });
}

/** Image generation. Returns a data URL, or null when using the storyboard engine. */
export async function callImage(cfg: AiConfig, prompt: string, opts: ImageOptions = {}): Promise<string | null> {
  if (cfg.imageProvider === 'placeholder') return null;
  const refs = (opts.refs ?? []).filter(Boolean).slice(0, 4);
  const fullPrompt = opts.negative ? `${prompt}\n\nAvoid: ${opts.negative}` : prompt;

  if (cfg.imageProvider === 'pollinations') {
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1800))}` +
      `?width=832&height=1216&seed=${opts.seed ?? 42}&nologo=true&model=flux`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pollinations returned ${res.status}. Try again or use your own key.`);
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  }

  if (cfg.imageProvider === 'gemini') {
    const base = trimBase(cfg.baseUrl || DEFAULT_BASE.gemini);
    const key = cfg.apiKey.trim();
    if (!key) throw new Error('Gemini image generation needs a Google AI Studio key.');
    const model = cfg.imageModel || 'gemini-2.5-flash-image';
    const parts: unknown[] = [{ text: fullPrompt }];
    refs.forEach((r) => {
      const d = splitDataUrl(r);
      if (d) parts.push({ inlineData: { mimeType: d.mime, data: d.b64 } });
    });
    if (refs.length) parts.splice(1, 0, { text: 'Use the attached character reference sheets as the visual reference for identity, costume and proportions.' });
    const data = await postJson(
      `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {},
      { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'] } },
      180000,
    );
    const out = (data.candidates?.[0]?.content?.parts ?? []) as Array<Record<string, any>>;
    const inline = out.map((p) => p.inlineData ?? p.inline_data).find((d) => d?.data);
    if (inline?.data) return `data:${inline.mimeType ?? inline.mime_type ?? 'image/png'};base64,${inline.data}`;
    throw new Error('Gemini returned no image. Check that the model supports image output.');
  }

  // openai images (optionally conditioned on reference sheets)
  const base = trimBase(cfg.baseUrl || DEFAULT_BASE.openai);
  const key = cfg.apiKey.trim();
  if (!key) throw new Error('Image generation needs an OpenAI key, or switch to storyboard art.');
  const model = cfg.imageModel || 'gpt-image-1';
  const size = opts.aspect && /^\d+x\d+$/.test(opts.aspect) ? mapSize(opts.aspect) : '1024x1536';

  let data: any;
  if (refs.length && model.includes('gpt-image')) {
    // /images/edits takes both the instruction and the reference images.
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', fullPrompt);
    form.append('size', size);
    form.append('n', '1');
    refs.forEach((r, i) => {
      const d = splitDataUrl(r);
      if (d) form.append('image[]', dataUrlToBlob(r), `reference-${i}.png`);
    });
    const res = await fetch(`${base}/images/edits`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` },
      body: form,
    });
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 400);
      try {
        detail = JSON.parse(text)?.error?.message ?? detail;
      } catch {
        /* keep raw */
      }
      throw new Error(`${res.status} ${res.statusText} — ${detail}`);
    }
    data = JSON.parse(text);
  } else {
    data = await postJson(
      `${base}/images/generations`,
      { authorization: `Bearer ${key}` },
      { model, prompt: fullPrompt, size, n: 1, response_format: model.includes('gpt-image') ? undefined : 'b64_json' },
      180000,
    );
  }
  const b64 = data.data?.[0]?.b64_json;
  const remote = data.data?.[0]?.url;
  if (b64) return `data:image/png;base64,${b64}`;
  if (remote) return remote as string;
  throw new Error('The image provider returned no image.');
}

function mapSize(aspect: string): string {
  const [w, h] = aspect.split('x').map(Number);
  if (!w || !h) return '1024x1536';
  const ratio = h / w;
  if (ratio > 1.15) return '1024x1536';
  if (ratio < 0.9) return '1536x1024';
  return '1024x1024';
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(blob);
  });
}

export const PROVIDER_LABEL: Record<string, string> = {
  offline: 'Offline protocol engine',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  ollama: 'Ollama (local)',
  custom: 'Custom OpenAI-compatible',
};
