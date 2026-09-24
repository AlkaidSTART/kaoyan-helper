# P1 · 技术方案与详细设计 (Design)

> 阶段目标：在编写第一行业务代码前，完成数据模型、接口契约、状态流转与 UI 规范设计。

---

## 目录结构与规范要求

**每个功能在编写代码前，必须在此目录下新建专属子文件夹：`<feature-name>/`。**

```
docs/p1-design/
  ├── auth/               # 认证模块设计
  │   ├── technical-design.md  # 详细技术设计 (模型、Repository、Provider)
  │   └── ui-spec.md           # 界面规范与微交互设计
  ├── quiz/
  └── ...
```

---

## 包含内容

1. **UI / UX 规范与交互细节**：
   - 界面排版、动效曲线、时长、按键映射、M3 色彩状态映射。
   - 现行设计系统见 `docs/ui-design/`。
2. **架构契约设计**：
   - 数据模型（Entity / DTO / Value Objects）定义。
   - 仓储接口定义（`XxxRepository` 纯 Dart 抽象）。
   - 状态流转设计（Riverpod Provider / Notifier 状态树与 ViewState）。
   - 网络接口契约（API 路径、入参、出参 JSON Schema、异常码映射）。
3. **时序与流转图**：
   - 复杂异步流程（如 OAuth 登录、OCR+LLM 结构化抽取、3D 卡片切卡）。
