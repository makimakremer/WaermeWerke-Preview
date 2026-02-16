/* ========================================
   WärmeWerke - Main JavaScript
   Smooth animations and interactions
   ======================================== */

// ========== SCROLL REVEAL ==========
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { 
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});

// Observe all reveal elements
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal, .reveal-group').forEach(el => {
        observer.observe(el);
    });
});

// ========== COUNTER ANIMATION ==========
function animateCounter(el, target, duration = 2000, suffix = '') {
    const start = performance.now();
    const startValue = 0;
    
    const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        const value = Math.floor(startValue + (target - startValue) * eased);
        
        el.textContent = value + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target + suffix;
        }
    };
    
    requestAnimationFrame(update);
}

// Observe stat numbers for counter animation
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            
            const text = entry.target.textContent;
            const hasPercent = text.includes('%');
            const hasPlus = text.includes('+');
            const number = parseInt(text.replace(/\D/g, ''));
            
            let suffix = '';
            if (hasPercent) suffix = '%';
            if (hasPlus) suffix = '+';
            
            animateCounter(entry.target, number, 2000, suffix);
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.stat-number').forEach(el => {
        statsObserver.observe(el);
    });
});

// ========== PARALLAX EFFECT ==========
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrollY = window.scrollY;
            
            // Parallax for hero elements
            document.querySelectorAll('.parallax').forEach(el => {
                const speed = el.dataset.speed || 0.3;
                el.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
            });
            
            ticking = false;
        });
        ticking = true;
    }
});

// ========== NAVIGATION SCROLL EFFECT ==========
const nav = document.querySelector('.nav');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    
    // Add scrolled class when scrolling down
    if (currentScrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
    
    lastScrollY = currentScrollY;
});

// ========== MOBILE MENU ==========
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        
        if (mobileMenu.style.display === 'flex') {
            mobileMenu.style.display = 'none';
        } else {
            mobileMenu.style.display = 'flex';
        }
    });
    
    // Close menu when clicking on a link
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.style.display = 'none';
            hamburger.classList.remove('active');
        });
    });
}

// ========== VIDEO FALLBACK ==========
document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('.hero-video');
    const gradientBg = document.querySelector('.hero-gradient-bg');
    
    if (video) {
        video.addEventListener('error', () => {
            console.log('Video failed to load, showing gradient background');
            video.style.display = 'none';
            if (gradientBg) {
                gradientBg.style.display = 'block';
            }
        });
        
        // Also show gradient if video doesn't load within 3 seconds
        setTimeout(() => {
            if (video.readyState === 0) {
                video.style.display = 'none';
                if (gradientBg) {
                    gradientBg.style.display = 'block';
                }
            }
        }, 3000);
    }
});

// ========== SMOOTH SCROLL FOR ANCHOR LINKS ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '#!') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 64; // Account for fixed nav
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ========== PRODUCT CARD HOVER EFFECTS ==========
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        });
    });
});

// ========== PERFORMANCE: LAZY LOAD IMAGES ==========
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ========== CONSOLE EASTER EGG ==========
console.log('%c🔥 WärmeWerke', 'font-size: 24px; font-weight: bold; color: #F18701;');
console.log('%cWebsite built with award-winning design principles', 'color: #666;');
console.log('%cInterested in our technology? Visit https://waermewerke.de', 'color: #999;');
