# Python Django Specialists Index
# Python Djangoスペシャリスト一覧
# Danh Sach Chuyen Gia Python Django

**Total**: 48 specialists | **Stack**: Python 3.12+ / Django 5.x / DRF 3.15+
**Variants**: ALL (Generic) | **Folders**: 16

---

## 1. Architecture Master — START HERE

| File | Pattern | Purpose |
|------|---------|---------|
| `architecture/django-project-structure-specialist.md` | 0.1–0.7 | Project layout, apps, INSTALLED_APPS, app config |
| `architecture/django-settings-specialist.md` | 0.8–0.14 | Settings patterns, django-environ, split settings |

---

## 2. Quick Reference Table

| Task | Specialist | Pattern | Layer |
|------|-----------|---------|-------|
| Create Django model | django-orm-models | 1.x | Domain |
| Complex query | django-queryset-managers | 2.x | Domain |
| ForeignKey, M2M | django-model-relationships | 2.8-2.14 | Domain |
| Database migration | django-migrations | 2.15-2.20 | Domain |
| Class-based view | django-cbv | 3.x | Presentation |
| Function view | django-fbv | 4.x | Presentation |
| URL routing | django-url-routing | 4.6-4.10 | Presentation |
| DRF serializer | drf-serializers | 5.x | Presentation |
| DRF viewset | drf-viewsets | 6.x | Presentation |
| JWT auth (API) | drf-authentication | 7.x | Security |
| API permissions | drf-permissions-throttling | 7.7-7.12 | Security |
| API filtering | drf-filtering-pagination | 8.x | Presentation |
| Admin panel | django-admin | 10.x | Presentation |
| Admin customization | django-admin-customization | 10.8-10.13 | Presentation |
| Django forms | django-forms | 11.x | Presentation |
| Templates | django-templates | 12.x | Presentation |
| HTMX integration | django-htmx | 12.8-12.13 | Presentation |
| User auth (login) | django-authentication | 15.x | Security |
| Permissions/groups | django-authorization | 16.x | Security |
| Security headers | django-security-hardening | 16.7-16.13 | Security |
| Custom middleware | django-middleware | 17.x | Middleware |
| Redis caching | django-caching | 20.x | Infrastructure |
| Signals | django-signals | 21.x | Domain |
| manage.py commands | django-management-commands | 22.x | Infrastructure |
| WebSocket | django-channels | 25.x | Presentation |
| Server-Sent Events | django-sse | 25.8-25.12 | Presentation |
| Static/media files | django-static-media | 30.x | Infrastructure |
| File upload | django-file-upload | 31.x | Application |
| Excel/PDF export | django-excel-pdf | 32.x | Application |
| Celery tasks | django-celery | 35.x | Application |
| Periodic tasks | django-celery-beat | 35.8-35.12 | Application |
| pytest-django | django-testing | 40.x | Test |
| DRF API tests | drf-testing | 41.x | Test |
| factory_boy | django-factory-fixtures | 41.7-41.12 | Test |
| Docker | django-docker | 45.x | DevOps |
| CI/CD | django-cicd | 46.x | DevOps |
| Kubernetes | django-kubernetes | 46.6-46.11 | DevOps |
| Performance | django-performance | 47.x | DevOps |
| django-ninja API | django-ninja | 50.x | Presentation |
| LLM integration | django-llm-integration | 51.x | Application |
| RAG / pgvector | django-rag-integration | 52.x | Application |
| ML serving | django-ml-serving | 52.7-52.12 | Application |
| Python basics | python-fundamentals | 65.x | ALL |
| Async patterns | python-async-patterns | 66.x | ALL |
| Code quality | python-code-quality | 67.x | ALL |
| Design patterns | python-design-patterns | 68.x | ALL |

---

## 3. Pattern Number Registry

### architecture/ (0.x) — 2 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 1 | `django-project-structure-specialist.md` | 0.1–0.7 | ALL |
| 2 | `django-settings-specialist.md` | 0.8–0.14 | ALL |

### models/ (1.x–2.x) — 4 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 3 | `django-orm-models-specialist.md` | 1.1–1.8 | Domain |
| 4 | `django-queryset-managers-specialist.md` | 2.1–2.7 | Domain |
| 5 | `django-model-relationships-specialist.md` | 2.8–2.14 | Domain |
| 6 | `django-migrations-specialist.md` | 2.15–2.20 | Domain |

### views/ (3.x–4.x) — 3 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 7 | `django-cbv-specialist.md` | 3.1–3.8 | Presentation |
| 8 | `django-fbv-specialist.md` | 4.1–4.5 | Presentation |
| 9 | `django-url-routing-specialist.md` | 4.6–4.10 | Presentation |

### drf/ (5.x–8.x) — 5 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 10 | `drf-serializers-specialist.md` | 5.1–5.8 | Presentation |
| 11 | `drf-viewsets-specialist.md` | 6.1–6.7 | Presentation |
| 12 | `drf-authentication-specialist.md` | 7.1–7.6 | Security |
| 13 | `drf-permissions-throttling-specialist.md` | 7.7–7.12 | Security |
| 14 | `drf-filtering-pagination-specialist.md` | 8.1–8.7 | Presentation |

### admin/ (10.x) — 2 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 15 | `django-admin-specialist.md` | 10.1–10.7 | Presentation |
| 16 | `django-admin-customization-specialist.md` | 10.8–10.13 | Presentation |

