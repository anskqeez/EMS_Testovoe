export enum LogEventType {
  Added = 'Добавление',
  Entered = 'Выход на линию',
  StatusChanged = 'Изменение статуса',
  Removed = 'Удаление',
  Tick = 'Следующий такт',
  Warning = 'Предупреждение',
  BufferFull = 'Буфер заполнен',
  BufferFreed = 'Буфер освобожден',
}

export interface LogEvent {
  id: string;
  timestamp: number;
  type: LogEventType;
  message: string;
}
