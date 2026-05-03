import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { OpenRouterService } from '../ai/openrouter.service';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { FitzpatrickQuestionnaire } from '../fitzpatrickQuestionnaire/fitzpatrick-questionnaire.entity';
import { UserProfile } from '../userProfile/user-profile.entity';
import { getEnhancedPersonalizedPrompt } from './prompts/system-prompts';
import { SubscriptionService } from '../subscription/subscription.service';

type SeverityLevel = 'mild' | 'moderate' | 'severe';

export interface ChatContextPayload {
  message: string;
  sessionTitle?: string;
  chatLimit?: {
    limit: number;
    remaining: number;
    plan: string;
  };
  analysis: {
    age: number;
    acne: number;
    hydration: number;
    wrinkles: number;
    pores: number;
    sensitivity: number;
  };
  realAge: number;
  skinAge: number;
  conditions: {
    acne: {
      enabled: boolean;
      severity: SeverityLevel;
      type: string;
      location: string[];
    };
  };
}

export interface HandleChatMessageInput {
  sessionId?: string;
  userId?: string;
  message: string;
}

// Simple in-memory cache for chat responses
const chatCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(SkinAnalysis)
    private readonly analysisRepo: Repository<SkinAnalysis>,
    @InjectRepository(SkinMetric)
    private readonly metricRepo: Repository<SkinMetric>,
    @InjectRepository(FitzpatrickQuestionnaire)
    private readonly questionnaireRepo: Repository<FitzpatrickQuestionnaire>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    private readonly openRouterService: OpenRouterService,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  async startSession(userId: string, forceNew = false): Promise<ChatSession> {
    if (!forceNew) {
      this.logger.log(`Checking for active chat session for user: ${userId}`);

      const activeSession = await this.sessionRepo.findOne({
        where: { userId, isActive: true },
        order: { createdAt: 'DESC' },
      });

      if (activeSession) {
        this.logger.log(`Reusing active session: ${activeSession.id}`);
        return activeSession;
      }
    }

    this.logger.log(`Starting new chat session for user: ${userId} (forceNew: ${forceNew})`);

    // Deactivate previous sessions for this user
    await this.sessionRepo.update({ userId, isActive: true }, { isActive: false });

    const session = this.sessionRepo.create({
      userId,
      isActive: true,
    });

    return this.sessionRepo.save(session);
  }

  async handleChatMessage(input: HandleChatMessageInput): Promise<ChatContextPayload> {
    const { sessionId, message } = input;
    this.logger.log(`New message for session ${sessionId ?? 'no-session'}: ${message.slice(0, 30)}...`);

    // Check cache
    const cacheKey = `${sessionId}:${message}`;
    const cached = chatCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      this.logger.log(`Returning cached response for session ${sessionId}`);
      return cached.response;
    }

    const resolvedUserId = await this.resolveUserId(input);
    await this.checkUserLimits(resolvedUserId, sessionId);

    const userSkinContext = await this.buildUserSkinContext(resolvedUserId);
    const plan = await this.getUserPlan(resolvedUserId);

    if (sessionId) {
      await this.saveMessage(sessionId, 'user', message);
    }

    // Fetch message history for context (last 6 messages)
    let historyContext = '';
    if (sessionId) {
      const history = await this.messageRepo.find({
        where: { sessionId },
        order: { createdAt: 'DESC' },
        take: 6,
      });
      const reversedHistory = [...history].reverse();
      historyContext = reversedHistory
        .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
        .join('\n');
    }

    // Generate title if it's the first message or if title is still default
    const sessionTitle = await this.handleSessionTitle(sessionId, message);
    const systemPrompt = this.buildSystemPrompt(historyContext, userSkinContext);
    const aiMessage = await this.openRouterService.chat(message, systemPrompt, plan);

    if (sessionId) {
      await this.saveMessage(sessionId, 'assistant', aiMessage);
    }

    const { remaining, limit } = await this.subscriptionService.checkChatLimit(resolvedUserId);

    const result = {
      ...userSkinContext,
      message: aiMessage,
      sessionTitle,
      chatLimit: {
        limit,
        remaining,
        plan
      }
    };

    // Store in cache
    if (sessionId) {
      chatCache.set(cacheKey, { response: result, timestamp: Date.now() });
    }

    return result;
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session) return;

    // Delete associated messages first
    await this.messageRepo.delete({ sessionId });
    // Delete session
    await this.sessionRepo.delete(sessionId);
    this.logger.log(`Deleted session ${sessionId} for user ${userId}`);
  }

  async renameSession(sessionId: string, userId: string, title: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session) return;

    await this.sessionRepo.update(sessionId, { title });
    this.logger.log(`Renamed session ${sessionId} to: ${title}`);
  }

  private async updateSessionTitle(sessionId: string, firstMessage: string): Promise<string> {
    const prompt = `Crée un titre très court (3-5 mots max) en français pour une discussion qui commence par : "${firstMessage}". Retourne uniquement le titre, sans ponctuation superflue.`;
    try {
      const titleResponse = await this.openRouterService.chat(prompt, 'Tu es un assistant qui génère des titres de discussion.');
      const title = titleResponse.replace(/"/g, '').trim();
      await this.sessionRepo.update(sessionId, { title });
      this.logger.log(`Updated title for session ${sessionId}: ${title}`);
      return title;
    } catch (err) {
      this.logger.error(`Failed to generate title for session ${sessionId}: ${err.message}`);
      // Fallback: use snippet of message
      const fallbackTitle = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
      await this.sessionRepo.update(sessionId, { title: fallbackTitle });
      return fallbackTitle;
    }
  }

  async getPersonalizedResponse(message: string, userId: string): Promise<string> {
    this.logger.log(`Generating personalized response for user: ${userId}`);
    const context = await this.buildUserSkinContext(userId);
    const enhancedPrompt = getEnhancedPersonalizedPrompt(context);

    return this.openRouterService.chat(message, enhancedPrompt);
  }

  private async resolveUserId(input: HandleChatMessageInput): Promise<string> {
    if (input.userId) return input.userId;
    if (!input.sessionId) return '';

    const session = await this.sessionRepo.findOne({ where: { id: input.sessionId } });
    return session?.userId ?? '';
  }

  private toSafeNumber(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  private normalizeSeverity(value: unknown): SeverityLevel {
    const normalized = String(value ?? '').toLowerCase();
    if (normalized.includes('severe') || normalized.includes('high') || normalized.includes('élevé')) return 'severe';
    if (normalized.includes('moderate') || normalized.includes('medium') || normalized.includes('modéré')) return 'moderate';
    return 'mild';
  }

  private extractLocations(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(v => String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private getAcneSeverityFromScore(score: number): 'severe' | 'moderate' | 'mild' {
    if (score >= 70) return 'severe';
    if (score >= 45) return 'moderate';
    return 'mild';
  }

  private findAcneSource(answers: any, skinConcerns: any): any {
    const fromAnswers =
      answers?.conditions?.acne ??
      answers?.acne ??
      (Array.isArray(answers?.conditions)
        ? answers.conditions.find((item: any) => String(item?.type ?? item?.name ?? '').toLowerCase().includes('acne'))
        : null);
    const fromConcerns =
      skinConcerns?.acne ??
      (Array.isArray(skinConcerns)
        ? skinConcerns.find((item: any) => String(item?.type ?? item ?? '').toLowerCase().includes('acne'))
        : null);
    return fromAnswers ?? fromConcerns ?? null;
  }

  private extractAcneCondition(answers: any, skinConcerns: any, acneScore: number) {
    const source = this.findAcneSource(answers, skinConcerns);
    const enabled = Boolean(source) || acneScore >= 35;
    const rawSeverity = source?.severity ?? source?.level ?? source?.intensity;
    const severity = this.normalizeSeverity(
      rawSeverity ?? this.getAcneSeverityFromScore(acneScore)
    );
    const type =
      String(source?.type ?? source?.subtype ?? source?.kind ?? (enabled ? 'general' : 'none')).trim() ||
      'none';
    const location = this.extractLocations(source?.location ?? source?.locations ?? source?.zone ?? source?.areas);
    return { enabled, severity, type, location };
  }

  private async buildUserSkinContext(userId: string): Promise<Omit<ChatContextPayload, 'message'>> {
    const defaultContext: Omit<ChatContextPayload, 'message'> = {
      analysis: {
        age: 0,
        acne: 0,
        hydration: 0,
        wrinkles: 0,
        pores: 0,
        sensitivity: 0,
      },
      realAge: 0,
      skinAge: 0,
      conditions: {
        acne: {
          enabled: false,
          severity: 'mild',
          type: 'none',
          location: [],
        },
      },
    };

    if (!userId) return defaultContext;

    const latestAnalysis = await this.analysisRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'realAge', 'skinAge', 'acne', 'hydration', 'wrinkles', 'oil', 'aiRawResponse'],
    });

    const analysisId = latestAnalysis?.id;
    const [metrics, questionnaire, userProfile] = await Promise.all([
      analysisId
        ? this.metricRepo.find({ where: { analysisId } })
        : Promise.resolve([] as SkinMetric[]),
      this.questionnaireRepo.findOne({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.userProfileRepo.findOne({ where: { userId }, order: { createdAt: 'DESC' } }),
    ]);

    const readMetric = (candidates: string[]): number | null => {
      const match = metrics.find(m =>
        candidates.some(candidate => m.metricType?.toLowerCase() === candidate.toLowerCase()),
      );
      if (!match) return null;
      return this.toSafeNumber(match.score, 0);
    };

    const realAge = this.toSafeNumber(
      latestAnalysis?.realAge ?? latestAnalysis?.aiRawResponse?.userInputAge,
      0,
    );

    const pores = this.toSafeNumber(
      readMetric(['Enlarged-Pores', 'pores', 'oil']) ?? latestAnalysis?.oil,
      0,
    );

    const sensitivity = this.toSafeNumber(
      readMetric(['Skin Redness', 'sensitivity', 'redness']),
      0,
    );

    const acne = this.toSafeNumber(
      latestAnalysis?.acne ?? readMetric(['Acne']),
      0,
    );
    const hydration = this.toSafeNumber(
      latestAnalysis?.hydration ?? readMetric(['Hydration']),
      0,
    );
    const wrinkles = this.toSafeNumber(
      latestAnalysis?.wrinkles ?? readMetric(['Wrinkles']),
      0,
    );

    return {
      analysis: {
        age: realAge,
        acne,
        hydration,
        wrinkles,
        pores,
        sensitivity,
      },
      realAge,
      skinAge: this.toSafeNumber(latestAnalysis?.skinAge, realAge),
      conditions: {
        acne: this.extractAcneCondition(questionnaire?.answers, userProfile?.skinConcerns, acne),
      },
    };
  }

  private async checkUserLimits(userId: string, sessionId?: string) {
    if (!userId) {
      console.warn(`[Chat-Limit] ⚠️ No resolved user ID for session ${sessionId}`);
      throw new Error('AUTH_REQUIRED');
    }
    const { allowed, remaining, limit } = await this.subscriptionService.checkChatLimit(userId);
    console.log(`[Chat-Limit] User: ${userId} | Remaining: ${remaining}/${limit}`);
    if (!allowed) {
      console.warn(`[Chat-Limit] ❌ BLOCKED: User ${userId} reached limit.`);
      throw new HttpException('LIMIT_REACHED', HttpStatus.FORBIDDEN);
    }
    await this.subscriptionService.incrementMessages(userId);
  }

  private async getUserPlan(userId: string): Promise<string> {
    if (!userId) return 'FREE';
    const sub = await this.subscriptionService.getSubscription(userId);
    return sub.plan;
  }

  private async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    await this.messageRepo.save(this.messageRepo.create({ sessionId, role, content }));
  }

  private async handleSessionTitle(sessionId?: string, message?: string): Promise<string | undefined> {
    if (!sessionId || !message) return undefined;
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (session && (!session.title || session.title === 'Nouvelle discussion')) {
      try {
        return await this.updateSessionTitle(sessionId, message);
      } catch (err) {
        this.logger.error(`Failed to update session title: ${err.message}`);
      }
    }
    return undefined;
  }

  private buildSystemPrompt(history: string, context: any): string {
    return `
      Tu es un dermatologue virtuel intelligent pour DeepSkyn.
      Réponds avec courtoisie et professionnalisme en français.
      Aide l'utilisateur à comprendre les résultats de son analyse de peau et donne des conseils de routine.
      Mentionne toujours que tes conseils ne remplacent pas une consultation médicale réelle.
      
      Historique récent de la conversation :
      ${history}

      Contexte utilisateur (JSON structuré):
      ${JSON.stringify(context, null, 2)}
    `;
  }
}
