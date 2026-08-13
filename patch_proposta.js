const fs = require('fs');

let html = fs.readFileSync('proposta.html', 'utf8');

// 1. CSS Logo
html = html.replace(/max-height: 80px;\s*max-width: 200px;/g, 'max-height: 120px;\n            max-width: 250px;');

// 2. CSS Tables and Modal
const cssToInsert = `
        .table-responsive {
            width: 100%;
            overflow-x: auto;
            margin-bottom: 20px;
        }
        table {
            min-width: 600px;
        }
        /* Custom Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 3000;
            backdrop-filter: blur(4px);
        }
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--primary-dark); margin: 15px 0 10px; }
        .modal-text { color: var(--text-light); margin-bottom: 25px; line-height: 1.5; }
        .modal-buttons { display: flex; gap: 15px; justify-content: center; }
        .modal-buttons .btn { flex: 1; justify-content: center; padding: 12px 10px; }
        .modal-icon { font-size: 3rem; color: var(--primary-color); }
`;
html = html.replace('/* Tables */', cssToInsert + '\n        /* Tables */');

// 3. Remove base64 injection
html = html.replace('<script src="logo_b64.js"></script>', '');
html = html.replace(/\/\/ Injetar logo base64 se disponível[\s\S]*?\}\s*const urlParams = new URLSearchParams/g, 'const urlParams = new URLSearchParams');

// 4. Update Header Phone and Logo src
html = html.replace('Telefone: +55 (98) 98403-425', 'Telefone: +55 (96) 98403-4257');
html = html.replace('src=""', 'src="logo-proposta.png"');

// 5. Wrap Tables
html = html.replace(/<table class="info-table">/g, '<div class="table-responsive"><table class="info-table">');
html = html.replace(/<\/table>\s*<div class="section-title">II\. SERVIÇOS E PRODUTOS/g, '</table></div>\n\n        <div class="section-title">II. SERVIÇOS E PRODUTOS');

html = html.replace(/<table class="items-table">/g, '<div class="table-responsive"><table class="items-table">');
html = html.replace(/<\/table>\s*<div class="section-title">III\. CONDIÇÕES/g, '</table></div>\n\n        <div class="section-title">III. CONDIÇÕES');

// 6. Inject Modal HTML at the end of body
const modalHtml = `
    <!-- Custom Modal -->
    <div class="modal-overlay" id="custom-modal">
        <div class="modal-content">
            <i class="fa-solid fa-circle-question modal-icon"></i>
            <h3 class="modal-title">Confirmar Ação</h3>
            <p class="modal-text" id="custom-modal-text">Tem certeza?</p>
            <div class="modal-buttons">
                <button class="btn" style="background: #e2e8f0; color: #334155;" onclick="closeModal()">Cancelar</button>
                <button class="btn btn-approve" id="custom-modal-confirm" onclick="">Confirmar</button>
            </div>
        </div>
    </div>
`;
html = html.replace('</body>', modalHtml + '\n</body>');

// 7. Update JS responderProposta logic
const jsLogic = `
        let pendingAction = null;
        
        function responderProposta(resposta) {
            pendingAction = resposta;
            document.getElementById('custom-modal-text').innerText = \`Tem certeza que deseja \${resposta.toUpperCase()} esta proposta comercial?\`;
            const btnConfirm = document.getElementById('custom-modal-confirm');
            if (resposta === 'Aprovado') {
                btnConfirm.className = 'btn btn-approve';
                btnConfirm.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar';
            } else {
                btnConfirm.className = 'btn btn-reject';
                btnConfirm.innerHTML = '<i class="fa-solid fa-xmark"></i> Reprovar';
            }
            document.getElementById('custom-modal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('custom-modal').style.display = 'none';
            pendingAction = null;
        }

        async function executeModalAction() {
            if (!pendingAction) return;
            const resposta = pendingAction;
            closeModal();
            
            const botoes = document.querySelectorAll('.action-bar .btn');
            botoes.forEach(b => b.disabled = true);
            botoes.forEach(b => b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...');

            try {
`;
html = html.replace(/async function responderProposta\(resposta\) \{[\s\S]*?try \{/g, jsLogic);

// Add missing function execution for modal confirm click
html = html.replace(/id="custom-modal-confirm" onclick=""/g, 'id="custom-modal-confirm" onclick="executeModalAction()"');

fs.writeFileSync('proposta.html', html);
console.log('patched');
