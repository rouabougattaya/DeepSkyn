import { Injectable, Logger } from '@nestjs/common';
import { pipeline, env, RawImage } from '@xenova/transformers';

env.allowLocalModels = true;

@Injectable()
export class ImageValidationService {
  private classifier: any = null;
  private readonly logger = new Logger(ImageValidationService.name);

  private async getClassifier() {
    if (!this.classifier) {
      this.logger.log('Loading Xenova/clip-vit-base-patch32 zero-shot classifier...');
      this.classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    }
    return this.classifier;
  }

  async validateImageBeforeAnalysis(imageBase64: string): Promise<{ isValid: boolean; message: string }> {
    // Si pas d'image, on laisse passer (OpenRouter gérera)
    if (!imageBase64) {
      return { isValid: true, message: 'Aucune image fournie.' };
    }

    try {
      // Stripping the data URI prefix (e.g., "data:image/png;base64,") to get raw base64
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      this.logger.log(`Base64 data length: ${base64Data.length}`);
      
      const imageBuffer = Buffer.from(base64Data, 'base64');
      this.logger.log(`Image buffer size: ${imageBuffer.length} bytes`);

      const classifier = await this.getClassifier();
      const labels = [
        'a close-up human face',
        'human skin or body',
        'a landscape or nature',
        'a computer, phone or electronic device',
        'an animal',
        'a drawing or illustration',
      ];

      this.logger.log('Validating image with local AI model (Xenova/clip-vit-base-patch32)...');
      
      try {
        // Pass the raw buffer as a Blob (compatible with Xenova's pipeline)
        const blob = new Blob([imageBuffer]);
        this.logger.log(`Blob created, size: ${blob.size} bytes`);
        
        const image = await RawImage.fromBlob(blob);
        this.logger.log(`Image loaded successfully`);
        
        const results = await classifier(image, labels);
        this.logger.log(`Classification results:`, results.map((r: any) => ({ label: r.label, score: r.score })));
        
        const topResult = results[0];

        const validLabels = ['a close-up human face', 'human skin or body'];
        const MIN_CONFIDENCE = 0.45;

        if (!validLabels.includes(topResult.label) || topResult.score < MIN_CONFIDENCE) {
          this.logger.warn(`Validation failed: "${topResult.label}" (score: ${topResult.score.toFixed(3)})`);
          return {
            isValid: false,
            message: "Veuillez fournir une photo d'un visage humain valide.",
          };
        }

        this.logger.log(`Validation passed: "${topResult.label}" (score: ${topResult.score.toFixed(3)})`);
        return { isValid: true, message: 'Valid image' };
      } catch (classifierErr: any) {
        this.logger.error(`Classifier error: ${classifierErr.message}`);
        throw classifierErr;
      }
    } catch (e: any) {
      this.logger.error(`Image validation error: ${e.message}`);
      this.logger.error(`Error stack: ${e.stack}`);
      // Graceful degradation: let OpenRouter handle the check
      this.logger.warn(`Local validation skipped (fallback to OpenRouter): ${e.message}`);
      return { isValid: true, message: 'Validation skipped due to error - OpenRouter will validate' };
    }
  }
}
