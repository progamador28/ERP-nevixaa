const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://lwfjnmudtlybnnfgtgag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmpubXVkdGx5Ym5uZmd0Z2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTAzNTIsImV4cCI6MjA5ODUyNjM1Mn0.plYp6N1-gQDk3O8mY6IbGcyVyCby0oCg9rGtodD6WK4";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabaseClient
        .from('dados_sistema')
        .select('dados')
        .eq('id', 1)
        .single();
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    const qs = data.dados.quotations || [];
    console.log("Total quotations in Supabase:", qs.length);
    const target = "uuid-a444arh9d-msrq2vcv"; // From screenshot
    const found = qs.find(q => q.id === target);
    console.log("Found ID", target, "?", !!found);
}
check();
