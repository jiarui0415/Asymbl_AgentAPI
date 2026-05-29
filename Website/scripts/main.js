// ── Nav scroll shadow ──────────────────────────────────────────────────────
const nav = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

// ── Hero Carousel ─────────────────────────────────────────────────────────
const slides   = document.querySelectorAll('.hero-slide');
const dots     = document.querySelectorAll('.carousel-dot');
const prevBtn  = document.querySelector('.carousel-prev');
const nextBtn  = document.querySelector('.carousel-next');
let current    = 0;
let autoTimer  = null;

function showSlide(index) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = (index + slides.length) % slides.length;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}

function startAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => showSlide(current + 1), 5000);
}

prevBtn.addEventListener('click', () => { showSlide(current - 1); startAuto(); });
nextBtn.addEventListener('click', () => { showSlide(current + 1); startAuto(); });
dots.forEach((dot, i) => dot.addEventListener('click', () => { showSlide(i); startAuto(); }));

startAuto();

// ── Scroll fade-in ─────────────────────────────────────────────────────────
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.12 }
);
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
