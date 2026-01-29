(() => {
    'use strict';

    const PREFETCH_ROUTES = [
        'wirtschaftlichkeit.html',
        'foerderung.html',
        'referenzen.html',
        'blog.html',
        'funnel.html',
        'welcome.html'
    ];

    const motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const prefersReducedMotion = motionQuery || { matches: false };

    const onMotionPreferenceChange = (handler) => {
        if (!motionQuery) return;
        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', handler);
        } else if (typeof motionQuery.addListener === 'function') {
            motionQuery.addListener(handler);
        }
    };

    const updateMotionClass = () => {
        const root = document.documentElement;
        if (!root) return;
        root.classList.toggle('prefers-reduced-motion', Boolean(prefersReducedMotion.matches));
    };

    updateMotionClass();
    onMotionPreferenceChange(updateMotionClass);

    document.addEventListener('DOMContentLoaded', () => {
        initAnalytics();
        initNavigation();
        initThermoFunnel();
        initCalculatorLazy();
        wireDetailCtaLink();
        enhanceGalleryHeadings();
        initGallery();
        initRevealAnimations();
        initParallaxLayers();
        initEmailPreview();
        initFAQ();
        initExternalFormNextAbsolute();
        initIdlePrefetch();
    });

    function initNavigation() {
    const burgerMenu = document.getElementById('burger-menu');
    const navMenu = document.getElementById('nav-menu');
        if (!burgerMenu || !navMenu) return;

        const closeMenu = () => {
            burgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
        };

        burgerMenu.addEventListener('click', () => {
            burgerMenu.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        navMenu.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (event) => {
            const isClickInsideNav = navMenu.contains(event.target);
            const isClickOnBurger = burgerMenu.contains(event.target);
            if (!isClickInsideNav && !isClickOnBurger && navMenu.classList.contains('active')) {
                closeMenu();
            }
        });
    }
    
    function initThermoFunnel() {
        const funnel = document.querySelector('[data-funnel]');
        if (!funnel) return;

        const steps = Array.from(funnel.querySelectorAll('[data-step-id]'));
        if (!steps.length) return;

        const optionButtons = Array.from(funnel.querySelectorAll('.funnel-option'));
        const progressFill = funnel.querySelector('[data-progress-fill]');
        const progressStepLabel = funnel.querySelector('[data-progress-step]');
        const backBtn = funnel.querySelector('[data-funnel-back]');
        const resetBtn = funnel.querySelector('[data-funnel-reset]');
        const retryBtns = Array.from(funnel.querySelectorAll('[data-funnel-retry]'));
        const summaryList = funnel.querySelector('[data-funnel-summary]');
        const summaryNote = funnel.querySelector('[data-funnel-note]');
        const resultText = funnel.querySelector('[data-funnel-result-text]');
        const cta = funnel.querySelector('[data-funnel-cta]');
        const funnelForm = funnel.querySelector('[data-funnel-form]');
        const summaryInput = funnel.querySelector('[data-funnel-summary-input]');
        const startStep = funnel.dataset.startStep || steps[0].dataset.stepId;

        const stepOrder = ['ownership', 'asset-type', 'private-units', 'commercial-area', 'heating'];
        const stepKeyMap = {
            ownership: 'owner',
            'asset-type': 'asset',
            'private-units': 'privateUnits',
            'commercial-area': 'commercialArea',
            heating: 'heating'
        };

        const stepMap = new Map(steps.map((step) => [step.dataset.stepId, step]));
        const history = [];
        const defaultNote = summaryNote ? summaryNote.dataset.defaultNote || summaryNote.textContent : '';

        const state = {
            owner: null,
            asset: null,
            privateUnits: null,
            commercialArea: null,
            heating: null,
            labels: {}
        };

        let currentStep = null;

        const setBackDisabled = () => {
            if (backBtn) {
                backBtn.disabled = history.length === 0;
            }
        };

        const disableCta = () => {
            if (!cta) return;
            cta.classList.add('is-disabled');
            cta.setAttribute('aria-disabled', 'true');
        };

        const enableCta = () => {
            if (!cta) return;
            cta.classList.remove('is-disabled');
            cta.removeAttribute('aria-disabled');
        };

        const applySummaryToForm = (entries) => {
            if (!summaryInput) return;
            const summaryString = entries.map(([title, value]) => `${title}: ${value}`).join('\n');
            summaryInput.value = summaryString;
        };

        const syncProgress = (stepId) => {
            // Nutze ausschließlich den wirklichen stepId-Flow, nicht data-progress-target Aliase
            const linearSteps = ['ownership', 'asset-type', 'private-units', 'commercial-area', 'heating', 'result'];
            const normalize = (id) => (id === 'owner-blocked' ? 'result' : id);
            let idx = linearSteps.indexOf(normalize(stepId));
            if (idx < 0) idx = 0;
            const total = linearSteps.length;
            const current = idx + 1;
            const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
            if (progressFill) {
                progressFill.style.width = `${percent}%`;
                const container = progressFill.closest('.funnel-linear-progress');
                if (container) container.setAttribute('aria-valuenow', String(percent));
            }
            if (progressStepLabel) {
                progressStepLabel.textContent = String(current);
            }
        };

        const updateSummary = () => {
            const entries = [];
            if (state.labels.owner) entries.push(['Eigentum', state.labels.owner]);
            if (state.labels.asset) entries.push(['Objekttyp', state.labels.asset]);
            if (state.labels.privateUnits) entries.push(['Wohneinheiten', state.labels.privateUnits]);
            if (state.labels.commercialArea) entries.push(['Fläche', state.labels.commercialArea]);
            if (state.labels.heating) entries.push(['Heizung', state.labels.heating]);

            if (summaryList) {
                if (!entries.length) {
                    summaryList.innerHTML = '<div class="summary-placeholder">Noch keine Auswahl getroffen.</div>';
                } else {
                    summaryList.innerHTML = entries
                        .map(([title, value]) => `<div class="summary-row"><dt>${title}</dt><dd>${value}</dd></div>`)
                        .join('');
                }
            }
            applySummaryToForm(entries);
        };

        const updateResultCopy = () => {
            if (!resultText) return;
            const scopeParts = [];
            if (state.labels.privateUnits) scopeParts.push(state.labels.privateUnits);
            if (state.labels.commercialArea) scopeParts.push(state.labels.commercialArea);
            const scopeText = scopeParts.length ? ` (${scopeParts.join(' · ')})` : '';
            const asset = state.labels.asset || 'Ihr Objekt';
            const heating = state.labels.heating || 'Ihr aktuelles System';
            resultText.textContent = `Für ${asset}${scopeText} mit dem Heizsystem ${heating} planen wir jetzt eine ThermoHybrid-Auslegung inklusive Fördermatrix, Wärmerzeugung und Contracting-Option.`;
            if (summaryNote) {
                summaryNote.textContent = 'Perfekt, wir melden uns mit der Impact-Analyse und konkreten Terminvorschlägen.';
            }
            enableCta();
        };

        const clearBelow = (stepId) => {
            const index = stepOrder.indexOf(stepId);
            if (index === -1) return;
            for (let i = index + 1; i < stepOrder.length; i += 1) {
                const key = stepKeyMap[stepOrder[i]];
                if (key) {
                    state[key] = null;
                    delete state.labels[key];
                }
            }
        };

        const setStateForStep = (stepId, value, label) => {
            const key = stepKeyMap[stepId];
            if (!key) return;
            state[key] = value;
            state.labels[key] = label;
        };

        const markSelected = (stepEl, selectedBtn) => {
            stepEl.querySelectorAll('.funnel-option').forEach((option) => {
                option.classList.toggle('is-selected', option === selectedBtn);
            });
        };

        const determineNext = (stepId, value) => {
            switch (stepId) {
                case 'ownership':
                    return value === 'yes' ? 'asset-type' : 'owner-blocked';
                case 'asset-type':
                    return value === 'business' ? 'commercial-area' : 'private-units';
                case 'private-units':
                    return state.asset === 'mixed' ? 'commercial-area' : 'heating';
                case 'commercial-area':
                    return 'heating';
                case 'heating':
                    return 'result';
                default:
                    return startStep;
            }
        };

        const goToStep = (stepId, pushHistory = true) => {
            if (!stepMap.has(stepId)) return;
            if (currentStep === stepId) return;
            if (currentStep && pushHistory) {
                history.push(currentStep);
            }
            steps.forEach((step) => {
                step.classList.toggle('active', step.dataset.stepId === stepId);
            });
            currentStep = stepId;
            funnel.setAttribute('data-current-step', stepId);
            syncProgress(stepId);
            if (summaryNote && stepId !== 'result') {
                summaryNote.textContent = defaultNote;
            }
            if (stepId !== 'result') {
                disableCta();
            }
            if (stepId === 'result' && state.labels.heating) {
                enableCta();
                if (funnelForm) {
                    const focusTarget = funnelForm.querySelector('input:not([type="hidden"]), textarea');
                    if (focusTarget) {
                        focusTarget.focus();
                    }
                }
            }
            if (backBtn) {
                setBackDisabled();
            }
        };

        const resetSelections = () => {
            optionButtons.forEach((btn) => btn.classList.remove('is-selected'));
        };

        const resetFunnel = () => {
            state.owner = null;
            state.asset = null;
            state.privateUnits = null;
            state.commercialArea = null;
            state.heating = null;
            state.labels = {};
            history.length = 0;
            currentStep = null;
            setBackDisabled();
            resetSelections();
            updateSummary();
            if (summaryNote) {
                summaryNote.textContent = defaultNote;
            }
            if (funnelForm) {
                funnelForm.reset();
            }
            if (summaryInput) {
                summaryInput.value = '';
            }
            disableCta();
            goToStep(startStep, false);
        };

        optionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const stepEl = button.closest('[data-step-id]');
                if (!stepEl) return;
                const stepId = stepEl.dataset.stepId;
                const value = button.dataset.value || button.textContent.trim();
                const label = button.dataset.label || button.textContent.trim();

                clearBelow(stepId);
                setStateForStep(stepId, value, label);
                markSelected(stepEl, button);
                updateSummary();
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'funnel_select', {
                        event_category: 'Funnel',
                        event_label: `${stepId}:${label}`,
                        value: 1
                    });
                }

                const next = determineNext(stepId, value);
                if (stepId === 'heating') {
                    updateResultCopy();
                }
                goToStep(next);
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'funnel_step_view', {
                        event_category: 'Funnel',
                        event_label: next
                    });
                }
            });
        });

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const previous = history.pop();
                if (previous) {
                    goToStep(previous, false);
                }
                setBackDisabled();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetFunnel();
            });
        }

        retryBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                resetFunnel();
            });
        });

        if (funnelForm) {
            funnelForm.addEventListener('submit', () => {
                const btn = funnelForm.querySelector('button[type="submit"]');
                if (btn) {
                    btn.classList.add('is-loading');
                    btn.setAttribute('disabled', 'true');
                }
                if (typeof window.gtag === 'function') {
                    try {
                        const summary = summaryInput ? summaryInput.value : '';
                        window.gtag('event', 'funnel_submit', {
                            event_category: 'Funnel',
                            event_label: 'submit',
                            value: summary.length
                        });
                    } catch {}
                }
            });
        }

        updateSummary();
        disableCta();
        goToStep(startStep, false);
    }
    
    function initExternalFormNextAbsolute() {
        const forms = Array.from(document.querySelectorAll('form[action*="formsubmit.co"]'));
        if (!forms.length) return;
        forms.forEach((f) => {
            f.addEventListener('submit', () => {
                try {
                    const nextInput = f.querySelector('input[name="_next"]');
                    if (!nextInput) return;
                    const val = (nextInput.value || '').trim();
                    const isAbsolute = /^https?:\/\//i.test(val);
                    const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
                    if (!isAbsolute) {
                        const cleaned = val.replace(/^\//, '');
                        nextInput.value = origin.replace(/\/$/, '') + '/' + cleaned;
                    }
                } catch {}
            });
        });
    }

    function loadCalculatorScript() {
        return new Promise((resolve, reject) => {
            if (window.FuchsCalculator) {
                resolve(window.FuchsCalculator);
                return;
            }
            const existing = document.getElementById('calculator-js');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.FuchsCalculator));
                existing.addEventListener('error', reject);
                return;
            }
            const s = document.createElement('script');
            s.src = 'calculator.js';
            s.id = 'calculator-js';
            s.async = true;
            s.onload = () => resolve(window.FuchsCalculator);
            s.onerror = reject;
            (document.head || document.documentElement).appendChild(s);
        });
    }

    function initCalculatorLazy() {
        const input = document.getElementById('verbrauch');
        const button = document.getElementById('BerechnenBTN');
        const calcAnchor = document.querySelector('#wirtschaftlichkeit');
        if (!input || !button) return;

        let initialized = false;
        const loadAndInit = () => {
            if (initialized) return;
            initialized = true;
            loadCalculatorScript().then((C) => {
                if (!C) return;
                try { C.initDetailPrefill(); } catch {}
                try { C.initCalculator(); } catch {}
                try { C.initRevenueApply(); } catch {}
            }).catch(() => { /* no-op */ });
        };

        if (location.pathname.endsWith('wirtschaftlichkeit.html')) {
            loadAndInit();
            return;
        }

        if (calcAnchor) {
            const io = new IntersectionObserver((entries) => {
                if (initialized) return;
                const visible = entries.some(e => e.isIntersecting);
                if (visible) {
                    io.disconnect();
                    loadAndInit();
                }
            }, { threshold: 0.2 });
            io.observe(calcAnchor);
        } else {
            // Fallback: bei erster Interaktion mit dem Teaser laden
            button.addEventListener('click', loadAndInit, { once: true });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    loadAndInit();
                }
            }, { once: true });
        }
    }

    function wireDetailCtaLink() {
        const btn = document.getElementById('cta-detail-rechner');
        const input = document.getElementById('verbrauch');
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
            const raw = String(input.value || '');
            const normalized = raw.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '');
            if (normalized) {
                btn.href = `wirtschaftlichkeit.html?v=${encodeURIComponent(normalized)}`;
            }
        });
    }

    function enhanceGalleryHeadings() {
    try {
        const track = document.getElementById('gallery-track');
        const headingsList = document.getElementById('gallery-headings');
        if (!track || !headingsList) return;

        const slugByIndex = {};
            Array.from(track.querySelectorAll('.gallery-item')).forEach((item) => {
                const idx = parseInt(item.getAttribute('data-index') || '0', 10);
                const slug = item.getAttribute('data-slug') || '';
            if (slug) slugByIndex[idx] = slug;
        });

            Array.from(headingsList.querySelectorAll('.gallery-heading-item')).forEach((entry) => {
                const idx = parseInt(entry.getAttribute('data-index') || '0', 10);
            const slug = slugByIndex[idx];
                const textEl = entry.querySelector('.gallery-text');
                if (!textEl || !slug || entry.querySelector('.gallery-more-btn')) return;

                const link = document.createElement('a');
                link.href = `blog.html#blog/${slug}`;
                link.className = 'gallery-more-btn';
                link.textContent = 'Mehr erfahren';
                link.addEventListener('click', () => {
                    if (typeof window.gtag === 'function') {
                        window.gtag('event', 'gallery_more_click', {
                            event_category: 'Gallery',
                            event_label: slug,
                            value: idx
                        });
                    }
                });
                textEl.insertAdjacentElement('afterend', link);
            });
        } catch (error) {
            console.warn('Gallery enhancement failed', error);
        }
    }

