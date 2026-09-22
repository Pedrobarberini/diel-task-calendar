import { useState, type FormEvent } from 'react';
import { Clock3, LoaderCircle, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { dateKey, durationLabel, inputTime, localDateTimeToIso } from '../lib/calendar';
import type { Tag, Task } from '../types';
import { Dialog } from './Dialog';

interface TaskDialogProps {
  task?: Task;
  day: Date;
  tags: Tag[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function TaskDialog({ task, day, tags, onClose, onSaved }: TaskDialogProps) {
  const start = task
    ? new Date(task.startsAt)
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9);
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [date, setDate] = useState(dateKey(start));
  const [time, setTime] = useState(inputTime(start));
  const [duration, setDuration] = useState(String(task?.durationMinutes || 60));
  const [tagIds, setTagIds] = useState(task?.tags.map((tag) => tag.id) || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Dê um título à sua tarefa.');
      return;
    }
    const durationMinutes = Number(duration);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) {
      setError('A duração deve ser um número inteiro entre 1 e 10.080 minutos.');
      return;
    }
    setBusy(true);
    try {
      await api.saveTask(
        {
          title: title.trim(),
          description: description.trim(),
          startsAt: localDateTimeToIso(date, time),
          durationMinutes,
          tagIds,
        },
        task?.id,
      );
      onSaved(
        task ? 'Tarefa atualizada.' : 'Tarefa criada. Seu próximo passo já está no calendário.',
      );
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteTask(task.id);
      onSaved('Tarefa excluída.');
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  function toggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <Dialog
      title={task ? 'Detalhes da tarefa' : 'Uma nova tarefa'}
      subtitle="Um passo de cada vez. Organize o que vem a seguir."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save} className="task-form">
        <fieldset disabled={busy} className="form-fields">
          <label className="field">
            Título <span className="required-label">obrigatório</span>
            <input
              autoFocus
              required
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="O que você vai fazer?"
            />
          </label>
          <label className="field">
            Descrição <span className="optional-label">opcional</span>
            <textarea
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Adicione contexto, ideias ou os próximos passos…"
            />
          </label>
          <div className="form-row">
            <label className="field">
              Data de início
              <input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="field">
              Horário
              <input
                required
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Duração em minutos
            <div className="duration-field">
              <input
                required
                type="number"
                min="1"
                max="10080"
                step="1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
              <span>
                <Clock3 size={14} />
                {Number(duration) > 0 ? durationLabel(Number(duration)) : '—'}
              </span>
            </div>
          </label>
          <fieldset className="tag-picker">
            <legend>
              Tags <span className="optional-label">opcional · até 20</span>
            </legend>
            {tags.length ? (
              <div className="tag-options">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className={'tag-option' + (tagIds.includes(tag.id) ? ' selected' : '')}
                  >
                    <input
                      type="checkbox"
                      checked={tagIds.includes(tag.id)}
                      disabled={!tagIds.includes(tag.id) && tagIds.length >= 20}
                      onChange={() => toggleTag(tag.id)}
                    />
                    <span className="tag-dot" style={{ background: tag.color }} />
                    {tag.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="field-hint">
                Crie tags em “Gerenciar tags” na barra lateral para organizar suas tarefas.
              </p>
            )}
          </fieldset>
          <p className="field-hint">Data e horário seguem o fuso do seu dispositivo.</p>
        </fieldset>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {confirmDelete ? (
          <div className="delete-confirmation" role="alert">
            <p>
              <strong>Excluir esta tarefa?</strong> Essa ação não pode ser desfeita.
            </p>
            <div>
              <button
                type="button"
                className="button ghost"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                Manter tarefa
              </button>
              <button type="button" className="button danger" disabled={busy} onClick={remove}>
                {busy ? 'Excluindo…' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        ) : (
          <footer className="dialog-footer">
            {task && (
              <button
                type="button"
                className="button delete-button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                Excluir
              </button>
            )}
            <div className="dialog-footer-actions">
              <button type="button" className="button ghost" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy && <LoaderCircle size={16} className="spin" />}
                {busy ? 'Salvando…' : task ? 'Salvar alterações' : 'Criar tarefa'}
              </button>
            </div>
          </footer>
        )}
      </form>
    </Dialog>
  );
}
