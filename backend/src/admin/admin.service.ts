import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { AdminUpdateUserDto, UpdateRoleDto, PaginationDto, CreateAdminDto } from './dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /**
   * Liste tous les utilisateurs avec pagination, filtres et tri
   */
  async findAllUsers(query: PaginationDto) {
    const { page = 1, limit = 20, search, role, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      // Recherche par email, firstName ou lastName
      where.email = ILike(`%${search}%`);
    }

    const [users, total] = await this.usersRepo.findAndCount({
      where: search
        ? [
            { email: ILike(`%${search}%`), ...(role ? { role } : {}) },
            { firstName: ILike(`%${search}%`), ...(role ? { role } : {}) },
            { lastName: ILike(`%${search}%`), ...(role ? { role } : {}) },
          ]
        : where,
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isEmailVerified',
        'isPremium',
        'isTwoFAEnabled',
        'authMethod',
        'createdAt',
        'updatedAt',
      ],
      order: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Crée un nouvel utilisateur (admin peut créer des admins)
   */
  async createUser(dto: CreateAdminDto) {
    const emailNorm = dto.email.toLowerCase().trim();

    // Vérifier si l'email existe déjà
    const existing = await this.usersRepo.findOne({ where: { email: emailNorm } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Créer l'utilisateur
    const user = this.usersRepo.create({
      email: emailNorm,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: `${dto.firstName} ${dto.lastName}`,
      role: dto.role || 'USER',
      bio: dto.bio || null,
      isEmailVerified: true, // Admin créé = vérifié automatiquement
      isPremium: false,
      isTwoFAEnabled: false,
    });

    await this.usersRepo.save(user);

    return {
      message: `Utilisateur ${dto.role === 'ADMIN' ? 'administrateur' : ''} créé avec succès`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Récupère un utilisateur par ID (vue admin complète)
   */
  async findUserById(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'name',
        'role',
        'authMethod',
        'isEmailVerified',
        'isPremium',
        'isTwoFAEnabled',
        'bio',
        'avatarUrl',
        'aiScore',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  /**
   * Met à jour un utilisateur (admin)
   */
  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Vérifier si l'email est déjà pris par un autre utilisateur
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new BadRequestException('Cet email est déjà utilisé');
      }
    }

    await this.usersRepo.update(id, dto);
    return this.findUserById(id);
  }

  /**
   * Supprime un utilisateur
   */
  async removeUser(id: string, adminId: string) {
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Empêcher un admin de se supprimer lui-même
    if (id === adminId) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    await this.usersRepo.delete(id);

    return { message: 'Utilisateur supprimé avec succès', deletedUserId: id };
  }

  /**
   * Met à jour le rôle d'un utilisateur
   */
  async updateUserRole(id: string, dto: UpdateRoleDto, adminId: string) {
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Empêcher un admin de modifier son propre rôle
    if (id === adminId) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
    }

    await this.usersRepo.update(id, { role: dto.role });

    return {
      message: `Rôle mis à jour en ${dto.role}`,
      user: await this.findUserById(id),
    };
  }

  /**
   * Statistiques admin du dashboard
   */
  async getStats() {
    const [
      totalUsers,
      totalAdmins,
      premiumUsers,
      verifiedUsers,
      twoFAUsers,
      recentUsers,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { role: 'ADMIN' } }),
      this.usersRepo.count({ where: { isPremium: true } }),
      this.usersRepo.count({ where: { isEmailVerified: true } }),
      this.usersRepo.count({ where: { isTwoFAEnabled: true } }),
      this.usersRepo.count({
        where: {
          createdAt: this.getDateFrom(7), // 7 derniers jours
        },
      }),
    ]);

    // Répartition par méthode d'auth
    const authMethodStats = await this.usersRepo
      .createQueryBuilder('user')
      .select('user.authMethod', 'authMethod')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.authMethod')
      .getRawMany();

    // Inscriptions des 30 derniers jours (par jour)
    const registrationTrend = await this.usersRepo
      .createQueryBuilder('user')
      .select("DATE_TRUNC('day', user.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', {
        startDate: this.getDateFromDays(30),
      })
      .groupBy("DATE_TRUNC('day', user.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        premium: premiumUsers,
        verified: verifiedUsers,
        twoFAEnabled: twoFAUsers,
        newLast7Days: recentUsers,
      },
      authMethods: authMethodStats.reduce((acc, item) => {
        acc[item.authMethod] = parseInt(item.count, 10);
        return acc;
      }, {}),
      registrationTrend: registrationTrend.map((item) => ({
        date: item.date,
        count: parseInt(item.count, 10),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper: récupère une date X jours dans le passé (pour les requêtes raw)
   */
  private getDateFrom(days: number): any {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private getDateFromDays(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