function transformGalleryTextToList(html) {
    try {
        const normalized = (html || '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\r/g, '');
        const lines = normalized
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        let result = '';
        let inList = false;
        const bulletLike = (str) => {
            if (!str) return false;
            const trimmed = str.trim();
            const firstCharCode = trimmed.charCodeAt(0);
            const bulletCodes = [0x2022, 0x25CF, 0x25AA];
            const startsWithBulletChar = bulletCodes.includes(firstCharCode);
            const startsWithHyphen = trimmed.startsWith('-') || trimmed.startsWith('*');
            const startsWithCheck = firstCharCode === 0x2713;
            const containsDash = trimmed.includes(' - ') || trimmed.includes(' \u2013 ') || trimmed.includes(' \u2014 ');
            return startsWithBulletChar || startsWithHyphen || startsWithCheck || containsDash;
        };
            for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            const lower = line.toLowerCase();
            const isSubtitle = lower.startsWith('ihre vorteile');
            const isBullet = bulletLike(line);

            if (isSubtitle) {
                if (inList) {
                    result += '</ul>';
                    inList = false;
                }
                    result += `<div class="gallery-detail-subtitle">${line}</div>`;
                continue;
            }

            if (isBullet) {
                if (!inList) {
                    result += '<ul>';
                    inList = true;
                }
                const cleaned = line
                    .replace(/^[\u2022\-\u2013\u2014\u2713]\s*/, '')
                    .replace(/^\s*\u2713\s*/, '');
                    result += `<li>${cleaned}</li>`;
            } else {
                if (inList) {
                    result += '</ul>';
                    inList = false;
                }
                    result += `<p>${line}</p>`;
            }
        }
        if (inList) result += '</ul>';
        return result;
        } catch (error) {
        return html || '';
    }
}

