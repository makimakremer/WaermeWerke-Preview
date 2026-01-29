// -------------------------------
// Blog: Daten und Funktionen
// -------------------------------
// Optionales Supabase-Backend (Public Read via RLS, Write für eingeloggte Redakteure)
const SUPABASE_URL = 'https://xzlvcsnqtsjjcphbwrmf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bHZjc25xdHNqamNwaGJ3cm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzgyOTAsImV4cCI6MjA3ODcxNDI5MH0.ihZwUkAyFGQVUMl43XQS2PRCnHh3aCFsicSJUmHwEFQ';
const SUPABASE_BUCKET = 'blog-covers';
const SUPABASE_CACHE_KEY = 'fuchs.blog.supabase.cache.v1';

let __supaClient = null;
let __supaLoaded = false;
let __quillLoaded = false;
let __quill;
async function getSupabaseClient() {
    try {
        if (__supaClient) return __supaClient;
        if (!SUPABASE_URL || SUPABASE_URL.startsWith('YOUR_')) return null;
        if (!SUPABASE_ANON || SUPABASE_ANON.startsWith('YOUR_')) return null;
        if (!__supaLoaded) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://unpkg.com/@supabase/supabase-js@2';
                s.async = true;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
            __supaLoaded = true;
        }
        if (!window.supabase) return null;
        __supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        return __supaClient;
    } catch (_) {
        return null;
    }
}
function getSupabaseCached() {
    try { return JSON.parse(localStorage.getItem(SUPABASE_CACHE_KEY) || '[]'); } catch (_) { return []; }
}
function setSupabaseCached(arr) {
    try { localStorage.setItem(SUPABASE_CACHE_KEY, JSON.stringify(arr || [])); } catch (_) {}
}
async function fetchSupabasePosts() {
    try {
        const supa = await getSupabaseClient();
        if (!supa) return [];
        const nowIso = new Date().toISOString();
        // Versuche: alle Spalten (*) holen, Filter publish_at falls vorhanden
        let data = null, error = null;
        try {
            const res = await supa
                .from('posts')
                .select('*')
                .eq('published', true)
                .lte('publish_at', nowIso)
                .order('publish_at', { ascending: false })
                .order('date', { ascending: false });
            data = res.data; error = res.error;
        } catch (e) {
            error = e;
        }
        // Fallback, falls publish_at fehlt oder Order fehlschlägt
        if (error && /publish_?at|column .* does not exist|could not find.*publish/i.test((error.message || '') + '')) {
            try {
                const res2 = await supa
                    .from('posts')
                    .select('*')
                    .eq('published', true)
                    .order('date', { ascending: false });
                data = res2.data || [];
                error = res2.error || null;
            } catch (e2) {
                error = e2;
            }
        }
        if (error) return [];
        const normalized = (data || []).map(p => ({
            slug: p.slug, title: p.title, date: p.date, excerpt: p.excerpt || '',
            content: p.content || '', tags: Array.isArray(p.tags) ? p.tags : [],
            cover: p.cover || '', authorName: p.authorName || '', authorTitle: p.authorTitle || '',
            seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '',
            publish_at: p.publish_at
        }));
        setSupabaseCached(normalized);
        return normalized;
    } catch(_) { return []; }
}

