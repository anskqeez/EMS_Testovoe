export enum ProductStatus {
  InQueue = 'В очереди',
  Checked = 'Проверен',
  Rejected = 'Отбракован',
}

export interface Product {
  id: string;
  entryTime: number;
  status: ProductStatus;
}
