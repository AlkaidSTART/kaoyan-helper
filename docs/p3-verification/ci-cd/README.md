# P3 阶段：CI/CD 自动化流水线质量验证与交付单

> **功能标识**: `ci-cd`  
> **归属阶段**: P3 质量验证 (Verification)  
> **负责人**: AlkaidSTART  
> **最后更新**: 2026-09-24  

---

## 1. 本地执行与预检结果

在提交至 GitHub Actions 运行前，所有门禁检查必须在本地 100% 通过：

### 1.1 代码格式规范检查 (`dart format`)
```bash
$ dart format --output=none --set-exit-if-changed .
# 结果：0 files changed, 退出码 0，代码排版完全合规。
```

### 1.2 静态代码分析与阻断检查 (`flutter analyze`)
```bash
$ flutter analyze --fatal-infos
Analyzing kaoyan_helper...
No issues found! (ran in 1.4s)
# 结果：0 errors, 0 warnings, 0 lints, 退出码 0。
```

### 1.3 自动化测试与覆盖率导出 (`flutter test --coverage`)
```bash
$ flutter test --coverage
00:00 +0: loading /Users/allure/Desktop/kaoyan_helper/test/widget_test.dart
00:00 +0: Counter increments smoke test
00:00 +1: All tests passed!
# 结果：所有测试用例通过，成功导出 coverage/lcov.info 覆盖率文件。
```

---

## 2. GitHub Actions 工作流 YAML 语法与参数校验

| 检查项 | 目标工作流 | 预期规范 | 校验结果 |
|---|---|---|---|
| 分支触发策略 | `ci.yml` | 监听 `main`, `dev` 分支的 push 与 pull_request | ✅ 通过 |
| 并发取消机制 | `ci.yml` | 同分支新提交自动取消排队中旧构建 | ✅ 通过 |
| Pages 部署权限 | `cd.yml` | 声明 `pages: write`, `id-token: write` | ✅ 通过 |
| Base Href 参数 | `cd.yml` | `flutter build web --release --base-href "/kaoyan_helper/"` | ✅ 通过 |
| Release 资产打包 | `cd.yml` | 包含 `kaoyan-helper-v*-android.apk` 与 `kaoyan-helper-v*-web.zip` | ✅ 通过 |
| 环境变量安全 | `ci.yml`, `cd.yml` | 无任何敏感密钥泄漏，默认使用系统内置 `GITHUB_TOKEN` | ✅ 通过 |

---

## 3. 多端部署与交付 Checklist

- [x] `.github/workflows/ci.yml` 创建完成，覆盖 Lint / Analyze / Test / Coverage。
- [x] `.github/workflows/cd.yml` 创建完成，覆盖 Web 部署、Android APK 构建、Tag Release 发布。
- [x] P0~P3 各阶段规范文档全部在 `docs/` 下落盘。
- [x] 任务会话日志在 `docs/tasks/2026-09-24-github-ci-cd-pipeline/` 归档。
- [x] 文档中心导航索引 `docs/README.md` 已同步更新。
