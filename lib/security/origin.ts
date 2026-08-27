export function assertSameOrigin(req:Request){
  const origin=req.headers.get('origin');
  if(!origin) return;
  const expected=new URL(process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000').origin;
  if(origin!==expected) throw new Error('BAD_ORIGIN');
}
