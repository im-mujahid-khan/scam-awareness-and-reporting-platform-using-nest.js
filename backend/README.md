## Project setup

```bash
$ npm install
```

## Install redis and run through docker

```bash
$ docker run -d --name redis -p 6379:6379 redis

```
## Migrate the prisma schema
```bash
$ npx prisma migrate dev --name init
```
## Compile and run the project

```bash
# development
$ npm run start
```
