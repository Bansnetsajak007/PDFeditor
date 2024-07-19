async function saveEditedPdf() {
    const { PDFDocument } = PDFLib;

    const fileInput = document.getElementById('file-input'); //Retrieves the DOM element with the id 'file-input'
    const file = fileInput.files[0];
    const saveName = file.name;
    if (!file || file.type !== 'application/pdf') {
        console.error('No valid PDF file selected');
        return;
    }

    const originalPdfBytes = await file.arrayBuffer();  //reading origianal pdf
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    /*
        iterating over each page in pdf document
    */
    for (let pageNum = 1; pageNum <= pdfDoc.getPageCount(); pageNum++) {
        const page = pdfDoc.getPage(pageNum - 1);

        // Get the corresponding drawing canvas specific page drawing leko 
        const drawingCanvas = document.getElementById('drawing-canvas-' + pageNum);
        if (drawingCanvas) {
            const drawingContext = drawingCanvas.getContext('2d');
            const drawingDataUrl = drawingCanvas.toDataURL();
            const drawingImage = await pdfDoc.embedPng(drawingDataUrl);
            const { width, height } = page.getSize();
            page.drawImage(drawingImage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
                opacity: 1,
            });
        }

        // Get all highlight elements
        const pageDiv = document.querySelector(`.pdf-page:nth-child(${pageNum})`);
        const highlights = pageDiv.querySelectorAll('.highlight');
        highlights.forEach(highlight => {
            const rect = highlight.getBoundingClientRect();
            const pageRect = pageDiv.getBoundingClientRect();
            const x = rect.left - pageRect.left;
            const y = pageRect.height - (rect.bottom - pageRect.top);
            const width = rect.width;
            const height = rect.height;
            const color = highlight.style.backgroundColor;

            page.drawRectangle({
                x,
                y,
                width,
                height,
                color,
                opacity: 0.5,
            });
        });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edited${saveName}`;
    link.click();
}

document.getElementById('save-btn').addEventListener('click', saveEditedPdf);