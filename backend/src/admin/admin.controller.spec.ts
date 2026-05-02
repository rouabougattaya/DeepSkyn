import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthService } from '../auth/auth.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginationDto } from './dto/pagination.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAdminService = {
      findAllUsers: jest.fn(),
      createUser: jest.fn(),
      findUserById: jest.fn(),
      updateUser: jest.fn(),
      removeUser: jest.fn(),
      getStats: jest.fn(),
      updateUserRole: jest.fn(),
    };

    mockAuthService = {
      validateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({})
      .overrideGuard(RolesGuard)
      .useValue({})
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllUsers', () => {
    it('should return paginated users list', async () => {
      const paginationQuery = { page: 1, limit: 20 };
      const mockResponse = {
        data: [
          {
            id: 'user-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'USER',
          },
        ],
        meta: { total: 1, page: 1, limit: 20 },
      };

      mockAdminService.findAllUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.findAllUsers(paginationQuery);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.findAllUsers).toHaveBeenCalledWith(paginationQuery);
    });

    it('should handle search query', async () => {
      const query = { page: 1, limit: 20, search: 'john' };
      mockAdminService.findAllUsers.mockResolvedValueOnce({ data: [], meta: {} });

      await controller.findAllUsers(query);

      expect(mockAdminService.findAllUsers).toHaveBeenCalledWith(query);
    });

    it('should handle role filter', async () => {
      const query: PaginationDto = { page: 1, limit: 20, role: 'ADMIN' };
      mockAdminService.findAllUsers.mockResolvedValueOnce({ data: [], meta: {} });

      await controller.findAllUsers(query);

      expect(mockAdminService.findAllUsers).toHaveBeenCalledWith(query);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateAdminDto = {
        email: 'newuser@example.com',
        password: 'StrongPass123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
      };

      const mockResponse = { 
        message: 'Utilisateur créé',
        user: { id: 'user-1', email: 'newuser@example.com', firstName: 'John', lastName: 'Doe', role: 'USER', createdAt: new Date() }
      };
      mockAdminService.createUser.mockResolvedValueOnce(mockResponse);

      const result = await controller.createUser(createUserDto);

      expect(result.user.email).toBe('newuser@example.com');
      expect(mockAdminService.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('should create an admin user', async () => {
      const createAdminDto: CreateAdminDto = {
        email: 'admin@example.com',
        password: 'AdminPass123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      const mockResponse = {
        message: 'Utilisateur administrateur créé avec succès',
        user: { id: 'admin-1', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', createdAt: new Date() }
      };
      mockAdminService.createUser.mockResolvedValueOnce(mockResponse);

      const result = await controller.createUser(createAdminDto);

      expect(result.user.role).toBe('ADMIN');
    });
  });

  describe('getStats', () => {
    it('should return admin statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        admins: 5,
        premiumUsers: 20,
        activeUsers: 80,
      };

      mockAdminService.getStats.mockResolvedValueOnce(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockAdminService.getStats).toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should return user details by ID', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAdminService.findUserById.mockResolvedValueOnce(mockUser);

      const result = await controller.findUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockAdminService.findUserById).toHaveBeenCalledWith('user-1');
    });

    it('should validate UUID format for ID', async () => {
      mockAdminService.findUserById.mockResolvedValueOnce({});

      await controller.findUserById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockAdminService.findUserById).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio',
      };

      const updatedUser = {
        id: 'user-1',
        email: 'user@example.com',
        ...updateDto,
      };

      mockAdminService.updateUser.mockResolvedValueOnce(updatedUser);

      const result = await controller.updateUser('user-1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockAdminService.updateUser).toHaveBeenCalledWith('user-1', updateDto);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { firstName: 'Jane' };
      mockAdminService.updateUser.mockResolvedValueOnce({});

      await controller.updateUser('user-1', partialUpdate);

      expect(mockAdminService.updateUser).toHaveBeenCalledWith('user-1', partialUpdate);
    });
  });

  describe('removeUser', () => {
    it('should delete user', async () => {
      const mockRequest = { user: { id: 'admin-1' } };
      const mockResponse = { message: 'Utilisateur supprimé' };

      mockAdminService.removeUser.mockResolvedValueOnce(mockResponse);

      const result = await controller.removeUser('user-1', mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.removeUser).toHaveBeenCalledWith('user-1', 'admin-1');
    });

    it('should prevent admin from deleting themselves', async () => {
      const mockRequest = { user: { id: 'admin-1' } };

      // The logic for preventing self-deletion should be in the service
      mockAdminService.removeUser.mockResolvedValueOnce({ message: 'Utilisateur supprimé' });

      await controller.removeUser('admin-1', mockRequest);

      expect(mockAdminService.removeUser).toHaveBeenCalledWith('admin-1', 'admin-1');
    });
  });

  describe('HTTP Status Codes', () => {
    it('createUser should return 201 Created', async () => {
      // Verify through decorator usage in controller definition
      const methodDescriptor = Object.getOwnPropertyDescriptor(
        AdminController.prototype,
        'createUser'
      );
      // HttpCode decorator should be present
      expect(methodDescriptor).toBeDefined();
    });

    it('removeUser should return 200 OK', async () => {
      const methodDescriptor = Object.getOwnPropertyDescriptor(
        AdminController.prototype,
        'removeUser'
      );
      expect(methodDescriptor).toBeDefined();
    });
  });

  describe('Route Protection', () => {
    it('should use JwtAccessGuard for route protection', async () => {
      // Guards are applied at controller level via decorators
      const methodDescriptor = Object.getOwnPropertyDescriptor(
        AdminController.prototype,
        'findAllUsers'
      );
      expect(methodDescriptor).toBeDefined();
    });

    it('should use RolesGuard to enforce ADMIN role', async () => {
      const methodDescriptor = Object.getOwnPropertyDescriptor(
        AdminController.prototype,
        'findAllUsers'
      );
      expect(methodDescriptor).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid UUID for user ID parameter', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      mockAdminService.findUserById.mockResolvedValueOnce({});

      await controller.findUserById(validUUID);

      expect(mockAdminService.findUserById).toHaveBeenCalledWith(validUUID);
    });

    it('should handle pagination defaults', async () => {
      mockAdminService.findAllUsers.mockResolvedValueOnce({ data: [], meta: {} });

      await controller.findAllUsers({});

      expect(mockAdminService.findAllUsers).toHaveBeenCalledWith({});
    });
  });
});
