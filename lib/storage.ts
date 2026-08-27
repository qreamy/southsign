import { adminClient } from '@/lib/supabase/admin';
export async function signedStorageUrl(path:string,bucket:'documents-original'|'documents-signed',seconds=300){const {data,error}=await adminClient().storage.from(bucket).createSignedUrl(path,seconds);if(error)throw error;return data.signedUrl}
