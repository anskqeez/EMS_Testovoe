export interface MenuPosition {
    top: number;
    left: number;
    width: number;
}

export interface TriggerRect {
    top: number;
    bottom: number;
    left: number;
    width: number;
}

export interface Viewport {
    width: number;
    height: number;
}

export interface MenuPositionConfig {
    menuHeight: number;
    minWidth: number;
    padding: number;
    offset: number;
}

export const DEFAULT_MENU_CONFIG: MenuPositionConfig = {
    menuHeight: 132,
    minWidth: 176,
    padding: 8,
    offset: 6,
};

/**
 * Чистая функция позиционирования dropdown-меню:
 * ширина не меньше minWidth, clamp по краям вьюпорта,
 * flip вверх, если внизу не хватает места
 */
export function computeMenuPosition(
    trigger: TriggerRect,
    viewport: Viewport,
    config: MenuPositionConfig,
): MenuPosition {
    const width = Math.max(trigger.width, config.minWidth);
    const maxLeft = viewport.width - width - config.padding;
    const left = Math.min(Math.max(config.padding, trigger.left), maxLeft);
    const fitsBelow = viewport.height - trigger.bottom >= config.menuHeight + config.padding;
    const top = fitsBelow
        ? trigger.bottom + config.offset
        : trigger.top - config.menuHeight - config.offset;

    return { top, left, width };
}
