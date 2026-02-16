(() => {
    'use strict';

    const euroFormatter = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    });

    const bhkwEinheiten = [
        { elektrisch: 2.0, thermisch: 5.2, modell: 'NT 2', Wartung: 9300, Anlagenpreis: 75000 },
        { elektrisch: 3.3, thermisch: 8.2, modell: 'NT 3', Wartung: 9600, Anlagenpreis: 80000 },
        { elektrisch: 4.0, thermisch: 8.8, modell: 'NT 4', Wartung: 9900, Anlagenpreis: 80000 },
        { elektrisch: 5.0, thermisch: 12.9, modell: 'NT 5', Wartung: 10200, Anlagenpreis: 80000 },
        { elektrisch: 8.0, thermisch: 20.4, modell: 'NT 8', Wartung: 16800, Anlagenpreis: 85000 },
        { elektrisch: 9.5, thermisch: 22.7, modell: 'NT 9', Wartung: 17100, Anlagenpreis: 85000 },
        { elektrisch: 12.5, thermisch: 27.6, modell: 'NT 12', Wartung: 17400, Anlagenpreis: 85000 },
        { elektrisch: 16.0, thermisch: 37.9, modell: 'NT 16', Wartung: 17700, Anlagenpreis: 85000 },
        { elektrisch: 17.0, thermisch: 41.6, modell: 'NT 17', Wartung: 17700, Anlagenpreis: 85000 },
        { elektrisch: 20.0, thermisch: 45.8, modell: 'NT 20', Wartung: 18600, Anlagenpreis: 85000 },
        { elektrisch: 21.0, thermisch: 47.6, modell: 'NT 21', Wartung: 18900, Anlagenpreis: 90000 },
        { elektrisch: 25.0, thermisch: 54.9, modell: 'NT 25', Wartung: 19500, Anlagenpreis: 90000 },
        { elektrisch: 30.0, thermisch: 63.1, modell: 'NT 30', Wartung: 20100, Anlagenpreis: 100000 },
        { elektrisch: 50.0, thermisch: 85.0, modell: 'NT 50', Wartung: 55500, Anlagenpreis: 140000 },
        { elektrisch: 71.0, thermisch: 118.0, modell: 'NT 70', Wartung: 69000, Anlagenpreis: 210000 }
    ];

    function findePassendesBHKW(heiz) {
        for (let i = 0; i < bhkwEinheiten.length; i += 1) {
            if (bhkwEinheiten[i].thermisch >= heiz) {
                return bhkwEinheiten[i];
            }
        }
        return bhkwEinheiten[bhkwEinheiten.length - 1];
    }

    function initCalculator() {
        const verbrauchInput = document.getElementById('verbrauch');
        const berechnenBtn = document.getElementById('BerechnenBTN');
        const heizlastElement = document.getElementById('Heizlastergebniss');
        if (!verbrauchInput || !berechnenBtn || !heizlastElement) return;
        const co2SavingsEl = document.getElementById('co2-savings');

        const elektrischElements = [
            document.getElementById('Elektischeleistung'),
            document.getElementById('Elektischeleistung1'),
            document.getElementById('Elektischeleistung2')
        ].filter(Boolean);

        const heizleistungElements = [
            document.getElementById('Heizleistung'),
            document.getElementById('Heizleistung1')
        ].filter(Boolean);

        const einspeisung = document.getElementById('Einspeisung');
        const eigenverbrauch = document.getElementById('Eigenverbrauch');
        const ertrag = document.getElementById('Ertrag');
        const wartungPreis = document.getElementById('wartung');
        const anlagenPreis = document.getElementById('preis');

        const updateHeizlast = () => {
            const raw = String(verbrauchInput.value || '');
            const normalized = raw.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '');
            const verbrauch = parseFloat(normalized);
            if (Number.isNaN(verbrauch)) {
                return;
            }

            const heizlast = verbrauch / 3000;
            heizlastElement.textContent = `${heizlast.toFixed(1)} kW ->`;

            const passendBHKW = findePassendesBHKW(heizlast);
            const elektrischMarkup = `<span style="color: #2ed5d2">${passendBHKW.elektrisch} kW</span>`;

            elektrischElements.forEach(el => {
                el.innerHTML = elektrischMarkup;
            });

            heizleistungElements.forEach(el => {
                el.textContent = `${passendBHKW.thermisch} kW`;
            });

            if (einspeisung && eigenverbrauch && ertrag && wartungPreis && anlagenPreis) {
                const einspeisungValue = 30000 * (0.16 + 0.11) * passendBHKW.elektrisch;
                const eigenverbrauchValue = 30000 * (0.08 + 0.30) * passendBHKW.elektrisch;
                const ertragValue = ((einspeisungValue + eigenverbrauchValue) / 2) - 85000 - passendBHKW.Wartung;

                einspeisung.textContent = euroFormatter.format(einspeisungValue);
                eigenverbrauch.textContent = euroFormatter.format(eigenverbrauchValue);
                ertrag.textContent = euroFormatter.format(ertragValue);
                wartungPreis.textContent = euroFormatter.format(passendBHKW.Wartung);
                anlagenPreis.textContent = euroFormatter.format(passendBHKW.Anlagenpreis);

                try {
                    if (co2SavingsEl) {
                        const CO2_FAKTOR_REFERENZ_KG_PRO_KWH_WAERME = 0.224;
                        const REDUKTIONSQUOTE = 0.60;
                        const baselineKg = verbrauch * CO2_FAKTOR_REFERENZ_KG_PRO_KWH_WAERME;
                        const einsparungKg = baselineKg * REDUKTIONSQUOTE;
                        const kgFormatter = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                        co2SavingsEl.textContent = `${kgFormatter.format(einsparungKg)} kg`;
                    }
                } catch {}

                const teaserRangeEl = document.getElementById('teaser-range');
                if (teaserRangeEl) {
                    const rangeMin = Math.min(einspeisungValue, eigenverbrauchValue);
                    const rangeMax = Math.max(einspeisungValue, eigenverbrauchValue);
                    const formatRange = (val) => `${(val / 1000).toFixed(0)} T€`;
                    teaserRangeEl.textContent = `${formatRange(rangeMin)} – ${formatRange(rangeMax)}`;
                }
            }
        };

        berechnenBtn.addEventListener('click', updateHeizlast);
        verbrauchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                updateHeizlast();
            }
        });
    }

    function initDetailPrefill() {
        try {
            const params = new URLSearchParams(location.search);
            const v = params.get('v');
            if (!v) return;
            const input = document.getElementById('verbrauch');
            if (input && !input.value) input.value = v;
        } catch {
            /* no-op */
        }
    }

    function initRevenueApply() {
        const buttons = document.querySelectorAll('.rev-apply');
        const target = document.getElementById('Ertrag');
        if (!buttons.length || !target) return;

        const parseCurrency = (text) => {
            const normalized = String(text || '').replace(/[^\d,.,-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.');
            const num = parseFloat(normalized);
            return Number.isFinite(num) ? num : NaN;
        };

        const formatCurrency = (value) => euroFormatter.format(value);

        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const sourceId = btn.getAttribute('data-source');
                const sourceEl = sourceId ? document.getElementById(sourceId) : null;
                if (!sourceEl) return;
                const value = parseCurrency(sourceEl.textContent);
                if (!Number.isFinite(value)) return;
                target.textContent = `Ertrag: ${formatCurrency(value)}`;
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
    }

    window.FuchsCalculator = {
        initCalculator,
        initDetailPrefill,
        initRevenueApply
    };
})();


