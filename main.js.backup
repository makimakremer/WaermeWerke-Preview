// WärmeWerke - Main JavaScript

(function() {
    'use strict';

    // Navigation scroll effect
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

        window.addEventListener('scroll', updateNav);
        updateNav();
    }

    // Mobile menu toggle
    function initMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (!hamburger || !mobileMenu) return;

        hamburger.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            this.classList.toggle('active');
        });

        // Close mobile menu when clicking a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }

    // Intersection Observer for fade-in animations
    function initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Stagger animation delay
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 80);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const animatedElements = document.querySelectorAll('.fade-in');
        animatedElements.forEach(el => observer.observe(el));
    }

    // Smooth scroll for anchor links
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

    // Initialize calculator if the function exists
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

    // Initialize all features when DOM is ready
    function init() {
        initNavScroll();
        initMobileMenu();
        initAnimations();
        initSmoothScroll();
        initCalculatorIfAvailable();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
