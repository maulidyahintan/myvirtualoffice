import { statusKantor } from '@/lib/statusKantor';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(statusKantor(), { headers: { 'Cache-Control': 'no-store' } });
}
