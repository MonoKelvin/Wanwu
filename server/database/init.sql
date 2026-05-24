-- 创建数据库
CREATE DATABASE IF NOT EXISTS wanwu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE wanwu;

-- 创建商品表
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '商品名称',
  description TEXT COMMENT '商品描述',
  price DECIMAL(10, 2) NOT NULL COMMENT '价格',
  stock INT NOT NULL DEFAULT 0 COMMENT '库存',
  image_url VARCHAR(500) COMMENT '图片URL',
  category_id INT COMMENT '分类ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 插入示例数据
INSERT INTO products (name, description, price, stock, image_url) VALUES
('示例商品1', '这是一个示例商品描述', 99.99, 100, NULL),
('示例商品2', '这是另一个示例商品描述', 199.99, 50, NULL),
('示例商品3', '第三个示例商品', 299.99, 30, NULL);
