// WärmeWerke - Enhanced JavaScript with Animations & Motion Graphics

(function() {
    'use strict';

    // ========== Utilities ==========
    
    // Debounce function for performance
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Easing function for smooth animations
    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    // ========== Navigation ==========
    
    function initNavScroll() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        function updateNav() {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }

        window.addEventListener('scroll', debounce(updateNav, 10));
        updateNav();
    }

    // Active page highlighting
    function initActivePageHighlight() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-links a');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    // ========== Mobile Menu ==========
    
    function initMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        const body = document.body;
        
        if (!hamburger || !mobileMenu) return;

        hamburger.addEventListener('click', function() {
            const isActive = mobileMenu.classList.toggle('active');
            this.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (isActive) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
            }
        });

        // Close mobile menu when clicking a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                hamburger.classList.remove('active');
                body.style.overflow = '';
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                hamburger.classList.remove('active');
                body.style.overflow = '';
            }
        });
    }

    // ========== Hero Video with Fallback ==========
    
    function initHeroVideo() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const video = hero.querySelector('.hero-video');
        const gradientBg = hero.querySelector('.hero-gradient-bg');

        if (video) {
            // Try to load video
            video.addEventListener('error', () => {
                console.log('Video failed to load, using gradient fallback');
                video.style.display = 'none';
                if (gradientBg) {
                    gradientBg.style.display = 'block';
                }
            });

            // Ensure video plays
            video.play().catch(() => {
                console.log('Video autoplay blocked, using gradient fallback');
                video.style.display = 'none';
                if (gradientBg) {
                    gradientBg.style.display = 'block';
                }
            });
        }
    }

    // ========== Parallax Effects ==========
    
    function initParallax() {
        const parallaxElements = document.querySelectorAll('.parallax-image, .hero-bg, .hero-video');
        
        if (parallaxElements.length === 0) return;

        function updateParallax() {
            const scrollY = window.pageYOffset;
            
            parallaxElements.forEach((element) => {
                // Only parallax if element is in viewport
                const rect = element.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    const speed = element.dataset.parallaxSpeed || 0.3;
                    const offset = scrollY * speed;
                    element.style.transform = `translate3d(0, ${offset}px, 0)`;
                }
            });
        }

        window.addEventListener('scroll', debounce(updateParallax, 10));
        updateParallax();
    }

    // ========== Scroll-Triggered Animations ==========
    
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all .animate-in and .fade-in elements
        const animatedElements = document.querySelectorAll('.animate-in, .fade-in');
        animatedElements.forEach(el => {
            observer.observe(el);
        });
    }

    // ========== Counter Animations ==========
    
    function animateCounter(element, target, duration = 2000, suffix = '') {
        const start = 0;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = Math.floor(easedProgress * target);
            
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target + suffix;
                element.classList.add('counting');
                setTimeout(() => element.classList.remove('counting'), 300);
            }
        }
        
        requestAnimationFrame(update);
    }

    function initCounterAnimations() {
        const counters = document.querySelectorAll('.stat-number');
        if (counters.length === 0) return;

        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const text = element.textContent.trim();
                    
                    // Parse number and suffix (%, +, etc.)
                    const match = text.match(/^(\d+)(.*)$/);
                    if (match) {
                        const target = parseInt(match[1], 10);
                        const suffix = match[2];
                        animateCounter(element, target, 2000, suffix);
                    }
                    
                    observer.unobserve(element);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    // ========== SVG Path Animations ==========
    
    function initSVGAnimations() {
        const svgPaths = document.querySelectorAll('.svg-draw-path');
        
        if (svgPaths.length === 0) return;

        const observerOptions = {
            threshold: 0.3,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animating');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        svgPaths.forEach(path => observer.observe(path));
    }

    // ========== Calculator Result Animation ==========
    
    function initCalculatorAnimation() {
        const calculateBtn = document.getElementById('calculateBtn');
        const resultsSection = document.querySelector('.calculator-results');
        
        if (!calculateBtn || !resultsSection) return;

        calculateBtn.addEventListener('click', function() {
            // Wait for calculator to populate results
            setTimeout(() => {
                resultsSection.classList.add('show');
                
                // Animate result numbers
                const resultNumbers = resultsSection.querySelectorAll('[data-animate-value]');
                resultNumbers.forEach(el => {
                    const target = parseInt(el.dataset.animateValue, 10);
                    if (!isNaN(target)) {
                        const suffix = el.dataset.suffix || '';
                        animateCounter(el, target, 1500, suffix);
                    }
                });

                // Add gold glow to savings highlight
                const highlight = resultsSection.querySelector('.result-highlight');
                if (highlight) {
                    highlight.classList.add('show');
                }

                // Animate CO2 icon
                const co2Icon = resultsSection.querySelector('.co2-icon');
                if (co2Icon) {
                    co2Icon.classList.add('animate');
                }
            }, 300);
        });
    }

    // ========== Smooth Scroll ==========
    
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navHeight = document.querySelector('.nav')?.offsetHeight || 72;
                    const targetPosition = target.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ========== Image Lazy Loading with Fade-in ==========
    
    function initLazyImages() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        
        images.forEach(img => {
            img.addEventListener('load', function() {
                this.classList.add('loaded');
            });
        });
    }

    // ========== Lottie Animation Support ==========
    
    function initLottieAnimations() {
        // Check if lottie library is loaded
        if (typeof lottie === 'undefined') return;

        // Success checkmark animation
        const successContainer = document.querySelector('.lottie-success');
        if (successContainer) {
            lottie.loadAnimation({
                container: successContainer,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: 'https://assets2.lottiefiles.com/packages/lf20_lk80fpsm.json' // Success checkmark
            });
        }

        // Loading spinner animation
        const loadingContainer = document.querySelector('.lottie-loading');
        if (loadingContainer) {
            lottie.loadAnimation({
                container: loadingContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: 'https://assets9.lottiefiles.com/packages/lf20_a2chheio.json' // Loading spinner
            });
        }
    }

    // ========== Energy Flow SVG Animation ==========
    
    function createEnergyFlowAnimation() {
        const energyFlow = document.querySelector('.energy-flow-svg');
        if (!energyFlow) return;

        // SVG will be created in HTML, this just triggers the animation
        const particles = energyFlow.querySelectorAll('.energy-particle');
        particles.forEach((particle, index) => {
            particle.style.animationDelay = `${index * 1}s`;
        });
    }

    // ========== Preload Critical Resources ==========
    
    function preloadResources() {
        // Preload hero video if it exists
        const heroVideo = document.querySelector('.hero-video');
        if (heroVideo && heroVideo.src) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'video';
            link.href = heroVideo.src;
            document.head.appendChild(link);
        }
    }

    // ========== Add Gradient Text Effect ==========
    
    function enhanceGradientText() {
        const gradientTexts = document.querySelectorAll('.gradient');
        gradientTexts.forEach(el => {
            el.style.backgroundSize = '200% 200%';
        });
    }

    // ========== Card Interactions ==========
    
    function initCardInteractions() {
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            // Add 3D tilt effect on mouse move (optional, subtle)
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ========== Initialize Calculator if Available ==========
    
    function initCalculatorIfAvailable() {
        if (typeof window.FuchsCalculator !== 'undefined') {
            if (typeof window.FuchsCalculator.initCalculator === 'function') {
                window.FuchsCalculator.initCalculator();
            }
            if (typeof window.FuchsCalculator.initDetailPrefill === 'function') {
                window.FuchsCalculator.initDetailPrefill();
            }
            if (typeof window.FuchsCalculator.initRevenueApply === 'function') {
                window.FuchsCalculator.initRevenueApply();
            }
        }
    }

    // ========== Performance Monitoring ==========
    
    function logPerformance() {
        if (window.performance && window.performance.timing) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = window.performance.timing;
                    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                    console.log(`⚡ Page load time: ${pageLoadTime}ms`);
                }, 0);
            });
        }
    }

    // ========== Main Initialization ==========
    
    function init() {
        // Core functionality
        initNavScroll();
        initActivePageHighlight();
        initMobileMenu();
        initSmoothScroll();
        
        // Visual enhancements
        initHeroVideo();
        initParallax();
        initScrollAnimations();
        initCounterAnimations();
        initSVGAnimations();
        initLazyImages();
        enhanceGradientText();
        
        // Advanced features
        initCardInteractions();
        initCalculatorAnimation();
        createEnergyFlowAnimation();
        initLottieAnimations();
        
        // External integrations
        initCalculatorIfAvailable();
        
        // Performance
        preloadResources();
        logPerformance();
        
        console.log('🚀 WärmeWerke enhanced animations loaded');
    }

    // ========== Execute on DOM Ready ==========
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose utilities for external use
    window.WaermeWerkeAnimations = {
        animateCounter,
        debounce,
        easeOutExpo
    };

})();
