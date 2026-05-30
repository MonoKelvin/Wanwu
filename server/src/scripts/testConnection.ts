import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wanwu'
    });

    console.log('✅ 数据库连接成功');
    console.log(`📊 数据库: ${process.env.DB_NAME || 'wanwu'}`);
    console.log(`🔗 主机: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);

    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 数据库查询测试成功:', rows);

    await connection.end();
    console.log('✅ 数据库连接已关闭');
    process.exit(0);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('❌ 数据库连接失败:');
    console.error('错误信息:', err.message);
    console.error('错误代码:', err.code);
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 提示: 请确保 MySQL 服务正在运行');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 提示: 请检查数据库用户名和密码');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 提示: 数据库不存在，请先创建数据库');
    }
    process.exit(1);
  }
}

testConnection();
