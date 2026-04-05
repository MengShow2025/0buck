# 使用官方 Python 3.9 瘦镜像作为基础
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（如 gcc 等，用于编译某些 Python 库）
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端所有代码
COPY . .

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 暴露 FastAPI 默认端口
EXPOSE 8000

# 启动命令：使用 uvicorn 运行，并开启 4 个工作进程以提高并发性能
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