// Quill lazy loader
async function loadQuill() {
    if (__quillLoaded && window.Quill) return true;
    try {
        // Load CSS
        await new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/quill@1.3.7/dist/quill.snow.css';
            link.onload = resolve; link.onerror = reject;
            document.head.appendChild(link);
        });
        // Load JS
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/quill@1.3.7/dist/quill.min.js';
            s.async = true;
            s.onload = resolve; s.onerror = reject;
            document.body.appendChild(s);
        });
        __quillLoaded = true;
        return true;
    } catch(e) {
        console.warn('Quill konnte nicht geladen werden:', e);
        return false;
    }
}
// DOMPurify lazy loader
let __purifyLoaded = false;
async function loadDOMPurify() {
    if (__purifyLoaded && window.DOMPurify) return true;
    try {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js';
            s.async = true;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
        __purifyLoaded = true;
        return true;
    } catch (e) {
        console.warn('DOMPurify konnte nicht geladen werden:', e);
        return false;
    }
}
function sanitizeHtml(html) {
    try {
        if (!html) return '';
        if (!window.DOMPurify) return html;
        const clean = window.DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p','strong','em','u','s','ol','ul','li','a','img','blockquote','pre','code','h2','h3','br','span'],
            ALLOWED_ATTR: ['href','target','rel','src','alt','title','class'],
            FORBID_TAGS: ['script','style'],
            FORCE_BODY: true,
            RETURN_TRUSTED_TYPE: false
        });
        return clean;
    } catch (_) {
        return html;
    }
}
const BLOG_LS_KEY = 'fuchs.blog.posts.v1';
function getStoredPosts() {
    try {
        const json = localStorage.getItem(BLOG_LS_KEY) || '[]';
        const arr = JSON.parse(json);
        if (!Array.isArray(arr)) return [];
        // Basic validation
        return arr.filter(p => p && typeof p.slug === 'string' && typeof p.title === 'string');
    } catch (_) { return []; }
}
function setStoredPosts(posts) {
    try { localStorage.setItem(BLOG_LS_KEY, JSON.stringify(posts || [])); } catch (_) {}
}
function getAllPosts() {
    const stored = getStoredPosts();              // Admin lokal (Entwurf/Vorschau)
    const supaCached = getSupabaseCached();       // Cloud veröffentlichte Beiträge (Cache)
    const map = new Map();
    for (const p of blogPosts) map.set(p.slug, p);                                             // Code-Posts
    for (const p of supaCached) map.set(p.slug, Object.assign({}, map.get(p.slug) || {}, p));  // Supabase überschreibt Code
    for (const p of stored) map.set(p.slug, Object.assign({}, map.get(p.slug) || {}, p));      // Lokal überschreibt alle (für Vorschau)
    const all = Array.from(map.values());
    return all.sort((a, b) => new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01'));
}
const blogPosts = [
    {
        slug: "kwk-grundlagen-2025",
        title: "KWK/ThermoHybrid – Grundlagen, Wirkungsgrade und Einsatzbereiche",
        date: "2025-11-01",
        excerpt: "Was KWK ist, warum Gesamtwirkungsgrade >90% möglich sind und wo sie sich lohnt.",
        content: "<h2>Was bedeutet KWK konkret?</h2><p>Kraft‑Wärme‑Kopplung (KWK, oft als ThermoHybrid bezeichnet) produziert <strong>gleichzeitig Strom und Wärme</strong>. Die Abwärme der Stromerzeugung wird als Nutzwärme bereitgestellt. Gegenüber getrennter Erzeugung sinken Brennstoffbedarf und Emissionen deutlich.</p><h3>Typische Kennzahlen (kleine gasmotorische ThermoHybrid)</h3><ul><li>Elektrischer Wirkungsgrad: <strong>ca. 30–40%</strong></li><li>Thermischer Wirkungsgrad: <strong>ca. 50–60%</strong></li><li>Gesamtwirkungsgrad: <strong>>90%</strong> (bezogen auf den Brennwert)</li><li>Wirtschaftlich bei <strong>Grundlastbetrieb</strong> mit vielen Vollbenutzungsstunden</li></ul><h3>Geeignete Einsatzbereiche</h3><ul><li>Hotels, Mehrfamilienhäuser, Quartiere</li><li>Gewerbe/Kommunen mit ganzjähriger Wärmelast</li><li>Hybrid‑Systeme mit <strong>Wärmepumpe</strong> und <strong>PV</strong> (ThermoHybrid)</li></ul><h3>Schnellcheck</h3><ul><li>Stabile Wärmemindestlast vorhanden?</li><li>Vor Ort nutzbarer <strong>Eigenstrom</strong> möglich?</li><li>Niedrige <strong>Rücklauftemperaturen</strong> erreichbar (Brennwert)?</li></ul><p><em>Quellen:</em> <a href='https://www.bmwk.de/Redaktion/DE/Dossier/kraft-waerme-kopplung.html' target='_blank' rel='noopener'>BMWK – KWK</a>, <a href='https://www.dena.de/themen-projekte/energiesystem/kwk/' target='_blank' rel='noopener'>dena – KWK</a></p>",
        tags: ["Technik", "Grundlagen", "Nachhaltigkeit"],
        cover: "images/blog/blog-kwk-grundlagen.svg",
        authorName: "Fuchs Team",
        authorTitle: "Energie & Technik"
    },
    {
        slug: "co2-preis-2025-auswirkungen-kwk",
        title: "CO2-Preis 2025 (BEHG) und Auswirkungen auf den KWK-Betrieb",
        date: "2025-11-05",
        excerpt: "Was der nationale CO2-Preis 2025 für Gas und Betriebskosten bedeutet.",
        content: "<p>Der nationale Emissionshandel (BEHG) setzt 2025 einen Festpreis von 55 €/t CO2 an. Für Erdgas ergibt sich daraus ein Zuschlag von rund 1,1 ct/kWh (Emissionsfaktor ca. 0,201 kg CO2/kWh).</p><p>Für KWK-Betreiber ist wichtig: Der CO2-Kosteneffekt trifft die Wärmekilowattstunde, während der selbstgenutzte KWK-Strom Strombezugskosten reduziert. Die Wirtschaftlichkeit hängt daher stark von Vollbenutzungsstunden, Eigenstromnutzung und dem Verhältnis von Strom- zu Gaspreis ab.</p><p>Quellen: <a href='https://www.bmuv.de/themen/klimaschutz-klimaanpassung/klimaschutz/klimawandel-verursacher-verursacherprinzip/co2-preis-im-nationalen-emissionshandel' target='_blank' rel='noopener'>BMUV – CO2-Preis</a>, <a href='https://www.umweltbundesamt.de/themen/verkehr-laerm/emissionsdaten/emissionsfaktoren' target='_blank' rel='noopener'>UBA – Emissionsfaktoren</a></p>",
        tags: ["Wirtschaftlichkeit", "Nachhaltigkeit", "Recht"],
        cover: "images/blog/blog-co2-preis-2025.svg",
        authorName: "Laura König",
        authorTitle: "Energieberatung"
    },
    {
        slug: "kwkg-foerderung-2025-ueberblick",
        title: "Förderung nach KWKG 2025: Zuschläge und Laufzeiten",
        date: "2025-10-20",
        excerpt: "Zuschlagsdauer (30–60 Tsd. Vollbenutzungsstunden), Eckpunkte und Antragstellung.",
        content: "<h2>KWKG 2025 – Zuschläge & Laufzeiten</h2><p>Das KWKG fördert <strong>effizienten KWK‑Strom</strong> über einen Zuschlag je kWh. Die <strong>Zuschlagsdauer</strong> beträgt – je nach elektrischer Leistung – <strong>30.000 / 45.000 / 60.000</strong> Vollbenutzungsstunden.</p><h3>Wichtige Punkte</h3><ul><li><strong>Zulassung</strong> der Anlage notwendig (Formalia, Fristen).</li><li>Messkonzept klärt <strong>Eigenversorgung</strong>, <strong>Dritte</strong> und <strong>Einspeisung</strong>.</li><li>Zuschläge beziehen sich auf den <strong>KWK‑Strom</strong>.</li></ul><h3>Praxisfahrplan</h3><ol><li>Wirtschaftlichkeit & Varianten prüfen</li><li>Mess‑/Abrechnungskonzept fixieren</li><li>Zulassung beantragen</li><li>Inbetriebnahme, Monitoring & Nachweisführung</li></ol><p><em>Quellen:</em> <a href='https://www.gesetze-im-internet.de/kwkg_2020/' target='_blank' rel='noopener'>KWKG</a>, <a href='https://www.bafa.de/DE/Energie/Kraft_Waerme_Kopplung/kwk_node.html' target='_blank' rel='noopener'>BAFA – KWK</a></p>",
        tags: ["Förderung", "Recht", "Wirtschaftlichkeit"],
        cover: "images/blog/blog-kwkg-foerderung.svg",
        authorName: "Tim Albrecht",
        authorTitle: "Fördermittel"
    },
    {
        slug: "auslegung-lastprofil-kwk",
        title: "Auslegung & Lastprofil: So dimensionieren Sie KWK richtig",
        date: "2025-10-05",
        excerpt: "Vollbenutzungsstunden, Grundlast und Pufferspeicher – die wichtigsten Stellhebel.",
        content: "<h2>Grundsätze der Dimensionierung</h2><ul><li><strong>Grundlast</strong> statt Spitzen: KWK deckt den konstanten Wärmebedarf.</li><li><strong>Vollbenutzungsstunden</strong> maximieren (typisch >4.000–5.000 h/a).</li><li><strong>Pufferspeicher</strong> verringern Starts und glätten Laufzeiten.</li></ul><h3>Vorgehen in 5 Schritten</h3><ol><li>Reale Lastgänge (Wärme/Strom) erfassen und auswerten</li><li>KWK‑Leistung aus Grundlast ableiten</li><li>Puffergröße so wählen, dass <strong>längere Laufzeiten</strong> pro Start möglich sind</li><li>Hydraulik mit niedrigen Rückläufen für <strong>Brennwertnutzung</strong> auslegen</li><li>Regelstrategie definieren (Start/Stop, Prioritäten, Wärmevorrang)</li></ol><h3>Hinweis</h3><p>Jede Liegenschaft ist individuell – ohne reale Daten drohen Fehlgrößen. Messung schlägt Schätzung.</p><p><em>Quelle:</em> <a href='https://www.dena.de/themen-projekte/energiesystem/kwk/' target='_blank' rel='noopener'>dena – Leitfaden KWK</a></p>",
        tags: ["Technik", "Wirtschaftlichkeit", "Praxis"],
        cover: "images/blog/blog-auslegung-lastprofil.svg",
        authorName: "Lea Schneider",
        authorTitle: "Projektleitung"
    },
    {
        slug: "technik-brennwert-puffer",
        title: "Technik: Brennwert, Hydraulik, Puffer – was wirklich zählt",
        date: "2025-09-25",
        excerpt: "Mehr Effizienz durch niedrige Rückläufe, richtige Speicher und saubere Einbindung.",
        content: "<h2>Brennwertnutzung und Hydraulik</h2><ul><li>Niedrige Rücklauftemperaturen erhöhen den <strong>Brennwerteffekt</strong>.</li><li>Hydraulische Entkopplung und saubere Strangführung sichern stabile Temperaturen.</li><li>Rückschlagventile und Rücklauftemperaturanhebung verhindern Fehlzirkulationen.</li></ul><h3>Pufferspeicher richtig einsetzen</h3><ul><li><strong>Ausreichendes Volumen</strong> reduziert Starts und Verschleiß.</li><li>Mehrstufige Be‑/Entladung verbessert Schichtung und Temperaturniveau.</li></ul><p><em>Quellen:</em> <a href='https://www.agfw.de/' target='_blank' rel='noopener'>AGFW</a>, <a href='https://www.vdi.de/' target='_blank' rel='noopener'>VDI</a></p>",
        tags: ["Technik", "Praxis"],
        cover: "images/blog/blog-technik-brennwert-puffer.svg",
        authorName: "Jonas Weber",
        authorTitle: "Technik"
    },
    {
        slug: "thermohybrid-kwk-waermepumpe-pv",
        title: "ThermoHybrid: KWK + Wärmepumpe + PV im Verbund",
        date: "2025-09-10",
        excerpt: "Sektorkopplung in der Praxis: Prioritäten, Steuerung und Beispiele.",
        content: "<h2>Intelligente Kopplung der Sektoren</h2><p>ThermoHybrid kombiniert die Stärken von <strong>KWK</strong> (hoher Gesamtwirkungsgrad, Wärme) und <strong>Wärmepumpe</strong> (sehr effiziente Wärmeerzeugung bei günstiger Stromlage). <strong>PV</strong> liefert günstigen Strom für WP und Verbraucher.</p><h3>Steuerungsprinzip</h3><ul><li><strong>Sommer:</strong> PV priorisiert, WP nutzt Überschüsse, KWK meist aus.</li><li><strong>Übergang:</strong> Optimierung zwischen PV‑Strom, WP und KWK.</li><li><strong>Winter:</strong> KWK deckt Grundlast und liefert Eigenstrom; WP optional für Niedertemperaturzonen.</li></ul><p><em>Quellen:</em> <a href='https://www.bmwk.de/Redaktion/DE/Dossier/waermewende.html' target='_blank' rel='noopener'>BMWK – Wärmewende</a>, <a href='https://www.solarwirtschaft.de/' target='_blank' rel='noopener'>BSW‑Solar</a></p>",
        tags: ["Technik", "Nachhaltigkeit", "Praxis"],
        cover: "images/blog/blog-thermohybrid-kombi.svg",
        authorName: "Fuchs Team",
        authorTitle: "Systemintegration"
    },
    {
        slug: "nachhaltige-brennstoffe-bhkws",
        title: "Alternativen: Biogas, Wasserstoff, eFuels – was heute schon geht",
        date: "2025-08-28",
        excerpt: "Welche Beimischungen Hersteller freigeben und was regulatorisch wichtig ist.",
        content: "<h2>Optionen für klimafreundlichere KWK</h2><ul><li><strong>Biogas/Biomethan:</strong> Aufbereitet und eingespeist, bilanziell erneuerbar.</li><li><strong>H₂‑Beimischung:</strong> Viele Motoren sind für <strong>bis ~20% H₂</strong> (typisch) freigegeben – <em>herstellerabhängig</em>.</li><li><strong>eFuels:</strong> Perspektivisch interessant, heute noch begrenzte Verfügbarkeit.</li></ul><h3>Worauf achten?</h3><ul><li>Materialverträglichkeit, Flammgeschwindigkeit, Zünd‑/Gemisch‑Anpassungen</li><li>Dokumentierte <strong>Herstellerfreigaben</strong> und geltende Normen</li></ul><p><em>Quellen:</em> <a href='https://www.dvgw.de/' target='_blank' rel='noopener'>DVGW – Wasserstoff im Gasnetz</a>, Herstellerangaben</p>",
        tags: ["Nachhaltigkeit", "Technik", "Recht"],
        cover: "images/blog/blog-nachhaltige-brennstoffe.svg",
        authorName: "Fuchs Team",
        authorTitle: "Engineering"
    },
    {
        slug: "praxisfall-hotel-80-zimmer",
        title: "Praxis: Hotel (80 Zimmer) – von der Idee zum Betrieb",
        date: "2025-08-12",
        excerpt: "Vorgehen, Datenbasis, Messkonzepte und typische Stolpersteine.",
        content: "<h2>Warum Hotels prädestiniert sind</h2><p>Hohe Grundlast durch Warmwasser, Küche, Lüftung und oft ganzjährige Belegung. Damit sind viele Vollbenutzungsstunden realistisch.</p><h3>Projektablauf</h3><ol><li><strong>Datenaufnahme:</strong> Wärme‑/Stromlastgänge, Temperaturen, Laufzeiten</li><li><strong>Auslegung:</strong> KWK‑Leistung aus Grundlast, Puffer, Hydraulik</li><li><strong>Messkonzept:</strong> Eigenstrom, Dritte, Abrechnung</li><li><strong>Umsetzung:</strong> Bau, Inbetriebnahme, Dokumentation</li><li><strong>Monitoring:</strong> Laufzeiten, Wirkungsgrade, Wartung</li></ol><h3>Stolpersteine</h3><ul><li>Schätzungen statt realer Daten → <strong>Fehlgrößen</strong></li><li>Zu kleiner Puffer → viele Starts, hoher Verschleiß</li><li>Ungünstige Rückläufe → verschenkter Brennwerteffekt</li></ul><p><em>Quelle:</em> <a href='https://www.dena.de/' target='_blank' rel='noopener'>dena</a></p>",
        tags: ["Praxis", "Wirtschaftlichkeit", "Technik"],
        cover: "images/blog/blog-praxis-hotel.svg",
        authorName: "Lea Schneider",
        authorTitle: "Projektleitung"
    },
    {
        slug: "betrieb-wartung-verfuegbarkeit",
        title: "Betrieb & Wartung: Intervalle, Kostenblöcke, Verfügbarkeit",
        date: "2025-07-30",
        excerpt: "Wartungszyklen, Ersatzteile, Öl und wie Sie Laufzeiten stabil halten.",
        content: "<h2>Wartung – die Lebensversicherung der KWK</h2><ul><li><strong>Intervalle:</strong> oft 4.000–6.000 Bh (herstellerabhängig)</li><li><strong>Umfang:</strong> Öl/Filter, Zündkerzen, Dichtungen, Einstellungen</li><li><strong>Ziel:</strong> stabile Laufzeiten, hohe Verfügbarkeit, Effizienz</li></ul><h3>Kostenblöcke</h3><ul><li>Material/Ersatzteile und Arbeitszeit</li><li>Fernüberwachung/Monitoring</li><li>Größere Revisionen nach x Betriebsstunden</li></ul><p><em>Quellen:</em> Herstellerangaben, <a href='https://www.ThermoHybrid-infozentrum.de/' target='_blank' rel='noopener'>ThermoHybrid‑Infozentrum</a></p>",
        tags: ["Praxis", "Technik", "Wirtschaftlichkeit"],
        cover: "images/blog/blog-betrieb-wartung.svg",
        authorName: "Jonas Weber",
        authorTitle: "Technik"
    },
    {
        slug: "recht-messkonzept-abgaben-2025",
        title: "Recht & Messkonzept 2025: Eigenverbrauch, Dritte, Abgaben",
        date: "2025-07-15",
        excerpt: "Welche Zähler Sie brauchen und wie Abgaben/Umlagen beeinflusst werden.",
        content: "<h2>Warum das Messkonzept so wichtig ist</h2><p>Es entscheidet, welche Energiemengen als <strong>Eigenverbrauch</strong>, <strong>Drittverbrauch</strong> oder <strong>Einspeisung</strong> gelten – mit Folgen für Abgaben/Umlagen und Meldepflichten.</p><h3>Best‑Practice</h3><ul><li>Unterzähler dort, wo <strong>Dritte</strong> versorgt werden</li><li>Abstimmung mit Netzbetreiber vor Umsetzung</li><li>Dokumentation und eindeutige Zählpunktbezeichnungen</li></ul><p><em>Quellen:</em> <a href='https://www.bundesnetzagentur.de/' target='_blank' rel='noopener'>BNetzA</a>, <a href='https://www.bmwk.de/' target='_blank' rel='noopener'>BMWK</a></p>",
        tags: ["Recht", "Praxis"],
        cover: "images/blog/blog-recht-messkonzept.svg",
        authorName: "Fuchs Team",
        authorTitle: "Regulatorik"
    },
    {
        slug: "strommix-und-kwk-klima",
        title: "Strommix und KWK: Klimawirkung richtig einordnen",
        date: "2025-07-01",
        excerpt: "Warum die Emissionsbilanz projektspezifisch ist – und wie Sie rechnen.",
        content: "<h2>So bewerten Sie die Klimawirkung</h2><ol><li>Systemgrenze festlegen (Wärme, Strom, Betriebsweise)</li><li>Referenz definieren (getrennte Erzeugung, Strommix)</li><li>Aktuelle <strong>Emissionsfaktoren</strong> nutzen (Wärme & Strom)</li><li>Reale Lastdaten statt Nominalwerte verwenden</li></ol><p>Die Emissionsfaktoren des deutschen Strommix <strong>ändern sich jährlich</strong>. Prüfen Sie aktuelle Veröffentlichungen, z. B. UBA/Agora.</p><p><em>Quellen:</em> <a href='https://www.umweltbundesamt.de/' target='_blank' rel='noopener'>UBA</a>, <a href='https://www.agora-energiewende.de/' target='_blank' rel='noopener'>Agora Energiewende</a></p>",
        tags: ["Nachhaltigkeit", "Wirtschaftlichkeit"],
        cover: "images/blog/blog-strommix-kwk-klima.svg",
        authorName: "Laura König",
        authorTitle: "Energieberatung"
    },
    {
        slug: "projektabwicklung-kwk",
        title: "Projektabwicklung: Von Idee, Netz, Genehmigung bis Inbetriebnahme",
        date: "2025-06-20",
        excerpt: "Schritte, Timings, Abstimmungen und Checklisten für ein reibungsloses Projekt.",
        content: "<h2>Der bewährte Projektfahrplan</h2><ol><li><strong>Vorprüfung:</strong> Standort, Lastdaten, Platz, Netzanschlüsse</li><li><strong>Wirtschaftlichkeit & Förderung:</strong> Variantenvergleich, KWKG</li><li><strong>Netz/Genehmigung:</strong> frühzeitig klären, Fristen einplanen</li><li><strong>Detailengineering:</strong> Hydraulik, MSR, Messkonzept</li><li><strong>Umsetzung & Inbetriebnahme:</strong> Dokumentation, Prüfungen</li><li><strong>Monitoring:</strong> Laufzeiten, Effizienz, Optimierung</li></ol><p>Entscheidend sind klare <strong>Schnittstellen</strong> (Gas/Wasser, Strom, MSR) und ein <strong>sauberes Messkonzept</strong>.</p><p><em>Quellen:</em> <a href='https://www.bafa.de/DE/Energie/Kraft_Waerme_Kopplung/kwk_node.html' target='_blank' rel='noopener'>BAFA – KWK</a>, <a href='https://www.vde.com/de/fnn' target='_blank' rel='noopener'>VDE/FNN</a></p>",
        tags: ["Praxis", "Technik", "Recht"],
        cover: "images/blog/blog-projektabwicklung-kwk.svg",
        authorName: "Fuchs Team",
        authorTitle: "Projektmanagement"
    }
];

function formatDateISOToDE(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: '2-digit' });
    } catch (e) {
        return iso;
    }
}

