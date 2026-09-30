export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  tagIds: string[];
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: 'BR';
  global: boolean;
}

export type CalendarView = 'day' | 'week' | 'month';
