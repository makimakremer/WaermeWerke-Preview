// Blog-only bundle: lightweight reader with Supabase fetch + sanitizing
// Supabase config (same as admin)
const SUPABASE_URL = 'https://xzlvcsnqtsjjcphbwrmf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bHZjc25xdHNqamNwaGJ3cm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzgyOTAsImV4cCI6MjA3ODcxNDI5MH0.ihZwUkAyFGQVUMl43XQS2PRCnHh3aCFsicSJUmHwEFQ';
const SUPABASE_CACHE_KEY = 'fuchs.blog.supabase.cache.v1';

let __supaClient = null;
let __supaLoaded = false;
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
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
      __supaLoaded = true;
    }
    if (!window.supabase) return null;
    __supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return __supaClient;
  } catch (e) { return null; }
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
    let data = null, error = null;
    try {
      const res = await supa.from('posts').select('*')
        .eq('published', true)
        .lte('publish_at', nowIso)
        .order('publish_at', { ascending: false })
        .order('date', { ascending: false });
      data = res.data; error = res.error;
    } catch (e) { error = e; }
    if (error && /publish_?at|column .* does not exist|could not find.*publish/i.test((error.message || '') + '')) {
      const res2 = await supa.from('posts').select('*').eq('published', true).order('date', { ascending: false });
      data = res2.data || [];
      error = res2.error || null;
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
  } catch (_) { return []; }
}

// DOMPurify (for blog rendering)
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
  } catch (e) { return false; }
}
function sanitizeHtml(html) {
  try {
    if (!html) return '';
    if (!window.DOMPurify) return html;
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p','strong','em','u','s','ol','ul','li','a','img','blockquote','pre','code','h2','h3','br','span'],
      ALLOWED_ATTR: ['href','target','rel','src','alt','title','class'],
      FORBID_TAGS: ['script','style']
    });
  } catch (_) { return html; }
}

// Local drafts (optional preview on the same device)
const BLOG_LS_KEY = 'fuchs.blog.posts.v1';
function getStoredPosts() {
  try { const json = localStorage.getItem(BLOG_LS_KEY) || '[]'; const arr = JSON.parse(json); return Array.isArray(arr) ? arr : []; } catch (_) { return []; }
}

function setStoredPosts(posts) { try { localStorage.setItem(BLOG_LS_KEY, JSON.stringify(posts || [])); } catch (_) {} }

