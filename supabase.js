import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://axizjpvhyzcgrnwzjhrz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lmqlCvyOqUOyCIYkhas9RQ_Z5QPjV-_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);