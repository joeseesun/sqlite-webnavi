#!/bin/sh
set -e

# 确保上传目录存在
mkdir -p public/uploads/screenshots public/uploads/icons public/uploads/qrcodes

# 获取数据库路径，如果未设置则使用默认路径
DB_FILE=${DB_PATH:-"database.sqlite"}
DB_DIR=$(dirname "$DB_FILE")

# 确保数据库目录存在
echo "确保数据库目录存在: $DB_DIR"
mkdir -p "$DB_DIR"

# 检查文件是否存在且可写，或者创建一个新文件
if [ ! -f "$DB_FILE" ]; then
  echo "数据库文件不存在，创建新文件: $DB_FILE"
  touch "$DB_FILE"
  # 确保文件有正确的权限
  chmod 666 "$DB_FILE"
elif [ ! -w "$DB_FILE" ]; then
  echo "数据库文件不可写，修改权限: $DB_FILE"
  chmod 666 "$DB_FILE"
fi

# 检查数据库是否需要初始化
if [ ! -s "$DB_FILE" ] || [ "$FORCE_INIT_DB" = "true" ]; then
  echo "数据库为空或强制初始化标志设置为 true，正在初始化数据库..."
  DB_PATH="$DB_FILE" node init-db.js
  echo "数据库初始化完成"
else
  echo "数据库已存在，跳过初始化步骤"
fi

# 启动应用程序
export DB_PATH="$DB_FILE"
exec node app.js 