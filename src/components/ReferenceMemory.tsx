import { useMemo, useRef, useState } from 'react';
import type { Character, CharacterVersion, SheetKind, VersionType } from '../store/types';
import { uid } from '../store/types';
import { useStudio } from '../store/studio';
import { Badge, Btn, Field, Icon, Modal, TextArea, TextInput, cx } from './ui';
import { blobToDataUrl } from '../ai/providers';
import { copyText } from '../lib/export';
import { sheetPrompt } from '../lib/prompt';
import {
  makeVersion,
  refStatus,
  REQUIRED_SHEETS,
  SHEETS,
  VERSION_LABEL,
  VERSION_RULE,
  versionsFor,
  versionSlug,
} from '../lib/references';

// ---------------------------------------------------------------------------
// Reference memory: the visual memory of a manhwa. Every character owns
// versions (base → variant / evolution), every version owns sheets, and panels
// bind to a version. Nothing here is decoration: a portrait + full-body sheet is
// what stops the model from redesigning a face on panel 14.
// ---------------------------------------------------------------------------

export function ReferenceMemory({
  character,
  open,
  onClose,
}: {
  character: Character | null;
  open: boolean;
  onClose: () => void;
}) {
  const { project, update, putAsset, removeAsset, resolve, toast } = useStudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ versionId: string; kind: SheetKind } | null>(null);

  const versions = character ? versionsFor(project, character.id) : [];
  const active =
    versions.find((v) => v.id === selectedId) ??
    versions.find((v) => v.type === 'base') ??
    versions[0] ??
    null;

  const patch = (versionId: string, recipe: (v: CharacterVersion) => void) =>
    update((p) => {
      const v = p.versions.find((x) => x.id === versionId);
      if (v) recipe(v);
    });

  const addVersion = (type: VersionType) => {
    if (!character) return;
    const name = window.prompt(
      type === 'evolution' ? 'Evolution name (e.g. "Awakened form")' : 'Variant name (e.g. "Ep.4 winter coat")',
      type === 'evolution' ? 'Awakened form' : 'New variant',
    );
    if (name === null) return;
    const parent = active ?? versions.find((v) => v.type === 'base');
    const v = makeVersion(project, character.id, parent, type, name.trim() || VERSION_LABEL[type]);
    update((p) => {
      p.versions.push(v);
    });
    setSelectedId(v.id);
    toast(`${VERSION_LABEL[type]} created — it inherits ${parent ? parent.name : 'nothing yet'}`, 'ok');
  };

  const copySheet = async (v: CharacterVersion, kind: SheetKind) => {
    if (!character) return;
    const ok = await copyText(sheetPrompt(project, character, v, kind));
    toast(ok ? `${SHEETS.find((s) => s.kind === kind)?.label} prompt copied` : 'Copy failed', ok ? 'ok' : 'err');
  };

  const setImage = async (versionId: string, kind: SheetKind, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('That is not an image file', 'warn');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast('Keep reference sheets under 12 MB', 'warn');
      return;
    }
    try {
      const ref = await putAsset(await blobToDataUrl(file));
      patch(versionId, (v) => {
        v.images[kind] = ref;
      });
      toast('Reference sheet attached', 'ok');
    } catch {
      toast('Could not read that image', 'err');
    }
  };

  const status = useMemo(
    () => (character && active ? refStatus(project, character.id, active.id) : null),
    [character, active, project],
  );

  if (!character) return null;

  return (
    <Modal open={open} onClose={onClose} wide title={`Reference memory — ${character.name}`}>
      <div className="ref-shell">
        <aside className="ref-versions">
          <div className="eyebrow">Versions</div>
          <div className="ref-version-list">
            {versions.map((v) => {
              const st = refStatus(project, character.id, v.id);
              return (
                <button
                  key={v.id}
                  className={cx('ref-version', active?.id === v.id && 'is-active')}
                  onClick={() => setSelectedId(v.id)}
                >
                  <span className="ref-version-name">
                    <span className={cx('ref-dot', `is-${v.type}`)} />
                    {v.name}
                  </span>
                  <span className="ref-version-meta">
                    {VERSION_LABEL[v.type]} · {st.total}/5 {v.approved ? '· approved' : ''}
                  </span>
                </button>
              );
            })}
            {!versions.length && <div className="tiny dim">No versions yet.</div>}
          </div>
          <div className="ref-add">
            <Btn size="sm" variant="soft" icon="plus" onClick={() => addVersion('variant')}>
              Variant
            </Btn>
            <Btn size="sm" variant="ghost" icon="spark" onClick={() => addVersion('evolution')}>
              Evolution
            </Btn>
          </div>
          <p className="tiny dim ref-rule">
            Base designs are never overwritten. A costume, injury, time skip or awakening becomes its own version with its own
            sheets — and the panels that need it bind to it.
          </p>
        </aside>

        <section className="ref-editor">
          {!active && (
            <div className="empty-inline">
              <Icon name="user" size={18} />
              <div>
                <strong>No base version yet.</strong>
                <div className="tiny dim">Create a base version to start the character's visual memory.</div>
                <Btn size="sm" variant="primary" icon="plus" onClick={() => addVersion('variant')} style={{ marginTop: 10 }}>
                  Create a version
                </Btn>
              </div>
            </div>
          )}

          {active && (
            <>
              <div className="row between ref-head">
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <Badge tone={active.type === 'base' ? 'neutral' : active.type === 'evolution' ? 'warn' : 'info'} dot>
                    {VERSION_LABEL[active.type]}
                  </Badge>
                  <input
                    className="input ref-name"
                    value={active.name}
                    onChange={(e) => patch(active.id, (v) => (v.name = e.target.value))}
                    aria-label="Version name"
                  />
                  <span className="tiny dim mono">{versionSlug(active.name, 'version')}</span>
                </div>
                <label className="toggle ref-approve">
                  <input
                    type="checkbox"
                    checked={active.approved}
                    onChange={(e) => patch(active.id, (v) => (v.approved = e.target.checked))}
                  />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  <span className="toggle-label">Approved for render</span>
                </label>
              </div>

              <p className="tiny dim ref-rule">{VERSION_RULE[active.type]}</p>

              <div className="ref-grid-2">
                <Field label="Design state" hint="What this version changes: wardrobe, damage, age, stage of power.">
                  <TextArea
                    rows={3}
                    value={active.description}
                    placeholder="Same face. Soaked charcoal coat gone black, shirt translucent at the collar, river mud to mid-calf."
                    onChange={(e) => patch(active.id, (v) => (v.description = e.target.value))}
                  />
                </Field>
                <Field
                  label="Lineage markers"
                  hint="Comma separated. These must survive every render of this version."
                >
                  <TextInput
                    value={active.identityMarkers.join(', ')}
                    placeholder="chipped jade badge, left lapel, tired narrow eyes"
                    onChange={(e) =>
                      patch(active.id, (v) => {
                        v.identityMarkers = e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                      })
                    }
                  />
                  <div className="row gap-4" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                    {active.identityMarkers.map((m) => (
                      <span className="chip chip-static" key={m}>{m}</span>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="row between ref-sheets-head">
                <div className="eyebrow">Reference sheets</div>
                <div className="row gap-6" style={{ alignItems: 'center' }}>
                  <span className={cx('tiny', status && status.total >= 2 ? 'ok-text' : 'dim')}>
                    {status?.total ?? 0}/5 attached
                  </span>
                  {REQUIRED_SHEETS.some((k) => !active.images[k]) && (
                    <Badge tone="warn">portrait + full body required</Badge>
                  )}
                </div>
              </div>

              <div className="ref-sheets">
                {SHEETS.map((sheet) => {
                  const src = resolve(active.images[sheet.kind]);
                  const required = REQUIRED_SHEETS.includes(sheet.kind);
                  return (
                    <div className={cx('ref-sheet', src && 'has-image')} key={sheet.kind}>
                      <button
                        className="ref-sheet-frame"
                        title={src ? 'Replace sheet' : 'Attach sheet'}
                        onClick={() => {
                          target.current = { versionId: active.id, kind: sheet.kind };
                          fileRef.current?.click();
                        }}
                      >
                        {src ? (
                          <img src={src} alt={`${sheet.label} reference`} />
                        ) : (
                          <span className="ref-sheet-empty">
                            <Icon name="image" size={18} />
                            <span>{required ? 'required' : 'optional'}</span>
                          </span>
                        )}
                      </button>
                      <div className="ref-sheet-body">
                        <div className="row between">
                          <strong className="tiny">{sheet.label}</strong>
                          {src ? (
                            <button
                              className="link-btn tiny"
                              onClick={() =>
                                patch(active.id, (v) => {
                                  removeAsset(v.images[sheet.kind]);
                                  delete v.images[sheet.kind];
                                })
                              }
                            >
                              remove
                            </button>
                          ) : null}
                        </div>
                        <p className="tiny dim ref-sheet-why">{sheet.why}</p>
                        <div className="row gap-4">
                          <Btn size="sm" variant="ghost" icon="copy" onClick={() => void copySheet(active, sheet.kind)}>
                            Prompt
                          </Btn>
                          <Btn
                            size="sm"
                            variant="ghost"
                            icon="upload"
                            onClick={() => {
                              target.current = { versionId: active.id, kind: sheet.kind };
                              fileRef.current?.click();
                            }}
                          >
                            {src ? 'Swap' : 'Attach'}
                          </Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="tiny dim ref-foot">
                Generate each sheet with the copied prompt in your image tool, then attach it here. Rendering a panel with a
                character version that has no sheets is what causes drift — the studio only attaches sheets that exist.
              </p>
            </>
          )}
        </section>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const t = target.current;
          if (file && t) await setImage(t.versionId, t.kind, file);
          e.target.value = '';
          target.current = null;
        }}
      />
    </Modal>
  );
}

/** Compact badge for cast cards: how much visual memory this character owns. */
export function RefBadge({ characterId }: { characterId: string }) {
  const { project } = useStudio();
  const versions = versionsFor(project, characterId);
  const sheets = versions.reduce((n, v) => n + refStatus(project, characterId, v.id).total, 0);
  const approved = versions.some((v) => v.approved && refStatus(project, characterId, v.id).total > 0);
  return (
    <Badge tone={approved ? 'ok' : sheets ? 'warn' : 'neutral'} dot>
      {sheets ? `${sheets} sheet${sheets === 1 ? '' : 's'}` : 'no refs'}
    </Badge>
  );
}

export const newVersionId = () => uid('ver');
