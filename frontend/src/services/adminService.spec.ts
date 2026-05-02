import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminService from './adminService';
import { authFetch } from '@/lib/authSession';

vi.mock('@/lib/authSession', () => ({
  authFetch: vi.fn(),
}));

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les statistiques admin', async () => {
    const mockStats = {
      totalUsers: 100,
      totalAdmins: 5,
      totalModerators: 2,
      newUsersThisMonth: 10,
      activeUsersThisMonth: 50,
      totalLogins: 500,
    };

    (authFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const stats = await adminService.getAdminStats();
    expect(stats).toEqual(mockStats);
    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/admin/stats'), expect.anything());
  });

  it('devrait récupérer la liste des utilisateurs', async () => {
    const mockUsersResponse = {
      data: [
        { id: '1', email: 'user@example.com', firstName: 'John', lastName: 'Doe', role: 'user' },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };

    (authFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    const response = await adminService.getAdminUsers(1, 10);
    expect(response).toEqual(mockUsersResponse);
    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/admin/users'), expect.anything());
  });

  it('devrait mettre à jour le rôle d\'un utilisateur', async () => {
    const mockUpdatedUser = { id: '1', email: 'user@example.com', role: 'admin' };
    
    (authFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedUser,
    });

    const result = await adminService.updateUserRole('1', { role: 'admin' });
    expect(result).toEqual(mockUpdatedUser);
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/1/role'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      })
    );
  });

  it('devrait gérer les erreurs API', async () => {
    (authFetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({ message: 'User not found' }),
    });

    await expect(adminService.getAdminUserDetail('999')).rejects.toThrow('User not found');
  });
});
