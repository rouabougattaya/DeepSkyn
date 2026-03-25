import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { OpenRouterService } from '../ai/openrouter.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async startSession(userId: string): Promise<ChatSession> {
    this.logger.log(`Starting new chat session for user: ${userId}`);
    
    const session = this.sessionRepo.create({
      userId,
      isActive: true,
    });
    
    return this.sessionRepo.save(session);
  }

  async handleChatMessage(sessionId: string, message: string): Promise<string> {
    this.logger.log(`New message for session ${sessionId}: ${message.slice(0, 30)}...`);
    
    const systemPrompt = `
      Tu es un dermatologue virtuel intelligent pour DeepSkyn.
      Réponds avec courtoisie et professionnalisme en français.
      Aide l'utilisateur à comprendre les résultats de son analyse de peau et donne des conseils de routine.
      Mentionne toujours que tes conseils ne remplacent pas une consultation médicale réelle.
    `;

    return this.openRouterService.chat(message, systemPrompt);
  }
}