function initGallery() {
    const track = document.getElementById('gallery-track');
    const headingsList = document.getElementById('gallery-headings');
    if (!track || !headingsList) return;

    const items = Array.from(track.querySelectorAll('.gallery-item'));
    const detailBlocks = Array.from(track.querySelectorAll('.gallery-detail'));
    const headingItems = Array.from(headingsList.querySelectorAll('.gallery-heading-item'));
    const headings = Array.from(headingsList.querySelectorAll('.gallery-heading'));

    (function normalizeLeftTexts() {
        const texts = Array.from(headingsList.querySelectorAll('.gallery-text'));
            texts.forEach((el) => {
                const raw = el.innerHTML || '';
                if (/<ul|<ol|<li>/i.test(raw)) return;
                el.innerHTML = transformGalleryTextToList(raw);
            });
        }());

    function syncDetail(index) {
            const sourceItem = headingsList.querySelector(`.gallery-heading-item[data-index="${index}"] .gallery-text`);
        detailBlocks.forEach(detail => detail.classList.remove('active'));
            const target = track.querySelector(`.gallery-detail[data-index="${index}"]`);
        if (target) {
            const structured = sourceItem ? transformGalleryTextToList(sourceItem.innerHTML) : '';
            target.innerHTML = structured;
            target.classList.add('active');
        }
    }

    function setActive(index) {
        headings.forEach(heading => heading.classList.remove('active'));
        const activeHeading = headings[index];
        if (activeHeading) {
            activeHeading.classList.add('active');
        }
        syncDetail(index);
    }

        headingItems.forEach((headingItem) => {
        const heading = headingItem.querySelector('.gallery-heading');
        if (!heading) return;
        heading.addEventListener('click', () => {
            const idx = parseInt(headingItem.getAttribute('data-index') || '0', 10);
            const item = items.find(element => parseInt(element.getAttribute('data-index') || '0', 10) === idx);
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                setActive(idx);
            }
        });
    });

        items.forEach((item) => {
        item.addEventListener('click', () => {
            const slug = item.getAttribute('data-slug');
            if (slug) {
                    location.href = `blog.html#blog/${slug}`;
            }
        });
    });

    setActive(0);

    const observer = new IntersectionObserver((entries) => {
        const visibleEntries = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visibleEntries.length) return;
        const topEntry = visibleEntries[0];
        const idx = parseInt(topEntry.target.getAttribute('data-index') || '0', 10);
        setActive(idx);
    }, {
        root: null,
        threshold: [0.35, 0.5, 0.75, 0.9],
        rootMargin: '-30% 0px -35% 0px'
    });

    items.forEach(item => observer.observe(item));
}

