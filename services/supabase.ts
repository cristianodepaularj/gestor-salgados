import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DE PRODUÇÃO ---
const SUPABASE_URL = 'https://ltfztopsuqfwddlpeevt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_baVcxvZBkUTlhr-EqRtBKA_dRCh9qfY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);