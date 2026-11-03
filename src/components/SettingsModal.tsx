import { useState } from 'react';
import { useStudio } from '../store/studio';
import { Btn, Field, Modal, Select, Slider, TextInput } from './ui';
import { callLlm, DEFAULT_BASE, IMAGE_MODELS, MODEL_SUGGESTIONS, PROVIDER_LABEL, supportsReferences } from '../ai/providers';
import type { AiConfig } from '../store/types';

const PROVIDERS: AiConfig['provider'][] = ['offline', 'openai', 'anthropic', 'gemini', 'openrouter', 'ollama', 'custom'];

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project, update, toast } = useStudio();
  const [testing, setTesting] = useState(false);
  const ai = project.ai;

  const setAi = (patch: Partial<AiConfig>) => update((p) => Object.assign(p.ai, patch));

  const test = async () => {
    setTesting(true);
    try {
      const res = await callLlm(ai, [
        { role: 'system', content: 'You are a connection test. Reply with the single word: READY.' },
        { role: 'user', content: 'ping' },
      ]);
      toast(`Connected — ${res.model} replied: ${res.text.trim().slice(0, 40)}`, 'ok');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Connection failed', 'err');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Studio settings"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="soft" icon="refresh" loading={testing} onClick={test} disabled={ai.provider === 'offline'}>
            Test connection
          </Btn>
        </>
      }
    >
      <div className="stack gap-16">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Language model</div>
          <div className="form-grid">
            <Field label="Provider" hint="Offline mode uses the built-in protocol engine — no key, no network.">
              <Select
                value={ai.provider}
                onChange={(e) => {
                  const provider = e.target.value as AiConfig['provider'];
                  setAi({
                    provider,
                    model: MODEL_SUGGESTIONS[provider]?.[0] ?? ai.model,
                    baseUrl: DEFAULT_BASE[provider] ?? '',
                  });
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Model">
              <TextInput
                list="model-suggestions"
                value={ai.model}
                onChange={(e) => setAi({ model: e.target.value })}
                placeholder="model id"
              />
              <datalist id="model-suggestions">
                {(MODEL_SUGGESTIONS[ai.provider] ?? []).map((m) => <option key={m} value={m} />)}
              </datalist>
            </Field>
          </div>
        </div>

        <Field
          label="API key"
          hint="Stored only in this browser's localStorage and sent directly to the provider. No server, no proxy, no telemetry."
        >
          <TextInput
            type="password"
            value={ai.apiKey}
            onChange={(e) => setAi({ apiKey: e.target.value })}
            placeholder={ai.provider === 'ollama' ? 'not required for local Ollama' : 'sk-…'}
            autoComplete="off"
          />
        </Field>

        <div className="form-grid">
          <Field label="Base URL" hint={`Default: ${DEFAULT_BASE[ai.provider] || 'set manually'}`}>
            <TextInput
              value={ai.baseUrl}
              onChange={(e) => setAi({ baseUrl: e.target.value })}
              placeholder={DEFAULT_BASE[ai.provider] || 'https://…/v1'}
            />
          </Field>
          <Field label={`Temperature — ${ai.temperature.toFixed(1)}`} hint="0.6 for tight structure, 0.9 for wilder beats.">
            <Slider
              label=""
              min={0}
              max={1.2}
              step={0.05}
              value={ai.temperature}
              onChange={(v) => setAi({ temperature: v })}
              format={(v) => v.toFixed(2)}
            />
          </Field>
        </div>

        <div className="hr" />

        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Image generation</div>
          <div className="form-grid">
            <Field
              label="Image provider"
              hint="OpenAI (gpt-image) and Gemini accept your character reference sheets. Storyboard mode draws accurate blocking frames in-app, with no key."
            >
              <Select
                value={ai.imageProvider}
                onChange={(e) =>
                  setAi({
                    imageProvider: e.target.value as AiConfig['imageProvider'],
                    imageModel: IMAGE_MODELS[e.target.value]?.[0] ?? ai.imageModel,
                  })
                }
              >
                <option value="placeholder">Storyboard art (offline)</option>
                <option value="openai">OpenAI Images · accepts refs</option>
                <option value="gemini">Google Gemini image · accepts refs</option>
                <option value="pollinations">Pollinations (no key, experimental)</option>
                <option value="upload">Upload my own art</option>
              </Select>
            </Field>
            <Field
              label="Image model"
              hint={supportsReferences(ai) ? 'Reference sheets will be attached to each render.' : 'This provider ignores reference sheets.'}
            >
              <TextInput
                list="image-models"
                value={ai.imageModel}
                onChange={(e) => setAi({ imageModel: e.target.value })}
                placeholder="gpt-image-1"
              />
              <datalist id="image-models">
                {(IMAGE_MODELS[ai.imageProvider] ?? []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
          </div>
        </div>

        <div className="notice">
          <strong>Reference memory:</strong> a character's portrait and full-body sheets are sent alongside the prompt, so the
          model matches an existing design instead of inventing one. Storyboard art and Pollinations render text-to-image only.
        </div>

        <div className="notice">
          <strong>How this stays safe:</strong> everything runs in your browser. Keys are never sent anywhere except the
          provider you pick, and there is no backend in this app to leak them.
        </div>

        <div className="row between">
          <span className="tiny dim">Manhwa Maker Studio v1.0</span>
          <Btn
            size="sm"
            variant="danger"
            onClick={() => {
              setAi({ provider: 'offline', apiKey: '', baseUrl: '', imageProvider: 'placeholder' });
              toast('AI settings reset', 'info');
            }}
          >
            Reset AI settings
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
