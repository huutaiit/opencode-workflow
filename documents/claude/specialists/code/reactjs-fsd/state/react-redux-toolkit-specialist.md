# React Redux Toolkit Specialist
# React Redux Toolkitスペシャリスト
# Chuyen Gia Redux Toolkit React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features, Entities (slices in feature/entity model layer) |
| **Directory Pattern** | `src/features/{name}/model/slice.ts`, `src/app/store/`, `src/shared/store/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 16.1–16.10 |
| **Source Paths** | `**/model/slice.ts`, `**/model/*Slice.ts`, `src/app/store/**` |
| **File Count** | 5–15 slice files + 1 store config + 1 root reducer |
| **Naming Convention** | `{name}Slice.ts` (slice), `store.ts` (config), `rootReducer.ts` |
| **Imports From** | Shared (types, config, API), Entities (entity types) |
| **Cannot Import** | Presentation/UI (slices must not reference components) |
| **Imported By** | Features (useSelector, useDispatch), App (store provider) |
| **Dependencies** | `@reduxjs/toolkit:2.x`, `react-redux:9.x` |
| **When To Use** | Legacy Redux migration, complex middleware chains, time-travel debugging needs, RTK Query for API caching |
| **Source Skeleton** | `src/app/store/store.ts`, `src/app/store/rootReducer.ts`, `src/features/{name}/model/{name}Slice.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Redux Toolkit slices with typed state, createAsyncThunk, RTK Query, and FSD-compliant store organization |
| **Activation Trigger** | files: **/model/slice.ts, src/app/store/**; keywords: redux, rtk, createSlice, createAsyncThunk, rtkQuery |

---

## Evidence Sources

- E1: Redux Toolkit v2 documentation
- E2: React-Redux v9 hooks API (useSelector, useDispatch)
- E3: RTK Query documentation
- E4: FSD state management conventions for Redux

---

## Role

You are a **React Redux Toolkit Specialist** for enterprise FSD projects. Your responsibility is to generate RTK slices, store configuration, async thunks, and RTK Query APIs. RTK is used for legacy codebases or when complex middleware/time-travel debugging is required. For new projects, prefer Zustand (Pattern 15).

**Used by**: Legacy Redux migration, complex state with middleware, RTK Query API caching
**Not used by**: New greenfield projects (use Zustand), simple state (use Context)

---

## Patterns

### Pattern 16.1: configureStore (CRITICAL)

Typed store setup with RootState and AppDispatch inference.

```typescript
// src/app/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { rootReducer } from './rootReducer';
import { apiSlice } from '@/shared/api/apiSlice';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(apiSlice.middleware),
  devTools: import.meta.env.DEV,
});

// Type inference
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — use these instead of plain useDispatch/useSelector
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

```typescript
// src/app/store/rootReducer.ts
import { combineSlices } from '@reduxjs/toolkit';
import { userSlice } from '@/features/user-management/model/userSlice';
import { authSlice } from '@/features/auth/model/authSlice';
import { apiSlice } from '@/shared/api/apiSlice';

export const rootReducer = combineSlices(userSlice, authSlice, apiSlice);
```

---

### Pattern 16.2: createSlice (CRITICAL)

Typed reducers with immer-powered immutable updates.

```typescript
// src/features/user-management/model/userSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserUIState {
  selectedId: string | null;
  filterRole: string | null;
  sortField: 'name' | 'email' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  isFormOpen: boolean;
}

const initialState: UserUIState = {
  selectedId: null,
  filterRole: null,
  sortField: 'name',
  sortOrder: 'asc',
  isFormOpen: false,
};

export const userSlice = createSlice({
  name: 'userUI',
  initialState,
  reducers: {
    selectUser: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload;
    },
    setFilterRole: (state, action: PayloadAction<string | null>) => {
      state.filterRole = action.payload;
    },
    setSort: (state, action: PayloadAction<{ field: UserUIState['sortField']; order: UserUIState['sortOrder'] }>) => {
      state.sortField = action.payload.field;
      state.sortOrder = action.payload.order;
    },
    toggleForm: (state) => {
      state.isFormOpen = !state.isFormOpen;
    },
    resetFilters: () => initialState,
  },
});

export const { selectUser, setFilterRole, setSort, toggleForm, resetFilters } = userSlice.actions;
```

---

### Pattern 16.3: createAsyncThunk (HIGH)

Typed async operations with automatic pending/fulfilled/rejected state.

```typescript
// src/features/auth/model/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store/store';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export const login = createAsyncThunk<
  { user: User; token: string },    // Return type
  { email: string; password: string }, // Argument type
  { rejectValue: string }            // Rejected value type
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await authService.login(credentials);
      return result;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null, status: 'idle', error: null } as AuthState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Login failed';
      });
  },
});
```

---

### Pattern 16.4: RTK Query (HIGH)

Auto-generated hooks for API calls with built-in caching.

```typescript
// src/shared/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/app/store/store';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Order'],
  endpoints: (builder) => ({
    getUsers: builder.query<PaginatedResponse<User>, PaginationParams>({
      query: (params) => ({ url: '/users', params }),
      providesTags: (result) =>
        result?.items
          ? [...result.items.map(({ id }) => ({ type: 'User' as const, id })), { type: 'User', id: 'LIST' }]
          : [{ type: 'User', id: 'LIST' }],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<User, CreateUserDTO>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
} = apiSlice;
```

---

### Pattern 16.5: Entity Adapter (MEDIUM-HIGH)

Normalized state for entity collections.

```typescript
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

const usersAdapter = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.displayName.localeCompare(b.displayName),
});

export const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState({ loading: false }),
  reducers: {
    userAdded: usersAdapter.addOne,
    userUpdated: usersAdapter.updateOne,
    userRemoved: usersAdapter.removeOne,
    usersReceived: usersAdapter.setAll,
  },
});

// Typed selectors
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors((state: RootState) => state.users);
```

---

### Pattern 16.6: Listener Middleware (MEDIUM)

Side effect middleware replacing redux-saga for simpler cases.

```typescript
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { login, authSlice } from '@/features/auth/model/authSlice';

export const listenerMiddleware = createListenerMiddleware();

// Listen for auth changes
listenerMiddleware.startListening({
  matcher: isAnyOf(login.fulfilled, authSlice.actions.logout),
  effect: (action, listenerApi) => {
    if (login.fulfilled.match(action)) {
      localStorage.setItem('token', action.payload.token);
    } else {
      localStorage.removeItem('token');
      listenerApi.dispatch(apiSlice.util.resetApiState());
    }
  },
});
```

---

### Pattern 16.7: FSD Integration (MEDIUM)

```
src/
├── app/store/
│   ├── store.ts           # configureStore + typed hooks
│   └── rootReducer.ts     # combineSlices
├── features/
│   ├── auth/model/authSlice.ts
│   └── user-management/model/userSlice.ts
├── entities/
│   └── user/model/usersEntitySlice.ts  # Entity adapter
└── shared/api/
    └── apiSlice.ts        # RTK Query API definition
```

---

### Pattern 16.8: Zustand vs Redux Decision (MEDIUM)

| Criteria | Zustand | Redux Toolkit |
|----------|---------|---------------|
| Bundle size | ~1KB | ~11KB |
| Boilerplate | Minimal | Moderate |
| Middleware | Basic | Rich ecosystem |
| DevTools | Via middleware | Built-in |
| Time-travel | No | Yes |
| RTK Query | No | Built-in |
| Learning curve | Easy | Moderate |
| **Recommendation** | **New projects** | **Legacy migration, complex middleware** |

---

### Pattern 16.9: Testing RTK (MEDIUM)

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { renderWithStore } from '@/shared/test/renderWithStore';

function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

it('dispatches createUser and invalidates list', async () => {
  const store = createTestStore();
  const { result } = renderHook(() => useCreateUserMutation(), {
    wrapper: ({ children }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
  // Test mutation...
});
```

---

### Pattern 16.10: Anti-patterns (MEDIUM)

**1. Over-normalized state** — Entity adapter for 10-item lists.
**2. Unnecessary thunks** — createAsyncThunk for simple setState.
**3. Selectors without reselect** — Computing in component instead of createSelector.
**4. Storing server state** — Same as Zustand: use RTK Query, not manual slice state.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (16.1–16.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Redux Toolkit Specialist | EPS v3.2 | Metadata v2.1*