function toLocalDatetimeLocalString(iso) {
    try {
        const d = iso ? new Date(iso) : new Date();
        // datetime-local erwartet lokale Zeit ohne Zeitzonen-Suffix
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    } catch (_) {
        return '';
    }
}
function fromDatetimeLocalToISO(localValue) {
    try {
        if (!localValue) return new Date().toISOString();
        const d = new Date(localValue);
        return d.toISOString();
    } catch (_) {
        return new Date().toISOString();
    }
}

function renderBlogList(posts) {
    const listEl = document.getElementById('blog-list');
    const detailEl = document.getElementById('blog-detail');
    if (!listEl || !detailEl) return;

    detailEl.classList.add('hidden');
    const byline = (p) => {
        const a = (p.authorName || '').trim();
        const t = (p.authorTitle || '').trim();
        const date = formatDateISOToDE(p.date);
        if (a && t) return 'Von ' + a + ', ' + t + ' — ' + date;
        if (a) return 'Von ' + a + ' — ' + date;
        return date;
    };

    // Load-more handling
    const loadMoreBtn = document.getElementById('blog-load-more');
    const VISIBLE_STEP = 6;
    const state = renderBlogList._state || { visible: VISIBLE_STEP };
    if (posts.length <= VISIBLE_STEP) state.visible = posts.length;

    const visiblePosts = posts.slice(0, state.visible);
    listEl.innerHTML = visiblePosts.map(p => (
        '<article class="blog-card" data-slug="' + p.slug + '">' +
            '<div class="blog-cover">' +
                '<img src="' + (p.cover || 'images/Hero.webp') + '" alt="' + p.title.replace(/"/g, '&quot;') + '" onerror="this.onerror=null; this.src=\'images/Hero.webp\';">' +
            '</div>' +
            '<div class="blog-content">' +
                '<h3 class="heading-lg">' + p.title + '</h3>' +
                '<p class="byline">' + byline(p) + '</p>' +
                '<p class="text-content">' + p.excerpt + '</p>' +
            '</div>' +
        '</article>'
    )).join('');

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (state.visible < posts.length) ? 'inline-flex' : 'none';
        loadMoreBtn.onclick = () => {
            state.visible = Math.min(posts.length, state.visible + VISIBLE_STEP);
            renderBlogList._state = state;
            renderBlogList(posts);
        };
    }
}

function renderBlogDetail(post) {
    const listEl = document.getElementById('blog-list');
    const detailEl = document.getElementById('blog-detail');
    if (!listEl || !detailEl || !post) return;

    listEl.innerHTML = '';
    detailEl.classList.remove('hidden');

    // SEO meta injection
    (function applyPostSEO(p){
        try {
            const title = (p.seoTitle || p.title || 'Blog') + ' | Fuchs';
            document.title = title;
            const desc = (p.seoDescription || p.excerpt || '').toString().trim().slice(0, 160);
            function upsertMeta(selector, attrs) {
                let el = document.head.querySelector(selector);
                if (!el) {
                    el = document.createElement('meta');
                    document.head.appendChild(el);
                }
                Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
                return el;
            }
            upsertMeta('meta[name="description"]', { name: 'description', content: desc });
            upsertMeta('meta[property="og:title"]', { property: 'og:title', content: p.title || '' });
            upsertMeta('meta[property="og:description"]', { property: 'og:description', content: desc });
            upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
            if (p.cover) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: p.cover });
            // canonical
            let link = document.head.querySelector('link[rel="canonical"]');
            if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
            link.setAttribute('href', location.href);
            // JSON-LD
            const ld = {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": p.title,
                "description": desc,
                "datePublished": p.date,
                "author": { "@type": "Person", "name": p.authorName || "Fuchs Team" },
                "image": p.cover ? [p.cover] : undefined,
                "mainEntityOfPage": location.href
            };
            let jsonEl = document.getElementById('post-jsonld');
            if (!jsonEl) { jsonEl = document.createElement('script'); jsonEl.id = 'post-jsonld'; jsonEl.type = 'application/ld+json'; document.head.appendChild(jsonEl); }
            jsonEl.textContent = JSON.stringify(ld);
        } catch (_) {}
    })(post);

    const categoryTags = (post.tags || []).filter(t => ['Wirtschaftlichkeit', 'Förderung', 'Technik', 'Praxis', 'Recht', 'Nachhaltigkeit', 'Grundlagen'].includes(t));
    const firstCategory = categoryTags.length > 0 ? categoryTags[0] : '';

    detailEl.innerHTML = '' +
        '<article class="blog-article">' +
            (firstCategory ? '<div class="detail-category-tag">' + firstCategory + '</div>' : '') +
            '<h1 class="detail-title">' + post.title + '</h1>' +
            '<div class="detail-meta-grid">' +
                '<div class="detail-meta-col">' +
                    '<span class="meta-label">Datum</span>' +
                    '<span class="meta-value">' + formatDateISOToDE(post.date) + '</span>' +
                '</div>' +
                '<div class="detail-meta-col">' +
                    '<span class="meta-label">Autor</span>' +
                    '<span class="meta-value">' + (post.authorName || 'Fuchs Team') + '</span>' +
                '</div>' +
                '<div class="detail-meta-col">' +
                    '<span class="meta-label">Lesezeit</span>' +
                    '<span class="meta-value">5 min</span>' +
                '</div>' +
                '<div class="detail-meta-col">' +
                    '<span class="meta-label">Teilen</span>' +
                    '<div class="share-icons">' +
                        '<a href="#" aria-label="Auf Twitter teilen" class="share-icon">𝕏</a>' +
                        '<a href="#" aria-label="Auf LinkedIn teilen" class="share-icon">in</a>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="blog-detail-cover">' +
                '<img src="' + (post.cover || 'images/Hero.webp') + '" alt="' + post.title.replace(/"/g, '&quot;') + '" onerror="this.onerror=null; this.src=\'images/Hero.webp\';">' +
            '</div>' +
            '<div class="detail-body">' + sanitizeHtml(post.content) + '</div>' +
        '</article>' +
        '<div class="related-section">' +
            '<h2 class="heading-xl">Verwandte Beiträge</h2>' +
            '<div class="related-posts" id="related-posts"></div>' +
        '</div>';

    // Render related posts (exclude current, max 2)
    const relatedPosts = getAllPosts().filter(p => p.slug !== post.slug).slice(0, 2);
    const relatedEl = document.getElementById('related-posts');
    if (relatedEl && relatedPosts.length > 0) {
        relatedEl.innerHTML = relatedPosts.map(p => (
            '<article class="blog-card" data-slug="' + p.slug + '">' +
                '<div class="blog-cover">' +
                    '<img src="' + (p.cover || 'images/Hero.webp') + '" alt="' + p.title.replace(/"/g, '&quot;') + '" onerror="this.onerror=null; this.src=\'images/Hero.webp\';">' +
                '</div>' +
                '<div class="blog-content">' +
                    '<h3 class="heading-lg">' + p.title + '</h3>' +
                    '<p class="byline">' + ((p.authorName || '') + ', ' + (p.authorTitle || '') + ' — ' + formatDateISOToDE(p.date)) + '</p>' +
                    '<p class="text-content">' + p.excerpt + '</p>' +
                '</div>' +
            '</article>'
        )).join('');

        relatedEl.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            const card = target.closest('[data-slug]');
            const slug = card ? card.getAttribute('data-slug') : null;
            if (slug) {
                location.hash = '#blog/' + slug;
            }
        });
    }
}

