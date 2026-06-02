/**
 * HeapSort Step-by-Step Visualizer (Optimized)
 * Pre-generates all steps, then renders using direct DOM manipulation
 * instead of innerHTML to avoid constant re-parsing.
 */

// ===== DOM References =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    arrayInput: $('#arrayInput'),
    btnStart: $('#btnStart'),
    btnRandom: $('#btnRandom'),
    vizSection: $('#vizSection'),

    phaseIcon: $('#phaseIcon'),
    phaseTitle: $('#phaseTitle'),
    phaseDesc: $('#phaseDesc'),
    stepCurrent: $('#stepCurrent'),
    stepTotal: $('#stepTotal'),

    treeSvg: $('#treeSvg'),
    treeContainer: $('#treeContainer'),
    arrayContainer: $('#arrayContainer'),
    explanationText: $('#explanationText'),
    progressBar: $('#progressBar'),

    btnFirst: $('#btnFirst'),
    btnPrev: $('#btnPrev'),
    btnNext: $('#btnNext'),
    btnLast: $('#btnLast'),
    btnPlay: $('#btnPlay'),
    playIcon: $('#playIcon'),
    pauseIcon: $('#pauseIcon'),

    speedSlider: $('#speedSlider'),
    speedLabel: $('#speedLabel'),

    btnInfo: $('#btnInfo'),
    infoModal: $('#infoModal'),
    modalClose: $('#modalClose'),
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// ===== State =====
let steps = [];
let currentStep = 0;
let isPlaying = false;
let playTimer = null;
let speedMs = 1200;
let heapMode = 'max'; // 'max' or 'min'

// Cached DOM nodes for the tree and array so we can update in place
let treeNodes = [];    // { group, circle, text, indexText }
let treeEdges = [];    // { line, from, to }
let arrayCells = [];   // { valueEl, indexEl, cellEl }
let arraySepEl = null;
let cachedArrayLen = 0;

// ===== HeapSort Step Generator =====
function generateSteps(inputArray, mode) {
    const isMax = mode === 'max';
    const heapName = isMax ? 'Max-Heap' : 'Min-Heap';
    const orderText = isMax ? 'menor a mayor' : 'mayor a menor';
    const extremeWord = isMax ? 'mayor' : 'menor';
    const extremeAdj = isMax ? 'más grande' : 'más pequeño';
    const compWord = isMax ? 'mayor' : 'menor';

    const result = [];
    const arr = [...inputArray];
    const n = arr.length;

    result.push({
        phase: 1,
        phaseTitle: 'Fase 1 — Arreglo Desordenado',
        phaseDesc: 'Este es nuestro arreglo inicial, aún no tiene estructura de heap.',
        icon: '📋',
        array: [...arr],
        sortedCount: 0,
        highlight: [],
        swapping: [],
        explanation: `Tenemos el arreglo <strong>[${arr.join(', ')}]</strong>. Nuestro objetivo es ordenarlo de <strong>${orderText}</strong> usando HeapSort. Primero, necesitamos convertirlo en un <span class="hl-compare">${heapName}</span>.`,
    });

    const lastInternal = Math.floor(n / 2) - 1;
    for (let i = lastInternal; i >= 0; i--) {
        siftDown(arr, n, i, result, 2, 0, mode);
    }

    result.push({
        phase: 2,
        phaseTitle: `Fase 2 — ${heapName} Construido ✅`,
        phaseDesc: `El arreglo ahora cumple la propiedad de ${heapName}.`,
        icon: '✅',
        array: [...arr],
        sortedCount: 0,
        highlight: [],
        swapping: [],
        explanation: `¡<span class="hl-done">${heapName} construido!</span> El arreglo ahora es <strong>[${arr.join(', ')}]</strong>. La raíz <span class="hl-val">${arr[0]}</span> es el elemento ${extremeAdj}. Ahora comenzamos la extracción.`,
    });

    for (let size = n - 1; size > 0; size--) {
        const sortedCount = n - size - 1;
        const vuelta = n - size;

        result.push({
            phase: 3,
            phaseTitle: `Fase 3 — Extracción (Vuelta ${vuelta})`,
            phaseDesc: 'Intercambiamos la raíz con el último elemento no ordenado.',
            icon: '🔄',
            array: [...arr],
            sortedCount,
            highlight: [],
            swapping: [0, size],
            explanation: `Swap raíz <span class="hl-val">${arr[0]}</span> con posición ${size} (<span class="hl-val">${arr[size]}</span>). El <span class="hl-val">${arr[0]}</span> queda en su posición final.`,
        });

        [arr[0], arr[size]] = [arr[size], arr[0]];
        const newSortedCount = sortedCount + 1;

        const sortedPart = arr.slice(size).join(', ');
        const unsortedPart = arr.slice(0, size).join(', ');

        result.push({
            phase: 3,
            phaseTitle: `Fase 3 — Extracción (Vuelta ${vuelta})`,
            phaseDesc: `El ${arr[size]} está en su posición correcta. Reajustamos el heap.`,
            icon: '✅',
            array: [...arr],
            sortedCount: newSortedCount,
            highlight: [size],
            swapping: [],
            explanation: `Después del swap: <strong>[${unsortedPart}</strong> | <span class="hl-done">${sortedPart}</span>]. Ahora reajustamos el heap con los ${size} elementos restantes.`,
        });

        if (size > 1) {
            siftDown(arr, size, 0, result, 3, newSortedCount, mode);
        }
    }

    result.push({
        phase: 4,
        phaseTitle: 'Resultado Final 🎉',
        phaseDesc: '¡El arreglo está completamente ordenado!',
        icon: '🎉',
        array: [...arr],
        sortedCount: n,
        highlight: Array.from({ length: n }, (_, i) => i),
        swapping: [],
        explanation: `<span class="hl-done">¡Ordenado!</span> Resultado: <strong>[${arr.join(', ')}]</strong> — de <strong>${orderText}</strong>. HeapSort extrajo el ${extremeWord} en cada vuelta y lo colocó en su posición correcta. Complejidad: <span class="hl-compare">O(n log n)</span>.`,
    });

    return result;
}

