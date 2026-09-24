# P1 阶段：CI/CD 流水线架构设计与规范契约

> **功能标识**: `ci-cd`  
> **归属阶段**: P1 架构设计 (Design)  
> **负责人**: AlkaidSTART  
> **最后更新**: 2026-09-24  

---

## 1. 架构总览与时序拓扑

```
[Developer Push / PR] 
        │
        ├──> [CI Pipeline: ci.yml] (main, dev)
        │      ├── 1. 环境准备 (Ubuntu + Java 17 + Flutter 3.41.x 缓存)
        │      ├── 2. 依赖解析 (flutter pub get)
        │      ├── 3. 规范门禁 (dart format --set-exit-if-changed)
        │      ├── 4. 静态分析 (flutter analyze --fatal-infos)
        │      └── 5. 单元/组件测试 (flutter test --coverage) -> 归档 lcov.info
        │
        └──> [CD Pipeline: cd.yml]
               ├── Push to main ─────────────> [Job: deploy-web] (GitHub Pages 部署)
               ├── Tag v* (Release) ─────────> [Job: deploy-web] + [Job: build-android]
               │                                      │
               │                                      ▼
               │                                [Job: create-release]
               │                                (聚合 APK & Web Zip 发布 Release)
               └── workflow_dispatch ────────> 按选定 Target (all/web/android) 调度构建
```

---

## 2. 触发与并发控制策略

### 2.1 触发规则矩阵

| 工作流 | 触发事件 | 目标分支 / 标签 | 触发任务 |
|---|---|---|---|
| `ci.yml` | `push` | `main`, `dev` | 全量 CI 门禁检查 |
| `ci.yml` | `pull_request` | `main`, `dev` | 全量 CI 门禁检查 |
| `cd.yml` | `push` | `main` | Web 构建并部署至 GitHub Pages |
| `cd.yml` | `push` | `tags: ['v*']` | Web 部署 + Android APK 构建 + GitHub Release 发布 |
| `cd.yml` | `workflow_dispatch` | 手动选择 | 手动构建指定平台（web/android/all）并归档产物 |

### 2.2 并发与取消机制 (Concurrency)

- **CI 工作流**：`group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`（同一分支最新推送自动取消旧运行，节约 Action 配额）。
- **CD 工作流**：`group: cd-deployment-${{ github.ref }}`, `cancel-in-progress: false`（防止部署被意外中断造成半发布状态）。

---

## 3. 环境与依赖契约

| 依赖项 | 规范版本 / 发行版 | 用途说明 |
|---|---|---|
| Runner OS | `ubuntu-latest` | 标准构建镜像环境 |
| JDK | `Java 17 (Zulu)` | Android Gradle 插件 (AGP) 编译兼容环境 |
| Flutter SDK | `3.41.x` (channel: `stable`) | 严格匹配本地开发与锁定的 SDK 范围 |
| Cache 策略 | `subosito/flutter-action@v2` 内置缓存 | 缓存 `~/.pub-cache` 依赖，加快执行速度 |
| Web Base Href | `/kaoyan_helper/` | 确保 GitHub Pages 项目二级路径静态资源正确加载 |

---

## 4. 权限与安全模型 (Permissions)

```yaml
permissions:
  contents: write    # 允许自动生成 Git Tag 对应的 GitHub Release 并上传资产
  pages: write       # 允许向 GitHub Pages 发起正式部署
  id-token: write    # 允许 GitHub Pages OIDC 鉴权交互
```

- 杜绝硬编码敏感密钥与证书。
- Android APK 暂使用 `debug` 签名进行预置构建，如需生产发布密钥统一从 `secrets.ANDROID_KEYSTORE_BASE64` 注入。
