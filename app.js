/**
 * NEVIXA FINANCE & ERP - SISTEMA DE GESTÃO FINANCEIRA E OPERAÇÕES
 * Motor de controle da aplicação SPA Avançada
 */
// ==========================================================================
// CONFIGURAÇÃO DO SUPABASE & AUTENTICAÇÃO REAL - NEVIXA ENGENHARIA
// ==========================================================================
const SUPABASE_URL = "https://lwfjnmudtlybnnfgtgag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmpubXVkdGx5Ym5uZmd0Z2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTAzNTIsImV4cCI6MjA5ODUyNjM1Mn0.plYp6N1-gQDk3O8mY6IbGcyVyCby0oCg9rGtodD6WK4"; // <-- Cole aqui a sua chave anon pública

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nome oficializado para relatórios, cabeçalhos e logs do sistema ERP
const EMPRESA_NOME_OFICIAL = "NEVIXA ENGENHARIA COMERCIO & SERVICOS LTDA";

// ==========================================================================
// NOVA FUNÇÃO DE LOGIN (Substitui a lógica antiga do MOCK_USERS)
// ==========================================================================
async function realizarLoginReal(email, senha) {
    exibirCarregamentoLogin(true);

    try {
        // 1. Autentica o usuário na camada de Auth do Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (authError) {
            uiAlert("Erro de Autenticação: E-mail ou senha incorretos.");
            exibirCarregamentoLogin(false);
            return;
        }

        const userId = authData.user.id;

        // 2. Busca os dados de permissão e status na tabela pública "perfis"
        const { data: perfil, error: perfilError } = await supabaseClient
            .from('perfis')
            .select('*')
            .eq('id', userId)
            .single();

        if (perfilError || !perfil) {
            uiAlert("Erro ao carregar perfil. Entre em contato com o suporte.");
            await supabaseClient.auth.signOut();
            exibirCarregamentoLogin(false);
            return;
        }

        // 3. Regra de Negócio Crítica: Bloqueio de usuários Pendentes ou Bloqueados
        if (perfil.status === 'pendente') {
            uiAlert("Acesso Negado: O seu cadastro foi recebido com sucesso, mas está aguardando a aprovação do Administrador da NEVIXA ENGENHARIA.");
            await supabaseClient.auth.signOut();
            exibirCarregamentoLogin(false);
            return;
        }

        if (perfil.status === 'bloqueado') {
            uiAlert("Acesso Negado: Esta conta de usuário encontra-se desativada/bloqueada no sistema.");
            await supabaseClient.auth.signOut();
            exibirCarregamentoLogin(false);
            return;
        }

        // 4. Sucesso! Usuário aprovado. Salva a sessão localmente
        const usuarioSessao = {
            id: perfil.id,
            email: perfil.email,
            nome: perfil.nome || "Colaborador",
            cargo: perfil.papel === 'admin' ? 'Diretor Geral' : (perfil.papel === 'financeiro' ? 'Gerente Financeira' : (perfil.papel === 'cliente' ? 'Cliente Externo' : 'Engenheiro de Campo')),
            papel: perfil.papel // 'admin', 'financeiro', 'tecnico' ou 'cliente'
        };

        sessionStorage.setItem("nevixa_current_user", JSON.stringify(usuarioSessao));
        
        // Esconde a tela de login e inicializa o painel do sistema
        document.getElementById("login-overlay").classList.remove("active");
        checkAuth(); 

    } catch (err) {
        console.error("Erro inesperado no login:", err);
        uiAlert("Ocorreu um erro interno ao tentar realizar o login.");
    } finally {
        exibirCarregamentoLogin(false);
    }
}

// ==========================================================================
// NOVA FUNÇÃO DE CADASTRO (Criar nova conta de Técnico ou Financeiro)
// ==========================================================================
async function realizarCadastroReal(nome, email, senha, papelEscolhido) {
    try {
        // 1. Cria o usuário no Supabase Auth passando metadados (nome)
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    nome: nome
                }
            }
        });

        if (error) {
            exibirCarregamentoLogin(false);
            uiAlert("Erro ao criar conta: " + error.message);
            return;
        }

        // 2. Garantir a criação do perfil no banco como 'pendente'
        if (data?.user) {
            const { error: insertError } = await supabaseClient
                .from('perfis')
                .upsert({ 
                    id: data.user.id,
                    email: email,
                    nome: nome,
                    papel: papelEscolhido || 'tecnico',
                    status: 'pendente'
                });

            if (insertError) {
                console.warn("Aviso: Falha ao inserir perfil no banco.", insertError);
            }

            uiAlert("Cadastro realizado com sucesso! Aguarde até que um Administrador da NEVIXA ENGENHARIA aprove o seu acesso para poder entrar no sistema.");
            
            // Fazer o signOut (deslogar) imediatamente, pois ele está pendente e não deve entrar
            await supabaseClient.auth.signOut();
            
            // Força o retorno para a tela de login limpa
            alternarModoJanelaLogin('login'); 
        }

    } catch (err) {
        console.error("Erro no processo de cadastro:", err);
        exibirCarregamentoLogin(false);
        uiAlert("Não foi possível processar o cadastro solicitado.");
    }
}

// Função auxiliar para dar feedback visual no botão enquanto consulta a nuvem
function exibirCarregamentoLogin(carregando) {
    const btnLogin = document.querySelector("#form-login button[type='submit']");
    const btnRegister = document.querySelector("#form-register button[type='submit']");
    
    if (btnLogin) {
        btnLogin.disabled = carregando;
        btnLogin.innerHTML = carregando ? '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...' : '<i class="fa-solid fa-right-to-bracket"></i> Acessar Sistema';
    }
    if (btnRegister) {
        btnRegister.disabled = carregando;
        btnRegister.innerHTML = carregando ? '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando...' : '<i class="fa-solid fa-user-plus"></i> Concluir Cadastro';
    }
}

// ==========================================================================
// DADOS MOCK INICIAIS (Se o localStorage estiver vazio)
// ==========================================================================
const MOCK_EQUIPMENTS = [
    { id: "eq-1", tag: "EQ-RM-001", nome: "Ressonância Magnética Philips Achieva 1.5T", cliente: "Clínica Radiosul", serial: "RM987654", status: "Operacional", ultimaPreventiva: "2026-05-10" },
    { id: "eq-2", tag: "EQ-CT-001", nome: "Tomógrafo Computadorizado GE Optima 660", cliente: "Hospital Albert Einstein", serial: "CT123456", status: "Atenção (Manutenção Necessária)", ultimaPreventiva: "2026-07-02" },
    { id: "eq-3", tag: "EQ-RX-001", nome: "Raio-X Digital Siemens Multix", cliente: "Santa Casa de Misericórdia", serial: "RX882211", status: "Parado (Aguardando Peça)", ultimaPreventiva: "2026-04-15" },
    { id: "eq-4", tag: "EQ-US-001", nome: "Ultrassom Doppler Colorido Mindray DC-70", cliente: "Clínica UltraScan", serial: "US556633", status: "Operacional", ultimaPreventiva: "2026-07-12" }
];

const MOCK_CALIBRATORS = [
    { id: "cal-1", nome: "Medidor de kV/Dose Barracuda (Piranha)", serial: "BC-9981", ultimaCalibracao: "2025-08-15", proximaCalibracao: "2026-08-15" },
    { id: "cal-2", nome: "Simulador de Fantoma de Água para Tomografia", serial: "PH-1200", ultimaCalibracao: "2026-01-10", proximaCalibracao: "2027-01-10" },
    { id: "cal-3", nome: "Câmara de Ionização de Radiação 10cc", serial: "CI-0044", ultimaCalibracao: "2025-06-20", proximaCalibracao: "2026-06-20" } // Calibração Vencida!
];

const MOCK_TICKETS = [
    { 
        id: "tk-1", 
        numero: "OS-2026501", 
        hospital: "Hospital Albert Einstein", 
        equipamento: "Tomógrafo GE Optima", 
        tipo: "Corretiva", 
        dataAbertura: "2026-07-01T15:30:00", 
        dataInicioAtendimento: "2026-07-01T16:00:00",
        dataFimAtendimento: "2026-07-01T18:45:00",
        descricaoServico: "Substituição de escovas de carvão desgastadas no motor do gantry, limpeza dos filtros de ar de refrigeração e testes de calibração final com calibrador biométrico fluke. Equipamento testado e liberado para uso clínico.",
        responsavelNome: "Dra. Mariana Ramos",
        responsavelCargo: "Diretora de Engenharia Clínica",
        responsavelAssinatura: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M10,40 C50,10 90,20 130,5 C170,-10 180,45 100,35 C50,30 20,40 160,30' fill='none' stroke='%232563eb' stroke-width='3'/></svg>",
        fotos: [
            { titulo: "Antes (Defeito no Motor)", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='100%' height='100%' fill='%232a1010'/><line x1='20' y1='20' x2='140' y2='100' stroke='%23ef4444' stroke-width='4'/><line x1='140' y1='20' x2='20' y2='100' stroke='%23ef4444' stroke-width='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23f87171' font-size='12' font-family='sans-serif'>BOBINA QUEIMADA</text></svg>" },
            { titulo: "Depois (Bobina Nova)", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='100%' height='100%' fill='%23102a18'/><path d='M30,60 L70,90 L135,35' stroke='%2310b981' stroke-width='6' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='50%' y='85%' dominant-baseline='middle' text-anchor='middle' fill='%2334d399' font-size='11' font-family='sans-serif'>TESTE OK</text></svg>" }
        ],
        status: "Encerrado", 
        slaHoras: 12 
    },
    { 
        id: "tk-2", 
        numero: "OS-2026502", 
        hospital: "Santa Casa de Misericórdia", 
        equipamento: "Raio-X Siemens", 
        tipo: "Corretiva", 
        dataAbertura: "2026-07-02T08:00:00", 
        dataInicioAtendimento: null,
        dataFimAtendimento: null,
        descricaoServico: "",
        responsavelNome: "",
        responsavelCargo: "",
        responsavelAssinatura: "",
        fotos: [],
        status: "Pendente", 
        slaHoras: 48 
    },
    { 
        id: "tk-3", 
        numero: "OS-2026503", 
        hospital: "Clínica Radiosul", 
        equipamento: "Ressonância Philips", 
        tipo: "Preventiva", 
        dataAbertura: "2026-07-02T10:00:00", 
        dataInicioAtendimento: "2026-07-02T11:00:00",
        dataFimAtendimento: null,
        descricaoServico: "",
        responsavelNome: "",
        responsavelCargo: "",
        responsavelAssinatura: "",
        fotos: [],
        status: "Em Atendimento", 
        slaHoras: 72 
    }
];

const MOCK_QUOTATIONS = [
    { id: "q-1", peca: "Tubo de Raios-X de Reposição (CT GE)", equipamento: "Tomógrafo GE Optima", solicitante: "Rodrigo Lima (Técnico)", fornecedor: "GE Healthcare Brasil", valor: 28000.00, status: "Aprovado" },
    { id: "q-2", peca: "Placa de Controle de Colimação Sobressalente", equipamento: "Raio-X Siemens", solicitante: "Rodrigo Lima (Técnico)", fornecedor: "Siemens Healthineers", valor: 7500.00, status: "Aprovado" },
    { id: "q-3", peca: "Bobina de Cabeça de 8 Canais para RM", equipamento: "Ressonância Philips", solicitante: "Rodrigo Lima (Técnico)", fornecedor: "Philips Medical", valor: 14500.00, status: "Pendente" }
];

const MOCK_TIMESHEETS = [
    { id: "ts-1", notaFiscalId: "inv-1", tecnico: "Rodrigo Lima", horas: 12, valorHora: 120.00, custoTotal: 1440.00 },
    { id: "ts-2", notaFiscalId: "inv-2", tecnico: "Rodrigo Lima", horas: 8, valorHora: 120.00, custoTotal: 960.00 },
    { id: "ts-3", notaFiscalId: "inv-3", tecnico: "Rodrigo Lima", horas: 4, valorHora: 120.00, custoTotal: 480.00 }
];

const MOCK_INVOICES = [
    { id: "inv-1", numeroNota: "NF-2026001", equipamentoId: "eq-2", cliente: "Hospital Albert Einstein", descricao: "Manutenção corretiva com troca de tubos no equipamento de Tomografia Computadora GE Optima", valorTotal: 45000.00, dataEmissao: "2026-07-02", status: "Recebido", calcularImpostos: true },
    { id: "inv-2", numeroNota: "NF-2026002", equipamentoId: "eq-1", cliente: "Clínica Radiosul", descricao: "Calibração anual e manutenção preventiva de Ressonância Magnética Philips Achieva 1.5T", valorTotal: 18500.00, dataEmissao: "2026-07-05", status: "Pendente", calcularImpostos: true },
    { id: "inv-3", numeroNota: "NF-2026003", equipamentoId: "eq-3", cliente: "Santa Casa de Misericórdia", descricao: "Conserto emergencial no sistema de colimação do Raio-X Digital Siemens Multix", valorTotal: 8900.00, dataEmissao: "2026-07-08", status: "Recebido", calcularImpostos: true },
    { id: "inv-4", numeroNota: "NF-2026004", equipamentoId: "eq-4", cliente: "Clínica UltraScan", descricao: "Manutenção preventiva em 4 aparelhos de Ultrassonografia Doppler Colorido", valorTotal: 12000.00, dataEmissao: "2026-07-12", status: "Recebido", calcularImpostos: false }
];

const MOCK_TRANSACTIONS = [
    // Impostos Automáticos (DAS Simples Nacional - 8.0%)
    { id: "tax-1", data: "2026-07-02", descricao: "Imposto DAS - Simples Nacional (8.0%) sobre NF NF-2026001", tipo: "Saída", valor: 3600.00, categoria: "Impostos", status: "Pendente", notaFiscalId: "inv-1", isImpostoAuto: true },
    { id: "tax-2", data: "2026-07-05", descricao: "Imposto DAS - Simples Nacional (8.0%) sobre NF NF-2026002", tipo: "Saída", valor: 1480.00, categoria: "Impostos", status: "Pendente", notaFiscalId: "inv-2", isImpostoAuto: true },
    { id: "tax-3", data: "2026-07-08", descricao: "Imposto DAS - Simples Nacional (8.0%) sobre NF NF-2026003", tipo: "Saída", valor: 712.00, categoria: "Impostos", status: "Pendente", notaFiscalId: "inv-3", isImpostoAuto: true },

    // Despesas Diretas com Peças e Km
    { id: "t-1", data: "2026-07-03", descricao: "Importação do tubo de raios-x de reposição (peça direta)", tipo: "Saída", valor: 28000.00, categoria: "Peças", status: "Pago", notaFiscalId: "inv-1", garantiaMeses: 12 },
    { id: "t-3", data: "2026-07-04", descricao: "Deslocamento técnico - 150Km rodados (Reembolso)", tipo: "Saída", valor: 450.00, categoria: "Deslocamento", status: "Pago", notaFiscalId: "inv-1", kmRodados: 150 },
    
    // Despesas Preventiva Philips RM
    { id: "t-4", data: "2026-07-06", descricao: "Locação de kit de ferramentas e calibração de hélio líquido", tipo: "Saída", valor: 2500.00, categoria: "Serviços", status: "Pago", notaFiscalId: "inv-2" },
    { id: "t-5", data: "2026-07-06", descricao: "Despesas com hospedagem dos engenheiros de campo (3 dias)", tipo: "Saída", valor: 820.00, categoria: "Deslocamento", status: "Pago", notaFiscalId: "inv-2" },
    
    // Despesa Santa Casa
    { id: "t-6", data: "2026-07-09", descricao: "Compra de placa de controle de colimação sobressalente", tipo: "Saída", valor: 7500.00, categoria: "Peças", status: "Pago", notaFiscalId: "inv-3", garantiaMeses: 6 },
    
    // Custos fixos
    { id: "t-8", data: "2026-07-05", descricao: "Honorários contabilidade mensal Nevixa", tipo: "Saída", valor: 1200.00, categoria: "Outros", status: "Pago", notaFiscalId: "" },
    { id: "t-9", data: "2026-07-10", descricao: "Retirada Pró-labore Sócios", tipo: "Saída", valor: 8000.00, categoria: "Salários", status: "Pago", notaFiscalId: "" },
    { id: "t-10", data: "2026-07-11", descricao: "Entrada de reembolso de seguro de viagem anterior", tipo: "Entrada", valor: 1500.00, categoria: "Outros", status: "Pago", notaFiscalId: "" }
];

const DEFAULT_TAX_CONFIG = {
    regime: "SimplesNacional",
    simplesAliquota: 5.0,
    presumido: { pis: 0.65, cofins: 3.00, csll: 1.00, irrf: 1.50, iss: 5.00 }
};

// ==========================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================================================
const state = {
    invoices: [],
    transactions: [],
    equipments: [],
    calibrators: [],
    quotations: [],
    tickets: [],
    timesheets: [],
    auditLogs: [],
    taxConfig: {},
    rateioConfig: 10, // 10% rateio padrão (Melhoria 14)
    currentUser: null,
    activeTab: "dashboard",
    activeSubTab: "equipamentos",
    isOffline: false, // Modo Offline Simulado (Melhoria 17)
    filters: {
        nota: { search: "", status: "Todos" },
        transacao: { search: "", tipo: "Todos", categoria: "Todos", dataInicio: "", dataFim: "" }
    },
    charts: {
        fluxo: null,
        despesas: null,
        projection: null
    }
};

// Canvas drawing state (Assinatura digital - Melhoria 8)
let isDrawing = false;
let sigCanvas = null;
let sigCtx = null;

// Global helper for quick login prefill
window.prefillLogin = function(email, senha) {
    document.getElementById("login-email").value = email;
    document.getElementById("login-senha").value = senha;
};

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    await initDatabase(); // Inicializa o banco de dados (localStorage ou Mock)
    checkAuth();
    initMobileNavigation();
    setupEventListeners();
    setupSignatureCanvas();
    setCurrentDateHeader();
    applyThemePreference();

    // Sincronização multi-abas em tempo real (Sincronismo Operacional)
    window.addEventListener("storage", async (e) => {
        if (e.key && e.key.startsWith("nevixa_")) {
            await initDatabase();
            renderApp();
        }
    });
    
    // Iniciar Polling de sincronização entre guias anônimas/normais (Fase 4C)
    // startStateSyncPolling();
});

// Inicializa o banco de dados carregando da Nuvem (Supabase) ou usando LocalStorage/Mock
async function initDatabase() {
    try {
        const { data, error } = await supabaseClient
            .from('dados_sistema')
            .select('dados')
            .eq('id', 1)
            .single();
            
        if (data && data.dados) {
            const cloud = data.dados;
            state.invoices = cloud.invoices || [];
            state.transactions = cloud.transactions || [];
            state.equipments = cloud.equipments || MOCK_EQUIPMENTS;
            state.calibrators = cloud.calibrators || MOCK_CALIBRATORS;
            state.quotations = cloud.quotations || MOCK_QUOTATIONS;
            state.tickets = cloud.tickets || MOCK_TICKETS;
            state.timesheets = cloud.timesheets || MOCK_TIMESHEETS;
            state.auditLogs = cloud.auditLogs || [];
            state.taxConfig = cloud.taxConfig || DEFAULT_TAX_CONFIG;
            state.rateioConfig = cloud.rateioConfig || 10;
            
            const inputRateio = document.getElementById("input-bi-rateio-perc");
            if (inputRateio) inputRateio.value = state.rateioConfig;
            
            saveStateToLocalStorageOnly(); // Mantém cache local atualizado
            console.log("Banco de dados sincronizado com a Nuvem (Supabase) com sucesso!");
            return;
        }
    } catch (err) {
        console.warn("Aviso: Nuvem não inicializada ou vazia, usando LocalStorage...", err);
    }

    const storedInvoices = localStorage.getItem("nevixa_invoices");
    const storedTransactions = localStorage.getItem("nevixa_transactions");
    const storedEquipments = localStorage.getItem("nevixa_equipments");
    const storedCalibrators = localStorage.getItem("nevixa_calibrators");
    const storedQuotations = localStorage.getItem("nevixa_quotations");
    const storedTickets = localStorage.getItem("nevixa_tickets");
    const storedTimesheets = localStorage.getItem("nevixa_timesheets");
    const storedAuditLogs = localStorage.getItem("nevixa_audit_logs");
    const storedTaxConfig = localStorage.getItem("nevixa_tax_config");
    const storedRateio = localStorage.getItem("nevixa_rateio_perc");
    
    // Configurações tributárias/rateios
    state.taxConfig = storedTaxConfig ? JSON.parse(storedTaxConfig) : DEFAULT_TAX_CONFIG;
    if (state.taxConfig && state.taxConfig.simplesAliquota === 8.0) {
        state.taxConfig.simplesAliquota = 5.0; // Atualiza defaults para base local também
    }
    state.rateioConfig = storedRateio ? parseFloat(storedRateio) : 10;
    
    const inputRateio = document.getElementById("input-bi-rateio-perc");
    if (inputRateio) inputRateio.value = state.rateioConfig;
    
    // Tabelas core
    if (storedInvoices && storedTransactions && JSON.parse(storedInvoices).length > 0) {
        state.invoices = JSON.parse(storedInvoices);
        state.transactions = JSON.parse(storedTransactions);
        state.equipments = JSON.parse(storedEquipments) || MOCK_EQUIPMENTS;
        state.calibrators = JSON.parse(storedCalibrators) || MOCK_CALIBRATORS;
        state.quotations = JSON.parse(storedQuotations) || MOCK_QUOTATIONS;
        state.tickets = JSON.parse(storedTickets) || MOCK_TICKETS;
        state.timesheets = JSON.parse(storedTimesheets) || MOCK_TIMESHEETS;
        state.auditLogs = JSON.parse(storedAuditLogs) || [];
    } else {
        // Popula com dados mockados completos para demonstrar o ERP rodando
        state.invoices = MOCK_INVOICES;
        state.transactions = MOCK_TRANSACTIONS;
        state.equipments = MOCK_EQUIPMENTS;
        state.calibrators = MOCK_CALIBRATORS;
        state.quotations = MOCK_QUOTATIONS;
        state.tickets = MOCK_TICKETS;
        state.timesheets = MOCK_TIMESHEETS;
        state.auditLogs = [
            { timestamp: new Date().toISOString(), usuario: "Sistema", operacao: "Banco Inicializado", descricao: "Banco de dados preenchido com dados fictícios de demonstração." }
        ];
    }
    saveStateToLocalStorage();
}

