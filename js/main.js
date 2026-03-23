// ========== AOS INIT ==========
AOS.init({
  duration: 800,
  easing: 'ease-out-cubic',
  once: true,
  offset: 100,
});

// ========== GSAP + SCROLLTRIGGER ==========
gsap.registerPlugin(ScrollTrigger);

// Counter animations
document.querySelectorAll('[data-counter]').forEach(el => {
  const raw = el.dataset.counter;
  const target = parseFloat(raw);
  const isDecimal = raw.includes('.');
  const obj = { val: 0 };

  gsap.to(obj, {
    val: target,
    duration: 2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      once: true,
    },
    onUpdate: () => {
      if (isDecimal) {
        el.textContent = obj.val.toFixed(1).replace('.', ',');
      } else {
        el.textContent = Math.round(obj.val).toLocaleString('pt-BR');
      }
    },
  });
});

// Parallax on About image
const aboutImage = document.querySelector('.about-image');
if (aboutImage) {
  gsap.to(aboutImage, {
    yPercent: -10,
    ease: 'none',
    scrollTrigger: {
      trigger: '#sobre',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}

// ========== NAVIGATION ==========
const nav = document.getElementById('main-nav');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
const mobileClose = document.getElementById('mobile-close');

// Nav scroll behavior
window.addEventListener('scroll', () => {
  nav.classList.toggle('nav-scrolled', window.scrollY > 50);
}, { passive: true });

// Mobile menu toggle
hamburger.addEventListener('click', () => {
  mobileMenu.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
});

mobileClose.addEventListener('click', () => {
  mobileMenu.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
});

// Close mobile menu on link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });
});

// ========== SMOOTH SCROLL WITH NAV OFFSET ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    const navHeight = nav.offsetHeight;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
  });
});

// ========== FAQ ACCORDION ==========
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const icon = btn.querySelector('.faq-icon');
    const isOpen = !answer.classList.contains('hidden');

    // Close all
    document.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
    document.querySelectorAll('.faq-icon').forEach(i => {
      i.classList.remove('rotate-45');
    });

    // Toggle current
    if (!isOpen) {
      answer.classList.remove('hidden');
      icon.classList.add('rotate-45');
    }
  });
});

// ========== PHONE MASK ==========
const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    }
    e.target.value = v;
  });
}

// ========== CONTACT FORM ==========
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);

    if (!data.name || !data.email || !data.message) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Mensagem enviada com sucesso!', 'success');
      contactForm.reset();
    } catch (err) {
      showToast('Erro ao enviar. Tente novamente.', 'error');
    }
  });
}

// Toast notification
function showToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-24 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-sm font-semibold transition-all ${
    type === 'success' ? 'bg-vip-green text-vip-black' : 'bg-red-500 text-white'
  }`;
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// ========== BLOG FETCH ==========
async function loadBlogPosts() {
  try {
    const res = await fetch('/api/posts?limit=3&status=published');
    if (!res.ok) throw new Error('API unavailable');
    const posts = await res.json();
    if (!posts.length) return;

    const fallback = document.getElementById('blog-fallback');
    const container = document.getElementById('blog-container');
    if (!fallback || !container) return;

    fallback.classList.add('hidden');
    container.insertAdjacentHTML('beforeend', renderBlogCards(posts));
  } catch {
    // Fallback static cards remain visible
  }
}

function renderBlogCards(posts) {
  const featured = posts[0];
  const rest = posts.slice(1);

  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 group">
        <div class="relative h-[350px] lg:h-full rounded-lg overflow-hidden">
          ${featured.image_url
            ? `<img src="${featured.image_url}" alt="${featured.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
            : '<div class="w-full h-full bg-gradient-to-br from-vip-black to-[#1a1a1a]"></div>'}
          <div class="absolute inset-0 bg-gradient-to-t from-vip-black via-vip-black/40 to-transparent"></div>
          <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h3 class="text-xl md:text-2xl font-heading font-bold text-vip-cream mt-2">${featured.title}</h3>
            <p class="text-vip-sage mt-2 text-sm line-clamp-2">${featured.excerpt || ''}</p>
            <span class="text-vip-gold/70 text-xs mt-3 block">${formatDate(featured.published_at)}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-6">
        ${rest.map(post => `
          <div class="group rounded-lg overflow-hidden bg-white/5 border border-white/10">
            <div class="h-[180px] overflow-hidden">
              ${post.image_url
                ? `<img src="${post.image_url}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
                : '<div class="w-full h-full bg-gradient-to-br from-vip-black to-[#1a1a1a]"></div>'}
            </div>
            <div class="p-5">
              <h3 class="text-base font-heading font-bold text-vip-cream mt-2">${post.title}</h3>
              <span class="text-vip-gold/70 text-xs mt-2 block">${formatDate(post.published_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Load blog posts on page load
loadBlogPosts();

// ========== PRODUCTS CAROUSEL ==========
const carousel = document.getElementById('products-carousel');
const prevBtn = document.getElementById('carousel-prev');
const nextBtn = document.getElementById('carousel-next');

if (carousel && prevBtn && nextBtn) {
  const scrollAmount = 320;
  prevBtn.addEventListener('click', () => {
    carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
}

// ========== UNITS MAP ==========
document.querySelectorAll('.unit-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // Don't intercept "Como chegar" link
    const lat = card.dataset.lat;
    const lng = card.dataset.lng;
    const iframe = document.getElementById('map-iframe');
    if (iframe && lat && lng) {
      iframe.src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    }
    // Highlight active card
    document.querySelectorAll('.unit-card').forEach(c => c.classList.remove('border-vip-green/50'));
    card.classList.add('border-vip-green/50');
  });
});
