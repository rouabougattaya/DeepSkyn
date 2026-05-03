import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
    NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { ActivityQueryDto, ActivityExportDto } from './activity.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ActivityType, RiskLevel } from './activity.entity';

// Decorator to extract JWT payload from request (attached by guard)
interface AuthRequest extends Request {
    user?: { userId: string; email: string; role?: string };
}

@ApiTags('activity')
@Controller('auth/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    // GET /auth/activity — paginated list
    @Get()
    @ApiOperation({ summary: 'Get activity timeline (paginated, filterable)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false, enum: ActivityType })
    @ApiQuery({ name: 'riskLevel', required: false, enum: RiskLevel })
    @ApiQuery({ name: 'dateFrom', required: false, type: String })
    @ApiQuery({ name: 'dateTo', required: false, type: String })
    async findAll(@Query() query: ActivityQueryDto, @Req() req: AuthRequest) {
        const userId = req.user.userId;
        const isAdmin = req.user.role === 'ADMIN';
        return this.activityService.findAll(query, userId, isAdmin);
    }

    // GET /auth/activity/summary — Gemini 7-day summary
    @Get('summary')
    @ApiOperation({ summary: 'Get AI-generated 7-day security summary' })
    async getSecuritySummary(@Req() req: AuthRequest) {
        return this.activityService.generateSecuritySummary(req.user.userId);
    }

    // GET /auth/activity/integrity — Verify hash chain
    @Get('integrity')
    @ApiOperation({ summary: 'Verify hash chain integrity for current user' })
    async verifyIntegrity(@Req() req: AuthRequest) {
        return this.activityService.verifyIntegrity(req.user.userId);
    }

    // GET /auth/activity/export — CSV/PDF export
    @Get('export')
    @ApiOperation({ summary: 'Export security log as CSV' })
    async export(
        @Query() dto: ActivityExportDto,
        @Req() req: AuthRequest,
        @Res() res: Response,
    ) {
        const userId = req.user.userId;
        const isAdmin = req.user.role === 'ADMIN';
        const csv = await this.activityService.exportCsv(userId, isAdmin, dto.dateFrom, dto.dateTo);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="security-log-${Date.now()}.csv"`);
        res.send(csv);
    }

    // GET /auth/activity/:id — single activity
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific activity by ID' })
    async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
        const userId = req.user.userId;
        const isAdmin = req.user.role === 'ADMIN';
        const activity = await this.activityService.findOne(id, userId, isAdmin);
        if (!activity) throw new NotFoundException('Activity not found');
        return activity;
    }
}
