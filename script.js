document.addEventListener('DOMContentLoaded', () => {

    // --- 1. MOBILE MENU TOGGLE (اضافه شده برای موبایل) ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // تغییر آیکون همبرگری به ضربدر (اختیاری ولی حرفه‌ای)
            const bars = menuToggle.querySelectorAll('.bar');
            if(navLinks.classList.contains('active')) {
                bars[0].style.transform = "rotate(45deg) translate(5px, 6px)";
                bars[1].style.opacity = "0";
                bars[2].style.transform = "rotate(-45deg) translate(5px, -6px)";
            } else {
                bars[0].style.transform = "none";
                bars[1].style.opacity = "1";
                bars[2].style.transform = "none";
            }
        });
    }

    // --- 2. HERO ANIMATION ---
    const words = ["عشقت", "مادرت", "همکارت", "پدرت", "دوستت", "خودت"];
    let wordIdx = 0;
    const wordEl = document.getElementById('changingText');
    if (wordEl) {
        setInterval(() => {
            wordEl.style.opacity = 0;
            setTimeout(() => {
                wordIdx = (wordIdx + 1) % words.length;
                wordEl.innerText = words[wordIdx];
                wordEl.style.opacity = 1;
            }, 300);
        }, 2500);
    }

    // --- 3. INITIALIZE APP ---
    initApp();

    // --- 4. INITIALIZE SLIDERS ---
    new MultiSlider('reviewSlider');
    new MultiSlider('gallerySlider');

    // --- 5. MODAL LOGIC ---
    const modal = document.getElementById('orderModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if(modal && closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 300);
        });

        modal.addEventListener('click', (e) => {
            if(e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }
        });
    }
});

/* =========================================
   CORE APP LOGIC (CANVAS & CONFIG)
   ========================================= */
const TARGET_WIDTH = 1181;
const TARGET_HEIGHT = 1051;

const VIEW_DEFINITIONS = [
  {
    id: 'v1', name: 'ایستاده', isStatic: false,
    points: [{x: 431,y: 172}, {x: 786,y: 178}, {x: 782,y: 643}, {x: 438,y: 715}]
  },
  {
    id: 'v2', name: 'خوابیده', isStatic: false,
    points: [{x: 324,y: 360}, {x: 602,y: 224}, {x: 900,y: 386}, {x: 601,y: 610}]
  },
  {
    id: 'v3', name: 'پشت محصول', isStatic: true, points: []
  },
  {
    id: 'v4', name: 'کنار محصول', isStatic: true, points: []
  }
];

const PRODUCT_CONFIG = {
  "wood": {
    name: "چوب طبیعی",
    materials: {
      beech: { name: "چوب راش", value: '#d1a377', images: ['assets/wood-beech-v1.png', 'assets/wood-beech-v2.png', 'assets/wood-beech-v3.png', 'assets/wood-beech-v4.png'] },
      walnut: { name: "چوب افرا", value: '#5d4037', images: ['assets/wood-maple-v1.png', 'assets/wood-maple-v2.png', 'assets/wood-maple-v3.png', 'assets/wood-maple-v4.png'] }
    }
  },
  "3d-print": {
    name: "پرینت سه بعدی",
    materials: {
      black: { name: "مشکی مات", value: '#333333', images: ['assets/black-v1.png', 'assets/black-v2.png', 'assets/black-v3.png', 'assets/black-v4.png'] },
      blue: { name: "سرمه ای", value: '#3B3E79', images: ['assets/blue-v1.png', 'assets/blue-v2.png', 'assets/blue-v3.png', 'assets/blue-v4.png'] },
      green: { name: "زیتونی", value: '#808000', images: ['assets/green-v1.png', 'assets/green-v2.png', 'assets/green-v3.png', 'assets/green-v4.png'] },
      marble: { name: "مرمری", value: '#e3e0cd', images: ['assets/marble-v1.png', 'assets/marble-v2.png', 'assets/marble-v3.png', 'assets/marble-v4.png'] }
    }
  }
};

let state = {
  typeId: "wood",
  materialId: "beech",
  viewId: "v1",
  userImage: null,
  offset: { x: 0, y: 0 },
  scale: 100,
  rotation: 0,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  loadedImages: {}
};

function initApp() {
    renderTypeOptions();
    loadMaterial(state.typeId, state.materialId);
    setupEventListeners();
}

function showLoader(show) {
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = show ? 'flex' : 'none';
}

