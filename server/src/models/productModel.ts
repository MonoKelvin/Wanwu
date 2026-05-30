import pool from '../config/database.js';
import type { Product } from '../types/product.js';

export class ProductModel {
  static async findAll(): Promise<Product[]> {
    const [rows] = await pool.execute(
      'SELECT id, name, description, price, stock, image_url as imageUrl, category_id as categoryId, created_at as createdAt, updated_at as updatedAt FROM products ORDER BY id DESC'
    );
    return rows as Product[];
  }

  static async findById(id: number): Promise<Product | null> {
    const [rows] = await pool.execute(
      'SELECT id, name, description, price, stock, image_url as imageUrl, category_id as categoryId, created_at as createdAt, updated_at as updatedAt FROM products WHERE id = ?',
      [id]
    );
    const products = rows as Product[];
    return products.length > 0 ? products[0] : null;
  }

  static async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const [result] = await pool.execute(
      'INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        product.name,
        product.description,
        product.price,
        product.stock,
        product.imageUrl || null,
        product.categoryId || null
      ]
    );
    const insertResult = result as { insertId: number };
    const newProduct = await this.findById(insertResult.insertId);
    if (!newProduct) throw new Error('创建商品失败');
    return newProduct;
  }

  static async update(id: number, product: Partial<Product>): Promise<Product | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (product.name !== undefined) {
      fields.push('name = ?');
      values.push(product.name);
    }
    if (product.description !== undefined) {
      fields.push('description = ?');
      values.push(product.description);
    }
    if (product.price !== undefined) {
      fields.push('price = ?');
      values.push(product.price);
    }
    if (product.stock !== undefined) {
      fields.push('stock = ?');
      values.push(product.stock);
    }
    if (product.imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(product.imageUrl);
    }
    if (product.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(product.categoryId);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    const deleteResult = result as { affectedRows: number };
    return deleteResult.affectedRows > 0;
  }
}
