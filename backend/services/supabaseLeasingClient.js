const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");
require("dotenv").config();

// Cliente Supabase dedicado para la funcionalidad LEASING
const supabaseLeasing = createClient(
  process.env.SUPABASE_LEASING_URL,
  process.env.SUPABASE_LEASING_SERVICE_ROLE_KEY,
  {
    realtime: { transport: WebSocket },
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

module.exports = supabaseLeasing;
