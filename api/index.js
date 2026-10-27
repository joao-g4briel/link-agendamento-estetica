// Função da Vercel: todas as chamadas /api/* chegam aqui (ver vercel.json).
import { handle } from '../server/app.mjs';

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