function formatDateISOToDE(iso) {
  try { const d = new Date(iso); return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: '2-digit' }); } catch (e) { return iso; }
}
function scrollIntoViewSmooth(id) {
  const el = document.getElementById(id);
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initial code posts (same as in script.js)
const blogPosts = [
    {
        slug: "thermohybrid-einfuhrung",
        title: "Energieeffizienz durch ThermoHybrid: KWK, Wärmepumpe und Umweltwärme intelligent kombiniert",
        date: "2025-11-26",
        excerpt: "Wie ThermoHybrid-Systeme durch die Kombination von Kraft-Wärme-Kopplung, Wärmepumpe und Umweltwärme Energiekosten senken, CO₂-Emissionen reduzieren und Förderungen maximieren – ein umfassender Leitfaden.",
        content: `<h2>Was ist ThermoHybrid und warum ist es die Zukunft der Gebäudeenergieversorgung?</h2>
<p>ThermoHybrid ist ein <strong>integriertes Energiesystem</strong>, das drei bewährte Technologien intelligent vernetzt: einen <strong>gasbetriebenen Generator</strong> (KWK/ThermoHybrid), eine <strong>Wärmepumpe</strong> und die Nutzung von <strong>Umweltwärme</strong>. Das Ergebnis: <strong>Gesamtwirkungsgrade von über 95%</strong>, drastisch reduzierte Energiekosten und eine zukunftssichere Lösung, die das <strong>Gebäudeenergiegesetz (GEG) 2025</strong> erfüllt.</p>

<p>Im Gegensatz zu herkömmlichen Heizungen, die nur Wärme erzeugen, produziert ThermoHybrid <strong>gleichzeitig Strom und Wärme</strong>. Die Abwärme des Generators wird nicht verschwendet, sondern direkt für Heizung und Warmwasser genutzt. Zusätzlich hebt eine Wärmepumpe die Temperatur der Umweltwärme (aus Luft, Erdreich oder Abwärme) auf das benötigte Niveau – und das mit minimalem Stromaufwand, da der Generator den Strom direkt vor Ort liefert.</p>

<h3>Die drei Säulen der ThermoHybrid-Technologie</h3>
<ul>
<li><strong>KWK-Generator:</strong> Erzeugt Grundlaststrom mit 30–40% elektrischem Wirkungsgrad und liefert gleichzeitig 50–60% thermische Energie als Nutzwärme.</li>
<li><strong>Wärmepumpe:</strong> Nutzt Umweltwärme mit einem COP (Coefficient of Performance) von bis zu 5,9 – das bedeutet: Aus 1 kWh Strom werden bis zu 5,9 kWh Wärme.</li>
<li><strong>Intelligente Steuerung:</strong> Optimiert automatisch, wann welche Komponente läuft – abhängig von Außentemperatur, Strompreis, PV-Ertrag und Wärmebedarf.</li>
</ul>

<h2>Wie funktioniert ThermoHybrid im Detail?</h2>

<h3>1. Stromerzeugung vor Ort</h3>
<p>Der gasbetriebene Generator läuft in den <strong>Grundlaststunden</strong> – also immer dann, wenn das Gebäude kontinuierlich Wärme benötigt (typischerweise 4.000–6.000 Stunden pro Jahr). Der erzeugte Strom wird <strong>direkt im Gebäude verbraucht</strong> (Eigenverbrauch) und reduziert so die Strombezugskosten. Überschüsse können ins Netz eingespeist werden und bringen zusätzliche Erlöse durch <strong>KWKG-Zuschläge</strong> (0,16 €/kWh bei Einspeisung, 0,08 €/kWh bei Eigenverbrauch).</p>

<h3>2. Wärmenutzung auf mehreren Ebenen</h3>
<p>Die Abwärme des Generators wird über einen <strong>Wärmetauscher</strong> ausgekoppelt und in einen <strong>Pufferspeicher</strong> eingespeist. Dieser Speicher versorgt:</p>
<ul>
<li><strong>Heizkreise</strong> (Fußbodenheizung, Radiatoren)</li>
<li><strong>Warmwasserbereitung</strong> (Trinkwasser)</li>
<li><strong>Lüftungsanlagen</strong> mit Wärmerückgewinnung</li>
</ul>

<p>Reicht die Abwärme des Generators nicht aus (z.B. an sehr kalten Tagen oder bei Spitzenlasten), springt die <strong>Wärmepumpe</strong> ein. Sie nutzt Umweltwärme aus der Außenluft, dem Erdreich oder sogar aus der Abluft des Gebäudes und hebt diese mit minimalem Stromaufwand auf das benötigte Temperaturniveau.</p>

<h3>3. Intelligente Betriebsführung</h3>
<p>Die <strong>ThermoHybrid-Steuerung</strong> entscheidet in Echtzeit, welche Komponente optimal läuft:</p>
<ul>
<li><strong>Winter (hoher Wärmebedarf):</strong> Generator läuft kontinuierlich, liefert Strom und Grundwärme. Wärmepumpe deckt Spitzen ab.</li>
<li><strong>Übergangszeit:</strong> Generator läuft reduziert, Wärmepumpe übernimmt mehr Arbeit (besonders bei milden Außentemperaturen und hohem COP).</li>
<li><strong>Sommer:</strong> Generator meist aus, Wärmepumpe deckt Warmwasserbedarf. Wenn PV-Anlage vorhanden: PV-Strom wird priorisiert für Wärmepumpe und Verbraucher.</li>
</ul>

<h2>Energieeffizienz in Zahlen: Was bringt ThermoHybrid wirklich?</h2>

<h3>Gesamtwirkungsgrad über 95%</h3>
<p>Während herkömmliche Gasheizungen nur etwa 85–90% des Brennstoffs in Nutzwärme umwandeln, erreicht ThermoHybrid durch die <strong>Mehrfachnutzung der Energie</strong> Gesamtwirkungsgrade von über 95%. Das bedeutet: Fast die gesamte eingesetzte Energie wird tatsächlich genutzt – nichts verpufft ungenutzt.</p>

<h3>CO₂-Reduktion um 60% und mehr</h3>
<p>Durch die hocheffiziente Nutzung von Erdgas (oder perspektivisch Biogas/Wasserstoff) und die Einbindung erneuerbarer Umweltwärme sinken die CO₂-Emissionen im Vergleich zu konventionellen Heizsystemen um <strong>60% oder mehr</strong>. Wird zusätzlich eine PV-Anlage integriert, sind <strong>nahezu klimaneutrale Gebäude</strong> möglich.</p>

<h3>Kosteneinsparung: 30–50% niedrigere Energiekosten</h3>
<p>Die Kombination aus Eigenstromerzeugung, KWKG-Förderung und effizienter Wärmenutzung führt zu <strong>drastisch reduzierten Betriebskosten</strong>:</p>
<ul>
<li><strong>Strombezugskosten sinken</strong> durch Eigenverbrauch (typisch 30 ct/kWh gespart)</li>
<li><strong>KWKG-Zuschläge</strong> bringen zusätzliche Erlöse (0,08–0,16 €/kWh über 30.000 Vollbenutzungsstunden)</li>
<li><strong>Wärmepumpe</strong> nutzt kostenlose Umweltwärme (COP 4–6 bedeutet: 1 kWh Strom → 4–6 kWh Wärme)</li>
</ul>

<p><strong>Beispielrechnung für ein Mehrfamilienhaus (46.000 kWh Jahreswärmebedarf):</strong></p>
<ul>
<li>Heizlast: 46 kW</li>
<li>Elektrische Leistung (Generator): 25 kW</li>
<li>Jährliche Erlöse durch KWKG + Eigenverbrauch: <strong>200.000–285.000 € über die Förderlaufzeit</strong></li>
<li>Amortisation: <strong>3–4 Jahre</strong></li>
</ul>

<h2>Für wen lohnt sich ThermoHybrid?</h2>

<h3>Mehrfamilienhäuser und Wohnquartiere</h3>
<p>Ab etwa <strong>6 Wohneinheiten</strong> ist ThermoHybrid wirtschaftlich interessant. Die kontinuierliche Grundlast durch Warmwasser und Heizung sorgt für hohe Vollbenutzungsstunden des Generators – die Basis für maximale Förderung und Wirtschaftlichkeit.</p>

<h3>Hotels und Serviced Apartments</h3>
<p>Hotels haben einen <strong>ganzjährigen Wärmebedarf</strong> (Warmwasser, Küche, Wellness) und hohen Strombedarf (Beleuchtung, Lüftung, Kühlung). ThermoHybrid deckt beides ab und macht das Gebäude zum <strong>Energieerzeuger</strong> statt nur zum Verbraucher.</p>

<h3>Gewerbe und Industrie</h3>
<p>Produktionshallen, Bürogebäude, Rechenzentren: Überall dort, wo <strong>gleichzeitig Strom und Wärme</strong> benötigt werden, spielt ThermoHybrid seine Stärken aus. Besonders interessant bei <strong>Prozesswärme</strong> oder Abwärmenutzung.</p>

<h3>Kommunen und öffentliche Gebäude</h3>
<p>Schulen, Verwaltungsgebäude, Schwimmbäder: ThermoHybrid hilft Kommunen, ihre <strong>Klimaziele</strong> zu erreichen und gleichzeitig <strong>Betriebskosten zu senken</strong> – ein wichtiger Faktor bei knappen Haushalten.</p>

<h2>Förderung und rechtliche Rahmenbedingungen</h2>

<h3>KWKG 2025: Zuschläge für KWK-Strom</h3>
<p>Das <strong>Kraft-Wärme-Kopplungsgesetz (KWKG)</strong> fördert hocheffiziente KWK-Anlagen mit einem Zuschlag je erzeugter Kilowattstunde Strom:</p>
<ul>
<li><strong>0,16 €/kWh</strong> bei Einspeisung ins Netz</li>
<li><strong>0,08 €/kWh</strong> bei Eigenverbrauch</li>
<li>Förderdauer: <strong>30.000 Vollbenutzungsstunden</strong> (bei Anlagen bis 50 kW elektrisch)</li>
</ul>

<p>Wichtig: Die Förderung ist an bestimmte <strong>technische Anforderungen</strong> geknüpft (Gesamtwirkungsgrad, Messkonzept, Zulassung durch BAFA). Fuchs übernimmt die komplette Antragstellung und Nachweisführung.</p>

<h3>BEW und Landesprogramme</h3>
<p>Die <strong>Bundesförderung für effiziente Wärmenetze (BEW)</strong> und diverse Landesprogramme bieten zusätzliche Investzuschüsse von bis zu <strong>70%</strong> – besonders bei Quartierslösungen und Wärmenetzen.</p>

<h3>GEG 2025: ThermoHybrid erfüllt alle Anforderungen</h3>
<p>Das <strong>Gebäudeenergiegesetz (GEG)</strong> schreibt ab 2025 vor, dass Neubauten und umfassend sanierte Gebäude mindestens <strong>65% erneuerbare Energien</strong> nutzen müssen. ThermoHybrid erfüllt diese Anforderung durch:</p>
<ul>
<li>Hocheffiziente KWK (anrechenbar als „erneuerbar" bei Biomethan/Wasserstoff)</li>
<li>Wärmepumpe mit Umweltwärme</li>
<li>Optional: PV-Anlage für zusätzlichen Grünstrom</li>
</ul>

<h2>Praxisbeispiel: Mehrfamilienhaus mit 12 Wohneinheiten</h2>

<h3>Ausgangssituation</h3>
<ul>
<li>Baujahr: 1998, energetisch saniert 2018</li>
<li>Jahreswärmebedarf: 72.000 kWh</li>
<li>Strombedarf: 45.000 kWh/Jahr</li>
<li>Alte Heizung: Gasbrennwerttherme (Baujahr 2010)</li>
</ul>

<h3>ThermoHybrid-Lösung</h3>
<ul>
<li>Generator: 12 kW elektrisch, 27 kW thermisch</li>
<li>Wärmepumpe: 15 kW thermisch (COP 4,5)</li>
<li>Pufferspeicher: 2.000 Liter</li>
<li>PV-Anlage: 30 kWp (optional)</li>
</ul>

<h3>Ergebnisse nach 12 Monaten Betrieb</h3>
<ul>
<li><strong>Vollbenutzungsstunden Generator:</strong> 5.200 h/Jahr</li>
<li><strong>Eigenverbrauchsquote Strom:</strong> 78%</li>
<li><strong>CO₂-Reduktion:</strong> 62% (im Vergleich zur alten Gasheizung)</li>
<li><strong>Energiekosteneinsparung:</strong> 14.500 €/Jahr</li>
<li><strong>KWKG-Erlöse:</strong> 4.800 €/Jahr (über 30.000 Vollbenutzungsstunden)</li>
<li><strong>Amortisation:</strong> 3,2 Jahre</li>
</ul>

<h2>ThermoHybrid vs. andere Heizsysteme: Der direkte Vergleich</h2>

<table style="width:100%; border-collapse:collapse; margin:1.5rem 0;">
<thead>
<tr style="background:#0f0f0f; border-bottom:2px solid #ff914d;">
<th style="padding:0.75rem; text-align:left;">System</th>
<th style="padding:0.75rem; text-align:left;">Gesamtwirkungsgrad</th>
<th style="padding:0.75rem; text-align:left;">CO₂-Reduktion</th>
<th style="padding:0.75rem; text-align:left;">Betriebskosten</th>
<th style="padding:0.75rem; text-align:left;">GEG 2025</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>ThermoHybrid</strong></td>
<td style="padding:0.75rem;">95%+</td>
<td style="padding:0.75rem;">60–70%</td>
<td style="padding:0.75rem;">Sehr niedrig</td>
<td style="padding:0.75rem;">✓ Erfüllt</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;">Gasbrennwert</td>
<td style="padding:0.75rem;">85–90%</td>
<td style="padding:0.75rem;">0%</td>
<td style="padding:0.75rem;">Hoch</td>
<td style="padding:0.75rem;">✗ Nicht konform</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;">Wärmepumpe (solo)</td>
<td style="padding:0.75rem;">300–400%*</td>
<td style="padding:0.75rem;">50–80%**</td>
<td style="padding:0.75rem;">Mittel–Hoch***</td>
<td style="padding:0.75rem;">✓ Erfüllt</td>
</tr>
<tr>
<td style="padding:0.75rem;">Pelletheizung</td>
<td style="padding:0.75rem;">85–92%</td>
<td style="padding:0.75rem;">80–90%</td>
<td style="padding:0.75rem;">Mittel</td>
<td style="padding:0.75rem;">✓ Erfüllt</td>
</tr>
</tbody>
</table>

<p style="font-size:0.85rem; color:rgba(245,243,240,0.7);">* COP bezogen auf Primärenergie<br>** Abhängig vom Strommix<br>*** Hohe Stromkosten bei Netzbezug</p>

<h2>Häufige Fragen zu ThermoHybrid</h2>

<h3>Ist ThermoHybrid auch für Bestandsgebäude geeignet?</h3>
<p>Ja, absolut. ThermoHybrid lässt sich in nahezu jedes Bestandsgebäude integrieren – vorausgesetzt, es gibt ausreichend Platz für Generator, Wärmepumpe und Pufferspeicher (typisch: 10–15 m² Technikraum). Besonders bei <strong>Heizungssanierungen</strong> ist ThermoHybrid eine zukunftssichere Lösung.</p>

<h3>Wie laut ist ein ThermoHybrid-System?</h3>
<p>Moderne Generatoren sind <strong>schallgedämmt</strong> und erreichen Schalldruckpegel von unter 55 dB(A) in 1 Meter Entfernung – vergleichbar mit einem leisen Kühlschrank. Die Wärmepumpe wird außen aufgestellt oder mit Schalldämmung versehen. In Wohngebäuden ist der Betrieb problemlos möglich.</p>

<h3>Was passiert bei einem Ausfall des Generators?</h3>
<p>ThermoHybrid ist <strong>redundant</strong> ausgelegt: Fällt der Generator aus, übernimmt die Wärmepumpe die komplette Wärmeversorgung. Optional kann ein <strong>Spitzenlastkessel</strong> als zusätzliche Absicherung integriert werden. Zudem bietet Fuchs <strong>Remote Monitoring</strong> und 24/7-Service.</p>

<h3>Kann ich ThermoHybrid auch mit PV kombinieren?</h3>
<p>Ja, und das ist sogar besonders sinnvoll! Die PV-Anlage liefert tagsüber günstigen Strom für die Wärmepumpe und Verbraucher. Der Generator läuft dann vor allem nachts und in den Wintermonaten. Die intelligente Steuerung optimiert automatisch, wann welche Quelle genutzt wird.</p>

<h3>Wie lange hält ein ThermoHybrid-System?</h3>
<p>Die <strong>Lebensdauer</strong> liegt bei:</p>
<ul>
<li><strong>Generator:</strong> 60.000–80.000 Betriebsstunden (entspricht 10–15 Jahren bei 5.000 h/a)</li>
<li><strong>Wärmepumpe:</strong> 15–20 Jahre</li>
<li><strong>Pufferspeicher:</strong> 20–30 Jahre</li>
</ul>
<p>Fuchs bietet <strong>Vollwartungsverträge</strong> und <strong>Contracting-Modelle</strong>, bei denen wir die komplette Verantwortung für Betrieb und Instandhaltung übernehmen.</p>

<h2>Contracting: ThermoHybrid ohne Investitionskosten</h2>

<p>Sie möchten von ThermoHybrid profitieren, aber nicht selbst investieren? Kein Problem: Mit unserem <strong>Contracting-Modell</strong> übernehmen wir:</p>
<ul>
<li><strong>Planung und Installation</strong> der kompletten Anlage</li>
<li><strong>Finanzierung</strong> (Sie zahlen 0 € Investitionskosten)</li>
<li><strong>Betrieb, Wartung und Monitoring</strong> über die gesamte Vertragslaufzeit</li>
<li><strong>Förderantragstellung</strong> und Nachweisführung</li>
</ul>

<p>Sie zahlen lediglich eine <strong>monatliche Pauschale</strong> für Wärme und Strom – deutlich günstiger als Ihre bisherigen Energiekosten. Nach Vertragsende (typisch 10–15 Jahre) geht die Anlage in Ihr Eigentum über.</p>

<h2>Nächste Schritte: So kommen Sie zu Ihrem ThermoHybrid-System</h2>

<h3>1. Kostenlosen Kurzcheck starten</h3>
<p>Nutzen Sie unseren <strong><a href="funnel.html" style="color:#ff914d;">60-Sekunden-Kurzcheck</a></strong>, um eine erste Einschätzung zu erhalten: Eignung, Größenordnung und Förderpotenzial.</p>

<h3>2. Detailanalyse anfordern</h3>
<p>Wir analysieren Ihre Verbrauchsdaten, erstellen ein <strong>individuelles Konzept</strong> und berechnen die exakte Wirtschaftlichkeit – inklusive Förderung, Amortisation und CO₂-Bilanz.</p>

<h3>3. Planung und Umsetzung</h3>
<p>Nach Ihrer Freigabe übernehmen wir:</p>
<ul>
<li>Detailplanung (Hydraulik, Elektrik, Messkonzept)</li>
<li>Förderantragstellung (KWKG, BEW, Landesprogramme)</li>
<li>Installation und Inbetriebnahme</li>
<li>Schulung und Übergabe</li>
</ul>

<h3>4. Monitoring und Service</h3>
<p>Nach der Inbetriebnahme überwachen wir Ihre Anlage per <strong>Remote Monitoring</strong>, optimieren die Betriebsführung und kümmern uns um alle Nachweise für die Förderung.</p>

<h2>Fazit: ThermoHybrid ist die intelligente Antwort auf steigende Energiekosten und Klimaziele</h2>

<p>ThermoHybrid vereint das Beste aus drei Welten: <strong>hocheffiziente KWK</strong>, <strong>erneuerbare Umweltwärme</strong> und <strong>intelligente Steuerung</strong>. Das Ergebnis sind <strong>drastisch reduzierte Energiekosten</strong>, <strong>60% weniger CO₂-Emissionen</strong> und ein System, das alle Anforderungen des <strong>GEG 2025</strong> erfüllt.</p>

<p>Ob Mehrfamilienhaus, Hotel, Gewerbe oder Kommune: ThermoHybrid macht Ihr Gebäude zum <strong>Energieerzeuger</strong> statt nur zum Verbraucher. Und mit unseren <strong>Contracting-Modellen</strong> ist der Einstieg sogar ohne Investitionskosten möglich.</p>

<p><strong>Bereit für die Energiewende?</strong> <a href="funnel.html" style="color:#ff914d; font-weight:600;">Starten Sie jetzt Ihren kostenlosen Kurzcheck</a> oder <a href="index.html#contact-section" style="color:#ff914d; font-weight:600;">vereinbaren Sie ein Planungsgespräch</a>.</p>

<hr style="margin:2rem 0; border:none; border-top:1px solid rgba(255,255,255,0.1);">

<p style="font-size:0.9rem; color:rgba(245,243,240,0.7);"><em>Quellen und weiterführende Informationen:</em></p>
<ul style="font-size:0.9rem; color:rgba(245,243,240,0.7);">
<li><a href="https://www.bmwk.de/Redaktion/DE/Dossier/kraft-waerme-kopplung.html" target="_blank" rel="noopener" style="color:#2ed5d2;">BMWK – Kraft-Wärme-Kopplung</a></li>
<li><a href="https://www.dena.de/themen-projekte/energiesystem/kwk/" target="_blank" rel="noopener" style="color:#2ed5d2;">dena – KWK-Leitfaden</a></li>
<li><a href="https://www.gesetze-im-internet.de/kwkg_2020/" target="_blank" rel="noopener" style="color:#2ed5d2;">KWKG 2025 (Gesetzestext)</a></li>
<li><a href="https://www.bafa.de/DE/Energie/Kraft_Waerme_Kopplung/kwk_node.html" target="_blank" rel="noopener" style="color:#2ed5d2;">BAFA – KWK-Förderung</a></li>
<li><a href="https://www.umweltbundesamt.de/themen/klima-energie/erneuerbare-energien/waermepumpen" target="_blank" rel="noopener" style="color:#2ed5d2;">Umweltbundesamt – Wärmepumpen</a></li>
</ul>`,
        tags: ["Technik", "Wirtschaftlichkeit", "Nachhaltigkeit", "Grundlagen"],
        cover: "images/blog/blog-kwk-grundlagen.svg",
        authorName: "Fuchs Team",
        authorTitle: "Energie & Technik",
        seoTitle: "Energieeffizienz durch ThermoHybrid: KWK + Wärmepumpe + Umweltwärme | Fuchs",
        seoDescription: "Erfahren Sie, wie ThermoHybrid-Systeme durch intelligente Kombination von KWK, Wärmepumpe und Umweltwärme bis zu 60% CO₂ und 30–50% Energiekosten einsparen. Inkl. Förderung, Praxisbeispiele und Wirtschaftlichkeitsrechnung."
    },
    {
        slug: "betrieb-und-wartung",
        title: "GEG 2025 erfüllen und CO₂-Abgabe vermeiden: So macht ThermoHybrid Ihr Gebäude zukunftssicher",
        date: "2025-11-25",
        excerpt: "Das Gebäudeenergiegesetz (GEG) 2025 fordert 65% erneuerbare Energien. Erfahren Sie, wie ThermoHybrid diese Anforderung erfüllt, Sie dauerhaft von der CO₂-Abgabe befreit und gleichzeitig Ihre Energiekosten senkt.",
        content: `<h2>GEG 2025: Was ändert sich und wen betrifft es?</h2>
<p>Das <strong>Gebäudeenergiegesetz (GEG)</strong>, das seit 2024 schrittweise verschärft wird, schreibt ab 2025 vor, dass <strong>neue Heizungen mindestens 65% erneuerbare Energien</strong> nutzen müssen. Diese Regelung gilt für:</p>
<ul>
<li><strong>Neubauten</strong> (sofort)</li>
<li><strong>Heizungstausch in Bestandsgebäuden</strong> (abhängig von der kommunalen Wärmeplanung, spätestens ab 2028)</li>
<li><strong>Umfassende Sanierungen</strong>, bei denen die Heizung erneuert wird</li>
</ul>

<p>Wer gegen diese Vorgaben verstößt, riskiert nicht nur Bußgelder, sondern vor allem: <strong>steigende CO₂-Kosten</strong>. Der nationale Emissionshandel (BEHG) verteuert fossile Brennstoffe Jahr für Jahr – 2025 liegt der CO₂-Preis bei 55 €/t, Tendenz steigend.</p>

<h3>Die Herausforderung: 65% erneuerbar – aber wie?</h3>
<p>Viele Gebäudeeigentümer stehen vor der Frage: <strong>Wie erfülle ich die 65%-Vorgabe wirtschaftlich sinnvoll?</strong> Die klassischen Optionen:</p>
<ul>
<li><strong>Reine Wärmepumpe:</strong> Funktioniert gut in Neubauten mit Fußbodenheizung, aber in Bestandsgebäuden mit Radiatoren oft ineffizient und teuer (hohe Vorlauftemperaturen nötig).</li>
<li><strong>Pelletheizung:</strong> Erneuerbar, aber hoher Platzbedarf, Lagerlogistik und Feinstaub-Thematik.</li>
<li><strong>Fernwärme:</strong> Nur dort verfügbar, wo Netze existieren – und oft teuer.</li>
</ul>

<p><strong>ThermoHybrid</strong> bietet eine elegante Lösung: Die Kombination aus <strong>hocheffizienter KWK</strong>, <strong>Wärmepumpe</strong> und <strong>Umweltwärme</strong> erfüllt nicht nur die 65%-Vorgabe, sondern übertrifft sie – und das bei niedrigeren Betriebskosten als jede andere Technologie.</p>

<h2>Wie ThermoHybrid die GEG-Anforderungen erfüllt</h2>

<h3>1. KWK zählt als „erneuerbar" (unter bestimmten Bedingungen)</h3>
<p>Das GEG erkennt <strong>hocheffiziente Kraft-Wärme-Kopplung</strong> als teilweise erneuerbar an, wenn:</p>
<ul>
<li>Der <strong>Gesamtwirkungsgrad über 90%</strong> liegt (ThermoHybrid: 95%+)</li>
<li>Die Anlage <strong>KWKG-förderfähig</strong> ist (automatisch erfüllt bei ThermoHybrid)</li>
<li>Optional: <strong>Biogas oder Wasserstoff</strong> beigemischt wird (erhöht den Erneuerbaren-Anteil weiter)</li>
</ul>

<h3>2. Wärmepumpe nutzt 100% erneuerbare Umweltwärme</h3>
<p>Die integrierte Wärmepumpe bezieht ihre Energie aus:</p>
<ul>
<li><strong>Außenluft</strong> (Luft-Wasser-Wärmepumpe)</li>
<li><strong>Erdreich</strong> (Sole-Wasser-Wärmepumpe)</li>
<li><strong>Abwärme</strong> aus dem Gebäude (z.B. Abluft)</li>
</ul>
<p>Diese Umweltwärme ist <strong>zu 100% erneuerbar</strong> und wird vom GEG voll angerechnet.</p>

<h3>3. Optional: PV-Anlage für zusätzlichen Grünstrom</h3>
<p>Wird eine <strong>Photovoltaik-Anlage</strong> integriert, steigt der Erneuerbaren-Anteil weiter – und die Betriebskosten sinken noch mehr, da die Wärmepumpe mit kostenlosem Solarstrom läuft.</p>

<h3>Ergebnis: 70–85% erneuerbare Energien (je nach Konfiguration)</h3>
<p>ThermoHybrid erreicht typischerweise <strong>70–85% erneuerbare Energien</strong> – deutlich über der GEG-Mindestanforderung von 65%. Damit sind Sie nicht nur gesetzeskonform, sondern auch <strong>zukunftssicher</strong> für mögliche weitere Verschärfungen.</p>

<h2>CO₂-Abgabe: So sparen Sie dauerhaft Tausende Euro</h2>

<h3>Was ist die CO₂-Abgabe und wie hoch ist sie?</h3>
<p>Seit 2021 erhebt Deutschland eine <strong>CO₂-Abgabe auf fossile Brennstoffe</strong> (Erdgas, Öl, Kohle). Der Preis steigt kontinuierlich:</p>
<ul>
<li><strong>2021:</strong> 25 €/t CO₂</li>
<li><strong>2023:</strong> 30 €/t</li>
<li><strong>2025:</strong> 55 €/t</li>
<li><strong>2026:</strong> 55–65 €/t (Bandbreite)</li>
<li><strong>Ab 2027:</strong> Marktpreis (erwartet: 80–100 €/t)</li>
</ul>

<p>Für Erdgas bedeutet das (Emissionsfaktor 0,201 kg CO₂/kWh):</p>
<ul>
<li><strong>2025:</strong> ca. 1,1 ct/kWh Aufschlag</li>
<li><strong>2027:</strong> ca. 1,6–2,0 ct/kWh Aufschlag</li>
</ul>

<h3>Beispielrechnung: Mehrfamilienhaus mit 72.000 kWh Jahreswärmebedarf</h3>

<table style="width:100%; border-collapse:collapse; margin:1.5rem 0;">
<thead>
<tr style="background:#0f0f0f; border-bottom:2px solid #ff914d;">
<th style="padding:0.75rem; text-align:left;">System</th>
<th style="padding:0.75rem; text-align:left;">CO₂-Emissionen/Jahr</th>
<th style="padding:0.75rem; text-align:left;">CO₂-Abgabe 2025</th>
<th style="padding:0.75rem; text-align:left;">CO₂-Abgabe 2027</th>
<th style="padding:0.75rem; text-align:left;">Ersparnis über 10 Jahre</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Gasbrennwert</strong></td>
<td style="padding:0.75rem;">14,5 t</td>
<td style="padding:0.75rem;">798 €</td>
<td style="padding:0.75rem;">1.160–1.450 €</td>
<td style="padding:0.75rem;">—</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>ThermoHybrid</strong></td>
<td style="padding:0.75rem;">5,8 t (-60%)</td>
<td style="padding:0.75rem;">319 €</td>
<td style="padding:0.75rem;">464–580 €</td>
<td style="padding:0.75rem;"><strong>~8.000 €</strong></td>
</tr>
</tbody>
</table>

<p><strong>Fazit:</strong> Allein durch die vermiedene CO₂-Abgabe sparen Sie mit ThermoHybrid über 10 Jahre <strong>rund 8.000 €</strong> – zusätzlich zu den Einsparungen bei Strom und Wärme!</p>

<h2>Vollbenutzungsstunden: Der Schlüssel zur KWKG-Förderung</h2>

<h3>Was sind Vollbenutzungsstunden?</h3>
<p><strong>Vollbenutzungsstunden</strong> sind die Anzahl der Stunden, die eine KWK-Anlage theoretisch bei Volllast laufen müsste, um die tatsächlich erzeugte Strommenge zu produzieren. Beispiel:</p>
<ul>
<li>Generator: 12 kW elektrisch</li>
<li>Jahresstromerzeugung: 60.000 kWh</li>
<li>Vollbenutzungsstunden: 60.000 kWh ÷ 12 kW = <strong>5.000 h/Jahr</strong></li>
</ul>

<h3>Warum sind sie wichtig?</h3>
<p>Das <strong>KWKG</strong> fördert KWK-Anlagen über eine bestimmte Anzahl von Vollbenutzungsstunden (typisch 30.000 h bei Anlagen bis 50 kW). Je mehr Stunden die Anlage pro Jahr läuft, desto schneller ist die Förderung „aufgebraucht" – aber desto wirtschaftlicher ist sie auch.</p>

<h3>ThermoHybrid maximiert Vollbenutzungsstunden</h3>
<p>Durch die intelligente Kombination von Generator und Wärmepumpe erreicht ThermoHybrid <strong>4.000–6.000 Vollbenutzungsstunden pro Jahr</strong> – deutlich mehr als reine ThermoHybrid-Anlagen (oft nur 2.000–3.000 h). Das bedeutet:</p>
<ul>
<li><strong>Höhere Fördererlöse</strong> pro Jahr</li>
<li><strong>Schnellere Amortisation</strong></li>
<li><strong>Bessere Wirtschaftlichkeit</strong></li>
</ul>

<h2>Messkonzept für KWKG & BEW: Was Sie wissen müssen</h2>

<h3>Warum brauche ich ein Messkonzept?</h3>
<p>Um die <strong>KWKG-Förderung</strong> zu erhalten, müssen Sie nachweisen, wie viel Strom Sie erzeugt, selbst verbraucht und eingespeist haben. Dafür ist ein <strong>geeichtes Messkonzept</strong> erforderlich, das folgende Größen erfasst:</p>
<ul>
<li><strong>KWK-Stromerzeugung</strong> (Zähler am Generator)</li>
<li><strong>Eigenverbrauch</strong> (Zähler im Gebäude)</li>
<li><strong>Einspeisung</strong> (Zähler am Netzanschlusspunkt)</li>
<li><strong>Wärmeerzeugung</strong> (Wärmemengenzähler)</li>
</ul>

<h3>Fuchs übernimmt die komplette Messkonzept-Planung</h3>
<p>Wir erstellen ein <strong>BAFA-konformes Messkonzept</strong>, das alle Anforderungen erfüllt – inklusive:</p>
<ul>
<li>Auswahl der richtigen Zähler (geeicht, MID-konform)</li>
<li>Hydraulikschema mit Messpunkten</li>
<li>Dokumentation für BAFA-Antrag</li>
<li>Inbetriebnahme und Kalibrierung</li>
</ul>

<h2>Praxisbeispiel: Wohnanlage mit 20 Wohneinheiten</h2>

<h3>Ausgangssituation</h3>
<ul>
<li>Baujahr: 1985, Fassadendämmung 2015</li>
<li>Jahreswärmebedarf: 120.000 kWh</li>
<li>Alte Heizung: Ölkessel (Baujahr 2005)</li>
<li>Problem: GEG-Vorgabe nicht erfüllbar mit reiner Gasheizung, Wärmepumpe zu teuer</li>
</ul>

<h3>ThermoHybrid-Lösung</h3>
<ul>
<li>Generator: 20 kW elektrisch, 45 kW thermisch</li>
<li>Wärmepumpe: 25 kW thermisch (COP 4,8)</li>
<li>Pufferspeicher: 3.000 Liter</li>
<li>Messkonzept: 4 geeichte Zähler (KWK-Strom, Eigenverbrauch, Einspeisung, Wärme)</li>
</ul>

<h3>Ergebnisse nach 12 Monaten</h3>
<ul>
<li><strong>Vollbenutzungsstunden:</strong> 5.400 h/Jahr</li>
<li><strong>Erneuerbaren-Anteil:</strong> 78% (GEG erfüllt ✓)</li>
<li><strong>CO₂-Reduktion:</strong> 68% (im Vergleich zum alten Ölkessel)</li>
<li><strong>CO₂-Abgabe eingespart:</strong> 1.250 €/Jahr</li>
<li><strong>KWKG-Erlöse:</strong> 8.600 €/Jahr</li>
<li><strong>Gesamtersparnis:</strong> 22.000 €/Jahr (inkl. Strom- und Wärmeeinsparung)</li>
<li><strong>Amortisation:</strong> 2,8 Jahre</li>
</ul>

<h2>Contracting: GEG erfüllen ohne Investitionskosten</h2>

<p>Sie möchten GEG-konform werden, aber nicht selbst investieren? Mit unserem <strong>Contracting-Modell</strong> übernehmen wir:</p>
<ul>
<li><strong>Planung, Installation und Finanzierung</strong> der kompletten ThermoHybrid-Anlage</li>
<li><strong>Messkonzept und Förderantragstellung</strong> (KWKG, BEW)</li>
<li><strong>Betrieb, Wartung und Monitoring</strong> über die gesamte Vertragslaufzeit</li>
<li><strong>Nachweisführung</strong> für BAFA und Netzbetreiber</li>
</ul>

<p>Sie zahlen lediglich eine <strong>monatliche Pauschale</strong> für Wärme und Strom – garantiert günstiger als Ihre bisherigen Energiekosten. Nach Vertragsende (typisch 10–15 Jahre) geht die Anlage in Ihr Eigentum über.</p>

<h2>Häufige Fragen zu GEG & CO₂-Abgabe</h2>

<h3>Muss ich meine alte Heizung sofort austauschen?</h3>
<p>Nein. Bestehende Heizungen dürfen weiterlaufen, bis sie defekt sind oder die <strong>kommunale Wärmeplanung</strong> einen Austausch vorschreibt (spätestens 2028 in Großstädten, 2030 in kleineren Kommunen). Aber: Je früher Sie umsteigen, desto mehr sparen Sie bei der CO₂-Abgabe.</p>

<h3>Was passiert, wenn ich die 65%-Vorgabe nicht erfülle?</h3>
<p>Bei Verstößen drohen <strong>Bußgelder bis 50.000 €</strong>. Wichtiger: Sie zahlen dauerhaft die volle CO₂-Abgabe und haben keine Chance auf KWKG-Förderung.</p>

<h3>Kann ich ThermoHybrid auch in einem denkmalgeschützten Gebäude installieren?</h3>
<p>Ja, in den meisten Fällen. Die Komponenten werden im Keller oder Technikraum installiert – außen sichtbar ist nur die Wärmepumpe (kann auch im Innenhof oder auf dem Dach platziert werden). Wir klären die Genehmigungsfähigkeit im Vorfeld mit der Denkmalschutzbehörde.</p>

<h3>Wie lange dauert die Umstellung auf ThermoHybrid?</h3>
<p>Von der Beauftragung bis zur Inbetriebnahme vergehen typischerweise <strong>8–12 Wochen</strong> – inklusive Förderantragstellung, Lieferung, Installation und Messkonzept-Abnahme.</p>

<h2>Nächste Schritte: So werden Sie GEG-konform</h2>

<h3>1. Kostenlosen Kurzcheck starten</h3>
<p>Nutzen Sie unseren <strong><a href="funnel.html" style="color:#ff914d;">60-Sekunden-Kurzcheck</a></strong>, um zu prüfen, ob ThermoHybrid für Ihr Gebäude geeignet ist.</p>

<h3>2. GEG-Konformitätsprüfung anfordern</h3>
<p>Wir analysieren Ihr Gebäude, berechnen den Erneuerbaren-Anteil und zeigen Ihnen, wie Sie die 65%-Vorgabe erfüllen – inklusive Förderung und Wirtschaftlichkeit.</p>

<h3>3. Umsetzung mit Rundum-Service</h3>
<p>Wir übernehmen Planung, Förderantrag, Installation, Messkonzept und Inbetriebnahme. Sie erhalten ein <strong>schlüsselfertiges, GEG-konformes System</strong>.</p>

<h2>Fazit: ThermoHybrid macht GEG-Konformität wirtschaftlich attraktiv</h2>

<p>Das GEG 2025 ist keine Belastung, sondern eine <strong>Chance</strong>: Mit ThermoHybrid erfüllen Sie nicht nur die 65%-Vorgabe, sondern sparen gleichzeitig <strong>60% CO₂-Emissionen</strong> und <strong>30–50% Energiekosten</strong>. Die CO₂-Abgabe wird zur Nebensache, weil Sie kaum noch fossile Brennstoffe verbrauchen.</p>

<p>Und das Beste: Mit unseren <strong>Contracting-Modellen</strong> ist der Einstieg sogar ohne Investitionskosten möglich.</p>

<p><strong>Bereit für die Energiewende?</strong> <a href="funnel.html" style="color:#ff914d; font-weight:600;">Starten Sie jetzt Ihren kostenlosen GEG-Check</a> oder <a href="index.html#contact-section" style="color:#ff914d; font-weight:600;">vereinbaren Sie ein Beratungsgespräch</a>.</p>

<hr style="margin:2rem 0; border:none; border-top:1px solid rgba(255,255,255,0.1);">

<p style="font-size:0.9rem; color:rgba(245,243,240,0.7);"><em>Quellen und weiterführende Informationen:</em></p>
<ul style="font-size:0.9rem; color:rgba(245,243,240,0.7);">
<li><a href="https://www.bmwk.de/Redaktion/DE/Dossier/geg.html" target="_blank" rel="noopener" style="color:#2ed5d2;">BMWK – Gebäudeenergiegesetz</a></li>
<li><a href="https://www.gesetze-im-internet.de/geg/" target="_blank" rel="noopener" style="color:#2ed5d2;">GEG 2024 (Gesetzestext)</a></li>
<li><a href="https://www.bmuv.de/themen/klimaschutz-klimaanpassung/klimaschutz/klimawandel-verursacher-verursacherprinzip/co2-preis-im-nationalen-emissionshandel" target="_blank" rel="noopener" style="color:#2ed5d2;">BMUV – CO₂-Preis</a></li>
<li><a href="https://www.umweltbundesamt.de/themen/verkehr-laerm/emissionsdaten/emissionsfaktoren" target="_blank" rel="noopener" style="color:#2ed5d2;">UBA – Emissionsfaktoren</a></li>
<li><a href="https://www.bafa.de/DE/Energie/Kraft_Waerme_Kopplung/kwk_node.html" target="_blank" rel="noopener" style="color:#2ed5d2;">BAFA – KWK-Förderung</a></li>
</ul>`,
        tags: ["Recht", "Nachhaltigkeit", "Förderung", "Wirtschaftlichkeit"],
        cover: "images/blog/blog-betrieb-wartung.svg",
        authorName: "Fuchs Team",
        authorTitle: "Recht & Compliance",
        seoTitle: "GEG 2025 erfüllen mit ThermoHybrid: 65% erneuerbar + CO₂-Abgabe sparen | Fuchs",
        seoDescription: "Erfahren Sie, wie ThermoHybrid die GEG-Anforderungen (65% erneuerbar) erfüllt, Sie dauerhaft von der CO₂-Abgabe befreit und gleichzeitig Energiekosten senkt. Inkl. Messkonzept, Vollbenutzungsstunden und Praxisbeispiel."
    },
    {
        slug: "foerderung-und-vergutung",
        title: "Contracting für ThermoHybrid: Modernisierung ohne CAPEX – Fuchs übernimmt Invest, Wartung und Monitoring",
        date: "2025-11-24",
        excerpt: "Erfahren Sie, wie Sie mit Contracting-Modellen von ThermoHybrid profitieren, ohne selbst zu investieren. Fuchs übernimmt Planung, Finanzierung, Betrieb und Wartung – Sie zahlen nur eine monatliche Pauschale.",
        content: `<h2>Was ist Energie-Contracting und wie funktioniert es?</h2>
<p><strong>Energie-Contracting</strong> ist ein Finanzierungsmodell, bei dem ein externer Dienstleister (Contractor) eine Energieanlage plant, finanziert, installiert und betreibt – ohne dass Sie als Gebäudeeigentümer investieren müssen. Sie zahlen lediglich eine <strong>monatliche Pauschale</strong> für die gelieferte Energie (Wärme und Strom), die <strong>garantiert günstiger</strong> ist als Ihre bisherigen Energiekosten.</p>

<p>Nach Vertragsende (typisch 10–15 Jahre) geht die Anlage <strong>in Ihr Eigentum über</strong> – ohne weitere Kosten.</p>

<h3>Die drei Contracting-Modelle im Überblick</h3>
<ul>
<li><strong>Energieliefer-Contracting:</strong> Fuchs liefert Wärme und Strom zu einem festen Preis pro kWh.</li>
<li><strong>Einspar-Contracting:</strong> Fuchs garantiert eine bestimmte Energiekosteneinsparung (z.B. 30%) – Sie profitieren sofort.</li>
<li><strong>Finanzierungs-Contracting:</strong> Fuchs finanziert die Anlage, Sie zahlen eine monatliche Rate – nach Vertragsende gehört die Anlage Ihnen.</li>
</ul>

<h2>Warum Contracting für ThermoHybrid besonders attraktiv ist</h2>

<h3>1. Keine Investitionskosten</h3>
<p>ThermoHybrid-Anlagen kosten je nach Größe <strong>80.000–250.000 €</strong>. Mit Contracting zahlen Sie <strong>0 € Invest</strong> – Fuchs übernimmt die komplette Finanzierung.</p>

<h3>2. Planbare Kosten</h3>
<p>Sie zahlen eine <strong>fixe monatliche Pauschale</strong> für Wärme und Strom – unabhängig von Energiepreis-Schwankungen. Das macht Ihre Betriebskosten <strong>kalkulierbar</strong>.</p>

<h3>3. Rundum-Service inklusive</h3>
<p>Fuchs übernimmt:</p>
<ul>
<li><strong>Planung und Installation</strong></li>
<li><strong>Förderantragstellung</strong> (KWKG, BEW)</li>
<li><strong>Betrieb und Wartung</strong> (24/7-Service)</li>
<li><strong>Remote Monitoring</strong> und Optimierung</li>
<li><strong>Ersatzteile und Reparaturen</strong></li>
</ul>

<h3>4. Performance-Garantie</h3>
<p>Wir garantieren Ihnen eine <strong>Verfügbarkeit von mindestens 98%</strong> und bestimmte Effizienz-Kennzahlen. Werden diese nicht erreicht, zahlen Sie weniger.</p>

<h2>Praxisbeispiel: Wohnanlage mit 24 Wohneinheiten</h2>

<h3>Ausgangssituation</h3>
<ul>
<li>Jahreswärmebedarf: 150.000 kWh</li>
<li>Strombedarf: 80.000 kWh/Jahr</li>
<li>Bisherige Energiekosten: 28.000 €/Jahr (Gasheizung + Netzbezug)</li>
<li>Problem: Heizung defekt, kein Budget für Neuinvestition</li>
</ul>

<h3>Contracting-Lösung</h3>
<ul>
<li><strong>Investitionskosten (von Fuchs getragen):</strong> 185.000 €</li>
<li><strong>Monatliche Pauschale:</strong> 1.850 €</li>
<li><strong>Jährliche Kosten:</strong> 22.200 € (statt 28.000 €)</li>
<li><strong>Ersparnis:</strong> 5.800 €/Jahr</li>
<li><strong>Vertragslaufzeit:</strong> 12 Jahre</li>
<li><strong>Nach Vertragsende:</strong> Anlage geht ins Eigentum über, Energiekosten sinken auf ca. 12.000 €/Jahr (nur noch Brennstoff + Wartung)</li>
</ul>

<h3>Ergebnis</h3>
<ul>
<li><strong>Sofortige Kostenersparnis:</strong> 5.800 €/Jahr</li>
<li><strong>Kein Invest nötig</strong></li>
<li><strong>Rundum-Service</strong> über 12 Jahre</li>
<li><strong>Nach 12 Jahren:</strong> Anlage im Wert von 185.000 € gehört dem Eigentümer</li>
</ul>

<h2>Contracting vs. Kauf: Der direkte Vergleich</h2>

<table style="width:100%; border-collapse:collapse; margin:1.5rem 0;">
<thead>
<tr style="background:#0f0f0f; border-bottom:2px solid #ff914d;">
<th style="padding:0.75rem; text-align:left;">Kriterium</th>
<th style="padding:0.75rem; text-align:left;">Contracting</th>
<th style="padding:0.75rem; text-align:left;">Kauf</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Investitionskosten</strong></td>
<td style="padding:0.75rem;">0 €</td>
<td style="padding:0.75rem;">80.000–250.000 €</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Planung & Installation</strong></td>
<td style="padding:0.75rem;">✓ Fuchs</td>
<td style="padding:0.75rem;">✓ Fuchs</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Förderantrag</strong></td>
<td style="padding:0.75rem;">✓ Fuchs</td>
<td style="padding:0.75rem;">✓ Fuchs (optional)</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Betrieb & Wartung</strong></td>
<td style="padding:0.75rem;">✓ Fuchs (inkl.)</td>
<td style="padding:0.75rem;">Eigentümer (ca. 3.000 €/Jahr)</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Risiko</strong></td>
<td style="padding:0.75rem;">Fuchs trägt Risiko</td>
<td style="padding:0.75rem;">Eigentümer trägt Risiko</td>
</tr>
<tr style="border-bottom:1px solid #1c1c1c;">
<td style="padding:0.75rem;"><strong>Monatliche Kosten</strong></td>
<td style="padding:0.75rem;">Fixe Pauschale</td>
<td style="padding:0.75rem;">Variable Energiekosten</td>
</tr>
<tr>
<td style="padding:0.75rem;"><strong>Nach Vertragsende</strong></td>
<td style="padding:0.75rem;">Anlage geht ins Eigentum</td>
<td style="padding:0.75rem;">Anlage bereits Eigentum</td>
</tr>
</tbody>
</table>

<h2>Für wen ist Contracting besonders geeignet?</h2>

<h3>Wohnungswirtschaft</h3>
<p>Wohnungsgenossenschaften und -gesellschaften profitieren von <strong>planbaren Nebenkosten</strong> und können ihren Mietern <strong>stabile Heizkosten</strong> garantieren – ohne selbst zu investieren.</p>

<h3>Kommunen und öffentliche Einrichtungen</h3>
<p>Knappe Haushalte, lange Beschaffungswege: Contracting ermöglicht <strong>sofortige Modernisierung</strong> ohne Haushaltsmittel zu binden.</p>

<h3>Gewerbe und Industrie</h3>
<p>Unternehmen können ihr Kapital in ihr Kerngeschäft investieren, statt in Energieanlagen – und profitieren trotzdem von <strong>niedrigeren Energiekosten</strong>.</p>

<h2>Häufige Fragen zu Contracting</h2>

<h3>Was passiert, wenn die Anlage ausfällt?</h3>
<p>Fuchs trägt das <strong>Betriebsrisiko</strong>. Wir garantieren eine Verfügbarkeit von mindestens 98% – bei Unterschreitung reduziert sich Ihre monatliche Pauschale automatisch.</p>

<h3>Kann ich den Vertrag vorzeitig beenden?</h3>
<p>Ja, gegen Zahlung einer <strong>Ablösesumme</strong>, die sich aus den noch offenen Investitionskosten berechnet. Nach Vertragsende gehört die Anlage Ihnen.</p>

<h3>Was passiert nach Vertragsende?</h3>
<p>Die Anlage geht <strong>kostenfrei in Ihr Eigentum über</strong>. Sie können dann wählen: Selbst betreiben oder einen <strong>Wartungsvertrag</strong> mit Fuchs abschließen.</p>

<h2>Nächste Schritte: So starten Sie mit Contracting</h2>

<p><strong>1. Kostenlosen Kurzcheck starten:</strong> <a href="funnel.html" style="color:#ff914d;">60-Sekunden-Check</a></p>
<p><strong>2. Contracting-Angebot anfordern:</strong> <a href="index.html#contact-section" style="color:#ff914d;">Beratungsgespräch vereinbaren</a></p>

<hr style="margin:2rem 0; border:none; border-top:1px solid rgba(255,255,255,0.1);">

<p style="font-size:0.9rem; color:rgba(245,243,240,0.7);"><em>Quellen:</em></p>
<ul style="font-size:0.9rem; color:rgba(245,243,240,0.7);">
<li><a href="https://www.dena.de/themen-projekte/energieeffizienz/gebaeude/energiedienstleistungen-contracting/" target="_blank" rel="noopener" style="color:#2ed5d2;">dena – Contracting-Leitfaden</a></li>
<li><a href="https://www.bmwk.de/" target="_blank" rel="noopener" style="color:#2ed5d2;">BMWK – Energieeffizienz</a></li>
</ul>`,
        tags: ["Wirtschaftlichkeit", "Praxis", "Förderung"],
        cover: "images/blog/blog-praxis-hotel.svg",
        authorName: "Fuchs Team",
        authorTitle: "Contracting & Finanzierung",
        seoTitle: "ThermoHybrid Contracting: Modernisierung ohne Invest | Fuchs",
        seoDescription: "Energie-Contracting für ThermoHybrid: 0 € Investitionskosten, planbare Kosten, Rundum-Service. Fuchs übernimmt Planung, Finanzierung, Betrieb und Wartung. Jetzt informieren!"
    },
    {
        slug: "wirtschaftlichkeit-berechnen",
        title: "KWKG-Förderung 2025 maximieren: Zuschläge, Vollbenutzungsstunden und Förderantrag",
        date: "2025-11-23",
        excerpt: "Alles zur KWKG-Förderung 2025: Zuschlagshöhe, Förderdauer, Antragstellung und wie ThermoHybrid die Förderung maximiert. Inkl. Praxisbeispiel und Schritt-für-Schritt-Anleitung.",
        content: `<h2>KWKG 2025: Die wichtigsten Eckpunkte</h2>
<p>Das <strong>Kraft-Wärme-Kopplungsgesetz (KWKG)</strong> fördert hocheffiziente KWK-Anlagen mit einem <strong>Zuschlag je erzeugter Kilowattstunde Strom</strong>. Ziel: Anreize für klimafreundliche, effiziente Stromerzeugung schaffen.</p>

<h3>Zuschlagshöhe 2025</h3>
<ul>
<li><strong>0,16 €/kWh</strong> bei Einspeisung ins Netz</li>
<li><strong>0,08 €/kWh</strong> bei Eigenverbrauch</li>
<li>Förderdauer: <strong>30.000 Vollbenutzungsstunden</strong> (bei Anlagen bis 50 kW elektrisch)</li>
</ul>

<h3>Beispielrechnung: 12 kW Generator</h3>
<ul>
<li>Vollbenutzungsstunden pro Jahr: 5.000 h</li>
<li>Stromerzeugung: 60.000 kWh/Jahr</li>
<li>Eigenverbrauch: 70% (42.000 kWh)</li>
<li>Einspeisung: 30% (18.000 kWh)</li>
<li><strong>KWKG-Erlöse pro Jahr:</strong> (42.000 × 0,08 €) + (18.000 × 0,16 €) = <strong>6.240 €</strong></li>
<li><strong>Förderdauer:</strong> 30.000 h ÷ 5.000 h/Jahr = 6 Jahre</li>
<li><strong>Gesamtförderung:</strong> 6.240 € × 6 Jahre = <strong>37.440 €</strong></li>
</ul>

<h2>Vollbenutzungsstunden maximieren: So holen Sie mehr aus der Förderung</h2>

<h3>Was sind Vollbenutzungsstunden?</h3>
<p>Vollbenutzungsstunden = Jahresstromerzeugung ÷ elektrische Leistung</p>
<p>Je mehr Stunden die Anlage läuft, desto höher die jährlichen Fördererlöse.</p>

<h3>ThermoHybrid erreicht 4.000–6.000 h/Jahr</h3>
<p>Durch die intelligente Kombination von Generator und Wärmepumpe läuft der Generator <strong>deutlich länger</strong> als bei reinen ThermoHybrid-Anlagen (oft nur 2.000–3.000 h).</p>

<h2>Förderantrag Schritt für Schritt</h2>

<h3>1. Zulassungsantrag bei BAFA</h3>
<p>Vor Inbetriebnahme muss die Anlage beim BAFA zugelassen werden. Fuchs übernimmt:</p>
<ul>
<li>Technische Dokumentation</li>
<li>Messkonzept</li>
<li>Hydraulikschema</li>
<li>Antragsformulare</li>
</ul>

<h3>2. Inbetriebnahme und Messkonzept-Abnahme</h3>
<p>Nach Installation erfolgt die <strong>Abnahme durch einen Sachverständigen</strong> – Fuchs koordiniert alle Termine.</p>

<h3>3. Monatliche Abrechnung</h3>
<p>Die KWKG-Zuschläge werden <strong>monatlich</strong> vom Netzbetreiber ausgezahlt – basierend auf den geeichten Zählerdaten.</p>

<h2>BEW-Förderung: Zusätzliche Investzuschüsse</h2>

<p>Die <strong>Bundesförderung für effiziente Wärmenetze (BEW)</strong> bietet Investzuschüsse von bis zu <strong>40% (Einzelgebäude) bzw. 70% (Wärmenetze)</strong>.</p>

<h3>Kombinierbar mit KWKG</h3>
<p>BEW und KWKG können kombiniert werden – so maximieren Sie Ihre Förderung.</p>

<h2>Praxisbeispiel: Quartier mit 40 Wohneinheiten</h2>

<h3>Investitionskosten</h3>
<ul>
<li>ThermoHybrid-Anlage: 280.000 €</li>
<li>BEW-Zuschuss (40%): -112.000 €</li>
<li><strong>Eigenanteil: 168.000 €</strong></li>
</ul>

<h3>KWKG-Erlöse</h3>
<ul>
<li>Generator: 25 kW elektrisch</li>
<li>Vollbenutzungsstunden: 5.500 h/Jahr</li>
<li>Jährliche KWKG-Erlöse: 13.200 €</li>
<li>Förderdauer: 5,5 Jahre</li>
<li><strong>Gesamtförderung: 72.600 €</strong></li>
</ul>

<h3>Amortisation</h3>
<ul>
<li>Eigenanteil: 168.000 €</li>
<li>Jährliche Einsparung (Energie + KWKG): 28.000 €</li>
<li><strong>Amortisation: 6 Jahre</strong></li>
</ul>

<h2>Nächste Schritte</h2>

<p><strong>1. Fördercheck starten:</strong> <a href="funnel.html" style="color:#ff914d;">60-Sekunden-Check</a></p>
<p><strong>2. Detailanalyse anfordern:</strong> <a href="index.html#contact-section" style="color:#ff914d;">Beratungsgespräch</a></p>

<hr style="margin:2rem 0; border:none; border-top:1px solid rgba(255,255,255,0.1);">

<p style="font-size:0.9rem; color:rgba(245,243,240,0.7);"><em>Quellen:</em></p>
<ul style="font-size:0.9rem; color:rgba(245,243,240,0.7);">
<li><a href="https://www.gesetze-im-internet.de/kwkg_2020/" target="_blank" rel="noopener" style="color:#2ed5d2;">KWKG 2025</a></li>
<li><a href="https://www.bafa.de/DE/Energie/Kraft_Waerme_Kopplung/kwk_node.html" target="_blank" rel="noopener" style="color:#2ed5d2;">BAFA – KWK</a></li>
</ul>`,
        tags: ["Förderung", "Wirtschaftlichkeit", "Recht"],
        cover: "images/blog/blog-kwkg-foerderung.svg",
        authorName: "Tim Albrecht",
        authorTitle: "Fördermittel",
        seoTitle: "KWKG-Förderung 2025: Zuschläge maximieren mit ThermoHybrid | Fuchs",
        seoDescription: "KWKG-Förderung 2025: 0,08–0,16 €/kWh über 30.000 Vollbenutzungsstunden. Erfahren Sie, wie ThermoHybrid die Förderung maximiert. Inkl. Antragstellung, Praxisbeispiel und BEW-Kombination."
    },
    {
        slug: "fuchs-live-monitoring",
        title: "Fuchs live Monitoring: Dashboards, Realtime-Daten und automatische Alarmierung für maximale Anlagenverfügbarkeit",
        date: "2025-11-22",
        excerpt: "Erfahren Sie, wie Fuchs live Monitoring Ihre ThermoHybrid-Anlage rund um die Uhr überwacht, KPIs visualisiert, bei Abweichungen alarmiert und alle Nachweise für die Förderung automatisch speichert.",
        content: `<h2>Warum Monitoring für ThermoHybrid unverzichtbar ist</h2>
<p>ThermoHybrid-Anlagen sind <strong>komplexe Systeme</strong> aus Generator, Wärmepumpe, Pufferspeichern und intelligenter Steuerung. Um maximale Effizienz, Verfügbarkeit und Fördererlöse zu sichern, ist ein <strong>professionelles Monitoring</strong> unverzichtbar.</p>

<h3>Die Herausforderungen ohne Monitoring</h3>
<ul>
<li><strong>Ausfälle bleiben unbemerkt</strong> → Komfortverlust, Förderausfall</li>
<li><strong>Ineffizienzen werden nicht erkannt</strong> → höhere Betriebskosten</li>
<li><strong>Nachweise für BAFA fehlen</strong> → Förderverlust</li>
<li><strong>Wartung erfolgt reaktiv</strong> → teure Notdienste</li>
</ul>

<h2>Fuchs live Monitoring: Die Lösung</h2>

<h3>1. Realtime-Dashboard</h3>
<p>Unser <strong>Web-Dashboard</strong> zeigt Ihnen jederzeit:</p>
<ul>
<li><strong>Aktuelle Leistung:</strong> Generator, Wärmepumpe, Pufferspeicher</li>
<li><strong>Temperaturen:</strong> Vorlauf, Rücklauf, Außentemperatur</li>
<li><strong>Stromerzeugung:</strong> Aktuell, heute, Monat, Jahr</li>
<li><strong>Wärmeerzeugung:</strong> KWK, Wärmepumpe, Gesamt</li>
<li><strong>Effizienz-KPIs:</strong> COP, Wirkungsgrad, Vollbenutzungsstunden</li>
<li><strong>Fördererlöse:</strong> KWKG-Zuschläge, BEW-Status</li>
</ul>

<h3>2. Automatische Alarmierung</h3>
<p>Bei Abweichungen werden Sie <strong>sofort benachrichtigt</strong> (SMS, E-Mail, Push):</p>
<ul>
<li>Generator-Störung</li>
<li>Wärmepumpen-Fehler</li>
<li>Temperaturabweichungen</li>
<li>Zählerausfall</li>
<li>Niedrige Effizienz</li>
</ul>

<h3>3. Automatische Nachweisführung</h3>
<p>Alle für die <strong>BAFA-Förderung</strong> erforderlichen Daten werden automatisch gespeichert:</p>
<ul>
<li>Stromerzeugung (KWK)</li>
<li>Eigenverbrauch vs. Einspeisung</li>
<li>Wärmeerzeugung</li>
<li>Vollbenutzungsstunden</li>
<li>Wirkungsgrade</li>
</ul>

<h3>4. Predictive Maintenance</h3>
<p>Durch <strong>KI-gestützte Analyse</strong> erkennen wir Verschleiß frühzeitig:</p>
<ul>
<li>Wartung wird <strong>proaktiv</strong> geplant (statt reaktiv)</li>
<li>Ausfälle werden <strong>vermieden</strong></li>
<li>Lebensdauer der Anlage wird <strong>maximiert</strong></li>
</ul>

<h2>Praxisbeispiel: Hotel mit 60 Zimmern</h2>

<h3>Situation vor Monitoring</h3>
<ul>
<li>Generator lief mit <strong>reduzierter Effizienz</strong> (Rücklauftemperatur zu hoch)</li>
<li>Wärmepumpe schaltete zu selten ein → <strong>verschenktes Potenzial</strong></li>
<li>Ausfall blieb 3 Tage unbemerkt → <strong>Förderausfall: 1.200 €</strong></li>
</ul>

<h3>Nach Monitoring-Einführung</h3>
<ul>
<li><strong>Effizienz um 12% gesteigert</strong> durch Optimierung der Rücklauftemperatur</li>
<li><strong>Ausfälle innerhalb 2 Stunden behoben</strong> (Alarmierung + Fernwartung)</li>
<li><strong>Fördererlöse um 8% erhöht</strong> durch optimierte Betriebsführung</li>
<li><strong>Wartungskosten um 15% gesenkt</strong> durch Predictive Maintenance</li>
</ul>

<h2>Monitoring-Pakete</h2>

<h3>Basic (inkl. bei Contracting)</h3>
<ul>
<li>Realtime-Dashboard</li>
<li>Automatische Alarmierung</li>
<li>Monatlicher Report</li>
</ul>

<h3>Pro (empfohlen)</h3>
<ul>
<li>Alles aus Basic</li>
<li>Predictive Maintenance</li>
<li>Fernwartung</li>
<li>Quartalsweise Optimierung</li>
</ul>

<h3>Premium</h3>
<ul>
<li>Alles aus Pro</li>
<li>Dedizierter Ansprechpartner</li>
<li>24/7-Hotline</li>
<li>Performance-Garantie</li>
</ul>

<h2>Nächste Schritte</h2>

<p><strong>1. Demo-Dashboard ansehen:</strong> <a href="index.html#contact-section" style="color:#ff914d;">Termin vereinbaren</a></p>
<p><strong>2. Monitoring-Paket wählen:</strong> <a href="funnel.html" style="color:#ff914d;">Kurzcheck starten</a></p>

<hr style="margin:2rem 0; border:none; border-top:1px solid rgba(255,255,255,0.1);">

<p style="font-size:0.9rem; color:rgba(245,243,240,0.7);"><em>Quellen:</em></p>
<ul style="font-size:0.9rem; color:rgba(245,243,240,0.7);">
<li><a href="https://www.dena.de/" target="_blank" rel="noopener" style="color:#2ed5d2;">dena – Monitoring-Leitfaden</a></li>
</ul>`,
        tags: ["Technik", "Praxis", "Service"],
        cover: "images/blog/blog-betrieb-wartung.svg",
        authorName: "Fuchs Team",
        authorTitle: "Monitoring & Service",
        seoTitle: "Fuchs live Monitoring: Realtime-Überwachung für ThermoHybrid | Fuchs",
        seoDescription: "Fuchs live Monitoring: Realtime-Dashboard, automatische Alarmierung, Predictive Maintenance und BAFA-Nachweisführung. Maximale Verfügbarkeit und Effizienz für Ihre ThermoHybrid-Anlage."
    },
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
        content: "<h2>Grundsätze der Dimensionierung</h2><ul><li><strong>Grundlast</strong> statt Spitzen: KWK deckt den konstanten Wärmebedarf.</li><li><strong>Vollbenutzungsstunden</strong> maximieren (typisch >4.000–5.000 h/a).</li><li><strong>Pufferspeicher</strong> verringern Starts und glätten Laufzeiten.</li></ul><h3>Vorgehen in 5 Schritten</h3><ol><li>Reale Lastgänge (Wärme/Strom) erfassen und auswerten</li><li>KWK‑Leistung aus Grundlast ableiten</li><li>Puffergröße so wählen, dass <strong>längere Laufzeiten</strong> pro Start möglich sind</li><li>Hydraulik mit niedrigen Rückläufen für <strong>Brennwertnutzung</strong> auslegen</li><li>Regelstrategie definieren (Start/Stop, Prioritäten, Wärmevorrang)</li></ol><h3>Hinweis</h3><p>Jede Liegenschaft ist individuell – ohne reale Daten drohen Fehlgrößen. Messung schlägt Schätzung.</p><p><em>Quelle:</em> <a href='https://www.dena.de/' target='_blank' rel='noopener'>dena – Leitfaden KWK</a></p>",
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
        content: "<h2>Warum Hotels prädestiniert sind</h2><p>Hohe Grundlast durch Warmwasser, Küche, Lüftung und oft ganzjährige Belegung. Damit sind viele Vollbenutzungsstunden realistisch.</p><h3>Projektablauf</h3><ol><li><strong>Datenaufnahme:</strong> Wärme‑/Stromlastgänge, Temperaturen, Laufzeiten</li><li><strong>Auslegung:</strong> KWK‑Leistung aus Grundlast, Puffer, Hydraulik</li><li><strong>Messkonzept:</strong> Eigenstrom, Dritte, Abrechnung</li><li><strong>Umsetzung:</strong> Bau, Inbetriebnahme, Dokumentation</li><li><strong>Monitoring:</strong> Laufzeiten, Effizienz, Optimierung</li></ol><h3>Stolpersteine</h3><ul><li>Schätzungen statt realer Daten → <strong>Fehlgrößen</strong></li><li>Zu kleiner Puffer → viele Starts, hoher Verschleiß</li><li>Ungünstige Rückläufe → verschenkter Brennwerteffekt</li></ul><p><em>Quelle:</em> <a href='https://www.dena.de/' target='_blank' rel='noopener'>dena</a></p>",
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

function getAllPosts() {
  const stored = getStoredPosts();
  const supaCached = getSupabaseCached();
  const map = new Map();
  for (const p of blogPosts) map.set(p.slug, p);
  for (const p of supaCached) map.set(p.slug, Object.assign({}, map.get(p.slug) || {}, p));
  for (const p of stored) map.set(p.slug, Object.assign({}, map.get(p.slug) || {}, p));
  const all = Array.from(map.values());
  return all.sort((a,b) => new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01'));
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
  const loadMoreBtn = document.getElementById('blog-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = (state.visible < posts.length) ? 'inline-flex' : 'none';
    loadMoreBtn.onclick = () => { state.visible = Math.min(posts.length, state.visible + VISIBLE_STEP); renderBlogList._state = state; renderBlogList(posts); };
  }
  listEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const card = target.closest('[data-slug]');
    const slug = card ? card.getAttribute('data-slug') : null;
    if (slug) location.hash = '#blog/' + slug;
  });
}

function renderBlogDetail(post) {
  const listEl = document.getElementById('blog-list');
  const detailEl = document.getElementById('blog-detail');
  if (!listEl || !detailEl || !post) return;
  listEl.innerHTML = '';
  detailEl.classList.remove('hidden');
  (function applyPostSEO(p){
    try {
      const title = (p.seoTitle || p.title || 'Blog') + ' | Fuchs';
      document.title = title;
      const desc = (p.seoDescription || p.excerpt || '').toString().trim().slice(0, 160);
      function upsertMeta(selector, attrs) {
        let el = document.head.querySelector(selector);
        if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
        Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
        return el;
      }
      upsertMeta('meta[name="description"]', { name: 'description', content: desc });
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: p.title || '' });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: desc });
      upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
      if (p.cover) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: p.cover });
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
      link.setAttribute('href', location.href);
      const ld = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": p.title, "description": desc, "datePublished": p.date,
        "author": { "@type": "Person", "name": p.authorName || "Fuchs Team" },
        "image": p.cover ? [p.cover] : undefined, "mainEntityOfPage": location.href
      };
      let jsonEl = document.getElementById('post-jsonld');
      if (!jsonEl) { jsonEl = document.createElement('script'); jsonEl.id = 'post-jsonld'; jsonEl.type = 'application/ld+json'; document.head.appendChild(jsonEl); }
      jsonEl.textContent = JSON.stringify(ld);
    } catch (_) {}
  })(post);
  const categoryTags = (post.tags || []).filter(t => ['Wirtschaftlichkeit','Förderung','Technik','Praxis','Recht','Nachhaltigkeit','Grundlagen'].includes(t));
  const firstCategory = categoryTags.length > 0 ? categoryTags[0] : '';
  detailEl.innerHTML = '' +
    '<article class="blog-article">' +
      (firstCategory ? '<div class="detail-category-tag">' + firstCategory + '</div>' : '') +
      '<h1 class="detail-title">' + post.title + '</h1>' +
      '<div class="detail-meta-grid">' +
        '<div class="detail-meta-col"><span class="meta-label">Datum</span><span class="meta-value">' + formatDateISOToDE(post.date) + '</span></div>' +
        '<div class="detail-meta-col"><span class="meta-label">Autor</span><span class="meta-value">' + (post.authorName || 'Fuchs Team') + '</span></div>' +
        '<div class="detail-meta-col"><span class="meta-label">Lesezeit</span><span class="meta-value">5 min</span></div>' +
      '</div>' +
      '<div class="blog-detail-cover"><img src="' + (post.cover || 'images/Hero.webp') + '" alt="' + post.title.replace(/"/g, '&quot;') + '" onerror="this.onerror=null; this.src=\'images/Hero.webp\';"></div>' +
      '<div class="detail-body">' + sanitizeHtml(post.content) + '</div>' +
    '</article>' +
    '<div class="related-section"><h2 class="heading-xl">Verwandte Beiträge</h2><div class="related-posts" id="related-posts"></div></div>';
  const relatedPosts = getAllPosts().filter(p => p.slug !== post.slug).slice(0, 2);
  const relatedEl = document.getElementById('related-posts');
  if (relatedEl && relatedPosts.length > 0) {
    relatedEl.innerHTML = relatedPosts.map(p => (
      '<article class="blog-card" data-slug="' + p.slug + '">' +
        '<div class="blog-cover"><img src="' + (p.cover || 'images/Hero.webp') + '" alt="' + p.title.replace(/"/g, '&quot;') + '" onerror="this.onerror=null; this.src=\'images/Hero.webp\';"></div>' +
        '<div class="blog-content"><h3 class="heading-lg">' + p.title + '</h3><p class="byline">' + ((p.authorName || '') + ', ' + (p.authorTitle || '') + ' — ' + formatDateISOToDE(p.date)) + '</p><p class="text-content">' + p.excerpt + '</p></div>' +
      '</article>'
    )).join('');
    relatedEl.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const card = target.closest('[data-slug]');
      const slug = card ? card.getAttribute('data-slug') : null;
      if (slug) location.hash = '#blog/' + slug;
    });
  }
}
function getPostBySlug(slug) { return getAllPosts().find(p => p.slug === slug); }
function handleBlogNavigationFromHash() {
  const hash = location.hash || '';
  if (!hash.startsWith('#blog')) return;
  const parts = hash.split('/');
  const slug = parts.length > 1 ? parts[1] : '';
  if (slug) {
    const post = getPostBySlug(slug);
    if (post) { renderBlogDetail(post); scrollIntoViewSmooth('blog'); }
    else { renderBlogList(getAllPosts()); scrollIntoViewSmooth('blog'); }
  } else { renderBlogList(getAllPosts()); scrollIntoViewSmooth('blog'); }
}
function initBlog() {
  renderBlogList(getAllPosts());
  getSupabaseClient().then(client => {
    if (!client) return;
    fetchSupabasePosts().then(() => {
      if ((location.hash || '').startsWith('#blog/')) handleBlogNavigationFromHash();
      else renderBlogList(getAllPosts());
    });
  });
  const listEl = document.getElementById('blog-list');
  const searchEl = document.getElementById('blog-search');
  const filtersEl = document.getElementById('blog-filters');
  const clearBtn = document.getElementById('filter-clear');
  let activeTags = new Set();
  function applyFilters() {
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    let posts = getAllPosts();
    if (activeTags.size > 0) posts = posts.filter(p => (p.tags || []).some(t => activeTags.has(t)));
    if (q) posts = posts.filter(p =>
      p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
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
          activeTags.clear();
          filtersEl.querySelectorAll('.filter-chip').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
          target.classList.add('active'); target.setAttribute('aria-pressed','true');
        } else {
          const isActive = target.classList.toggle('active');
          target.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          if (isActive) activeTags.add(tag); else activeTags.delete(tag);
          const allBtn = filtersEl.querySelector('.filter-chip[data-tag="All"]');
          if (allBtn) { allBtn.classList.remove('active'); allBtn.setAttribute('aria-pressed','false'); }
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
  if (searchEl) searchEl.addEventListener('input', applyFilters);
  window.addEventListener('hashchange', handleBlogNavigationFromHash);
  if ((location.hash || '').startsWith('#blog')) handleBlogNavigationFromHash();
}
document.addEventListener('DOMContentLoaded', async () => {
  await loadDOMPurify();
  initBlog();
});


