import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { addMonthsClamped, dateKey, isSameDay, monthDays, WEEKDAYS } from '../lib/calendar';
import type { Tag } from '../types';

interface SidebarProps {
  date: Date;
  tags: Tag[];
  selectedTags: string[];
  onDate: (date: Date) => void;
  onToggleTag: (id: string) => void;
  onClearTags: () => void;
  onCreate: () => void;
  onManageTags: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  date,
  tags,
  selectedTags,
  onDate,
  onToggleTag,
  onClearTags,
  onCreate,
  onManageTags,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const today = new Date();
  return (
    <>
      {mobileOpen && (
        <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={onMobileClose} />
      )}
      <aside
        className={'sidebar' + (mobileOpen ? ' mobile-open' : '')}
        aria-label="Navegação e filtros"
      >
        <a className="brand" href="./" aria-label="Diel, página inicial">
          <span className="brand-mark">
            d<span>•</span>
          </span>
          <span>
            diel<span className="brand-period">.</span>
          </span>
        </a>
        <button
          className="icon-button sidebar-close"
          onClick={onMobileClose}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">SEU ESPAÇO</div>
        <div className="sidebar-current">
          <CalendarDays size={18} />
          <span>Calendário de tarefas</span>
          <span className="nav-active-dot" />
        </div>
        <button className="button primary new-task" onClick={onCreate}>
          <Plus size={19} />
          Nova tarefa<span className="button-hint">+</span>
        </button>
        <section className="mini-calendar" aria-label="Calendário compacto">
          <div className="mini-calendar-heading">
            <h2>{date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <div>
              <button
                className="icon-button small"
                onClick={() => onDate(addMonthsClamped(date, -1))}
                aria-label="Mês anterior no calendário compacto"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-button small"
                onClick={() => onDate(addMonthsClamped(date, 1))}
                aria-label="Próximo mês no calendário compacto"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="mini-calendar-grid">
            {WEEKDAYS.map((day) => (
              <span key={day} className="mini-weekday">
                {day[0]}
              </span>
            ))}
            {monthDays(date).map((day) => (
              <button
                key={dateKey(day)}
                className={
                  'mini-day' +
                  (day.getMonth() !== date.getMonth() ? ' outside-month' : '') +
                  (isSameDay(day, today) ? ' is-today' : '') +
                  (isSameDay(day, date) ? ' is-selected' : '')
                }
                onClick={() => {
                  onDate(day);
                  onMobileClose();
                }}
                aria-label={day.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                aria-current={isSameDay(day, today) ? 'date' : undefined}
                aria-pressed={isSameDay(day, date)}
              >
                {day.getDate()}
              </button>
            ))}
          </div>
        </section>
        <section className="sidebar-tags" aria-label="Filtrar por tags">
          <div className="sidebar-section-heading">
            <h2>MINHAS TAGS</h2>
            <button
              className="icon-button small"
              onClick={onManageTags}
              aria-label="Gerenciar tags"
            >
              <Settings2 size={16} />
            </button>
          </div>
          <p className="tag-filter-hint">Selecione até 20 tags para filtrar.</p>
          {tags.length ? (
            <div className="tag-filter-list">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className={'tag-filter' + (selectedTags.includes(tag.id) ? ' checked' : '')}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    disabled={!selectedTags.includes(tag.id) && selectedTags.length >= 20}
                    onChange={() => onToggleTag(tag.id)}
                  />
                  <span className="tag-dot" style={{ background: tag.color }} />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="no-tags">
              Agrupe suas tarefas por assunto.
              <br />
              Crie sua primeira tag.
            </p>
          )}
          {selectedTags.length > 0 && (
            <button className="text-button clear-tags" onClick={onClearTags}>
              Limpar seleção ({selectedTags.length})
            </button>
          )}
          <button className="manage-tags" onClick={onManageTags}>
            <Plus size={15} />
            Gerenciar tags
          </button>
        </section>
        <div className="sidebar-note">
          <Sparkles size={19} />
          <div>
            <strong>Espaço para o que importa.</strong>
            <p>
              Organize seu tempo.
              <br />
              Dê lugar às suas ideias.
            </p>
          </div>
        </div>
        <footer className="sidebar-footer">
          <span className="connection-dot" />
          Calendário Diel<span>BR</span>
        </footer>
      </aside>
    </>
  );
}
