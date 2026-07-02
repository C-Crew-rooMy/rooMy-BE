# Node.js 24 기반의 Slim 이미지를 사용
# -> 추후 Alpine로 변경
FROM node:24-slim

# 컨테이너 내부 작업 디렉토리를 /app으로 설정
WORKDIR /app

# pnpm 사용을 위해 Corepack 활성화
RUN corepack enable

# package.json과 lock 파일만 먼저 복사하여 Docker 캐시를 활용
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# package.json을 기반으로 프로젝트 의존성 설치
RUN pnpm install

# 프로젝트 전체 파일 복사
COPY . .

# Prisma Client 생성
RUN pnpm prisma generate

# Nest 서버가 사용할 포트
EXPOSE 3000

# 컨테이너 실행 시 개발 서버 실행
CMD ["pnpm", "start:dev"]