function siftDown(arr, heapSize, idx, steps, phase, sortedCount, mode) {
    const isMax = mode === 'max';
    const compWord = isMax ? 'mayor' : 'menor';
    const compPhrase = isMax ? 'mayor o igual' : 'menor o igual';
    let current = idx;

    while (true) {
        let best = current;
        const left = 2 * current + 1;
        const right = 2 * current + 2;

        const children = [];
        if (left < heapSize) children.push(left);
        if (right < heapSize) children.push(right);

        if (children.length === 0) break;

        steps.push({
            phase,
            phaseTitle: phase === 2 ? 'Fase 2 — Heapify (sift-down)' : 'Fase 3 — Reajuste (sift-down)',
            phaseDesc: 'Comparando nodo con sus hijos para mantener la propiedad de heap.',
            icon: '🔍',
            array: [...arr],
            sortedCount,
            highlight: [current, ...children],
            swapping: [],
            explanation: `Comparamos <span class="hl-val">${arr[current]}</span> (índice ${current}) con sus hijos: ${children.map(c => `<span class="hl-val">${arr[c]}</span>`).join(' y ')}. ¿Algún hijo es ${compWord}?`,
        });

        if (isMax) {
            if (left < heapSize && arr[left] > arr[best]) best = left;
            if (right < heapSize && arr[right] > arr[best]) best = right;
        } else {
            if (left < heapSize && arr[left] < arr[best]) best = left;
            if (right < heapSize && arr[right] < arr[best]) best = right;
        }

        if (best === current) {
            steps.push({
                phase,
                phaseTitle: phase === 2 ? 'Fase 2 — Heapify (sift-down)' : 'Fase 3 — Reajuste (sift-down)',
                phaseDesc: 'El nodo ya cumple la propiedad de heap.',
                icon: '✅',
                array: [...arr],
                sortedCount,
                highlight: [current],
                swapping: [],
                explanation: `<span class="hl-val">${arr[current]}</span> ya es ${compPhrase} que sus hijos. <span class="hl-done">No se necesita swap.</span>`,
            });
            break;
        }

        steps.push({
            phase,
            phaseTitle: phase === 2 ? 'Fase 2 — Heapify (swap)' : 'Fase 3 — Reajuste (swap)',
            phaseDesc: `Intercambiando ${arr[current]} con ${arr[best]}.`,
            icon: '🔄',
            array: [...arr],
            sortedCount,
            highlight: [],
            swapping: [current, best],
            explanation: `<span class="hl-val">${arr[best]}</span> es ${compWord} que <span class="hl-val">${arr[current]}</span> → <span class="hl-swap">swap</span> posiciones ${current} y ${best}.`,
        });

        [arr[current], arr[best]] = [arr[best], arr[current]];

        steps.push({
            phase,
            phaseTitle: phase === 2 ? 'Fase 2 — Heapify (resultado)' : 'Fase 3 — Reajuste (resultado)',
            phaseDesc: 'Swap realizado, continuamos verificando hacia abajo.',
            icon: '⬇️',
            array: [...arr],
            sortedCount,
            highlight: [best],
            swapping: [],
            explanation: `Después del swap: <strong>[${arr.slice(0, heapSize).join(', ')}]</strong>. El <span class="hl-val">${arr[best]}</span> bajó a la posición ${best}. Seguimos verificando...`,
        });

        current = best;
    }
}

