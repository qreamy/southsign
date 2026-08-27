import { createClient } from '@/lib/supabase/server';
export async function requireAdmin(){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) throw new Error('UNAUTHORIZED');
  const {data:membership,error:mErr}=await supabase.from('organization_users').select('organization_id,role').eq('user_id',user.id).single();
  if(mErr||!membership) throw new Error('NO_ORGANIZATION');
  return {supabase,user,organizationId:membership.organization_id as string,role:membership.role as string};
}
