# P0 · 需求与功能定义 (Definition)

> 阶段目标：锁定功能范围、用户画像、核心业务场景与验收标准，杜绝伪需求。

---

## 目录结构与规范要求

**每个功能在启动前，必须在此目录下新建专属子文件夹：`<feature-name>/`。**

```
docs/p0-definition/
  ├── auth/               # 用户认证与登录
  │   ├── prd.md          # 需求定义文档
  │   └── problems.md     # 记录要解决的实际问题与用户痛点
  ├── quiz/               # 题库刷题
  ├── flashcards/         # 记忆闪卡
  └── ...
```

### 文档内容必须包含：
1. **真实问题与痛点**：用户在什么具体备考场景下遇到了什么困难？
2. **目标与非目标 (Scope & Non-Goals)**：
   - 本期必须做的（In-Scope）
   - 本期坚决不做的（Out-of-Scope，严格控制范围，杜绝伪需求）
3. **用户旅程与业务流程 (User Journey & Flow)**
4. **关键指标与验收条件 (Success Metrics & Acceptance Criteria)**
