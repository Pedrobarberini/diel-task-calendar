import { useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Tag } from '../types';
import { Dialog } from './Dialog';

const COLORS = [
  '#3B806B',
  '#597DC0',
  '#AE78B3',
  '#D99B42',
  '#D37370',
  '#6C8290',
  '#738A49',
  '#A37654',
];
interface TagsDialogProps {
  tags: Tag[];
  onClose: () => void;
  onChanged: () => void;
}

export function TagsDialog({ tags, onClose, onChanged }: TagsDialogProps) {
  const [items, setItems] = useState(tags);
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string>();

  function reset() {
    setEditingId(undefined);
    setName('');
    setColor(COLORS[0]);
    setError('');
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Informe um nome para a tag.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await api.saveTag({ name: name.trim(), color }, editingId);
      setItems((current) =>
        (editingId
          ? current.map((item) => (item.id === editingId ? saved : item))
          : [...current, saved]
        ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      );
      reset();
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await api.deleteTag(id);
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) reset();
      setDeletingId(undefined);
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Suas tags, seu jeito"
      subtitle="Use cores para encontrar o que importa."
      onClose={onClose}
      busy={busy}
      className="tags-dialog"
    >
      <div className="managed-tags">
        {items.length ? (
          items.map((tag) => (
            <div key={tag.id} className="managed-tag">
              <span className="tag-dot" style={{ background: tag.color }} />
              <span className="managed-tag-name">{tag.name}</span>
              <button
                className="icon-button"
                type="button"
                disabled={busy}
                aria-label={'Editar tag ' + tag.name}
                onClick={() => {
                  setEditingId(tag.id);
                  setName(tag.name);
                  setColor(tag.color);
                  setError('');
                  setDeletingId(undefined);
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button danger-text"
                type="button"
                disabled={busy}
                aria-label={'Excluir tag ' + tag.name}
                onClick={() => setDeletingId(tag.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <div className="tags-empty">
            <TagIcon size={25} />
            <p>A organização começa com a primeira tag.</p>
          </div>
        )}
      </div>
      {deletingId && (
        <div className="delete-confirmation" role="alert">
          <p>
            <strong>Excluir “{items.find((tag) => tag.id === deletingId)?.name}”?</strong> A tag
            será removida das tarefas. As tarefas serão mantidas.
          </p>
          <div>
            <button
              type="button"
              className="button ghost"
              disabled={busy}
              onClick={() => setDeletingId(undefined)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => remove(deletingId)}
            >
              {busy ? 'Excluindo…' : 'Excluir tag'}
            </button>
          </div>
        </div>
      )}
      <form className="tag-create-form" onSubmit={save}>
        <h3>{editingId ? 'Editar tag' : 'Criar uma tag'}</h3>
        <fieldset className="form-fields" disabled={busy}>
          <label className="field">
            Nome
            <input
              autoFocus
              required
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Trabalho, Estudos, Pessoal"
            />
          </label>
          <fieldset className="color-picker">
            <legend>Cor</legend>
            <div className="color-options">
              {COLORS.map((option) => (
                <label
                  key={option}
                  className={
                    'color-option' +
                    (color.toLowerCase() === option.toLowerCase() ? ' selected' : '')
                  }
                  style={{ background: option }}
                >
                  <input
                    type="radio"
                    name="tag-color"
                    value={option}
                    checked={color.toLowerCase() === option.toLowerCase()}
                    onChange={() => setColor(option)}
                    aria-label={'Cor ' + option}
                  />
                  {color.toLowerCase() === option.toLowerCase() && <Check size={17} />}
                </label>
              ))}
              <label className="custom-color" title="Escolher outra cor">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Escolher outra cor"
                />
              </label>
            </div>
          </fieldset>
        </fieldset>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="tag-form-actions">
          {editingId && (
            <button type="button" className="button ghost" disabled={busy} onClick={reset}>
              Cancelar edição
            </button>
          )}
          <button className="button primary" type="submit" disabled={busy}>
            <Plus size={16} />
            {busy ? 'Salvando…' : editingId ? 'Salvar tag' : 'Adicionar tag'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
