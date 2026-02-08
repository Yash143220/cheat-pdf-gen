// ======================================
// GLOBAL STATE
// ======================================
let uploadedFiles = []; // Array of {file: File, pageRange: string, pages: number}
let pdfDoc = null;
let totalPages = 0;
let selectedLayout = 6; // Default 6-in-1
let currentStep = 1;

// Configuration
const config = {
    orientation: 'auto',
    margins: 5,
    spacing: 3,
    border: 'normal',
    scale: 'fit',
    autoRotate: true,
    pageNumbers: false,
    marginNote: ''
};

// Settings history for undo/redo
let settingsHistory = [JSON.parse(JSON.stringify(config))];
let historyIndex = 0;

// ======================================
// INITIALIZATION
// ======================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
});

function initEventListeners() {
    // Upload handlers
    const uploadZone = document.getElementById('uploadZone');
    const pdfInput = document.getElementById('pdfInput');
    
    uploadZone.addEventListener('click', () => pdfInput.click());
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary)';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-normal)';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-normal)';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(Array.from(e.dataTransfer.files));
        }
    });
    
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(Array.from(e.target.files));
        }
    });
    
    document.getElementById('addMoreFiles').addEventListener('click', () => pdfInput.click());
    document.getElementById('nextToLayout').addEventListener('click', () => goToStep(2));
    
    // Layout selection
    document.querySelectorAll('.layout-card').forEach(card => {
        card.addEventListener('click', async () => {
            document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedLayout = parseInt(card.dataset.layout);
            
            // Update preview hint text
            const previewHint = document.getElementById('previewHint');
            if (previewHint) {
                previewHint.textContent = `Shows how up to ${selectedLayout} pages will be arranged on one sheet`;
            }
            
            await updatePreview(); // Update preview when layout changes
        });
    });
    
    // Select default layout
    document.querySelector('[data-layout="6"]').classList.add('selected');
    
    // Navigation
    document.getElementById('backToUpload').addEventListener('click', () => goToStep(1));
    document.getElementById('nextToCustomize').addEventListener('click', () => goToStep(3));
    document.getElementById('backToLayout').addEventListener('click', () => goToStep(2));
    document.getElementById('nextToGenerate').addEventListener('click', generatePDF);
    document.getElementById('startOver').addEventListener('click', () => location.reload());
    
    // Settings with history tracking
    const settingElements = {
        orientation: document.getElementById('orientation'),
        margins: document.getElementById('margins'),
        spacing: document.getElementById('spacing'),
        border: document.getElementById('border'),
        scale: document.getElementById('scale'),
        autoRotate: document.getElementById('autoRotate'),
        pageNumbers: document.getElementById('pageNumbers'),
        marginNote: document.getElementById('marginNote')
    };
    
    // Add listeners that save to history (with null checks)
    settingElements.orientation?.addEventListener('change', (e) => updateConfig('orientation', e.target.value));
    settingElements.margins?.addEventListener('input', (e) => updateConfig('margins', parseFloat(e.target.value)));
    settingElements.spacing?.addEventListener('input', (e) => updateConfig('spacing', parseFloat(e.target.value)));
    settingElements.border?.addEventListener('change', (e) => updateConfig('border', e.target.value));
    settingElements.scale?.addEventListener('change', (e) => updateConfig('scale', e.target.value));
    settingElements.autoRotate?.addEventListener('change', (e) => updateConfig('autoRotate', e.target.checked));
    settingElements.pageNumbers?.addEventListener('change', (e) => updateConfig('pageNumbers', e.target.checked));
    settingElements.marginNote?.addEventListener('input', (e) => updateConfig('marginNote', e.target.value));
    
    // Undo/Redo (with null checks)
    document.getElementById('undoSettings')?.addEventListener('click', undoSettings);
    document.getElementById('redoSettings')?.addEventListener('click', redoSettings);
    
    // Print guide modal with focus management
    let modalTrigger = null;
    const printModal = document.getElementById('printModal');
    const closePrintModalBtn = document.getElementById('closePrintModal');
    const gotItBtn = document.getElementById('gotItBtn');
    
    function openModal() {
        modalTrigger = document.activeElement;
        printModal.classList.add('show');
        printModal.setAttribute('aria-hidden', 'false');
        closePrintModalBtn.focus();
    }
    
    function closeModal() {
        printModal.classList.remove('show');
        printModal.setAttribute('aria-hidden', 'true');
        if (modalTrigger) {
            modalTrigger.focus();
            modalTrigger = null;
        }
    }
    
    // Focus trap for modal
    const focusableElementsString = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    printModal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            return;
        }
        
        if (e.key === 'Tab') {
            const focusableElements = printModal.querySelectorAll(focusableElementsString);
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
    
    document.getElementById('showPrintGuide').addEventListener('click', openModal);
    closePrintModalBtn.addEventListener('click', closeModal);
    gotItBtn.addEventListener('click', closeModal);
    
    // Close modal on outside click
    printModal.addEventListener('click', (e) => {
        if (e.target.id === 'printModal') {
            closeModal();
        }
    });
}