// Salva dados no LocalStorage e no Servidor Supabase
async function saveStateToLocalStorage() {
    saveStateToLocalStorageOnly();
    
    const dataToSave = {
        invoices: state.invoices,
        transactions: state.transactions,
        equipments: state.equipments,
        calibrators: state.calibrators,
        quotations: state.quotations,
        tickets: state.tickets,
        timesheets: state.timesheets,
        auditLogs: state.auditLogs,
        taxConfig: state.taxConfig,
        rateioConfig: state.rateioConfig
    };
    
    try {
        const { error } = await supabaseClient
            .from('dados_sistema')
            .upsert({ id: 1, dados: dataToSave });
            
        if (error) console.error('Erro ao salvar estado no Supabase:', error);
    } catch (err) {
        console.error('Falha de conexão ao salvar na nuvem:', err);
    }
}

function saveStateToLocalStorageOnly() {
    localStorage.setItem("nevixa_invoices", JSON.stringify(state.invoices));
    localStorage.setItem("nevixa_transactions", JSON.stringify(state.transactions));
    localStorage.setItem("nevixa_equipments", JSON.stringify(state.equipments));
    localStorage.setItem("nevixa_calibrators", JSON.stringify(state.calibrators));
    localStorage.setItem("nevixa_quotations", JSON.stringify(state.quotations));
    localStorage.setItem("nevixa_tickets", JSON.stringify(state.tickets));
    localStorage.setItem("nevixa_timesheets", JSON.stringify(state.timesheets));
    localStorage.setItem("nevixa_audit_logs", JSON.stringify(state.auditLogs));
    localStorage.setItem("nevixa_tax_config", JSON.stringify(state.taxConfig));
    localStorage.setItem("nevixa_rateio_perc", state.rateioConfig.toString());
}

// Log de Auditoria do Sistema (Melhoria 18)
function addAuditLog(operacao, descricao) {
    const user = state.currentUser ? state.currentUser.nome : "Desconectado";
    const log = {
        timestamp: new Date().toISOString(),
        usuario: user,
        operacao,
        descricao
    };
    state.auditLogs.unshift(log);
    saveStateToLocalStorage();
}

// Define o cabeçalho com a data atual formatada
function setCurrentDateHeader() {
    const dataAtual = new Date();
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    document.getElementById("header-date").innerText = `${meses[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`;
}

// ==========================================================================
// AUTENTICAÇÃO E SESSÃO DE USUÁRIO
// ==========================================================================
function checkAuth() {
    const storedUser = sessionStorage.getItem("nevixa_current_user");
    if (storedUser) {
        state.currentUser = JSON.parse(storedUser);
        applyUserProfile(state.currentUser);
        document.getElementById("login-overlay").classList.remove("active");
        
        if (state.currentUser.papel === "tecnico" && state.activeTab === "dashboard") {
            switchTab("notas");
        } else {
            renderApp();
        }
    } else {
        state.currentUser = null;
        document.getElementById("login-overlay").classList.add("active");
    }
}

function applyUserProfile(user) {
    document.body.className = `role-${user.papel}`;
    document.getElementById("current-user-name").innerText = user.nome;
    document.getElementById("current-user-role").innerText = user.cargo;
    
    const avatarIcon = document.getElementById("current-user-avatar").querySelector("i");
    avatarIcon.className = "fa-solid";
    if (user.papel === "admin") avatarIcon.classList.add("fa-user-gear");
    else if (user.papel === "financeiro") avatarIcon.classList.add("fa-user-tie");
    else if (user.papel === "cliente") avatarIcon.classList.add("fa-hospital");
    else avatarIcon.classList.add("fa-user-helmet-safety");
    
    // Controle de Menus (Desktop)
    const menuAcessos = document.getElementById("menu-item-acessos");
    const menuFluxo = document.getElementById("menu-item-fluxo");
    const menuOp = document.getElementById("menu-item-operacoes");
    const menuRelat = document.getElementById("menu-item-relatorios");

    if (user.papel === "admin") {
        if (menuAcessos) menuAcessos.classList.remove("d-none");
        if (menuFluxo) menuFluxo.classList.remove("d-none");
        if (menuOp) menuOp.classList.remove("d-none");
        if (menuRelat) menuRelat.classList.remove("d-none");
    } else if (user.papel === "financeiro") {
        if (menuAcessos) menuAcessos.classList.add("d-none");
        if (menuFluxo) menuFluxo.classList.remove("d-none");
        if (menuOp) menuOp.classList.remove("d-none");
        if (menuRelat) menuRelat.classList.remove("d-none");
    } else if (user.papel === "tecnico") {
        if (menuAcessos) menuAcessos.classList.add("d-none");
        if (menuFluxo) menuFluxo.classList.add("d-none");
        if (menuOp) menuOp.classList.remove("d-none");
        if (menuRelat) menuRelat.classList.add("d-none");
    } else if (user.papel === "cliente") {
        if (menuAcessos) menuAcessos.classList.add("d-none");
        if (menuFluxo) menuFluxo.classList.add("d-none");
        if (menuOp) menuOp.classList.remove("d-none"); // Cliente precisa ver seus equipamentos e chamados
        if (menuRelat) menuRelat.classList.add("d-none");
    }

    // Dashboard toggle
    const dashCliente = document.getElementById("dashboard-cliente");
    const dashCorp = document.getElementById("dashboard-corporativo");
    if (dashCliente && dashCorp) {
        if (user.papel === "cliente") {
            dashCliente.classList.remove("d-none");
            dashCorp.classList.add("d-none");
        } else {
            dashCliente.classList.add("d-none");
            dashCorp.classList.remove("d-none");
        }
    }
}

// ==========================================================================
// FORMATADORES
// ==========================================================================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

window.mascaraMoeda = function(campo) {
    let valor = campo.value.replace(/\D/g, '');
    if (valor === '') {
        campo.value = '';
        return;
    }
    valor = (parseInt(valor, 10) / 100).toFixed(2) + '';
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    campo.value = valor;
};

window.parseCurrencyBR = function(val) {
    if (!val) return 0;
    val = val.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(val) || 0;
};

window.formatInputCurrency = function(val) {
    if (!val && val !== 0) return "";
    let valor = parseFloat(val).toFixed(2);
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return valor;
};

function formatDate(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function generateUUID() {
    return 'uuid-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// ==========================================================================
// CONTROLE DE NAVEGAÇÃO E RESPONSIVIDADE MOBILE
// ==========================================================================
function initMobileNavigation() {
    const appContainer = document.querySelector(".app-container");
    const mobileNav = document.createElement("nav");
    mobileNav.className = "sidebar-nav-mobile";
    
    mobileNav.innerHTML = `
        <a href="#" class="mobile-nav-link active" data-tab="dashboard" id="mob-menu-dashboard">
            <i class="fa-solid fa-chart-pie"></i>
            <span>Dashboard</span>
        </a>
        <a href="#" class="mobile-nav-link" data-tab="notas" id="mob-menu-notas">
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <span>Notas</span>
        </a>
        <a href="#" class="mobile-nav-link" data-tab="fluxo" id="mob-menu-fluxo">
            <i class="fa-solid fa-money-bill-transfer"></i>
            <span>Fluxo</span>
        </a>
        <a href="#" class="mobile-nav-link" data-tab="operacoes" id="mob-menu-operacoes">
            <i class="fa-solid fa-helmet-safety"></i>
            <span>Op. Técnicas</span>
        </a>
        <a href="#" class="mobile-nav-link" data-tab="relatorios" id="mob-menu-relatorios">
            <i class="fa-solid fa-chart-line"></i>
            <span>BI</span>
        </a>
    `;
    
    appContainer.appendChild(mobileNav);
    
    const mobileLinks = mobileNav.querySelectorAll(".mobile-nav-link[data-tab]");
    mobileLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab(link.getAttribute("data-tab"));
        });
    });
}

function updateMobileMenuACL() {
    if (!state.currentUser) return;
    
    const mobDashboard = document.getElementById("mob-menu-dashboard");
    const mobFluxo = document.getElementById("mob-menu-fluxo");
    const mobRelatorios = document.getElementById("mob-menu-relatorios");
    
    if (state.currentUser.papel === "tecnico") {
        if (mobDashboard) mobDashboard.style.display = "none";
        if (mobFluxo) mobFluxo.style.display = "none";
        if (mobRelatorios) mobRelatorios.style.display = "none";
    } else if (state.currentUser.papel === "cliente") {
        if (mobDashboard) mobDashboard.style.display = "flex";
        if (mobFluxo) mobFluxo.style.display = "none";
        if (mobRelatorios) mobRelatorios.style.display = "none";
        const mobOp = document.querySelector(".sidebar-nav-mobile .mobile-nav-link[data-tab='operacoes']");
        if(mobOp) mobOp.style.display = "flex";
    } else {
        if (mobDashboard) mobDashboard.style.display = "flex";
        if (mobFluxo) mobFluxo.style.display = "flex";
        if (mobRelatorios) mobRelatorios.style.display = "flex";
        const mobOp = document.querySelector(".sidebar-nav-mobile .mobile-nav-link[data-tab='operacoes']");
        if(mobOp) mobOp.style.display = "flex";
    }
}

function switchTab(tabName) {
    if (!state.currentUser) return;
    if (state.currentUser.papel === "tecnico" && tabName !== "notas" && tabName !== "operacoes") return;
    if (state.currentUser.papel === "cliente" && tabName !== "dashboard" && tabName !== "notas" && tabName !== "operacoes") return;
    
    state.activeTab = tabName;
    
    // Classes na Sidebar
    document.querySelectorAll(".sidebar-nav .nav-link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("data-tab") === tabName);
    });

    // Classes na Barra Mobile
    document.querySelectorAll(".sidebar-nav-mobile .mobile-nav-link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("data-tab") === tabName);
    });
    
    // Mostrar a aba
    document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.toggle("active", pane.id === `tab-${tabName}`);
    });
    
    const sectionTitle = document.getElementById("current-section-title");
    const sectionSubtitle = document.getElementById("current-section-subtitle");
    
    if (tabName === "dashboard") {
        if (state.currentUser && (state.currentUser.role === "Cliente" || state.currentUser.role === "Cliente (Hospital / Clínica)")) {
            sectionTitle.innerText = "Área do Cliente";
            sectionSubtitle.innerText = "Acompanhe o status dos seus equipamentos e notas fiscais";
        } else {
            sectionTitle.innerText = "Dashboard Geral";
            sectionSubtitle.innerText = "Visão consolidada da saúde financeira da empresa";
        }
    } else if (tabName === "notas") {
        sectionTitle.innerText = "Central de Notas Fiscais";
        sectionSubtitle.innerText = "Gestão de faturamentos de serviço e centros de custos";
    } else if (tabName === "fluxo") {
        sectionTitle.innerText = "Fluxo de Caixa Geral";
        sectionSubtitle.innerText = "Histórico geral de todas as entradas e saídas da empresa";
    } else if (tabName === "operacoes") {
        sectionTitle.innerText = "Operações Técnicas de Campo";
        sectionSubtitle.innerText = "Prontuários de equipamentos, calibradores, cotações e controle de chamados SLA";
    } else if (tabName === "relatorios") {
        sectionTitle.innerText = "BI & Relatórios Contábeis";
        sectionSubtitle.innerText = "Demonstrativos de Resultados (DRE), Ponto de Equilíbrio, Margem Real e Prospecção";
    } else if (tabName === "acessos") {
        sectionTitle.innerText = "Gestão de Acessos";
        sectionSubtitle.innerText = "Aprove ou bloqueie a entrada de colaboradores no sistema";
        carregarUsuarios(); // Sempre que entrar na aba, recarrega a lista
    }
    
    renderApp();
}

function renderApp() {
    renderTab(state.activeTab);
    updateMobileMenuACL();
}

function switchSubTab(subTabName) {
    state.activeSubTab = subTabName;
    
    document.querySelectorAll(".sub-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-subtab") === subTabName);
    });
    
    document.querySelectorAll(".sub-tab-pane").forEach(pane => {
        pane.classList.toggle("active", pane.id === `subtab-${subTabName}`);
    });
    
    renderSubTab(subTabName);
}

function renderSubTab(subTabName) {
    if (subTabName === "equipamentos") renderEquipamentos();
    else if (subTabName === "calibradores") renderCalibradores();
    else if (subTabName === "cotacoes") renderCotacoes();
    else if (subTabName === "chamados") renderChamados();
}

function renderTab(tabName) {
    if (tabName === "dashboard") renderDashboard();
    else if (tabName === "notas") renderNotasTable();
    else if (tabName === "fluxo") renderFluxoTable();
    else if (tabName === "operacoes") renderSubTab(state.activeSubTab);
    else if (tabName === "relatorios") renderRelatorios();
}

// ==========================================================================
// RENDERIZADORES DAS TELAS
// ==========================================================================

/* --------------------------------------------------------------------------
   A. ABA DASHBOARD
   -------------------------------------------------------------------------- */
function renderDashboardCliente() {
    const nomeCliente = state.currentUser ? state.currentUser.nome : "";
    const clientInvoices = state.invoices.filter(inv => inv.cliente === nomeCliente && inv.status !== "Cancelado");
    const clientEquips = state.equipments.filter(eq => eq.cliente === nomeCliente);
    
    const faturasPendentes = clientInvoices.filter(inv => inv.status === "Aberto" || inv.status === "Atrasado");
    const totalPendente = faturasPendentes.reduce((acc, curr) => acc + curr.valorTotal, 0);
    
    document.getElementById("dash-cliente-faturas-count").innerText = faturasPendentes.length;
    document.getElementById("dash-cliente-faturas-total").innerText = `Total: ${formatCurrency(totalPendente)} a pagar`;
    
    document.getElementById("dash-cliente-equip-count").innerText = clientEquips.length;
    
    const hoje = new Date();
    const temAtrasado = clientEquips.some(eq => {
        if(!eq.ultimaPreventiva) return false;
        let diff = (hoje - new Date(eq.ultimaPreventiva)) / (1000 * 60 * 60 * 24);
        return diff > 365;
    });
    
    const elStatus = document.getElementById("dash-cliente-status-prev");
    if (temAtrasado) {
        elStatus.innerText = "Atenção (Vencidos)";
        elStatus.style.color = "var(--color-danger)";
    } else {
        elStatus.innerText = "Regular";
        elStatus.style.color = "var(--color-success)";
    }

    // Chamados Abertos
    const clientTickets = state.tickets.filter(tk => tk.hospital === nomeCliente && (tk.status === "Pendente" || tk.status === "Em Atendimento"));
    const chamadosEl = document.getElementById("dash-cliente-chamados-count");
    if (chamadosEl) chamadosEl.innerText = clientTickets.length;
}

function renderDashboard() {
    if (state.currentUser && state.currentUser.papel === "cliente") {
        renderDashboardCliente();
        return;
    }

    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth();
    
    const currentMonthInvoices = state.invoices.filter(inv => {
        if (inv.status === "Cancelado") return false;
        const parts = inv.dataEmissao.split("-");
        return parseInt(parts[0]) === anoAtual && (parseInt(parts[1]) - 1) === mesAtual;
    });

    const currentMonthTransactions = state.transactions.filter(t => {
        const parts = t.data.split("-");
        return parseInt(parts[0]) === anoAtual && (parseInt(parts[1]) - 1) === mesAtual;
    });
    
    // Entradas = Notas Recebidas + Entradas Gerais Avulsas
    const faturamentoNotasRecebido = currentMonthInvoices
        .filter(inv => inv.status === "Recebido")
        .reduce((sum, inv) => sum + inv.valorTotal, 0);

    const receitasAvulsasPagas = currentMonthTransactions
        .filter(t => t.tipo === "Entrada" && t.status === "Pago" && !t.notaFiscalId)
        .reduce((sum, t) => sum + t.valor, 0);

    const totalEntradas = faturamentoNotasRecebido + receitasAvulsasPagas;
    
    // Saídas = Transações de Saída confirmadas
    const totalSaidas = currentMonthTransactions
        .filter(t => t.tipo === "Saída" && t.status === "Pago")
        .reduce((sum, t) => sum + t.valor, 0);

    const totalSaidasPendentes = currentMonthTransactions
        .filter(t => t.tipo === "Saída" && t.status === "Pendente")
        .reduce((sum, t) => sum + t.valor, 0);
        
    const lucroLiquido = totalEntradas - totalSaidas;
    const margemGeral = totalEntradas > 0 ? (lucroLiquido / totalEntradas) * 100 : 0;
    
    document.getElementById("dash-entradas").innerText = formatCurrency(totalEntradas);
    document.getElementById("dash-saidas").innerText = formatCurrency(totalSaidas);
    document.getElementById("dash-saidas-pendentes").innerText = `${formatCurrency(totalSaidasPendentes)} pendentes`;
    
    const lucroElement = document.getElementById("dash-lucro");
    lucroElement.innerText = formatCurrency(lucroLiquido);
    
    const lucroTrendElement = document.getElementById("dash-lucro-trend");
    if (lucroLiquido >= 0) {
        lucroElement.className = "metric-value val-receita";
        lucroTrendElement.className = "trend trend-up";
        lucroTrendElement.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> Resultado positivo`;
    } else {
        lucroElement.className = "metric-value val-despesa";
        lucroTrendElement.className = "trend trend-down";
        lucroTrendElement.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> Resultado deficitário`;
    }
    
    document.getElementById("dash-margem").innerText = `${margemGeral.toFixed(1)}%`;
    document.getElementById("dash-margem-bar").style.width = `${Math.max(0, Math.min(100, margemGeral))}%`;

    // Equipamentos Instalados (Admin)
    const equipEl = document.getElementById("dash-equip-count");
    if (equipEl) equipEl.innerText = state.equipments.length;

    // Chamados em Aberto (Admin/Corporativo)
    const chamadosCorp = state.tickets.filter(tk => tk.status === "Pendente" || tk.status === "Em Atendimento" || tk.status === "Aguardando Peça");
    const chamadosCorpEl = document.getElementById("dash-chamados-count");
    if (chamadosCorpEl) chamadosCorpEl.innerText = chamadosCorp.length;
    
    renderDashboardCharts();
    renderDashboardAlerts();
}

function renderDashboardAlerts() {
    const alertBody = document.getElementById("dash-alerts-table-body");
    alertBody.innerHTML = "";
    
    const lowMarginInvoices = [];
    
    state.invoices.forEach(inv => {
        if (inv.status === "Cancelado") return;
        
        // Custos das Transações
        const custosTrans = state.transactions
            .filter(t => t.notaFiscalId === inv.id && t.tipo === "Saída")
            .reduce((sum, t) => sum + t.valor, 0);
            
        // Custos de Timesheet Mão de Obra
        const custosTS = state.timesheets
            .filter(ts => ts.notaFiscalId === inv.id)
            .reduce((sum, ts) => sum + ts.custoTotal, 0);
            
        const totalCustos = custosTrans + custosTS;
        const lucro = inv.valorTotal - totalCustos;
        const margem = inv.valorTotal > 0 ? (lucro / inv.valorTotal) * 100 : 0;
        
        if (margem < 20) {
            lowMarginInvoices.push({ ...inv, custos: totalCustos, lucro, margem });
        }
    });
    
    if (lowMarginInvoices.length === 0) {
        alertBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fa-solid fa-circle-check text-success mr-1"></i> Excelentes margens de lucro! Nenhuma nota fiscal está com baixa rentabilidade.
                </td>
            </tr>
        `;
        return;
    }
    
    lowMarginInvoices.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${item.numeroNota}</strong></td>
            <td>${item.cliente}</td>
            <td class="font-numeric">${formatCurrency(item.valorTotal)}</td>
            <td class="font-numeric val-despesa">${formatCurrency(item.custos)}</td>
            <td class="font-numeric ${item.lucro >= 0 ? 'val-receita' : 'val-despesa'}">${formatCurrency(item.lucro)}</td>
            <td>
                <span class="badge ${item.margem <= 0 ? 'badge-danger' : 'badge-warning'}">
                    ${item.margem.toFixed(1)}%
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openInvoiceDetails('${item.id}')">
                    <i class="fa-solid fa-magnifying-glass"></i> Detalhes
                </button>
            </td>
        `;
        alertBody.appendChild(row);
    });
}