function loadMaterial(tid, mid) {
    showLoader(true);
    state.typeId = tid; 
    state.materialId = mid;
    renderMaterialOptions();
    
    const matNameEl = document.getElementById('matName');
    if(matNameEl) matNameEl.innerText = PRODUCT_CONFIG[tid].materials[mid].name;

    const paths = PRODUCT_CONFIG[tid].materials[mid].images;
    let loaded = 0, total = VIEW_DEFINITIONS.length;

    VIEW_DEFINITIONS.forEach((v, i) => {
        const img = new Image();
        img.src = paths[i];
        img.onload = () => {
            state.loadedImages[v.id] = img;
            loaded++;
            if(loaded===total) { showLoader(false); renderThumbnails(); renderMain(); }
        };
        img.onerror = () => { 
            console.warn("Image not found:", paths[i]);
            loaded++;
            if(loaded===total) { showLoader(false); renderThumbnails(); renderMain(); }
        };
    });
}

function createDesignBuffer() {
    const cv = document.createElement('canvas');
    cv.width = TARGET_WIDTH; cv.height = TARGET_HEIGHT;
    const ctx = cv.getContext('2d');
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,TARGET_WIDTH,TARGET_HEIGHT);

    if(state.userImage) {
        ctx.save();
        ctx.translate(TARGET_WIDTH/2 + state.offset.x, TARGET_HEIGHT/2 + state.offset.y);
        ctx.rotate(state.rotation * Math.PI/180);
        const s = state.scale/100;
        ctx.scale(s,s);
        ctx.drawImage(state.userImage, -state.userImage.width/2, -state.userImage.height/2);
        ctx.restore();
    }
    return cv;
}

