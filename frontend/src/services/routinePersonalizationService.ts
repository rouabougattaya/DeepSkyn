import { apiPost } from './apiClient';
import type { RoutineUpdateResponseDto, UpdateRoutineDto } from '../types/routinePersonalization';

export async function updateRoutine(dto: UpdateRoutineDto = {}): Promise<RoutineUpdateResponseDto> {
    return apiPost<RoutineUpdateResponseDto>('/routine/update', dto);
}