function getPostBySlug(slug) {
    return getAllPosts().find(p => p.slug === slug);
}

function handleBlogNavigationFromHash() {
    const hash = location.hash || '';
    if (!hash.startsWith('#blog')) return;

    const parts = hash.split('/');
    const slug = parts.length > 1 ? parts[1] : '';
    if (slug) {
        const post = getPostBySlug(slug);
        if (post) {
            renderBlogDetail(post);
            scrollIntoViewSmooth('blog');
        } else {
            renderBlogList(getAllPosts());
            scrollIntoViewSmooth('blog');
        }
    } else {
        renderBlogList(getAllPosts());
        scrollIntoViewSmooth('blog');
    }
}

function scrollIntoViewSmooth(id) {
    const el = document.getElementById(id);
    if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initBlog() {
    const listEl = document.getElementById('blog-list');
    const searchEl = document.getElementById('blog-search');
    const filtersEl = document.getElementById('blog-filters');
    const clearBtn = document.getElementById('filter-clear');
    if (!listEl || !searchEl) return;

    // Initial render
    renderBlogList(getAllPosts());
    // Supabase (falls konfiguriert) nachladen und Ansicht aktualisieren
    getSupabaseClient().then(client => {
        if (!client) return;
        fetchSupabasePosts().then(arr => {
            if ((location.hash || '').startsWith('#blog/')) {
                handleBlogNavigationFromHash();
            } else {
                renderBlogList(getAllPosts());
            }
        });
    });

    // Filters
    let activeTags = new Set();
    const allBtn = filtersEl ? filtersEl.querySelector('.filter-chip[data-tag="All"]') : null;

    function applyFilters() {
        const q = searchEl.value.trim().toLowerCase();
        let posts = getAllPosts();
        if (activeTags.size > 0) {
            posts = posts.filter(p => (p.tags || []).some(t => activeTags.has(t)));
        }
        if (q) {
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.excerpt.toLowerCase().includes(q) ||
                p.content.toLowerCase().includes(q) ||
                (p.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }
        renderBlogList(posts);
    }

    if (filtersEl) {
        filtersEl.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.classList.contains('filter-chip')) {
                const tag = target.getAttribute('data-tag');
                if (!tag) return;
                if (tag === 'All') {
                    // Reset others
                    activeTags.clear();
                    filtersEl.querySelectorAll('.filter-chip').forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    target.classList.add('active');
                    target.setAttribute('aria-pressed', 'true');
                } else {
                    // Toggle tag
                    const isActive = target.classList.toggle('active');
                    target.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                    if (isActive) {
                        activeTags.add(tag);
                    } else {
                        activeTags.delete(tag);
                    }
                    // Turn off All when specific selected
                    if (allBtn) {
                        allBtn.classList.remove('active');
                        allBtn.setAttribute('aria-pressed', 'false');
                    }
                }
                applyFilters();
            }
        });
    }

    if (clearBtn && filtersEl) {
        clearBtn.addEventListener('click', () => {
            activeTags.clear();
            filtersEl.querySelectorAll('.filter-chip').forEach(b => {
                const tag = b.getAttribute('data-tag');
                const isAll = tag === 'All';
                b.classList.toggle('active', isAll);
                b.setAttribute('aria-pressed', isAll ? 'true' : 'false');
            });
            applyFilters();
        });
    }

    // Delegated click for cards and buttons
    listEl.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const card = target.closest('[data-slug]');
        const slug = card ? card.getAttribute('data-slug') : target.getAttribute('data-slug');
        if (slug) {
            location.hash = '#blog/' + slug;
        }
    });

    // Search
    searchEl.addEventListener('input', applyFilters);

    // Hash-based navigation
    window.addEventListener('hashchange', handleBlogNavigationFromHash);
    if ((location.hash || '').startsWith('#blog')) {
        handleBlogNavigationFromHash();
    }
}

document.addEventListener('DOMContentLoaded', initBlog);

// -------------------------------
// Gallery: Scroll + Active Text
// -------------------------------
function initGallery() {
    const track = document.getElementById('gallery-track');
    const headingsList = document.getElementById('gallery-headings');
    if (!track || !headingsList) return;

    const items = Array.from(track.querySelectorAll('.gallery-item'));
    const detailBlocks = Array.from(track.querySelectorAll('.gallery-detail'));
    const headingItems = Array.from(headingsList.querySelectorAll('.gallery-heading-item'));
    const headings = Array.from(headingsList.querySelectorAll('.gallery-heading'));

    // Linke Texte (Desktop-Liste) in strukturierte UL/LI umwandeln
    (function normalizeLeftTexts(){
        const texts = Array.from(headingsList.querySelectorAll('.gallery-text'));
        texts.forEach(el => {
            const html = el.innerHTML || '';
            if (/<ul|<ol|<li>/i.test(html)) return; // bereits strukturiert
            el.innerHTML = transformGalleryTextToList(html);
        });
    })();

    function transformGalleryTextToList(html) {
        try {
            const normalized = (html || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/\r/g, '');
            const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let result = '';
            let inList = false;
            const bulletLike = (s) => s.startsWith('✓') || /^[•\-\–—]/.test(s) || s.includes(' – ') || s.includes(' - ');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lower = line.toLowerCase();
                const isSubtitle = lower.startsWith('ihre vorteile');
                const isBullet = bulletLike(line);

                if (isSubtitle) {
                    if (inList) { result += '</ul>'; inList = false; }
                    result += '<div class="gallery-detail-subtitle">' + line + '</div>';
                    continue;
                }

                if (isBullet) {
                    if (!inList) { result += '<ul>'; inList = true; }
                    const cleaned = line.replace(/^[•\-\–—✓]\s*/, '').replace(/^\s*✓\s*/, '');
                    result += '<li>' + cleaned + '</li>';
                } else {
                    if (inList) { result += '</ul>'; inList = false; }
                    result += '<p>' + line + '</p>';
                }
            }
            if (inList) result += '</ul>';
            return result;
        } catch (e) {
            return html || '';
        }
    }

    function syncDetail(index) {
        // Quelle: Text aus linker Liste
        const sourceItem = headingsList.querySelector('.gallery-heading-item[data-index="' + index + '"] .gallery-text');
        // Ziel: Detail-Block unterhalb des aktiven Bildes
        detailBlocks.forEach(d => d.classList.remove('active'));
        const target = track.querySelector('.gallery-detail[data-index="' + index + '"]');
        if (target) {
            const structured = sourceItem ? transformGalleryTextToList(sourceItem.innerHTML) : '';
            target.innerHTML = structured;
            target.classList.add('active');
        }
    }

    function setActive(index) {
        headings.forEach(h => h.classList.remove('active'));
        const h = headings[index];
        if (h) {
            h.classList.add('active');
        }
        syncDetail(index);
    }

    // Click on heading scrolls to item
    headingItems.forEach(headingItem => {
        const heading = headingItem.querySelector('.gallery-heading');
        if (!heading) return;
        
        heading.addEventListener('click', () => {
            const idx = parseInt(headingItem.getAttribute('data-index') || '0', 10);
            const item = items.find(it => parseInt(it.getAttribute('data-index') || '0', 10) === idx);
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                setActive(idx);
            }
        });
    });

    // Click on gallery item navigates to blog detail
    items.forEach(item => {
        item.addEventListener('click', () => {
            const slug = item.getAttribute('data-slug');
            if (slug) {
                location.href = 'blog.html#blog/' + slug;
            }
        });
    });

    // Set initial state
    setActive(0);

    // Observe items to update text/highlight when item enters viewport center
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const idx = parseInt(entry.target.getAttribute('data-index') || '0', 10);
                setActive(idx);
            }
        });
    }, { 
        root: null, 
        threshold: 0,
        // Create a narrow band in the vertical center (top/bottom margins shrink viewport)
        rootMargin: '-40% 0px -40% 0px'
    });

    items.forEach(it => observer.observe(it));
}

document.addEventListener('DOMContentLoaded', initGallery);

// -------------------------------
// Funnel: Multi-step form + progress
// -------------------------------
function initFunnel() {
    const form = document.getElementById('funnel-form');
    if (!form) return;

    const steps = Array.from(form.querySelectorAll('.funnel-step'));
    const btnNextList = Array.from(form.querySelectorAll('.next-step'));
    const btnPrevList = Array.from(form.querySelectorAll('.prev-step'));
    const progressBar = document.getElementById('funnel-progress-bar');
    let current = 0;

    function updateProgress() {
        // Progress starts at 0% for step 1 (index 0), then increases: step 1 = 0%, step 2 = 25%, step 3 = 50%, step 4 = 75%, step 5 = 100%
        // When on step 1, show 0% (not started yet)
        // When on step 2, show 25% (1 step completed)
        // When on step 5, show 100% (all steps visible)
        const pct = Math.max(0, Math.min(100, (current / (steps.length - 1)) * 100));
        if (progressBar) progressBar.style.width = pct + '%';
    }

    function showStep(index) {
        steps.forEach((s, i) => {
            if (i === index) {
                s.removeAttribute('hidden');
            } else {
                s.setAttribute('hidden', '');
            }
        });
        updateProgress();
        scrollIntoViewSmooth('funnel');
    }

    function validateStep(index) {
        const step = steps[index];
        if (!step) return true;
        const required = Array.from(step.querySelectorAll('[required]'));
        for (const el of required) {
            if (el.type === 'radio') {
                const name = el.name;
                const checked = step.querySelector('input[name="' + name + '"]:checked');
                if (!checked) return false;
            } else if (el.type === 'checkbox') {
                if (!el.checked) return false;
            } else if (!el.value) {
                return false;
            }
        }
        return true;
    }

    function findFirstInvalid() {
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const required = Array.from(step.querySelectorAll('[required]'));
            for (const el of required) {
                let invalid = false;
                if (el.type === 'radio') {
                    const name = el.name;
                    const checked = step.querySelector('input[name="' + name + '"]:checked');
                    invalid = !checked;
                } else if (el.type === 'checkbox') {
                    invalid = !el.checked;
                } else {
                    invalid = !el.value || (typeof el.checkValidity === 'function' && !el.checkValidity());
                }
                if (invalid) {
                    return { index: i, element: el };
                }
            }
        }
        return null;
    }

    btnNextList.forEach(btn => btn.addEventListener('click', () => {
        if (!validateStep(current)) {
            const firstReq = steps[current].querySelector('[required]');
            if (firstReq && typeof firstReq.reportValidity === 'function') firstReq.reportValidity();
            return;
        }
        if (current < steps.length - 1) {
            current += 1;
            showStep(current);
        }
    }));

    btnPrevList.forEach(btn => btn.addEventListener('click', () => {
        if (current > 0) {
            current -= 1;
            showStep(current);
        }
    }));

    // Auto-Advance removed: Users must click "Weiter" button to proceed

    // Handle form submission: prefer native POST to external service (reliable delivery)
    // Only prevent default if invalid; otherwise let the browser submit the form.
    form.addEventListener('submit', function(e) {
        // Make _next absolute so cross-origin redirect works reliably
        try {
            const nextInput = form.querySelector('input[name="_next"]');
            if (nextInput) {
                const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
                nextInput.value = origin.replace(/\/$/, '') + '/welcome.html';
            }
        } catch (_) {}
        
        if (!form.checkValidity()) {
            e.preventDefault();
            const firstInvalid = findFirstInvalid();
            if (firstInvalid) {
                current = firstInvalid.index;
                showStep(current);
                if (firstInvalid.element && typeof firstInvalid.element.reportValidity === 'function') {
                    firstInvalid.element.reportValidity();
                }
            } else {
                form.reportValidity();
            }
            return;
        }
        // Else: allow native submission (no fetch); the thank-you page will be served by _next
    });

    showStep(current);
}

