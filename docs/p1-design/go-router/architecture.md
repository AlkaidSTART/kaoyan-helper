# P1: GoRouter 架构设计与契约规范

## 1. 路由表拓扑结构
```
/login (LoginPage)
/ (重定向至 /dashboard)
StatefulShellRoute (AppShell)
  ├── Branch 0: /dashboard (DashboardView)
  ├── Branch 1: /quiz (QuizView)
  ├── Branch 2: /mistakes (MistakesView)
  ├── Branch 3: /schools (SchoolsView)
  ├── Branch 4: /flashcards (FlashcardsView)
  └── Branch 5: /rest (RestView)
```

## 2. 状态监听与单向数据流
```
authNotifierProvider (AuthState)
  ↓ [ref.listen]
RouterNotifier (ChangeNotifier)
  ↓ [refreshListenable]
GoRouter (redirect guard)
  ↓ [routerConfig]
MaterialApp.router
```
