/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — content layer
   Every entry below comes from the supplied company information or from
   smartindia.digital. Nothing here is invented.
   ══════════════════════════════════════════════════════════════════════════ */
window.SI = (function () {
  'use strict';

  /* ── brand tokens, read off the logo and weighted for paper ───────────── */
  const BRAND = {
    goldHi: '#8A5A12',
    gold: '#A9761F',
    goldMid: '#C08A34',
    goldDeep: '#5A360D',
    saffron: '#F08221',
    green: '#138808',
    navy: '#1B3A8F',
    navyLit: '#2E4FB0',
    ink: '#14181F',
    paper: '#F7F4EC'
  };

  /* ── categories ───────────────────────────────────────────────────────── */
  const CATS = {
    dynamic: 'Dynamic Website',
    ecom: 'E-Commerce',
    multi: 'Multi-Vendor',
    web: 'Web Platform'
  };

  /* ── services (IT solutions only — marketing lines intentionally omitted) ─ */
  const SERVICES = [
    {
      no: '01',
      title: 'Web Development',
      copy: 'Custom, responsive, high-performance websites tailored to your business needs and user experience.',
      tags: ['Dynamic websites', 'CMS-driven', 'Responsive', 'Performance'],
      icon: 'window'
    },
    {
      no: '02',
      title: 'App Development',
      copy: 'Powerful and intuitive mobile applications for iOS and Android that provide seamless user journeys.',
      tags: ['iOS', 'Android', 'Cross-platform'],
      icon: 'device'
    },
    {
      no: '03',
      title: 'E-Commerce Development',
      copy: 'Complete online stores with catalogue, cart, checkout and order management — the engine behind dozens of live retail brands we run.',
      tags: ['Catalogue', 'Checkout', 'Orders', 'Payments'],
      icon: 'cart'
    },
    {
      no: '04',
      title: 'Multi-Vendor Marketplaces',
      copy: 'Marketplace platforms where many sellers operate under one roof, each with their own storefront, inventory and settlement.',
      tags: ['Seller portals', 'Inventory', 'Settlements'],
      icon: 'grid'
    },
    {
      no: '05',
      title: 'CMS &amp; Content Platforms',
      copy: 'Our own content management system powers the platforms we deliver, so clients can edit their site without touching code.',
      tags: ['SmartIndia CMS', 'Roles', 'Media library'],
      icon: 'layers'
    },
    {
      no: '06',
      title: 'UI / UX &amp; Visual Design',
      copy: 'Creative logos, visual identities and interfaces that capture a brand&rsquo;s essence and make products clear to use.',
      tags: ['Identity', 'Interface', 'Design systems'],
      icon: 'pen'
    },
    {
      no: '07',
      title: 'AI Search &amp; Discovery',
      copy: 'The capability at the centre of SmartIndia.ai — AI-powered search and intelligent information discovery, built to be embedded into real products.',
      tags: ['AI search', 'Discovery', 'Web exploration', 'Intelligent UX'],
      icon: 'chakra'
    }
  ];

  /* ── why us (verbatim from supplied copy) ─────────────────────────────── */
  const WHY = [
    { t: 'AI First', p: 'Built around artificial intelligence to create smarter digital experiences.' },
    { t: 'Simple &amp; Accessible', p: 'Technology designed to be easy to understand and use.' },
    { t: 'Information Focused', p: 'Helping users explore and discover information more efficiently.' },
    { t: 'Innovation Driven', p: 'Focused on developing new ways to connect people with technology.' },
    { t: 'Built for the Future', p: 'Creating an evolving platform for the growing AI-powered digital ecosystem.' }
  ];

  /* ── delivery process (from smartindia.digital) ───────────────────────── */
  const STEPS = [
    { t: 'Tailored Solutions', p: 'We start from what the business actually needs, not from a template.' },
    { t: 'Project Planning', p: 'Scope, structure and milestones agreed before a line of code is written.' },
    { t: 'Content Creation', p: 'Structure, copy and assets prepared so the platform launches complete.' },
    { t: 'Seamless Execution', p: 'Build, test and go live — then keep the platform running.' }
  ];

  /* ── capability columns ───────────────────────────────────────────────── */
  const CAPS = {
    build: ['Responsive web development', 'Dynamic website platforms', 'iOS &amp; Android applications', 'UI / UX design', 'Visual identity &amp; graphics'],
    commerce: ['E-commerce storefronts', 'Multi-vendor marketplaces', 'Catalogue &amp; inventory', 'Cart, checkout &amp; orders', 'Seller management'],
    ai: ['AI-powered search', 'Smart information discovery', 'AI &amp; web exploration', 'Intelligent user experience', 'Continuous R&amp;D'],
    ops: ['SmartIndia CMS', 'Domain &amp; hosting setup', 'Ongoing maintenance', 'Content updates', 'Mon&ndash;Sat support, 8:00&ndash;18:30 IST']
  };

  /* ── contact ──────────────────────────────────────────────────────────── */
  const CONTACT = {
    email: 'info@smartindia.ai',
    phone: '+91 99949 00470',
    phoneHref: '+919994900470',
    /* wa.me wants the number bare: country code, no +, no spaces */
    whatsapp: '919994900470',
    address: ['Arun Towers, MR Nagar', 'K N P Colony, Karatangadu', 'Tiruppur, Tamil Nadu 641604', 'India']
  };

  /* ══════════════════════════════════════════════════════════════════════
     LIVE PLATFORMS
     ══════════════════════════════════════════════════════════════════════ */
  const P = (n, d, c) => ({ n: n, d: d, c: c });

  const DYNAMIC = [
    P('Bhala Care Services', 'bhalacareservices.in', 'dynamic'),
    P('Big Experts', 'bigexperts.in', 'dynamic'),
    P('GNSWA', 'gnswa.in', 'dynamic'),
    P('Gupta Anish Associates', 'guptaanishassociates.in', 'dynamic'),
    P('Deal Confirm', 'dealconfirm.com', 'dynamic'),
    P('Home Art Interiors', 'homeartinteriors.in', 'dynamic'),
    P('Gyan Computer Institute', 'gyancomputerinstitute.com', 'dynamic'),
    P('Krishna Health Mix', 'krishnahealthmix.in', 'dynamic'),
    P('Mitashen Enterprises and Solutions', 'mitashenterprisesandsolutions.in', 'dynamic'),
    P('NK Exports', 'nkexports.in', 'dynamic'),
    P('Seven Dose Studio', 'sevendosestudio.in', 'dynamic'),
    P('Shree Ram Ebikes', 'shreeramebikes.in', 'dynamic'),
    P('SVS Future Power', 'svsfuturepower.in', 'dynamic'),
    P('Rajkot Taxi Services', 'rajkottaxiservices.com', 'dynamic'),
    P('Aval Makeovers', 'avalmakeovers.in', 'dynamic'),
    P('Diora Spa', 'dioraspa.in', 'dynamic'),
    P('Galdia', 'galdia.in', 'dynamic'),
    P('Frontiora Global', 'frontioraglobal.com', 'dynamic'),
    P('Intellaris Exhibition', 'intellarisexhibition.com', 'dynamic'),
    P('Upgrade Educational Consultancy', 'upgradeeducationalconsultancy.in', 'dynamic'),
    P('Royal Properties', 'royalpropertiess.com', 'dynamic'),
    P('Solution Path', 'solutionpath.in', 'dynamic'),
    P('Transcova', 'transcova.com', 'dynamic'),
    P('Naitri Pharma', 'naitripharma.com', 'dynamic'),
    P('Stayzia Resort', 'stayzia.in', 'dynamic'),
    P('XYOS AI', 'xyosai.in', 'dynamic'),
    P('Ambisphere Publishers', 'ambispherepublishers.com', 'dynamic'),
    P('Ludo King Vibes', 'ludokingvibes.com', 'dynamic'),
    P('AQWA Crown', 'aqwacrown.com', 'dynamic'),
    P('Vishaha Groups', 'vishahagroups.com', 'dynamic'),
    P('Preach Designs', 'preachdesignsco.com', 'dynamic'),
    P('Magic Himalayan Cottage Pahalgam', 'magichimalayancottagepahalgam.com', 'dynamic'),
    P('Tejasvini Ayurveda', 'tejasviniayurveda.com', 'dynamic'),
    P('Venture Harvest Holding', 'ventureharvestholding.com', 'dynamic'),
    P('Furniture Interior Design', 'furnitureinteriordesign.com', 'dynamic'),
    P('Ventra International', 'ventrainternational.com', 'dynamic'),
    P('Mahamaya Clothes Online Boutique', 'mahamayaclothesonlineboutique.com', 'dynamic'),
    P('Singh Cargo Logistics', 'singhcargologistics.com', 'dynamic'),
    P('Karunya Daya Charitable Trust', 'karunyadayacharitabletrust.com', 'dynamic'),
    P('Silus Naturals', 'silusnatural.com', 'dynamic'),
    P('Kress Cosmetics', 'kresscosmetics.com', 'dynamic'),
    P('YouTubers and Digital Creators Association', 'youtubersanddigitalcreatorsassociation.com', 'dynamic'),
    P('Zivaa Design Studio', 'zivaadesignstudio.com', 'dynamic'),
    P('Areca Treks and Tours', 'arecatour.com', 'dynamic'),
    P('ARNHKV Enterprises', 'arnhkventerprises.com', 'dynamic'),
    P('Digitrax Technologies', 'digitraxtechnologies.com', 'dynamic'),
    P('Shri Lakshmi Yammal Finance', 'shrilakshmiyammalfinance.com', 'dynamic'),
    P('Gosai Art Export', 'gosaiartexport.com', 'dynamic'),
    P('Mindgo Travel', 'mindgotravel.in', 'dynamic'),
    P('Policy with GPS', 'policywithgps.com', 'dynamic'),
    P('Green Exhibition', 'greenexhibition.in', 'dynamic')
  ];

  const ECOM = [
    P('Paakhi Jewels', 'paakhijewels.com', 'ecom'),
    P('Rakhi Verma Designers', 'rakhivermadesigners.com', 'ecom'),
    P('Tara Naturals', 'taranaturals.in', 'ecom'),
    P('Theera Books', 'theerabooks.com', 'ecom'),
    P('Ambika Divine Essence', 'ambikadivineessence.com', 'ecom'),
    P('Sri Annamalaiyar Mill', 'sriannamalaiyarmill.com', 'ecom'),
    P('Threads N Harmony', 'threadsnharmony.com', 'ecom'),
    P('Englady', 'englady.com', 'ecom'),
    P('eShelf', 'eshelf.in', 'ecom'),
    P('FNV Farm', 'fnvfarm.com', 'ecom'),
    P('InWrapped', 'inwrapped.in', 'ecom'),
    P('India Tour Wale', 'indiatourwale.com', 'ecom'),
    P('KAS Official', 'kasofficial.in', 'ecom'),
    P('NS Fashion House', 'nsfashionhouse.com', 'ecom'),
    P('Puja Samagri', 'pujasamagrii.com', 'ecom'),
    P('Ritika Electric', 'ritikaelectric.com', 'ecom'),
    P('S7 Millet Co', 's7milletco.com', 'ecom'),
    P('Uniforms Guru', 'uniformsguru.com', 'ecom'),
    P('Valley Heal', 'valleyheal.com', 'ecom'),
    P('Mugizh Clothings', 'mugizhclothings.com', 'ecom'),
    P('Vinayak Brands', 'vinayakbrands.com', 'ecom'),
    P('Ongole Towing Service', 'ongoletowingservice.site', 'ecom'),
    P('Coimbatore A to Z Carpet &amp; Wallpaper', 'coimbatoreatozcarpetwallpaper.com', 'ecom'),
    P('Pugal Tourism Travels', 'pugaltourismtravels.com', 'ecom'),
    P('DineNest', 'dinenest.shop', 'ecom'),
    P('Ecom Bazar', 'ecombazarshop.in', 'ecom'),
    P('Bendito Group', 'benditogroup.co.in', 'ecom'),
    P('Minisakhi', 'minisakhi.com', 'ecom'),
    P('Shree Divyam', 'shreedivyam.com', 'ecom'),
    P('ZMZ Publication', 'zmzpublication.in', 'ecom'),
    P('YUNGSTR Club', 'yungstrclub.com', 'ecom'),
    P('Imgoat', 'imgoat.in', 'ecom'),
    P('JV Aluminium', 'jvaluminium.in', 'ecom'),
    P('Accessories Zone', 'accessorieszone.co.in', 'ecom')
  ];

  const MULTI = [
    P('Aadees', 'aadees.com', 'multi'),
    P('Sakar Sankalp Foundation', 'sakarsankalpfoundation.org', 'multi')
  ];

  const WEB = [
    P('A B Khan &amp; Associates', 'abkhanassociates.com', 'web'),
    P('Abundance SAP', 'abundancesap.com', 'web'),
    P('Adnan Oud House', 'adnanoudhouse.com', 'web'),
    P('AG Green Shakti', 'aggreenshakti.com', 'web'),
    P('Ajju Mobile Care', 'ajjumobile.in', 'web'),
    P('American Commonwealth Union', 'americancommonwealthunion.com', 'web'),
    P('APN Global Foundation', 'apnglobalfoundation.com', 'web'),
    P('Arowin Lubricants', 'arowinlubricants.com', 'web'),
    P('Arya Vysya Nitya Anna Satram', 'aryavns.com', 'web'),
    P('Astrojewell', 'astrojewell.com', 'web'),
    P('Avi Boss', 'aviboss.com', 'web'),
    P('Avnee Collections', 'avneecollections.com', 'web'),
    P('Balaji Ecom', 'balajiecom.in', 'web'),
    P('Basava Ayurvedaa', 'basavaayurvedaa.com', 'web'),
    P('Best Dream Care', 'bestdreamcare.shop', 'web'),
    P('Bineeta Collection', 'bineetacollection.com', 'web'),
    P('BMCI Bricks', 'bmcibricks.in', 'web'),
    P('Cirnix', 'cirnix.com', 'web'),
    P('CITEC India', 'citecindia.com', 'web'),
    P('Coskind Store', 'coskindstore.com', 'web'),
    P('Darul Ifta Deoband', 'deoband.online', 'web'),
    P('Dr. Neha Skin and Laser', 'drnehaskinandlaser.com', 'web'),
    P('DYMO Tools', 'dymotools.com', 'web'),
    P('FoldiMax', 'foldimax.com', 'web'),
    P('IPPEO', 'ippeo.in', 'web'),
    P('ISH-U Synergy', 'ishusynergy.com', 'web'),
    P('Jumki Store', 'jumkistore.com', 'web'),
    P('JustPath', 'justpath.co.in', 'web'),
    P('Lakshmi Varaha Astrology', 'lakshmivarahaastrology.com', 'web'),
    P('Lofent India Life', 'lofentindialife.in', 'web'),
    P('LS Bangles', 'lsbangles.com', 'web'),
    P('Miracle Global Ventures', 'miracleglobalventures.com', 'web'),
    P('OMHUK', 'omhuk.com', 'web'),
    P('Petaura', 'petaura.co.in', 'web'),
    P('RDC Brothers', 'rdcbrothers.in', 'web'),
    P('Rebyln', 'rebyln.com', 'web'),
    P('Shivaha Travel', 'shivahatravel.in', 'web'),
    P('SkillU Studios', 'skillustudios.in', 'web'),
    P('Smart India CMS', 'cms.smartindia.ai', 'web'),
    P('Smart India Digital', 'smartindia.digital', 'web'),
    P('Spectssavers', 'spectssavers.com', 'web'),
    P('Sri Sai Oils', 'srisaioils.in', 'web'),
    P('Unielec', 'unielec.online', 'web'),
    P('Vedas Fashion', 'vedasfashion.com', 'web'),
    P('ZIRAS', 'ziras.in', 'web')
  ];

  const PLATFORMS = DYNAMIC.concat(ECOM, MULTI, WEB);

  /* featured on the horizontal rail — a spread across all four categories */
  const FEATURED = [
    'aadees.com', 'paakhijewels.com', 'dealconfirm.com', 'stayzia.in',
    'sakarsankalpfoundation.org', 'transcova.com', 'taranaturals.in',
    'magichimalayancottagepahalgam.com', 'cms.smartindia.ai', 'nkexports.in',
    'englady.com', 'digitraxtechnologies.com'
  ].map(function (dom) {
    return PLATFORMS.find(function (p) { return p.d === dom; });
  }).filter(Boolean);

  /* Colour pairs cycled through the rail cards — brand hues only, mixed as
     pale washes so the dark monogram sitting on top stays the loudest thing
     on the card. */
  const CARD_TINTS = [
    ['rgba(220,168,71,.42)', 'rgba(46,79,176,.24)'],
    ['rgba(240,130,33,.34)', 'rgba(176,124,32,.30)'],
    ['rgba(19,136,8,.24)', 'rgba(220,168,71,.34)'],
    ['rgba(46,79,176,.26)', 'rgba(240,130,33,.28)']
  ];

  /* initials for the generated monogram tiles */
  function monogram(name) {
    const clean = name.replace(/&amp;|&rsquo;|&ndash;/g, ' ')
      .replace(/[^A-Za-z0-9 ]/g, ' ')
      .trim().split(/\s+/);
    const skip = { and: 1, the: 1, of: 1, for: 1, a: 1, an: 1 };
    const words = clean.filter(function (w) { return !skip[w.toLowerCase()]; });
    if (!words.length) return '••';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return {
    BRAND: BRAND,
    CATS: CATS,
    SERVICES: SERVICES,
    WHY: WHY,
    STEPS: STEPS,
    CAPS: CAPS,
    CONTACT: CONTACT,
    PLATFORMS: PLATFORMS,
    FEATURED: FEATURED,
    CARD_TINTS: CARD_TINTS,
    counts: {
      total: PLATFORMS.length,
      dynamic: DYNAMIC.length,
      ecom: ECOM.length,
      multi: MULTI.length,
      web: WEB.length
    },
    monogram: monogram
  };
})();
