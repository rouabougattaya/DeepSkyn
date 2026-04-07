import type {
  CreateDigitalTwinDto,
  DigitalTwinResponseDto,
  DigitalTwinTimelineDto,
} from '@/types/digitalTwin';
import { httpClient } from './httpClient';

// API endpoint path (httpClient adds base URL)
const ENDPOINT = '/digital-twin';

export const digitalTwinService = {
  /**
   * Create a new digital twin simulation
   */
  async createDigitalTwin(
    baseAnalysisId: string,
    options?: { routineConsistency?: 'high' | 'medium' | 'low'; lifestyleFactors?: string[] }
  ): Promise<DigitalTwinResponseDto> {
    const dto: CreateDigitalTwinDto = {
      baseAnalysisId,
      routineConsistency: options?.routineConsistency,
      lifestyleFactors: options?.lifestyleFactors,
    };

    console.log('🌟 Creating digital twin with:', dto);

    try {
      // ✅ Use httpClient instead of fetch - automatically adds JWT token
      const result = await httpClient.post<DigitalTwinResponseDto>(
        `${ENDPOINT}/create`,
        dto
      );

      console.log('✅ Digital twin created:', result);
      return result;
    } catch (error: any) {
      const message = error?.message || 'Failed to create digital twin';
      console.error('❌ createDigitalTwin error:', message);

      // ✅ Provide user-friendly error message
      if (error?.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else if (error?.status === 403) {
        throw new Error('You do not have permission to create a digital twin.');
      } else if (error?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      throw new Error(message);
    }
  },

  /**
   * Get a specific digital twin by ID
   */
  async getDigitalTwin(id: string): Promise<DigitalTwinResponseDto> {
    try {
      // ✅ Use httpClient - automatically adds JWT token
      const result = await httpClient.get<DigitalTwinResponseDto>(`${ENDPOINT}/${id}`);
      return result;
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch digital twin';
      console.error('❌ getDigitalTwin error:', message);

      if (error?.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else if (error?.status === 404) {
        throw new Error('Digital twin not found.');
      }

      throw new Error(message);
    }
  },

  /**
   * Get the timeline view
   */
  async getDigitalTwinTimeline(id: string): Promise<DigitalTwinTimelineDto> {
    try {
      // ✅ Use httpClient - automatically adds JWT token
      const result = await httpClient.get<DigitalTwinTimelineDto>(`${ENDPOINT}/${id}/timeline`);
      return result;
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch digital twin timeline';
      console.error('❌ getDigitalTwinTimeline error:', message);

      if (error?.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else if (error?.status === 404) {
        throw new Error('Timeline not found.');
      }

      throw new Error(message);
    }
  },

  /**
   * Get the latest digital twin for the user
   */
  async getLatestDigitalTwin(): Promise<DigitalTwinResponseDto | null> {
    try {
      // ✅ Use httpClient - automatically adds JWT token
      const result = await httpClient.get<DigitalTwinResponseDto>(`${ENDPOINT}/latest/data`);
      return result || null;
    } catch (error: any) {
      // No digital twin yet is not an error
      if (error?.status === 404 || error?.status === 204) {
        console.log('ℹ️ No digital twin found');
        return null;
      }

      if (error?.status === 401) {
        console.error('Session expired');
        return null;
      }

      console.warn('⚠️ Failed to fetch latest digital twin:', error?.message);
      return null;
    }
  },
};
