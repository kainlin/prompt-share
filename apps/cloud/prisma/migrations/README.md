# Prisma Migrations

## 如何新建数据库

### 从头创建所有表

```bash
psql "$DATABASE_URL" -f prisma/migrations/0001_initial_schema.sql
```

或在 Supabase Dashboard → SQL Editor 中粘贴 `0001_initial_schema.sql` 的内容执行。

### 增量修改（schema 变更后）

```bash
# 生成增量 SQL（对比 schema.prisma 和当前数据库）
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0002_xxx.sql

# 审查后执行
psql "$DATABASE_URL" -f prisma/migrations/0002_xxx.sql
```

### 为什么不用 `prisma migrate dev`？

Supabase 的 PostgreSQL 实例使用 Shared Pooler（IPv4），不支持 Prisma Migrate 的 shadow database 机制。因此采用手动 SQL 管理迁移。

## Schema 对应关系

| Prisma Model | 数据库表 | 用途 |
|-------------|---------|------|
| User | ps_user | Better Auth 用户 + Stripe Connect 字段 |
| Session | ps_session | Better Auth 会话 |
| Account | ps_account | Better Auth OAuth 账户 |
| Verification | ps_verification | Better Auth 邮箱验证 |
| Tenant | ps_tenant | 创作者店铺 |
| PromptCase | ps_prompt_case | 提示词案例 |
| Subscription | ps_subscription | 消费者订阅 |
| Order | ps_order | 收益/分账跟踪 |

## 注意

- 所有 ID 类型为 `TEXT`（Better Auth 使用字符串 ID，不是 UUID）
- 所有表和列使用 `ps_` 前缀 + snake_case 命名
