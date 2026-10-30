/* ─────────────────────────────────────────────────────────────
   CONFIGURAÇÃO DO PORTAL INTERSOLID (Supabase)
   Pegue os dois valores em: Supabase › Project Settings › API
   (ou no botão "Connect" no topo do projeto).
   ───────────────────────────────────────────────────────────── */

export const SUPABASE_URL = "https://gacbepqkockdlsaukwvf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_4SjOS7ryd1xY5HsWS85EZA_oxEHzkH3";

/* Mostrar o botão "Entrar com Google"? Só ative depois de configurar
   o Google em Authentication › Sign In / Providers (passo opcional do guia). */
export const ENABLE_GOOGLE = false;

/* Depois de quantos dias o portal pede login de novo. */
export const SESSION_DAYS = 7;
