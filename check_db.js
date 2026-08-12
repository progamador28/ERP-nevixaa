const SUPABASE_URL = "https://lwfjnmudtlybnnfgtgag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmpubXVkdGx5Ym5uZmd0Z2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTAzNTIsImV4cCI6MjA5ODUyNjM1Mn0.plYp6N1-gQDk3O8mY6IbGcyVyCby0oCg9rGtodD6WK4";

async function run() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/dados_sistema?id=eq.1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const rows = await res.json();
        const data = rows[0].dados;
        
        let hasError = false;
        
        data.equipments.forEach(eq => {
            if (!eq.nome) {
                console.log("Equipment without nome:", eq);
                hasError = true;
            }
            if (!eq.tag) {
                console.log("Equipment without tag:", eq);
                hasError = true;
            }
        });

        data.tickets.forEach(tk => {
            if (!tk.equipamento) {
                console.log("Ticket without equipamento:", tk);
                hasError = true;
            }
        });

        if (!hasError) {
            console.log("No obvious undefined fields found for eqMatch.");
        }
    } catch (e) {
        console.error(e);
    }
}

run();
