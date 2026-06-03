# Project Cleanup And Agent Skills Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dọn repo `musica-v0.1`, loại bỏ phần runtime không dùng, giảm prompt noise, và setup lại `superpowers` / `apps/web/skills` / `AGENT.md` để AI agent dùng đúng mục đích và hiệu quả hơn.

**Architecture:** Chia công việc thành 2 lớp rõ ràng: `runtime cleanup` và `AI guidance cleanup`. Mọi phần ảnh hưởng build/runtime được xác minh bằng reference search + typecheck/lint/test; mọi phần AI guidance được rút gọn theo nguyên tắc "entrypoint ngắn, handbook dài, chỉ nạp khi cần", tránh nhét quá nhiều chi tiết vào runtime instructions.

**Tech Stack:** pnpm workspace, Vue 3 + Vite + Pinia, NestJS, TypeScript, Trae rules/skills, local `AGENT.md` / `AGENTS.md` / `.superpowers`

---

## File Structure Map

**Primary files to modify**
- `/.gitignore` - chỉ ignore local artifacts thực sự không cần commit; không ignore shared setup dùng chung
- `/AGENT.md` - root runtime entrypoint cho toàn repo
- `/apps/web/AGENT.md` - FE runtime guide ngắn gọn
- `/apps/web/AGENTS.md` - handbook dài cho `apps/web/skills`, không dùng như runtime prompt chính
- `/apps/api/AGENT.md` - BE runtime guide, chỉ giữ phần thực sự cần khi code
- `/apps/api/AGENTS.md` - compatibility shim ngắn gọn
- `/apps/web/package.json` - dọn dependency/scripts nếu thật sự không dùng
- `/apps/api/package.json` - chuẩn hóa scripts/checks nếu cần

**Likely deletions or reductions**
- `/apps/web/src/components/HelloWorld.vue` - Vite demo leftover nếu không còn import
- `/apps/web/src/assets/hero.png`
- `/apps/web/src/assets/vite.svg`
- `/apps/web/src/assets/vue.svg`
- `/apps/web/public/icons.svg`
- `/apps/api/src/examples/**` - demo module nếu không còn import vào app thật
- `/apps/api/src/auth/{jwt-auth.guard.ts,roles.guard.ts,roles.decorator.ts,auth.types.ts}` - bản duplicate nếu toàn bộ controller đã dùng `src/common/auth/*`

**Skills/library files to review, not blindly delete**
- `/apps/web/skills/*/SKILL.md`
- `/apps/web/skills/*/reference/**`
- `/.trae/ai/skills/**`

**Verification targets**
- `/apps/web/src`
- `/apps/api/src`
- `/package.json`
- `/apps/web/package.json`
- `/apps/api/package.json`

### Task 1: Baseline Audit And Safe Removal List

**Files:**
- Modify: `/Users/dungpham/musica-v0.1/CLEANUP_REPORT.md`
- Verify: `/Users/dungpham/musica-v0.1/apps/web/src`
- Verify: `/Users/dungpham/musica-v0.1/apps/api/src`

- [ ] **Step 1: Cross-check candidate leftovers with code search**

Run:

```bash
grep_targets=(
  "HelloWorld"
  "icons\\.svg"
  "hero\\.png"
  "vite\\.svg"
  "vue\\.svg"
  "ExamplesModule"
  "from '../auth/jwt-auth\\.guard'"
  "from '../auth/roles\\.guard'"
  "from '../auth/roles\\.decorator'"
  "@vueuse/core"
)
```

Then use repo search tools to confirm each target is still referenced before removal. Record every result in `CLEANUP_REPORT.md` under 3 buckets:

```md
## Xác nhận an toàn trước khi dọn

### Có thể xoá ngay
- `apps/web/src/components/HelloWorld.vue`: không còn import trong `apps/web/src`
- `apps/api/src/examples`: chỉ là demo module, đã bỏ khỏi `AppModule`

### Cần refactor trước khi xoá
- `apps/api/src/auth/*`: chỉ xoá sau khi toàn bộ import chuyển sang `src/common/auth/*`

### Giữ lại
- `apps/web/skills/*`: không phục vụ runtime, nhưng là knowledge base nội bộ nên phải tối ưu cách dùng thay vì xoá
```

- [ ] **Step 2: Verify the current app structure against README/runtime docs**

Read these files and compare with actual folders:

```bash
paths=(
  "/Users/dungpham/musica-v0.1/README.md"
  "/Users/dungpham/musica-v0.1/AGENT.md"
  "/Users/dungpham/musica-v0.1/apps/web/AGENT.md"
  "/Users/dungpham/musica-v0.1/apps/api/AGENT.md"
)
```

Expected findings to document:
- README còn nhắc `tracks` trong khi code đã chuyển sang `products`
- AGENT files còn chứa Windows path hoặc link tuyệt đối cũ
- FE runtime note đang trộn với handbook content

- [ ] **Step 3: Commit the audit-only snapshot**

```bash
git add CLEANUP_REPORT.md
git commit -m "docs: record verified cleanup baseline"
```

### Task 2: Runtime Cleanup For FE And BE

**Files:**
- Modify: `/Users/dungpham/musica-v0.1/.gitignore`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/app.module.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/products/products.module.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/certificates/certificates.module.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/product-package-registrations/product-package-registrations.module.ts`
- Delete: `/Users/dungpham/musica-v0.1/apps/web/src/components/HelloWorld.vue`
- Delete: `/Users/dungpham/musica-v0.1/apps/web/src/assets/*`
- Delete: `/Users/dungpham/musica-v0.1/apps/web/public/icons.svg`
- Delete: `/Users/dungpham/musica-v0.1/apps/api/src/examples/**`

- [ ] **Step 1: Keep shared `superpowers` setup committed**

Review `.gitignore` and keep `.superpowers` out of ignore rules when that directory contains shared setup the team depends on.

```gitignore
.dbg
debug-*.md
```

Expected result:
- shared `.superpowers` setup remains tracked
- only truly local/generated artifacts stay ignored

- [ ] **Step 2: Remove unused demo module from backend bootstrap**

Update `apps/api/src/app.module.ts` so the imports list no longer contains `ExamplesModule`:

```ts
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    HealthModule,
    AuthModule,
    ProductsModule,
    CertificatesModule,
  ],
})
```

- [ ] **Step 3: Remove verified FE leftovers**

Delete only after search confirms zero runtime references:

```bash
rm_targets=(
  "apps/web/src/components/HelloWorld.vue"
  "apps/web/src/assets/hero.png"
  "apps/web/src/assets/vite.svg"
  "apps/web/src/assets/vue.svg"
  "apps/web/public/icons.svg"
)
```

Expected result: no import errors, because `App.vue` renders only `RouterView` + `ConfirmDialog`.

- [ ] **Step 4: Remove module-level imports that are no longer needed**

Update modules that were importing `AuthModule` only to make guards available:

```ts
@Module({
  imports: [SupabaseModule],
  controllers: [AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

Apply the same pattern to:
- `apps/api/src/certificates/certificates.module.ts`
- `apps/api/src/product-package-registrations/product-package-registrations.module.ts`

- [ ] **Step 5: Run focused checks**

Run:

```bash
pnpm --filter api typecheck
pnpm --filter web typecheck
```

Expected:
- both commands pass
- no missing asset imports
- no `ExamplesModule` import errors

- [ ] **Step 6: Commit the runtime cleanup**

```bash
git add .gitignore apps/api/src apps/web/src apps/web/public
git commit -m "refactor: remove unused runtime artifacts"
```

### Task 3: Unify Backend Auth Utilities

**Files:**
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/auth/auth.module.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/common/auth/auth.types.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/common/auth/jwt-auth.guard.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/products/admin-products.controller.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/certificates/admin-certificates.controller.ts`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/src/product-package-registrations/admin-product-package-registrations.controller.ts`
- Delete: `/Users/dungpham/musica-v0.1/apps/api/src/auth/jwt-auth.guard.ts`
- Delete: `/Users/dungpham/musica-v0.1/apps/api/src/auth/roles.guard.ts`
- Delete: `/Users/dungpham/musica-v0.1/apps/api/src/auth/roles.decorator.ts`
- Delete: `/Users/dungpham/musica-v0.1/apps/api/src/auth/auth.types.ts`

- [ ] **Step 1: Make common auth the single source of truth**

Extend `apps/api/src/common/auth/auth.types.ts`:

```ts
import type { Request } from 'express'

export type AuthUserContext = {
  userId: string
  roleId: number | null
  roleName: string | null
}

export type AuthenticatedRequest = Request & {
  user?: AuthUserContext
}

export type JwtPayload = {
  sub: string
  roleId?: unknown
  roleName?: unknown
}
```

- [ ] **Step 2: Make `AuthModule` export the common guards globally**

Update `apps/api/src/auth/auth.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';

@Global()
@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
```

- [ ] **Step 3: Harden JWT secret behavior**

Update `apps/api/src/common/auth/jwt-auth.guard.ts` so fallback secret only exists in `development` or `test`:

```ts
let jwtSecret = this.configService.get<string>('JWT_SECRET')
if (!jwtSecret) {
  const nodeEnv =
    this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development'
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    jwtSecret = 'dev-secret'
  } else {
    throw new HttpException('Server misconfigured', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
```

- [ ] **Step 4: Switch remaining controllers to common auth imports**

Use this exact pattern:

```ts
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequireRoles } from '../common/auth/require-roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import type { AuthenticatedRequest } from '../common/auth/auth.types';

@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
```

Apply to:
- `apps/api/src/products/admin-products.controller.ts`
- `apps/api/src/certificates/admin-certificates.controller.ts`
- `apps/api/src/product-package-registrations/admin-product-package-registrations.controller.ts`

- [ ] **Step 5: Verify no code references deleted auth duplicates**

Run:

```bash
pnpm --filter api typecheck
pnpm --filter api lint
```

Expected:
- zero imports from `src/auth/jwt-auth.guard`
- zero imports from `src/auth/roles.guard`
- linter/typecheck clean

- [ ] **Step 6: Delete duplicate auth files and commit**

```bash
git add apps/api/src/auth apps/api/src/common/auth apps/api/src/products apps/api/src/certificates apps/api/src/product-package-registrations
git commit -m "refactor: consolidate backend auth utilities"
```

### Task 4: Restructure AGENT And AGENTS Guidance

**Files:**
- Modify: `/Users/dungpham/musica-v0.1/AGENT.md`
- Modify: `/Users/dungpham/musica-v0.1/apps/web/AGENT.md`
- Modify: `/Users/dungpham/musica-v0.1/apps/web/AGENTS.md`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/AGENTS.md`
- Optionally modify: `/Users/dungpham/musica-v0.1/apps/api/AGENT.md`

- [ ] **Step 1: Convert root `AGENT.md` into a real entrypoint**

Replace Windows paths and keep only load order + rules that matter every time:

```md
# Musica AI Entry

## Read Order
1. `.trae/rules/global.md`
2. `.trae/rules/api-contracts.md`
3. `README.md`
4. Scope guide:
   - `apps/web/AGENT.md`
   - `apps/api/AGENT.md`

## Repo Map
- `apps/web`: Vue frontend
- `apps/api`: Nest backend
- `packages/contracts`: API contracts shared by FE/BE

## Runtime Notes
- `AGENT.md` files are runtime entrypoints
- `AGENTS.md` files are handbook/compatibility files
- `apps/web/skills` is a local knowledge base, not an auto-loaded skill registry
- `.superpowers/` có thể là shared setup; nếu repo đang dùng chung thì phải commit và mô tả rõ mục đích
```

- [ ] **Step 2: Keep `apps/web/AGENT.md` short and task-oriented**

Target shape:

```md
# FE AGENT

## Scope
- Work only inside `apps/web`

## Read Order
1. `../../AGENT.md`
2. `../../.trae/rules/global.md`
3. `../../.trae/rules/api-contracts.md`

## FE Runtime Rules
- Prefer Composition API with `<script setup lang="ts">`
- Routes/pages orchestrate; extract reusable UI when feature grows
- FE unwraps API envelope from `@musica/contracts`, never reshapes backend response
- Read only the relevant file inside `apps/web/skills` for the current task

## Verification
- `pnpm --filter web typecheck`
```

- [ ] **Step 3: Reposition `apps/web/AGENTS.md` as handbook, not runtime prompt**

Keep the file because the user wants it, but trim it to:

```md
# Web Skills Handbook

## Purpose
- This file explains how to maintain `apps/web/skills`
- This file is not the primary runtime instruction file

## When To Read
- Read this only when editing the skill library itself
- For normal FE work, use `apps/web/AGENT.md`

## Skill Quality Rules
- `SKILL.md` stays concise
- details live in `reference/`
- each skill must say when to use it
- avoid broad, generic best-practice dumps
- add only examples that change agent behavior

## Maintenance Checklist
- remove stale references
- prefer relative paths
- keep terminology consistent
- avoid duplicate guidance across skills
```

Move the long evaluation framework into a later section or split it into smaller subsections, but keep the top 40-60 lines focused and scannable.

- [ ] **Step 4: Keep `apps/api/AGENTS.md` as a one-line shim**

Target content:

```md
# BE AGENTS.md

Compatibility shim. Backend runtime instructions live in `./AGENT.md`.
```

- [ ] **Step 5: Commit the agent-guidance cleanup**

```bash
git add AGENT.md apps/web/AGENT.md apps/web/AGENTS.md apps/api/AGENTS.md apps/api/AGENT.md
git commit -m "docs: streamline agent runtime guidance"
```

### Task 5: Optimize `apps/web/skills` For Actual Usage

**Files:**
- Modify: `/Users/dungpham/musica-v0.1/apps/web/skills/*/SKILL.md`
- Create: `/Users/dungpham/musica-v0.1/apps/web/skills/README.md` only if absolutely needed
- Optionally modify: `/Users/dungpham/musica-v0.1/apps/web/AGENTS.md`

- [ ] **Step 1: Audit each skill for “prompt bloat”**

For each `SKILL.md`, check:

```md
- Does it say exactly when to use this skill?
- Is the first screen under ~100 lines?
- Does it link to references instead of embedding everything?
- Does it avoid repeating Vue basics that every model already knows?
```

Record decisions in a temporary checklist during execution:

```md
- `vue-best-practices`: keep, shorten opening section
- `vue-debug-guides`: keep, group references by symptom
- `vue-testing-best-practices`: keep, tighten “when to use”
- `create-adaptable-composable`: keep, add 1 canonical input/output pattern
```

- [ ] **Step 2: Normalize `SKILL.md` opening sections**

Every FE skill should start with a tight header like:

```md
# vue-best-practices

