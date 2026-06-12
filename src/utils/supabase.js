// @ts-check
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

const configured = Boolean(supabaseUrl && supabaseKey);

const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = {
  supabase,
  configured
};
