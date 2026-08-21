/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — admin panel
   ──────────────────────────────────────────────────────────────────────────
   One schema, one renderer. Every collection on the site is described in
   SCHEMA below and the same list-and-form code draws all of them, so adding a
   field to the portfolio is a line here rather than a new screen — and no
   section can quietly end up with a worse editor than its neighbours.

   The whole site is saved as a single document. A publish is therefore atomic:
   it either all lands or none of it does, and there is no state where the page
   is half-updated. `baseUpdatedAt` is sent with every save so a second tab
   cannot silently overwrite the first.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var CATS = ['ecom', 'multi', 'dynamic', 'web'];

  /* ── what the site is made of ───────────────────────────────────────────
     key      the key in the stored document
     from     the window.SI key it seeds from when nothing is published yet
     title    what shows in the sidebar
     name     which field labels a collapsed row
     fields   k=key, t=type, l=label, o=options, h=hint                    */
  var SCHEMA = [
    { key: 'enquiries', title: 'Enquiries', kind: 'inbox',
      note: 'Every enquiry submitted through the site’s form. These are kept in addition to the WhatsApp handoff, not instead of it.' },

    { key: 'portfolio', from: 'PORTFOLIO', title: 'Portfolio', kind: 'list', name: 'n',
      note: 'The curated set the Portfolio section leads with. Each card looks for assets/portfolio/<first label of the domain>.jpg — paakhijewels.com finds paakhijewels.jpg. A missing image falls back to the monogram plate, so a card is never a broken frame.',
      fields: [
        { k: 'n', t: 'text', l: 'Name' },
        { k: 'd', t: 'text', l: 'Domain', h: 'No https:// and no trailing slash' },
        { k: 'c', t: 'select', l: 'Category', o: CATS },
        { k: 'u', t: 'text', l: 'Deep link', h: 'Optional. Opens somewhere other than the front page.' },
        { k: 'img', t: 'text', l: 'Image name', h: 'Optional. Overrides the name worked out from the domain.' },
        { k: 'p', t: 'textarea', l: 'Description' }
      ] },

    { key: 'platforms', from: 'PLATFORMS', title: 'All platforms', kind: 'list', name: 'n',
      note: 'The full index, and the source of every platform count on the page — the stats are computed from this list, so they cannot drift from it.',
      fields: [
        { k: 'n', t: 'text', l: 'Name' },
        { k: 'd', t: 'text', l: 'Domain' },
        { k: 'c', t: 'select', l: 'Category', o: CATS }
      ] },

    { key: 'reviews', from: 'REVIEWS', title: 'Reviews', kind: 'list', name: 'n',
      note: 'Transcribed from the Google Business Profile. These are real people’s public words: reproduce them exactly, and do not tidy anyone’s spelling or shorten a quote.',
      fields: [
        { k: 'n', t: 'text', l: 'Name, exactly as posted' },
        { k: 's', t: 'number', l: 'Stars', h: '1 to 5' },
        { k: 'q', t: 'textarea', l: 'Review, exactly as posted' }
      ] },

    { key: 'vendors', from: 'VENDORS', title: 'Vendors', kind: 'list', name: 'n',
      note: 'Still placeholder content on the live site until these are replaced with real suppliers.',
      fields: [
        { k: 'n', t: 'text', l: 'Name' },
        { k: 'c', t: 'text', l: 'What they supply' },
        { k: 'm', t: 'text', l: 'Relationship', h: 'e.g. Partner since 2023' },
        { k: 'd', t: 'text', l: 'Domain', h: 'Optional. Without one the card is not a link.' },
        { k: 'p', t: 'textarea', l: 'Description' }
      ] },

    { key: 'services', from: 'SERVICES', title: 'Solutions', kind: 'list', name: 'title',
      fields: [
        { k: 'no', t: 'text', l: 'Number', h: 'e.g. 01' },
        { k: 'title', t: 'text', l: 'Title' },
        { k: 'icon', t: 'text', l: 'Icon', h: 'window, device, cart, shop, search, sparkle, gear, shield' },
        { k: 'copy', t: 'textarea', l: 'Description' },
        { k: 'tags', t: 'taglist', l: 'Tags' }
      ] },

    { key: 'why', from: 'WHY', title: 'Why Us', kind: 'list', name: 't',
      fields: [
        { k: 't', t: 'text', l: 'Title' },
        { k: 'p', t: 'textarea', l: 'Description' }
      ] },

    { key: 'steps', from: 'STEPS', title: 'Process', kind: 'list', name: 't',
      fields: [
        { k: 't', t: 'text', l: 'Title' },
        { k: 'p', t: 'textarea', l: 'Description' }
      ] },

    { key: 'caps', from: 'CAPS', title: 'Capabilities', kind: 'object',
      note: 'Four columns of bullet points.',
      fields: [
        { k: 'build', t: 'taglist', l: 'Build' },
        { k: 'commerce', t: 'taglist', l: 'Commerce' },
        { k: 'ai', t: 'taglist', l: 'AI' },
        { k: 'ops', t: 'taglist', l: 'Operations' }
      ] },

    { key: 'contact', from: 'CONTACT', title: 'Contact', kind: 'object',
      fields: [
        { k: 'email', t: 'text', l: 'Email' },
        { k: 'phone', t: 'text', l: 'Phone, as displayed' },
        { k: 'phoneHref', t: 'text', l: 'Phone for tel: links', h: 'e.g. +919994900470' },
        { k: 'whatsapp', t: 'text', l: 'WhatsApp number', h: 'Country code, no + and no spaces' },
        { k: 'address', t: 'taglist', l: 'Address', h: 'One line per row' }
      ] },

    { key: 'cats', from: 'CATS', title: 'Category labels', kind: 'object',
      note: 'What each category is called wherever it is shown. The keys themselves are fixed.',
      fields: [
        { k: 'ecom', t: 'text', l: 'ecom' },
        { k: 'multi', t: 'text', l: 'multi' },
        { k: 'dynamic', t: 'text', l: 'dynamic' },
        { k: 'web', t: 'text', l: 'web' }
      ] }
  ];

  var state = {
    doc: {},
    baseUpdatedAt: null,
    dirty: false,
    view: 'enquiries',
    enquiries: [],
    open: {}
  };

  /* ── plumbing ───────────────────────────────────────────────────────── */
  function api(path, options) {
    var opt = options || {};
    opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
    opt.credentials = 'same-origin';
    if (opt.body && typeof opt.body !== 'string') opt.body = JSON.stringify(opt.body);
    return fetch(path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, ok: r.ok, body: j };
      });
    });
  }

  function flash(msg, kind) {
    var el = $('#flash');
    el.textContent = msg;
    el.className = 'flash ' + (kind || '');
    el.hidden = !msg;
    if (kind === 'ok') window.setTimeout(function () { el.hidden = true; }, 4000);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function markDirty() {
    state.dirty = true;
    $('#stamp').textContent = 'Unpublished changes';
    $('#stamp').className = 'stamp dirty';
  }

  function markClean(stamp) {
    state.dirty = false;
    $('#stamp').className = 'stamp';
    $('#stamp').textContent = stamp
      ? 'Published ' + new Date(stamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Nothing published yet';
  }

  window.addEventListener('beforeunload', function (e) {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ── seed ───────────────────────────────────────────────────────────────
     The stored document wins where it exists; anything it has no opinion on
     falls back to what the site ships with. So a section that has never been
     touched in here still shows its real content, and a first publish cannot
     blank the page. */
  function seed(stored) {
    var doc = {};
    SCHEMA.forEach(function (s) {
      if (!s.from) return;
      var live = window.SI ? window.SI[s.from] : null;
      var saved = stored ? stored[s.key] : null;
      var value = saved != null ? saved : live;
      doc[s.key] = value ? JSON.parse(JSON.stringify(value)) : (s.kind === 'object' ? {} : []);
    });
    if (stored && stored.brand) doc.brand = stored.brand;
    else if (window.SI && window.SI.BRAND) doc.brand = JSON.parse(JSON.stringify(window.SI.BRAND));
    return doc;
  }

  /* ── fields ─────────────────────────────────────────────────────────── */
  function fieldHTML(f, value, path) {
    var id = 'f_' + path.replace(/[^A-Za-z0-9]/g, '_');
    var input;
    if (f.t === 'textarea') {
      input = '<textarea id="' + id + '" data-path="' + esc(path) + '">' + esc(value) + '</textarea>';
    } else if (f.t === 'select') {
      input = '<select id="' + id + '" data-path="' + esc(path) + '">' +
        f.o.map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
    } else if (f.t === 'number') {
      input = '<input type="number" min="1" max="5" step="1" id="' + id + '" data-path="' + esc(path) + '" value="' + esc(value) + '">';
    } else if (f.t === 'taglist') {
      var items = Array.isArray(value) ? value : [];
      input = '<div class="taglist" data-taglist="' + esc(path) + '">' +
        items.map(function (t, i) {
          return '<div class="taglist__item">' +
            '<input type="text" value="' + esc(t) + '" data-path="' + esc(path + '.' + i) + '">' +
            '<button class="btn btn--sm btn--danger" type="button" data-tagdel="' + esc(path + '.' + i) + '">Remove</button>' +
          '</div>';
        }).join('') +
        '<div><button class="btn btn--sm" type="button" data-tagadd="' + esc(path) + '">Add row</button></div>' +
      '</div>';
    } else {
      input = '<input type="text" id="' + id + '" data-path="' + esc(path) + '" value="' + esc(value) + '">';
    }
    return '<div class="field">' +
      '<label for="' + id + '">' + esc(f.l) + '</label>' + input +
      (f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '') +
    '</div>';
  }

  /* dotted paths, so one change handler serves every field on the screen */
  function getAt(path) {
    var bits = path.split('.'), cur = state.doc;
    for (var i = 0; i < bits.length; i++) {
      if (cur == null) return undefined;
      cur = cur[/^\d+$/.test(bits[i]) ? Number(bits[i]) : bits[i]];
    }
    return cur;
  }

  function setAt(path, value) {
    var bits = path.split('.'), cur = state.doc;
    for (var i = 0; i < bits.length - 1; i++) {
      var k = /^\d+$/.test(bits[i]) ? Number(bits[i]) : bits[i];
      if (cur[k] == null) cur[k] = /^\d+$/.test(bits[i + 1]) ? [] : {};
      cur = cur[k];
    }
    var last = bits[bits.length - 1];
    cur[/^\d+$/.test(last) ? Number(last) : last] = value;
  }

  /* ── views ──────────────────────────────────────────────────────────── */
  function renderList(s) {
    var rows = state.doc[s.key] || [];
    var html = (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') + '<div class="rows">';
    rows.forEach(function (row, i) {
      var open = state.open[s.key + ':' + i];
      var name = row[s.name] || '(untitled)';
      var sub = row.d || (row.s ? row.s + ' stars' : '') || '';
      html += '<div class="row">' +
        '<div class="row__head" data-toggle="' + s.key + ':' + i + '">' +
          '<span class="row__grip">' + (i + 1) + '</span>' +
          '<span class="row__name">' + esc(name) + '</span>' +
          '<span class="row__sub">' + esc(sub) + '</span>' +
        '</div>' +
        (open
          ? '<div class="row__body"><div class="grid2">' +
              s.fields.filter(function (f) { return f.t !== 'textarea' && f.t !== 'taglist'; })
                .map(function (f) { return fieldHTML(f, row[f.k] == null ? '' : row[f.k], s.key + '.' + i + '.' + f.k); }).join('') +
            '</div>' +
            s.fields.filter(function (f) { return f.t === 'textarea' || f.t === 'taglist'; })
              .map(function (f) { return fieldHTML(f, row[f.k] == null ? '' : row[f.k], s.key + '.' + i + '.' + f.k); }).join('') +
            '<div class="rowbtns">' +
              '<button class="btn btn--sm" type="button" data-move="' + s.key + ':' + i + ':-1">Move up</button>' +
              '<button class="btn btn--sm" type="button" data-move="' + s.key + ':' + i + ':1">Move down</button>' +
              '<button class="btn btn--sm btn--danger" type="button" data-del="' + s.key + ':' + i + '">Delete</button>' +
            '</div>' +
          '</div>'
          : '') +
      '</div>';
    });
    html += '</div><div class="addbar"><button class="btn" type="button" data-add="' + s.key + '">Add ' + esc(s.title.toLowerCase()) + ' entry</button></div>';
    if (!rows.length) html = (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') +
      '<p class="empty">Nothing here yet.</p><div class="addbar"><button class="btn" type="button" data-add="' + s.key + '">Add entry</button></div>';
    return html;
  }

  function renderObject(s) {
    var obj = state.doc[s.key] || {};
    return (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') +
      '<div class="row"><div class="row__body">' +
        '<div class="grid2">' +
          s.fields.filter(function (f) { return f.t !== 'taglist' && f.t !== 'textarea'; })
            .map(function (f) { return fieldHTML(f, obj[f.k] == null ? '' : obj[f.k], s.key + '.' + f.k); }).join('') +
        '</div>' +
        s.fields.filter(function (f) { return f.t === 'taglist' || f.t === 'textarea'; })
          .map(function (f) { return fieldHTML(f, obj[f.k] == null ? '' : obj[f.k], s.key + '.' + f.k); }).join('') +
      '</div></div>';
  }

  function renderInbox(s) {
    var rows = state.enquiries;
    var head = '<p class="note">' + esc(s.note) + '</p>';
    if (!rows.length) return head + '<p class="empty">No enquiries stored yet.</p>';
    var html = head +
      '<div class="addbar" style="margin:0 0 14px">' +
        '<button class="btn btn--sm" type="button" id="csv-btn">Download CSV</button>' +
        '<button class="btn btn--sm btn--danger" type="button" id="clear-btn">Delete all</button>' +
      '</div><div class="rows">';
    rows.forEach(function (e) {
      var open = state.open['enq:' + e.id];
      html += '<div class="enq' + (e.read ? '' : ' unread') + '">' +
        '<div class="enq__head" data-toggle="enq:' + esc(e.id) + '">' +
          (e.read ? '' : '<span class="enq__dot"></span>') +
          '<span class="enq__who">' + esc(e.name) + '</span>' +
          '<span class="enq__meta">' + esc(e.topic || '') + '</span>' +
          '<span class="enq__meta" style="margin-left:auto">' + esc(e.submittedAt || e.receivedAt || '') + '</span>' +
        '</div>' +
        (open ? '<div class="enq__body">' +
          '<dl>' +
            '<dt>Phone</dt><dd><a href="tel:' + esc(e.phone) + '">' + esc(e.phone) + '</a></dd>' +
            '<dt>Email</dt><dd><a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a></dd>' +
            '<dt>Business</dt><dd>' + esc(e.business) + '</dd>' +
          '</dl>' +
          '<div class="enq__msg">' + esc(e.message) + '</div>' +
          '<div class="rowbtns">' +
            '<a class="btn btn--sm" href="https://wa.me/' + esc(String(e.phone || '').replace(/[^\d]/g, '')) + '" target="_blank" rel="noopener">WhatsApp</a>' +
            '<button class="btn btn--sm" type="button" data-read="' + esc(e.id) + ':' + (e.read ? '0' : '1') + '">Mark ' + (e.read ? 'unread' : 'read') + '</button>' +
            '<button class="btn btn--sm btn--danger" type="button" data-enqdel="' + esc(e.id) + '">Delete</button>' +
          '</div>' +
        '</div>' : '') +
      '</div>';
    });
    return html + '</div>';
  }

  function render() {
    var s = SCHEMA.filter(function (x) { return x.key === state.view; })[0] || SCHEMA[0];
    $('#view-title').textContent = s.title;
    $('#view-note').textContent = s.kind === 'list'
      ? (state.doc[s.key] || []).length + ' ' + (((state.doc[s.key] || []).length === 1) ? 'entry' : 'entries')
      : '';
    $('#save-btn').hidden = s.kind === 'inbox';
    $('#view').innerHTML =
      s.kind === 'inbox' ? renderInbox(s) :
      s.kind === 'object' ? renderObject(s) : renderList(s);
    renderNav();
  }

  function renderNav() {
    $('#side-nav').innerHTML = SCHEMA.map(function (s) {
      var n = s.kind === 'inbox'
        ? state.enquiries.filter(function (e) { return !e.read; }).length
        : (s.kind === 'list' ? (state.doc[s.key] || []).length : '');
      var hot = s.kind === 'inbox' && n > 0;
      return '<button type="button" data-view="' + s.key + '"' +
        (state.view === s.key ? ' aria-current="true"' : '') + '>' +
        '<span>' + esc(s.title) + '</span>' +
        (n !== '' && n !== 0 ? '<span class="count' + (hot ? ' hot' : '') + '">' + n + '</span>' : '') +
      '</button>';
    }).join('');
  }

  /* ── events ─────────────────────────────────────────────────────────── */
  document.addEventListener('input', function (e) {
    var path = e.target.getAttribute && e.target.getAttribute('data-path');
    if (!path) return;
    var v = e.target.value;
    if (e.target.type === 'number') v = Math.max(1, Math.min(5, Number(v) || 5));
    setAt(path, v);
    markDirty();
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-view],[data-toggle],[data-add],[data-del],[data-move],[data-tagadd],[data-tagdel],[data-read],[data-enqdel]') : null;
    if (!t) return;

    var view = t.getAttribute('data-view');
    if (view) { state.view = view; flash(''); render(); return; }

    var toggle = t.getAttribute('data-toggle');
    if (toggle) { state.open[toggle] = !state.open[toggle]; render(); return; }

    var add = t.getAttribute('data-add');
    if (add) {
      var sch = SCHEMA.filter(function (x) { return x.key === add; })[0];
      var blank = {};
      sch.fields.forEach(function (f) { blank[f.k] = f.t === 'taglist' ? [] : (f.t === 'number' ? 5 : ''); });
      if (sch.fields.some(function (f) { return f.k === 'c'; })) blank.c = CATS[0];
      state.doc[add] = (state.doc[add] || []).concat([blank]);
      state.open[add + ':' + (state.doc[add].length - 1)] = true;
      markDirty(); render(); return;
    }

    var del = t.getAttribute('data-del');
    if (del) {
      var db = del.split(':'), dk = db[0], di = Number(db[1]);
      var label = (state.doc[dk][di] && (state.doc[dk][di].n || state.doc[dk][di].t || state.doc[dk][di].title)) || 'this entry';
      if (!window.confirm('Delete ' + label + '? This is applied when you publish.')) return;
      state.doc[dk].splice(di, 1);
      state.open = {};
      markDirty(); render(); return;
    }

    var move = t.getAttribute('data-move');
    if (move) {
      var mb = move.split(':'), mk = mb[0], mi = Number(mb[1]), dir = Number(mb[2]);
      var to = mi + dir;
      if (to < 0 || to >= state.doc[mk].length) return;
      var arr = state.doc[mk];
      var tmp = arr[mi]; arr[mi] = arr[to]; arr[to] = tmp;
      state.open = {}; state.open[mk + ':' + to] = true;
      markDirty(); render(); return;
    }

    var tagadd = t.getAttribute('data-tagadd');
    if (tagadd) {
      var list = getAt(tagadd);
      if (!Array.isArray(list)) { setAt(tagadd, []); list = getAt(tagadd); }
      list.push('');
      markDirty(); render(); return;
    }

    var tagdel = t.getAttribute('data-tagdel');
    if (tagdel) {
      var tb = tagdel.split('.'), ti = Number(tb.pop());
      var parent = getAt(tb.join('.'));
      if (Array.isArray(parent)) parent.splice(ti, 1);
      markDirty(); render(); return;
    }

    var read = t.getAttribute('data-read');
    if (read) {
      var rb = read.split(':');
      api('/api/admin/enquiries', { method: 'PATCH', body: { id: rb[0], read: rb[1] === '1' } })
        .then(function () { return loadEnquiries(); })
        .then(render);
      return;
    }

    var ed = t.getAttribute('data-enqdel');
    if (ed) {
      if (!window.confirm('Delete this enquiry? It cannot be recovered.')) return;
      api('/api/admin/enquiries', { method: 'DELETE', body: { id: ed } })
        .then(function () { return loadEnquiries(); })
        .then(render);
      return;
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.id === 'csv-btn') return exportCSV();
    if (e.target.id === 'clear-btn') {
      if (!window.confirm('Delete every stored enquiry? This cannot be undone.')) return;
      api('/api/admin/enquiries', { method: 'DELETE', body: { all: 1 } })
        .then(function () { return loadEnquiries(); })
        .then(function () { render(); flash('Inbox emptied.', 'ok'); });
    }
  });

  function exportCSV() {
    var cols = ['receivedAt', 'submittedAt', 'name', 'phone', 'email', 'topic', 'business', 'message', 'read'];
    var lines = [cols.join(',')];
    state.enquiries.forEach(function (e) {
      lines.push(cols.map(function (c) {
        return '"' + String(e[c] == null ? '' : e[c]).replace(/"/g, '""') + '"';
      }).join(','));
    });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'enquiries.csv';
    document.body.appendChild(a); a.click();
    window.setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ── load & save ────────────────────────────────────────────────────── */
  function loadEnquiries() {
    return api('/api/admin/enquiries').then(function (r) {
      state.enquiries = (r.ok && r.body.enquiries) || [];
      return r;
    });
  }

  function save() {
    var btn = $('#save-btn');
    btn.disabled = true; btn.textContent = 'Publishing…';
    api('/api/admin/content', {
      method: 'PUT',
      body: { doc: state.doc, baseUpdatedAt: state.baseUpdatedAt }
    }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Publish changes';
      if (r.status === 409) {
        flash(r.body.message || 'This was edited elsewhere after you loaded it. Reload before saving.', 'bad');
        return;
      }
      if (!r.ok) {
        flash(r.body.error === 'store_not_configured'
          ? 'No store is configured, so there is nowhere to publish to. Add a Redis store in Vercel and redeploy.'
          : 'Could not publish: ' + (r.body.error || r.status), 'bad');
        return;
      }
      state.baseUpdatedAt = r.body.updatedAt;
      markClean(r.body.updatedAt);
      flash('Published. The site picks this up on its next load.', 'ok');
    });
  }

  function startApp() {
    $('#gate').hidden = true;
    $('#app').hidden = false;
    $('#save-btn').addEventListener('click', save);
    $('#logout-btn').addEventListener('click', function () {
      if (state.dirty && !window.confirm('You have unpublished changes. Sign out anyway?')) return;
      state.dirty = false;
      api('/api/admin/session', { method: 'DELETE' }).then(function () { location.reload(); });
    });
    $('#theme-btn').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('si-theme', next); } catch (e) {}
    });

    api('/api/admin/content').then(function (r) {
      var stored = r.ok ? r.body.doc : null;
      state.doc = seed(stored);
      state.baseUpdatedAt = stored && stored.updatedAt ? stored.updatedAt : null;
      markClean(state.baseUpdatedAt);
      if (!r.ok && r.body.error === 'store_not_configured') {
        flash('No store is configured. You can look around, but there is nowhere to publish to yet.', 'bad');
      } else if (!stored) {
        flash('Nothing published yet — this is the content the site currently ships with. Publishing takes over from it.', '');
      }
      return loadEnquiries();
    }).then(render);
  }

  /* ── gate ───────────────────────────────────────────────────────────── */
  function boot() {
    api('/api/admin/session').then(function (r) {
      var b = r.body || {};
      if (!b.configured) {
        $('#gate-note').textContent = 'Not configured yet.';
        $('#gate-setup').hidden = false;
        return;
      }
      if (b.authed) return startApp();
      $('#gate-note').textContent = 'Sign in to manage the site.';
      $('#login-form').hidden = false;
      $('#pw').focus();
    });

    $('#login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('#login-btn'), err = $('#login-err');
      err.hidden = true;
      btn.disabled = true; btn.textContent = 'Signing in…';
      api('/api/admin/session', { method: 'POST', body: { password: $('#pw').value } })
        .then(function (r) {
          btn.disabled = false; btn.textContent = 'Sign in';
          if (r.ok) return startApp();
          err.hidden = false;
          err.textContent = r.status === 429
            ? 'Too many attempts. Try again in fifteen minutes.'
            : 'That password was not right.';
          $('#pw').value = '';
          $('#pw').focus();
        });
    });
  }

  boot();
})();