Use this when building or refactoring Vue 3 code in `apps/web/src`, especially Composition API components, composables, and route-driven pages.

## Use When
- creating or refactoring Vue SFCs
- improving reactive state flow
- avoiding common template/computed/watch mistakes

## Do First
- identify whether the task is component, composable, router, store, or debugging work
- open only the relevant reference file for that topic
```

- [ ] **Step 3: Remove duplicated guidance across FE skills**

Examples of duplication to consolidate:
- repeated explanations of Composition API basics
- repeated warnings about template anti-patterns across multiple files
- repeated “run typecheck” blocks

Rule:

```md
Keep the rule in the most specific skill.
Link to it elsewhere instead of restating it.
```

- [ ] **Step 4: Add a lightweight skill taxonomy near the top of `apps/web/AGENTS.md`**

Use a short matrix like:

```md
| Need | Read |
|------|------|
| Build/refactor Vue SFC | `vue-best-practices` |
| Router/guards/params | `vue-router-best-practices` |
| Pinia stores | `vue-pinia-best-practices` |
| Debug runtime issue | `vue-debug-guides` |
| Tests | `vue-testing-best-practices` |
| Reusable composable API | `create-adaptable-composable` |
```

- [ ] **Step 5: Verify the skills setup is operational**

Manual verification checklist:

```md
- Root `AGENT.md` points to scope guides only
- FE `AGENT.md` tells the agent to read only the relevant skill
- `AGENTS.md` explains library maintenance, not day-to-day runtime behavior
- no file uses Windows absolute paths
- no skill opening section reads like a giant tutorial dump
```

- [ ] **Step 6: Commit the skills optimization**

```bash
git add apps/web/skills apps/web/AGENTS.md apps/web/AGENT.md
git commit -m "docs: optimize local web skills usage"
```

### Task 6: Dependency, Script, And Verification Pass

**Files:**
- Modify: `/Users/dungpham/musica-v0.1/package.json`
- Modify: `/Users/dungpham/musica-v0.1/apps/web/package.json`
- Modify: `/Users/dungpham/musica-v0.1/apps/api/package.json`
- Modify: `/Users/dungpham/musica-v0.1/README.md`

- [ ] **Step 1: Reconcile dependencies with actual usage**

Use code search to confirm:

```bash
checks=(
  "@vueuse/core"
  "wavesurfer.js"
  "primevue"
  "axios"
  "openapi-typescript"
)
```

Expected handling:
- remove a package only if runtime code no longer imports it
- if a package appears only in `apps/web/skills` examples, decide whether that dependency is a real app dependency or only documentation noise

- [ ] **Step 2: Normalize scripts to what the team actually uses**

Potential target state:

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "gen:openapi": "pnpm --filter api build && pnpm --filter api gen:openapi",
    "gen:types": "pnpm gen:openapi && pnpm --filter web gen:types"
  }
}
```
```

Also decide whether `apps/web` should keep a no-op lint script or replace it with a real lint step.

- [ ] **Step 3: Update README so it matches the cleaned repo**

Fix these likely mismatches:
- `tracks` -> `products`
- Windows `pnpm.cmd` examples -> portable `pnpm`
- `docs` folder mention only if it actually exists and is maintained
- explain the role of `.trae`, `AGENT.md`, and `apps/web/skills` without overselling them as runtime systems

Example replacement:

```md
## AI Guidance Files
- `AGENT.md`: root runtime entrypoint for coding agents
- `apps/web/AGENT.md`: FE runtime guide
- `apps/api/AGENT.md`: BE runtime guide
- `apps/web/AGENTS.md`: handbook for maintaining the local FE skill library
- `apps/web/skills`: local reference library, read on demand
```

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm --filter api typecheck
pnpm --filter api test -- --runInBand
pnpm --filter api lint
pnpm --filter web typecheck
pnpm --filter web build
```

