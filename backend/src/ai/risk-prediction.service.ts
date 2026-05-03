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
    const sections = [
      'You are an expert dermatologist AI. Based on the following skin profile and lifestyle factors, predict future skin risks and potential issues.',
      this.buildSkinConditionSection(input),
      this.buildPersonalInfoSection(input),
      this.buildEnvironmentSection(input),
      this.buildLifestyleSection(input),
      this.buildAnalysisRequirements(),
      this.buildResponseFormat(),
    ];
    return sections.join('\n\n') + '\n\nReturn ONLY valid JSON, no additional text.';
  }

  private buildSkinConditionSection(input: SkinRiskInput): string {
    const scores = [
      { label: 'Acne', value: input.acneScore },
      { label: 'Dryness', value: input.drynessScore },
      { label: 'Wrinkles', value: input.wrinklesScore },
      { label: 'Sensitivity', value: input.sensitivityScore },
      { label: 'Pigmentation', value: input.pigmentationScore },
      { label: 'Pores', value: input.poresScore },
    ];
    const lines = scores.map(s => {
      const valueStr = s.value !== undefined ? `${s.value}/100` : 'Not provided';
      return `- ${s.label} Score: ${valueStr}`;
    });
    return `CURRENT SKIN CONDITION:\n${lines.join('\n')}`;
  }

  private buildPersonalInfoSection(input: SkinRiskInput): string {
    return `PERSONAL INFO:\n- Age: ${input.age || 'Not provided'}\n- Skin Type: ${input.skinType || 'Not provided'}\n- Fitzpatrick Scale: ${input.fitzpatrickSkin || 'Not provided'}`;
  }

  private buildEnvironmentSection(input: SkinRiskInput): string {
    if (!input.environment) return 'ENVIRONMENTAL FACTORS:\n- No environmental data provided';
    const { humidity, temperature, uvIndex, pollution } = input.environment;
    return `ENVIRONMENTAL FACTORS:
- Humidity: ${humidity || 'N/A'}%
- Temperature: ${temperature || 'N/A'}°C
- UV Index: ${uvIndex || 'N/A'}
- Pollution Level: ${pollution || 'N/A'}`;
  }

  private buildLifestyleSection(input: SkinRiskInput): string {
    if (!input.habits) return 'LIFESTYLE HABITS:\n- No habit data provided';
    const { sleepHours, waterIntake, sunProtection, Exercise, stressLevel, diet, skincarRoutine } = input.habits;
    return `LIFESTYLE HABITS:
- Sleep Hours: ${sleepHours || 'N/A'} hours/day
- Water Intake: ${waterIntake || 'N/A'} liters/day
- Sun Protection: ${sunProtection || 'N/A'}
- Exercise: ${Exercise || 'N/A'}
- Stress Level: ${stressLevel || 'N/A'}
- Diet Quality: ${diet || 'N/A'}
- Skincare Routine: ${skincarRoutine || 'N/A'}`;
  }

  private buildAnalysisRequirements(): string {
    return `ANALYSIS REQUIRED:
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
5. List 2-3 immediate actions to take`;
  }

  private buildResponseFormat(): string {
    return `RESPONSE FORMAT (VALID JSON ONLY):
{
  "risks": [
    {
      "type": "acne",
      "risk_score": 75,
      "cause": "...",
      "prevention": ["...", "..."],
      "urgency": "high",
      "timeline": "weeks"
    }
  ],
  "summary": "...",
  "immediate_actions": ["...", "..."]
}`;
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
    const skinWeighted = this.calculateWeightedSkinScore(input);
    
    const impacts = [
      this.getAgeImpact(input.age),
      this.getEnvironmentImpact(input.environment),
      this.getLifestyleImpact(input.habits),
    ];

    const totalImpact = impacts.reduce((sum, impact) => sum + impact, 0);

    return this.clamp(Math.round(skinWeighted + totalImpact));
  }

  private calculateWeightedSkinScore(input: SkinRiskInput): number {
    const acne = input.acneScore ?? 35;
    const dryness = input.drynessScore ?? 35;
    const wrinkles = input.wrinklesScore ?? 35;
    const sensitivity = input.sensitivityScore ?? 35;
    const pigmentation = input.pigmentationScore ?? 35;
    const pores = input.poresScore ?? 35;

    return (
      acne * 0.22 +
      dryness * 0.18 +
      wrinkles * 0.20 +
      sensitivity * 0.16 +
      pigmentation * 0.14 +
      pores * 0.10
    );
  }

  private getAgeImpact(age?: number): number {
    const safeAge = age ?? 30;
    if (safeAge > 45) return 8;
    if (safeAge > 35) return 5;
    if (safeAge < 22) return -3;
    return 0;
  }

  private getEnvironmentImpact(env?: SkinRiskInput['environment']): number {
    if (!env) return 0;
    
    let impact = 0;
    impact += this.getUvImpact(env.uvIndex ?? 5);
    impact += this.getHumidityImpact(env.humidity ?? 55);
    impact += this.getPollutionImpact(env.pollution);
    
    return impact;
  }

  private getUvImpact(uv: number): number {
    if (uv >= 8) return 7;
    if (uv >= 6) return 4;
    if (uv <= 2) return -1;
    return 0;
  }

  private getHumidityImpact(humidity: number): number {
    if (humidity < 35) return 5;
    if (humidity > 80) return 3;
    return 0;
  }

  private getPollutionImpact(pollution?: string): number {
    const p = (pollution || 'moderate').toLowerCase();
    if (p === 'high') return 4;
    if (p === 'low') return -1;
    return 0;
  }

  private getLifestyleImpact(habits?: SkinRiskInput['habits']): number {
    if (!habits) return 0;
    
    let impact = 0;
    impact += this.getSleepImpact(habits.sleepHours ?? 7);
    impact += this.getWaterImpact(habits.waterIntake ?? 2);
    impact += this.getStressImpact(habits.stressLevel);
    impact += this.getSpfImpact(habits.sunProtection);
    impact += this.getRoutineImpact(habits.skincarRoutine);
    
    return impact;
  }

  private getSleepImpact(sleep: number): number {
    if (sleep < 6) return 6;
    if (sleep > 8) return -2;
    return 0;
  }

  private getWaterImpact(water: number): number {
    if (water < 1.5) return 5;
    if (water >= 2.5) return -2;
    return 0;
  }

  private getStressImpact(stress?: string): number {
    const s = (stress || 'moderate').toLowerCase();
    if (s === 'high') return 6;
    if (s === 'low') return -2;
    return 0;
  }

  private getSpfImpact(spf?: string): number {
    const s = (spf || 'occasional').toLowerCase();
    if (s === 'none') return 7;
    if (s === 'regular') return -3;
    return 0;
  }

  private getRoutineImpact(routine?: string): number {
    const r = (routine || 'basic').toLowerCase();
    if (r === 'none') return 6;
    if (r === 'advanced') return -3;
    if (r === 'consistent') return -2;
    return 0;
  }

  private buildPersonalizedActions(input: SkinRiskInput, risks: SkinRiskAlert[]): string[] {
    const actions: string[] = [];
    const riskTypes = new Set((risks || []).map((r) => r.type));

    this.addSpfAction(actions, input, riskTypes);
    this.addSleepAction(actions, input, riskTypes);
    this.addStressAction(actions, input, riskTypes);
    this.addHydrationAction(actions, input, riskTypes);
    this.addConditionActions(actions, input, riskTypes);

    return Array.from(new Set(actions)).slice(0, 4);
  }

  private addSpfAction(actions: string[], input: SkinRiskInput, riskTypes: Set<string>) {
    const spf = (input.habits?.sunProtection || 'occasional').toLowerCase();
    if (spf !== 'regular' || riskTypes.has('aging') || riskTypes.has('pigmentation')) {
      actions.push('Apply broad-spectrum SPF 30+ every morning and reapply every 2-3 hours outdoors');
    }
  }

  private addSleepAction(actions: string[], input: SkinRiskInput, riskTypes: Set<string>) {
    const sleep = input.habits?.sleepHours ?? 7;
    if (sleep < 7 || riskTypes.has('acne') || riskTypes.has('sensitivity')) {
      actions.push('Stabilize sleep to 7-8 hours nightly to reduce inflammation and support skin recovery');
    }
  }

  private addStressAction(actions: string[], input: SkinRiskInput, riskTypes: Set<string>) {
    const stress = (input.habits?.stressLevel || 'moderate').toLowerCase();
    if (stress === 'high' || riskTypes.has('acne') || riskTypes.has('redness')) {
      actions.push('Add one daily stress reset habit (10 minutes walk, breathing, or stretching)');
    }
  }

  private addHydrationAction(actions: string[], input: SkinRiskInput, riskTypes: Set<string>) {
    const water = input.habits?.waterIntake ?? 2;
    if (water < 2 || riskTypes.has('dryness')) {
      actions.push('Increase hydration to at least 2L/day and lock moisture with a barrier-focused moisturizer');
    }
  }

  private addConditionActions(actions: string[], input: SkinRiskInput, riskTypes: Set<string>) {
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
    const metricMap = this.getFallbackMetricMap(input, baseline);

    const sortedMetrics = [...metricMap].sort((a, b) => b.score - a.score);
    const risks: SkinRiskAlert[] = sortedMetrics
      .slice(0, 3)
      .map((item) => ({
        type: item.type,
        risk_score: this.clamp(item.score),
        cause: item.cause,
        prevention: item.prevention,
        urgency: this.getUrgencyByScore(item.score),
        timeline: this.getTimelineByScore(item.score),
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

  private getFallbackMetricMap(input: SkinRiskInput, baseline: number) {
    return [
      this.getAcneMetric(input, baseline),
      this.getDrynessMetric(input, baseline),
      this.getAgingMetric(input, baseline),
      this.getSensitivityMetric(input, baseline),
      this.getPigmentationMetric(input, baseline),
    ];
  }

  private getAcneMetric(input: SkinRiskInput, baseline: number) {
    const stressHigh = (input.habits?.stressLevel || 'moderate') === 'high';
    return {
      type: 'acne' as const,
      score: this.clamp((input.acneScore ?? baseline) + (stressHigh ? 6 : 0)),
      cause: 'Sebum, pores congestion, and stress/sleep patterns suggest acne flare potential if routine consistency drops.',
      prevention: ['Use a gentle cleanser twice daily', 'Apply salicylic acid 2-3 nights weekly', 'Avoid pore-clogging products'],
    };
  }

  private getDrynessMetric(input: SkinRiskInput, baseline: number) {
    const waterLow = (input.habits?.waterIntake ?? 2) < 1.5;
    return {
      type: 'dryness' as const,
      score: this.clamp((input.drynessScore ?? baseline) + (waterLow ? 8 : 0)),
      cause: 'Hydration signal and water intake indicate barrier dehydration risk, especially in dry environments.',
      prevention: ['Increase water intake to 2L/day', 'Use hyaluronic acid on damp skin', 'Seal with ceramide moisturizer'],
    };
  }

  private getAgingMetric(input: SkinRiskInput, baseline: number) {
    const uvHigh = (input.environment?.uvIndex ?? 5) >= 6;
    const ageHigh = (input.age ?? 30) > 35;
    return {
      type: 'aging' as const,
      score: this.clamp((input.wrinklesScore ?? baseline) + (uvHigh ? 8 : 0) + (ageHigh ? 6 : 0)),
      cause: 'UV exposure and wrinkle trend suggest elevated photo-aging risk over the next months.',
      prevention: ['Apply SPF 30+ every morning', 'Add retinoid slowly at night', 'Use antioxidant serum in AM'],
    };
  }

  private getSensitivityMetric(input: SkinRiskInput, baseline: number) {
    const stressHigh = (input.habits?.stressLevel || 'moderate') === 'high';
    return {
      type: 'sensitivity' as const,
      score: this.clamp((input.sensitivityScore ?? baseline) + (stressHigh ? 5 : 0)),
      cause: 'Reactive skin markers suggest increased redness/irritation risk under stress and actives overuse.',
      prevention: ['Use fragrance-free products', 'Pause harsh exfoliants', 'Prioritize barrier-repair ingredients'],
    };
  }

  private getPigmentationMetric(input: SkinRiskInput, baseline: number) {
    const uvHigh = (input.environment?.uvIndex ?? 5) >= 6;
    return {
      type: 'pigmentation' as const,
      score: this.clamp((input.pigmentationScore ?? baseline) + (uvHigh ? 10 : 0)),
      cause: 'UV index and pigmentation trend indicate risk of uneven tone and post-inflammatory marks.',
      prevention: ['Use SPF 50 during high UV days', 'Add vitamin C or niacinamide', 'Avoid midday direct sun'],
    };
  }

  private getUrgencyByScore(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private getTimelineByScore(score: number): 'weeks' | 'months' | 'long-term' {
    if (score >= 65) return 'weeks';
    if (score >= 45) return 'months';
    return 'long-term';
  }
}
