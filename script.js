document.addEventListener('DOMContentLoaded', () => {
    const inputTextarea = document.getElementById('inputText');
    const organizeButton = document.getElementById('organizeButton');
    const resultsContainer = document.getElementById('resultsContainer');

    organizeButton.addEventListener('click', organizeInformation);

    /**
     * Processa o texto de entrada, extraindo e organizando as informações dos produtos F5.
     */
    function organizeInformation() {
        const text = inputTextarea.value;
        if (!text.trim()) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Por favor, cole um texto para processar.</p>';
            return;
        }

        const organizedData = [];

        // 1. Separar o texto completo em blocos de produto.
        // Cada bloco começa com a linha que contém '# F5 Product Information for '.
        const lines = text.split('\n');
        let blocks = [];
        let currentBlockContent = '';

        for (const line of lines) {
            // Detecta o início de um novo bloco de informações de produto
            if (line.trim().startsWith('# F5 Product Information for ')) {
                // Se houver conteúdo no bloco anterior, adiciona-o antes de iniciar um novo
                if (currentBlockContent.trim() !== '') {
                    blocks.push(currentBlockContent);
                }
                currentBlockContent = line + '\n'; // Inicia o novo bloco com o cabeçalho
            } else {
                currentBlockContent += line + '\n'; // Adiciona a linha ao bloco atual
            }
        }
        // Adiciona o último bloco após o loop
        if (currentBlockContent.trim() !== '') {
            blocks.push(currentBlockContent);
        }

        // 2. Definir as Expressões Regulares (Regex) para extração de dados

        // Captura APENAS o Part Number (ex: F5-BIG-LTM-I5600), ignorando o restante da descrição.
        const f5ProductPartNumberRegex = /^\s*F5 Product\s+:\s+([A-Z0-9-]+)\s+.*$/m;

        // Captura o Serial Number principal do appliance (ex: f5-pwfx-jlmz).
        const mainSerialNumberLineRegex = /^\s*Serial Number\s+:\s+(f5-[a-zA-Z0-9-]+)\s+\(.+\)$/m;

        // Captura datas e o texto em parênteses para "Entitled Service".
        const entitledServiceLineRegex = /^\s*Entitled Service\s+:\s+(\d{2}-\d{2}-\d{4})\s+-\s+(\d{2}-\d{2}-\d{4})\s+\(([^)]+)\)$/gm;

        // Captura o conteúdo *após* o segundo parêntese para "License Modules".
        // Ex: "GUZEYMN (Active) LIC-PKG-BIG-LTM-I5600" -> "LIC-PKG-BIG-LTM-I5600".
        const licenseModuleEntryRegex = /^\s*Serial Number\s+:\s+[A-Z0-9]+\s+\([^)]+\)\s+(.+)$/gm;

        // Captura o conteúdo *dentro* do parêntese para "Hardware and Software Options".
        // Ex: "ZKACHDJX (F5-ADD-BIG-I58XX)" -> "F5-ADD-BIG-I58XX".
        const hardwareOptionEntryRegex = /^\s*Serial Number\s+:\s+[A-Z0-9]+\s+\(([^)]+)\)$/gm;


        // 3. Processar cada bloco de produto
        blocks.forEach(blockText => {
            let currentMainSerialNumber = null;
            let currentPartNumber = null;

            // Extrair o Serial Number principal do bloco
            const mainSNMatch = blockText.match(mainSerialNumberLineRegex);
            if (mainSNMatch && mainSNMatch[1]) {
                currentMainSerialNumber = mainSNMatch[1];
            } else {
                console.warn("Não foi possível encontrar o Serial Number principal para um bloco de produto. Bloco ignorado.");
                return; // Pula este bloco se não encontrar o SN principal
            }

            // Extrair o Part Number do produto F5
            const f5ProductMatch = blockText.match(f5ProductPartNumberRegex);
            if (f5ProductMatch && f5ProductMatch[1]) {
                currentPartNumber = f5ProductMatch[1];
                // Adicionar a entrada do Part Number como a primeira para este SN principal
                organizedData.push({
                    serialNumber: currentMainSerialNumber,
                    startDate: '', // Vazio conforme solicitado
                    endDate: '',   // Vazio conforme solicitado
                    productName: currentPartNumber
                });
            } else {
                console.warn(`Não foi possível encontrar o Part Number para o Serial Number: ${currentMainSerialNumber}.`);
            }

            // Extrair todas as entradas de "Entitled Service" dentro deste bloco
            // Usar `matchAll` com a flag 'g' para encontrar todas as ocorrências
            const serviceMatches = [...blockText.matchAll(entitledServiceLineRegex)];
            serviceMatches.forEach(match => {
                organizedData.push({
                    serialNumber: currentMainSerialNumber,
                    startDate: match[1], // Data de início
                    endDate: match[2],   // Data de término
                    productName: match[3].trim() // Conteúdo dentro do parênteses
                });
            });

            // Extrair todas as entradas de "License Modules" dentro deste bloco
            const licenseModuleMatches = [...blockText.matchAll(licenseModuleEntryRegex)];
            licenseModuleMatches.forEach(match => {
                organizedData.push({
                    serialNumber: currentMainSerialNumber,
                    startDate: '',
                    endDate: '',
                    productName: match[1].trim() // Conteúdo *após* o segundo parêntese
                });
            });

            // Extrair todas as entradas de "Hardware and Software Options" dentro deste bloco
            const hardwareOptionMatches = [...blockText.matchAll(hardwareOptionEntryRegex)];
            hardwareOptionMatches.forEach(match => {
                organizedData.push({
                    serialNumber: currentMainSerialNumber,
                    startDate: '',
                    endDate: '',
                    productName: match[1].trim() // Conteúdo *dentro* do parêntese
                });
            });
        });

        displayTable(organizedData);
    }

    /**
     * Constrói e exibe a tabela HTML com os dados organizados.
     * @param {Array<Object>} data - Um array de objetos contendo as informações a serem exibidas.
     */
    function displayTable(data) {
        if (data.length === 0) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Nenhuma informação relevante encontrada no texto fornecido.</p>';
            return;
        }

        let tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th scope="col">Serial Number</th>
                        <th scope="col">Start Date</th>
                        <th scope="col">End Date</th>
                        <th scope="col">Product Name</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${item.serialNumber}</td>
                    <td>${item.startDate}</td>
                    <td>${item.endDate}</td>
                    <td>${item.productName}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        resultsContainer.innerHTML = tableHtml;
    }
});