// ===== Build static DOM elements for tree and array =====
function buildTreeDOM(n) {
    const svg = DOM.treeSvg;
    // Clear everything
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    treeEdges = [];
    treeNodes = [];

    // Create edges first (so they render behind nodes)
    for (let i = 0; i < n; i++) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;

        if (left < n) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('class', 'tree-edge');
            svg.appendChild(line);
            treeEdges.push({ line, from: i, to: left });
        }
        if (right < n) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('class', 'tree-edge');
            svg.appendChild(line);
            treeEdges.push({ line, from: i, to: right });
        }
    }

    // Create nodes (wrapped in <g> so we can hide entire groups)
    for (let i = 0; i < n; i++) {
        const g = document.createElementNS(SVG_NS, 'g');

        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('class', 'tree-node-circle');

        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('class', 'tree-node-text');

        const indexText = document.createElementNS(SVG_NS, 'text');
        indexText.setAttribute('class', 'tree-node-index');
        indexText.textContent = i;

        g.appendChild(circle);
        g.appendChild(text);
        g.appendChild(indexText);
        svg.appendChild(g);

        treeNodes.push({ group: g, circle, text, indexText });
    }
}

function buildArrayDOM(n) {
    const container = DOM.arrayContainer;
    while (container.firstChild) container.removeChild(container.firstChild);
    arrayCells = [];
    arraySepEl = null;

    // We create all cells. The separator position will be managed during render.
    // Create a separator element (hidden by default)
    arraySepEl = document.createElement('div');
    arraySepEl.className = 'array-separator';
    arraySepEl.style.display = 'none';

    for (let i = 0; i < n; i++) {
        const cellEl = document.createElement('div');
        cellEl.className = 'array-cell';

        const valueEl = document.createElement('div');
        valueEl.className = 'array-cell-value';

        const indexEl = document.createElement('div');
        indexEl.className = 'array-cell-index';
        indexEl.textContent = i;

        cellEl.appendChild(valueEl);
        cellEl.appendChild(indexEl);
        container.appendChild(cellEl);

        arrayCells.push({ cellEl, valueEl, indexEl });
    }

    // Append separator (we'll insert it at the right position during render)
    container.appendChild(arraySepEl);
    cachedArrayLen = n;
}

// ===== Update DOM in place (no innerHTML) =====
function computeTreeLayout(n) {
    const width = DOM.treeContainer.clientWidth || 500;
    const height = DOM.treeContainer.clientHeight || 320;
    const depth = Math.floor(Math.log2(n)) + 1;
    const nodeRadius = Math.min(24, Math.max(16, width / (Math.pow(2, depth) * 2.5)));
    const levelHeight = (height - 40) / depth;
    const topPadding = 30;

    const positions = [];
    for (let i = 0; i < n; i++) {
        const level = Math.floor(Math.log2(i + 1));
        const posInLevel = i - (Math.pow(2, level) - 1);
        const nodesInLevel = Math.pow(2, level);
        const levelWidth = width - 40;
        const spacing = levelWidth / nodesInLevel;
        const x = 20 + spacing * posInLevel + spacing / 2;
        const y = topPadding + level * levelHeight;
        positions.push({ x, y });
    }

    return { positions, nodeRadius };
}

function updateTree(step) {
    const { array, sortedCount, highlight, swapping } = step;
    const n = array.length;
    const sortedStartIdx = n - sortedCount;

    const { positions, nodeRadius } = computeTreeLayout(n);

    // Update edges
    for (const edge of treeEdges) {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        edge.line.setAttribute('x1', fromPos.x);
        edge.line.setAttribute('y1', fromPos.y);
        edge.line.setAttribute('x2', toPos.x);
        edge.line.setAttribute('y2', toPos.y);

        const isHL =
            (highlight.includes(edge.from) && highlight.includes(edge.to)) ||
            (swapping.includes(edge.from) && swapping.includes(edge.to));
        edge.line.setAttribute('class', isHL ? 'tree-edge highlight' : 'tree-edge');
    }

    // Update nodes — sorted nodes stay visible with green/dimmed style
    for (let i = 0; i < n; i++) {
        const node = treeNodes[i];
        node.group.style.display = '';
        const pos = positions[i];

        const isSorted = i >= sortedStartIdx && sortedCount > 0;
        const isHighlight = highlight.includes(i);
        const isSwapping = swapping.includes(i);
        const isRoot = i === 0;

        // Position
        node.circle.setAttribute('cx', pos.x);
        node.circle.setAttribute('cy', pos.y);
        node.circle.setAttribute('r', nodeRadius);

        node.text.setAttribute('x', pos.x);
        node.text.setAttribute('y', pos.y);
        node.text.textContent = array[i];

        node.indexText.setAttribute('x', pos.x);
        node.indexText.setAttribute('y', pos.y + nodeRadius + 14);

        // Classes
        let cls = 'tree-node-circle';
        if (isSwapping) cls += ' swapping';
        else if (isSorted) cls += ' sorted';
        else if (isHighlight) cls += ' active';
        else if (isRoot && !isSorted) cls += ' root';
        node.circle.setAttribute('class', cls);

        node.text.setAttribute('class', isSorted ? 'tree-node-text sorted' : 'tree-node-text');
    }
}

function updateArray(step) {
    const { array, sortedCount, highlight, swapping } = step;
    const n = array.length;
    const sortedStartIdx = n - sortedCount;

    // Move separator to correct position
    if (sortedCount > 0 && sortedStartIdx > 0) {
        arraySepEl.style.display = '';
        // Insert separator before the sorted start cell
        const targetCell = arrayCells[sortedStartIdx].cellEl;
        if (arraySepEl.nextSibling !== targetCell) {
            DOM.arrayContainer.insertBefore(arraySepEl, targetCell);
        }
    } else {
        arraySepEl.style.display = 'none';
    }

    for (let i = 0; i < n; i++) {
        const cell = arrayCells[i];
        cell.valueEl.textContent = array[i];

        const isSorted = i >= sortedStartIdx && sortedCount > 0;
        const isHighlight = highlight.includes(i);
        const isSwapping = swapping.includes(i);

        let cls = 'array-cell-value';
        if (isSwapping) cls += ' swapping';
        else if (isSorted) cls += ' sorted';
        else if (isHighlight) cls += ' active';
        cell.valueEl.className = cls;
    }
}

// ===== Render Step =====
function renderStep(stepIdx) {
    const step = steps[stepIdx];
    if (!step) return;

    currentStep = stepIdx;

    // Phase banner — direct text updates
    DOM.phaseIcon.textContent = step.icon;
    DOM.phaseTitle.textContent = step.phaseTitle;
    DOM.phaseDesc.textContent = step.phaseDesc;
    DOM.stepCurrent.textContent = stepIdx + 1;
    DOM.stepTotal.textContent = steps.length;

    // Progress bar
    DOM.progressBar.style.width = ((stepIdx + 1) / steps.length * 100) + '%';

    // Explanation (uses innerHTML because it has markup, but it's a single small element)
    DOM.explanationText.innerHTML = step.explanation;

    // Update tree and array in place
    updateTree(step);
    updateArray(step);

    // Button states
    DOM.btnFirst.disabled = stepIdx === 0;
    DOM.btnPrev.disabled = stepIdx === 0;
    DOM.btnNext.disabled = stepIdx === steps.length - 1;
    DOM.btnLast.disabled = stepIdx === steps.length - 1;
}

// ===== Controls =====
function goToStep(idx) {
    if (idx >= 0 && idx < steps.length) {
        renderStep(idx);
    }
}

function togglePlay() {
    isPlaying ? stopPlaying() : startPlaying();
}

function startPlaying() {
    if (currentStep >= steps.length - 1) {
        currentStep = 0;
        renderStep(0);
    }
    isPlaying = true;
    DOM.playIcon.style.display = 'none';
    DOM.pauseIcon.style.display = 'block';

    playTimer = setInterval(() => {
        if (currentStep < steps.length - 1) {
            goToStep(currentStep + 1);
        } else {
            stopPlaying();
        }
    }, speedMs);
}

function stopPlaying() {
    isPlaying = false;
    DOM.playIcon.style.display = 'block';
    DOM.pauseIcon.style.display = 'none';
    if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
    }
}

function updateSpeed() {
    const val = parseInt(DOM.speedSlider.value);
    const speeds = {
        1: { ms: 2400, label: '0.5x' },
        2: { ms: 1600, label: '0.75x' },
        3: { ms: 1200, label: '1x' },
        4: { ms: 700, label: '1.5x' },
        5: { ms: 400, label: '2x' },
    };
    speedMs = speeds[val].ms;
    DOM.speedLabel.textContent = speeds[val].label;

    if (isPlaying) {
        clearInterval(playTimer);
        playTimer = setInterval(() => {
            if (currentStep < steps.length - 1) {
                goToStep(currentStep + 1);
            } else {
                stopPlaying();
            }
        }, speedMs);
    }
}

// ===== Input Handling =====
function parseArray(str) {
    return str
        .split(/[,;\s]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(Number)
        .filter(n => !isNaN(n) && isFinite(n));
}

function startVisualization() {
    const arr = parseArray(DOM.arrayInput.value);

    if (arr.length < 2) {
        DOM.arrayInput.style.borderColor = '#fb7185';
        setTimeout(() => { DOM.arrayInput.style.borderColor = ''; }, 1500);
        return;
    }

    if (arr.length > 15) {
        DOM.arrayInput.value = arr.slice(0, 15).join(', ');
        return startVisualization();
    }

    stopPlaying();
    steps = generateSteps(arr, heapMode);
    currentStep = 0;

    // Build DOM structures once
    buildTreeDOM(arr.length);
    buildArrayDOM(arr.length);

    DOM.vizSection.style.display = '';
    renderStep(0);

    setTimeout(() => {
        DOM.vizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

function generateRandomArray() {
    const len = Math.floor(Math.random() * 5) + 4;
    const arr = [];
    for (let i = 0; i < len; i++) {
        arr.push(Math.floor(Math.random() * 30) + 1);
    }
    DOM.arrayInput.value = arr.join(', ');
}

// ===== Event Listeners =====
DOM.btnStart.addEventListener('click', startVisualization);
DOM.arrayInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startVisualization(); });
DOM.btnRandom.addEventListener('click', generateRandomArray);

DOM.btnFirst.addEventListener('click', () => goToStep(0));
DOM.btnPrev.addEventListener('click', () => goToStep(currentStep - 1));
DOM.btnNext.addEventListener('click', () => goToStep(currentStep + 1));
DOM.btnLast.addEventListener('click', () => goToStep(steps.length - 1));
DOM.btnPlay.addEventListener('click', togglePlay);
DOM.speedSlider.addEventListener('input', updateSpeed);

$$('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => { DOM.arrayInput.value = chip.dataset.array; });
});

// Heap mode toggle
$$('#heapModeToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('#heapModeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        heapMode = btn.dataset.mode;
    });
});

DOM.btnInfo.addEventListener('click', () => { DOM.infoModal.classList.add('active'); });
DOM.modalClose.addEventListener('click', () => { DOM.infoModal.classList.remove('active'); });
DOM.infoModal.addEventListener('click', (e) => { if (e.target === DOM.infoModal) DOM.infoModal.classList.remove('active'); });

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); goToStep(currentStep - 1); break;
        case 'ArrowRight': e.preventDefault(); goToStep(currentStep + 1); break;
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'Home': e.preventDefault(); goToStep(0); break;
        case 'End': e.preventDefault(); goToStep(steps.length - 1); break;
    }
});

// Resize: debounced, only recompute layout
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (steps.length > 0) renderStep(currentStep);
    }, 200);
});

updateSpeed();
