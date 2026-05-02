import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { User } from '../user/user.entity';
import { Subscription } from '../subscription/subscription.entity';
import { PaginationDto } from './dto/pagination.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AdminService', () => {
  let service: AdminService;
  let mockUsersRepository;
  let mockSubscriptionRepository;

  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    isEmailVerified: true,
    isPremium: false,
    isTwoFAEnabled: false,
    authMethod: 'PASSWORD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUsersRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockSubscriptionRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllUsers', () => {
    it('should return paginated users with default pagination', async () => {
      const users = [mockUser];
      mockUsersRepository.findAndCount.mockResolvedValueOnce([users, 1]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      };
      mockSubscriptionRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.findAllUsers({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should apply search filter', async () => {
      const query: PaginationDto = { search: 'admin' };
      mockUsersRepository.findAndCount.mockResolvedValueOnce([[mockUser], 1]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      };
      mockSubscriptionRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);

      await service.findAllUsers(query);

      expect(mockUsersRepository.findAndCount).toHaveBeenCalled();
    });

    it('should apply role filter', async () => {
      const query: PaginationDto = { role: 'ADMIN' };
      mockUsersRepository.findAndCount.mockResolvedValueOnce([[mockUser], 1]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      };
      mockSubscriptionRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);

      await service.findAllUsers(query);

      expect(mockUsersRepository.findAndCount).toHaveBeenCalled();
    });

    it('should apply custom pagination', async () => {
      const query: PaginationDto = { page: 2, limit: 50 };
      mockUsersRepository.findAndCount.mockResolvedValueOnce([[mockUser], 100]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      };
      mockSubscriptionRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.findAllUsers(query);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(50);
    });

    it('should calculate pagination metadata correctly', async () => {
      mockUsersRepository.findAndCount.mockResolvedValueOnce([[mockUser], 100]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      };
      mockSubscriptionRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.findAllUsers({ page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should attach subscription plan to users', async () => {
      const userWithoutSub = { ...mockUser, id: 'user-2' };
      mockUsersRepository.findAndCount.mockResolvedValueOnce([[mockUser, userWithoutSub], 2]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([
          { sub_userId: 'user-1', sub_plan: 'PREMIUM' }
        ]),
      };
      mockSubscriptionRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.findAllUsers({});

      expect(result.data[0].plan).toBe('PREMIUM');
      expect(result.data[1].plan).toBe('FREE');
    });
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const dto: CreateAdminDto = {
        email: 'newuser@example.com',
        password: 'StrongPass123',
        firstName: 'New',
        lastName: 'User',
        role: 'USER',
        birthDate: '1990-01-15',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
      mockUsersRepository.create.mockReturnValueOnce({ ...dto, passwordHash: 'hashed_password', id: 'new-user-1' });
      mockUsersRepository.save.mockResolvedValueOnce({ ...dto, id: 'new-user-1', passwordHash: 'hashed_password' });

      const result = await service.createUser(dto);

      expect(result.user.id).toBe('new-user-1');
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass123', 12);
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto: CreateAdminDto = {
        email: 'admin@example.com',
        password: 'StrongPass123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
    });

    it('should normalize email to lowercase', async () => {
      const dto: CreateAdminDto = {
        email: 'NewUser@Example.com',
        password: 'StrongPass123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
      mockUsersRepository.create.mockReturnValueOnce({
        ...dto,
        email: 'newuser@example.com',
        passwordHash: 'hashed_password',
        id: 'new-user-1',
      });
      mockUsersRepository.save.mockResolvedValueOnce({
        ...dto,
        email: 'newuser@example.com',
        passwordHash: 'hashed_password',
        id: 'new-user-1',
      });

      const result = await service.createUser(dto);

      expect(result.user.email).toBe('newuser@example.com');
    });

    it('should parse birthDate correctly', async () => {
      const dto: CreateAdminDto = {
        email: 'newuser@example.com',
        password: 'StrongPass123',
        firstName: 'New',
        lastName: 'User',
        birthDate: '1990-05-20',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
      mockUsersRepository.create.mockReturnValueOnce({});

      await service.createUser(dto);

      const createCall = mockUsersRepository.create.mock.calls[0][0];
      expect(createCall.birthDate instanceof Date).toBe(true);
    });

    it('should set birthDate to null if not provided', async () => {
      const dto: CreateAdminDto = {
        email: 'newuser@example.com',
        password: 'StrongPass123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
      mockUsersRepository.create.mockReturnValueOnce({});

      await service.createUser(dto);

      const createCall = mockUsersRepository.create.mock.calls[0][0];
      expect(createCall.birthDate).toBeNull();
    });

    it('should use ADMIN role for user creation', async () => {
      const dto: CreateAdminDto = {
        email: 'newadmin@example.com',
        password: 'StrongPass123',
        firstName: 'New',
        lastName: 'Admin',
        role: 'ADMIN',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
      mockUsersRepository.create.mockReturnValueOnce({});

      await service.createUser(dto);

      const createCall = mockUsersRepository.create.mock.calls[0][0];
      expect(createCall.role).toBe('ADMIN');
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findUserById('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findUserById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateDto: AdminUpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUsersRepository.update.mockResolvedValueOnce({ affected: 1 });
      mockUsersRepository.findOne.mockResolvedValueOnce({ ...mockUser, ...updateDto });

      const result = await service.updateUser('user-1', updateDto);

      expect(result).toEqual(expect.objectContaining(updateDto));
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.updateUser('invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUser', () => {
    it('should delete user successfully', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUsersRepository.delete.mockResolvedValueOnce({ affected: 1 });

      const result = await service.removeUser('user-2', 'admin-id');

      expect(result.message).toContain('supprimé');
      expect(result.deletedUserId).toBe('user-2');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.removeUser('invalid-id', 'admin-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return admin statistics', async () => {
      mockUsersRepository.count.mockResolvedValue(10);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([
          { authMethod: 'PASSWORD', count: '8' },
          { authMethod: 'GOOGLE', count: '2' },
        ]).mockResolvedValueOnce([
          { date: '2025-04-25', count: '2' },
          { date: '2025-04-26', count: '3' },
        ]),
      };
      
      mockUsersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStats();

      expect(result.users.total).toBe(10);
      expect(result.authMethods).toBeDefined();
      expect(result.registrationTrend).toBeDefined();
      expect(Array.isArray(result.registrationTrend)).toBe(true);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUsersRepository.update.mockResolvedValueOnce({ affected: 1 });
      mockUsersRepository.findOne.mockResolvedValueOnce({ ...mockUser, role: 'ADMIN' });

      const result = await service.updateUserRole('user-1', { role: 'ADMIN' }, 'admin-1');

      expect(result.message).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.updateUserRole('invalid-id', { role: 'ADMIN' }, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
