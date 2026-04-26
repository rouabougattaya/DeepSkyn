import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { SkinRiskInput, SkinRiskAlert, SkinRiskResponse } from './skin-risk.dto';

@Injectable()
export class RiskPredictionService {
  private readonly logger = new Logger(RiskPredictionService.name);

  constructor(private readonly geminiService: GeminiService) {}

  async predictSkinRisks(input: SkinRiskInput): Promise<SkinRiskResponse> {
    try {
      this.logger.log('🔮 Starting skin risk prediction with Gemini...');
      const baselineScore = this.calculateBaselineRiskScore(input);

      // Build comprehensive analysis prompt
      const prompt = this.buildAnalysisPrompt(input);

      // Call Gemini API
      const geminiResponse = await this.geminiService.generateContent(prompt);

      if (!geminiResponse) {
        this.logger.warn('⚠️ Gemini returned null, using fallback analysis');
        return this.generateFallbackRisks(input);
      }

      // Parse Gemini response
      const riskData = this.normalizeRiskData(this.parseGeminiResponse(geminiResponse), input, baselineScore);

      return {
        risks: riskData.risks,
        overall_risk_score: riskData.overall_risk_score,
        summary: riskData.summary,
        immediate_actions: riskData.immediate_actions,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error in predictSkinRisks:', error);
      return this.generateFallbackRisks(input);
    }
  }

  private buildAnalysisPrompt(input: SkinRiskInput): string {
    return `You are an expert dermatologist AI. Based on the following skin profile and lifestyle factors, predict future skin risks and potential issues.

CURRENT SKIN CONDITION:
${input.acneScore !== undefined ? `- Acne Score: ${input.acneScore}/100` : '- Acne Score: Not provided'}
${input.drynessScore !== undefined ? `- Dryness Score: ${input.drynessScore}/100` : '- Dryness Score: Not provided'}
${input.wrinklesScore !== undefined ? `- Wrinkles Score: ${input.wrinklesScore}/100` : '- Wrinkles Score: Not provided'}
${input.sensitivityScore !== undefined ? `- Sensitivity Score: ${input.sensitivityScore}/100` : '- Sensitivity Score: Not provided'}
${input.pigmentationScore !== undefined ? `- Pigmentation Score: ${input.pigmentationScore}/100` : '- Pigmentation Score: Not provided'}
${input.poresScore !== undefined ? `- Pores Score: ${input.poresScore}/100` : '- Pores Score: Not provided'}

PERSONAL INFO:
- Age: ${input.age || 'Not provided'}
- Skin Type: ${input.skinType || 'Not provided'}
- Fitzpatrick Scale: ${input.fitzpatrickSkin || 'Not provided'}

ENVIRONMENTAL FACTORS:
${input.environment ? `
- Humidity: ${input.environment.humidity || 'N/A'}%
- Temperature: ${input.environment.temperature || 'N/A'}°C
- UV Index: ${input.environment.uvIndex || 'N/A'}
- Pollution Level: ${input.environment.pollution || 'N/A'}
` : '- No environmental data provided'}

LIFESTYLE HABITS:
${input.habits ? `
- Sleep Hours: ${input.habits.sleepHours || 'N/A'} hours/day
- Water Intake: ${input.habits.waterIntake || 'N/A'} liters/day
- Sun Protection: ${input.habits.sunProtection || 'N/A'}
- Exercise: ${input.habits.Exercise || 'N/A'}
- Stress Level: ${input.habits.stressLevel || 'N/A'}
- Diet Quality: ${input.habits.diet || 'N/A'}
- Skincare Routine: ${input.habits.skincarRoutine || 'N/A'}
` : '- No habit data provided'}

ANALYSIS REQUIRED:
1. Identify 3-5 main skin risks based on current condition, age, environment, and habits
2. For each risk, provide:
   - Type: acne, dryness, aging, sensitivity, pigmentation, or redness
   - Risk Score: 0-100 (higher = more likely to develop)
   - Cause: Explain why this risk exists (2-3 sentences max)
   - Prevention: List 3-4 specific preventive measures
   - Urgency: low, medium, or high
   - Timeline: weeks, months, or long-term

3. Calculate overall risk (average of all risk scores)
4. Provide a brief summary (2-3 sentences)
5. List 2-3 immediate actions to take

RESPONSE FORMAT (VALID JSON ONLY):
{
  "risks": [
    {
      "type": "acne",
      "risk_score": 75,
      "cause": "High humidity and irregular skincare routine increase sebum production and clogged pores.",
      "prevention": ["Use oil-control cleanser twice daily", "Apply salicylic acid serum", "Reduce processed foods", "Change pillowcase daily"],
      "urgency": "high",
      "timeline": "weeks"
    }
  ],
  "summary": "Your skin is at moderate-to-high risk for multiple conditions based on environmental exposure and lifestyle factors. Prioritize consistent skincare and hydration.",
  "immediate_actions": ["Start daily SPF 30+ routine", "Increase water intake to 2L daily", "Regular sleep schedule (7-8 hours)"]
}

Return ONLY valid JSON, no additional text.`;
  }

  private parseGeminiResponse(response: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and clean risks
      if (parsed.risks && Array.isArray(parsed.risks)) {
        parsed.risks = parsed.risks.map((risk: any) => ({
          type: risk.type || 'acne',
          risk_score: Math.min(100, Math.max(0, parseInt(risk.risk_score) || 50)),
          cause: risk.cause || 'Risk factor identified',
          prevention: Array.isArray(risk.prevention) ? risk.prevention : [],
          urgency: risk.urgency || 'medium',
          timeline: risk.timeline || 'months',
        }));
      }

      return parsed;
    } catch (error) {
      this.logger.error('❌ Error parsing Gemini response:', error);
      throw error;
    }
  }

