import { z } from 'zod';
export const createDocumentSchema=z.object({documentName:z.string().trim().min(1).max(160),recipientName:z.string().trim().min(2).max(160),company:z.string().trim().max(160).default(''),organizationNumber:z.string().trim().max(32).optional(),email:z.string().trim().email().max(254),expiresAt:z.string().optional()});
export const signSchema=z.object({token:z.string().min(32).max(200),fullName:z.string().trim().min(2).max(160),signatureType:z.enum(['drawn','typed']),signatureData:z.string().min(2).max(1_500_000),accepted:z.literal(true)});
export const rejectSchema=z.object({token:z.string().min(32).max(200),reason:z.string().trim().min(2).max(2000)});