// ======================================
// FILE HANDLING
// ======================================
async function handleFileUpload(files) {
    // Filter only PDF files
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        alert('Please upload PDF files only');
        return;
    }
    
    // Check file sizes
    for (const file of pdfFiles) {
        if (file.size > 50 * 1024 * 1024) {
            alert(`File "${file.name}" is too large. Max size is 50MB.`);
            return;
        }
    }
    
    // Add to uploaded files with metadata
    for (const file of pdfFiles) {
        if (!uploadedFiles.find(f => f.file.name === file.name)) {
            uploadedFiles.push({
                file: file,
                pageRange: '',
                pages: 0
            });
        }
    }
    
    await updateFileList();
    showAdvancedOptions();
}

async function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    fileList.style.display = 'block';
    
    totalPages = 0;
    
    for (let i = 0; i < uploadedFiles.length; i++) {
        const fileData = uploadedFiles[i];
        const file = fileData.file;
        let pages = 0;
        let isValid = true;
        
        // Load PDF to get page count (with error handling)
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pages = pdf.numPages;
            fileData.pages = pages;
            
            // Calculate actual pages based on page range
            if (fileData.pageRange && fileData.pageRange.trim() !== '') {
                const selectedPages = parsePageRange(fileData.pageRange, pages);
                totalPages += selectedPages.length;
            } else {
                totalPages += pages;
            }
        } catch (error) {
            console.error(`Failed to load PDF "${file.name}":`, error);
            isValid = false;
        }
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item-extended';
        fileItem.innerHTML = `
            <div class="file-item-header">
                <div class="file-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${isValid ? `${pages} pages • ${(file.size / 1024 / 1024).toFixed(2)} MB` : `Invalid PDF • ${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                </div>
                <button class="btn-remove" data-index="${i}">✕</button>
            </div>
            ${uploadedFiles.length > 1 || pages > 10 ? `
            <div class="file-item-options">
                <label>Page Range (optional)</label>
                <input type="text" class="page-range-input" data-index="${i}" placeholder="e.g., 1-10, 15, 20-25 or leave blank for all pages" value="${fileData.pageRange || ''}">
                <small class="hint">Leave blank to include all ${pages} pages</small>
            </div>` : ''}
        `;
        
        fileItem.querySelector('.btn-remove').addEventListener('click', () => removeFile(i));
        const pageRangeInput = fileItem.querySelector('.page-range-input');
        if (pageRangeInput) {
            pageRangeInput.addEventListener('input', (e) => {
                fileData.pageRange = e.target.value;
                updateFileList(); // Refresh to update total pages
            });
        }
        fileList.appendChild(fileItem);
    }
    
    document.getElementById('nextToLayout').style.display = uploadedFiles.length > 0 ? 'block' : 'none';
}

async function removeFile(index) {
    uploadedFiles.splice(index, 1);
    if (uploadedFiles.length === 0) {
        resetUpload();
    } else {
        await updateFileList();
    }
}

function showAdvancedOptions() {
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('advancedOptions').style.display = 'block';
}

function resetUpload() {
    uploadedFiles = [];
    pdfDoc = null;
    totalPages = 0;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('fileList').style.display = 'none';
    document.getElementById('advancedOptions').style.display = 'none';
    document.getElementById('nextToLayout').style.display = 'none';
    document.getElementById('pdfInput').value = '';
}

// ======================================
// SETTINGS MANAGEMENT
// ======================================
function updateConfig(key, value) {
    config[key] = value;
    saveToHistory();
}

function saveToHistory() {
    // Remove any forward history
    settingsHistory = settingsHistory.slice(0, historyIndex + 1);
    
    // Add new state
    settingsHistory.push(JSON.parse(JSON.stringify(config)));
    historyIndex++;
    
    // Limit history to 20 items
    if (settingsHistory.length > 20) {
        settingsHistory.shift();
        historyIndex--;
    }
    
    updateHistoryButtons();
}

function undoSettings() {
    if (historyIndex > 0) {
        historyIndex--;
        Object.assign(config, settingsHistory[historyIndex]);
        updateSettingsUI();
        updateHistoryButtons();
    }
}

function redoSettings() {
    if (historyIndex < settingsHistory.length - 1) {
        historyIndex++;
        Object.assign(config, settingsHistory[historyIndex]);
        updateSettingsUI();
        updateHistoryButtons();
    }
}

function updateHistoryButtons() {
    document.getElementById('undoSettings').disabled = historyIndex === 0;
    document.getElementById('redoSettings').disabled = historyIndex === settingsHistory.length - 1;
}

function updateSettingsUI() {
    document.getElementById('orientation').value = config.orientation;
    document.getElementById('margins').value = config.margins;
    document.getElementById('spacing').value = config.spacing;
    document.getElementById('border').value = config.border;
    document.getElementById('scale').value = config.scale;
    document.getElementById('autoRotate').checked = config.autoRotate;
    document.getElementById('pageNumbers').checked = config.pageNumbers;
    document.getElementById('marginNote').value = config.marginNote;
}

// ======================================
// PAGE RANGE PARSING
// ======================================
function parsePageRange(rangeStr, totalPages) {
    if (!rangeStr || rangeStr.trim() === '') {
        return Array.from({length: totalPages}, (_, i) => i + 1);
    }
    
    const pages = new Set();
    const parts = rangeStr.split(',');
    
    for (const part of parts) {
        const trimmed = part.trim();
        
        if (trimmed.includes('-')) {
            // Range like "1-10"
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
            if (isNaN(start) || isNaN(end)) continue;
            
            for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                pages.add(i);
            }
        } else {
            // Single page like "15"
            const pageNum = parseInt(trimmed);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pages.add(pageNum);
            }
        }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
}

// ======================================
// LIVE PREVIEW
// ======================================
async function updatePreview() {
    console.log('=== updatePreview() called ===');
    console.log('uploadedFiles.length:', uploadedFiles.length);
    console.log('selectedLayout:', selectedLayout);
    
    if (uploadedFiles.length === 0) {
        console.log('No files uploaded, skipping preview');
        return;
    }
    
    const canvas = document.getElementById('previewCanvas');
    if (!canvas) {
        console.error('Preview canvas not found in DOM');
        return;
    }
    console.log('Canvas element found:', canvas);
    
    const ctx = canvas.getContext('2d');
    console.log('Canvas context obtained:', ctx);
    
    // Set fixed A4 aspect ratio (210mm x 297mm = 1:1.414)
    const A4_ASPECT = 1.414; // height/width ratio
    const previewWidth = 500; // Fixed width
    const previewHeight = Math.round(previewWidth * A4_ASPECT);
    
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    canvas.style.display = 'block';
    console.log(`Canvas sized (A4 aspect): ${canvas.width}x${canvas.height}`);
    
    // Show loading state
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666666';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading preview...', canvas.width / 2, canvas.height / 2);
    console.log('Loading state rendered');
    
    try {
        // Load first PDF
        console.log('Loading PDF file...');
        const arrayBuffer = await uploadedFiles[0].file.arrayBuffer();
        console.log('ArrayBuffer loaded, size:', arrayBuffer.byteLength);
        
        console.log('Calling pdfjsLib.getDocument...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        console.log('Loading task created:', loadingTask);
        
        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully, pages:', pdf.numPages);
        
        // Determine grid
        const gridMap = {
            2: { cols: 2, rows: 1 },
            4: { cols: 2, rows: 2 },
            6: { cols: 3, rows: 2 },
            9: { cols: 3, rows: 3 }
        };
        const { cols, rows } = gridMap[selectedLayout];
        console.log(`Grid layout: ${cols}x${rows}`);
        
        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log('White background filled');
        
        // Draw grid
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;
        console.log(`Cell size: ${cellWidth}x${cellHeight}`);
        
        // Render actual pages in sequence (not repeated)
        const totalCells = cols * rows;
        const pagesToRender = Math.min(totalCells, pdf.numPages);
        
        for (let i = 0; i < pagesToRender; i++) {
            const pageNum = i + 1;
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            const scale = Math.min(cellWidth / viewport.width, cellHeight / viewport.height) * 0.85;
            const scaledViewport = page.getViewport({ scale });
            
            const x = col * cellWidth + (cellWidth - scaledViewport.width) / 2;
            const y = row * cellHeight + (cellHeight - scaledViewport.height) / 2;
            
            console.log(`Rendering page ${pageNum} at cell [${row},${col}] position (${x}, ${y})`);
            
            // Render page
            const renderTask = page.render({
                canvasContext: ctx,
                viewport: scaledViewport,
                transform: [1, 0, 0, 1, x, y]
            });
            await renderTask.promise;
            console.log(`Page ${pageNum} rendered`);
            
            // Draw border
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
        }
        
        // Fill remaining cells with placeholder if needed
        for (let i = pagesToRender; i < totalCells; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = col * cellWidth;
            const y = row * cellHeight;
            
            // Draw empty cell
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, cellWidth, cellHeight);
            ctx.setLineDash([]);
            
            // Draw text
            ctx.fillStyle = '#cccccc';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Pages', x + cellWidth / 2, y + cellHeight / 2);
        }
        
        console.log('✅ Preview rendered successfully!');
    } catch (error) {
        console.error('❌ Preview error:', error);
        console.error('Error stack:', error.stack);
        // Show error in canvas (keep A4 size)
        const A4_ASPECT = 1.414;
        canvas.width = 500;
        canvas.height = Math.round(500 * A4_ASPECT);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Preview failed to load', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#999999';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(error.message || 'Unknown error', canvas.width / 2, canvas.height / 2 + 10);
    }
}

// ======================================
// FILE HANDLING
// ======================================
// ======================================
// NAVIGATION
// ======================================
async function goToStep(step) {
    // Scroll to top FIRST (before changing content)
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(s => s.style.display = 'none');
    
    // Show target step
    document.getElementById(`step${step}`).style.display = 'block';
    
    // Update step indicator
    document.querySelectorAll('.step').forEach((s, i) => {
        s.classList.remove('active', 'completed');
        if (i + 1 === step) {
            s.classList.add('active');
        } else if (i + 1 < step) {
            s.classList.add('completed');
        }
    });
    
    currentStep = step;
    
    // Generate preview when entering step 2 (with delay to ensure DOM is ready)
    if (step === 2) {
        // Update preview hint text
        const previewHint = document.getElementById('previewHint');
        if (previewHint) {
            previewHint.textContent = `Shows how up to ${selectedLayout} pages will be arranged on one sheet`;
        }
        
        setTimeout(async () => {
            await updatePreview();
        }, 100);
    }
    
    // Scroll again after a tiny delay to ensure content is rendered
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, 10);
}

// ======================================
// CRITICAL: FRONT & BACK PRINTING LAYOUT LOGIC
// ======================================

/**
 * Calculates the correct page arrangement for front-and-back (two-sided) printing
 * 
 * FRONT SIDE: Odd pages arranged left-to-right, top-to-bottom
 * BACK SIDE: Even pages with same row order but horizontally reversed within each row
 * 
 * Example for 9-in-1 (3x3 grid):
 * 
 * FRONT (odd pages):         BACK (even pages):
 * 1  3  5                    6  4  2
 * 7  9  11                   12 10 8
 * 13 15 17                   18 16 14
 * 
 * This ensures when printed on both sides (flip on long edge):
 * Page 1 is physically behind page 2
 * Page 3 is physically behind page 4
 * And so on...
 */
function calculateImpositionLayout(totalPages, layout) {
    // Determine grid dimensions
    const gridMap = {
        2: { cols: 2, rows: 1 },
        4: { cols: 2, rows: 2 },
        6: { cols: 3, rows: 2 },
        9: { cols: 3, rows: 3 }
    };
    
    const { cols, rows } = gridMap[layout];
    const pagesPerSheet = cols * rows;
    
    // Each physical sheet has front AND back, so it holds 2 * pagesPerSheet pages total
    const totalPagesPerPhysicalSheet = pagesPerSheet * 2;
    
    // Calculate total physical sheets needed
    const totalSheets = Math.ceil(totalPages / totalPagesPerPhysicalSheet);
    
    const sheets = [];
    
    for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
        const basePageNum = sheetIndex * totalPagesPerPhysicalSheet;
        
        // FRONT SIDE: Odd pages (1, 3, 5, 7, ...)
        const frontPages = [];
        for (let i = 0; i < pagesPerSheet; i++) {
            const pageNum = basePageNum + (i * 2) + 1; // Odd pages: 1, 3, 5, ...
            frontPages.push(pageNum <= totalPages ? pageNum : null);
        }
        
        // BACK SIDE: Even pages (2, 4, 6, 8, ...)
        // Arranged in reverse order within each row for front-and-back alignment
        const backPages = [];
        for (let row = 0; row < rows; row++) {
            const rowPages = [];
            for (let col = 0; col < cols; col++) {
                const gridIndex = row * cols + col;
                const pageNum = basePageNum + (gridIndex * 2) + 2; // Even pages: 2, 4, 6, ...
                rowPages.push(pageNum <= totalPages ? pageNum : null);
            }
            // CRITICAL: Reverse the row for front-and-back alignment
            backPages.push(...rowPages.reverse());
        }
        
        // Only add sheet if it has at least one page
        const hasFrontContent = frontPages.some(p => p !== null);
        const hasBackContent = backPages.some(p => p !== null);
        
        if (hasFrontContent || hasBackContent) {
            sheets.push({
                front: arrangeInGrid(frontPages, cols, rows),
                back: arrangeInGrid(backPages, cols, rows)
            });
        }
    }
    
    return { sheets, cols, rows, totalSheets: sheets.length };
}

/**
 * Arranges pages into a 2D grid
 */
function arrangeInGrid(pages, cols, rows) {
    const grid = [];
    for (let row = 0; row < rows; row++) {
        const rowPages = [];
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            rowPages.push(pages[index] || null);
        }
        grid.push(rowPages);
    }
    return grid;
}

// ======================================
// PDF GENERATION
// ======================================
async function generatePDF() {
    goToStep(4);
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    try {
        // Step 1: Combine multiple PDFs if needed with per-file page ranges
        progressText.textContent = 'Loading and combining PDFs...';
        progressFill.style.width = '5%';
        
        const combinedPdf = await PDFLib.PDFDocument.create();
        let actualTotalPages = 0;
        
        for (const fileData of uploadedFiles) {
            const arrayBuffer = await fileData.file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Apply per-file page range
            let pageIndices;
            if (fileData.pageRange && fileData.pageRange.trim() !== '') {
                const selectedPages = parsePageRange(fileData.pageRange, pdf.getPageCount());
                pageIndices = selectedPages.map(p => p - 1); // Convert to 0-indexed
            } else {
                pageIndices = pdf.getPageIndices();
            }
            
            const pages = await combinedPdf.copyPages(pdf, pageIndices);
            pages.forEach(page => combinedPdf.addPage(page));
            actualTotalPages += pages.length;
        }
        
        const combinedBytes = await combinedPdf.save();
        const sourcePdf = await PDFLib.PDFDocument.load(combinedBytes);
        
        // Step 2: Apply global page range filter (if specified)
        progressText.textContent = 'Applying page range...';
        progressFill.style.width = '10%';
        
        // No global page range - use all pages from combined PDF
        const selectedPages = Array.from({length: actualTotalPages}, (_, i) => i + 1);
        const filteredTotalPages = selectedPages.length;
        
        // Step 3: Calculate imposition
        progressText.textContent = 'Calculating layout...';
        progressFill.style.width = '20%';
        
        const { sheets, cols, rows, totalSheets } = calculateImpositionLayout(filteredTotalPages, selectedLayout);
        
        // Step 4: Detect source page orientation
        const firstPage = sourcePdf.getPage(selectedPages[0] - 1);
        const { width: srcWidth, height: srcHeight } = firstPage.getSize();
        const isPortrait = srcHeight > srcWidth;
        
        // Determine output orientation
        let outputIsPortrait = false;
        if (config.orientation === 'portrait') {
            outputIsPortrait = true;
        } else if (config.orientation === 'landscape') {
            outputIsPortrait = false;
        } else { // auto
            outputIsPortrait = isPortrait;
        }
        
        // Step 5: Create new PDF
        progressText.textContent = 'Creating new PDF...';
        progressFill.style.width = '30%';
        
        const outputPdf = await PDFLib.PDFDocument.create();
        
        // Page dimensions based on orientation
        let pageWidth, pageHeight;
        if (outputIsPortrait) {
            pageWidth = 595;  // A4 portrait width in points
            pageHeight = 842; // A4 portrait height in points
        } else {
            pageWidth = 842;  // A4 landscape width in points
            pageHeight = 595; // A4 landscape height in points
        }
        
        // Calculate cell dimensions
        const marginPt = config.margins * 2.83465; // mm to points
        const spacingPt = config.spacing * 2.83465;
        
        const availableWidth = pageWidth - (2 * marginPt) - ((cols - 1) * spacingPt);
        const availableHeight = pageHeight - (2 * marginPt) - ((rows - 1) * spacingPt);
        
        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / rows;
        
        // Step 6: Process each sheet
        for (let i = 0; i < sheets.length; i++) {
            progressText.textContent = `Processing sheet ${i + 1}/${sheets.length}...`;
            progressFill.style.width = `${30 + (i / sheets.length) * 60}%`;
            
            const sheet = sheets[i];
            
            // Check if front has content
            const hasFrontContent = sheet.front.some(row => row.some(page => page !== null));
            
            // Check if back has content
            const hasBackContent = sheet.back.some(row => row.some(page => page !== null));
            
            // Create front page if it has content
            if (hasFrontContent) {
                const frontPage = outputPdf.addPage([pageWidth, pageHeight]);
                await renderSide(frontPage, sheet.front, sourcePdf, selectedPages, cellWidth, cellHeight, marginPt, spacingPt, cols, rows);
            }
            
            // Create back page only if it has content
            if (hasBackContent) {
                const backPage = outputPdf.addPage([pageWidth, pageHeight]);
                await renderSide(backPage, sheet.back, sourcePdf, selectedPages, cellWidth, cellHeight, marginPt, spacingPt, cols, rows);
            }
        }
        
        // Step 7: Save PDF
        progressText.textContent = 'Finalizing PDF...';
        progressFill.style.width = '95%';
        
        const pdfBytes = await outputPdf.save();
        
        progressText.textContent = 'Complete!';
        progressFill.style.width = '100%';
        
        // Show results
        setTimeout(() => {
            document.querySelector('.progress-container').style.display = 'none';
            document.getElementById('resultCard').style.display = 'block';
            document.getElementById('startOver').style.display = 'block';
            
            // Calculate actual output sheets (physical sheets = output pages / 2 for two-sided printing)
            const outputPageCount = outputPdf.getPageCount();
            const actualSheets = Math.ceil(outputPageCount / 2);
            
            // Update stats
            document.getElementById('originalPages').textContent = filteredTotalPages;
            document.getElementById('outputSheets').textContent = actualSheets;
            const savedPercent = Math.round((1 - actualSheets / filteredTotalPages) * 100);
            document.getElementById('paperSaved').textContent = `${savedPercent}%`;
            
            // Setup download
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            document.getElementById('downloadBtn').addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = `cheatsheet-${selectedLayout}-in-1.pdf`;
                a.click();
            });
        }, 500);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        progressText.textContent = `Error: ${error.message}`;
        progressFill.style.width = '0%';
        alert('Failed to generate PDF. Please try again.');
    }
}

/**
 * Renders one side (front or back) of a sheet
 */
async function renderSide(page, grid, sourcePdf, selectedPages, cellWidth, cellHeight, marginPt, spacingPt, cols, rows) {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const pageNum = grid[row][col];
            
            if (pageNum === null) continue; // Skip blank cells
            
            // Get the actual page index from selected pages
            const actualPageIndex = selectedPages[pageNum - 1] - 1;
            
            // Calculate position
            const x = marginPt + col * (cellWidth + spacingPt);
            const y = page.getHeight() - marginPt - (row + 1) * cellHeight - row * spacingPt;
            
            // Embed source page
            const [embeddedPage] = await page.doc.embedPdf(sourcePdf, [actualPageIndex]);
            
            // Check if page needs rotation (auto-rotate feature)
            let pageWidth = embeddedPage.width;
            let pageHeight = embeddedPage.height;
            let rotation = 0;
            
            if (config.autoRotate) {
                const pageIsLandscape = pageWidth > pageHeight;
                const cellIsLandscape = cellWidth > cellHeight;
                
                if (pageIsLandscape !== cellIsLandscape) {
                    // Rotate 90 degrees
                    rotation = 90;
                    [pageWidth, pageHeight] = [pageHeight, pageWidth];
                }
            }
            
            // Calculate scale to fit
            const scaleX = cellWidth / pageWidth;
            const scaleY = cellHeight / pageHeight;
            const scale = config.scale === 'fit' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
            
            const scaledWidth = pageWidth * scale;
            const scaledHeight = pageHeight * scale;
            
            // Center in cell
            const offsetX = (cellWidth - scaledWidth) / 2;
            const offsetY = (cellHeight - scaledHeight) / 2;
            
            // Draw page with rotation if needed
            page.drawPage(embeddedPage, {
                x: x + offsetX + (rotation ? scaledHeight : 0),
                y: y + offsetY,
                width: scaledWidth,
                height: scaledHeight,
                rotate: PDFLib.degrees(rotation)
            });
            
            // Draw border
            if (config.border !== 'none') {
                const borderWidth = config.border === 'light' ? 0.5 : config.border === 'thick' ? 2 : 1;
                page.drawRectangle({
                    x: x,
                    y: y,
                    width: cellWidth,
                    height: cellHeight,
                    borderWidth: borderWidth,
                    borderColor: PDFLib.rgb(0.8, 0.8, 0.8)
                });
            }
            
            // Add page number if enabled
            if (config.pageNumbers) {
                const pageNumText = `${selectedPages[pageNum - 1]}`;
                page.drawText(pageNumText, {
                    x: x + cellWidth - 20,
                    y: y + cellHeight - 15,
                    size: 8,
                    color: PDFLib.rgb(0.5, 0.5, 0.5)
                });
            }
        }
    }
    
    // Add margin annotation if specified
    if (config.marginNote) {
        page.drawText(config.marginNote, {
            x: marginPt,
            y: page.getHeight() - 20,
            size: 8,
            color: PDFLib.rgb(0.3, 0.3, 0.3)
        });
    }
}
