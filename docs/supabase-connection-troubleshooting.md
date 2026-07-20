# Supabase PostgreSQL 连接与 Prisma 配置诊断指南

本文件记录了在本地开发环境下连接 Supabase PostgreSQL 数据库及 Prisma 配置所遇到的问题、根本原因以及对应的解决方案，供团队开发或后期部署时参考。

---

## 📋 问题现象
在 `apps/cloud` 服务中运行 Prisma 数据库操作或测试连接时，抛出以下典型错误：
1. **连接超时 / 域名无法解析**：
   ```
   Can't reach database server at db.wvzqfmvehnfdxjqcjjbb.supabase.co:5432
   ```
2. **租户未找到**：
   ```
   Error querying the database: FATAL: (ENOTFOUND) tenant/user postgres.wvzqfmvehnfdxjqcjjbb not found
   ```
3. **Prisma 跨 Schema 验证失败**：
   ```
   error: This schema is not defined in the datasource. Cross schema references are only allowed when the target schema is listed in the schemas property...
   ```
4. **数据丢失风险拦截**：
   `prisma db push` 提示需要使用 `--accept-data-loss`，因为 Prisma 试图清空或删除数据库中原本存在但未在 `schema.prisma` 中声明的 50 多个活跃数据表。

---

## 🔍 根本原因与解决方案

### 原因一：IPv6 连接限制与解决方案 (IPv6 DNS Issue)
* **原理**：Supabase 默认提供的直接连接地址 `db.[ref].supabase.co` 属于 **IPv6-only**。如果本地开发网络或部署平台仅支持 IPv4（未启用双栈），则本地 DNS 服务器将无法解析此域名，导致直接连接超时或报主机不可达。
* **解决方案**：使用 Supabase 官方的 **Supavisor 连接池（Connection Pooler）** 地址。连接池主机（`pooler.supabase.com`）全面兼容 IPv4 网络环境。
* **配置规范**：
  * 将 `.env.local` 中的直接连接地址更换为 Pooler 域名。
  * 事务模式（Transaction Mode，端口 `6543`）用于服务器运行时。
  * 会话模式（Session Mode，端口 `5432`）用于数据迁移与初始化。

---

### 原因二：集群节点不匹配导致 "Tenant Not Found"
* **原理**：Supabase 在各个云服务区（如 `us-east-1`）额外部署了多个连接池集群（例如 `aws-0`、`aws-1` 等）。如果你的数据库实例被分配在 `aws-1` 节点上，但连接字符串中写了 `aws-0`，Supavisor 在路由时就无法匹配到该租户，从而抛出 `tenant/user not found` 错误。
* **解决方案**：登录 Supabase 仪表盘，检查 **Project Settings > Database** 中的 Connection string，确认正确的 pooler 前缀是 `aws-1`。
* **用户名格式**：使用连接池时，连接字符串中的 Username 必须写成 **`postgres.[project_ref]`** 的组合形式（例如 `postgres.wvzqfmvehnfdxjqcjjbb`），以便连接池正确进行租户分流。

---

### 原因三：Prisma 与 Supabase 跨 Schema 外键关联冲突
* **原理**：Supabase 自带一套 `auth` 架构（如 `auth.users` 表），而很多业务表会建立外键关联到 `auth.users`。在默认配置下，Prisma 只关注 `public` schema，当检查到有外部 schema 外键关联时就会报错。
* **解决方案**：在 [schema.prisma](file:///Users/linkai/home/code/prompt-share/apps/cloud/prisma/schema.prisma) 中启用多架构预览特性。
  ```prisma
  generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["multiSchema"]
  }

  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
    schemas   = ["public", "auth"] // 同时声明 public 和 auth 架构
  }
  ```
  同时，为项目中的每一个 Model 显式声明其所属架构（例如在底层添加 `@@schema("public")`）：
  ```prisma
  model User {
    id        String   @id @default(uuid())
    ...
    @@map("ps_user")
    @@schema("public")
  }
  ```

---

### 原因四：`prisma db push` 的全量同步风险
* **原理**：`prisma db push` 是一种“声明式同步”机制。它会迫使数据库表结构与你现有的 `schema.prisma` 保持绝对一致。如果当前数据库是一个**共享或已存在其他数据表**的实例，`db push` 将会强制把所有不在你的 `schema.prisma` 中的表全部 Drop 掉，造成毁灭性数据丢失。
* **解决方案**：针对已包含其他活跃数据表的生产/测试数据库，**严禁使用 `db push` 同步结构**。应采用增量 SQL 或 Prisma 迁移：
  1. 生成无侵入的 `CREATE TABLE` 增量 SQL 脚本：
     ```bash
     npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > create_tables.sql
     ```
  2. 提取 SQL 中的语句，逐条在数据库中执行建表操作（只创建 `ps_*` 专属表，不影响其他表）。
  3. 执行完毕后直接生成 Prisma Client 即可开始使用：
     ```bash
     npx prisma generate
     ```

---

## ⚙️ 最终推荐配置模板

### 1. `.env.local` 环境变量
```env
# Supabase API URL
NEXT_PUBLIC_SUPABASE_URL=https://wvzqfmvehnfdxjqcjjbb.supabase.co

# 数据库连接（Transaction Pooler，适用于 App 查询运行，端口 6543）
# 注意：使用 Prisma 连接 6543 端口必须添加 pgbouncer=true 参数
DATABASE_URL="postgresql://postgres.wvzqfmvehnfdxjqcjjbb:[YOUR_PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# 数据库迁移直连（Session Pooler，适用于开发迁移/Prisma Migrate，端口 5432）
DIRECT_URL="postgresql://postgres.wvzqfmvehnfdxjqcjjbb:[YOUR_PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

### 2. `schema.prisma` 头部声明
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["public", "auth"]
}
```
