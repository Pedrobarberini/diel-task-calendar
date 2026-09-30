import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import type { Tag } from '../types';

interface Props {
  tags: Tag[];
  onClose: () => void;
  onChanged: () => void;
}

export function TagsForm({ tags, onClose, onChanged }: Props) {
  const [editing, setEditing] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api.saveTag(
        { name: String(fields.get('name')).trim(), color: String(fields.get('color')) },
        editing?.id,
      );
      form.reset();
      setEditing(null);
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function remove(tag: Tag) {
    if (busy || !window.confirm(`Excluir a tag “${tag.name}”? As tarefas serão mantidas.`)) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteTag(tag.id);
      if (editing?.id === tag.id) setEditing(null);
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-panel" aria-labelledby="tags-heading">
      <div className="panel-heading">
        <h2 id="tags-heading">Gerenciar tags</h2>
        <button disabled={busy} onClick={onClose}>
          Fechar
        </button>
      </div>
      <ul className="tag-list">
        {tags.map((tag) => (
          <li key={tag.id}>
            <span>
              <i className="tag-dot" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </span>
            <div className="actions">
              <button
                disabled={busy}
                onClick={() => {
                  setEditing(tag);
                  setError('');
                }}
                aria-label={'Editar tag ' + tag.name}
              >
                Editar
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => void remove(tag)}
                aria-label={'Excluir tag ' + tag.name}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!tags.length && <p>Nenhuma tag cadastrada.</p>}
      <h3>{editing ? 'Editar tag' : 'Nova tag'}</h3>
      <form key={editing?.id || 'new'} onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="form-row">
            <label>
              Nome
              <input name="name" required maxLength={40} defaultValue={editing?.name || ''} />
            </label>
            <label>
              Cor
              <input name="color" type="color" defaultValue={editing?.color || '#25634a'} />
            </label>
          </div>
          <div className="actions">
            <button className="primary" type="submit">
              {busy ? 'Salvando…' : 'Salvar tag'}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(null)}>
                Cancelar edição
              </button>
            )}
          </div>
        </fieldset>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
