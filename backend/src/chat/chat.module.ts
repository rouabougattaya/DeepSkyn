import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { AiModule } from '../ai/ai.module';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { FitzpatrickQuestionnaire } from '../fitzpatrickQuestionnaire/fitzpatrick-questionnaire.entity';
import { UserProfile } from '../userProfile/user-profile.entity';

import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatSession,
      ChatMessage,
      SkinAnalysis,
      SkinMetric,
      FitzpatrickQuestionnaire,
      UserProfile,
    ]),
    AiModule,
    SubscriptionModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule { }
