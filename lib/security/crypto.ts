import crypto from 'node:crypto';
export const sha256=(value:Buffer|string)=>crypto.createHash('sha256').update(value).digest('hex');
export const newToken=()=>crypto.randomBytes(32).toString('base64url');
export const hashToken=(token:string)=>sha256(`${token}:${process.env.TOKEN_PEPPER || ''}`);
export const safeEqualHex=(a:string,b:string)=>{try{return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))}catch{return false}};
export function encryptToken(token:string){const key=crypto.createHash('sha256').update(process.env.TOKEN_ENCRYPTION_KEY||process.env.TOKEN_PEPPER||'').digest();const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);const tag=cipher.getAuthTag();return Buffer.concat([iv,tag,encrypted]).toString('base64url')}
export function decryptToken(value:string){const raw=Buffer.from(value,'base64url');const key=crypto.createHash('sha256').update(process.env.TOKEN_ENCRYPTION_KEY||process.env.TOKEN_PEPPER||'').digest();const iv=raw.subarray(0,12),tag=raw.subarray(12,28),data=raw.subarray(28);const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8')}
