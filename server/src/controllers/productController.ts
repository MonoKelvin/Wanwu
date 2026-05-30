import { Request, Response } from 'express';
import { ProductModel } from '../models/productModel.js';
import type { ApiResponse } from '../types/product.js';

export class ProductController {
  static async getAllProducts(_req: Request, res: Response) {
    try {
      const products = await ProductModel.findAll();
      const response: ApiResponse = {
        code: 200,
        message: '获取成功',
        data: products
      };
      res.json(response);
    } catch (error) {
      console.error('获取商品列表失败:', error);
      const response: ApiResponse = {
        code: 500,
        message: '获取商品列表失败',
        data: undefined
      };
      res.status(500).json(response);
    }
  }

  static async getProductById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const response: ApiResponse = {
          code: 400,
          message: '无效的商品ID'
        };
        return res.status(400).json(response);
      }

      const product = await ProductModel.findById(id);
      if (!product) {
        const response: ApiResponse = {
          code: 404,
          message: '商品不存在'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        code: 200,
        message: '获取成功',
        data: product
      };
      res.json(response);
    } catch (error) {
      console.error('获取商品详情失败:', error);
      const response: ApiResponse = {
        code: 500,
        message: '获取商品详情失败'
      };
      res.status(500).json(response);
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const { name, description, price, stock, imageUrl, categoryId } = req.body;

      if (!name || !description || price === undefined || stock === undefined) {
        const response: ApiResponse = {
          code: 400,
          message: '缺少必填字段'
        };
        return res.status(400).json(response);
      }

      const product = await ProductModel.create({
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        imageUrl,
        categoryId: categoryId ? parseInt(categoryId) : undefined
      });

      const response: ApiResponse = {
        code: 200,
        message: '创建成功',
        data: product
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('创建商品失败:', error);
      const response: ApiResponse = {
        code: 500,
        message: '创建商品失败'
      };
      res.status(500).json(response);
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const response: ApiResponse = {
          code: 400,
          message: '无效的商品ID'
        };
        return res.status(400).json(response);
      }

      const product = await ProductModel.update(id, req.body);
      if (!product) {
        const response: ApiResponse = {
          code: 404,
          message: '商品不存在'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        code: 200,
        message: '更新成功',
        data: product
      };
      res.json(response);
    } catch (error) {
      console.error('更新商品失败:', error);
      const response: ApiResponse = {
        code: 500,
        message: '更新商品失败'
      };
      res.status(500).json(response);
    }
  }

  static async deleteProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const response: ApiResponse = {
          code: 400,
          message: '无效的商品ID'
        };
        return res.status(400).json(response);
      }

      const deleted = await ProductModel.delete(id);
      if (!deleted) {
        const response: ApiResponse = {
          code: 404,
          message: '商品不存在'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        code: 200,
        message: '删除成功'
      };
      res.json(response);
    } catch (error) {
      console.error('删除商品失败:', error);
      const response: ApiResponse = {
        code: 500,
        message: '删除商品失败'
      };
      res.status(500).json(response);
    }
  }
}