  private calculateOverallRiskScore(risks: SkinRiskAlert[]): number {
    if (!risks || risks.length === 0) return 0;
    const sum = risks.reduce((acc, risk) => acc + (risk.risk_score || 0), 0);
    return Math.round(sum / risks.length);
  }

  private clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
  }

  private calculateBaselineRiskScore(input: SkinRiskInput): number {
    const acne = input.acneScore ?? 35;
    const dryness = input.drynessScore ?? 35;
    const wrinkles = input.wrinklesScore ?? 35;
    const sensitivity = input.sensitivityScore ?? 35;
    const pigmentation = input.pigmentationScore ?? 35;
    const pores = input.poresScore ?? 35;

    // Weighted blend from skin state, then adjusted by age/environment/habits.
    const skinWeighted =
      acne * 0.22 +
      dryness * 0.18 +
      wrinkles * 0.20 +
      sensitivity * 0.16 +
      pigmentation * 0.14 +
      pores * 0.10;

    const age = input.age ?? 30;
    const ageImpact = age > 45 ? 8 : age > 35 ? 5 : age < 22 ? -3 : 0;

    const uv = input.environment?.uvIndex ?? 5;
    const humidity = input.environment?.humidity ?? 55;
    const pollution = (input.environment?.pollution || 'moderate').toLowerCase();
    const uvImpact = uv >= 8 ? 7 : uv >= 6 ? 4 : uv <= 2 ? -1 : 0;
    const humidityImpact = humidity < 35 ? 5 : humidity > 80 ? 3 : 0;
    const pollutionImpact = pollution === 'high' ? 4 : pollution === 'low' ? -1 : 0;

    const sleep = input.habits?.sleepHours ?? 7;
    const water = input.habits?.waterIntake ?? 2;
    const stress = (input.habits?.stressLevel || 'moderate').toLowerCase();
    const sunProtection = (input.habits?.sunProtection || 'occasional').toLowerCase();
    const routine = (input.habits?.skincarRoutine || 'basic').toLowerCase();

    const sleepImpact = sleep < 6 ? 6 : sleep > 8 ? -2 : 0;
    const hydrationImpact = water < 1.5 ? 5 : water >= 2.5 ? -2 : 0;
    const stressImpact = stress === 'high' ? 6 : stress === 'low' ? -2 : 0;
    const spfImpact = sunProtection === 'none' ? 7 : sunProtection === 'regular' ? -3 : 0;
    const routineImpact = routine === 'none' ? 6 : routine === 'advanced' ? -3 : routine === 'consistent' ? -2 : 0;

    return this.clamp(
      Math.round(
        skinWeighted +
          ageImpact +
          uvImpact +
          humidityImpact +
          pollutionImpact +
          sleepImpact +
          hydrationImpact +
          stressImpact +
          spfImpact +
          routineImpact,
      ),
    );
  }

  private buildPersonalizedActions(input: SkinRiskInput, risks: SkinRiskAlert[]): string[] {
    const actions: string[] = [];
    const riskTypes = new Set((risks || []).map((r) => r.type));

    const spf = (input.habits?.sunProtection || 'occasional').toLowerCase();
    if (spf !== 'regular' || riskTypes.has('aging') || riskTypes.has('pigmentation')) {
      actions.push('Apply broad-spectrum SPF 30+ every morning and reapply every 2-3 hours outdoors');
    }

    const sleep = input.habits?.sleepHours ?? 7;
    if (sleep < 7 || riskTypes.has('acne') || riskTypes.has('sensitivity')) {
      actions.push('Stabilize sleep to 7-8 hours nightly to reduce inflammation and support skin recovery');
    }

    const stress = (input.habits?.stressLevel || 'moderate').toLowerCase();
    if (stress === 'high' || riskTypes.has('acne') || riskTypes.has('redness')) {
      actions.push('Add one daily stress reset habit (10 minutes walk, breathing, or stretching)');
    }

    const water = input.habits?.waterIntake ?? 2;
    if (water < 2 || riskTypes.has('dryness')) {
      actions.push('Increase hydration to at least 2L/day and lock moisture with a barrier-focused moisturizer');
    }

    if (riskTypes.has('acne') || (input.acneScore ?? 0) >= 45) {
      actions.push('Use a gentle cleanser twice daily and introduce salicylic acid 2-3 nights per week');
    }

    if (riskTypes.has('aging') || (input.wrinklesScore ?? 0) >= 45) {
      actions.push('Start a gradual retinoid routine (2 nights/week) and pair with a nourishing night cream');
    }

    if (riskTypes.has('sensitivity') || riskTypes.has('redness')) {
      actions.push('Simplify your routine: fragrance-free products and avoid strong exfoliants for 10-14 days');
    }

    if (riskTypes.has('pigmentation')) {
      actions.push('Add vitamin C or niacinamide in the morning and avoid direct midday sun exposure');
    }

    return Array.from(new Set(actions)).slice(0, 4);
  }

  private normalizeRiskData(parsed: any, input: SkinRiskInput, baselineScore: number): {
    risks: SkinRiskAlert[];
    overall_risk_score: number;
    summary: string;
    immediate_actions: string[];
  } {
    const risks: SkinRiskAlert[] = (parsed?.risks || []).map((risk: any) => ({
      type: risk.type || 'acne',
      risk_score: this.clamp(Number(risk.risk_score) || baselineScore),
      cause: risk.cause || 'Risk factor identified from your current profile',
      prevention: Array.isArray(risk.prevention) ? risk.prevention : [],
      urgency: risk.urgency || 'medium',
      timeline: risk.timeline || 'months',
    }));

    if (risks.length === 0) {
      return this.generateFallbackRisks(input);
    }

    const avg = this.calculateOverallRiskScore(risks);
    const overall = this.clamp(Math.round(avg * 0.7 + baselineScore * 0.3));
    const immediateActions =
      Array.isArray(parsed?.immediate_actions) && parsed.immediate_actions.length > 0
        ? parsed.immediate_actions.slice(0, 4)
        : this.buildPersonalizedActions(input, risks);

    const summary =
      parsed?.summary ||
      `Your risk profile is dynamic and personalized. Current combined risk is ${overall}/100 based on skin metrics, lifestyle, and environment.`;

    return {
      risks,
      overall_risk_score: overall,
      summary,
      immediate_actions: immediateActions,
    };
  }

  private generateFallbackRisks(input: SkinRiskInput): SkinRiskResponse {
    const baseline = this.calculateBaselineRiskScore(input);
    const metricMap: Array<{
      type: SkinRiskAlert['type'];
      score: number;
      cause: string;
      prevention: string[];
    }> = [
      {
        type: 'acne',
        score: this.clamp((input.acneScore ?? baseline) + ((input.habits?.stressLevel || 'moderate') === 'high' ? 6 : 0)),
        cause: 'Sebum, pores congestion, and stress/sleep patterns suggest acne flare potential if routine consistency drops.',
        prevention: [
          'Use a gentle cleanser twice daily',
          'Apply salicylic acid 2-3 nights weekly',
          'Avoid pore-clogging products',
        ],
      },
      {
        type: 'dryness',
        score: this.clamp((input.drynessScore ?? baseline) + ((input.habits?.waterIntake ?? 2) < 1.5 ? 8 : 0)),
        cause: 'Hydration signal and water intake indicate barrier dehydration risk, especially in dry environments.',
        prevention: [
          'Increase water intake to 2L/day',
          'Use hyaluronic acid on damp skin',
          'Seal with ceramide moisturizer',
        ],
      },
      {
        type: 'aging',
        score: this.clamp((input.wrinklesScore ?? baseline) + ((input.environment?.uvIndex ?? 5) >= 6 ? 8 : 0) + ((input.age ?? 30) > 35 ? 6 : 0)),
        cause: 'UV exposure and wrinkle trend suggest elevated photo-aging risk over the next months.',
        prevention: [
          'Apply SPF 30+ every morning',
          'Add retinoid slowly at night',
          'Use antioxidant serum in AM',
        ],
      },
      {
        type: 'sensitivity',
        score: this.clamp((input.sensitivityScore ?? baseline) + ((input.habits?.stressLevel || 'moderate') === 'high' ? 5 : 0)),
        cause: 'Reactive skin markers suggest increased redness/irritation risk under stress and actives overuse.',
        prevention: [
          'Use fragrance-free products',
          'Pause harsh exfoliants',
          'Prioritize barrier-repair ingredients',
        ],
      },
      {
        type: 'pigmentation',
        score: this.clamp((input.pigmentationScore ?? baseline) + ((input.environment?.uvIndex ?? 5) >= 6 ? 10 : 0)),
        cause: 'UV index and pigmentation trend indicate risk of uneven tone and post-inflammatory marks.',
        prevention: [
          'Use SPF 50 during high UV days',
          'Add vitamin C or niacinamide',
          'Avoid midday direct sun',
        ],
      },
    ];

    const risks: SkinRiskAlert[] = metricMap
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => ({
        type: item.type,
        risk_score: this.clamp(item.score),
        cause: item.cause,
        prevention: item.prevention,
        urgency: item.score >= 70 ? 'high' : item.score >= 50 ? 'medium' : 'low',
        timeline: item.score >= 65 ? 'weeks' : item.score >= 45 ? 'months' : 'long-term',
      }));

    const overall = this.clamp(Math.round(this.calculateOverallRiskScore(risks) * 0.75 + baseline * 0.25));
    const actions = this.buildPersonalizedActions(input, risks);

    return {
      risks,
      overall_risk_score: overall,
      summary: `Personalized risk score ${overall}/100 computed from your skin metrics, environment, and habits. ${risks.length} priority areas were identified.`,
      immediate_actions: actions,
      timestamp: new Date(),
    };
  }
}
