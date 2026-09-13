/** Количество символов ID, видимых в UI */
export const SHORT_ID_LENGTH = 4;

/** Единственная точка усечения ID: сервисы и pipe используют только её */
export function shortId(id: string): string {
  return id.slice(0, SHORT_ID_LENGTH);
}