function initRevealAnimations() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.25
    });

    revealEls.forEach(el => observer.observe(el));
}

function initParallaxLayers() {
    const layersY = document.querySelectorAll('[data-parallax]');
    const layersX = document.querySelectorAll('[data-parallax-x]');
    if (!layersY.length && !layersX.length) return;

    let ticking = false;
        let scrollHandler = null;

    const update = () => {
        const scrollY = window.scrollY;
            layersY.forEach((layer) => {
            const speed = parseFloat(layer.dataset.parallax) || 0.15;
            layer.style.transform = `translate3d(0, ${scrollY * -speed}px, 0)`;
        });
            layersX.forEach((layer) => {
            const speed = parseFloat(layer.dataset.parallaxX) || 0.1;
            layer.style.transform = `translate3d(${scrollY * speed}px, 0, 0)`;
        });
        ticking = false;
    };

        const attach = () => {
            if (prefersReducedMotion.matches) return;
            update();
            scrollHandler = () => {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
                }
            };
            window.addEventListener('scroll', scrollHandler, { passive: true });
        };

        const detach = () => {
            if (scrollHandler) {
                window.removeEventListener('scroll', scrollHandler);
                scrollHandler = null;
            }
            layersY.forEach(layer => { layer.style.transform = ''; });
            layersX.forEach(layer => { layer.style.transform = ''; });
            ticking = false;
        };

        const handlePreferenceChange = () => {
            detach();
            if (!prefersReducedMotion.matches) {
                attach();
            }
        };

        handlePreferenceChange();
        onMotionPreferenceChange(handlePreferenceChange);
}

