# 🚀 Quick Reference: Migrating Services to httpClient

Copy-paste templates to quickly update your services.

---

## Template 1: Simple GET Service

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const productService = {
  async getProducts() {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getProductById(id: string) {
    const response = await fetch(`${API_URL}/products/${id}`);
    if (!response.ok) throw new Error('Product not found');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const productService = {
  async getProducts() {
    return httpClient.get('/products');
  },

  async getProductById(id: string) {
    return httpClient.get(`/products/${id}`);
  },
};
```

---

## Template 2: Service with POST/PUT/DELETE

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const userService = {
  async updateProfile(userId: string, data: any) {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Update failed');
    return response.json();
  },

  async deleteUser(userId: string) {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Delete failed');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const userService = {
  async updateProfile(userId: string, data: any) {
    return httpClient.put(`/users/${userId}`, data);
  },

  async deleteUser(userId: string) {
    return httpClient.delete(`/users/${userId}`);
  },
};
```

---

## Template 3: Service with Error Handling

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const aiService = {
  async analyzeImage(imageId: string) {
    try {
      const response = await fetch(`${API_URL}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Analysis failed');
      }

      return response.json();
    } catch (error) {
      console.error('AI error:', error);
      throw error;
    }
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const aiService = {
  async analyzeImage(imageId: string) {
    try {
      return await httpClient.post('/ai/analyze', { imageId });
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else if (error.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      } else if (error.status === 422) {
        throw new Error('Invalid image. Please try another one.');
      }
      throw new Error(error.message || 'Analysis failed');
    }
  },
};
```

---

## Template 4: Service with Complex CRUD

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const routineService = {
  async getRoutines() {
    const res = await fetch(`${API_URL}/routines`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },

  async createRoutine(data: any) {
    const res = await fetch(`${API_URL}/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Create failed');
    return res.json();
  },

  async updateRoutine(id: string, data: any) {
    const res = await fetch(`${API_URL}/routines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  },

  async deleteRoutine(id: string) {
    const res = await fetch(`${API_URL}/routines/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const routineService = {
  async getRoutines() {
    return httpClient.get('/routines');
  },

  async createRoutine(data: any) {
    return httpClient.post('/routines', data);
  },

  async updateRoutine(id: string, data: any) {
    return httpClient.put(`/routines/${id}`, data);
  },

  async deleteRoutine(id: string) {
    return httpClient.delete(`/routines/${id}`);
  },
};
```

---

## Template 5: Service with Type Safety

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const sessionService = {
  async getSessions() {
    const response = await fetch(`${API_URL}/sessions`);
    if (!response.ok) throw new Error('Failed to get sessions');
    return response.json();
  },

  async destroySession(sessionId: string) {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to destroy session');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

interface Session {
  id: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
}

export const sessionService = {
  async getSessions() {
    return httpClient.get<Session[]>('/sessions');
  },

  async destroySession(sessionId: string) {
    return httpClient.delete<void>(`/sessions/${sessionId}`);
  },
};
```

---

## Template 6: Service with Optional Parameters

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const analysisService = {
  async getAnalyses(limit?: number, offset?: number) {
    let url = `${API_URL}/analyses`;
    if (limit || offset) {
      const params = new URLSearchParams();
      if (limit) params.append('limit', String(limit));
      if (offset) params.append('offset', String(offset));
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch analyses');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const analysisService = {
  async getAnalyses(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (offset) params.append('offset', String(offset));
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return httpClient.get(`/analyses${query}`);
  },
};
```

---

## Template 7: Public Endpoints (No Auth Required)

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const publicService = {
  async getPublicProducts() {
    const response = await fetch(`${API_URL}/public/products`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const publicService = {
  async getPublicProducts() {
    // Skip auth for public endpoints
    return httpClient.get('/public/products', { skipAuth: true });
  },
};
```

---

## Template 8: Upload File with FormData

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const uploadService = {
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header!
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

interface UploadResponse {
  url: string;
  filename: string;
}

export const uploadService = {
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    // Need custom fetch for FormData (not using JSON)
    try {
      const token = localStorage.getItem('accessToken');
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/upload`,
        {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Upload failed');
      return response.json() as Promise<UploadResponse>;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },
};
```

---

## Template 9: Batch Operations

### Before ❌
```typescript
const API_URL = 'http://localhost:3001/api';

export const batchService = {
  async deleteMultiple(ids: string[]) {
    const response = await fetch(`${API_URL}/batch/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Batch delete failed');
    return response.json();
  },
};
```

### After ✅
```typescript
import { httpClient } from './httpClient';

export const batchService = {
  async deleteMultiple(ids: string[]) {
    return httpClient.post('/batch/delete', { ids });
  },
};
```

---

## Template 10: Service with Retry Logic

### After ✅ (Built-in httpClient)
```typescript
import { httpClient } from './httpClient';

export const reliableService = {
  async fetchWithRetry(path: string, maxRetries: number = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await httpClient.get(path);
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        if (error.status === 429) {
          // Rate limited - wait before retry
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        } else if (error.status < 500) {
          // Client error - don't retry
          throw error;
        } else {
          // Server error - retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  },
};
```

---

## Mass Update Script

Use this to quickly find and replace in all services:

```bash
# Find all services using fetch()
grep -l "fetch(" frontend/src/services/*.ts | grep -v httpClient

# Example replacement (manually update each file):
# 1. Add: import { httpClient } from './httpClient';
# 2. Remove: const API_URL = ...
# 3. Replace fetch() calls with httpClient methods
```

---

## Common Patterns Quick Reference

| Pattern | Before | After |
|---------|--------|-------|
| GET | `fetch(url)` + `response.json()` | `httpClient.get(path)` |
| POST | `fetch(url, { method: 'POST', body: JSON.stringify() })` | `httpClient.post(path, data)` |
| PUT | `fetch(url, { method: 'PUT', body: })` | `httpClient.put(path, data)` |
| DELETE | `fetch(url, { method: 'DELETE' })` | `httpClient.delete(path)` |
| Error 401 | Manual handling | Automatic retry with refresh |
| Add JWT | Manual with `getAccessToken()` | Automatic by httpClient |
| CORS | Manual `credentials: 'include'` | Automatic in httpClient |

---

## Estimated Migration Time

| Complexity | Files | Time per file | Total |
|------------|-------|---------------|-------|
| Simple (GET only) | ~5 | 5 min | 25 min |
| Medium (CRUD) | ~8 | 10 min | 80 min |
| Complex (upload, etc) | ~2 | 15 min | 30 min |
| **Total** | **~15** | **avg 8 min** | **~2 hours** |

---

## Validation After Update

For each service, verify:

1. ✅ Import added: `import { httpClient } from './httpClient'`
2. ✅ API_URL removed or not used
3. ✅ All `fetch()` calls replaced
4. ✅ Error handling updated
5. ✅ Types added (where applicable)
6. ✅ Test in browser DevTools → Network tab

---

**All services migrated = Zero 401 errors!** ✅
