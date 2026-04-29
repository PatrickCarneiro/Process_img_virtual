import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://iuyvebdanbnsgxtmbqlk.supabase.co'
const supabaseKey = 'sb_publishable_aBCTVUw3nVJB_EPsuNiRoA_hRK_pta-'

const client = createClient(supabaseUrl, supabaseKey)

console.log("Conectado ao Supabase 🚀", client)

document.getElementById("status").innerText = "Conectado ao Supabase 🚀"