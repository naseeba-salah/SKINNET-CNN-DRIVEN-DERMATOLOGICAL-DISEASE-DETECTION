/* SkinNet — Main JS */

// ── NAVBAR ──────────────────────────────────────────────────
const burger   = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
if (burger) {
    burger.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.addEventListener('click', e => {
        if (!burger.contains(e.target) && !navLinks.contains(e.target))
            navLinks.classList.remove('open');
    });
}

// Scroll: add shadow to nav
window.addEventListener('scroll', () => {
    document.getElementById('mainNav')?.classList.toggle('nav--scrolled', window.scrollY > 20);
});

// ── UPLOAD / DROP ZONE ──────────────────────────────────────
const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const cameraBtn   = document.getElementById('cameraBtn');
const dzInner     = document.getElementById('dzInner');
const dzPreview   = document.getElementById('dzPreview');
const previewImg  = document.getElementById('previewImg');
const changeBtn   = document.getElementById('changeBtn');
const analyzeBtn  = document.getElementById('analyzeBtn');
const uploadForm  = document.getElementById('uploadForm');

// Camera modal elements
const cameraModal  = document.getElementById('cameraModal');
const closeCamBtn  = document.getElementById('closeCameraBtn');
const cameraVideo  = document.getElementById('cameraVideo');
const captureBtn   = document.getElementById('captureBtn');
const captureCanvas= document.getElementById('captureCanvas');

let stream = null;
let isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function showPreview(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
        previewImg.src = e.target.result;
        dzInner.classList.add('hidden');
        dzPreview.classList.remove('hidden');
        if (analyzeBtn) analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    previewImg.src = '';
    dzPreview.classList.add('hidden');
    dzInner.classList.remove('hidden');
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (fileInput)  fileInput.value = '';
}

// Sync a File object into the form's hidden input
function setFormFile(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    showPreview(file);
}

if (fileInput) {
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) showPreview(fileInput.files[0]);
    });
}

if (changeBtn) {
    changeBtn.addEventListener('click', e => { e.stopPropagation(); resetUpload(); });
}

// Drop zone click → open file picker (skip if clicking change button)
if (dropZone) {
    dropZone.addEventListener('click', e => {
        if (!e.target.closest('.preview-change') &&
            !e.target.closest('.dz-btn--camera') &&
            !e.target.closest('label')) {
            fileInput.click();
        }
    });

    ['dragenter','dragover'].forEach(ev => {
        dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('is-over'); });
    });
    ['dragleave','drop'].forEach(ev => {
        dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('is-over'); });
    });
    dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) setFormFile(file);
    });
}

// ── CAMERA CAPTURE ──────────────────────────────────────────
// On mobile: use native file input with capture="environment"
// On desktop: open our camera modal with getUserMedia
if (cameraBtn) {
    cameraBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (isMobile) {
            cameraInput.click(); // triggers native camera app
        } else {
            openCameraModal();
        }
    });
}

// Mobile: cameraInput change
if (cameraInput) {
    cameraInput.addEventListener('change', () => {
        if (cameraInput.files[0]) setFormFile(cameraInput.files[0]);
    });
}

async function openCameraModal() {
    if (!cameraModal) return;
    cameraModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
        });
        cameraVideo.srcObject = stream;
    } catch (err) {
        cameraModal.classList.add('hidden');
        document.body.style.overflow = '';
        alert('Camera access denied or not available. Please use the "Browse Files" option.');
    }
}

function closeCameraModal() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    if (cameraModal) cameraModal.classList.add('hidden');
    document.body.style.overflow = '';
}

if (closeCamBtn) closeCamBtn.addEventListener('click', closeCameraModal);

if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        if (!cameraVideo || !captureCanvas) return;

        captureCanvas.width  = cameraVideo.videoWidth  || 640;
        captureCanvas.height = cameraVideo.videoHeight || 480;

        const ctx = captureCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0, captureCanvas.width, captureCanvas.height);

        captureCanvas.toBlob(blob => {
            const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
            setFormFile(file);
            closeCameraModal();
        }, 'image/jpeg', 0.92);
    });
}

// ── FORM SUBMIT ─────────────────────────────────────────────
if (uploadForm) {
    uploadForm.addEventListener('submit', e => {
        if (!fileInput || !fileInput.files.length) {
            e.preventDefault();
            alert('Please select or capture an image first.');
            return;
        }
        const btnInner  = analyzeBtn.querySelector('.btn-analyze-inner');
        const btnLoad   = analyzeBtn.querySelector('.btn-loading');
        if (btnInner) btnInner.classList.add('hidden');
        if (btnLoad)  btnLoad.classList.remove('hidden');
        analyzeBtn.disabled = true;
    });
}

// ── DISEASE SEARCH + SEVERITY FILTER ────────────────────────
let activeSev = 'all';

function applyFilters() {
    const q     = (document.getElementById('diseaseSearch')?.value || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.dcard');
    let visible = 0;

    cards.forEach(card => {
        const nameOk = card.dataset.name.includes(q);
        const sevOk  = activeSev === 'all' || card.dataset.severity === activeSev;
        if (nameOk && sevOk) { card.style.display = ''; visible++; }
        else                 { card.style.display = 'none'; }
    });

    document.getElementById('noResults')?.classList.toggle('hidden', visible > 0);
}

function filterDiseases()          { applyFilters(); }
function filterBySeverity(sev, btn) {
    activeSev = sev;
    document.querySelectorAll('.fpill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
}

// ── LIGHTBOX ────────────────────────────────────────────────
function openLightbox(src) {
    const lb  = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if (lb && img) { img.src = src; lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeLightbox() {
    document.getElementById('lightbox')?.classList.remove('open');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeCameraModal(); } });

// ── ANIMATE RESULT CARDS ────────────────────────────────────
window.addEventListener('load', () => {
    document.querySelectorAll('.rcard').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition= 'opacity .5s ease, transform .5s ease';
        setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'none'; }, i * 90);
    });

    // Animate top5 bars
    setTimeout(() => {
        document.querySelectorAll('.top5-fill').forEach(b => {
            const w = b.style.width;
            b.style.width = '0';
            setTimeout(() => { b.style.width = w; }, 200);
        });
    }, 300);
});
