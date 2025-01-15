import { ApiResponse } from '../core';
import { RecapData, RecapMeta } from '../../ai/recap';

export interface RecapResponse extends ApiResponse<RecapData & { meta: RecapMeta }> {} 