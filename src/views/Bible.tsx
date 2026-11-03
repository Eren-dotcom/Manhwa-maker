import { useState } from 'react';
import { useStudio } from '../store/studio';
import type { Character } from '../store/types';
import { uid } from '../store/types';
import { ROLE_LABELS } from '../store/constants';
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  Icon,
  IconBtn,
  Modal,
  SectionHead,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';
import { StageNav } from '../components/StageNav';
import { useAction } from '../components/useAction';
import { RefBadge, ReferenceMemory } from '../components/ReferenceMemory';
import { copyText } from '../lib/export';
import { ensureBaseVersions } from '../lib/references';

type Tab = 'world' | 'cast';

export function Bible() {
  const { project, update, toast } = useStudio();
  const { run, busy } = useAction();
  const [tab, setTab] = useState<Tab>('world');
  const [editing, setEditing] = useState<string | null>(null);
  const [refsFor, setRefsFor] = useState<string | null>(null);
  const refsCharacter = project.cast.find((c) => c.id === refsFor) ?? null;

  const setWorld = (patch: Partial<typeof project.world>) => update((p) => Object.assign(p.world, patch));
  const character = project.cast.find((c) => c.id === editing) ?? null;

  const addCharacter = () => {
    const c: Character = {
      id: uid('chr'),
      name: 'New character',
      koreanName: '',
      role: 'support',
      faceAnchor: '',
      age: '',
      pronouns: '',
      want: '',
      need: '',
      flaw: '',
      arc: '',
      silhouette: '',
      outfit: '',
      palette: '',
      voice: '',
      verbalTics: '',
      promptFragment: '',
      refPrompt: '',
    };
    update((p) => {
      p.cast.push(c);
    });
    setEditing(c.id);
  };

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 02 · Story bible"
        title="World, rules & cast"
        desc="The bible is not documentation — it is the prompt library. Rules generate plot, and each character’s visual anchor generates a consistent face."
        right={
          <>
            <Btn variant="ghost" icon="spark" loading={busy === 'world'} onClick={() => void run('world')}>Build world</Btn>
            <Btn variant="primary" icon="users" loading={busy === 'cast'} onClick={() => void run('cast')}>Cast the series</Btn>
          </>
        }
      />

      <div className="tabs">
        <button className={`tab ${tab === 'world' ? 'is-on' : ''}`} onClick={() => setTab('world')}>
          <Icon name="layers" size={14} /> World & rules
        </button>
        <button className={`tab ${tab === 'cast' ? 'is-on' : ''}`} onClick={() => setTab('cast')}>
          <Icon name="user" size={14} /> Cast ({project.cast.length})
        </button>
      </div>

      {tab === 'world' ? (
        <div className="split">
          <div className="stack gap-16">
            <Card>
              <div className="card-title">Premise</div>
              <Field label="The world in 120–180 words" hint="Sensory and specific. If it could describe three other series, rewrite it.">
                <TextArea rows={6} value={project.world.premise} onChange={(e) => setWorld({ premise: e.target.value })} placeholder="Cheonan is a city built on a river that does not always give its dead back…" />
              </Field>
            </Card>

            <Card>
              <div className="row between" style={{ marginBottom: 12 }}>
                <div>
                  <div className="card-title" style={{ marginBottom: 2 }}>Hard rules</div>
                  <div className="tiny dim">Every rule needs a cost, a limit, and a loophole someone will exploit.</div>
                </div>
                <Btn size="sm" icon="plus" variant="ghost" onClick={() => setWorld({ rules: [...project.world.rules, ''] })}>Rule</Btn>
              </div>
              <div className="stack gap-8">
                {project.world.rules.map((r, i) => (
                  <div className="list-row" key={i}>
                    <span className="list-num">{i + 1}</span>
                    <TextArea
                      rows={2}
                      value={r}
                      onChange={(e) => {
                        const next = [...project.world.rules];
                        next[i] = e.target.value;
                        setWorld({ rules: next });
                      }}
                      placeholder="One lantern per soul. Light a second for the same soul and both go out."
                    />
                    <IconBtn
                      icon="close"
                      label="Remove rule"
                      onClick={() => setWorld({ rules: project.world.rules.filter((_, j) => j !== i) })}
                    />
                  </div>
                ))}
                {!project.world.rules.length && <Empty icon="shield" title="No rules yet" desc="Rules are the difference between fantasy and wallpaper." />}
              </div>
            </Card>

            <div className="form-two">
              <Card>
                <div className="row between" style={{ marginBottom: 12 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>Locations</div>
                  <IconBtn icon="plus" label="Add location" onClick={() => setWorld({ locations: [...project.world.locations, ''] })} />
                </div>
                <div className="stack gap-6">
                  {project.world.locations.map((l, i) => (
                    <div className="row gap-6" key={i}>
                      <TextInput
                        value={l}
                        onChange={(e) => {
                          const next = [...project.world.locations];
                          next[i] = e.target.value;
                          setWorld({ locations: next });
                        }}
                        placeholder="The lower river — stepped stone banks, fog"
                      />
                      <IconBtn icon="close" label="Remove" onClick={() => setWorld({ locations: project.world.locations.filter((_, j) => j !== i) })} />
                    </div>
                  ))}
                  {!project.world.locations.length && <div className="tiny dim">Add 3–4 reusable sets — they also anchor panel backgrounds.</div>}
                </div>
              </Card>

              <Card>
                <div className="row between" style={{ marginBottom: 12 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>Visual motifs</div>
                  <IconBtn icon="plus" label="Add motif" onClick={() => setWorld({ visualMotifs: [...project.world.visualMotifs, ''] })} />
                </div>
                <div className="stack gap-6">
                  {project.world.visualMotifs.map((m, i) => (
                    <div className="row gap-6" key={i}>
                      <TextInput
                        value={m}
                        onChange={(e) => {
                          const next = [...project.world.visualMotifs];
                          next[i] = e.target.value;
                          setWorld({ visualMotifs: next });
                        }}
                        placeholder="Rain visible only where it crosses light"
                      />
                      <IconBtn icon="close" label="Remove" onClick={() => setWorld({ visualMotifs: project.world.visualMotifs.filter((_, j) => j !== i) })} />
                    </div>
                  ))}
                  {!project.world.visualMotifs.length && <div className="tiny dim">Motifs are the shorthand your readers will learn to read.</div>}
                </div>
              </Card>
            </div>
          </div>

          <aside className="stack gap-14">
            <Card>
              <div className="row between" style={{ marginBottom: 12 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Glossary</div>
                <IconBtn icon="plus" label="Add term" onClick={() => setWorld({ glossary: [...project.world.glossary, { term: '', meaning: '' }] })} />
              </div>
              <div className="stack gap-10">
                {project.world.glossary.map((g, i) => (
                  <div key={i} className="glossary-row">
                    <TextInput
                      value={g.term}
                      onChange={(e) => {
                        const next = [...project.world.glossary];
                        next[i] = { ...next[i], term: e.target.value };
                        setWorld({ glossary: next });
                      }}
                      placeholder="등불청"
                      style={{ fontFamily: 'var(--font-kr)' }}
                    />
                    <TextArea
                      rows={2}
                      value={g.meaning}
                      onChange={(e) => {
                        const next = [...project.world.glossary];
                        next[i] = { ...next[i], meaning: e.target.value };
                        setWorld({ glossary: next });
                      }}
                      placeholder="Lantern Bureau — the office that assigns escorts to the dead."
                    />
                    <button
                      className="link-btn"
                      onClick={() => setWorld({ glossary: project.world.glossary.filter((_, j) => j !== i) })}
                    >
                      remove
                    </button>
                  </div>
                ))}
                {!project.world.glossary.length && <div className="tiny dim">Terms reduce exposition: readers learn the word once, in the glossary and on the page.</div>}
              </div>
            </Card>

            <Card className="protocol-note">
              <div className="eyebrow">Rule audit</div>
              <ul className="checklist">
                <li className={project.world.premise.length > 120 ? 'ok' : ''}>Premise is sensory, not synoptic</li>
                <li className={project.world.rules.length >= 3 ? 'ok' : ''}>At least three hard rules with costs</li>
                <li className={project.world.locations.length >= 3 ? 'ok' : ''}>Reusable sets for background continuity</li>
                <li className={project.world.visualMotifs.length >= 3 ? 'ok' : ''}>Visual motifs the artist can repeat</li>
                <li className={project.cast.length >= 2 ? 'ok' : ''}>Protagonist + antagonist with anchors</li>
              </ul>
            </Card>
          </aside>
        </div>
      ) : (
        <div className="stack gap-16">
          <div className="row between wrap gap-10">
            <div className="row gap-8 wrap">
              <Badge tone="info">{project.cast.length} characters</Badge>
              <Badge>{project.cast.filter((c) => c.promptFragment).length} with visual anchors</Badge>
            </div>
            <Btn size="sm" icon="plus" onClick={addCharacter}>Add character</Btn>
          </div>

          {project.cast.length ? (
            <div className="cast-grid">
              {project.cast.map((c) => (
                <Card key={c.id} className="cast-card card-hover">
                  <div className="cast-card-head">
                    <div className="cast-portrait" data-role={c.role}>
                      <span>{c.name.slice(0, 1)}</span>
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row gap-6 wrap">
                        <strong className="cast-card-name">{c.name}</strong>
                        <Badge tone={c.role === 'protagonist' ? 'accent' : c.role === 'antagonist' ? 'err' : 'neutral'}>
                          {ROLE_LABELS[c.role] ?? c.role}
                        </Badge>
                        <RefBadge characterId={c.id} />
                      </div>
                      <div className="tiny dim" style={{ fontFamily: c.koreanName ? 'var(--font-kr)' : undefined }}>
                        {c.koreanName || '—'} · {c.age || 'age TBD'} · {c.pronouns}
                      </div>
                    </div>
                    <IconBtn icon="move" label="Edit" onClick={() => setEditing(c.id)} />
                  </div>
                  <div className="cast-want">
                    <div><span className="eyebrow">Want</span><p>{c.want || '—'}</p></div>
                    <div><span className="eyebrow">Need</span><p>{c.need || '—'}</p></div>
                  </div>
                  <div className="cast-anchor">
                    <div className="row between" style={{ alignItems: 'center' }}>
                      <span className="eyebrow">Face anchor</span>
                      <button
                        className="link-btn"
                        onClick={async () => {
                          const ok = await copyText(c.faceAnchor || c.promptFragment);
                          toast(ok ? 'Face anchor copied' : 'Copy failed', ok ? 'ok' : 'err');
                        }}
                      >
                        copy
                      </button>
                    </div>
                    <p className={c.faceAnchor || c.promptFragment ? 'mono tiny' : 'tiny dim'}>
                      {c.faceAnchor || c.promptFragment || 'No anchor — the model will redesign this face every panel.'}
                    </p>
                  </div>
                  <div className="row between cast-refs-row">
                    <span className="tiny dim">
                      {c.outfit ? `Outfit · ${c.outfit}` : 'No default outfit'}
                    </span>
                    <Btn size="sm" variant="soft" icon="layers" onClick={() => setRefsFor(c.id)}>
                      Reference memory
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              icon="user"
              title="No cast yet"
              desc="Generate a cast with the protocol engine, or add characters manually. Each one needs a 35–55 word visual anchor."
              action={<Btn icon="spark" variant="primary" loading={busy === 'cast'} onClick={() => void run('cast')}>Cast the series</Btn>}
            />
          )}
        </div>
      )}

      <Modal
        open={Boolean(character)}
        onClose={() => setEditing(null)}
        title={character ? `Edit — ${character.name}` : 'Character'}
        wide
        footer={
          <>
            <Btn
              variant="danger"
              icon="trash"
              onClick={() => {
                if (!character) return;
                update((p) => {
                  p.cast = p.cast.filter((c) => c.id !== character.id);
                  // reference memory is meaningless without the character it describes
                  p.versions = (p.versions ?? []).filter((v) => v.characterId !== character.id);
                  p.episodes.forEach((ep) =>
                    ep.panels.forEach((pn) => {
                      pn.characterIds = pn.characterIds.filter((id) => id !== character.id);
                      if (pn.versions) delete pn.versions[character.id];
                      if (pn.outfits) delete pn.outfits[character.id];
                    }),
                  );
                });
                setEditing(null);
                toast('Character removed', 'info');
              }}
            >
              Delete
            </Btn>
            <Btn variant="primary" onClick={() => setEditing(null)}>Done</Btn>
          </>
        }
      >
        {character && <CharacterForm character={character} />}
      </Modal>

      <ReferenceMemory character={refsCharacter} open={!!refsCharacter} onClose={() => setRefsFor(null)} />

      <StageNav stage="bible" />
    </div>
  );
}

function CharacterForm({ character }: { character: Character }) {
  const { update } = useStudio();
  const { run } = useAction();
  const set = (patch: Partial<Character>) =>
    update((p) => {
      const idx = p.cast.findIndex((c) => c.id === character.id);
      if (idx >= 0) p.cast[idx] = { ...p.cast[idx], ...patch };
    });

  return (
    <div className="stack gap-16">
      <div className="form-grid">
        <Field label="Name">
          <TextInput value={character.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Korean name">
          <TextInput
            value={character.koreanName}
            onChange={(e) => set({ koreanName: e.target.value })}
            style={{ fontFamily: 'var(--font-kr)' }}
          />
        </Field>
      </div>
      <div className="form-three">
        <Field label="Role">
          <Select value={character.role} onChange={(e) => set({ role: e.target.value as Character['role'] })}>
            {Object.entries(ROLE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Age">
          <TextInput value={character.age} onChange={(e) => set({ age: e.target.value })} />
        </Field>
        <Field label="Pronouns">
          <TextInput value={character.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Want" hint="Stated, pursued, visible on the page.">
          <TextArea rows={2} value={character.want} onChange={(e) => set({ want: e.target.value })} />
        </Field>
        <Field label="Need" hint="What the story proves they require.">
          <TextArea rows={2} value={character.need} onChange={(e) => set({ need: e.target.value })} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Flaw" hint="The reason they cannot have both.">
          <TextInput value={character.flaw} onChange={(e) => set({ flaw: e.target.value })} />
        </Field>
        <Field label="Arc">
          <TextInput value={character.arc} onChange={(e) => set({ arc: e.target.value })} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Silhouette" hint="Readable at 120px wide, in one glance.">
          <TextArea rows={2} value={character.silhouette} onChange={(e) => set({ silhouette: e.target.value })} />
        </Field>
        <Field label="Outfit" hint="Continuity critical — never change without a story reason.">
          <TextArea rows={2} value={character.outfit} onChange={(e) => set({ outfit: e.target.value })} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Voice">
          <TextArea rows={2} value={character.voice} onChange={(e) => set({ voice: e.target.value })} />
        </Field>
        <Field label="Verbal tics">
          <TextArea rows={2} value={character.verbalTics} onChange={(e) => set({ verbalTics: e.target.value })} />
        </Field>
      </div>
      <Field
        label="Face anchor (permanent identity)"
        hint="Face shape, eyes, hair, build, marks. No clothing, no mood — wardrobe belongs in Outfit so a costume change cannot redesign the face."
        right={
          <button
            className="link-btn"
            onClick={() =>
              set({
                faceAnchor: [character.name, character.age, character.silhouette]
                  .filter(Boolean)
                  .join(', '),
              })
            }
          >
            build from fields
          </button>
        }
      >
        <TextArea rows={3} className="mono" value={character.faceAnchor} onChange={(e) => set({ faceAnchor: e.target.value })} />
      </Field>
      <Field
        label="Visual anchor (prompt fragment)"
        hint="35–55 words. Legacy combined anchor — used when no face anchor is set. Hair, face, build, outfit, one prop."
        right={
          <button
            className="link-btn"
            onClick={() =>
              set({
                promptFragment: [character.name, character.age, character.outfit, character.silhouette]
                  .filter(Boolean)
                  .join(', '),
              })
            }
          >
            build from fields
          </button>
        }
      >
        <TextArea rows={4} className="mono" value={character.promptFragment} onChange={(e) => set({ promptFragment: e.target.value })} />
      </Field>
      <Field label="Reference sheet prompt" hint="Render this first and use it as an image reference.">
        <TextArea rows={3} className="mono" value={character.refPrompt} onChange={(e) => set({ refPrompt: e.target.value })} />
      </Field>
      <div className="row end gap-8">
        <Btn size="sm" variant="ghost" icon="spark" onClick={() => void run('cast')}>
          Re-cast everyone with AI
        </Btn>
      </div>
    </div>
  );
}