Expected:
- all commands pass
- no deleted-file import errors
- no docs/scripts mismatch discovered during verification

- [ ] **Step 5: Write the final cleanup report update and commit**

Append to `CLEANUP_REPORT.md`:

```md
## Kết quả sau cleanup
- Đã xoá demo/runtime leftovers đã xác minh không dùng
- Đã gom auth utilities BE về `src/common/auth/*`
- Đã tách rõ runtime entrypoint (`AGENT.md`) và handbook (`AGENTS.md`)
- Đã tối ưu cách dùng local FE skills theo hướng load đúng tài liệu cần thiết
```

Commit:

```bash
git add README.md CLEANUP_REPORT.md package.json apps/web/package.json apps/api/package.json
git commit -m "chore: finalize project cleanup and agent setup"
```

## Self-Review

### Spec coverage
- Cleanup runtime leftovers: covered in Task 1-3
- Tối ưu `superpowers`: covered in Task 2 and Task 4 via shared `.superpowers` handling + runtime notes
- Tối ưu `apps/web/skills`: covered in Task 5
- Setup lại `AGENT.md`: covered in Task 4
- Đồng bộ docs/deps/scripts: covered in Task 6

### Placeholder scan
- Không dùng `TODO`/`TBD`
- Mọi task đều có file paths, snippets, commands, expected outcomes

### Type consistency
- Auth types thống nhất dùng `AuthUserContext` và `AuthenticatedRequest` trong `src/common/auth/auth.types.ts`
- Role decorator thống nhất dùng `RequireRoles` từ `src/common/auth/require-roles.decorator.ts`

Plan complete and saved to `docs/superpowers/plans/2026-06-03-project-cleanup-agent-skills-setup.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
