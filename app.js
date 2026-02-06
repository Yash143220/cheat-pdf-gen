// ======================================
// GLOBAL STATE
// ======================================
let uploadedFile = null;
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
    watermark: ''
};

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
        if (e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    document.getElementById('removeFile').addEventListener('click', resetUpload);
    document.getElementById('nextToLayout').addEventListener('click', () => goToStep(2));
    
    // Layout selection
    document.querySelectorAll('.layout-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedLayout = parseInt(card.dataset.layout);
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
    
    // Settings
    document.getElementById('orientation').addEventListener('change', (e) => config.orientation = e.target.value);
    document.getElementById('margins').addEventListener('input', (e) => config.margins = parseFloat(e.target.value));
    document.getElementById('spacing').addEventListener('input', (e) => config.spacing = parseFloat(e.target.value));
    document.getElementById('border').addEventListener('change', (e) => config.border = e.target.value);
    document.getElementById('scale').addEventListener('change', (e) => config.scale = e.target.value);
    document.getElementById('watermark').addEventListener('input', (e) => config.watermark = e.target.value);
}

// ======================================
// FILE HANDLING
// ======================================
async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
    }
    
    uploadedFile = file;
    
    // Load PDF to get page count
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages = pdfDoc.numPages;
    
    // Update UI
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'flex';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileMeta').textContent = `${totalPages} pages • ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    document.getElementById('nextToLayout').style.display = 'block';
}

function resetUpload() {
    uploadedFile = null;
    pdfDoc = null;
    totalPages = 0;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('nextToLayout').style.display = 'none';
    document.getElementById('pdfInput').value = '';
}

// ======================================
// NAVIGATION
// ======================================
function goToStep(step) {
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
    
    // Scroll again after a tiny delay to ensure content is rendered
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, 10);
}

// ======================================
// CRITICAL: DUPLEX IMPOSITION LOGIC
// ======================================

/**
 * Calculates the correct page arrangement for duplex printing
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
 * This ensures when printed duplex (flip on long edge):
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
        // Arranged in reverse order within each row for duplex alignment
        const backPages = [];
        for (let row = 0; row < rows; row++) {
            const rowPages = [];
            for (let col = 0; col < cols; col++) {
                const gridIndex = row * cols + col;
                const pageNum = basePageNum + (gridIndex * 2) + 2; // Even pages: 2, 4, 6, ...
                rowPages.push(pageNum <= totalPages ? pageNum : null);
            }
            // CRITICAL: Reverse the row for duplex alignment
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
        // Step 1: Load source PDF
        progressText.textContent = 'Loading source PDF...';
        progressFill.style.width = '10%';
        
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const sourcePdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Step 2: Calculate imposition
        progressText.textContent = 'Calculating layout...';
        progressFill.style.width = '20%';
        
        const { sheets, cols, rows, totalSheets } = calculateImpositionLayout(totalPages, selectedLayout);
        
        // Step 3: Detect source page orientation
        const firstPage = sourcePdf.getPage(0);
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
        
        // Step 4: Create new PDF
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
        
        // Step 5: Process each sheet
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
                await renderSide(frontPage, sheet.front, sourcePdf, cellWidth, cellHeight, marginPt, spacingPt, cols, rows);
            }
            
            // Create back page only if it has content
            if (hasBackContent) {
                const backPage = outputPdf.addPage([pageWidth, pageHeight]);
                await renderSide(backPage, sheet.back, sourcePdf, cellWidth, cellHeight, marginPt, spacingPt, cols, rows);
            }
        }
        
        // Step 6: Save PDF
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
            
            // Calculate actual output sheets (physical sheets = output pages / 2 for duplex)
            const outputPageCount = outputPdf.getPageCount();
            const actualSheets = Math.ceil(outputPageCount / 2);
            
            // Update stats
            document.getElementById('originalPages').textContent = totalPages;
            document.getElementById('outputSheets').textContent = actualSheets;
            const savedPercent = Math.round((1 - actualSheets / totalPages) * 100);
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
async function renderSide(page, grid, sourcePdf, cellWidth, cellHeight, marginPt, spacingPt, cols, rows) {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const pageNum = grid[row][col];
            
            if (pageNum === null) continue; // Skip blank cells
            
            // Calculate position
            const x = marginPt + col * (cellWidth + spacingPt);
            const y = page.getHeight() - marginPt - (row + 1) * cellHeight - row * spacingPt;
            
            // Embed source page
            const [embeddedPage] = await page.doc.embedPdf(sourcePdf, [pageNum - 1]);
            
            // Calculate scale to fit
            const scaleX = cellWidth / embeddedPage.width;
            const scaleY = cellHeight / embeddedPage.height;
            const scale = config.scale === 'fit' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
            
            const scaledWidth = embeddedPage.width * scale;
            const scaledHeight = embeddedPage.height * scale;
            
            // Center in cell
            const offsetX = (cellWidth - scaledWidth) / 2;
            const offsetY = (cellHeight - scaledHeight) / 2;
            
            // Draw page
            page.drawPage(embeddedPage, {
                x: x + offsetX,
                y: y + offsetY,
                width: scaledWidth,
                height: scaledHeight
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
        }
    }
    
    // Add watermark if specified
    if (config.watermark) {
        const fontSize = 10;
        const textWidth = config.watermark.length * fontSize * 0.5; // Approximate text width
        const x = (page.getWidth() - textWidth) / 2;
        const y = 30; // Slightly higher to avoid printer margins
        
        page.drawText(config.watermark, {
            x: x,
            y: y,
            size: fontSize,
            color: PDFLib.rgb(0.6, 0.6, 0.6) // Light gray for watermark effect
        });
    }
}