### forms-templates/ (11.x–12.x) — 3 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 17 | `django-forms-specialist.md` | 11.1–11.7 | Presentation |
| 18 | `django-templates-specialist.md` | 12.1–12.7 | Presentation |
| 19 | `django-htmx-specialist.md` | 12.8–12.13 | Presentation |

### security/ (15.x–16.x) — 3 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 20 | `django-authentication-specialist.md` | 15.1–15.7 | Security |
| 21 | `django-authorization-specialist.md` | 16.1–16.6 | Security |
| 22 | `django-security-hardening-specialist.md` | 16.7–16.13 | Security |

### middleware/ (17.x) — 1 specialist
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 23 | `django-middleware-specialist.md` | 17.1–17.6 | Middleware |

### data/ (20.x–22.x) — 3 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 24 | `django-caching-specialist.md` | 20.1–20.7 | Infrastructure |
| 25 | `django-signals-specialist.md` | 21.1–21.5 | Domain |
| 26 | `django-management-commands-specialist.md` | 22.1–22.5 | Infrastructure |

### realtime/ (25.x) — 2 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 27 | `django-channels-specialist.md` | 25.1–25.7 | Presentation |
| 28 | `django-sse-specialist.md` | 25.8–25.12 | Presentation |

### file-handling/ (30.x–32.x) — 3 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 29 | `django-static-media-specialist.md` | 30.1–30.6 | Infrastructure |
| 30 | `django-file-upload-specialist.md` | 31.1–31.6 | Application |
| 31 | `django-excel-pdf-specialist.md` | 32.1–32.6 | Application |

### messaging/ (35.x) — 2 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 32 | `django-celery-specialist.md` | 35.1–35.7 | Application |
| 33 | `django-celery-beat-specialist.md` | 35.8–35.12 | Application |

### testing/ (40.x–41.x) — 3 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 34 | `django-testing-specialist.md` | 40.1–40.7 | Test |
| 35 | `drf-testing-specialist.md` | 41.1–41.6 | Test |
| 36 | `django-factory-fixtures-specialist.md` | 41.7–41.12 | Test |

### devops/ (45.x–47.x) — 4 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 37 | `django-docker-specialist.md` | 45.1–45.6 | DevOps |
| 38 | `django-cicd-specialist.md` | 46.1–46.5 | DevOps |
| 39 | `django-kubernetes-specialist.md` | 46.6–46.11 | DevOps |
| 40 | `django-performance-specialist.md` | 47.1–47.7 | DevOps |

### ai-ml/ (50.x–52.x) — 4 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 41 | `django-ninja-specialist.md` | 50.1–50.7 | Presentation |
| 42 | `django-llm-integration-specialist.md` | 51.1–51.7 | Application |
| 43 | `django-rag-integration-specialist.md` | 52.1–52.6 | Application |
| 44 | `django-ml-serving-specialist.md` | 52.7–52.12 | Application |

### language/ (65.x–68.x) — 4 specialists
| # | File | Pattern | Layer |
|---|------|---------|-------|
| 45 | `python-fundamentals-specialist.md` | 65.1–65.8 | ALL |
| 46 | `python-async-patterns-specialist.md` | 66.1–66.8 | ALL |
| 47 | `python-code-quality-specialist.md` | 67.1–67.7 | ALL |
| 48 | `python-design-patterns-specialist.md` | 68.1–68.7 | ALL |

---

## 4. Source Path → Specialist Lookup

| Source File | Specialist | Pattern |
|-------------|-----------|---------|
| `models.py` | django-orm-models | 1.x |
| `models.py` (QuerySet) | django-queryset-managers | 2.x |
| `models.py` (FK, M2M) | django-model-relationships | 2.8x |
| `migrations/` | django-migrations | 2.15x |
| `views.py` (CBV) | django-cbv | 3.x |
| `views.py` (FBV) | django-fbv | 4.x |
| `urls.py` | django-url-routing | 4.6x |
| `serializers.py` | drf-serializers | 5.x |
| `viewsets.py` | drf-viewsets | 6.x |
| `admin.py` | django-admin | 10.x |
| `forms.py` | django-forms | 11.x |
| `templates/**/*.html` | django-templates | 12.x |
| `settings.py` | django-settings | 0.8x |
| `middleware.py` | django-middleware | 17.x |
| `signals.py` | django-signals | 21.x |
| `management/commands/` | django-management-commands | 22.x |
| `consumers.py` | django-channels | 25.x |
| `tasks.py` | django-celery | 35.x |
| `tests/` | django-testing | 40.x |
| `tests/test_api*.py` | drf-testing | 41.x |
| `tests/factories.py` | django-factory-fixtures | 41.7x |
| `Dockerfile` | django-docker | 45.x |
| `.github/workflows/` | django-cicd | 46.x |
| `k8s/` | django-kubernetes | 46.6x |
| `conftest.py` | django-factory-fixtures | 41.7x |
| `pyproject.toml` | python-code-quality | 67.x |

---

## Cross-References: Shared with FastAPI

| FastAPI Specialist | Usage |
|-------------------|-------|
| `python-fastapi/language/python-fundamentals` (65.x) | Reference for non-Django Python patterns |
| `python-fastapi/language/python-async-patterns` (66.x) | Reference for pure asyncio patterns |
| `python-fastapi/language/python-code-quality` (67.x) | Reference for ruff/mypy base config |
| `python-fastapi/language/python-design-patterns` (68.x) | Reference for non-Django patterns |
