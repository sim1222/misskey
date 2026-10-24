import * as os from '@/os';
import type { ApiResponse } from '@/types/api';
export async function loadAdminEmoji(emojiId: { id: string }): Promise<ApiResponse<'admin/emoji/list'>[number] | null> {
 const previous = await os.api('admin/emoji/list', { limit: 1, untilId: emojiId.id });
 if (!previous[0]?.id) return null;
 const result = await os.api('admin/emoji/list', { limit: 1, sinceId: previous[0].id });
 return result[0] ?? null;
}
