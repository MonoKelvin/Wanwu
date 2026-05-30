export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}
