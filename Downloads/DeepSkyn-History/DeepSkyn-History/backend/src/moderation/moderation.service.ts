import { Injectable, OnModuleInit } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';

@Injectable()
export class ModerationService implements OnModuleInit {
  private classifier: any;

  async onModuleInit() {
    console.log("Loading moderation model...");
   this.classifier = await pipeline(
  'text-classification',
  'Xenova/toxic-bert'
);
    console.log("Moderation model loaded");
  }

  async check(text: string): Promise<{ flagged: boolean; score?: number }> {
    const result = await this.classifier(text);

    console.log("Raw moderation result:", result);

    const toxic = result.find(
      (r: any) => r.label.toLowerCase().includes('toxic')
    );

    if (toxic && toxic.score > 0.2) {
      return {
        flagged: true,
        score: toxic.score,
      };
    }

    return { flagged: false };
  }
}