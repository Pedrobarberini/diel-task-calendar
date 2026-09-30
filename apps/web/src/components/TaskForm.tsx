import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { dateKey, inputTime, localDateTimeToIso } from '../lib/calendar';
import type { Tag, Task } from '../types';

interface Props {
  task?: Task;
  day: Date;
  tags: Tag[];
  onClose: () => void;
  onSaved: () => void;
}

export function TaskForm({ task, day, tags, onClose, onSaved }: Props) {
  const start = task
    ? new Date(task.startsAt)
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api.saveTask(
        {
          title: String(fields.get('title')).trim(),
          description: String(fields.get('description')).trim(),
          startsAt: localDateTimeToIso(String(fields.get('date')), String(fields.get('time'))),
          durationMinutes: Number(fields.get('duration')),
          tagIds: fields.getAll('tagIds').map(String),
        },
        task?.id,
      );
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task || busy || !window.confirm('Excluir esta tarefa?')) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteTask(task.id);
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-panel" aria-labelledby="task-heading">
      <h2 id="task-heading">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <label>
            Título
            <input
              name="title"
              autoFocus
              required
              maxLength={160}
              defaultValue={task?.title || ''}
            />
          </label>
          <label>
            Descrição
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              defaultValue={task?.description || ''}
            />
          </label>
          <div className="form-row">
            <label>
              Data
              <input name="date" type="date" required defaultValue={dateKey(start)} />
            </label>
            <label>
              Horário
              <input name="time" type="time" required defaultValue={inputTime(start)} />
            </label>
            <label>
              Duração (minutos)
              <input
                name="duration"
                type="number"
                required
                min={1}
                max={10080}
                step={1}
                defaultValue={task?.durationMinutes || 60}
              />
            </label>
          </div>
          <fieldset className="tag-filters">
            <legend>Tags · selecione até 20</legend>
            <div className="tag-options">
              {tags.map((tag) => (
                <label className="tag-choice" key={tag.id}>
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    defaultChecked={task?.tags.some((item) => item.id === tag.id)}
                  />
                  <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </label>
              ))}
              {!tags.length && <p>Crie tags em “Gerenciar tags”.</p>}
            </div>
          </fieldset>
          <div className="actions">
            <button className="primary" type="submit">
              {busy ? 'Salvando…' : 'Salvar tarefa'}
            </button>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            {task && (
              <button className="danger" type="button" onClick={() => void remove()}>
                Excluir tarefa
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
