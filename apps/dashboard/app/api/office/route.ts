import { officeStatus } from '@/lib/officeStatus';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(officeStatus(), { headers: { 'Cache-Control': 'no-store' } });
}
