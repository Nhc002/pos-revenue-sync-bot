# Sử dụng image chính thức của Puppeteer đã cài sẵn Chromium và mọi thư viện cần thiết
FROM ghcr.io/puppeteer/puppeteer:24.3.0

USER root

# Đặt thư mục làm việc
WORKDIR /app

# Copy file định nghĩa gói
COPY package*.json ./

ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

# Cài đặt thư viện và đảm bảo chrome browser được tải về đúng thư mục cache của pptruser
RUN npm ci --only=production && npx puppeteer browsers install chrome

# Copy toàn bộ mã nguồn
COPY . .

# Chuyển quyền lại cho user pptruser an toàn
RUN chown -R pptruser:pptruser /app /home/pptruser
USER pptruser



# Expose port cho Render / Cloud PaaS health-check
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV HEADLESS=true

# Khởi chạy bot
CMD ["node", "index.js"]