function initEmailPreview() {
    const chips = document.querySelectorAll('[data-email-chip]');
    const content = document.getElementById('email-preview-content');
    if (!chips.length || !content) return;

    const copy = {
        day0: {
            title: 'Day 0 · Impact',
            body: '„Hier ist Ihre ThermoHybrid-Impact-Skizze. Wir zeigen, wie Ihr Generator 30% Ihres Strombedarfs deckt und welche Wärmeanteile Umweltenergie übernimmt.“'
        },
        day3: {
            title: 'Day 3 · Förderung',
            body: '„Wir haben die Fördermatrix für Ihr Objekt vorbereitet: KWKG-Zuschlag, BEW-Boni und Landesprogramme – inkl. Auszahlungskurven und Verantwortlichkeiten.“'
        },
        day7: {
            title: 'Day 7 · Demo',
            body: '„Zeit für die Technik-Demo: In 12 Minuten führen wir Sie durchs Dashboard, zeigen Live-Daten einer Referenzanlage und beantworten Förderfragen.“'
        }
    };

    const setActive = (key) => {
        const data = copy[key];
        if (!data) return;
        chips.forEach(chip => chip.classList.toggle('active', chip.dataset.emailChip === key));
        content.innerHTML = `<h4>${data.title}</h4><p>${data.body}</p>`;
    };

    chips.forEach(chip => {
        chip.addEventListener('click', () => setActive(chip.dataset.emailChip));
    });

    setActive('day0');
}

    function initFAQ() {
        const faqItems = document.querySelectorAll('[data-faq-item]');
        if (!faqItems.length) return;

        faqItems.forEach((item) => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            if (!question || !answer) return;

            answer.setAttribute('aria-hidden', 'true');

            const toggle = () => {
                const isOpen = item.classList.contains('active');

                if (isOpen) {
                    answer.style.maxHeight = `${answer.scrollHeight}px`;
                    requestAnimationFrame(() => {
                        answer.style.maxHeight = '0';
                        item.classList.remove('active');
                    });
                    question.setAttribute('aria-expanded', 'false');
                    answer.setAttribute('aria-hidden', 'true');
                } else {
                    item.classList.add('active');
                    question.setAttribute('aria-expanded', 'true');
                    answer.setAttribute('aria-hidden', 'false');
                    answer.style.maxHeight = `${answer.scrollHeight}px`;
                    setTimeout(() => {
                        if (item.classList.contains('active')) {
                            answer.style.maxHeight = 'none';
                        }
                    }, 600);
                }
            };

            question.addEventListener('click', (event) => {
                event.preventDefault();
                toggle();
            });

            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggle();
                }
            });
        });
    }

    function initIdlePrefetch() {
        if (!document.head) return;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && (connection.saveData || /2g/.test(connection.effectiveType || ''))) {
            return;
        }

        const urls = PREFETCH_ROUTES.filter((route) => {
            if (!route) return false;
            if (route.startsWith('http')) {
                return true;
            }
            return !location.pathname.endsWith(route);
        });

        if (!urls.length) return;

        const schedule = window.requestIdleCallback
            ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
            : (cb) => setTimeout(cb, 1200);

        const inject = (url) => {
            if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
                return;
            }
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = 'document';
            if ('fetchPriority' in link) {
                link.fetchPriority = 'low';
            } else {
                link.setAttribute('fetchpriority', 'low');
            }
            document.head.appendChild(link);
        };

        const queue = urls.slice();
        const pump = () => {
            if (!queue.length) return;
            inject(queue.shift());
            if (queue.length) {
                schedule(pump);
            }
        };

        schedule(pump);
    }

    function initAnalytics() {
        try {
            setupGoogleAnalytics('G-JYQMZ72L66');
            initAnalyticsAutoEvents();
        } catch {}
    }

    function setupGoogleAnalytics(measurementId) {
        if (!measurementId) return;
        const hasGtag = typeof window.gtag === 'function';
        if (!hasGtag) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function gtag(){ window.dataLayer.push(arguments); };
            const s = document.createElement('script');
            s.async = true;
            s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
            s.id = 'ga4-gtag';
            (document.head || document.documentElement).appendChild(s);
        }
        try {
            window.gtag('js', new Date());
            if (!window.__gaConfigured) {
                window.gtag('config', measurementId, {
                    anonymize_ip: true,
                    send_page_view: true,
                    page_path: location.pathname + location.search
                });
                window.__gaConfigured = true;
            }
        } catch {}
    }

    function initAnalyticsAutoEvents() {
        try {
            bindClickTracking();
            bindFormSubmitTracking();
            bindScrollDepthTracking();
            startEngagementHeartbeat();
        } catch {}
    }

    function bindClickTracking() {
        if (document.__clickTrackingBound) return;
        document.__clickTrackingBound = true;
        document.addEventListener('click', (event) => {
            try {
                const target = event.target;
                if (!(target instanceof Element)) return;
                const el = target.closest('button, a, [role="button"], input[type="button"], input[type="submit"]');
                if (!el) return;
                const tag = (el.tagName || '').toLowerCase();
                const isLink = tag === 'a';
                const isButton = tag === 'button' || el.getAttribute('role') === 'button' ||
                    (tag === 'input' && /^(button|submit)$/i.test(el.getAttribute('type') || ''));
                const text = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 120);
                const id = el.id || '';
                const classes = el.className || '';
                const href = isLink ? (el.getAttribute('href') || '') : '';
                let isOutbound = false;
                if (isLink && href) {
                    try {
                        const url = new URL(href, location.href);
                        isOutbound = url.hostname && url.hostname !== location.hostname;
                    } catch {}
                }
                const eventName = isOutbound ? 'outbound_click' : (isButton ? 'button_click' : 'link_click');
                if (typeof window.gtag === 'function') {
                    window.gtag('event', eventName, {
                        element_text: text || undefined,
                        element_id: id || undefined,
                        element_classes: classes || undefined,
                        tag_name: tag,
                        href: href || undefined,
                        is_outbound: isOutbound,
                        page_path: location.pathname + location.search,
                        transport_type: 'beacon'
                    });
                }
            } catch {}
        }, { capture: true });
    }

    function bindFormSubmitTracking() {
        if (document.__formTrackingBound) return;
        document.__formTrackingBound = true;
        document.addEventListener('submit', (event) => {
            try {
                const form = event.target;
                if (!(form instanceof HTMLFormElement)) return;
                const action = (form.getAttribute('action') || '').slice(0, 300);
                const id = form.id || '';
                const name = form.getAttribute('name') || '';
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'form_submit', {
                        form_action: action || undefined,
                        form_id: id || undefined,
                        form_name: name || undefined,
                        page_path: location.pathname + location.search,
                        transport_type: 'beacon'
                    });
                }
            } catch {}
        }, { capture: true });
    }

    function bindScrollDepthTracking() {
        if (window.__scrollDepthBound) return;
        window.__scrollDepthBound = true;
        const thresholds = [25, 50, 75, 100];
        const sent = new Set();
        const getScrollPercent = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const docHeight = Math.max(
                document.body.scrollHeight, document.documentElement.scrollHeight,
                document.body.offsetHeight, document.documentElement.offsetHeight,
                document.body.clientHeight, document.documentElement.clientHeight
            );
            const winHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const total = Math.max(1, docHeight - winHeight);
            const pct = Math.round((scrollTop / total) * 100);
            return Math.max(0, Math.min(100, pct));
        };
        const onScroll = () => {
            try {
                const pct = getScrollPercent();
                thresholds.forEach((t) => {
                    if (pct >= t && !sent.has(t)) {
                        sent.add(t);
                        if (typeof window.gtag === 'function') {
                            window.gtag('event', 'scroll_depth', {
                                percent_scrolled: t,
                                page_path: location.pathname + location.search,
                                transport_type: 'beacon'
                            });
                        }
                    }
                });
                if (sent.size === thresholds.length) {
                    window.removeEventListener('scroll', onScroll);
                }
            } catch {}
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        setTimeout(onScroll, 800);
    }

    function startEngagementHeartbeat() {
        if (window.__engagementHeartbeatStarted) return;
        window.__engagementHeartbeatStarted = true;
        let engagedSeconds = 0;
        let timer = null;
        const INTERVAL_MS = 15000;
        const tick = () => {
            engagedSeconds += Math.round(INTERVAL_MS / 1000);
            if (typeof window.gtag === 'function') {
                window.gtag('event', 'page_engagement_custom', {
                    engaged_seconds: engagedSeconds,
                    page_path: location.pathname + location.search,
                    transport_type: 'beacon'
                });
            }
        };
        const start = () => {
            if (timer) return;
            timer = setInterval(tick, INTERVAL_MS);
        };
        const stop = () => {
            if (!timer) return;
            clearInterval(timer);
            timer = null;
        };
        const onVisibilityChange = () => {
            if (document.hidden) stop(); else start();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('beforeunload', () => {
            try {
                if (typeof window.gtag === 'function' && engagedSeconds > 0) {
                    window.gtag('event', 'page_engagement_custom', {
                        engaged_seconds: engagedSeconds,
                        page_path: location.pathname + location.search,
                        transport_type: 'beacon'
                    });
                }
            } catch {}
        });
        start();
    }
})();
