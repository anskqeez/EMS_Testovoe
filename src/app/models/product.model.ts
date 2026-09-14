export enum ProductStatus {
    InQueue = 'in-queue',
    Checked = 'checked',
    Rejected = 'rejected',
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
    [ProductStatus.InQueue]: 'В очереди',
    [ProductStatus.Checked]: 'Проверен',
    [ProductStatus.Rejected]: 'Отбракован',
};

export interface Product {
    id: string;
    status: ProductStatus;
    entryTime: number;
}
