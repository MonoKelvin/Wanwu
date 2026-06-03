/** 主进程启动前关闭 dotenv v17+ 提示，避免 Windows 终端 Unicode 乱码 */
process.env.DOTENV_CONFIG_QUIET ??= 'true'