function renderMain() {
    const canvas = document.getElementById('mainCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const bg = state.loadedImages[state.viewId];
    if(!bg) return;

    // تنظیم سایز کانواس بر اساس عکس پس زمینه
    canvas.width = bg.width; 
    canvas.height = bg.height;

    const design = createDesignBuffer();
    const viewDef = VIEW_DEFINITIONS.find(v=>v.id===state.viewId);
    
    drawComposition(ctx, bg, design, viewDef);
}

function renderThumbnails() {
    const c = document.getElementById('thumbsContainer');
    if(!c) return;
    c.innerHTML = '';
    const design = createDesignBuffer();

    VIEW_DEFINITIONS.forEach(v => {
        const div = document.createElement('div');
        div.className = `thumb-item ${state.viewId===v.id ? 'active':''}`;
        div.onclick = () => { state.viewId = v.id; renderThumbnails(); renderMain(); checkTools(); };
        
        const cv = document.createElement('canvas');
        const bg = state.loadedImages[v.id];
        if(bg) {
            cv.width = 150; cv.height = 150 * (bg.height/bg.width);
            drawComposition(cv.getContext('2d'), bg, design, v, true);
        }
        div.appendChild(cv);
        c.appendChild(div);
    });
}

function drawComposition(ctx, bg, design, viewDef, isThumb=false) {
    ctx.drawImage(bg, 0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if(state.userImage && !viewDef.isStatic) {
        const sx = ctx.canvas.width / bg.width;
        const sy = ctx.canvas.height / bg.height;
        const points = viewDef.points.map(p => ({x:p.x*sx, y:p.y*sy}));
        warpImage(ctx, design, points, isThumb?10:30);
    }
}

function warpImage(ctx, src, p, steps) {
    const w = src.width, h = src.height;
    for(let i=0; i<steps; i++) {
        const t1 = i/steps, t2 = (i+1)/steps;
        const p1 = lerp(p[0],p[3],t1), p2 = lerp(p[1],p[2],t1);
        const p3 = lerp(p[0],p[3],t2), p4 = lerp(p[1],p[2],t2);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p4.x,p4.y); ctx.lineTo(p3.x,p3.y);
        ctx.closePath(); ctx.clip();
        const dx = p2.x-p1.x, dy = p2.y-p1.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const angle = Math.atan2(dy,dx);
        ctx.translate(p1.x,p1.y); ctx.rotate(angle);
        ctx.drawImage(src, 0, h*t1, w, h/steps, 0, 0, dist, Math.sqrt(Math.pow(p1.x-p3.x,2)+Math.pow(p1.y-p3.y,2))+2);
        ctx.restore();
    }
}
function lerp(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}

function renderTypeOptions() {
    const c = document.getElementById('typeContainer'); 
    if(!c) return;
    c.innerHTML='';
    for(let t in PRODUCT_CONFIG) {
        let chip = document.createElement('div');
        chip.className = `chip ${state.typeId===t?'active':''}`;
        chip.innerText = PRODUCT_CONFIG[t].name;
        chip.onclick = () => loadMaterial(t, Object.keys(PRODUCT_CONFIG[t].materials)[0]);
        c.appendChild(chip);
    }
}

function renderMaterialOptions() {
    const c = document.getElementById('materialContainer'); 
    if(!c) return;
    c.innerHTML='';
    const mats = PRODUCT_CONFIG[state.typeId].materials;
    for(let m in mats) {
        let dot = document.createElement('div');
        dot.className = `color-dot ${state.materialId===m?'active':''}`;
        dot.style.background = mats[m].value;
        dot.title = mats[m].name;
        dot.onclick = () => loadMaterial(state.typeId, m);
        c.appendChild(dot);
    }
}

function checkTools() {
    const tools = document.getElementById('tools');
    const v = VIEW_DEFINITIONS.find(x=>x.id===state.viewId);
    if(state.userImage && !v.isStatic) {
        tools.style.display = 'flex';
        tools.style.opacity = '1';
        tools.style.pointerEvents = 'all';
    } else {
        tools.style.opacity = '0.3';
        tools.style.pointerEvents = 'none';
    }
}

function setupEventListeners() {
    // 1. Upload Logic
    const imgDrop = document.getElementById('imgDrop');
    const imgInp = document.getElementById('imgInput');
    if(imgDrop && imgInp) {
        imgDrop.onclick = () => imgInp.click();
        imgInp.onchange = e => {
            if(e.target.files[0]) {
                const r = new FileReader();
                r.onload = ev => {
                    state.userImage = new Image();
                    state.userImage.onload = () => {
                        state.offset={x:0,y:0}; state.scale=100; state.rotation=0;
                        imgDrop.classList.add('done'); imgDrop.querySelector('div').innerText="✅ تصویر انتخاب شد";
                        checkTools(); renderMain(); renderThumbnails();
                        document.getElementById('buyBtn').disabled = false;
                    };
                    state.userImage.src = ev.target.result;
                };
                r.readAsDataURL(e.target.files[0]);
            }
        };
    }

    // 2. CANVAS DRAG LOGIC (MOUSE + TOUCH)
    const cvs = document.getElementById('mainCanvas');
    if(cvs) {
        // --- MOUSE EVENTS ---
        cvs.onmousedown = e => { 
            if(state.userImage) { 
                state.isDragging=true; 
                state.dragStart={x:e.offsetX,y:e.offsetY}; 
            } 
        };
        cvs.onmousemove = e => { 
            if(state.isDragging) {
                state.offset.x += e.offsetX - state.dragStart.x;
                state.offset.y += e.offsetY - state.dragStart.y;
                state.dragStart={x:e.offsetX,y:e.offsetY};
                renderMain();
            }
        };
        window.addEventListener('mouseup', () => { 
            if(state.isDragging) { 
                state.isDragging=false; 
                renderThumbnails(); 
            } 
        });

        // --- TOUCH EVENTS (CRITICAL FOR MOBILE) ---
        // استفاده از { passive: false } برای اجازه دادن به preventDefault
        cvs.addEventListener('touchstart', (e) => {
            if(state.userImage) {
                e.preventDefault(); // جلوگیری از اسکرول هنگام شروع لمس
                state.isDragging = true;
                const rect = cvs.getBoundingClientRect();
                const touch = e.touches[0];
                // محاسبه دقیق مختصات نسبت به کانواس
                state.dragStart = {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top
                };
            }
        }, { passive: false });

        cvs.addEventListener('touchmove', (e) => {
            if(state.isDragging) {
                e.preventDefault(); // جلوگیری از اسکرول صفحه
                const rect = cvs.getBoundingClientRect();
                const touch = e.touches[0];
                const currentX = touch.clientX - rect.left;
                const currentY = touch.clientY - rect.top;

                state.offset.x += currentX - state.dragStart.x;
                state.offset.y += currentY - state.dragStart.y;
                state.dragStart = { x: currentX, y: currentY };
                
                renderMain();
            }
        }, { passive: false });

        cvs.addEventListener('touchend', () => {
            if(state.isDragging) {
                state.isDragging = false;
                renderThumbnails();
            }
        });
    }

    // 3. Audio Logic
    const audDrop = document.getElementById('audioDrop');
    const audInp = document.getElementById('audioInput');
    if(audDrop && audInp) {
        audDrop.onclick = () => audInp.click();
        audInp.onchange = e => {
            const f = e.target.files[0];
            if(f && f.size < 4000000) {
                audDrop.classList.add('done');
                document.getElementById('audioLabel').innerText = f.name;
            } else alert('حجم فایل باید کمتر از ۴ مگابایت باشد');
        };
    }

    // 4. Tool Controls
    const rotBtn = document.getElementById('rotBtn');
    if(rotBtn) rotBtn.onclick = () => { state.rotation = (state.rotation+90)%360; renderMain(); renderThumbnails(); };
    
    const zoomRange = document.getElementById('zoomRange');
    if(zoomRange) {
        zoomRange.oninput = e => { state.scale = parseInt(e.target.value); renderMain(); };
        zoomRange.onchange = () => renderThumbnails();
    }

    // 5. Buy/Download Button Logic
    const buyBtn = document.getElementById('buyBtn');
    if(buyBtn) {
        // Clone to clear old events
        const newBtn = buyBtn.cloneNode(true);
        buyBtn.parentNode.replaceChild(newBtn, buyBtn);
        
        newBtn.addEventListener('click', () => {
             showLoader(true);
             setTimeout(() => {
                 // Generate Download
                 const link = document.createElement('a');
                 link.download = 'MusicBox_Design.png';
                 link.href = createDesignBuffer().toDataURL('image/png');
                 link.click();

                 showLoader(false);

                 // Show Modal
                 const modal = document.getElementById('orderModal');
                 modal.classList.remove('hidden'); 
                 setTimeout(() => modal.classList.add('active'), 10);
             }, 1500);
        });
    }

    // 6. AI Button Logic
    const aiBtn = document.getElementById('aiBtn');
    if(aiBtn) aiBtn.onclick = applyAiSuggestion;
}

function applyAiSuggestion() {
    const who = document.getElementById('aiWho').value;
    const vibe = document.getElementById('aiVibe').value;
    
    if(!who || !vibe) { alert("لطفا هر دو گزینه را انتخاب کنید!"); return; }
    
    let t = 'wood', m = 'beech';
    if(vibe === 'minimal' || who === 'friend') {
        t = '3d-print'; m = 'black';
    } else if (vibe === 'luxury' || who === 'colleague') {
        t = 'wood'; m = 'walnut';
    } else if (vibe === 'nature') {
        t = 'wood'; m = 'beech';
    }
    
    loadMaterial(t, m);
    document.getElementById('customizer').scrollIntoView({ behavior: 'smooth' });
}


/* =========================================
   SLIDER SYSTEM (Reusable Class)
   ========================================= */
class MultiSlider {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if(!this.container) return;

        this.track = this.container.querySelector('.slider-track');
        this.items = Array.from(this.track.children);
        this.prevBtn = this.container.querySelector('.prev-btn');
        this.nextBtn = this.container.querySelector('.next-btn');
        
        this.currentIndex = 0;
        this.itemsPerScreen = 3;
        this.totalItems = this.items.length;
        
        this.init();
    }

    init() {
        this.updateItemsPerScreen();
        window.addEventListener('resize', () => {
            this.updateItemsPerScreen();
            this.moveSlider();
        });

        this.nextBtn.addEventListener('click', () => {
            this.nextSlide();
            this.resetTimer();
        });
        
        this.prevBtn.addEventListener('click', () => {
            this.prevSlide();
            this.resetTimer();
        });
        
        this.startTimer();
    }

    updateItemsPerScreen() {
        const w = window.innerWidth;
        if (w < 600) this.itemsPerScreen = 1;
        else if (w < 900) this.itemsPerScreen = 2;
        else this.itemsPerScreen = 3;
    }

    nextSlide() {
        if (this.currentIndex >= this.totalItems - this.itemsPerScreen) {
            this.currentIndex = 0;
        } else {
            this.currentIndex++;
        }
        this.moveSlider();
    }

    prevSlide() {
        if (this.currentIndex <= 0) {
            this.currentIndex = this.totalItems - this.itemsPerScreen;
        } else {
            this.currentIndex--;
        }
        this.moveSlider();
    }

    moveSlider() {
        const itemWidthPercent = 100 / this.itemsPerScreen;
        const moveX = -(this.currentIndex * itemWidthPercent);
        this.track.style.transform = `translateX(${moveX}%)`;
    }

    startTimer() {
        this.timer = setInterval(() => this.nextSlide(), 5000);
    }

    resetTimer() {
        clearInterval(this.timer);
        this.startTimer();
    }
}
