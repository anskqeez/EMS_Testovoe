/** Количество символов ID, видимых в UI */
export const SHORT_ID_LENGTH = 4;

export function shortId(id: string): string {
    return id.slice(0, SHORT_ID_LENGTH);
}
