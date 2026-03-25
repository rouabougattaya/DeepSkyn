import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './chat-session.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
  ) {}

  async startSession(userId: string): Promise<ChatSession> {
    this.logger.log(`Starting new chat session for user: ${userId}`);
    
    // DEV1 scope: Generate and return a new chat session to be used by the frontend
    const session = this.sessionRepo.create({
      userId,
      isActive: true,
    });
    
    return this.sessionRepo.save(session);
  }
}
