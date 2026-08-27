import { adminClient } from '@/lib/supabase/admin';
export async function appendEvent(documentId:string,type:string,data:Record<string,unknown>={}){
  const db=adminClient();
  const {error}=await db.rpc('append_document_event',{p_document_id:documentId,p_event_type:type,p_event_data:data});
  if(error) throw error;
}
