import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import * as crypto from 'crypto';
import { Activity, ActivityType, RiskLevel } from './activity.entity';
import { CreateActivityDto, ActivityQueryDto } from './activity.dto';
import { GeminiService } from '../ai/gemini.service';

interface GeminiRiskResult {
    riskLevel: 'low' | 'medium' | 'high';
    explanation: string;
    recommendedAction: 'none' | 'notify' | 'temporary_lock';
}

@Injectable()
export class ActivityService {
    private readonly logger = new Logger(ActivityService.name);

    constructor(
        @InjectRepository(Activity)
        private activityRepository: Repository<Activity>,
        private readonly geminiService: GeminiService,
    ) { }

    // ─── Hash Chain ──────────────────────────────────────────────────────────────

    private computeHash(previousHash: string, eventData: string): string {
        return crypto
            .createHash('sha256')
            .update(previousHash + eventData)
            .digest('hex');
    }

    private async getLastActivity(userId: string): Promise<Activity | null> {
        return this.activityRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    // ─── Gemini AI Risk Classification ───────────────────────────────────────────

    private async classifyRiskWithGemini(
        activity: Partial<Activity>,
    ): Promise<GeminiRiskResult> {
        const result = await this.geminiService.classifyActivityRisk(activity);
        if (result) {
            return result as GeminiRiskResult;
        }

        this.logger.warn('Gemini classification failed or returned null, using heuristic fallback');
        return this.heuristicRiskClassification(activity);
    }

    private heuristicRiskClassification(activity: Partial<Activity>): GeminiRiskResult {
        const highRiskTypes = [
            ActivityType.ACCOUNT_LOCKED,
            ActivityType.ROLE_UPDATED,
            ActivityType.LOGIN_FAILED,
        ];
        const mediumRiskTypes = [
            ActivityType.PASSWORD_CHANGED,
            ActivityType.PASSWORD_RESET_REQUEST,
            ActivityType.EMAIL_CHANGED,
            ActivityType.SESSION_TERMINATED,
            ActivityType.SENSITIVE_ACTION,
        ];

        if (activity.type && highRiskTypes.includes(activity.type)) {
            return {
                riskLevel: 'high',
                explanation: `${activity.type} is a high-risk security event.`,
                recommendedAction: 'notify',
            };
        }
        if (activity.type && mediumRiskTypes.includes(activity.type)) {
            return {
                riskLevel: 'medium',
                explanation: `${activity.type} requires attention.`,
                recommendedAction: 'notify',
            };
        }
        return {
            riskLevel: 'low',
            explanation: 'Routine user activity.',
            recommendedAction: 'none',
        };
    }

    // ─── Gemini 7-Day Security Summary ───────────────────────────────────────────

    async generateSecuritySummary(userId: string): Promise<{ summary: string; stats: any }> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activities = await this.activityRepository.find({
            where: {
                userId,
                createdAt: Between(sevenDaysAgo, new Date()),
            },
            order: { createdAt: 'DESC' },
            take: 100,
        });

        const stats = {
            total: activities.length,
            high: activities.filter((a) => a.riskLevel === RiskLevel.HIGH).length,
            medium: activities.filter((a) => a.riskLevel === RiskLevel.MEDIUM).length,
            low: activities.filter((a) => a.riskLevel === RiskLevel.LOW).length,
            loginFailures: activities.filter((a) => a.type === ActivityType.LOGIN_FAILED).length,
            uniqueIps: [...new Set(activities.map((a) => a.ipAddress).filter(Boolean))].length,
        };

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || activities.length === 0) {
            return {
                summary:
                    activities.length === 0
                        ? 'No activity recorded in the last 7 days. Your account appears inactive.'
                        : `In the past 7 days, ${stats.total} security events were recorded. ${stats.high} high-risk, ${stats.medium} medium-risk events detected.`,
                stats,
            };
        }

        const prompt = `You are a security expert AI. Summarize the following 7-day account activity for a user.

Activity Statistics:
- Total events: ${stats.total}
- High risk events: ${stats.high}
- Medium risk events: ${stats.medium}
- Low risk events: ${stats.low}
- Login failures: ${stats.loginFailures}
- Unique IP addresses: ${stats.uniqueIps}

Recent events (most recent first):
${activities
                .slice(0, 20)
                .map(
                    (a) =>
                        `- ${a.type} | Risk: ${a.riskLevel} | IP: ${a.ipAddress || 'N/A'} | ${a.createdAt.toISOString()}`,
                )
                .join('\n')}

Write a concise, professional security summary (2-3 sentences) for the user. Be specific about risks if any. Use plain text, no markdown.`;

