import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ModerationService } from '../moderation/moderation.service'; // 🔥 IMPORTANT

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly moderationService: ModerationService, // 🔥 INJECTION
  ) {}

  async findById(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async findAll() {
    return this.usersRepo.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
    });
  }

  async update(id: string, dto: UpdateUserDto) {

    // 🔥 MODERATION CHECK
    if (dto.bio) {
      const moderation = await this.moderationService.check(dto.bio);

      console.log("Moderation result:", moderation);

      if (moderation.flagged) {
        throw new BadRequestException(
          `Bio inappropriée détectée (score: ${moderation.score})`
        );
      }
    }

    await this.usersRepo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string) {
    await this.usersRepo.delete(id);
    return { message: 'Compte supprimé' };
  }
}