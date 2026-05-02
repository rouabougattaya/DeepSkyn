import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { ModerationService } from '../moderation/moderation.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepository;
  let mockModerationService: any;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    bio: 'My bio',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockUsersRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockModerationService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: ModerationService,
          useValue: mockModerationService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2', email: 'user2@example.com' }];
      mockUsersRepository.find.mockResolvedValueOnce(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockUsersRepository.find).toHaveBeenCalledWith({
        select: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
      });
    });

    it('should return empty array when no users exist', async () => {
      mockUsersRepository.find.mockResolvedValueOnce([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update user when moderation check passes', async () => {
      const updateDto = { firstName: 'Jane', bio: 'New bio' };
      
      mockModerationService.check.mockResolvedValueOnce({ flagged: false, score: 0 });
      mockUsersRepository.findOne.mockResolvedValueOnce({ ...mockUser, ...updateDto });

      const result = await service.update('user-1', updateDto);

      expect(mockModerationService.check).toHaveBeenCalledWith('New bio');
      expect(mockUsersRepository.update).toHaveBeenCalledWith('user-1', updateDto);
      expect(result).toEqual({ ...mockUser, ...updateDto });
    });

    it('should throw BadRequestException when bio fails moderation', async () => {
      const updateDto = { firstName: 'Jane', bio: 'Inappropriate bio' };
      
      mockModerationService.check.mockResolvedValueOnce({ 
        flagged: true, 
        score: 0.95 
      });

      await expect(service.update('user-1', updateDto)).rejects.toThrow(BadRequestException);
      expect(mockUsersRepository.update).not.toHaveBeenCalled();
    });

    it('should not check moderation if no bio is provided', async () => {
      const updateDto = { firstName: 'Jane' };
      mockUsersRepository.findOne.mockResolvedValueOnce({ ...mockUser, ...updateDto });

      await service.update('user-1', updateDto);

      expect(mockModerationService.check).not.toHaveBeenCalled();
      expect(mockUsersRepository.update).toHaveBeenCalled();
    });

    it('should parse and convert birthDate correctly', async () => {
      const updateDto = { firstName: 'Jane', birthDate: '1990-01-15' };
      mockUsersRepository.findOne.mockResolvedValueOnce({ ...mockUser, ...updateDto });

      await service.update('user-1', updateDto);

      expect(mockUsersRepository.update).toHaveBeenCalled();
      const callArgs = mockUsersRepository.update.mock.calls[0][1];
      expect(callArgs.birthDate instanceof Date).toBe(true);
    });

    it('should throw BadRequestException for invalid birthDate', async () => {
      const updateDto = { birthDate: 'invalid-date' };

      await expect(service.update('user-1', updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should pass moderation result with correct error format', async () => {
      const updateDto = { bio: 'Bad content' };
      
      mockModerationService.check.mockResolvedValueOnce({ 
        flagged: true, 
        score: 0.87 
      });

      try {
        await service.update('user-1', updateDto);
      } catch (error: any) {
        expect(error.response.code).toBe('BIO_MODERATION_REJECTED');
        expect(error.response.field).toBe('bio');
        expect(error.response.flagged).toBe(true);
      }
    });
  });

  describe('remove', () => {
    it('should delete user and return success message', async () => {
      mockUsersRepository.delete.mockResolvedValueOnce({ affected: 1 });

      const result = await service.remove('user-1');

      expect(result).toEqual({ message: 'Compte supprimé' });
      expect(mockUsersRepository.delete).toHaveBeenCalledWith('user-1');
    });

    it('should handle deletion of non-existent user', async () => {
      mockUsersRepository.delete.mockResolvedValueOnce({ affected: 0 });

      const result = await service.remove('invalid-id');

      expect(result).toEqual({ message: 'Compte supprimé' });
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle null bio in moderation check gracefully', async () => {
      const updateDto = { firstName: 'Jane', bio: null };
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);

      // Should not call moderation check for null bio
      await service.update('user-1', updateDto);

      expect(mockUsersRepository.update).toHaveBeenCalled();
    });

    it('should handle multiple updates in succession', async () => {
      const update1 = { firstName: 'Jane' };
      const update2 = { lastName: 'Smith' };

      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      await service.update('user-1', update1);
      await service.update('user-1', update2);

      expect(mockUsersRepository.update).toHaveBeenCalledTimes(2);
    });
  });
});
