FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
# RUN npm install

# Prisma
COPY prisma ./prisma
RUN npx prisma generate
RUN npx prisma migrate dev --name init

# App source
COPY . .

# Build NestJS
RUN npm run build

EXPOSE 3001

# Run compiled app
CMD ["node", "dist/src/main.js"]
