const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: WebSocket
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

module.exports = supabase;