pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

let currentPage = 1;
let pdfDoc = null;
let scale = 1.5;
let currentTool = null;
let isDrawing = false;
let isErasing = false;
let lastX = 0;
let lastY = 0;

function renderPage(pageNum) {
    pdfDoc.getPage(pageNum).then(function(page) {
        let viewport = page.getViewport({scale: scale});
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        let renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        let renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
            let pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.appendChild(canvas);
            document.getElementById('pdf-container').appendChild(pageDiv);

            let drawingCanvas = document.createElement('canvas');
            drawingCanvas.id = 'drawing-canvas-' + pageNum;
            drawingCanvas.width = viewport.width;
            drawingCanvas.height = viewport.height;
            drawingCanvas.style.position = 'absolute';
            drawingCanvas.style.top = '0';
            drawingCanvas.style.left = '0';
            pageDiv.appendChild(drawingCanvas);

            setupPageInteractions(pageDiv, pageNum);
        });
    });
}

function setupPageInteractions(pageDiv, pageNum) {
    pageDiv.addEventListener('mousedown', (e) => startInteraction(e, pageNum));
    pageDiv.addEventListener('mousemove', (e) => duringInteraction(e, pageNum));
    pageDiv.addEventListener('mouseup', (e) => endInteraction(e, pageNum));
    pageDiv.addEventListener('mouseleave', (e) => endInteraction(e, pageNum));
}

function startInteraction(e, pageNum) {
    if (currentTool === 'highlight') {
        startHighlight(e, pageNum);
    } else if (currentTool === 'pen') {
        startDrawing(e, pageNum);
    } else if (currentTool === 'eraser') {
        startErasing(e, pageNum);
    }
}

function duringInteraction(e, pageNum) {
    if (currentTool === 'highlight') {
        duringHighlight(e, pageNum);
    } else if (currentTool === 'pen') {
        duringDrawing(e, pageNum);
    } else if (currentTool === 'eraser') {
        duringErasing(e, pageNum);
    }
}

function endInteraction(e, pageNum) {
    if (currentTool === 'highlight') {
        endHighlight(e, pageNum);
    } else if (currentTool === 'pen') {
        endDrawing(e, pageNum);
    } else if (currentTool === 'eraser') {
        endErasing(e, pageNum);
    }
}

let highlightStart = null;
let highlightElement = null;

function startHighlight(e, pageNum) {
    highlightStart = {x: e.offsetX, y: e.offsetY}; //seting the coordinates
    highlightElement = document.createElement('div');
    highlightElement.className = 'highlight';
    highlightElement.style.position = 'absolute';
    highlightElement.style.left = highlightStart.x + 'px';
    highlightElement.style.top = highlightStart.y + 'px';
    highlightElement.style.backgroundColor = document.getElementById('color-picker').value + '50';
    e.target.closest('.pdf-page').appendChild(highlightElement);
}

function duringHighlight(e, pageNum) {
    if (highlightStart) {
        let width = e.offsetX - highlightStart.x;
        let height = e.offsetY - highlightStart.y;
        highlightElement.style.width = Math.abs(width) + 'px';
        highlightElement.style.height = Math.abs(height) + 'px';
        highlightElement.style.left = (width < 0 ? e.offsetX : highlightStart.x) + 'px';
        highlightElement.style.top = (height < 0 ? e.offsetY : highlightStart.y) + 'px';
    }
}

function endHighlight(e, pageNum) {
    highlightStart = null;
}

function startDrawing(e, pageNum) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function duringDrawing(e, pageNum) {
    if (!isDrawing) return;
    let drawingCanvas = document.getElementById('drawing-canvas-' + pageNum);
    if (!drawingCanvas) {
        console.error('Drawing canvas not found for page', pageNum);
        return;
    }
    let ctx = drawingCanvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = document.getElementById('color-picker').value;
    ctx.lineWidth = document.getElementById('pen-size').value;
    ctx.lineCap = 'round';
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function endDrawing(e, pageNum) {
    isDrawing = false;
}

function startErasing(e, pageNum) {
    isErasing = true;
    eraseAt(e, pageNum);
}

function duringErasing(e, pageNum) {
    if (isErasing) {
        eraseAt(e, pageNum);
    }
}

function endErasing(e, pageNum) {
    isErasing = false;
}

function eraseAt(e, pageNum) {
    let pageDiv = e.target.closest('.pdf-page');
    let eraserSize = 20; // default eraser size

    let highlights = pageDiv.querySelectorAll('.highlight');
    highlights.forEach(highlight => {
        let rect = highlight.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            highlight.remove();
        }
    });

    //drawing erasereee
    let drawingCanvas = document.getElementById('drawing-canvas-' + pageNum);
    if (drawingCanvas) {
        let ctx = drawingCanvas.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(e.offsetX, e.offsetY, eraserSize / 2, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

document.getElementById('file-input').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error('Not a PDF file');
        return;
    }

    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            document.getElementById('pdf-container').innerHTML = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                renderPage(i);
            }
        });
    };
    fileReader.readAsArrayBuffer(file);
});

document.getElementById('highlight-tool').addEventListener('click', function() {
    currentTool = 'highlight';
    console.log('Highlight tool selected');
});

document.getElementById('pen-tool').addEventListener('click', function() {
    currentTool = 'pen';
    console.log('Pen tool selected');
});

document.getElementById('eraser-tool').addEventListener('click', function() {
    currentTool = 'eraser';
    console.log('Eraser tool selected');
});



