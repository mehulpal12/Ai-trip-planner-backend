FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copy your schema file over first (adjust path if your schema is in a different subdirectory like src/prisma)
COPY prisma ./prisma/

# 🎯 FIX: Generate the custom Prisma Client engines before compilation
RUN npx prisma generate

COPY . .

RUN npm run build

# Copy generated Prisma files to dist so they are available at runtime
RUN cp -r src/generated dist/

EXPOSE 4001

CMD ["npm", "start"]