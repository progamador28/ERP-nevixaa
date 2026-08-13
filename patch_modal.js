const fs = require('fs');

let html = fs.readFileSync('proposta.html', 'utf8');

// 1. Replace the existing basic modal CSS with the new Signature Modal CSS
const oldModalCSSStart = '/* Custom Modal */';
const oldModalCSSEnd = '.modal-icon { font-size: 3rem; color: var(--primary-color); }';

const newModalCSS = `/* Signature Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 3000;
        }
        .signature-modal {
            background: white;
            border-radius: 8px;
            width: 100%;
            max-width: 750px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
        }
        .sig-header {
            padding: 15px 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .sig-header h3 { margin: 0; font-size: 1.1rem; color: #1f2937; font-weight: 600; }
        .sig-header button { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #9ca3af; }
        .sig-body {
            display: flex;
            min-height: 300px;
        }
        .sig-sidebar {
            width: 220px;
            background: #f9fafb;
            padding: 30px 20px;
            border-right: 1px solid #e5e7eb;
        }
        .sig-step {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            color: #111827;
            font-size: 0.95rem;
        }
        .sig-step-number {
            background: #1d4ed8;
            color: white;
            width: 28px; height: 28px;
            border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            font-size: 0.85rem;
        }
        .sig-content {
            flex: 1;
            padding: 30px 40px;
            display: flex;
            flex-direction: column;
        }
        .sig-field { margin-bottom: 25px; }
        .sig-label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .sig-value { font-size: 0.95rem; color: #111827; }
        .sig-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .sig-input:focus { border-color: var(--primary-color); }
        .sig-checkbox-group {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-top: 10px;
        }
        .sig-checkbox-group input { margin-top: 4px; cursor: pointer; width: 16px; height: 16px; }
        .sig-checkbox-label { font-size: 0.85rem; color: #4b5563; line-height: 1.4; cursor: pointer; }
        
        .sig-footer {
            margin-top: auto;
            display: flex;
            justify-content: flex-end;
            gap: 15px;
            padding-top: 20px;
        }
        .btn-sig-cancel {
            padding: 10px 20px;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-sig-submit {
            padding: 10px 30px;
            border-radius: 6px;
            border: none;
            background: #1d4ed8;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-sig-submit:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const startIndex = html.indexOf(oldModalCSSStart);
const endIndex = html.indexOf(oldModalCSSEnd) + oldModalCSSEnd.length;
if (startIndex !== -1 && endIndex !== -1) {
    html = html.substring(0, startIndex) + newModalCSS + html.substring(endIndex);
}

// 2. Replace the HTML Modal
const oldHTMLModalStart = '<!-- Custom Modal -->';
const oldHTMLModalEnd = '</div>\n    </div>';

const newHTMLModal = `<!-- Signature Modal -->
    <div class="modal-overlay" id="custom-modal">
        <div class="signature-modal">
            <div class="sig-header">
                <h3 id="modal-top-title">Assinatura do documento</h3>
                <button onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="sig-body">
                <div class="sig-sidebar">
                    <div class="sig-step">
                        <div class="sig-step-number">1</div>
                        <span id="modal-step-text">Assinar Documento</span>
                    </div>
                </div>
                <div class="sig-content">
                    <div class="sig-field">
                        <span class="sig-label">Nome Completo</span>
                        <div class="sig-value" id="sig-client-name">Carregando...</div>
                    </div>
                    <div class="sig-field" id="sig-cpf-container">
                        <span class="sig-label">CPF / CNPJ *</span>
                        <input type="text" id="sig-cpf" class="sig-input" placeholder="000.000.000-00">
                    </div>
                    
                    <div class="sig-checkbox-group" id="sig-terms-container">
                        <input type="checkbox" id="sig-terms" onchange="toggleSigButton()">
                        <label for="sig-terms" class="sig-checkbox-label">
                            Concordo em assinar este documento digitalmente conforme regulamentado pela Lei No 14.063 de 23 de Setembro de 2020.
                        </label>
                    </div>

                    <div class="sig-footer">
                        <button class="btn-sig-cancel" onclick="closeModal()">Cancelar</button>
                        <button class="btn-sig-submit" id="custom-modal-confirm" onclick="executeModalAction()" disabled>ASSINAR</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

const htmlStartIndex = html.indexOf(oldHTMLModalStart);
const htmlEndIndex = html.indexOf(oldHTMLModalEnd, htmlStartIndex) + oldHTMLModalEnd.length;

if (htmlStartIndex !== -1 && htmlEndIndex !== -1) {
    html = html.substring(0, htmlStartIndex) + newHTMLModal + html.substring(htmlEndIndex);
}

// 3. Update JS Logic for the new Modal
const oldJS = `function responderProposta(resposta) {
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
        }`;

const newJS = `function responderProposta(resposta) {
            pendingAction = resposta;
            const btnConfirm = document.getElementById('custom-modal-confirm');
            const stepText = document.getElementById('modal-step-text');
            const topTitle = document.getElementById('modal-top-title');
            const termsContainer = document.getElementById('sig-terms-container');
            const cpfContainer = document.getElementById('sig-cpf-container');
            
            document.getElementById('sig-client-name').innerText = orcamentoGlobal.cliente || "Cliente Não Especificado";
            document.getElementById('sig-cpf').value = '';
            document.getElementById('sig-terms').checked = false;

            if (resposta === 'Aprovado') {
                topTitle.innerText = "Assinatura do documento";
                stepText.innerText = "Assinar Documento";
                btnConfirm.innerHTML = 'ASSINAR';
                btnConfirm.style.background = '#1d4ed8'; // DocSales blue
                termsContainer.style.display = 'flex';
                cpfContainer.style.display = 'block';
                btnConfirm.disabled = true; // wait for checkbox
            } else {
                topTitle.innerText = "Reprovar documento";
                stepText.innerText = "Confirmar Reprovação";
                btnConfirm.innerHTML = 'REPROVAR';
                btnConfirm.style.background = '#ef4444'; // Red
                termsContainer.style.display = 'none';
                cpfContainer.style.display = 'none';
                btnConfirm.disabled = false; // No terms needed
            }
            document.getElementById('custom-modal').style.display = 'flex';
        }

        function toggleSigButton() {
            const isChecked = document.getElementById('sig-terms').checked;
            const cpf = document.getElementById('sig-cpf').value.trim();
            if (pendingAction === 'Aprovado') {
                document.getElementById('custom-modal-confirm').disabled = !(isChecked && cpf.length > 0);
            }
        }
        
        // Add listener to CPF to toggle button
        document.addEventListener('DOMContentLoaded', () => {
            const cpfInput = document.getElementById('sig-cpf');
            if (cpfInput) {
                cpfInput.addEventListener('input', toggleSigButton);
            }
        });`;

html = html.replace(oldJS, newJS);

// 4. In `executeModalAction()`, we want to add the CPF to the payload if approved, but for now we just change status
html = html.replace('const resposta = pendingAction;', 'const resposta = pendingAction;\n            const cpfAssinatura = document.getElementById(\'sig-cpf\').value;');

// Find the line cloudData.quotations[index].status = resposta; and add the CPF
html = html.replace('cloudData.quotations[index].status = resposta;', 'cloudData.quotations[index].status = resposta;\n                if(resposta === \'Aprovado\') cloudData.quotations[index].cpfAssinatura = cpfAssinatura;');

fs.writeFileSync('proposta.html', html);
console.log("Modal replaced successfully.");
