import { headers } from 'next/headers';
export async function requestMetadata(){
  const h=await headers();
  const forwarded=h.get('x-forwarded-for');
  const ip=forwarded?.split(',')[0]?.trim()||h.get('x-real-ip')||null;
  return {ip,userAgent:h.get('user-agent')||null};
}
