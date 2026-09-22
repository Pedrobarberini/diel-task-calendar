import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { calendarHeading } from '../lib/calendar';
import type { CalendarView } from '../types';

interface CalendarToolbarProps {
  date: Date;
  view: CalendarView;
  query: string;
  onQuery: (value: string) => void;
  onView: (view: CalendarView) => void;
  onMove: (direction: number) => void;
  onToday: () => void;
}

export function CalendarToolbar({
  date,
  view,
  query,
  onQuery,
  onView,
  onMove,
  onToday,
}: CalendarToolbarProps) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-navigation">
        <button className="button today-button" onClick={onToday}>
          Hoje
        </button>
        <div className="calendar-arrows">
          <button className="icon-button" onClick={() => onMove(-1)} aria-label="Período anterior">
            <ChevronLeft size={19} />
          </button>
          <button className="icon-button" onClick={() => onMove(1)} aria-label="Próximo período">
            <ChevronRight size={19} />
          </button>
        </div>
        <h2>{calendarHeading(date, view)}</h2>
      </div>
      <div className="calendar-tools">
        <div className="search-input">
          <Search size={17} />
          <input
            type="search"
            maxLength={160}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Buscar tarefa…"
            aria-label="Buscar tarefa por título"
          />
          {query && (
            <button
              type="button"
              className="icon-button small"
              onClick={() => onQuery('')}
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="view-switcher" role="group" aria-label="Visualização do calendário">
          {(
            [
              ['day', 'Dia'],
              ['week', 'Semana'],
              ['month', 'Mês'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onView(key)}
              className={view === key ? 'active' : ''}
              aria-pressed={view === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