function renderDashboardCharts() {
    const mesesLabels = [];
    const entradasData = [];
    const saidasData = [];
    
    const dataCursor = new Date();
    dataCursor.setDate(1);
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(dataCursor.getFullYear(), dataCursor.getMonth() - i, 1);
        const mesIndex = d.getMonth();
        const ano = d.getFullYear();
        
        const nomesMesesCurtos = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        mesesLabels.push(`${nomesMesesCurtos[mesIndex]}/${String(ano).substr(2)}`);
        
        // Entradas no Mês
        const totalEntradasMes = state.invoices
            .filter(inv => {
                if (inv.status !== "Recebido") return false;
                const p = inv.dataEmissao.split("-");
                return parseInt(p[0]) === ano && (parseInt(p[1]) - 1) === mesIndex;
            })
            .reduce((sum, inv) => sum + inv.valorTotal, 0) + 
            state.transactions
            .filter(t => {
                if (t.tipo !== "Entrada" || t.status !== "Pago" || t.notaFiscalId) return false;
                const p = t.data.split("-");
                return parseInt(p[0]) === ano && (parseInt(p[1]) - 1) === mesIndex;
            })
            .reduce((sum, t) => sum + t.valor, 0);

        // Saídas no Mês
        const totalSaidasMes = state.transactions
            .filter(t => {
                if (t.tipo !== "Saída" || t.status !== "Pago") return false;
                const p = t.data.split("-");
                return parseInt(p[0]) === ano && (parseInt(p[1]) - 1) === mesIndex;
            })
            .reduce((sum, t) => sum + t.valor, 0);

        entradasData.push(totalEntradasMes);
        saidasData.push(totalSaidasMes);
    }
    
    if (state.charts.fluxo) {
        try { state.charts.fluxo.destroy(); } catch(e) {}
    }
    if (state.charts.despesas) {
        try { state.charts.despesas.destroy(); } catch(e) {}
    }
    
    const ctxFluxo = document.getElementById("chart-fluxo-mensal").getContext("2d");
    try {
        state.charts.fluxo = new Chart(ctxFluxo, {
            type: 'bar',
            data: {
                labels: mesesLabels,
                datasets: [
                    { label: 'Entradas (Faturamento)', data: entradasData, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'Saídas (Custos)', data: saidasData, backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit' } } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } catch (e) {
        console.error("Falha ao inicializar o gráfico de fluxo. CDN offline ou bloqueada.", e);
        ctxFluxo.canvas.parentNode.innerHTML = `<div class="text-center text-muted py-4" style="font-size:0.8rem;"><i class="fa-solid fa-triangle-exclamation text-warning"></i> Gráfico indisponível (CDN offline ou bloqueada).</div>`;
    }

    // Despesas Donut (Mês Atual)
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth();
    
    const categoriasValores = { "Peças": 0, "Deslocamento": 0, "Impostos": 0, "Serviços": 0, "Salários": 0, "Outros": 0 };
    
    state.transactions
        .filter(t => {
            if (t.tipo !== "Saída" || t.status !== "Pago") return false;
            const p = t.data.split("-");
            return parseInt(p[0]) === anoAtual && (parseInt(p[1]) - 1) === mesAtual;
        })
        .forEach(t => {
            if (categoriasValores[t.categoria] !== undefined) {
                categoriasValores[t.categoria] += t.valor;
            } else {
                categoriasValores["Outros"] += t.valor;
            }
        });
        
    const descCategoriaTraduzida = { "Peças": "Peças de Reposição", "Deslocamento": "Deslocamento / Viagens", "Impostos": "Impostos & Tributos", "Serviços": "Serviços Terceirizados", "Salários": "Salários & Pró-labore", "Outros": "Outros Custos" };
    const despesasCategorias = Object.keys(categoriasValores);
    const despesasValores = Object.values(categoriasValores);
    const totalDespesas = despesasValores.reduce((sum, v) => sum + v, 0);
    
    const ctxDespesas = document.getElementById("chart-despesas-categoria").getContext("2d");
    try {
        if (totalDespesas === 0) {
            state.charts.despesas = new Chart(ctxDespesas, {
                type: 'doughnut',
                data: { labels: ['Sem despesas no mês'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        } else {
            state.charts.despesas = new Chart(ctxDespesas, {
                type: 'doughnut',
                data: {
                    labels: despesasCategorias.map(c => descCategoriaTraduzida[c]),
                    datasets: [{
                        data: despesasValores,
                        backgroundColor: ['#fbbf24', '#60a5fa', '#f87171', '#c084fc', '#34d399', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#0f1626'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } } }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Falha ao inicializar o gráfico de despesas. CDN offline ou bloqueada.", e);
        ctxDespesas.canvas.parentNode.innerHTML = `<div class="text-center text-muted py-4" style="font-size:0.8rem;"><i class="fa-solid fa-triangle-exclamation text-warning"></i> Gráfico indisponível (CDN offline ou bloqueada).</div>`;
    }
}

/* --------------------------------------------------------------------------
   B. ABA CENTRAL DE NOTAS FISCAIS
   -------------------------------------------------------------------------- */
function renderNotasTable() {
    const tableBody = document.getElementById("table-notas-body");
    tableBody.innerHTML = "";
    
    const query = state.filters.nota.search.toLowerCase();
    const filterStatus = state.filters.nota.status;
    
    const isCliente = state.currentUser && state.currentUser.papel === "cliente";
    const nomeCliente = state.currentUser ? state.currentUser.nome : "";

    const filteredInvoices = state.invoices.filter(inv => {
        if (isCliente && inv.cliente !== nomeCliente) return false;

        const matchesSearch = inv.numeroNota.toLowerCase().includes(query) || 
                              inv.cliente.toLowerCase().includes(query) || 
                              (inv.descricao && inv.descricao.toLowerCase().includes(query));
        const matchesStatus = filterStatus === "Todos" || inv.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const badgeRegime = document.getElementById("badge-active-tax-regime");
    if (badgeRegime) {
        if (state.taxConfig && state.taxConfig.regime) {
            badgeRegime.textContent = `${state.taxConfig.regime} (${state.taxConfig.simplesAliquota}%)`;
        } else {
            badgeRegime.textContent = "Não Configurado";
        }
    }
    
    if (filteredInvoices.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5">Nenhuma nota fiscal encontrada.</td></tr>`;
        return;
    }
    
    filteredInvoices.sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao));
    
    filteredInvoices.forEach(inv => {
        const despesasNota = state.transactions.filter(t => t.notaFiscalId === inv.id && t.tipo === "Saída");
        const totalCustosTrans = despesasNota.reduce((sum, t) => sum + t.valor, 0);
        
        const totalCustosTS = state.timesheets
            .filter(ts => ts.notaFiscalId === inv.id)
            .reduce((sum, ts) => sum + ts.custoTotal, 0);

        const totalCustos = totalCustosTrans + totalCustosTS;
        const lucroLiquido = inv.valorTotal - totalCustos;
        
        const percCusto = inv.valorTotal > 0 ? (totalCustos / inv.valorTotal) * 100 : 0;
        const percLucro = inv.valorTotal > 0 ? (lucroLiquido / inv.valorTotal) * 100 : 0;
        
        let statusClass = "badge-neutral";
        if (inv.status === "Recebido") statusClass = "badge-success";
        else if (inv.status === "Pendente") statusClass = "badge-warning";
        else if (inv.status === "Cancelado") statusClass = "badge-danger";
        
        const row = document.createElement("tr");
        
        const columnsLucroMargem = state.currentUser && (state.currentUser.papel === "tecnico" || state.currentUser.papel === "cliente")
            ? `<td class="col-hide-tecnico text-end">-</td><td class="col-hide-tecnico text-end">-</td>`
            : `
                <td class="font-numeric col-hide-tecnico text-end ${lucroLiquido >= 0 ? 'val-receita' : 'val-despesa'}">${formatCurrency(lucroLiquido)}</td>
                <td class="col-hide-tecnico text-end">
                    <span class="badge ${percLucro >= 35 ? 'badge-success' : percLucro >= 20 ? 'badge-info' : percLucro > 0 ? 'badge-warning' : 'badge-danger'}">
                        ${percLucro.toFixed(1)}%
                    </span>
                </td>
            `;
        
        let acoesHtml = `
            <button class="btn btn-outline btn-sm" onclick="gerarPDFNota('${inv.id}')" title="Baixar Espelho da Nota">
                <i class="fa-solid fa-file-pdf"></i>
            </button>`;

        if (!isCliente) {
            acoesHtml = `
                <button class="btn btn-outline btn-sm" onclick="openInvoiceDetails('${inv.id}')" title="Ver Gastos / Centro de Custo">
                    <i class="fa-solid fa-list-check"></i>
                </button>
                <button class="btn btn-outline btn-sm" onclick="editInvoice('${inv.id}')" title="Editar Nota">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-outline btn-sm text-danger" onclick="deleteInvoice('${inv.id}')" title="Excluir Nota">
                    <i class="fa-solid fa-trash-can"></i>
                </button>`;
        }

        row.innerHTML = `
            <td><strong>${inv.numeroNota}</strong></td>
            <td>
                <div class="font-weight-bold">${inv.cliente}</div>
                <div class="text-muted" style="font-size: 0.75rem">${formatDate(inv.dataEmissao)}</div>
            </td>
            <td class="font-numeric text-end val-receita">${formatCurrency(inv.valorTotal)}</td>
            <td class="font-numeric text-end val-despesa">${formatCurrency(totalCustos)}</td>
            <td class="font-numeric text-end">
                <span class="${percCusto >= 80 ? 'text-danger' : percCusto >= 50 ? 'text-warning' : 'text-muted'}" style="font-size: 0.8rem">
                    ${percCusto.toFixed(1)}%
                </span>
            </td>
            ${columnsLucroMargem}
            <td><span class="badge ${statusClass}">${inv.status}</span></td>
            <td>
                <div class="d-flex gap-2">
                    ${acoesHtml}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/* --------------------------------------------------------------------------
   C. ABA FLUXO DE CAIXA
   -------------------------------------------------------------------------- */
function renderFluxoTable() {
    const tableBody = document.getElementById("table-transacoes-body");
    tableBody.innerHTML = "";
    
    const query = state.filters.transacao.search.toLowerCase();
    const filterTipo = state.filters.transacao.tipo;
    const filterCategoria = state.filters.transacao.categoria;
    const filterInicio = state.filters.transacao.dataInicio;
    const filterFim = state.filters.transacao.dataFim;
    
    const filteredTransactions = state.transactions.filter(t => {
        const matchesSearch = t.descricao.toLowerCase().includes(query) || 
                              t.categoria.toLowerCase().includes(query) ||
                              (t.valor.toString().includes(query));
        const matchesTipo = filterTipo === "Todos" || t.tipo === filterTipo;
        const matchesCategoria = filterCategoria === "Todos" || t.categoria === filterCategoria;
        
        let matchesData = true;
        if (filterInicio) matchesData = matchesData && (t.data >= filterInicio);
        if (filterFim) matchesData = matchesData && (t.data <= filterFim);
        
        return matchesSearch && matchesTipo && matchesCategoria && matchesData;
    });
    
    if (filteredTransactions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">Nenhum lançamento encontrado.</td></tr>`;
        return;
    }
    
    filteredTransactions.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    filteredTransactions.forEach(t => {
        let notaBadge = `<span class="text-muted" style="font-size:0.8rem">-</span>`;
        if (t.notaFiscalId) {
            const notaObj = state.invoices.find(n => n.id === t.notaFiscalId);
            if (notaObj) {
                notaBadge = `<span class="badge-link" onclick="openInvoiceDetails('${t.notaFiscalId}')">${notaObj.numeroNota}</span>`;
            }
        }
        
        const tipoBadge = t.tipo === "Entrada" 
            ? `<span class="badge badge-success"><i class="fa-solid fa-circle-arrow-up"></i> Entrada</span>`
            : `<span class="badge badge-danger"><i class="fa-solid fa-circle-arrow-down"></i> Saída</span>`;
            
        const statusBadge = t.status === "Pago" ? `<span class="badge badge-success">Confirmado</span>` : `<span class="badge badge-warning">Pendente</span>`;
            
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="text-muted">${formatDate(t.data)}</td>
            <td><strong>${t.descricao}</strong></td>
            <td>${tipoBadge}</td>
            <td class="font-numeric text-end ${t.tipo === 'Entrada' ? 'val-receita' : 'val-despesa'}">
                ${t.tipo === 'Entrada' ? '+' : '-'} ${formatCurrency(t.valor)}
            </td>
            <td><span class="badge badge-neutral">${t.categoria}</span></td>
            <td>${notaBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="editTransaction('${t.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteTransaction('${t.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/* --------------------------------------------------------------------------
   D. ABA OPERAÇÕES TÉCNICAS (NOVA)
   -------------------------------------------------------------------------- */
function renderEquipamentos() {
    const tbody = document.getElementById("table-equipamentos-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const query = (document.getElementById("search-equipamento") ? document.getElementById("search-equipamento").value : "").toLowerCase();
    const filterCliente = document.getElementById("filter-equipamento-cliente") ? document.getElementById("filter-equipamento-cliente").value : "Todos";
    
    // Popular dropdown de hospitais/clientes se estiver vazio
    updateEquipamentosClientesFilter();
    
    const hoje = new Date();
    const isCliente = state.currentUser && state.currentUser.papel === "cliente";
    const nomeCliente = state.currentUser ? state.currentUser.nome : "";
    
    const filteredEquips = state.equipments.filter(eq => {
        if (isCliente && eq.cliente !== nomeCliente) return false;

        const matchesSearch = eq.tag.toLowerCase().includes(query) || 
                              eq.nome.toLowerCase().includes(query) || 
                              eq.serial.toLowerCase().includes(query);
        const matchesCliente = filterCliente === "Todos" || eq.cliente === filterCliente;
        return matchesSearch && matchesCliente;
    });
    
    if (filteredEquips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Nenhum equipamento encontrado.</td></tr>`;
        return;
    }
    
    filteredEquips.forEach(eq => {
        // Encontrar todas as notas associadas a esse equipamento
        const notasEquip = state.invoices.filter(inv => inv.equipamentoId === eq.id && inv.status !== "Cancelado");
        let totalCustos = 0;
        
        notasEquip.forEach(inv => {
            const custosTrans = state.transactions
                .filter(t => t.notaFiscalId === inv.id && t.tipo === "Saída")
                .reduce((sum, t) => sum + t.valor, 0);
            const custosTS = state.timesheets
                .filter(ts => ts.notaFiscalId === inv.id)
                .reduce((sum, ts) => sum + ts.custoTotal, 0);
            totalCustos += (custosTrans + custosTS);
        });
        
        // Calcular preventiva atrasada (Ciclo configurado em eq.periodicidade ou 6 meses padrão)
        const mesesCiclo = eq.periodicidade || 6;
        const dataPreventiva = new Date(eq.ultimaPreventiva);
        const dataLimite = new Date(dataPreventiva);
        dataLimite.setMonth(dataPreventiva.getMonth() + mesesCiclo);
        
        const atrasada = hoje > dataLimite;
        let dataPreventivaHTML = formatDate(eq.ultimaPreventiva);
        
        if (atrasada) {
            const diffDias = Math.ceil((hoje - dataLimite) / (1000 * 60 * 60 * 24));
            dataPreventivaHTML = `
                <div class="d-flex flex-column gap-1">
                    <span>${formatDate(eq.ultimaPreventiva)}</span>
                    <span class="badge badge-danger" style="font-size:0.55rem; padding: 2px 4px;">⚠️ Vencida (${diffDias}d)</span>
                </div>
            `;
            if (eq.status === "Operacional") {
                eq.status = "Atenção (Preventiva Atrasada)";
            }
        }
        
        // Status class
        let statusClass = "badge-success";
        if (eq.status.includes("Atenção")) statusClass = "badge-warning";
        else if (eq.status.includes("Parado")) statusClass = "badge-danger";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${eq.tag}</strong></td>
            <td>
                <div class="font-weight-bold">${eq.nome}</div>
                <div class="text-muted" style="font-size:0.75rem">S/N: ${eq.serial}</div>
            </td>
            <td>${eq.cliente}</td>
            <td><span class="badge ${statusClass}">${eq.status}</span></td>
            <td>${dataPreventivaHTML}</td>
            <td class="font-numeric val-despesa">${formatCurrency(totalCustos)}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="abrirProntuarioEquipamento('${eq.id}')" title="Ver Prontuário Completo">
                        <i class="fa-solid fa-file-medical"></i> Laudos
                    </button>
                    ${isCliente ? '' : `
                    <button class="btn btn-outline btn-sm" onclick="editEquipamento('${eq.id}')" title="Editar Equipamento">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteEquipamento('${eq.id}')" title="Excluir Equipamento">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateEquipamentosClientesFilter() {
    const filter = document.getElementById("filter-equipamento-cliente");
    if (!filter) return;
    
    const activeVal = filter.value;
    filter.innerHTML = '<option value="Todos">Todos os Hospitais</option>';
    
    const clientesUnicos = [...new Set(state.equipments.map(e => e.cliente))];
    clientesUnicos.sort().forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.innerText = c;
        filter.appendChild(option);
    });
    
    filter.value = activeVal || "Todos";
}

window.abrirProntuarioEquipamento = function(eqId) {
    const eq = state.equipments.find(item => item.id === eqId);
    if (!eq) return;
    
    document.getElementById("prontuario-equipamento-nome").innerText = eq.nome;
    document.getElementById("prontuario-equipamento-serial").innerText = eq.serial;
    document.getElementById("prontuario-equipamento-tag").innerText = eq.tag;
    document.getElementById("prontuario-equipamento-cliente").innerText = eq.cliente;
    document.getElementById("prontuario-equipamento-preventiva").innerText = formatDate(eq.ultimaPreventiva);
    
    // Status badge no modal
    const badge = document.getElementById("prontuario-equipamento-status-badge");
    badge.innerText = eq.status;
    badge.className = "badge";
    if (eq.status.includes("Operacional")) badge.classList.add("badge-success");
    else if (eq.status.includes("Atenção")) badge.classList.add("badge-warning");
    else badge.classList.add("badge-danger");
    
    // Encontrar todas as intervenções/Notas
    const tbody = document.getElementById("table-prontuario-historico-body");
    tbody.innerHTML = "";
    
    const notasEquip = state.invoices.filter(inv => inv.equipamentoId === eqId && inv.status !== "Cancelado");
    let custoTotalAcumulado = 0;
    
    if (notasEquip.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Nenhuma ordem de serviço ou preventiva registrada para este equipamento.</td></tr>`;
    } else {
        notasEquip.sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao));
        notasEquip.forEach(inv => {
            // Custos de Peças e Viagem
            const despesasPecasViagem = state.transactions
                .filter(t => t.notaFiscalId === inv.id && t.tipo === "Saída" && (t.categoria === "Peças" || t.categoria === "Deslocamento"))
                .reduce((sum, t) => sum + t.valor, 0);
            
            // Custos de Timesheet
            const despesasMaoObra = state.timesheets
                .filter(ts => ts.notaFiscalId === inv.id)
                .reduce((sum, ts) => sum + ts.custoTotal, 0);
                
            const custoTotalOS = despesasPecasViagem + despesasMaoObra;
            custoTotalAcumulado += custoTotalOS;
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${inv.numeroNota}</strong></td>
                <td class="text-muted" style="font-size:0.75rem">${formatDate(inv.dataEmissao)}</td>
                <td style="font-size:0.775rem">${inv.descricao || "Manutenção preventiva padrão."}</td>
                <td class="font-numeric val-receita">${formatCurrency(inv.valorTotal)}</td>
                <td class="font-numeric val-despesa">${formatCurrency(despesasPecasViagem)}</td>
                <td class="font-numeric val-despesa">${formatCurrency(despesasMaoObra)}</td>
                <td class="font-numeric val-despesa font-weight-bold">${formatCurrency(custoTotalOS)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    document.getElementById("prontuario-equipamento-custo-total").innerText = formatCurrency(custoTotalAcumulado);
    
    // Desgaste de Tubo de Raios-X (Melhoria 4)
    const desgasteBox = document.getElementById("prontuario-desgaste-tubo-box");
    const desgasteBar = document.getElementById("prontuario-desgaste-tubo-bar");
    const desgasteLabel = document.getElementById("prontuario-desgaste-tubo-label");
    
    if (eq.nome.includes("Tomógrafo") || eq.nome.includes("Raio-X")) {
        desgasteBox.style.display = "block";
        
        // Simulação baseada no número de OS/intervenções acumuladas (ex: 22% por OS, limite 100%)
        const totalOS = notasEquip.length;
        const desgastePerc = Math.min(100, Math.max(15, totalOS * 22));
        
        desgasteBar.style.width = `${desgastePerc}%`;
        
        if (desgastePerc < 50) {
            desgasteBar.style.backgroundColor = "var(--color-success)";
            desgasteLabel.innerText = `${desgastePerc}% - Excelente (Vida útil estável)`;
            desgasteLabel.className = "desgaste-status-label text-success";
        } else if (desgastePerc < 80) {
            desgasteBar.style.backgroundColor = "var(--color-warning)";
            desgasteLabel.innerText = `${desgastePerc}% - Atenção (Planejar manutenção corretiva preventiva)`;
            desgasteLabel.className = "desgaste-status-label text-warning";
        } else {
            desgasteBar.style.backgroundColor = "var(--color-danger)";
            desgasteLabel.innerText = `${desgastePerc}% - Crítico! Recomenda-se substituição do tubo imediatamente.`;
            desgasteLabel.className = "desgaste-status-label text-danger";
        }
    } else {
        desgasteBox.style.display = "none";
    }
    
    openModal("modal-prontuario");
};

// CRUD Equipamentos Lógica
window.editEquipamento = function(id) {
    const eq = state.equipments.find(e => e.id === id);
    if (!eq) return;
    
    document.getElementById("modal-equipamento-title").innerText = "Editar Equipamento";
    document.getElementById("form-equipamento-id").value = eq.id;
    document.getElementById("eq-form-tag").value = eq.tag;
    document.getElementById("eq-form-serial").value = eq.serial;
    document.getElementById("eq-form-nome").value = eq.nome;
    document.getElementById("eq-form-cliente").value = eq.cliente;
    document.getElementById("eq-form-status").value = eq.status.includes("Atenção") ? "Atenção" : eq.status.includes("Parado") ? "Parado" : "Operacional";
    document.getElementById("eq-form-preventiva").value = eq.ultimaPreventiva;
    document.getElementById("eq-form-periodicidade").value = eq.periodicidade || 6;
    
    openModal("modal-equipamento");
};

window.deleteEquipamento = function(id) {
    const eq = state.equipments.find(e => e.id === id);
    if (!eq) return;
    
    if (confirm(`Deseja realmente remover o equipamento ${eq.tag} (${eq.nome}) do parque instalado?`)) {
        state.equipments = state.equipments.filter(e => e.id !== id);
        addAuditLog("Equipamento Excluído", `Remoção do equipamento ${eq.tag} do hospital ${eq.cliente}`);
        saveStateToLocalStorage();
        renderApp();
    }
};

function renderCalibradores() {
    const tbody = document.getElementById("table-calibradores-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const hoje = new Date();
    
    state.calibrators.forEach(c => {
        const dataProxima = new Date(c.proximaCalibracao);
        const diffTempo = dataProxima - hoje;
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
        
        let statusText = "Laudo Válido";
        let statusClass = "badge-success";
        
        if (diffDias <= 0) {
            statusText = "🔴 BLOQUEADO PARA USO";
            statusClass = "badge-danger-glow";
        } else if (diffDias < 30) {
            statusText = "Calibração Próxima";
            statusClass = "badge-warning-glow";
        }
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${c.nome}</strong></td>
            <td class="text-muted">${c.serial}</td>
            <td>${formatDate(c.ultimaCalibracao)}</td>
            <td>${formatDate(c.proximaCalibracao)}</td>
            <td class="font-numeric ${diffDias <= 0 ? 'text-danger font-weight-bold' : diffDias < 30 ? 'text-warning' : 'text-muted'}">${diffDias} dias</td>
            <td><span class="badge ${statusClass}" style="font-size:0.7rem; padding:4px 8px;">${statusText}</span></td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="visualizarCertificadoRBC('${c.id}')" title="Ver Certificado RBC">
                        <i class="fa-solid fa-medal text-secondary"></i> Certificado
                    </button>
                    ${state.currentUser && state.currentUser.papel === "cliente" ? "" : `
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteCalibrador('${c.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.visualizarCertificadoRBC = function(id) {
    const cal = state.calibrators.find(c => c.id === id);
    if (!cal) return;
    
    document.getElementById("cert-instrumento").innerText = cal.nome;
    document.getElementById("cert-serial").innerText = cal.serial;
    
    // Fallbacks para campos novos em calibradores antigos
    document.getElementById("cert-fabricante").innerText = cal.fabricante || "Fluke Biomedical / BIO-TEK";
    
    document.getElementById("cert-ultima").innerText = formatDate(cal.ultimaCalibracao);
    document.getElementById("cert-validade").innerText = formatDate(cal.proximaCalibracao);
    
    document.getElementById("cert-engenheiro").innerText = cal.engenheiro || "Eng. Felipe de Souza Monte";
    document.getElementById("cert-crea").innerText = cal.crea || "507189332-A";
    
    // Gerar um número de laudo aleatório mas persistente baseado no serial
    const hashNum = cal.serial.replace(/[^0-9]/g, "") || "488192";
    document.getElementById("cert-numero").innerText = `L-${hashNum}/2026`;
    
    openModal("modal-certificado");
};

window.deleteCalibrador = function(id) {
    const cal = state.calibrators.find(c => c.id === id);
    if (!cal) return;
    
    if (confirm(`Excluir o calibrador biométrico ${cal.nome} (${cal.serial}) da base de ferramentas?`)) {
        state.calibrators = state.calibrators.filter(c => c.id !== id);
        addAuditLog("Calibrador Excluído", `Remoção do calibrador ${cal.nome}`);
        saveStateToLocalStorage();
        renderApp();
    }
};

function renderCotacoes() {
    const tbody = document.getElementById("table-cotacoes-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    const isCliente = state.currentUser && state.currentUser.papel === "cliente";
    
    state.quotations.forEach(q => {
        if (isCliente) {
            // Verifica se o equipamento da cotação pertence ao hospital do cliente
            const eqAssociado = state.equipments.find(e => q.equipamento && q.equipamento.includes(e.nome));
            if (!eqAssociado || eqAssociado.cliente !== state.currentUser.nome) {
                return; // Esconde a cotação se não for do hospital do cliente
            }
        }
        
        let actionBtn = "";
        let statusClass = "badge-neutral";
        
        if (q.status === "Pendente") {
            statusClass = "badge-warning";
            // Admin ou Financeiro podem aprovar cotação
            if (state.currentUser.papel !== "tecnico") {
                actionBtn = `
                    <button class="btn btn-secondary btn-sm" onclick="aprovarCotacao('${q.id}')">
                        <i class="fa-solid fa-thumbs-up"></i> Aprovar Peça
                    </button>
                `;
            }
        } else if (q.status === "Aprovado") {
            statusClass = "badge-success";
        }
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${q.peca}</strong></td>
            <td>${q.equipamento}</td>
            <td>${q.solicitante}</td>
            <td class="text-muted">${q.fornecedor}</td>
            <td class="font-numeric">${formatCurrency(q.valor)}</td>
            <td><span class="badge ${statusClass}">${q.status}</span></td>
            <td>
                <div class="d-flex gap-2">
                    ${actionBtn}
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteCotacao('${q.id}')" title="Excluir Cotação">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.aprovarCotacao = function(id) {
    const q = state.quotations.find(cot => cot.id === id);
    if (!q) return;
    
    if (confirm(`Aprovar a compra da peça "${q.peca}" no valor de ${formatCurrency(q.valor)}?`)) {
        q.status = "Aprovado";
        
        // Gera automaticamente um lançamento de despesa no Fluxo de Caixa (Saída)
        const novaDespesa = {
            id: generateUUID(),
            data: new Date().toISOString().slice(0,10),
            descricao: `Aprovação Compra Peça: ${q.peca}`,
            tipo: "Saída",
            valor: q.valor,
            categoria: "Peças",
            status: "Pendente", // Fica pendente de pagamento
            notaFiscalId: "" // avulsa até vincularem
        };
        state.transactions.push(novaDespesa);
        
        addAuditLog("Aprovação de Peça", `Compra aprovada: ${q.peca} - Valor: ${formatCurrency(q.valor)}`);
        saveStateToLocalStorage();
        renderApp();
        uiAlert(`Sucesso! A cotação foi aprovada e um débito de ${formatCurrency(q.valor)} sob a categoria Peças foi criado no Fluxo de Caixa.`);
    }
};

window.deleteCotacao = function(id) {
    const q = state.quotations.find(cot => cot.id === id);
    if (!q) return;
    
    if (confirm(`Excluir a requisição de cotação da peça "${q.peca}"?`)) {
        state.quotations = state.quotations.filter(cot => cot.id !== id);
        addAuditLog("Cotação Excluída", `Remoção da cotação de ${q.peca}`);
        saveStateToLocalStorage();
        renderApp();
    }
};

function renderChamados() {
    const tbody = document.getElementById("table-chamados-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const hoje = new Date();
    
    const isCliente = state.currentUser && state.currentUser.papel === "cliente";
    
    state.tickets.forEach(tk => {
        if (isCliente && tk.hospital !== state.currentUser.nome) return;
        
        let statusClass = "badge-info";
        if (tk.status === "Pendente") statusClass = "badge-warning";
        else if (tk.status === "Aguardando Peça") statusClass = "badge-warning";
        else if (tk.status === "Encerrado") statusClass = "badge-success";
        
        // Calcular tempo restante do SLA regressivo
        const dataAbertura = new Date(tk.dataAbertura);
        const dataLimiteSLA = new Date(dataAbertura);
        dataLimiteSLA.setHours(dataAbertura.getHours() + tk.slaHoras);
        
        let tempoRestanteHTML = "";
        let actionBtn = "";
        
        if (tk.status === "Encerrado") {
            tempoRestanteHTML = `<span class="badge badge-success-glow"><i class="fa-solid fa-check-double"></i> OS Concluída</span>`;
            actionBtn = `
                <button class="btn btn-secondary btn-sm" onclick="visualizarLaudoRAT('${tk.id}')" title="Visualizar RAT Completo">
                    <i class="fa-solid fa-file-invoice"></i> Laudo RAT
                </button>
            `;
        } else {
            const diffTime = dataLimiteSLA - hoje;
            const totalSLA = tk.slaHoras * 60 * 60 * 1000;
            const tempoDecorrido = totalSLA - diffTime;
            const progressoPerc = Math.max(0, Math.min(100, (tempoDecorrido / totalSLA) * 100));
            
            if (diffTime <= 0) {
                tempoRestanteHTML = `
                    <div class="d-flex flex-column gap-1">
                        <span class="text-danger font-weight-bold" style="font-size:0.75rem">⚠️ SLA Estourado</span>
                        <div class="progress-bar-container" style="margin-top:0; width: 100px; height: 6px;">
                            <div class="progress-bar-fill" style="width: 100%; background:var(--color-danger)"></div>
                        </div>
                    </div>
                `;
            } else {
                const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                const diffMins = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                
                const barColor = progressoPerc > 80 ? "var(--color-danger)" : progressoPerc > 50 ? "var(--color-warning)" : "var(--color-success)";
                
                tempoRestanteHTML = `
                    <div class="d-flex flex-column gap-1">
                        <span class="text-muted" style="font-size:0.75rem">${diffHours}h ${diffMins}m restantes</span>
                        <div class="progress-bar-container" style="margin-top:0; width: 100px; height: 6px;">
                            <div class="progress-bar-fill" style="width: ${progressoPerc.toFixed(0)}%; background:${barColor}"></div>
                        </div>
                    </div>
                `;
            }
            
            if (isCliente) {
                // Cliente apenas visualiza o status e pode ver o RAT se encerrado
                if (tk.status === "Encerrado") {
                    actionBtn = `
                        <button class="btn btn-secondary btn-sm" onclick="visualizarLaudoRAT('${tk.id}')" title="Visualizar RAT Completo">
                            <i class="fa-solid fa-file-invoice"></i> Laudo RAT
                        </button>
                    `;
                } else {
                    actionBtn = `<span class="text-muted" style="font-size:0.8rem">Aguardando</span>`;
                }
            } else {
                if (tk.status === "Pendente") {
                    actionBtn = `
                        <button class="btn btn-success btn-sm" onclick="iniciarAtendimentoChamado('${tk.id}')" title="Direcionar e Iniciar Atendimento Técnico">
                            <i class="fa-solid fa-play"></i> Direcionar OS
                        </button>
                    `;
                } else if (tk.status !== "Encerrado") {
                    actionBtn = `
                        <button class="btn btn-primary btn-sm" onclick="abrirExecucaoChamado('${tk.id}')" style="background:#581c87; border-color:#581c87;" title="Executar Manutenção e Assinar RAT">
                            <i class="fa-solid fa-clipboard-check"></i> Executar OS
                        </button>
                    `;
                }
            }
        }
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${tk.numero}</strong></td>
            <td>${tk.hospital}</td>
            <td>${tk.equipamento}</td>
            <td><span class="badge badge-neutral">${tk.tipo}</span></td>
            <td>${tk.slaHoras} horas</td>
            <td>${tempoRestanteHTML}</td>
            <td><span class="badge ${statusClass}">${tk.status}</span></td>
            <td>
                <div class="d-flex gap-2">
                    ${actionBtn}
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteChamado('${tk.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.iniciarAtendimentoChamado = function(id) {
    const tk = state.tickets.find(t => t.id === id);
    if (!tk) return;
    
    // Admin seleciona/digita o nome do técnico a ser direcionado
    const tecnico = prompt(`Direcionar Chamado/OS ${tk.numero}\nDigite o nome do técnico responsável:`, "Técnico de Campo");
    
    if (tecnico === null) return; // Cancelou o direcionamento
    
    tk.status = "Em Atendimento";
    tk.responsavelNome = tecnico.trim() || "Técnico Não Identificado";
    tk.dataInicioAtendimento = new Date().toISOString();
    
    addAuditLog("OS Direcionada/Iniciada", `OS ${tk.numero} direcionada para o técnico ${tk.responsavelNome}`);
    saveStateToLocalStorage();
    renderApp();
    uiAlert(`Atendimento da OS ${tk.numero} direcionado para ${tk.responsavelNome} com sucesso!`);
};

window.abrirExecucaoChamado = function(id) {
    const tk = state.tickets.find(t => t.id === id);
    if (!tk) return;
    
    document.getElementById("rat-exec-id").value = tk.id;
    document.getElementById("rat-info-os").innerText = tk.numero;
    document.getElementById("rat-info-equipamento").innerText = tk.equipamento;
    document.getElementById("rat-info-hospital").innerText = tk.hospital;
    document.getElementById("rat-info-inicio").innerText = formatDateTime(tk.dataInicioAtendimento || tk.dataAbertura);
    
    // Limpar formulário de execução
    document.getElementById("rat-exec-servico").value = "";
    document.getElementById("rat-exec-resp-nome").value = "";
    document.getElementById("rat-exec-resp-cargo").value = "";
    
    // Limpar previews de fotos
    const preview = document.getElementById("rat-photos-preview");
    preview.innerHTML = `<span class="text-muted" style="font-size:0.75rem;">Nenhuma foto selecionada. Use o simulador para testes rápidos!</span>`;
    preview.dataset.photosJson = "[]";
    
    // Inicializar o canvas de desenho de assinatura
    setTimeout(() => {
        setupRatSignatureCanvas();
    }, 200);
    
    openModal("modal-executar-chamado");
};

function eqMatch(str1, str2) {
    const s1 = str1.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const s2 = str2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s1.includes(s2) || s2.includes(s1);
}

window.deleteChamado = function(id) {
    const tk = state.tickets.find(t => t.id === id);
    if (!tk) return;
    
    if (confirm(`Remover chamado técnico ${tk.numero} da base?`)) {
        state.tickets = state.tickets.filter(t => t.id !== id);
        addAuditLog("Chamado Excluído", `Remoção do chamado ${tk.numero}`);
        saveStateToLocalStorage();
        renderApp();
    }
};

/* --------------------------------------------------------------------------
   E. ABA BI & RELATÓRIOS CONTÁBEIS (NOVA)
   -------------------------------------------------------------------------- */
function renderRelatorios() {
    // 1. Calcular Ponto de Equilíbrio
    // Custos fixos = Salários (sem nota) + Contabilidade/Outros (sem nota)
    const custosFixosGerais = state.transactions
        .filter(t => t.tipo === "Saída" && t.status === "Pago" && !t.notaFiscalId && (t.categoria === "Salários" || t.categoria === "Outros"))
        .reduce((sum, t) => sum + t.valor, 0);

    // Rateio geral (Melhoria 14)
    // Faturamento bruto atual (Notas Recebidas)
    const faturamentoBruto = state.invoices
        .filter(inv => inv.status === "Recebido")
        .reduce((sum, inv) => sum + inv.valorTotal, 0);

    const taxaRateio = state.rateioConfig / 100;
    const custoFixoRateado = faturamentoBruto * taxaRateio;
    const totalCustosFixos = custosFixosGerais + custoFixoRateado;
    
    // Margem de contribuição média (lucro antes dos custos fixos / faturamento)
    // Para simplificar, usamos a margem operacional média da empresa
    const margemMedia = 0.40; // 40% de margem operacional padrão
    const pontoEquilibrio = totalCustosFixos / margemMedia;
    
    document.getElementById("bi-break-even-value").innerText = formatCurrency(pontoEquilibrio);
    
    // Barra de progresso do Break-Even
    const percProgressoMeta = faturamentoBruto > 0 ? (faturamentoBruto / pontoEquilibrio) * 100 : 0;
    document.getElementById("bi-break-even-bar").style.width = `${Math.min(100, percProgressoMeta)}%`;
    document.getElementById("bi-break-even-label").innerText = `Faturado: ${formatCurrency(faturamentoBruto)} (${percProgressoMeta.toFixed(0)}% da Meta)`;

    // 2. Projeção de Caixa (30 dias)
    const saldoAtual = state.transactions
        .filter(t => t.status === "Pago")
        .reduce((sum, t) => sum + (t.tipo === "Entrada" ? t.valor : -t.valor), 0) + 
        state.invoices
        .filter(inv => inv.status === "Recebido")
        .reduce((sum, inv) => sum + inv.valorTotal, 0);

    // Contas a receber (Notas pendentes)
    const aReceber = state.invoices
        .filter(inv => inv.status === "Pendente")
        .reduce((sum, inv) => sum + inv.valorTotal, 0);

    // Contas a pagar (Transações pendentes)
    const aPagar = state.transactions
        .filter(t => t.status === "Pendente" && t.tipo === "Saída")
        .reduce((sum, t) => sum + t.valor, 0);

    const saldoProjetado = saldoAtual + aReceber - aPagar;
    document.getElementById("bi-projection-value").innerText = formatCurrency(saldoProjetado);
    
    const projStatus = document.getElementById("bi-projection-status");
    if (saldoProjetado >= 0) {
        projStatus.className = "trend trend-up";
        projStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Caixa saudável`;
    } else {
        projStatus.className = "trend trend-down";
        projStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Risco de caixa`;
    }

    // 3. Renderizar DRE (Melhoria 1)
    renderDRETable(faturamentoBruto, custoFixoRateado, custosFixosGerais);

    // 4. Renderizar Curva ABC (Melhoria 3)
    renderCurvaABC();

    // 5. Renderizar Gráfico de Projeção (Melhoria 4)
    renderProjectionChart(saldoAtual, aReceber, aPagar);
}

function renderDRETable(faturamentoBruto, custoFixoRateado, custosFixosGerais) {
    const tbody = document.getElementById("dre-table-body");
    tbody.innerHTML = "";
    
    // Impostos Totais Retidos nas Notas Recebidas
    const totalImpostos = state.transactions
        .filter(t => t.tipo === "Saída" && t.categoria === "Impostos" && t.notaFiscalId)
        .reduce((sum, t) => sum + t.valor, 0);

    const receitaLiquida = faturamentoBruto - totalImpostos - custoFixoRateado;

    // Custos diretos (Peças, Deslocamentos de campo, Serviços diretos e Mão de Obra Timesheet das Notas recebidas)
    const custosDiretosTrans = state.transactions
        .filter(t => t.tipo === "Saída" && t.notaFiscalId && t.categoria !== "Impostos")
        .reduce((sum, t) => sum + t.valor, 0);

    const custosDiretosTS = state.timesheets.reduce((sum, ts) => sum + ts.custoTotal, 0);
    const custoServicoPrestado = custosDiretosTrans + custosDiretosTS;
    
    const margemBruta = receitaLiquida - custoServicoPrestado;
    const resultadoExercicio = margemBruta - custosFixosGerais;
    
    const rows = [
        { desc: "(=) RECEITA BRUTA DE SERVIÇOS", valor: faturamentoBruto, classe: "dre-total" },
        { desc: "(-) Impostos s/ Faturamento (Retenções)", valor: totalImpostos, classe: "dre-sub val-despesa" },
        { desc: "(-) Rateio de Custos Fixo Corporativo", valor: custoFixoRateado, classe: "dre-sub val-despesa" },
        { desc: "(=) RECEITA LÍQUIDA DE SERVIÇOS", valor: receitaLiquida, classe: "dre-total" },
        { desc: "(-) Custos dos Serviços Prestados (CSP)", valor: custoServicoPrestado, classe: "dre-sub val-despesa" },
        { desc: "    • Peças de Reposição & Materiais", valor: state.transactions.filter(t => t.notaFiscalId && t.categoria === "Peças").reduce((sum, t) => sum + t.valor, 0), classNested: true },
        { desc: "    • Deslocamento & Estadias", valor: state.transactions.filter(t => t.notaFiscalId && t.categoria === "Deslocamento").reduce((sum, t) => sum + t.valor, 0), classNested: true },
        { desc: "    • Mão de Obra Direta (Timesheet)", valor: custosDiretosTS, classNested: true },
        { desc: "(=) MARGEM BRUTA DE SERVIÇOS", valor: margemBruta, classe: "dre-total" },
        { desc: "(-) Despesas Administrativas / Fixas", valor: custosFixosGerais, classe: "dre-sub val-despesa" },
        { desc: "    • Honorários de Contabilidade", valor: state.transactions.filter(t => !t.notaFiscalId && t.descricao && t.descricao.toLowerCase().includes("contabilidade")).reduce((sum, t) => sum + t.valor, 0), classNested: true },
        { desc: "    • Retiradas de Sócios (Salários)", valor: state.transactions.filter(t => !t.notaFiscalId && t.categoria === "Salários").reduce((sum, t) => sum + t.valor, 0), classNested: true },
        { desc: "(=) RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO)", valor: resultadoExercicio, classe: "dre-net-profit" }
    ];
    
    rows.forEach(r => {
        const tr = document.createElement("tr");
        if (r.classe) tr.className = r.classe;
        
        let labelHTML = r.desc;
        if (r.classNested) {
            labelHTML = `<td style="padding-left:60px; font-size:0.775rem; color:var(--color-text-muted)">${r.desc}</td>`;
        } else {
            labelHTML = `<td><strong>${r.desc}</strong></td>`;
        }
        
        const valorColorClass = r.classe && r.classe.includes("net-profit")
            ? (r.valor >= 0 ? "val-receita" : "val-despesa")
            : (r.classe && r.classe.includes("total") ? "" : (r.classe && r.classe.includes("despesa") ? "val-despesa" : ""));
            
        tr.innerHTML = `
            ${labelHTML}
            <td class="font-numeric text-right ${valorColorClass}" style="text-align:right">${formatCurrency(r.valor)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCurvaABC() {
    const tbody = document.getElementById("table-abc-clientes-body");
    tbody.innerHTML = "";
    
    const faturamentosClientes = {};
    const custosClientes = {};
    
    state.invoices.forEach(inv => {
        if (inv.status !== "Recebido") return;
        
        if (!faturamentosClientes[inv.cliente]) {
            faturamentosClientes[inv.cliente] = 0;
            custosClientes[inv.cliente] = 0;
        }
        
        faturamentosClientes[inv.cliente] += inv.valorTotal;
        
        // Somar custos vinculados
        const custosTrans = state.transactions
            .filter(t => t.notaFiscalId === inv.id && t.tipo === "Saída")
            .reduce((sum, t) => sum + t.valor, 0);
        const custosTS = state.timesheets
            .filter(ts => ts.notaFiscalId === inv.id)
            .reduce((sum, ts) => sum + ts.custoTotal, 0);
            
        custosClientes[inv.cliente] += (custosTrans + custosTS);
    });
    
    const rankingClientes = Object.keys(faturamentosClientes).map(cli => {
        const fat = faturamentosClientes[cli];
        const custo = custosClientes[cli];
        const lucro = fat - custo;
        const margem = fat > 0 ? (lucro / fat) * 100 : 0;
        return { cliente: cli, faturamento: fat, margem };
    });
    
    // Ordenar curva ABC pelo faturamento decrescente
    rankingClientes.sort((a, b) => b.faturamento - a.faturamento);
    
    if (rankingClientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Sem faturamento registrado.</td></tr>`;
        return;
    }
    
    rankingClientes.forEach((item, index) => {
        let letraCurva = "A";
        let curvaClass = "badge-success";
        if (index === 1) {
            letraCurva = "B";
            curvaClass = "badge-info";
        } else if (index > 1) {
            letraCurva = "C";
            curvaClass = "badge-neutral";
        }
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <span class="badge ${curvaClass}" style="font-size:0.6rem; padding: 2px 5px; margin-right:4px;">${letraCurva}</span>
                <strong>${item.cliente}</strong>
            </td>
            <td class="font-numeric">${formatCurrency(item.faturamento)}</td>
            <td class="font-numeric val-receita">${item.margem.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

function renderProjectionChart(saldoAtual, aReceber, aPagar) {
    const dias = Array.from({ length: 30 }, (_, i) => i + 1);
    const saldos = [];
    
    let saldoCursor = saldoAtual;
    const valorDiarioReceber = aReceber / 10; // Distribuir recebimento
    const valorDiarioPagar = aPagar / 15; // Distribuir pagamentos
    
    for (let d = 1; d <= 30; d++) {
        // Simular pagamentos nos dias 5, 10 e 20
        if (d === 5 || d === 10 || d === 20) {
            saldoCursor -= (aPagar / 3);
        }
        // Simular faturamento entrando nos dias 10 e 25
        if (d === 10 || d === 25) {
            saldoCursor += (aReceber / 2);
        }
        saldos.push(saldoCursor);
    }
    
    if (state.charts.projection) {
        try { state.charts.projection.destroy(); } catch(e) {}
    }
    
    const ctx = document.getElementById("chart-projection-line").getContext("2d");
    try {
        state.charts.projection = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Saldo Projetado (R$)',
                    data: saldos,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } },
                    y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } catch (e) {
        console.error("Falha ao inicializar o gráfico de projeção. CDN offline ou bloqueada.", e);
        ctx.canvas.parentNode.innerHTML = `<div class="text-center text-muted py-4" style="font-size:0.8rem;"><i class="fa-solid fa-triangle-exclamation text-warning"></i> Gráfico indisponível (CDN offline ou bloqueada).</div>`;
    }
}

// ==========================================================================
// GAVETA DE DETALHES DA NOTA (TIMESHEET, COBRANÇAS, ASSINATURA)
// ==========================================================================
function updateInvoiceDetailsModal(invoiceId) {
    const inv = state.invoices.find(n => n.id === invoiceId);
    if (!inv) return;
    
    // Dados de Cabeçalho da Nota
    document.getElementById("detalhe-nota-numero").innerText = `Centro de Custos: ${inv.numeroNota}`;
    document.getElementById("detalhe-nota-cliente").innerText = inv.cliente;
    document.getElementById("detalhe-nota-descricao").innerText = inv.descricao || "Nenhuma descrição fornecida.";
    document.getElementById("detalhe-nota-data").innerText = formatDate(inv.dataEmissao);
    
    // Setar badge de status
    const badge = document.getElementById("detalhe-nota-status-badge");
    badge.innerText = inv.status;
    badge.className = "badge";
    if (inv.status === "Recebido") badge.classList.add("badge-success");
    else if (inv.status === "Pendente") badge.classList.add("badge-warning");
    else if (inv.status === "Cancelado") badge.classList.add("badge-danger");
    
    // 1. Filtrar despesas vinculadas a esta nota
    const custosVinculados = state.transactions.filter(t => t.notaFiscalId === invoiceId);
    const totalCustosTrans = custosVinculados.filter(t => t.tipo === "Saída").reduce((sum, t) => sum + t.valor, 0);
    
    // Custos do Timesheet (Mão de Obra)
    const custosTS = state.timesheets.filter(ts => ts.notaFiscalId === invoiceId);
    const totalCustosTS = custosTS.reduce((sum, ts) => sum + ts.custoTotal, 0);
        
    const totalCustos = totalCustosTrans + totalCustosTS;
    const totalLucro = inv.valorTotal - totalCustos;
    const percCusto = inv.valorTotal > 0 ? (totalCustos / inv.valorTotal) * 100 : 0;
    const percLucro = inv.valorTotal > 0 ? (totalLucro / inv.valorTotal) * 100 : 0;
    
    // Atualizar os gauges financeiros no modal
    document.getElementById("detalhe-nota-valor-faturado").innerText = formatCurrency(inv.valorTotal);
    document.getElementById("detalhe-nota-valor-custos").innerText = formatCurrency(totalCustos);
    
    const custoPercElement = document.getElementById("detalhe-nota-custo-perc");
    custoPercElement.innerText = `${percCusto.toFixed(1)}% do faturamento`;
    
    document.getElementById("detalhe-nota-lucro-liquido").innerText = formatCurrency(totalLucro);
    
    const margemPercElement = document.getElementById("detalhe-nota-margem-perc");
    margemPercElement.innerText = `${percLucro.toFixed(1)}%`;
    
    if (percLucro >= 35) margemPercElement.className = "percentage text-success font-weight-bold";
    else if (percLucro >= 20) margemPercElement.className = "percentage text-info font-weight-bold";
    else if (percLucro > 0) margemPercElement.className = "percentage text-warning font-weight-bold";
    else margemPercElement.className = "percentage text-danger font-weight-bold";
    
    // 2. Preencher tabela de despesas detalhadas
    const tableBody = document.getElementById("table-detalhes-custos-body");
    tableBody.innerHTML = "";
    
    if (custosVinculados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma despesa ou custo vinculado.</td></tr>`;
    } else {
        custosVinculados.sort((a, b) => new Date(b.data) - new Date(a.data));
        custosVinculados.forEach(c => {
            const statusDespesa = c.status === "Pago" ? `<span class="badge badge-success">Confirmado</span>` : `<span class="badge badge-warning">Pendente</span>`;
            
            // Exibir garantia se for peça (Melhoria 10)
            let garantiaText = "-";
            if (c.categoria === "Peças" && c.garantiaMeses) {
                garantiaText = `<span class="badge badge-success" style="font-size:0.65rem">${c.garantiaMeses} Meses</span>`;
            }
            
            let acoesHTML = c.isImpostoAuto 
                ? `<span class="badge badge-purple" style="font-size:0.65rem">Imposto Automático</span>`
                : `<button class="btn btn-outline btn-sm text-danger" onclick="unlinkTransaction('${c.id}', '${invoiceId}')"><i class="fa-solid fa-link-slash"></i></button>`;
                
            let iconCat = "";
            if (c.categoria === "Deslocamento") iconCat = `<i class="fa-solid fa-car-side" style="margin-right:4px; color: var(--color-primary);"></i>`;
                
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="text-muted">${formatDate(c.data)}</td>
                <td><strong>${c.descricao}</strong></td>
                <td class="font-numeric val-despesa">- ${formatCurrency(c.valor)}</td>
                <td><span class="badge badge-neutral">${iconCat}${c.categoria}</span></td>
                <td>${garantiaText}</td>
                <td>${statusDespesa}</td>
                <td>${acoesHTML}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 3. Preencher tabela de Timesheet (Melhoria 5)
    const tsBody = document.getElementById("table-timesheet-body");
    tsBody.innerHTML = "";
    
    if (custosTS.length === 0) {
        tsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-2" style="font-size:0.75rem">Nenhuma hora técnica lançada para esta nota.</td></tr>`;
    } else {
        custosTS.forEach(ts => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${ts.tecnico}</strong></td>
                <td class="font-numeric">${ts.horas} horas</td>
                <td class="font-numeric col-hide-tecnico">${formatCurrency(ts.valorHora)}/h</td>
                <td class="font-numeric val-despesa col-hide-tecnico">${formatCurrency(ts.custoTotal)}</td>
                <td class="col-hide-tecnico">
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteTimesheet('${ts.id}', '${invoiceId}')" style="padding: 2px 6px;">
                        <i class="fa-solid fa-trash-can" style="font-size:0.7rem"></i>
                    </button>
                </td>
            `;
            tsBody.appendChild(row);
        });
    }

    // 4. Carregar assinaturas RAT se existirem (Melhoria 8)
    carregarAssinaturaRAT(invoiceId);

    // Sincronizar: Ocultar controles de laudo RAT e checklist técnico se a OS do equipamento não estiver encerrada
    const eq = state.equipments.find(e => e.id === inv.equipamentoId);
    const chamadoAberto = state.tickets.find(t => 
        (t.equipamento === (eq ? eq.nome : "") || t.hospital === inv.cliente) && 
        t.status !== "Encerrado"
    );
    
    const btnImprimirRAT = document.getElementById("btn-imprimir-rat");
    const checklistBox = document.getElementById("checklist-tecnico-box");
    const signatureRATBox = document.getElementById("signature-pad-container");
    
    if (chamadoAberto) {
        if (btnImprimirRAT) btnImprimirRAT.style.display = "none";
        if (checklistBox) checklistBox.style.display = "none";
        if (signatureRATBox) signatureRATBox.style.display = "none";
    } else {
        if (btnImprimirRAT) btnImprimirRAT.style.display = "inline-block";
        if (checklistBox) checklistBox.style.display = "block";
        if (signatureRATBox) signatureRATBox.style.display = "block";
    }

    // 5. Régua de Cobrança Preventiva (Melhoria 13)
    renderReguaCobranca(inv);
    
    // 6. Checklist Técnico Dinâmico por Equipamento (Melhoria 2)
    renderChecklistTecnico(inv);
    
    // 7. Botão do PDF Anexo
    const btnPdf = document.getElementById("btn-ver-pdf-nota");
    if (btnPdf) {
        if (inv.arquivoUrl) {
            btnPdf.href = inv.arquivoUrl;
            btnPdf.style.display = "inline-block";
        } else {
            btnPdf.style.display = "none";
        }
    }
}

// Régua de cobrança preventiva simulada (Melhoria 13)
function renderReguaCobranca(inv) {
    const list = document.getElementById("billing-reminders-list");
    list.innerHTML = "";
    
    if (inv.status === "Recebido") {
        list.innerHTML = `<li><i class="fa-solid fa-circle-check text-success"></i> <strong>Nota Paga</strong>: Régua finalizada.</li>`;
        return;
    }
    
    const dataEmissao = new Date(inv.dataEmissao);
    const hoje = new Date();
    
    const d5Antes = new Date(dataEmissao); d5Antes.setDate(dataEmissao.getDate() - 5);
    const dNoVencimento = dataEmissao;
    const d3Pos = new Date(dataEmissao); d3Pos.setDate(dataEmissao.getDate() + 3);
    
    const rems = [
        { desc: "Lembrete Preventivo (5 dias antes)", data: d5Antes, status: d5Antes <= hoje ? "Enviado" : "Agendado" },
        { desc: "Fatura de Serviço (Dia do Vencimento)", data: dNoVencimento, status: dNoVencimento <= hoje ? "Enviado" : "Agendado" },
        { desc: "Aviso de Cobrança e Atraso (3 dias depois)", data: d3Pos, status: d3Pos <= hoje ? "Enviado" : "Agendado" }
    ];
    
    rems.forEach(r => {
        const li = document.createElement("li");
        const icon = r.status === "Enviado" 
            ? `<i class="fa-solid fa-circle-check text-success"></i>` 
            : `<i class="fa-solid fa-clock text-warning"></i>`;
            
        li.innerHTML = `${icon} <strong>${r.desc}</strong> - Status: <span class="badge ${r.status === 'Enviado' ? 'badge-success' : 'badge-neutral'}" style="font-size:0.55rem; padding: 2px 4px">${r.status}</span>`;
        list.appendChild(li);
    });

    // Multas e Juros Moratórios Automatizados (Melhoria 16)
    if (inv.status === "Pendente" && dataEmissao < hoje) {
        const diffTime = Math.abs(hoje - dataEmissao);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const multa = inv.valorTotal * 0.02;
        const juros = inv.valorTotal * (0.01 * (diffDays / 30));
        const totalComAcrecimos = inv.valorTotal + multa + juros;
        
        const alertBox = document.createElement("div");
        alertBox.className = "alert alert-danger mt-3 py-2 px-3";
        alertBox.style.fontSize = "0.725rem";
        alertBox.style.borderRadius = "var(--radius-sm)";
        alertBox.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i> <strong>Fatura Atrasada (${diffDays} dias):</strong><br>
            • Valor Original: ${formatCurrency(inv.valorTotal)}<br>
            • Multa de Atraso (2.0%): ${formatCurrency(multa)}<br>
            • Juros Simples (1.0% a.m.): ${formatCurrency(juros)}<br>
            • <strong>Total Atual com Mora: ${formatCurrency(totalComAcrecimos)}</strong>
        `;
        list.parentNode.appendChild(alertBox);
        
        // Remove qualquer alerta duplicado antigo antes de renderizar o novo
        const oldAlert = list.parentNode.querySelector(".alert-danger");
        if (oldAlert && oldAlert !== alertBox) {
            oldAlert.remove();
        }
    } else {
        // Se não está atrasado, remove alertas residuais antigos
        const oldAlert = list.parentNode.querySelector(".alert-danger");
        if (oldAlert) oldAlert.remove();
    }
}

// Timesheet CRUD (Melhoria 5)
const formTimesheet = document.getElementById("form-timesheet");
if (formTimesheet) {
    formTimesheet.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const invoiceId = document.getElementById("modal-detalhes-nota").getAttribute("data-active-invoice-id");
        if (!invoiceId) return;
        
        const tecnico = document.getElementById("ts-tecnico").value.trim();
        const horas = parseFloat(document.getElementById("ts-horas").value);
        const valorHora = parseFloat(document.getElementById("ts-valor").value);
        const custoTotal = horas * valorHora;
        
        const novoTS = {
            id: generateUUID(),
            notaFiscalId: invoiceId,
            tecnico,
            horas,
            valorHora,
            custoTotal
        };
        
        state.timesheets.push(novoTS);
        addAuditLog("Timesheet Adicionado", `Horas de campo registradas para nota ${invoiceId}: ${tecnico} - ${horas}h`);
        
        saveStateToLocalStorage();
        updateInvoiceDetailsModal(invoiceId);
        renderApp();
        
        // reset form
        document.getElementById("ts-tecnico").value = "";
        document.getElementById("ts-horas").value = "";
        document.getElementById("ts-valor").value = "";
    });
}

window.deleteTimesheet = function(tsId, invoiceId) {
    if (confirm("Deseja realmente excluir este lançamento de horas técnicas?")) {
        state.timesheets = state.timesheets.filter(ts => ts.id !== tsId);
        addAuditLog("Timesheet Excluído", `Horas técnicas id ${tsId} removidas da nota ${invoiceId}`);
        saveStateToLocalStorage();
        updateInvoiceDetailsModal(invoiceId);
        renderApp();
    }
};

window.unlinkTransaction = function(transId, invoiceId) {
    uiConfirm("Tem certeza que deseja desvincular esta despesa da OS?\n(A despesa continuará existindo no seu Fluxo de Caixa Geral, mas deixará de reduzir o lucro desta Nota Fiscal).", () => {
        const trans = state.transactions.find(t => t.id === transId);
        if (trans) {
            trans.notaFiscalId = "";
            addAuditLog("Despesa Desvinculada", `Transação ${transId} desvinculada da nota ${invoiceId}`);
            saveStateToLocalStorage();
            updateInvoiceDetailsModal(invoiceId);
            renderApp();
        }
    });
};

// ==========================================================================
// ASSINATURA DIGITAL RAT CANVAS LÓGICA (Melhoria 8)
// ==========================================================================
function setupSignatureCanvas() {
    sigCanvas = document.getElementById("signature-pad");
    if (!sigCanvas) return;
    
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.strokeStyle = "#06b6d4";
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = "round";
    
    // Mouse Event Listeners
    sigCanvas.addEventListener("mousedown", startDrawing);
    sigCanvas.addEventListener("mousemove", draw);
    sigCanvas.addEventListener("mouseup", stopDrawing);
    sigCanvas.addEventListener("mouseout", stopDrawing);
    
    // Touch Event Listeners (Mobile)
    sigCanvas.addEventListener("touchstart", startDrawingTouch);
    sigCanvas.addEventListener("touchmove", drawTouch);
    sigCanvas.addEventListener("touchend", stopDrawing);
    
    document.getElementById("btn-clear-signature").addEventListener("click", clearCanvas);
    document.getElementById("btn-save-signature").addEventListener("click", salvarAssinatura);
}

function startDrawing(e) {
    isDrawing = true;
    sigCtx.beginPath();
    sigCtx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
    if (!isDrawing) return;
    sigCtx.lineTo(e.offsetX, e.offsetY);
    sigCtx.stroke();
}

function startDrawingTouch(e) {
    isDrawing = true;
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.beginPath();
    sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    e.preventDefault();
}

function drawTouch(e) {
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    sigCtx.stroke();
    e.preventDefault();
}

function stopDrawing() {
    isDrawing = false;
}

function clearCanvas() {
    if (!sigCanvas) return;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

function salvarAssinatura() {
    const invoiceId = document.getElementById("modal-detalhes-nota").getAttribute("data-active-invoice-id");
    if (!invoiceId) return;
    
    const dataURL = sigCanvas.toDataURL();
    
    // Armazenar a assinatura na nota fiscal no estado
    const inv = state.invoices.find(n => n.id === invoiceId);
    if (inv) {
        inv.assinaturaRAT = dataURL;
        addAuditLog("Assinatura RAT Salva", `Relatório de Atendimento Técnico assinado digitalmente na nota ${inv.numeroNota}`);
        saveStateToLocalStorage();
        uiAlert("Assinatura digital do RAT salva com sucesso para faturamento!");
    }
}

function carregarAssinaturaRAT(invoiceId) {
    const inv = state.invoices.find(n => n.id === invoiceId);
    clearCanvas();
    if (inv && inv.assinaturaRAT) {
        const img = new Image();
        img.src = inv.assinaturaRAT;
        img.onload = function() {
            sigCtx.drawImage(img, 0, 0);
        };
    }
}

// ==========================================================================
// SIMULADOR DE COBRANÇAS PIX/BOLETO (Melhoria 12)
// ==========================================================================
const btnGerarCobranca = document.getElementById("btn-gerar-cobranca");
if (btnGerarCobranca) {
    btnGerarCobranca.addEventListener("click", () => {
        const invoiceId = document.getElementById("modal-detalhes-nota").getAttribute("data-active-invoice-id");
        const inv = state.invoices.find(n => n.id === invoiceId);
        if (!inv) return;
        
        let valorCobrado = inv.valorTotal;
        const dataEmissao = new Date(inv.dataEmissao);
        const hoje = new Date();
        
        if (inv.status === "Pendente" && dataEmissao < hoje) {
            const diffTime = Math.abs(hoje - dataEmissao);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const multa = inv.valorTotal * 0.02;
            const juros = inv.valorTotal * (0.01 * (diffDays / 30));
            valorCobrado = inv.valorTotal + multa + juros;
        }
        
        document.getElementById("cobranca-valor-total").innerText = formatCurrency(valorCobrado);
        
        // Simula um código Pix copia e cola e linha digitável do boleto baseados no ID/valor
        const hash = Math.random().toString(36).substring(2,15).toUpperCase();
        document.getElementById("cobranca-pix-string").value = `00020101021226870014BR.GOV.BCB.PIX2563nevixapix${hash}5204000053039865405${valorCobrado.toFixed(2)}5802BR5916NEVIXAENGENHARIA6009SAOPAULO62070503***6304`;
        document.getElementById("cobranca-boleto-string").value = `34191.79001 01043.513184 91020.150008 7 982000000${valorCobrado.toFixed(0)}00`;
        
        // Injeta imagem simulada de QR Code
        document.getElementById("cobranca-qr-code").innerHTML = `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=nevixa-pix-fake-${hash}" alt="QR Code Pix" style="width:150px;height:150px;">
        `;
        
        openModal("modal-cobranca");
    });
}

const btnCobrancaWhatsApp = document.getElementById("btn-cobranca-whatsapp");
if (btnCobrancaWhatsApp) {
    btnCobrancaWhatsApp.addEventListener("click", () => {
        const pixVal = document.getElementById("cobranca-pix-string").value;
        const msg = encodeURIComponent(`Olá, segue a cobrança da Nevixa Engenharia para pagamento do serviço prestado.\n\nCódigo Pix Copia e Cola:\n${pixVal}`);
        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    });
}

// ==========================================================================
// SIMULADOR CONEXÃO OFFLINE (Melhoria 17)
// ==========================================================================
const btnToggleOffline = document.getElementById("btn-toggle-offline");
if (btnToggleOffline) {
    btnToggleOffline.addEventListener("click", () => {
        state.isOffline = !state.isOffline;
        
        const btn = document.getElementById("btn-toggle-offline");
        const icon = btn.querySelector("i");
        const txt = document.getElementById("connection-status-text");
        
        if (state.isOffline) {
            icon.className = "fa-solid fa-wifi-slash text-danger";
            txt.innerText = "Offline";
            btn.classList.add("btn-danger-outline"); // visual warning
            uiAlert("Sistema em modo OFFLINE. Todas as alterações serão mantidas localmente de forma resiliente.");
        } else {
            icon.className = "fa-solid fa-wifi text-success";
            txt.innerText = "Online";
            btn.classList.remove("btn-danger-outline");
            uiAlert("Conexão restabelecida! Sincronização dos dados locais concluída com sucesso.");
            addAuditLog("Sincronização de Rede", "Sessão offline sincronizada com os servidores centrais da Nevixa.");
        }
    });
}

// ==========================================================================
// CONFIGURAÇÕES TRIBUTÁRIAS & RATEIOS (Melhoria 14 / Opção 10)
// ==========================================================================
const inputBiRateioPerc = document.getElementById("input-bi-rateio-perc");
if (inputBiRateioPerc) {
    inputBiRateioPerc.addEventListener("change", (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0 && val <= 100) {
            state.rateioConfig = val;
            localStorage.setItem("nevixa_rateio_perc", val.toString());
            addAuditLog("Alteração de Rateio", `A taxa de rateio de custos fixos corporativos foi atualizada para ${val}%`);
            renderApp();
        }
    });
}

// Geração de logs no modal de logs de auditoria
const btnViewLogs = document.getElementById("btn-view-logs");
if (btnViewLogs) {
    btnViewLogs.addEventListener("click", () => {
        const tbody = document.getElementById("table-auditoria-body");
        tbody.innerHTML = "";
        
        if (state.auditLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Nenhum log registrado.</td></tr>`;
        } else {
            state.auditLogs.forEach(log => {
                const dateObj = new Date(log.timestamp);
                const dataStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR');
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="text-muted" style="font-size:0.75rem">${dataStr}</td>
                    <td><strong>${log.usuario}</strong></td>
                    <td><span class="badge badge-neutral" style="font-size:0.6rem; padding: 2px 6px;">${log.operacao}</span></td>
                    <td style="font-size:0.75rem">${log.descricao}</td>
                `;
                tbody.appendChild(row);
            });
        }
        openModal("modal-auditoria");
    });
}

// Exportação Contábil Simulado (Melhoria 20)
const btnExportContabil = document.getElementById("btn-export-contabil");
if (btnExportContabil) {
    btnExportContabil.addEventListener("click", () => {
        // Gerar um CSV do DRE e Notas do mês
        const faturamentoBruto = state.invoices
            .filter(inv => inv.status === "Recebido")
            .reduce((sum, inv) => sum + inv.valorTotal, 0);
        const totalImpostos = state.transactions
            .filter(t => t.tipo === "Saída" && t.categoria === "Impostos" && t.notaFiscalId)
            .reduce((sum, t) => sum + t.valor, 0);
    
        // Formatar decimais com vírgula para compatibilidade com o Excel brasileiro
        const formatDecimalCSV = (val) => val.toFixed(2).replace(".", ",");
    
        let csvContent = "sep=;\r\n";
        csvContent += "CONTA CONTABIL;DESCRICAO;DEBITO;CREDITO;DATA\r\n";
        csvContent += `1.1.01.002;Receita Bruta Faturamento;${formatDecimalCSV(0)};${formatDecimalCSV(faturamentoBruto)};${new Date().toISOString().slice(0,10)}\r\n`;
        csvContent += `3.1.02.001;Deducoes Tributarias (Impostos);${formatDecimalCSV(totalImpostos)};${formatDecimalCSV(0)};${new Date().toISOString().slice(0,10)}\r\n`;
        
        // Adicionar cada nota fiscal faturada
        state.invoices.filter(inv => inv.status === "Recebido").forEach(inv => {
            csvContent += `1.1.03.001;Faturamento Nota ${inv.numeroNota};${formatDecimalCSV(0)};${formatDecimalCSV(inv.valorTotal)};${inv.dataEmissao}\r\n`;
        });
    
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", `contabilidade_nevixa_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        
        addAuditLog("Exportação Contábil", "Arquivos de integração contábil e SPD gerados e baixados pelo Administrador.");
        uiAlert("Exportação Contábil CSV gerada com sucesso e formatada para o Microsoft Excel!");
    });
}

// ==========================================================================
// FORMULÁRIOS & CADASTROS (CRUDS)
// ==========================================================================

window.openInvoiceDetails = function(id) {
    document.getElementById("modal-detalhes-nota").setAttribute("data-active-invoice-id", id);
    openModal("modal-detalhes-nota");
    updateInvoiceDetailsModal(id);
};

/* --------------------------------------------------------------------------
   GESTÃO DE NOTAS FISCAIS & IMPOSTOS AUTOMÁTICOS
   -------------------------------------------------------------------------- */
const formNota = document.getElementById("form-nota");
if (formNota) {
    formNota.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const id = document.getElementById("form-nota-id").value;
        const numeroNota = document.getElementById("nota-numero").value.trim();
        const dataEmissao = document.getElementById("nota-data").value;
        
        const equipamentoNome = document.getElementById("nota-equipamento-nome").value.trim();
        let equipamentoId = document.getElementById("nota-equipamento-id").value;
        const eqByNome = state.equipments.find(item => `${item.tag} - ${item.nome} (${item.cliente})` === equipamentoNome);
        
        if (eqByNome) {
            equipamentoId = eqByNome.id;
        } else if (equipamentoNome) {
            equipamentoId = equipamentoNome;
        }
        
        const eq = state.equipments.find(item => item.id === equipamentoId);
        const clienteInput = document.getElementById("nota-cliente").value.trim();
        const cliente = clienteInput || (eq ? eq.cliente : "Cliente Desconhecido");
        
        const descricao = document.getElementById("nota-descricao").value.trim();
        const valorTotal = parseCurrencyBR(document.getElementById("nota-valor").value);
        const status = document.getElementById("nota-status").value;
        const calcularImpostos = document.getElementById("nota-calcular-impostos").checked;

        // Lógica do Faturamento Misto (Melhoria 18)
        const isMisto = document.getElementById("nota-faturamento-misto").checked;
        let valorPecas = 0;
        let valorServicos = 0;
        
        if (isMisto) {
            valorPecas = parseCurrencyBR(document.getElementById("nota-valor-pecas").value) || 0;
            valorServicos = parseCurrencyBR(document.getElementById("nota-valor-servicos").value) || 0;
            
            if (Math.abs((valorPecas + valorServicos) - valorTotal) > 0.02) {
                uiAlert("A soma do valor de peças e serviços deve ser exatamente igual ao Valor Total da Nota informado!");
                return;
            }
        }
        
        if (!id) {
            const notaDuplicada = state.invoices.find(n => n.numeroNota.toLowerCase() === numeroNota.toLowerCase());
            if (notaDuplicada) {
                uiAlert(`O número de Nota/OS "${numeroNota}" já foi cadastrado para o cliente ${notaDuplicada.cliente}.`);
                return;
            }
        }
        
        let notaId = id || generateUUID();
        
        // Upload do PDF anexo (se selecionado)
        const fileInput = document.getElementById("nota-arquivo");
        let arquivoUrl = null;
        if (id) {
            const notaAtual = state.invoices.find(n => n.id === id);
            arquivoUrl = notaAtual ? notaAtual.arquivoUrl : null;
        }

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `notas/${fileName}`;
            
            const btnSalvar = document.querySelector("#form-nota button[type='submit']");
            const originalText = btnSalvar.innerHTML;
            btnSalvar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Anexando Arquivo...`;
            btnSalvar.disabled = true;

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('arquivos-nevixa')
                .upload(filePath, file);
                
            btnSalvar.innerHTML = originalText;
            btnSalvar.disabled = false;

            if (uploadError) {
                uiAlert("Erro ao fazer upload do arquivo (verifique se o bucket 'arquivos-nevixa' é público/permitido): " + uploadError.message);
                return;
            }

            const { data: urlData } = supabaseClient.storage
                .from('arquivos-nevixa')
                .getPublicUrl(filePath);
                
            arquivoUrl = urlData.publicUrl;
        }
        
        if (id) {
            const index = state.invoices.findIndex(n => n.id === id);
            if (index !== -1) {
                state.invoices[index] = { 
                    ...state.invoices[index], 
                    numeroNota, dataEmissao, equipamentoId, cliente, descricao, valorTotal, status, calcularImpostos,
                    isMisto, valorPecas, valorServicos, arquivoUrl
                };
            }
            addAuditLog("Nota Fiscal Editada", `Atualização dos dados da nota ${numeroNota} - Valor: ${formatCurrency(valorTotal)}`);
        } else {
            const novaNota = { 
                id: notaId, numeroNota, dataEmissao, equipamentoId, cliente, descricao, valorTotal, status, calcularImpostos,
                isMisto, valorPecas, valorServicos, arquivoUrl
            };
            state.invoices.push(novaNota);
            addAuditLog("Nota Fiscal Cadastrada", `Emissão de nota ${numeroNota} para ${cliente} - Valor: ${formatCurrency(valorTotal)}`);
        }
        
        sincronizarImpostosNota(notaId, numeroNota, dataEmissao, valorTotal, calcularImpostos);
        
        saveStateToLocalStorage();
        closeModal("modal-nota");
        renderApp();
    });
}

// Vincula o preenchimento automático do cliente ao trocar de equipamento
const inputEquipamentoNome = document.getElementById("nota-equipamento-nome");
if (inputEquipamentoNome) {
    inputEquipamentoNome.addEventListener("change", (e) => {
        const val = e.target.value.trim();
        const eq = state.equipments.find(item => `${item.tag} - ${item.nome} (${item.cliente})` === val);
        if (eq) {
            document.getElementById("nota-equipamento-id").value = eq.id;
            document.getElementById("nota-cliente").value = eq.cliente;
        } else {
            document.getElementById("nota-equipamento-id").value = val;
        }
    });
}

function sincronizarImpostosNota(notaId, numeroNota, dataNota, valorNota, calcularImpostos) {
    state.transactions = state.transactions.filter(t => !(t.notaFiscalId === notaId && t.isImpostoAuto === true));
    
    if (calcularImpostos) {
        const config = state.taxConfig;
        const inv = state.invoices.find(n => n.id === notaId);
        
        let valorBaseServicos = valorNota;
        let valorBasePecas = 0;
        
        if (inv && inv.isMisto) {
            valorBaseServicos = inv.valorServicos;
            valorBasePecas = inv.valorPecas;
        }
        
        if (config.regime === "SimplesNacional") {
            const valorDAS = valorBaseServicos * (config.simplesAliquota / 100);
            
            if (valorDAS > 0) {
                const impostoDAS = {
                    id: generateUUID(),
                    data: dataNota,
                    descricao: `Imposto DAS - Simples Nacional (${config.simplesAliquota.toFixed(1)}%) sobre Serviços da NF ${numeroNota}`,
                    tipo: "Saída",
                    valor: valorDAS,
                    categoria: "Impostos",
                    status: "Pendente",
                    notaFiscalId: notaId,
                    isImpostoAuto: true
                };
                state.transactions.push(impostoDAS);
            }
            
            if (valorBasePecas > 0) {
                const valorICMS = valorBasePecas * 0.04; // 4% ICMS Simplificado Comércio
                const impostoICMS = {
                    id: generateUUID(),
                    data: dataNota,
                    descricao: `ICMS Simplificado (4.0%) sobre Venda de Peças da NF ${numeroNota}`,
                    tipo: "Saída",
                    valor: valorICMS,
                    categoria: "Impostos",
                    status: "Pendente",
                    notaFiscalId: notaId,
                    isImpostoAuto: true
                };
                state.transactions.push(impostoICMS);
            }
        } else if (config.regime === "LucroPresumido") {
            const presumidoConfig = config.presumido;
            
            // Impostos Federais/Municipais incidentes sobre o Serviço
            const impostosLP = [
                { nome: "PIS", aliquota: presumidoConfig.pis },
                { nome: "COFINS", aliquota: presumidoConfig.cofins },
                { nome: "CSLL", aliquota: presumidoConfig.csll },
                { nome: "IRRF", aliquota: presumidoConfig.irrf },
                { nome: "ISSQN", aliquota: presumidoConfig.iss }
            ];
            
            impostosLP.forEach(imp => {
                if (imp.aliquota > 0 && valorBaseServicos > 0) {
                    const valorImp = valorBaseServicos * (imp.aliquota / 100);
                    const lancamentoImp = {
                        id: generateUUID(),
                        data: dataNota,
                        descricao: `Retenção ${imp.nome} (${imp.aliquota.toFixed(2)}%) sobre Serviços da NF ${numeroNota}`,
                        tipo: "Saída",
                        valor: valorImp,
                        categoria: "Impostos",
                        status: "Pendente",
                        notaFiscalId: notaId,
                        isImpostoAuto: true
                    };
                    state.transactions.push(lancamentoImp);
                }
            });
            
            // Impostos Estaduais/Federais incidentes sobre as Peças (Ex: ICMS 18% e IPI 5% simulados no presumido)
            if (valorBasePecas > 0) {
                const impostosPecasLP = [
                    { nome: "ICMS Comércio", aliquota: 18.00 },
                    { nome: "IPI Industrial", aliquota: 5.00 }
                ];
                
                impostosPecasLP.forEach(imp => {
                    const valorImp = valorBasePecas * (imp.aliquota / 100);
                    const lancamentoImp = {
                        id: generateUUID(),
                        data: dataNota,
                        descricao: `Imposto ${imp.nome} (${imp.aliquota.toFixed(2)}%) sobre Peças da NF ${numeroNota}`,
                        tipo: "Saída",
                        valor: valorImp,
                        categoria: "Impostos",
                        status: "Pendente",
                        notaFiscalId: notaId,
                        isImpostoAuto: true
                    };
                    state.transactions.push(lancamentoImp);
                });
            }
        }
    }
}

function editInvoice(id) {
    const inv = state.invoices.find(n => n.id === id);
    if (!inv) return;
    
    document.getElementById("modal-nota-title").innerText = "Editar Nota Fiscal / Centro de Custo";
    document.getElementById("form-nota-id").value = inv.id;
    document.getElementById("nota-numero").value = inv.numeroNota;
    document.getElementById("nota-data").value = inv.dataEmissao;
    
    popularEquipamentosDropdown();
    const eq = state.equipments.find(e => e.id === inv.equipamentoId);
    if (eq) {
        document.getElementById("nota-equipamento-nome").value = `${eq.tag} - ${eq.nome} (${eq.cliente})`;
        document.getElementById("nota-equipamento-id").value = eq.id;
    } else {
        document.getElementById("nota-equipamento-nome").value = inv.equipamentoId || "";
        document.getElementById("nota-equipamento-id").value = inv.equipamentoId || "";
    }
    document.getElementById("nota-cliente").value = inv.cliente || "";
    
    document.getElementById("nota-descricao").value = inv.descricao || "";
    document.getElementById("nota-valor").value = formatInputCurrency(inv.valorTotal);
    document.getElementById("nota-status").value = inv.status;
    document.getElementById("nota-calcular-impostos").checked = inv.calcularImpostos !== false;
    
    // Injetar valores do split no formulário
    document.getElementById("nota-faturamento-misto").checked = inv.isMisto === true;
    document.getElementById("row-split-faturamento").style.display = inv.isMisto ? "flex" : "none";
    document.getElementById("nota-valor-pecas").value = inv.valorPecas ? formatInputCurrency(inv.valorPecas) : "";
    document.getElementById("nota-valor-servicos").value = inv.valorServicos ? formatInputCurrency(inv.valorServicos) : "";
    
    openModal("modal-nota");
}

function popularEquipamentosDropdown() {
    const list = document.getElementById("equipamentos-list");
    if (!list) return;
    
    list.innerHTML = '';
    
    state.equipments.forEach(eq => {
        const option = document.createElement("option");
        option.value = `${eq.tag} - ${eq.nome} (${eq.cliente})`;
        list.appendChild(option);
    });
}

function updateInvoicesDropdown() {
    const dropdown = document.getElementById("trans-nota");
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Despesa Geral (Sem vínculo com Nota/OS)</option>';
    
    // Pegar todas as notas não canceladas
    const notasValidas = state.invoices.filter(n => n.status !== "Cancelado");
    
    notasValidas.forEach(n => {
        const option = document.createElement("option");
        option.value = n.id;
        option.innerText = `OS ${n.numeroNota} - ${n.cliente} (Valor: ${formatCurrency(n.valorTotal)})`;
        dropdown.appendChild(option);
    });
}

function deleteInvoice(id) {
    const inv = state.invoices.find(n => n.id === id);
    if (!inv) return;
    
    const despesasDiretas = state.transactions.filter(t => t.notaFiscalId === id && !t.isImpostoAuto).length;
    let confirmMsg = `Deseja realmente excluir a Nota Fiscal ${inv.numeroNota}?`;
    if (despesasDiretas > 0) {
        confirmMsg = `ATENÇÃO: A Nota Fiscal ${inv.numeroNota} possui ${despesasDiretas} despesas diretas vinculadas. Se você excluí-la, essas despesas deixarão de estar associadas a esta nota, tornando-se despesas operacionais avulsas. Deseja prosseguir?`;
    }
    
    if (confirm(confirmMsg)) {
        addAuditLog("Nota Fiscal Excluída", `Exclusão da nota ${inv.numeroNota} de valor ${formatCurrency(inv.valorTotal)}`);
        
        state.invoices = state.invoices.filter(n => n.id !== id);
        state.transactions = state.transactions.filter(t => !(t.notaFiscalId === id && t.isImpostoAuto === true));
        state.timesheets = state.timesheets.filter(ts => ts.notaFiscalId !== id); // Limpa timesheets da nota
        
        state.transactions = state.transactions.map(t => {
            if (t.notaFiscalId === id) return { ...t, notaFiscalId: "" };
            return t;
        });
        
        saveStateToLocalStorage();
        renderApp();
    }
}

/* --------------------------------------------------------------------------
   GESTÃO DE TRANSAÇÕES
   -------------------------------------------------------------------------- */
const formTransacao = document.getElementById("form-transacao");
if (formTransacao) {
    formTransacao.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const id = document.getElementById("form-transacao-id").value;
        const tipo = document.getElementById("trans-tipo").value;
        const data = document.getElementById("trans-data").value;
        const descricao = document.getElementById("trans-descricao").value.trim();
        const valorInput = parseFloat(document.getElementById("trans-valor").value);
        const categoria = document.getElementById("trans-categoria").value;
        const status = document.getElementById("trans-status").value;
        const notaFiscalId = document.getElementById("trans-nota").value;
        
        // Cálculo de Km (Melhoria 7)
        let km = parseFloat(document.getElementById("trans-km").value);
        let valorFinal = valorInput;
        let descFinal = descricao;
        
        if (categoria === "Deslocamento" && !isNaN(km) && km > 0) {
            const taxaKm = 3.00; // R$ 3,00 por Km rodado taxa Nevixa
            valorFinal = km * taxaKm;
            descFinal = `${descricao} (Roteiro: ${km}Km rodados a R$ 3,00/Km)`;
        }
        
        // Garantia de peça (Melhoria 10)
        let garantia = parseInt(document.getElementById("trans-garantia").value);
        
        if (id) {
            // Editar Transação Existente
            const index = state.transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                const tAntiga = state.transactions[index];
                state.transactions[index] = { 
                    ...tAntiga, 
                    tipo, 
                    data, 
                    descricao: descFinal, 
                    valor: valorFinal, 
                    categoria, 
                    status, 
                    notaFiscalId,
                    kmRodados: km || undefined,
                    garantiaMeses: garantia || undefined
                };
                addAuditLog("Transação Editada", `Modificação da transação "${tAntiga.descricao}" -> "${descFinal}" no valor ${formatCurrency(valorFinal)}`);
            }
        } else {
            // Criar Nova Transação
            const novaTrans = {
                id: generateUUID(),
                tipo,
                data,
                descricao: descFinal,
                valor: valorFinal,
                categoria,
                status,
                notaFiscalId,
                kmRodados: km || undefined,
                garantiaMeses: garantia || undefined
            };
            state.transactions.push(novaTrans);
            addAuditLog("Transação Lançada", `Registro de ${tipo}: "${descFinal}" no valor de ${formatCurrency(valorFinal)}`);
        }
        
        // Se for offline, avisa o usuário do salvamento local (Melhoria 17)
        if (state.isOffline) {
            uiAlert("Registro gravado no dispositivo (Offline). Será sincronizado quando a conexão retornar.");
        }
        
        saveStateToLocalStorage();
        closeModal("modal-transacao");
        renderApp();
        
        const modalDetalhes = document.getElementById("modal-detalhes-nota");
        if (modalDetalhes.classList.contains("active")) {
            const activeInvoiceId = modalDetalhes.getAttribute("data-active-invoice-id");
            if (activeInvoiceId) updateInvoiceDetailsModal(activeInvoiceId);
        }
    });
}

// Oculta/Mostra campos de deslocamento e garantia no form conforme categoria selecionada
const inputCategoria = document.getElementById("trans-categoria");
if (inputCategoria) {
    inputCategoria.addEventListener("change", (e) => {
        const cat = e.target.value;
        const kmGroup = document.getElementById("group-km-deslocamento");
        const garGroup = document.getElementById("group-garantia-peca");
        const valInput = document.getElementById("trans-valor");
        
        if (cat === "Deslocamento") {
            kmGroup.style.display = "flex";
            garGroup.style.display = "none";
            valInput.placeholder = "Deixe em branco (calculado por Km)";
            valInput.required = false;
        } else if (cat === "Peças") {
            kmGroup.style.display = "none";
            garGroup.style.display = "flex";
            valInput.placeholder = "0,00";
            valInput.required = true;
        } else {
            kmGroup.style.display = "none";
            garGroup.style.display = "none";
            valInput.placeholder = "0,00";
            valInput.required = true;
        }
    });
}

function editTransaction(id) {
    const t = state.transactions.find(trans => trans.id === id);
    if (!t) return;
    
    document.getElementById("modal-transacao-title").innerText = "Editar Movimentação Financeira";
    document.getElementById("form-transacao-id").value = t.id;
    document.getElementById("trans-tipo").value = t.tipo;
    document.getElementById("trans-data").value = t.data;
    document.getElementById("trans-descricao").value = t.descricao.split(" (Roteiro:")[0]; // remove string Km do input
    document.getElementById("trans-valor").value = t.valor;
    document.getElementById("trans-categoria").value = t.categoria;
    document.getElementById("trans-status").value = t.status;
    
    // Configurar campos Km e garantia
    const kmGroup = document.getElementById("group-km-deslocamento");
    const garGroup = document.getElementById("group-garantia-peca");
    
    if (t.categoria === "Deslocamento") {
        kmGroup.style.display = "flex";
        garGroup.style.display = "none";
        document.getElementById("trans-km").value = t.kmRodados || "";
    } else if (t.categoria === "Peças") {
        kmGroup.style.display = "none";
        garGroup.style.display = "flex";
        document.getElementById("trans-garantia").value = t.garantiaMeses || "";
    } else {
        kmGroup.style.display = "none";
        garGroup.style.display = "none";
    }
    
    updateInvoicesDropdown();
    document.getElementById("trans-nota").value = t.notaFiscalId || "";
    
    openModal("modal-transacao");
}

function deleteTransaction(id) {
    const t = state.transactions.find(trans => trans.id === id);
    if (!t) return;
    
    if (confirm(`Deseja realmente excluir a transação "${t.descricao}" no valor de ${formatCurrency(t.valor)}?`)) {
        addAuditLog("Transação Excluída", `Exclusão de transação: "${t.descricao}" de valor ${formatCurrency(t.valor)}`);
        
        state.transactions = state.transactions.filter(trans => trans.id !== id);
        saveStateToLocalStorage();
        renderApp();
        
        const modalDetalhes = document.getElementById("modal-detalhes-nota");
        if (modalDetalhes.classList.contains("active")) {
            const activeInvoiceId = modalDetalhes.getAttribute("data-active-invoice-id");
            if (activeInvoiceId) updateInvoiceDetailsModal(activeInvoiceId);
        }
    }
}

/* --------------------------------------------------------------------------
   F. SUBMISSÃO DE CONFIGURAÇÕES TRIBUTÁRIAS & RATES
   -------------------------------------------------------------------------- */
const formConfigTributaria = document.getElementById("form-config-tributaria");
if (formConfigTributaria) {
    formConfigTributaria.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const regime = document.getElementById("config-regime").value;
        const simplesAliquota = parseFloat(document.getElementById("simples-aliquota").value);
        
        const pis = parseFloat(document.getElementById("presumido-pis").value);
        const cofinancas = parseFloat(document.getElementById("presumido-cofins").value); // Evita colisão
        const cofins = parseFloat(document.getElementById("presumido-cofins").value);
        const csll = parseFloat(document.getElementById("presumido-csll").value);
        const irrf = parseFloat(document.getElementById("presumido-irrf").value);
        const iss = parseFloat(document.getElementById("presumido-iss").value);
        
        state.taxConfig = {
            regime,
            simplesAliquota,
            presumido: { pis, cofins, csll, irrf, iss }
        };
        
        localStorage.setItem("nevixa_tax_config", JSON.stringify(state.taxConfig));
        
        // Recalcular impostos automáticos
        state.invoices.forEach(inv => {
            if (inv.status !== "Cancelado" && inv.calcularImpostos !== false) {
                sincronizarImpostosNota(inv.id, inv.numeroNota, inv.dataEmissao, inv.valorTotal, true);
            }
        });
        
        addAuditLog("Alteração de Impostos", `Regime de impostos configurado como ${regime}.`);
        saveStateToLocalStorage();
        closeModal("modal-config-tributaria");
        renderApp();
        
        uiAlert("Configurações tributárias salvas e impostos recalculados!");
    });
}

const inputRegime = document.getElementById("config-regime");
if (inputRegime) {
    inputRegime.addEventListener("change", (e) => {
        const regime = e.target.value;
        document.getElementById("secao-simples").classList.toggle("d-none", regime !== "SimplesNacional");
        document.getElementById("secao-presumido").classList.toggle("d-none", regime === "SimplesNacional");
    });
}

function openConfigTributariaModal() {
    const config = state.taxConfig;
    
    document.getElementById("config-regime").value = config.regime;
    document.getElementById("simples-aliquota").value = config.simplesAliquota;
    
    document.getElementById("presumido-pis").value = config.presumido.pis;
    document.getElementById("presumido-cofins").value = config.presumido.cofins;
    document.getElementById("presumido-csll").value = config.presumido.csll;
    document.getElementById("presumido-irrf").value = config.presumido.irrf;
    document.getElementById("presumido-iss").value = config.presumido.iss;
    
    document.getElementById("secao-simples").classList.toggle("d-none", config.regime !== "SimplesNacional");
    document.getElementById("secao-presumido").classList.toggle("d-none", config.regime === "SimplesNacional");
    
    openModal("modal-config-tributaria");
}

// ==========================================================================
// MODAL CONTROLLER (ABRIR / FECHAR)
// ==========================================================================
let confirmCallback = null;
window.uiConfirm = function(message, callback) {
    const msgEl = document.getElementById("confirm-custom-message");
    if (msgEl) msgEl.innerText = message;
    confirmCallback = callback;
    openModal("modal-confirm-custom");
};

window.uiAlert = function(message, type = "info", callback = null) {
    const msgEl = document.getElementById("alert-custom-message");
    const iconEl = document.getElementById("alert-custom-icon");
    const titleText = document.getElementById("alert-custom-title-text");
    
    if (msgEl) msgEl.innerText = message;
    
    if (iconEl) {
        iconEl.className = ""; // Reset
        if (type === "success") {
            iconEl.className = "fa-solid fa-circle-check text-success";
            if (titleText) titleText.innerText = "Sucesso";
        } else if (type === "error") {
            iconEl.className = "fa-solid fa-circle-xmark text-danger";
            if (titleText) titleText.innerText = "Erro";
        } else if (type === "warning") {
            iconEl.className = "fa-solid fa-triangle-exclamation text-warning";
            if (titleText) titleText.innerText = "Atenção";
        } else {
            iconEl.className = "fa-solid fa-circle-info text-info";
            if (titleText) titleText.innerText = "Aviso";
        }
        iconEl.style.fontSize = "2rem";
        iconEl.style.display = "block";
        iconEl.style.marginBottom = "15px";
    }
    
    window._alertCallback = callback;
    openModal("modal-alert-custom");
};

safeAddEventListener("btn-alert-custom-ok", "click", () => {
    closeModal("modal-alert-custom");
    if (window._alertCallback) {
        window._alertCallback();
        window._alertCallback = null;
    }
});

// Listeners para os botões do confirm customizado
safeAddEventListener("btn-confirm-custom-cancel", "click", () => {
    closeModal("modal-confirm-custom");
    confirmCallback = null;
});

safeAddEventListener("btn-confirm-custom-ok", "click", () => {
    closeModal("modal-confirm-custom");
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
});

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
        const firstInput = modal.querySelector("input:not([type=hidden]), select, textarea");
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        
        if (modalId === "modal-nota") {
            document.getElementById("form-nota").reset();
            document.getElementById("form-nota-id").value = "";
            document.getElementById("modal-nota-title").innerText = "Nova Nota Fiscal / Centro de Custo";
        } else if (modalId === "modal-transacao") {
            document.getElementById("form-transacao").reset();
            document.getElementById("form-transacao-id").value = "";
            document.getElementById("modal-transacao-title").innerText = "Lançar Movimentação Financeira";
            document.getElementById("trans-data").valueAsDate = new Date();
            
            // Ocultar campos estendidos por padrão
            document.getElementById("group-km-deslocamento").style.display = "none";
            document.getElementById("group-garantia-peca").style.display = "none";
        }
    }
}

// ==========================================================================
// CONFIGURAÇÃO DOS EVENTOS (EVENT LISTENERS)
// Funções auxiliares para registrar eventos de forma segura contra elementos nulos
function safeAddEventListener(id, event, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, callback);
    }
}

function safeAddQueryEventListener(selector, event, callback) {
    const el = document.querySelector(selector);
    if (el) {
        el.addEventListener(event, callback);
    }
}

// ==========================================================================
// MÓDULO DE ACESSOS E PERMISSÕES (ADMIN)
// ==========================================================================
window.carregarUsuarios = async function() {
    if (state.currentUser.papel !== 'admin') return;
    
    const tbody = document.querySelector("#table-users tbody");
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> Carregando usuários...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('perfis')
            .select('*')
            .order('status', { ascending: false });
            
        if (error) throw error;
        
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum usuário encontrado.</td></tr>';
            return;
        }
        
        data.forEach(user => {
            const tr = document.createElement("tr");
            
            let statusBadge = '';
            if (user.status === 'ativo') statusBadge = '<span class="badge" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;"><i class="fa-solid fa-circle-check"></i> Ativo</span>';
            else if (user.status === 'pendente') statusBadge = '<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #facc15; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;"><i class="fa-solid fa-clock"></i> Pendente</span>';
            else statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;"><i class="fa-solid fa-ban"></i> Bloqueado</span>';
            
            tr.innerHTML = `
                <td>
                    <div class="fw-bold">${user.nome || 'Sem nome'}</div>
                    <div class="text-muted small">${user.email || ''}</div>
                </td>
                <td>
                    <select class="form-select form-select-sm" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px; width: 100%; appearance: auto;" onchange="alterarPapelUsuario('${user.id}', this.value)" ${user.id === state.currentUser.id ? 'disabled' : ''}>
                        <option value="tecnico" ${user.papel === 'tecnico' ? 'selected' : ''} style="background: var(--bg-card);">Técnico de Campo</option>
                        <option value="financeiro" ${user.papel === 'financeiro' ? 'selected' : ''} style="background: var(--bg-card);">Financeiro</option>
                        <option value="admin" ${user.papel === 'admin' ? 'selected' : ''} style="background: var(--bg-card);">Administrador</option>
                        <option value="cliente" ${user.papel === 'cliente' ? 'selected' : ''} style="background: var(--bg-card);">Cliente (Hospital / Clínica)</option>
                    </select>
                </td>
                <td>${statusBadge}</td>
                <td>
                    ${user.id !== state.currentUser.id ? `
                        ${user.status !== 'ativo' ? `<button class="btn btn-sm btn-outline" style="color: #4ade80; border-color: #4ade80; padding: 4px 8px; background: transparent;" onclick="alterarStatusUsuario('${user.id}', 'ativo')" title="Aprovar/Ativar"><i class="fa-solid fa-check"></i></button>` : ''}
                        ${user.status !== 'bloqueado' ? `<button class="btn btn-sm btn-outline" style="color: #f87171; border-color: #f87171; padding: 4px 8px; margin-left: 5px; background: transparent;" onclick="alterarStatusUsuario('${user.id}', 'bloqueado')" title="Bloquear"><i class="fa-solid fa-ban"></i></button>` : ''}
                    ` : '<span class="text-muted small">Você</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (err) {
        console.error("Erro ao carregar usuários:", err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar lista de usuários.</td></tr>';
    }
}

window.alterarStatusUsuario = async function(id, novoStatus) {
    if (!confirm(`Tem certeza que deseja mudar o status deste usuário para ${novoStatus.toUpperCase()}?`)) return;
    
    try {
        const { error } = await supabaseClient.from('perfis').update({ status: novoStatus }).eq('id', id);
        if (error) throw error;
        uiAlert("Status atualizado com sucesso!");
        carregarUsuarios();
    } catch (err) {
        console.error("Erro ao alterar status:", err);
        uiAlert("Erro ao alterar o status do usuário.");
    }
};

window.alterarPapelUsuario = async function(id, novoPapel) {
    try {
        const { error } = await supabaseClient.from('perfis').update({ papel: novoPapel }).eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error("Erro ao alterar papel:", err);
        uiAlert("Erro ao alterar a função do usuário.");
        carregarUsuarios(); 
    }
};

function setupEventListeners() {
    safeAddEventListener("form-login", "submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const senha = document.getElementById("login-senha").value;
        realizarLoginReal(email, senha);
    });

    safeAddEventListener("form-register", "submit", (e) => {
        e.preventDefault();
        const nome = document.getElementById("register-nome").value.trim();
        const email = document.getElementById("register-email").value.trim().toLowerCase();
        const senha = document.getElementById("register-senha").value;
        const papel = document.getElementById("register-papel").value;
        
        exibirCarregamentoLogin(true);
        realizarCadastroReal(nome, email, senha, papel);
    });

    safeAddEventListener("btn-show-register", "click", (e) => {
        e.preventDefault();
        document.getElementById("form-login").classList.add("d-none");
        document.getElementById("form-register").classList.remove("d-none");
    });

    safeAddEventListener("btn-show-login", "click", (e) => {
        e.preventDefault();
        document.getElementById("form-register").classList.add("d-none");
        document.getElementById("form-login").classList.remove("d-none");
    });
    
    window.alternarModoJanelaLogin = function(modo) {
        if(modo === 'login') {
            document.getElementById("form-register").classList.add("d-none");
            document.getElementById("form-login").classList.remove("d-none");
            document.getElementById("form-register").reset();
        } else {
            document.getElementById("form-login").classList.add("d-none");
            document.getElementById("form-register").classList.remove("d-none");
        }
        exibirCarregamentoLogin(false);
    }
    
    safeAddEventListener("btn-refresh-users", "click", () => {
        carregarUsuarios();
    });
    
    // Botão Sair da Conta (Logout)
    safeAddEventListener("btn-logout", "click", () => {
        if (confirm("Deseja realmente sair do sistema?")) {
            sessionStorage.removeItem("nevixa_current_user");
            document.body.className = "";
            checkAuth();
        }
    });

    // 2. Alternador de Abas (Sidebar Principal)
    const sidebarLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    sidebarLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab(link.getAttribute("data-tab"));
        });
    });
    
    // Alternador de Sub-Abas Operações Técnicas
    const subTabBtns = document.querySelectorAll(".sub-tab-btn");
    subTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            switchSubTab(btn.getAttribute("data-subtab"));
        });
    });
    
    // 3. Modais - Botão Fechar Geral (Atributo data-close-modal)
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
        btn.addEventListener("click", () => {
            closeModal(btn.getAttribute("data-close-modal"));
        });
    });
    
    // Fechar ao clicar no overlay de fundo do modal
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
    
    // 4. Botões de Abertura Rápidos de Lançamentos
    safeAddEventListener("btn-quick-invoice", "click", () => {
        document.getElementById("nota-data").valueAsDate = new Date();
        popularEquipamentosDropdown();
        openModal("modal-nota");
    });
    
    safeAddEventListener("btn-quick-transaction", "click", () => {
        updateInvoicesDropdown();
        document.getElementById("trans-data").valueAsDate = new Date();
        openModal("modal-transacao");
    });
    
    safeAddEventListener("btn-add-nota", "click", () => {
        document.getElementById("nota-data").valueAsDate = new Date();
        popularEquipamentosDropdown();
        openModal("modal-nota");
    });
    
    safeAddEventListener("btn-add-transacao", "click", () => {
        updateInvoicesDropdown();
        document.getElementById("trans-data").valueAsDate = new Date();
        openModal("modal-transacao");
    });
    
    // Botão de Configurações Tributárias
    safeAddEventListener("btn-config-tributaria", "click", () => {
        openConfigTributariaModal();
    });
    
    // Botão na gaveta de detalhes da nota para adicionar custo direto a ela
    safeAddEventListener("btn-add-despesa-direta", "click", () => {
        const activeInvoiceId = document.getElementById("modal-detalhes-nota").getAttribute("data-active-invoice-id");
        if (!activeInvoiceId) return;
        
        updateInvoicesDropdown();
        document.getElementById("trans-nota").value = activeInvoiceId;
        document.getElementById("trans-tipo").value = "Saída";
        document.getElementById("trans-data").valueAsDate = new Date();
        
        openModal("modal-transacao");
    });
    
    // Botão na gaveta de detalhes da nota para adicionar deslocamento/frota
    safeAddEventListener("btn-add-deslocamento", "click", () => {
        const activeInvoiceId = document.getElementById("modal-detalhes-nota").getAttribute("data-active-invoice-id");
        if (!activeInvoiceId) return;
        
        document.getElementById("form-deslocamento-nota-id").value = activeInvoiceId;
        document.getElementById("desloc-rota").value = "";
        document.getElementById("desloc-km").value = "";
        document.getElementById("desloc-pedagio").value = "0,00";
        document.getElementById("desloc-estadia").value = "0,00";
        document.getElementById("desloc-outros").value = "0,00";
        calcularTotalDeslocamento();
        
        openModal("modal-deslocamento");
    });
    
    // 5. Filtros Dinâmicos de Busca (Notas Fiscais)
    safeAddEventListener("search-nota", "input", (e) => {
        state.filters.nota.search = e.target.value;
        renderNotasTable();
    });
    
    safeAddEventListener("filter-nota-status", "change", (e) => {
        state.filters.nota.status = e.target.value;
        renderNotasTable();
    });
    
    // 6. Filtros Dinâmicos de Busca (Fluxo de Caixa)
    safeAddEventListener("search-transacao", "input", (e) => {
        state.filters.transacao.search = e.target.value;
        renderFluxoTable();
    });
    
    safeAddEventListener("filter-transacao-tipo", "change", (e) => {
        state.filters.transacao.tipo = e.target.value;
        renderFluxoTable();
    });
    
    safeAddEventListener("filter-transacao-categoria", "change", (e) => {
        state.filters.transacao.categoria = e.target.value;
        renderFluxoTable();
    });
    
    safeAddEventListener("filter-transacao-inicio", "change", (e) => {
        state.filters.transacao.dataInicio = e.target.value;
        renderFluxoTable();
    });
    
    safeAddEventListener("filter-transacao-fim", "change", (e) => {
        state.filters.transacao.dataFim = e.target.value;
        renderFluxoTable();
    });
    
    // 7. Backup de Dados (Janela e Ações)
    safeAddEventListener("btn-backup", "click", () => {
        openModal("modal-backup");
    });
    
    // Ação: Exportar DB JSON
    safeAddQueryEventListener("#action-export-db button", "click", () => {
        const dataExport = {
            invoices: state.invoices,
            transactions: state.transactions,
            equipments: state.equipments,
            calibrators: state.calibrators,
            quotations: state.quotations,
            tickets: state.tickets,
            timesheets: state.timesheets,
            taxConfig: state.taxConfig,
            rateioConfig: state.rateioConfig,
            auditLogs: state.auditLogs,
            exportDate: new Date().toISOString(),
            system: "Nevixa ERP"
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataExport, null, 2));
        const downloadAnchor = document.createElement('a');
        
        const dataFormatada = new Date().toISOString().slice(0, 10);
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `backup_nevixa_erp_${dataFormatada}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
    
    // Ação: Importar DB JSON
    const importInput = document.getElementById("input-import-file");
    if (importInput) {
        importInput.addEventListener("change", (e) => {
            const fileReader = new FileReader();
            const file = e.target.files[0];
            if (!file) return;
            
            fileReader.onload = function(event) {
                try {
                    const parsedData = JSON.parse(event.target.result);
                    
                    if (parsedData && Array.isArray(parsedData.invoices) && Array.isArray(parsedData.transactions)) {
                        if (confirm("Você tem certeza de que deseja restaurar este backup? Todos os dados atuais serão substituídos.")) {
                            state.invoices = parsedData.invoices;
                            state.transactions = parsedData.transactions;
                            state.equipments = parsedData.equipments || MOCK_EQUIPMENTS;
                            state.calibrators = parsedData.calibrators || MOCK_CALIBRATORS;
                            state.quotations = parsedData.quotations || MOCK_QUOTATIONS;
                            state.tickets = parsedData.tickets || MOCK_TICKETS;
                            state.timesheets = parsedData.timesheets || MOCK_TIMESHEETS;
                            state.taxConfig = parsedData.taxConfig || DEFAULT_TAX_CONFIG;
                            state.rateioConfig = parsedData.rateioConfig || 10;
                            state.auditLogs = parsedData.auditLogs || [];
                            
                            saveStateToLocalStorage();
                            localStorage.setItem("nevixa_tax_config", JSON.stringify(state.taxConfig));
                            localStorage.setItem("nevixa_rateio_perc", state.rateioConfig.toString());
                            
                            closeModal("modal-backup");
                            renderApp();
                            uiAlert("Backup restaurado com sucesso!");
                        }
                    } else {
                        uiAlert("Estrutura do arquivo de backup inválida. Certifique-se de usar um arquivo JSON gerado pelo sistema.");
                    }
                } catch (err) {
                    uiAlert("Erro ao ler o arquivo JSON. O arquivo está corrompido ou em formato incorreto.");
                }
            };
            fileReader.readAsText(file);
            importInput.value = "";
        });
    }

    // 8. Alternador de Tema Claro/Escuro (Melhoria 28)
    safeAddEventListener("btn-toggle-theme", "click", () => {
        const body = document.body;
        const btn = document.getElementById("btn-toggle-theme");
        const icon = btn.querySelector("i");
        
        if (body.classList.contains("light-mode")) {
            body.classList.remove("light-mode");
            icon.className = "fa-solid fa-moon";
            localStorage.setItem("nevixa_theme", "dark");
        } else {
            body.classList.add("light-mode");
            icon.className = "fa-solid fa-sun text-warning";
            localStorage.setItem("nevixa_theme", "light");
        }
    });

    // 9. Central de Ajuda Flutuante (Melhoria 30)
    const helpWidget = document.getElementById("help-widget");
    const helpDrawer = document.getElementById("help-drawer");
    const closeHelp = document.getElementById("btn-close-help");
    
    if (helpWidget && helpDrawer && closeHelp) {
        helpWidget.addEventListener("click", () => {
            helpDrawer.classList.toggle("active");
        });
        
        closeHelp.addEventListener("click", () => {
            helpDrawer.classList.remove("active");
        });
    }

    // 10. Conciliação Bancária OFX (Melhoria 15)
    safeAddEventListener("btn-open-ofx", "click", () => {
        openModal("modal-ofx");
    });
    
    safeAddEventListener("btn-simular-ofx-auto", "click", () => {
        executarConciliacaoOFXSimulada();
    });

    // 11. Checklist Técnico Dinâmico por Equipamento (Melhoria 2)
    // Gerenciado dinamicamente ao abrir os detalhes de cada nota.

    // 12. Faturamento Misto / Split de Notas (Melhoria 18)
    const checkFaturamentoMisto = document.getElementById("nota-faturamento-misto");
    if (checkFaturamentoMisto) {
        checkFaturamentoMisto.addEventListener("change", (e) => {
            const row = document.getElementById("row-split-faturamento");
            if (row) row.style.display = e.target.checked ? "flex" : "none";
        });
    }

    // 13. Impressão de RAT Técnico (Melhoria 1)
    safeAddEventListener("btn-imprimir-rat", "click", () => {
        document.body.classList.add("print-mode-rat");
        window.print();
        document.body.classList.remove("print-mode-rat");
    });

    // Impressão de Certificado RBC (Fase 4)
    safeAddEventListener("btn-imprimir-certificado", "click", () => {
        document.body.classList.add("print-mode-certificado");
        window.print();
        document.body.classList.remove("print-mode-certificado");
    });

    // 14. Eventos e Filtros da Fase 4 (Operações Técnicas de Campo)
    safeAddEventListener("search-equipamento", "input", () => {
        renderEquipamentos();
    });
    
    safeAddEventListener("filter-equipamento-cliente", "change", () => {
        renderEquipamentos();
    });
    
    safeAddEventListener("btn-add-equipamento", "click", () => {
        document.getElementById("form-equipamento").reset();
        document.getElementById("form-equipamento-id").value = "";
        document.getElementById("modal-equipamento-title").innerText = "Cadastrar Novo Equipamento";
        openModal("modal-equipamento");
    });
    
    safeAddEventListener("btn-add-calibrador", "click", () => {
        openNovoCalibrador();
    });
    
    safeAddEventListener("btn-add-cotacao", "click", () => {
        openNovaCotacao();
    });
    
    safeAddEventListener("btn-add-chamado", "click", () => {
        openNovoChamado();
    });

    // Submissão dos Formulários das Sub-Abas Técnicas
    safeAddEventListener("form-equipamento", "submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("form-equipamento-id").value;
        const tag = document.getElementById("eq-form-tag").value.trim();
        const serial = document.getElementById("eq-form-serial").value.trim();
        const nome = document.getElementById("eq-form-nome").value.trim();
        const cliente = document.getElementById("eq-form-cliente").value.trim();
        const status = document.getElementById("eq-form-status").value;
        const ultimaPreventiva = document.getElementById("eq-form-preventiva").value;
        const periodicidade = parseInt(document.getElementById("eq-form-periodicidade").value);
        
        if (id) {
            // Editar
            const index = state.equipments.findIndex(eq => eq.id === id);
            if (index !== -1) {
                state.equipments[index] = { 
                    ...state.equipments[index], 
                    tag, serial, nome, cliente, status, ultimaPreventiva, periodicidade 
                };
                addAuditLog("Equipamento Editado", `Modificação das configurações do ativo ${tag}`);
            }
        } else {
            // Criar
            const novoEq = {
                id: generateUUID(),
                tag, serial, nome, cliente, status, ultimaPreventiva, periodicidade
            };
            state.equipments.push(novoEq);
            addAuditLog("Equipamento Cadastrado", `Novo ativo ${tag} adicionado no hospital ${cliente}`);
        }
        
        saveStateToLocalStorage();
        closeModal("modal-equipamento");
        renderApp();
    });

    // Formulário do Novo Calibrador
    safeAddEventListener("form-novo-calibrador", "submit", (e) => {
        e.preventDefault();
        const nome = document.getElementById("cal-form-nome").value;
        const fabricante = document.getElementById("cal-form-fabricante").value;
        const serial = document.getElementById("cal-form-serial").value;
        const engenheiro = document.getElementById("cal-form-engenheiro").value;
        const crea = document.getElementById("cal-form-crea").value;
        
        const hoje = new Date();
        const ultimaCal = hoje.toISOString().slice(0, 10);
        
        const proximaData = new Date();
        proximaData.setFullYear(hoje.getFullYear() + 1);
        const proximaCal = proximaData.toISOString().slice(0, 10);
        
        const novoCal = {
            id: generateUUID(),
            nome,
            fabricante,
            serial,
            engenheiro,
            crea,
            ultimaCalibracao: ultimaCal,
            proximaCalibracao: proximaCal
        };
        
        state.calibrators.push(novoCal);
        addAuditLog("Calibrador Adicionado", `Nova ferramenta biométrica cadastrada: ${nome} - S/N: ${serial}`);
        saveStateToLocalStorage();
        closeModal("modal-novo-calibrador");
        renderApp();
        uiAlert(`Sucesso! O calibrador "${nome}" foi cadastrado e sua calibração está válida por 1 ano.`);
    });

    safeAddEventListener("form-cotacao", "submit", (e) => {
        e.preventDefault();
        const peca = document.getElementById("cot-form-peca").value.trim();
        const eqId = document.getElementById("cot-form-equipamento").value;
        const solicitante = document.getElementById("cot-form-solicitante").value.trim();
        const fornecedor = document.getElementById("cot-form-fornecedor").value.trim();
        const valor = parseFloat(document.getElementById("cot-form-valor").value);
        
        const eq = state.equipments.find(item => item.id === eqId);
        const equipamentoNome = eq ? eq.nome : "Equipamento Desconhecido";
        
        const novaCot = {
            id: generateUUID(),
            peca,
            equipamento: equipamentoNome,
            solicitante,
            fornecedor,
            valor,
            status: "Pendente"
        };
        
        state.quotations.push(novaCot);
        addAuditLog("Cotação Requisitada", `Nova cotação de ${peca} solicitada para o fornecedor ${fornecedor}`);
        
        saveStateToLocalStorage();
        closeModal("modal-cotacao");
        renderApp();
    });

    safeAddEventListener("form-chamado", "submit", (e) => {
        e.preventDefault();
        const assunto = document.getElementById("cham-form-descricao").value.trim();
        const hospital = document.getElementById("cham-form-hospital").value.trim();
        const eqId = document.getElementById("cham-form-equipamento").value;
        const tipo = document.getElementById("cham-form-tipo").value;
        const sla = parseInt(document.getElementById("cham-form-sla").value);
        
        const eq = state.equipments.find(item => item.id === eqId);
        const equipamentoNome = eq ? eq.nome : "Equipamento Geral";
        
        // Forçar o status do equipamento correspondente a "Parado" se for corretiva
        if (eq && tipo === "Corretiva") {
            eq.status = "Parado (Aguardando Visita)";
            addAuditLog("Ativo Parado", `Ativo ${eq.tag} alterado para status Parado por abertura de corretiva ${assunto}`);
        }
        
        // Gerar um número de OS sequencial
        const numOS = `OS-2026${String(state.tickets.length + 501).padStart(3, "0")}`;
        
        const isCliente = state.currentUser && state.currentUser.papel === "cliente";
        
        const novoChamado = {
            id: generateUUID(),
            numero: numOS,
            hospital,
            equipamento: equipamentoNome,
            tipo,
            dataAbertura: new Date().toISOString(),
            status: isCliente ? "Pendente" : "Em Atendimento",
            slaHoras: sla,
            assunto: assunto // Guardar o assunto/descrição para o admin ver
        };
        
        state.tickets.push(novoChamado);
        addAuditLog("Chamado Aberto", `Abertura da ordem de serviço ${numOS} - ${assunto}`);
        
        saveStateToLocalStorage();
        closeModal("modal-chamado");
        renderApp();
    });
}

// ==========================================================================
// FUNÇÕES AUXILIARES DA FASE 3 (TEMA, CONCILIAÇÃO OFX, CHECKLISTS, TRIBUTAÇÃO)
// ==========================================================================
function applyThemePreference() {
    const savedTheme = localStorage.getItem("nevixa_theme") || "dark";
    const body = document.body;
    const btn = document.getElementById("btn-toggle-theme");
    const icon = btn ? btn.querySelector("i") : null;
    
    if (savedTheme === "light") {
        body.classList.add("light-mode");
        if (icon) icon.className = "fa-solid fa-sun text-warning";
    } else {
        body.classList.remove("light-mode");
        if (icon) icon.className = "fa-solid fa-moon";
    }
}

function executarConciliacaoOFXSimulada() {
    const notasPendentes = state.invoices.filter(inv => inv.status === "Pendente");
    
    if (notasPendentes.length === 0) {
        uiAlert("Não existem Notas Fiscais pendentes na base para conciliação no momento.");
        closeModal("modal-ofx");
        return;
    }
    
    let conciliadas = 0;
    notasPendentes.forEach(inv => {
        inv.status = "Recebido";
        conciliadas++;
        
        // Registrar uma transação de entrada de recebimento associada
        const entradaRecebimento = {
            id: generateUUID(),
            tipo: "Entrada",
            data: new Date().toISOString().slice(0, 10),
            descricao: `Recebimento automatizado via Conciliação OFX - NF ${inv.numeroNota}`,
            valor: inv.valorTotal,
            categoria: "Serviços",
            status: "Pago",
            notaFiscalId: inv.id
        };
        state.transactions.push(entradaRecebimento);
        
        addAuditLog("Conciliação OFX", `Fatura da NF ${inv.numeroNota} de ${inv.cliente} baixada no valor de ${formatCurrency(inv.valorTotal)}`);
    });
    
    // Inserir uma taxa bancária de conciliação avulsa no caixa
    const taxaBancaria = {
        id: generateUUID(),
        tipo: "Saída",
        data: new Date().toISOString().slice(0, 10),
        descricao: "Tarifa bancária mensal - Custódia OFX Conciliação",
        valor: 45.00,
        categoria: "Outros",
        status: "Pago",
        notaFiscalId: ""
    };
    state.transactions.push(taxaBancaria);
    
    saveStateToLocalStorage();
    closeModal("modal-ofx");
    renderApp();
    
    uiAlert(`Sucesso! Conciliação OFX realizada: \n- ${conciliadas} Notas Fiscais baixadas como Pagas.\n- Entrada de faturamento integrada.\n- Tarifa bancária de conciliação debitada.`);
}

function renderChecklistTecnico(inv) {
    const box = document.getElementById("checklist-tecnico-box");
    const list = document.getElementById("checklist-tecnico-list");
    
    if (!box || !list) return;
    
    const eq = state.equipments.find(e => e.id === inv.equipamentoId);
    if (!eq) {
        box.style.display = "none";
        return;
    }
    
    box.style.display = "block";
    list.innerHTML = "";
    
    let checklistItens = [];
    if (eq.nome.includes("Ressonância")) {
        checklistItens = [
            "Verificar blindagem e portas de RF",
            "Checar nível e evaporação de Hélio Líquido",
            "Medir bombas de vácuo e chiller de refrigeração",
            "Calibração de homogeneidade de campo magnético"
        ];
    } else if (eq.nome.includes("Tomógrafo")) {
        checklistItens = [
            "Checar desgaste de escovas e anéis do gantry",
            "Verificar sistema de refrigeração de óleo do tubo",
            "Limpeza de detectores e alinhamento do feixe laser",
            "Calibração de ruído e uniformidade de imagem"
        ];
    } else if (eq.nome.includes("Raio-X")) {
        checklistItens = [
            "Checar funcionamento do colimador luminoso",
            "Calibração de parâmetros de kV, mA e tempo",
            "Verificar cabos de alta tensão e isolamento",
            "Verificar barreira mecânica e freios da estativa"
        ];
    } else {
        checklistItens = [
            "Inspeção visual e limpeza externa das carcaças",
            "Medição de correntes de fuga e aterramento",
            "Teste de funcionamento das interfaces de usuário",
            "Verificação do estado físico de cabos e transdutores"
        ];
    }
    
    if (!inv.checklistSalvo) {
        inv.checklistSalvo = [];
    }
    
    checklistItens.forEach(item => {
        const itemId = `chk-${item.replace(/\s+/g, '-').toLowerCase()}`;
        const isChecked = inv.checklistSalvo.includes(item);
        
        const label = document.createElement("label");
        label.className = "checklist-tecnico-item";
        label.innerHTML = `
            <input type="checkbox" id="${itemId}" ${isChecked ? 'checked' : ''}>
            <span>${item}</span>
        `;
        
        label.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked) {
                if (!inv.checklistSalvo.includes(item)) inv.checklistSalvo.push(item);
            } else {
                inv.checklistSalvo = inv.checklistSalvo.filter(i => i !== item);
            }
            saveStateToLocalStorage();
            addAuditLog("Checklist Atualizado", `Alterado checklist técnico da OS ${inv.numeroNota} - Item: "${item}"`);
        });
        
        list.appendChild(label);
    });
}

// ==========================================================================
// FUNÇÕES AUXILIARES DA FASE 4 (OPERAÇÕES TÉCNICAS DE CAMPO)
// ==========================================================================
window.openNovoCalibrador = function() {
    document.getElementById("form-novo-calibrador").reset();
    openModal("modal-novo-calibrador");
};

window.openNovaCotacao = function() {
    const select = document.getElementById("cot-form-equipamento");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Selecione o Equipamento...</option>';
    
    state.equipments.forEach(eq => {
        const opt = document.createElement("option");
        opt.value = eq.id;
        opt.innerText = `${eq.tag} - ${eq.nome}`;
        select.appendChild(opt);
    });
    
    document.getElementById("form-cotacao").reset();
    openModal("modal-cotacao");
};

window.openNovoChamado = function() {
    const select = document.getElementById("cham-form-equipamento");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Selecione o Equipamento...</option>';
    
    const isCliente = state.currentUser && state.currentUser.papel === "cliente";
    
    state.equipments.forEach(eq => {
        if (isCliente && eq.cliente !== state.currentUser.nome) return;
        
        const opt = document.createElement("option");
        opt.value = eq.id;
        opt.innerText = `${eq.tag} - ${eq.nome}`;
        select.appendChild(opt);
    });
    
    document.getElementById("form-chamado").reset();
    document.getElementById("cham-form-hospital").value = "";
    
    // Vincula o preenchimento automático do hospital ao selecionar o equipamento
    select.addEventListener("change", (e) => {
        const eqSelected = state.equipments.find(item => item.id === e.target.value);
        if (eqSelected) {
            document.getElementById("cham-form-hospital").value = eqSelected.cliente;
        }
    });
    
    openModal("modal-chamado");
};

// ==========================================================================
// FUNÇÕES AUXILIARES DA FASE 4B (FLUXO DE OS E ASSINATURAS RAT TÉCNICOS)
// ==========================================================================

// Canvas de assinatura da OS RAT
let ratDrawing = false;
let ratCanvas = null;
let ratCtx = null;

function setupRatSignatureCanvas() {
    ratCanvas = document.getElementById("rat-signature-canvas");
    if (!ratCanvas) return;
    
    ratCtx = ratCanvas.getContext("2d");
    if (!ratCtx) return;
    
    // Configuração do pincel
    ratCtx.strokeStyle = "#2563eb"; // Azul de destaque
    ratCtx.lineWidth = 3;
    ratCtx.lineCap = "round";
    ratCtx.lineJoin = "round";
    
    // Mouse events
    ratCanvas.addEventListener("mousedown", (e) => {
        ratDrawing = true;
        const rect = ratCanvas.getBoundingClientRect();
        ratCtx.beginPath();
        ratCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    ratCanvas.addEventListener("mousemove", (e) => {
        if (!ratDrawing) return;
        const rect = ratCanvas.getBoundingClientRect();
        ratCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ratCtx.stroke();
    });
    
    window.addEventListener("mouseup", () => {
        ratDrawing = false;
    });
    
    // Touch events para celular/tablet
    ratCanvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        ratDrawing = true;
        const rect = ratCanvas.getBoundingClientRect();
        const touch = e.touches[0];
        ratCtx.beginPath();
        ratCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    
    ratCanvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (!ratDrawing) return;
        const rect = ratCanvas.getBoundingClientRect();
        const touch = e.touches[0];
        ratCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ratCtx.stroke();
    }, { passive: false });
    
    ratCanvas.addEventListener("touchend", () => {
        ratDrawing = false;
    });
    
    // Botão Limpar
    const clearBtn = document.getElementById("btn-clear-rat-signature");
    if (clearBtn) {
        clearBtn.onclick = function() {
            clearSignatureCanvas("rat-signature-canvas");
        };
    }
}

function clearSignatureCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Captura a seleção de fotos reais pelo input de arquivo no modal de execução
document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "rat-exec-file") {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const preview = document.getElementById("rat-photos-preview");
        if (!preview) return;
        
        // Inicializar array de fotos se estiver vazio ou recuperar o existente
        let currentPhotos = [];
        try {
            currentPhotos = preview.dataset.photosJson ? JSON.parse(preview.dataset.photosJson) : [];
        } catch(err) {
            currentPhotos = [];
        }
        
        // Se for a primeira foto selecionada, limpa a mensagem de "Nenhuma foto selecionada"
        if (currentPhotos.length === 0) {
            preview.innerHTML = "";
        }
        
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Data = event.target.result;
                
                // Determina se é Foto de Antes ou Depois baseado na quantidade
                const titulo = currentPhotos.length % 2 === 0 ? "Antes (Defeito)" : "Depois (Corrigido)";
                
                const newPhoto = {
                    titulo: `${titulo} - ${file.name}`,
                    url: base64Data
                };
                
                currentPhotos.push(newPhoto);
                preview.dataset.photosJson = JSON.stringify(currentPhotos);
                
                // Renderizar miniatura real na tela
                const div = document.createElement("div");
                div.className = "rat-photo-thumb";
                div.innerHTML = `
                    <img src="${base64Data}" alt="${newPhoto.titulo}">
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        
        // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
        e.target.value = "";
    }
});

// Envio/Submit do Form de Execução de OS
document.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "form-executar-chamado") {
        e.preventDefault();
        const id = document.getElementById("rat-exec-id").value;
        const tk = state.tickets.find(t => t.id === id);
        if (!tk) return;
        
        const servico = document.getElementById("rat-exec-servico").value.trim();
        const respNome = document.getElementById("rat-exec-resp-nome").value.trim();
        const respCargo = document.getElementById("rat-exec-resp-cargo").value.trim();
        
        // Obter assinatura do canvas
        const canvas = document.getElementById("rat-signature-canvas");
        const assinaturaData = canvas ? canvas.toDataURL() : "";
        
        // Obter fotos
        const preview = document.getElementById("rat-photos-preview");
        const fotosJson = preview && preview.dataset.photosJson ? JSON.parse(preview.dataset.photosJson) : [];
        
        // Salvar dados no ticket
        tk.status = "Encerrado";
        tk.dataFimAtendimento = new Date().toISOString();
        tk.descricaoServico = servico;
        tk.responsavelNome = respNome;
        tk.responsavelCargo = respCargo;
        tk.responsavelAssinatura = assinaturaData;
        tk.fotos = fotosJson;
        
        // Integrar: Encontrar o equipamento associado (por nome) e restaurar seu status técnico para Operacional
        const eq = state.equipments.find(item => eqMatch(item.nome, tk.equipamento) || eqMatch(item.tag, tk.equipamento));
        if (eq) {
            eq.status = "Operacional";
            eq.ultimaPreventiva = new Date().toISOString().slice(0, 10);
            addAuditLog("Equipamento Restaurado", `Ativo ${eq.tag} voltou para Operacional após conclusão e assinatura de RAT da OS ${tk.numero}`);
        }
        
        addAuditLog("Chamado Concluído", `OS ${tk.numero} finalizada e RAT assinado por ${respNome} (${respCargo})`);
        saveStateToLocalStorage();
        closeModal("modal-executar-chamado");
        renderApp();
        uiAlert(`OS ${tk.numero} concluída com sucesso! Laudo RAT emitido e assinado digitalmente.`);
    }
});

// Visualizador de Laudo RAT
window.visualizarLaudoRAT = function(id) {
    const tk = state.tickets.find(t => t.id === id);
    if (!tk) return;
    
    document.getElementById("rat-view-numero").innerText = tk.numero;
    document.getElementById("rat-view-hospital").innerText = tk.hospital;
    document.getElementById("rat-view-equipamento").innerText = tk.equipamento;
    document.getElementById("rat-view-tipo").innerText = tk.tipo;
    document.getElementById("rat-view-sla").innerText = `${tk.slaHoras} horas`;
    
    document.getElementById("rat-view-horario-inicio").innerText = formatDateTime(tk.dataInicioAtendimento || tk.dataAbertura);
    document.getElementById("rat-view-horario-fim").innerText = formatDateTime(tk.dataFimAtendimento || new Date().toISOString());
    document.getElementById("rat-view-horario-duracao").innerText = calcularDuracaoAtendimento(tk.dataInicioAtendimento || tk.dataAbertura, tk.dataFimAtendimento || new Date().toISOString());
    
    document.getElementById("rat-view-servico").innerText = tk.descricaoServico || "Manutenção padrão realizada sem observações extras.";
    document.getElementById("rat-view-resp-nome").innerText = tk.responsavelNome || "Não informado";
    document.getElementById("rat-view-resp-cargo").innerText = tk.responsavelCargo || "Não informado";
    
    // Assinatura
    const sigImg = document.getElementById("rat-view-signature-img");
    if (tk.responsavelAssinatura) {
        sigImg.src = tk.responsavelAssinatura;
        sigImg.style.display = "block";
    } else {
        sigImg.style.display = "none";
    }
    
    // Fotos
    const photosGrid = document.getElementById("rat-view-photos-grid");
    const photosSection = document.getElementById("rat-view-photos-section");
    photosGrid.innerHTML = "";
    
    if (tk.fotos && tk.fotos.length > 0) {
        photosSection.style.display = "block";
        tk.fotos.forEach(foto => {
            const div = document.createElement("div");
            div.className = "rat-photo-view";
            div.innerHTML = `
                <img src="${foto.url}" alt="${foto.titulo}">
            `;
            photosGrid.appendChild(div);
        });
    } else {
        photosSection.style.display = "none";
    }
    
    openModal("modal-detalhes-rat");
};

// Listener do Botão Imprimir RAT Novo
document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "btn-imprimir-rat-novo") {
        e.preventDefault();
        document.body.classList.add("print-mode-rat-novo");
        window.print();
        document.body.classList.remove("print-mode-rat-novo");
    }
});

// Funções utilitárias
function formatDateTime(isoStr) {
    if (!isoStr) return "N/A";
    const date = new Date(isoStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function calcularDuracaoAtendimento(inicioStr, fimStr) {
    if (!inicioStr || !fimStr) return "N/A";
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);
    const diffMs = fim - inicio;
    
    if (diffMs <= 0) return "0 minutos";
    
    const totalMinutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    
    if (horas === 0) {
        return `${minutos} minutos`;
    }
    return `${horas}h ${minutos}m`;
}

