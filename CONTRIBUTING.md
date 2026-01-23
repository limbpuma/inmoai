# InmoAI - Guia de Contribucion

## Estrategia de Branching (Git Flow)

```
master (produccion)
  │
  ├── develop (integracion)
  │     │
  │     ├── feature/auth-system
  │     ├── feature/stripe-integration
  │     ├── feature/user-dashboard
  │     ├── feature/admin-panel
  │     └── feature/ai-control
  │
  └── hotfix/* (fixes urgentes)
```

## Branches Principales

| Branch | Proposito |
|--------|-----------|
| `master` | Codigo en produccion, siempre estable |
| `develop` | Branch de integracion para features |

## Branches de Feature

Formato: `feature/<nombre-descriptivo>`

Ejemplo:
- `feature/auth-system`
- `feature/stripe-integration`
- `feature/admin-panel`

## Flujo de Trabajo

### 1. Crear Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-feature
```

### 2. Desarrollo
```bash
# Hacer cambios...
git add <archivos>
git commit -m "feat(scope): descripcion"
```

### 3. Push y PR
```bash
git push origin feature/nombre-feature
# Crear Pull Request en GitHub: feature/* -> develop
```

### 4. Merge a Develop
```bash
# Despues de code review y CI passing
git checkout develop
git merge --no-ff feature/nombre-feature
git push origin develop
```

### 5. Release a Master
```bash
git checkout master
git merge --no-ff develop
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin master --tags
```

---

## Convencion de Commits

Formato: `type(scope): descripcion`

### Types
| Type | Descripcion |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Correccion de bug |
| `docs` | Solo documentacion |
| `style` | Formato, sin cambio de logica |
| `refactor` | Refactoring sin cambio de funcionalidad |
| `test` | Agregar o corregir tests |
| `chore` | Tareas de mantenimiento |

### Scopes
| Scope | Descripcion |
|-------|-------------|
| `auth` | Sistema de autenticacion |
| `stripe` | Integracion de pagos |
| `dashboard` | User dashboard |
| `admin` | Admin panel |
| `ai` | AI Control System |
| `db` | Base de datos |
| `api` | Backend API |
| `web` | Frontend |

### Ejemplos
```
feat(auth): implement NextAuth with Supabase provider
fix(stripe): handle webhook signature validation
docs(readme): update installation instructions
refactor(api): extract user service from router
test(ai): add unit tests for fraud detection
chore(deps): update dependencies
```

---

## Releases

### Versionado Semantico (SemVer)

`MAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles (breaking changes)
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Bug fixes

### Proximas Releases

| Version | Contenido | Branch |
|---------|-----------|--------|
| v0.2.0 | Auth + Stripe | `feature/auth-system`, `feature/stripe-integration` |
| v0.3.0 | User Dashboard | `feature/user-dashboard` |
| v0.4.0 | Admin Panel Base | `feature/admin-panel` |
| v0.5.0 | AI Control System | `feature/ai-control` |
| v1.0.0 | MVP Completo | `master` |

---

## Pull Request Checklist

- [ ] Tests pasan (`npm run test`)
- [ ] Lint pasa (`npm run lint`)
- [ ] Types correctos (`npm run typecheck`)
- [ ] Documentacion actualizada
- [ ] Commits siguen convencion
- [ ] Branch actualizado con develop

---

## Estructura de Commits por Fase

### Fase 1: Auth + Stripe (v0.2.0)
```
feat(auth): setup NextAuth configuration
feat(auth): create login and register pages
feat(auth): add route protection middleware
feat(stripe): setup Stripe SDK and config
feat(stripe): implement checkout session
feat(stripe): add webhook handlers
feat(stripe): update pricing page with real checkout
```

### Fase 2: User Dashboard (v0.3.0)
```
feat(dashboard): create dashboard layout
feat(dashboard): add favorites functionality
feat(dashboard): add search history
feat(dashboard): add subscription management
```

### Fase 3: Admin Panel (v0.4.0)
```
feat(admin): create admin layout and sidebar
feat(admin): add metrics dashboard
feat(admin): add users management
feat(admin): add listings management
feat(admin): add system logs viewer
```

### Fase 4: AI Control (v0.5.0)
```
feat(ai): define AI types and interfaces
feat(ai): create adminAIStore with Zustand
feat(ai): build AI control panel UI
feat(ai): implement AI hooks
feat(ai): add AI backend services
feat(ai): integrate websockets for real-time
```
