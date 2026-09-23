# Sử dụng image chính thức của Puppeteer đã cài sẵn Chromium và mọi thư viện cần thiết
FROM ghcr.io/puppeteer/puppeteer:24.3.0

USER root

# Đặt thư mục làm việc
WORKDIR /app

# Copy file định nghĩa gói
COPY package*.json ./

# Cài đặt thư viện (bỏ qua download Chromium vì image đã có sẵn)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN npm ci --only=production

# Copy toàn bộ mã nguồn
COPY . .

# Chuyển quyền lại cho user pptruser an toàn
RUN chown -R pptruser:pptruser /app
USER pptruser

# Expose port cho Render / Cloud PaaS health-check
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV HEADLESS=true

# Khởi chạy bot
CMD ["node", "index.js"]
