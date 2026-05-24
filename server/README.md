# Wanwu 后端 API 服务

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置数据库

复制 `.env.example` 为 `.env` 并修改数据库配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置你的 MySQL 连接信息。

### 3. 初始化数据库

在 MySQL 中执行 `database/init.sql` 脚本：

```bash
mysql -u root -p < database/init.sql
```

或在 MySQL 客户端中手动执行 SQL 脚本。

### 4. 测试数据库连接

```bash
npm run test-db
```

### 5. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## API 接口

### 商品相关

- `GET /api/products` - 获取所有商品
- `GET /api/products/:id` - 获取商品详情
- `POST /api/products` - 创建商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 健康检查

- `GET /health` - 服务器健康状态

## 响应格式

```json
{
  "code": 200,
  "message": "获取成功",
  "data": [...]
}
```