document.addEventListener('DOMContentLoaded', initFunnel);

// Ensure _next hidden field for external form services uses an absolute URL (works also on index contact form)
function initExternalFormNextAbsolute() {
    const forms = Array.from(document.querySelectorAll('form[action*="formsubmit.co"]'));
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
            } catch (_) {}
        });
    });
}
document.addEventListener('DOMContentLoaded', initExternalFormNextAbsolute);

// Local dev: submit to formsubmit in a hidden iframe and redirect client-side
function initLocalDevBackgroundSubmit() {
    const isLocalHost = ['localhost', '127.0.0.1'].includes((window.location.hostname || '').toLowerCase());
    if (!isLocalHost) return;
    const forms = Array.from(document.querySelectorAll('form[action*="formsubmit.co"]'));
    forms.forEach((formEl) => {
        if (formEl.__localSubmitBound) return;
        formEl.__localSubmitBound = true;
        formEl.addEventListener('submit', function(e) {
            // Only handle valid submissions here; invalid handled elsewhere
            if (!formEl.checkValidity()) return;
            // Background-submit and keep user on our domain
            e.preventDefault();
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.name = 'hidden_iframe_' + Date.now();
            document.body.appendChild(iframe);
            const prevTarget = formEl.target;
            formEl.target = iframe.name;
            // Compute redirect url
            const nextInput = formEl.querySelector('input[name="_next"]');
            const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
            let nextUrl = (nextInput && nextInput.value) ? nextInput.value : 'welcome.html';
            if (!/^https?:\/\//i.test(nextUrl)) {
                const cleaned = nextUrl.replace(/^\//, '');
                nextUrl = origin.replace(/\/$/, '') + '/' + cleaned;
            }
            // Submit and redirect shortly after
            formEl.submit();
            setTimeout(() => { window.location.href = nextUrl; }, 400);
            setTimeout(() => {
                try {
                    formEl.target = prevTarget || '';
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                } catch(_) {}
            }, 2000);
        });
    });
}
document.addEventListener('DOMContentLoaded', initLocalDevBackgroundSubmit);

// -------------------------------
// Scroll Title Effect (ThermoHybrid) - Schrift wandert nach links bis bündig
// -------------------------------
function initScrollTitleEffect() {
    const wrapperSection = document.querySelector('.Contractor-wrapper');
    const titleElement = document.querySelector('.Contractor-pinned .heading-Center');

    if (!wrapperSection || !titleElement) return;

	let isPinned = false;

    // Text umbrechen verhindern, damit Breite exakt gemessen und skaliert werden kann
    titleElement.style.whiteSpace = 'nowrap';
    titleElement.style.display = 'inline-block';

    function getHorizontalDecorationExtraPx(el) {
        const style = window.getComputedStyle(el);
        let extra = 0;
        // text-shadow: schätzt die größte horizontale Ausdehnung (|offsetX| + blur) auf beiden Seiten
        const ts = style.textShadow;
        if (ts && ts !== 'none') {
            let maxPerSide = 0;
            ts.split(',').forEach(part => {
                const nums = part.match(/-?\d*\.?\d+px/g);
                if (nums && nums.length >= 2) {
                    const offX = Math.abs(parseFloat(nums[0]));
                    const blur = nums[2] ? Math.abs(parseFloat(nums[2])) : 0;
                    maxPerSide = Math.max(maxPerSide, offX + blur);
                }
            });
            extra += maxPerSide * 2;
        }
        // webkit text stroke (falls verwendet)
        const stroke = parseFloat(style.webkitTextStrokeWidth || '0') || 0;
        if (stroke > 0) {
            extra += stroke * 2;
        }
        // kleine Sicherheitsmarge gegen Rundungsfehler
        return extra + 1;
    }

    function fitTitleToViewportWidth() {
        const viewportWidth = window.innerWidth || 1;
        const decorationExtra = getHorizontalDecorationExtraPx(titleElement);
        const targetWidth = Math.max(1, viewportWidth - decorationExtra);

        // Transform kurz neutralisieren, um die Messung nicht zu verfälschen
        const prevTransform = titleElement.style.transform;
        titleElement.style.transform = ''; // nur temporär

        // Iterativ annähern (2 Durchläufe reichen i.d.R.)
        let computedFontSize = parseFloat(window.getComputedStyle(titleElement).fontSize) || 16;
        for (let i = 0; i < 2; i++) {
            const currentWidth = titleElement.getBoundingClientRect().width || 1;
            const scale = targetWidth / currentWidth;
            computedFontSize = computedFontSize * scale;
            titleElement.style.fontSize = computedFontSize + 'px';
        }

        // Transform zurücksetzen
        titleElement.style.transform = prevTransform || 'translate(-50%, -50%)';
    }

	function pinTitle() {
        if (isPinned) return;
        isPinned = true;
        titleElement.style.position = 'fixed';
        titleElement.style.top = '50%';
        titleElement.style.left = '50%';
        titleElement.style.transform = 'translate(-50%, -50%)';
        titleElement.style.willChange = 'transform';
		// Erst auf Viewport-Breite skalieren
		fitTitleToViewportWidth();
    }

    function resetTitle() {
        if (!isPinned) return;
        isPinned = false;
        titleElement.style.position = '';
        titleElement.style.top = '';
        titleElement.style.left = '';
        titleElement.style.transform = '';
		titleElement.style.willChange = '';
    }

	function applyHorizontalShift(progress) {
		if (!isPinned) return;
		const p = Math.max(0, Math.min(1, progress));
		// Start komplett rechts außerhalb (dx = viewportWidth), Ende bündig links (dx = 0)
		const startDx = window.innerWidth || 1;
		const dx = startDx * (1 - p);
		titleElement.style.transform = `translate(-50%, -50%) translateX(${dx}px)`;
	}

    function update() {
        const start = wrapperSection.offsetTop;
        const end = start + wrapperSection.offsetHeight - window.innerHeight;
        const scrollY = window.scrollY;

        if (scrollY < start) {
            resetTitle();
            return;
        } else if (scrollY >= start && scrollY <= end) {
            pinTitle();
            const span = Math.max(1, end - start);
            const progress = (scrollY - start) / span;
            applyHorizontalShift(progress);
            return;
        } else {
            // Nach dem Bereich → Titel lösen
            resetTitle();
            return;
        }
    }

	window.addEventListener('scroll', update, { passive: true });
	window.addEventListener('resize', () => {
		// Auf neue Viewport-Breite skalieren
		fitTitleToViewportWidth();
		if (isPinned) {
			const start = wrapperSection.offsetTop;
			const end = start + wrapperSection.offsetHeight - window.innerHeight;
			const span = Math.max(1, end - start);
			const progress = Math.max(0, Math.min(1, (window.scrollY - start) / span));
			applyHorizontalShift(progress);
		}
		update();
	}, { passive: true });

	// Initial an Viewport-Breite anpassen und starten
	fitTitleToViewportWidth();
	update();
}

document.addEventListener('DOMContentLoaded', initScrollTitleEffect);
  

// (Doppelte Initialisierung entfernt)

// -------------------------------
// Header-Logo: Klick führt immer zur Startseite
// -------------------------------
function initLogoHomeLink() {
    const logoEls = document.querySelectorAll('.logo-text, .logo-fuchs');
    if (!logoEls.length) return;
    logoEls.forEach(el => {
        el.style.cursor = 'pointer';
        el.setAttribute('role', 'link');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', 'Zur Startseite');
        const goHome = () => { window.location.href = 'index.html'; };
        el.addEventListener('click', goHome);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goHome();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initLogoHomeLink);

// -------------------------------
// Admin: einfacher CMS-Editor (LocalStorage-basiert)
// -------------------------------
function slugifyDE(text) {
    try {
        const map = { 'ä':'ae','ö':'oe','ü':'ue','Ä':'ae','Ö':'oe','Ü':'ue','ß':'ss' };
        const replaced = (text || '').split('').map(c => map[c] || c).join('');
        return replaced
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 120);
    } catch(_) { return (text || '').toString().toLowerCase().replace(/\s+/g,'-'); }
}
function linesToListHtml(value, ordered) {
    const lines = (value || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    const tag = ordered ? 'ol' : 'ul';
    return '<'+tag+'>' + lines.map(li => '<li>'+li.replace(/[<>]/g, '')+'</li>').join('') + '</'+tag+'>';
}
function sourcesToHtml(value) {
    const lines = (value || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return '';
    const items = lines.map(l => {
        const parts = l.split('|');
        const label = (parts[0] || '').trim();
        const url = (parts[1] || '').trim();
        if (/^https?:\/\//i.test(url)) {
            return '<li><a href="'+url+'" target="_blank" rel="noopener">'+(label || url)+'</a></li>';
        }
        return '<li>'+label+'</li>';
    }).join('');
    return '<ul>'+items+'</ul>';
}
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function buildContentTemplate({ why, bullets, steps, example, sources }) {
    let html = '';
    if (why) html += '<h2>Warum ist das wichtig?</h2><p>'+why+'</p>';
    const bulletsHtml = linesToListHtml(bullets, false);
    if (bulletsHtml) html += '<h3>Kernpunkte</h3>'+bulletsHtml;
    const stepsHtml = linesToListHtml(steps, true);
    if (stepsHtml) html += '<h3>Vorgehen</h3>'+stepsHtml;
    if (example) html += '<h3>Beispiel</h3><p>'+example+'</p>';
    const srcHtml = sourcesToHtml(sources);
    if (srcHtml) html += '<h3>Quellen</h3>'+srcHtml;
    return html;
}
function initAdmin() {
    const form = document.getElementById('admin-form');
    if (!form) return;
    const f = (id) => form.querySelector('#'+id);
    const statusEl = document.getElementById('admin-auth-status');
    const loginEmailEl = document.getElementById('admin-login-email');
    const loginSendBtn = document.getElementById('admin-login-send');
    const logoutBtn = document.getElementById('admin-logout');
    const loginPasswordEl = document.getElementById('admin-login-password');
    const loginPasswordBtn = document.getElementById('admin-login-password-btn');
    const resetPwdBtn = document.getElementById('admin-reset-password');
    const newPwdWrap = document.getElementById('admin-newpass-wrap');
    const newPwdEl = document.getElementById('admin-new-password');
    const newPwd2El = document.getElementById('admin-new-password2');
    const newPwdBtn = document.getElementById('admin-new-password-btn');
    const editorWrap = form; // form ist unser Editor-Container
    const titleEl = f('admin-title');
    const slugEl = f('admin-slug');
    const excerptEl = f('admin-excerpt');
    const dateEl = f('admin-date');
    const authorNameEl = f('admin-author-name');
    const authorTitleEl = f('admin-author-title');
    const coverEl = f('admin-cover');
    const publishAtEl = f('admin-publish-at');
    const modeSimpleEl = document.getElementById('admin-mode-simple');
    const modeGuideEl = document.getElementById('admin-mode-guide');
    const simpleBlockEl = document.getElementById('admin-simple-block');
    const templateBlockEl = document.getElementById('admin-template-block');
    const bodyEl = document.getElementById('admin-body');
    const quillHolderEl = document.getElementById('admin-editor');
    const whyEl = f('admin-why');
    const bulletsEl = f('admin-bullets');
    const stepsEl = f('admin-steps');
    const exampleEl = f('admin-example');
    const sourcesEl = f('admin-sources');
    const tagsEls = Array.from(form.querySelectorAll('input[name="admin-tags"]'));
    const seoTitleEl = f('admin-seo-title');
    const seoDescEl = f('admin-seo-desc');
    // published checkbox entfernt – Status wird über Buttons gesteuert
    const previewEl = f('admin-preview');
    const listLocalEl = f('admin-posts-local');
    const listOnlineEl = f('admin-posts-online');
    const listOnlineEmptyEl = f('admin-posts-online-empty');
    const saveBtn = f('admin-save');
    const publishBtn = f('admin-publish');
    const saveDraftBtn = f('admin-save-draft');
    const genBtn = f('admin-generate');
    const exportBtn = f('admin-export');
    const importEl = f('admin-import');
    const deleteBtn = f('admin-delete');
    const resetBtn = f('admin-reset');
    const tabEditorBtn = f('tab-editor');
    const tabDraftsBtn = f('tab-drafts');
    const editorViewEl = f('admin-editor-view');
    const draftsViewEl = f('admin-drafts-view');
    const targetLocalEl = f('admin-target-local');
    const targetOnlineEl = f('admin-target-online');

    // Defaults
    let isDirty = false;
    let __adminSessionOk = false;
    if (!dateEl.value) {
        const d = new Date();
        const iso = d.toISOString().slice(0,10);
        dateEl.value = iso;
    }
    // Veröffentlichungszeitpunkt optional – wird beim Veröffentlichen gesetzt, falls leer
    form.addEventListener('input', () => { isDirty = true; });
    window.addEventListener('beforeunload', (e) => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
    titleEl.addEventListener('input', () => {
        if (!slugEl.dataset.manual) slugEl.value = slugifyDE(titleEl.value);
        if (!seoTitleEl.value) seoTitleEl.value = titleEl.value + ' | ThermoHybrid';
    });
    slugEl.addEventListener('input', () => { slugEl.dataset.manual = '1'; });

    // Tabs: Editor <-> Entwürfe
    function switchAdminTab(which) {
        const showEditor = which === 'editor';
        if (editorViewEl) editorViewEl.style.display = showEditor ? '' : 'none';
        if (draftsViewEl) draftsViewEl.style.display = showEditor ? 'none' : '';
        if (tabEditorBtn) {
            tabEditorBtn.classList.toggle('active', showEditor);
            tabEditorBtn.setAttribute('aria-selected', showEditor ? 'true' : 'false');
        }
        if (tabDraftsBtn) {
            tabDraftsBtn.classList.toggle('active', !showEditor);
            tabDraftsBtn.setAttribute('aria-selected', showEditor ? 'false' : 'true');
        }
        try {
            const targetId = showEditor ? 'admin' : 'admin-posts';
            const target = document.getElementById(targetId);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch(_) {}
    }
    if (tabEditorBtn) tabEditorBtn.addEventListener('click', () => switchAdminTab('editor'));
    if (tabDraftsBtn) tabDraftsBtn.addEventListener('click', () => switchAdminTab('drafts'));
    switchAdminTab('editor');

    // Toast helper
    function showToast(message, type) {
        try {
            let el = document.getElementById('admin-toast');
            if (!el) {
                el = document.createElement('div');
                el.id = 'admin-toast';
                el.className = 'admin-toast';
                document.body.appendChild(el);
            }
            el.textContent = message;
            el.classList.remove('success', 'error');
            if (type === 'success') el.classList.add('success');
            if (type === 'error') el.classList.add('error');
            el.style.display = '';
            // force reflow to enable transition
            void el.offsetWidth;
            el.classList.add('show');
            clearTimeout(showToast._t);
            showToast._t = setTimeout(() => {
                el.classList.remove('show');
                setTimeout(() => { el.style.display = 'none'; }, 250);
            }, 3000);
        } catch (_) {}
    }

    // Speicherziel steuert, welcher Button aktiv ist
    function syncSaveTargetUI() {
        const onlineSelected = !!(targetOnlineEl && targetOnlineEl.checked);
        if (saveBtn) {
            saveBtn.disabled = !__adminSessionOk || !onlineSelected;
            saveBtn.title = !onlineSelected
                ? 'Wähle „Online (Supabase)“ als Speicherziel'
                : (!__adminSessionOk ? 'Bitte vorher einloggen' : 'Online-Entwurf speichern (nicht sichtbar)');
        }
        if (saveDraftBtn) {
            saveDraftBtn.disabled = onlineSelected;
            saveDraftBtn.title = onlineSelected
                ? 'Für lokalen Entwurf bitte „Lokal“ als Speicherziel wählen'
                : 'Entwurf lokal speichern';
        }
    }
    if (targetLocalEl) targetLocalEl.addEventListener('change', syncSaveTargetUI);
    if (targetOnlineEl) targetOnlineEl.addEventListener('change', syncSaveTargetUI);
    // initial
    syncSaveTargetUI();

    async function initQuillEditorIfNeeded() {
        if (!quillHolderEl) return;
        if (__quill) return;
        const ok = await loadQuill();
        if (!ok || !window.Quill) return;
        const toolbarOptions = [
            [{ header: [2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image', 'blockquote', 'code-block'],
            ['clean']
        ];
        __quill = new window.Quill(quillHolderEl, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: toolbarOptions,
                    handlers: {
                        image: async function() {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async () => {
                                const file = input.files && input.files[0];
                                if (!file) return;
                                const url = await uploadEditorImage(file);
                                const range = __quill.getSelection(true) || { index: __quill.getLength(), length: 0 };
                                if (url) __quill.insertEmbed(range.index, 'image', url, 'user');
                            };
                            input.click();
                        }
                    }
                }
            }
        });
    }
    async function uploadEditorImage(file) {
        try {
            const supa = await getSupabaseClient();
            const { data: sess } = supa ? await supa.auth.getSession() : { data: null };
            if (supa && sess && sess.session) {
                const ext = (file.name.split('.').pop() || 'png').toLowerCase();
                const cleanSlug = slugifyDE(slugEl.value || titleEl.value || 'post');
                const path = 'content/' + cleanSlug + '-' + Date.now() + '.' + ext;
                const { error } = await supa.storage.from(SUPABASE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
                if (error) throw error;
                const { data: pub } = supa.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
                return pub?.publicUrl;
            }
            // Fallback: base64 (lokal)
            return await fileToDataUrl(file);
        } catch(e) {
            alert('Bild-Upload fehlgeschlagen: ' + (e?.message || e));
            return null;
        }
    }
    async function syncModeUI() {
        const isSimple = modeSimpleEl && modeSimpleEl.checked;
        if (simpleBlockEl) simpleBlockEl.style.display = isSimple ? '' : 'none';
        if (templateBlockEl) templateBlockEl.style.display = isSimple ? 'none' : '';
        if (isSimple) {
            await initQuillEditorIfNeeded();
        }
    }
    if (modeSimpleEl) modeSimpleEl.addEventListener('change', syncModeUI);
    if (modeGuideEl) modeGuideEl.addEventListener('change', syncModeUI);
    syncModeUI();

    function paragraphsFromText(text) {
        const lines = (text || '').split('\n').map(l => l.trim());
        const chunks = [];
        let buf = [];
        for (const l of lines) {
            if (!l) {
                if (buf.length) { chunks.push('<p>'+buf.join(' ')+'</p>'); buf = []; }
            } else {
                buf.push(l.replace(/[<>]/g,''));
            }
        }
        if (buf.length) chunks.push('<p>'+buf.join(' ')+'</p>');
        return chunks.join('\n');
    }
    async function buildPreview() {
        const tags = tagsEls.filter(el => el.checked).map(el => el.value);
        const coverFile = coverEl.files && coverEl.files[0] ? await fileToDataUrl(coverEl.files[0]) : '';
        let content = '';
        const useSimple = modeSimpleEl && modeSimpleEl.checked;
        if (useSimple) {
            if (__quill) {
                content = __quill.root.innerHTML || '';
            } else {
                const raw = (bodyEl.value || '').trim();
                content = raw ? raw : '';
                if (!/<[a-z][\s\S]*>/i.test(content)) {
                    content = paragraphsFromText(raw);
                }
            }
        } else {
            content = buildContentTemplate({
                why: (whyEl.value || '').trim(),
                bullets: bulletsEl.value || '',
                steps: stepsEl.value || '',
                example: (exampleEl.value || '').trim(),
                sources: sourcesEl.value || ''
            });
        }
        const post = {
            slug: slugifyDE(slugEl.value || titleEl.value),
            title: titleEl.value.trim(),
            date: (dateEl.value || '').trim(),
            excerpt: (excerptEl.value || '').trim(),
            content: sanitizeHtml(content),
            tags,
            cover: coverFile || undefined,
            authorName: (authorNameEl.value || '').trim(),
            authorTitle: (authorTitleEl.value || '').trim(),
            seoTitle: (seoTitleEl.value || '').trim(),
            seoDescription: (seoDescEl.value || '').trim(),
            publish_at: publishAtEl ? fromDatetimeLocalToISO(publishAtEl.value) : new Date().toISOString()
        };
        previewEl.innerHTML = '<h3>Vorschau</h3><div class="blog-detail">' +
            '<div class="blog-detail-cover">' + (post.cover ? '<img src="'+post.cover+'"/>' : '') + '</div>' +
            '<h2>'+post.title+'</h2><p>'+post.excerpt+'</p>' + post.content + '</div>';
        return post;
    }
    async function savePostLocal() {
        const post = await buildPreview();
        if (!post.title || !post.slug) { alert('Titel und Slug sind erforderlich.'); return; }
        const posts = getStoredPosts();
        const idx = posts.findIndex(p => p.slug === post.slug);
        if (idx >= 0) posts[idx] = Object.assign({}, posts[idx], post);
        else posts.push(post);
        setStoredPosts(posts);
        renderDrafts();
        showToast('Entwurf lokal gespeichert.', 'success');
        isDirty = false;
    }
    async function savePostSupabase(publish = false) {
        try {
            const supa = await getSupabaseClient();
            if (!supa) { showToast('Supabase nicht konfiguriert. Bitte SUPABASE_URL/ANON setzen.', 'error'); return; }
            const { data: sessData } = await supa.auth.getSession();
            if (!sessData || !sessData.session) {
                showToast('Bitte zuerst einloggen.', 'error');
                return;
            }
            // Build post and handle cover upload to Storage
            const post = await buildPreview();
            if (!post.title || !post.slug) { showToast('Titel und Slug sind erforderlich.', 'error'); return; }
            // Warnen, wenn Slug bereits existiert
            try {
                const { data: exist, error: existErr } = await supa.from('posts').select('slug').eq('slug', post.slug).maybeSingle();
                if (!existErr && exist && !confirm('Ein Beitrag mit diesem Slug existiert bereits. Überschreiben?')) {
                    return;
                }
            } catch(_) {}
            if (coverEl.files && coverEl.files[0]) {
                try {
                    const file = coverEl.files[0];
                    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                    const path = 'covers/' + post.slug + '-' + Date.now() + '.' + ext;
                    const { error: upErr } = await supa.storage.from(SUPABASE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
                    if (upErr) throw upErr;
                    const { data: pub } = supa.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
                    if (pub && pub.publicUrl) post.cover = pub.publicUrl;
                } catch (e) {
                    console.warn('Cover Upload fehlgeschlagen:', e?.message || e);
                }
            }
            const publishAtIso = publish
                ? (publishAtEl && publishAtEl.value ? fromDatetimeLocalToISO(publishAtEl.value) : new Date().toISOString())
                : (publishAtEl && publishAtEl.value ? fromDatetimeLocalToISO(publishAtEl.value) : null);
            const toSave = Object.assign({}, post, { 
                published: !!publish,
                publish_at: publishAtIso
            });
            // Upsert mit generischem Fallback: entferne fehlende Spalten nacheinander
            async function upsertWithMissingColumnFallback(payload) {
                let attemptPayload = Object.assign({}, payload);
                let lastError = null;
                for (let i = 0; i < 8; i++) {
                    const { error } = await supa.from('posts').upsert([attemptPayload], { onConflict: 'slug' });
                    if (!error) return null;
                    lastError = error;
                    const msg = (error.message || '').toLowerCase();
                    const match1 = msg.match(/column\s+"?([a-z_]+)"?\s+does not exist/);
                    const match2 = msg.match(/could not find the '([a-z_]+)' column/i);
                    const missingRaw = (match1 && match1[1]) || (match2 && match2[1]) || null;
                    if (!missingRaw) break;
                    // Entferne fehlendes Feld case-insensitiv (z. B. authorName vs authorname)
                    const normalizeKey = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normalizedMissing = normalizeKey(missingRaw);
                    const keyToDelete = Object.keys(attemptPayload).find(k => normalizeKey(k) === normalizedMissing) || missingRaw;
                    delete attemptPayload[keyToDelete];
                    // continue loop and try again
                }
                return lastError || { message: 'Upsert failed after removing missing columns' };
            }
            const upsertError = await upsertWithMissingColumnFallback(toSave);
            if (upsertError) throw upsertError;
            await fetchSupabasePosts(); // Cache aktualisieren (veröffentlichte Liste)
            try { renderOnlineDrafts(); } catch(_) {} // Online-Entwürfe aktualisieren
            showToast(publish ? 'Beitrag veröffentlicht.' : 'Entwurf online gespeichert.', 'success');
            isDirty = false;
        } catch (err) {
            const msg = err?.message || err || 'Unbekannter Fehler';
            showToast('Fehler beim Online‑Speichern: ' + msg, 'error');
        }
    }
    async function savePostSmart() {
        try {
            const supa = await getSupabaseClient();
            if (supa) {
                const { data: sessData } = await supa.auth.getSession();
                if (sessData && sessData.session) return await savePostSupabase();
            }
            return await savePostLocal();
        } catch (e) {
            alert('Fehler beim Speichern: ' + (e?.message || e));
        }
    }
    function renderLocalDrafts() {
        const posts = getStoredPosts().sort((a,b) => new Date(b.date||'') - new Date(a.date||''));
        if (!listLocalEl) return;
        listLocalEl.innerHTML = posts.map(p => {
            const isFuture = p.publish_at && (new Date(p.publish_at).getTime() > Date.now());
            const info = p.publish_at ? (' — ' + (isFuture ? ('geplant: ' + toLocalDatetimeLocalString(p.publish_at).replace('T',' ')) : 'veröffentlicht')) : '';
            return '' +
            '<li data-slug="'+p.slug+'">' +
                '<div class="draft-item-main">' +
                    '<span class="draft-title">'+p.title+'</span>' +
                    '<span class="draft-meta">— '+(p.date||'')+info+'</span>' +
                '</div>' +
                '<div class="draft-item-actions">' +
                    '<button type="button" class="header-btn btn-outline btn-xs btn-load" aria-label="Bearbeiten">Bearbeiten</button>' +
                    '<button type="button" class="header-btn btn-outline btn-xs btn-delete" aria-label="Löschen">Löschen</button>' +
                '</div>' +
            '</li>';
        }).join('');
    }
    async function renderOnlineDrafts() {
        if (!listOnlineEl) return;
        try {
            const supa = await getSupabaseClient();
            if (!supa) {
                if (listOnlineEmptyEl) { listOnlineEmptyEl.style.display = ''; }
                listOnlineEl.innerHTML = '';
                return;
            }
            const { data: sess } = await supa.auth.getSession();
            if (!sess || !sess.session) {
                if (listOnlineEmptyEl) { listOnlineEmptyEl.style.display = ''; }
                listOnlineEl.innerHTML = '';
                return;
            }
            const { data, error } = await supa
                .from('posts')
                .select('slug,title,date,publish_at')
                .eq('published', false)
                .order('date', { ascending: false });
            if (error) throw error;
            const arr = data || [];
            if (listOnlineEmptyEl) listOnlineEmptyEl.style.display = arr.length ? 'none' : '';
            listOnlineEl.innerHTML = arr.map(p => {
                const when = p.publish_at ? toLocalDatetimeLocalString(p.publish_at).replace('T',' ') : 'kein Termin';
                return '' +
                '<li data-slug="'+p.slug+'">' +
                    '<div class="draft-item-main">' +
                        '<span class="draft-title">'+(p.title || '(ohne Titel)')+'</span>' +
                        '<span class="draft-meta">— '+(p.date||'')+' — Termin: '+when+'</span>' +
                    '</div>' +
                    '<div class="draft-item-actions">' +
                        '<button type="button" class="header-btn btn-outline btn-xs btn-load" aria-label="Bearbeiten">Bearbeiten</button>' +
                        '<button type="button" class="header-btn btn-outline btn-xs btn-delete" aria-label="Löschen">Löschen</button>' +
                    '</div>' +
                '</li>';
            }).join('');
        } catch(_) {
            if (listOnlineEmptyEl) { listOnlineEmptyEl.style.display = ''; }
            listOnlineEl.innerHTML = '';
        }
    }
    function renderDrafts() {
        renderLocalDrafts();
        renderOnlineDrafts();
    }
    function loadIntoForm(slug) {
        const p = getStoredPosts().find(x => x.slug === slug);
        if (!p) return;
        titleEl.value = p.title || '';
        slugEl.value = p.slug || '';
        excerptEl.value = p.excerpt || '';
        dateEl.value = (p.date || '').slice(0,10);
        if (publishAtEl) publishAtEl.value = toLocalDatetimeLocalString(p.publish_at || '');
        authorNameEl.value = p.authorName || '';
        authorTitleEl.value = p.authorTitle || '';
        seoTitleEl.value = p.seoTitle || '';
        seoDescEl.value = p.seoDescription || '';
        whyEl.value = '';
        bulletsEl.value = '';
        stepsEl.value = '';
        exampleEl.value = '';
        sourcesEl.value = '';
        (p.tags || []).forEach(t => {
            const el = tagsEls.find(e => e.value === t);
            if (el) el.checked = true;
        });
        if (__quill) {
            __quill.setContents([]);
            __quill.clipboard.dangerouslyPasteHTML(p.content || '');
        } else {
            bodyEl.value = p.content || '';
        }
        previewEl.innerHTML = p.content || '';
    }
    function deleteCurrent() {
        const slug = (slugEl.value || '').trim();
        if (!slug) { alert('Kein Slug ausgewählt.'); return; }
        const posts = getStoredPosts().filter(p => p.slug !== slug);
        setStoredPosts(posts);
        renderDrafts();
        alert('Beitrag gelöscht (lokal).');
    }
    function exportPosts() {
        const data = JSON.stringify(getStoredPosts(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'blogposts-export-' + (new Date().toISOString().slice(0,10)) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    function importPosts(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const arr = JSON.parse(reader.result);
                if (!Array.isArray(arr)) throw new Error('Invalid JSON');
                setStoredPosts(arr);
                renderDrafts();
                alert('Import erfolgreich. Beiträge lokal gespeichert.');
            } catch (e) {
                alert('Import fehlgeschlagen: ' + e.message);
            }
        };
        reader.readAsText(file);
    }

    genBtn.addEventListener('click', (e) => { e.preventDefault(); buildPreview(); });
    if (saveBtn) saveBtn.addEventListener('click', async (e) => { 
        e.preventDefault(); 
        await savePostSupabase(false); 
    });
    if (publishBtn) publishBtn.addEventListener('click', async (e) => { 
        e.preventDefault(); 
        // wenn kein Termin ausgewählt → jetzt setzen (sichtbar im Feld)
        if (publishAtEl && !publishAtEl.value) publishAtEl.value = toLocalDatetimeLocalString();
        await savePostSupabase(true); 
    });
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', (e) => { e.preventDefault(); savePostLocal(); });
    exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportPosts(); });
    importEl.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) importPosts(file);
        importEl.value = '';
    });
    const importTriggerBtn = document.getElementById('admin-import-trigger');
    if (importTriggerBtn) {
        importTriggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (importEl) importEl.click();
        });
    }
    deleteBtn.addEventListener('click', (e) => { e.preventDefault(); if (confirm('Diesen Beitrag wirklich löschen?')) deleteCurrent(); });
    resetBtn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        form.reset(); 
        if (publishAtEl) publishAtEl.value = '';
        previewEl.innerHTML = ''; 
    });
    if (listLocalEl) listLocalEl.addEventListener('click', (e) => {
        const loadBtn = e.target.closest('.btn-load');
        const delBtn = e.target.closest('.btn-delete');
        const li = (loadBtn || delBtn) ? e.target.closest('li[data-slug]') : null;
        if (!li) return;
        const slug = li.getAttribute('data-slug');
        if (loadBtn) {
            switchAdminTab('editor');
            loadIntoForm(slug);
            return;
        }
        if (delBtn) {
            if (!confirm('Diesen lokalen Entwurf wirklich löschen?')) return;
            const posts = getStoredPosts().filter(p => p.slug !== slug);
            setStoredPosts(posts);
            renderLocalDrafts();
            showToast('Lokaler Entwurf gelöscht.', 'success');
            return;
        }
    });
    if (listOnlineEl) listOnlineEl.addEventListener('click', async (e) => {
        const loadBtn = e.target.closest('.btn-load');
        const delBtn = e.target.closest('.btn-delete');
        const li = (loadBtn || delBtn) ? e.target.closest('li[data-slug]') : null;
        if (!li) return;
        const slug = li.getAttribute('data-slug');
        const supa = await getSupabaseClient();
        if (!supa) { showToast('Supabase nicht konfiguriert.', 'error'); return; }
        if (loadBtn) {
            try {
                const { data, error } = await supa
                    .from('posts')
                    .select('slug,title,date,excerpt,content,tags,cover,authorName,authorTitle,seoTitle,seoDescription,publish_at')
                    .eq('slug', slug)
                    .maybeSingle();
                if (error || !data) return;
                switchAdminTab('editor');
                titleEl.value = data.title || '';
                slugEl.value = data.slug || '';
                excerptEl.value = data.excerpt || '';
                dateEl.value = (data.date || '').slice(0,10);
                if (publishAtEl) publishAtEl.value = toLocalDatetimeLocalString(data.publish_at || '');
                authorNameEl.value = data.authorName || '';
                authorTitleEl.value = data.authorTitle || '';
                seoTitleEl.value = data.seoTitle || '';
                seoDescEl.value = data.seoDescription || '';
                tagsEls.forEach(el => el.checked = false);
                (Array.isArray(data.tags) ? data.tags : []).forEach(t => {
                    const el = tagsEls.find(e => e.value === t);
                    if (el) el.checked = true;
                });
                await initQuillEditorIfNeeded();
                if (__quill) {
                    __quill.setContents([]);
                    __quill.clipboard.dangerouslyPasteHTML(data.content || '');
                } else {
                    bodyEl.value = data.content || '';
                }
                previewEl.innerHTML = data.content || '';
            } catch(_) {}
            return;
        }
        if (delBtn) {
            if (!confirm('Diesen Online‑Entwurf wirklich löschen?')) return;
            try {
                const { error } = await supa
                    .from('posts')
                    .delete()
                    .eq('slug', slug)
                    .eq('published', false);
                if (error) throw error;
                await renderOnlineDrafts();
                showToast('Online‑Entwurf gelöscht.', 'success');
            } catch (err) {
                showToast('Löschen fehlgeschlagen: ' + (err?.message || err), 'error');
            }
            return;
        }
    });

    renderDrafts();

    // Auth UI
    (async function initAuth(){
        const supa = await getSupabaseClient();
        if (!supa) {
            if (statusEl) statusEl.textContent = 'Supabase nicht konfiguriert';
            return;
        }
        // Prüfen, ob wir aus einem Recovery-Link kommen (Hash ODER Query)
        function hasRecoveryInUrl() {
            try {
                const h = (window.location.hash || '').toLowerCase();
                const s = (window.location.search || '').toLowerCase();
                return /type=recovery/.test(h + s) || /recovery/.test(h + s);
            } catch(_) { return false; }
        }
        const isRecoveryFromUrl = hasRecoveryInUrl();
        let forcePwdReset = isRecoveryFromUrl;
        function update(session) {
            if (!statusEl) return;
            if (forcePwdReset) {
                statusEl.textContent = 'Passwort zurücksetzen erforderlich';
            } else {
                statusEl.textContent = session ? ('Angemeldet (' + (session.user?.email || 'User') + ')') : 'Nicht angemeldet – zum Veröffentlichen einloggen';
            }
            __adminSessionOk = !!session && !forcePwdReset;
            if (saveBtn) {
                saveBtn.disabled = !__adminSessionOk || !(targetOnlineEl && targetOnlineEl.checked);
                saveBtn.title = (!session)
                    ? 'Bitte vorher einloggen'
                    : (forcePwdReset ? 'Bitte zuerst neues Passwort setzen' : 'Online-Entwurf speichern (nicht sichtbar)');
            }
            if (publishBtn) {
                publishBtn.disabled = !session || !!forcePwdReset;
                publishBtn.title = (!session)
                    ? 'Bitte vorher einloggen'
                    : (forcePwdReset ? 'Bitte zuerst neues Passwort setzen' : 'Veröffentlichen (sofort oder geplant)');
            }
            // Login-Wall: Editor nur bei Login sichtbar
            if (editorWrap) {
                if (session && !forcePwdReset) {
                    editorWrap.style.display = '';
                    editorWrap.setAttribute('aria-hidden', 'false');
                } else {
                    editorWrap.style.display = 'none';
                    editorWrap.setAttribute('aria-hidden', 'true');
                }
            }
            // Drafts neu laden (Online-Liste zeigt sich nur bei Login)
            try { renderDrafts(); } catch(_) {}
            // Speicherziel-Buttons final synchronisieren
            syncSaveTargetUI();
            if (forcePwdReset && newPwdWrap) newPwdWrap.style.display = '';
        }
        const { data: sess } = await supa.auth.getSession();
        update(sess?.session || null);
        supa.auth.onAuthStateChange(async (event, session) => {
            update(session);
            if (event === 'PASSWORD_RECOVERY') {
                forcePwdReset = true;
                if (newPwdWrap) newPwdWrap.style.display = '';
            }
            if (event === 'SIGNED_IN' && newPwdWrap) {
                newPwdWrap.style.display = 'none';
                if (newPwdEl) newPwdEl.value = '';
                if (newPwd2El) newPwd2El.value = '';
            }
        });
        if (loginSendBtn) {
            loginSendBtn.addEventListener('click', async () => {
                const email = (loginEmailEl && loginEmailEl.value || '').trim();
                if (!email) { alert('E‑Mail eingeben.'); return; }
                const { error } = await supa.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
                alert(error ? ('Fehler: ' + error.message) : 'Login‑Link gesendet. Bitte E‑Mail prüfen.');
            });
        }
        async function signInWithPassword() {
            const email = (loginEmailEl && loginEmailEl.value || '').trim();
            const password = (loginPasswordEl && loginPasswordEl.value || '').trim();
            if (!email || !password) { alert('E‑Mail und Passwort eingeben.'); return; }
            const { data, error } = await supa.auth.signInWithPassword({ email, password });
            if (error) { alert('Login fehlgeschlagen: ' + error.message); return; }
            const user = data?.user;
            // Extra‑Sicherheit: Nur bestätigte E‑Mails zulassen
            if (!user || !user.email_confirmed_at) {
                await supa.auth.signOut();
                alert('Bitte bestätige zuerst deine E‑Mail. Prüfe dein Postfach.');
                return;
            }
            alert('Eingeloggt.');
        }
        if (loginPasswordBtn) {
            loginPasswordBtn.addEventListener('click', (e) => { e.preventDefault(); signInWithPassword(); });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await supa.auth.signOut();
                alert('Abgemeldet.');
            });
        }
        if (resetPwdBtn) {
            resetPwdBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = (loginEmailEl && loginEmailEl.value || '').trim();
                if (!email) { alert('Bitte E‑Mail eingeben.'); return; }
                const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
                const redirectTo = origin.replace(/\/$/, '') + '/admin-portal-7f32a9.html';
                const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo });
                alert(error ? ('Fehler beim Senden: ' + error.message) : 'Reset‑Link gesendet. Bitte E‑Mail prüfen.');
            });
        }
        if (newPwdBtn) {
            newPwdBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const p1 = (newPwdEl && newPwdEl.value) || '';
                const p2 = (newPwd2El && newPwd2El.value) || '';
                if (!p1 || p1.length < 8) { alert('Passwort muss mindestens 8 Zeichen haben.'); return; }
                if (p1 !== p2) { alert('Passwörter stimmen nicht überein.'); return; }
                try {
                    const { error } = await supa.auth.updateUser({ password: p1 });
                    if (error) throw error;
                    alert('Passwort aktualisiert. Du bist jetzt eingeloggt.');
                    forcePwdReset = false;
                    if (newPwdWrap) newPwdWrap.style.display = 'none';
                    // URL aufräumen (type=recovery entfernen)
                    try { history.replaceState(null, '', location.pathname + location.search); } catch(_) {}
                    update((await supa.auth.getSession()).data?.session || null);
                } catch (err) {
                    alert('Fehler beim Aktualisieren: ' + (err?.message || err));
                }
            });
        }
        // Inaktivitäts‑Logout (10 Minuten)
        (function setupInactivitySignout(){
            const INACTIVITY_MS = 10 * 60 * 1000;
            let last = Date.now();
            const bump = () => { last = Date.now(); };
            ['mousemove','keydown','scroll','click','touchstart'].forEach(ev => document.addEventListener(ev, bump, { passive: true }));
            setInterval(async () => {
                try {
                    const { data: s } = await supa.auth.getSession();
                    if (!s?.session) return; // niemand eingeloggt
                    if (Date.now() - last > INACTIVITY_MS) {
                        await supa.auth.signOut();
                        alert('Aus Sicherheitsgründen nach 10 Minuten Inaktivität abgemeldet.');
                    }
                } catch(_) {}
            }, 30 * 1000);
        })();
    })();
}
document.addEventListener('DOMContentLoaded', initAdmin);