        try {
            const summary = await this.geminiService.generateContent(prompt);
            return {
                summary: summary?.trim() || 'Unable to generate summary.',
                stats,
            };
        } catch (err) {
            this.logger.error('Gemini summary generation failed:', err.message || err);
            return {
                summary: `In the past 7 days, ${stats.total} security events were recorded. ${stats.high} high-risk events require your attention.`,
                stats,
            };
        }
    }

    // ─── Core CRUD ───────────────────────────────────────────────────────────────

    async create(dto: CreateActivityDto): Promise<Activity> {
        const last = await this.getLastActivity(dto.userId);
        const previousHash = last?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';

        const eventData = JSON.stringify({
            userId: dto.userId,
            type: dto.type,
            metadata: dto.metadata || {},
            ipAddress: dto.ipAddress,
            deviceInfo: dto.deviceInfo,
            location: dto.location,
            timestamp: new Date().toISOString(),
        });

        const currentHash = this.computeHash(previousHash, eventData);

        const activity = this.activityRepository.create({
            ...dto,
            previousHash,
            currentHash,
        });

        const saved = await this.activityRepository.save(activity);

        // Async risk classification (non-blocking)
        this.classifyRiskWithGemini(saved)
            .then(async (risk) => {
                saved.riskLevel = risk.riskLevel as RiskLevel;
                saved.riskExplanation = risk.explanation;
                saved.recommendedAction = risk.recommendedAction;
                await this.activityRepository.save(saved);
                this.logger.log(`Risk classified for activity ${saved.id}: ${risk.riskLevel}`);
            })
            .catch((err) => this.logger.error('Risk classification error:', err));

        return saved;
    }

    async findAll(query: ActivityQueryDto, requestingUserId: string, isAdmin: boolean) {
        const where: FindOptionsWhere<Activity> = {};

        // Non-admins can only see their own
        if (!isAdmin) {
            where.userId = requestingUserId;
        } else if (query.userId) {
            where.userId = query.userId;
        }

        if (query.type) where.type = query.type;
        if (query.riskLevel) where.riskLevel = query.riskLevel;

        if (query.dateFrom || query.dateTo) {
            const from = query.dateFrom ? new Date(query.dateFrom) : new Date(0);
            const to = query.dateTo ? new Date(query.dateTo) : new Date();
            where.createdAt = Between(from, to);
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const [items, total] = await this.activityRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string, userId: string, isAdmin: boolean): Promise<Activity | null> {
        const activity = await this.activityRepository.findOne({ where: { id } });
        if (!activity) return null;
        if (!isAdmin && activity.userId !== userId) return null;
        return activity;
    }

    // ─── CSV Export ───────────────────────────────────────────────────────────────

    async exportCsv(userId: string, isAdmin: boolean, dateFrom?: string, dateTo?: string): Promise<string> {
        const where: FindOptionsWhere<Activity> = {};
        if (!isAdmin) where.userId = userId;

        if (dateFrom || dateTo) {
            const from = dateFrom ? new Date(dateFrom) : new Date(0);
            const to = dateTo ? new Date(dateTo) : new Date();
            where.createdAt = Between(from, to);
        }

        const activities = await this.activityRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 10000,
        });

        const header = 'id,userId,type,riskLevel,ipAddress,deviceInfo,country,city,explanation,createdAt\n';
        const rows = activities
            .map((a) =>
                [
                    a.id,
                    a.userId,
                    a.type,
                    a.riskLevel,
                    a.ipAddress || '',
                    (a.deviceInfo || '').replace(/,/g, ';'),
                    a.location?.country || '',
                    a.location?.city || '',
                    (a.riskExplanation || '').replace(/,/g, ';'),
                    a.createdAt.toISOString(),
                ].join(','),
            )
            .join('\n');

        return header + rows;
    }

    // ─── Hash Chain Verification ──────────────────────────────────────────────────

    async verifyIntegrity(userId: string): Promise<{ valid: boolean; brokenAt?: string }> {
        const activities = await this.activityRepository.find({
            where: { userId },
            order: { createdAt: 'ASC' },
        });

        let expectedPrevious = '0000000000000000000000000000000000000000000000000000000000000000';

        for (const activity of activities) {
            if (activity.previousHash !== expectedPrevious) {
                return { valid: false, brokenAt: activity.id };
            }
            expectedPrevious = activity.currentHash;
        }

        return { valid: true };
    }
}
