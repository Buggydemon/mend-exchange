/* =====================================================================
   MEND — backend connection
   Create a free project at https://supabase.com, run supabase/schema.sql
   and then supabase/seed.sql in the project's SQL editor, and paste the
   Project URL plus the anon public key below (Project settings → API).

   The anon key is safe to publish — row-level security in schema.sql does
   the actual gating. Leave both values empty and Mend runs as a fully
   self-contained demo backed by js/data.js and localStorage.
   ===================================================================== */
window.Mend = window.Mend || {};

Mend.config = {
  supabaseUrl: "",
  supabaseAnonKey: "",
};
