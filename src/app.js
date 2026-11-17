import './index.css';
import { translations } from './i18n.js';
import { INITIAL_COURSES, INITIAL_STAFF, INITIAL_NEWS } from './seedData.js';
import {
  db,
  auth,
  OperationType,
  handleFirestoreError,
  isCurrentUserAdmin,
  signInWithGoogle,
  signOutFirebase,
  onAuthStateChanged,
  onSnapshot,
  collection,
  ensureFirestoreSeeded,
  saveFirestoreNews,
  deleteFirestoreNews,
  saveFirestoreStaff,
  deleteFirestoreStaff,
  createFirestoreContactMessage,
  deleteFirestoreContactMessage,
  compressImageToDataUrl,
} from './firebase.js';

import heroVisualImg from './assets/images/hero_it_systems_1794791780973.jpg';
import seminarImg from './assets/images/news_bologna_seminar_1794766216814.jpg';
import labImg from './assets/images/news_web_python_lab_1794766216234.jpg';
import aboutMisDeskImg from './assets/images/about_mis_desk_1794791388756.jpg';

const IMAGE_MAP = {
  hero: heroVisualImg,
  seminar: seminarImg,
  lab: labImg,
  campus: aboutMisDeskImg,
};

const state = {
  lang: localStorage.getItem('mis_lang') || 'ku',
  semester: '1',
  courseSearch: '',
  courses: [...INITIAL_COURSES],
  staff: [...INITIAL_STAFF],
  news: [...INITIAL_NEWS],
  messages: [],
  page: 'home',
  adminTab: 'news',
  adminToken: sessionStorage.getItem('mis_admin_token') || '',
  firebaseAdmin: false,
  messagesUnsub: null,
};

if (!['ku', 'ar', 'en'].includes(state.lang)) {
  state.lang = 'ku';
}

function t(key) {
  return translations[state.lang][key] ?? translations.ku[key] ?? key;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBidiHtml(str) {
  const raw = String(str ?? '');
  if (state.lang === 'en') return escapeHtml(raw);
  const re = /(©\s*\d{4}|[A-Za-z0-9]+(?:[._/@+–-][A-Za-z0-9+]+|\s+(?:[&/–-]\s+)?[A-Za-z0-9]+(?:[._/@+–-][A-Za-z0-9+]+)*)*(?:\+\+)?)/g;
  let out = '';
  let last = 0;
  for (const m of raw.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out += escapeHtml(raw.slice(last, idx));
    out += `<bdi dir="ltr">${escapeHtml(m[0])}</bdi>`;
    last = idx + m[0].length;
  }
  if (last < raw.length) out += escapeHtml(raw.slice(last));
  return out;
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

function applyLanguage() {
  const dict = translations[state.lang];
  document.documentElement.lang = dict.htmlLang;
  document.documentElement.dir = dict.dir;
  document.title = dict.page_title;

  document.getElementById('brand-name').innerHTML = formatBidiHtml(dict.brand_name);
  document.getElementById('hero-kicker').innerHTML = formatBidiHtml(dict.hero_kicker);
  document.getElementById('hero-title').innerHTML = formatBidiHtml(dict.hero_title);
  document.getElementById('hero-lead').innerHTML = formatBidiHtml(dict.hero_lead);
  document.getElementById('hero-cta-primary').innerHTML = formatBidiHtml(dict.hero_cta_primary);
  document.getElementById('hero-cta-secondary').innerHTML = formatBidiHtml(dict.hero_cta_secondary);

  document.getElementById('about-title').innerHTML = formatBidiHtml(dict.about_title);
  document.getElementById('about-body').innerHTML = dict.about_paragraphs
    .map((p) => `<p>${formatBidiHtml(p)}</p>`)
    .join('');
  document.getElementById('vision-heading').innerHTML = formatBidiHtml(dict.vision_heading);
  document.getElementById('vision-body').innerHTML = formatBidiHtml(dict.vision_body);
  document.getElementById('mission-heading').innerHTML = formatBidiHtml(dict.mission_heading);
  document.getElementById('mission-body').innerHTML = formatBidiHtml(dict.mission_body);

  document.getElementById('footer-dept').innerHTML = formatBidiHtml(dict.footer_dept);
  document.getElementById('footer-uni').innerHTML = formatBidiHtml(dict.footer_uni);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) {
      el.innerHTML = formatBidiHtml(dict[key]);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-lang-btn') === state.lang);
  });

  renderCourses();
  renderStaff();
  renderNews();
  renderAdminNewsList();
  renderAdminStaffList();
  renderAdminMessages();
}

function renderCourses() {
  const container = document.getElementById('courses-container');
  const summaryEl = document.getElementById('courses-summary');
  const dict = translations[state.lang];

  document.querySelectorAll('.semester-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.getAttribute('data-semester') === state.semester);
  });

  if (!state.courses.length) {
    return;
  }

  const query = state.courseSearch.trim().toLowerCase();
  const filtered = state.courses.filter((c) => {
    const matchSem = String(c.semester) === state.semester;
    if (!matchSem) return false;
    if (!query) return true;
    const hay = `${c.code} ${c.title_en} ${c.title_ku} ${c.title_ar} ${c.language}`.toLowerCase();
    return hay.includes(query);
  });

  const totalEcts = filtered.reduce((acc, c) => acc + c.ects, 0);
  const totalWl = filtered.reduce((acc, c) => acc + c.workload_hrs, 0);
  const totalWeekly = filtered.reduce((acc, c) => acc + c.total_hrs, 0);

  summaryEl.innerHTML = formatBidiHtml(
    `${filtered.length} ${dict.summary_modules} · ${totalEcts} ${dict.summary_ects} · ${totalWl} ${dict.summary_workload} · ${totalWeekly} ${dict.summary_weekly}`
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div class="rounded-2xl border border-[#E5E1D8] bg-white px-6 py-12 text-center text-sm text-[#5B6476]">${formatBidiHtml(dict.courses_empty)}</div>`;
    return;
  }

  const semestersPresent = [...new Set(filtered.map((c) => c.semester))].sort((a, b) => a - b);

  container.innerHTML = semestersPresent
    .map((sem) => {
      const items = filtered.filter((c) => c.semester === sem);
      const semTheo = items.reduce((s, c) => s + c.theoretical_hrs, 0);
      const semPrac = items.reduce((s, c) => s + c.practical_hrs, 0);
      const semWeekly = items.reduce((s, c) => s + c.total_hrs, 0);
      const semEcts = items.reduce((s, c) => s + c.ects, 0);
      const semWl = items.reduce((s, c) => s + c.workload_hrs, 0);

      const rowsHtml = items
        .map((c) => {
          const localizedTitle =
            state.lang === 'ku' ? c.title_ku : state.lang === 'ar' ? c.title_ar : c.title_en;
          const typeLabel = c.subject_type === 'Core' ? dict.type_core : dict.type_request;
          return `
            <tr class="border-b border-[#E5E1D8] transition-colors hover:bg-[#FAF8F5]">
              <td class="px-4 py-3.5 font-mono text-xs tabular-nums text-[#5B6476]" dir="ltr">${c.item_no}</td>
              <td class="px-4 py-3.5 font-mono text-xs font-semibold text-[#1D356B] whitespace-nowrap" dir="ltr">${escapeHtml(c.code)}</td>
              <td class="px-4 py-3.5">
                <div class="text-sm font-semibold text-[#171B24]">${formatBidiHtml(localizedTitle)}</div>
                ${state.lang !== 'en' ? `<div class="mt-0.5 text-xs text-[#5B6476]" dir="ltr">${escapeHtml(c.title_en)}</div>` : ''}
              </td>
              <td class="px-4 py-3.5 text-xs font-medium text-[#475063] whitespace-nowrap">${formatBidiHtml(typeLabel)}</td>
              <td class="px-4 py-3.5 text-xs text-[#475063] whitespace-nowrap"><bdi dir="ltr">${escapeHtml(c.language)}</bdi></td>
              <td class="px-4 py-3.5 font-mono text-xs tabular-nums text-[#171B24] text-center" dir="ltr">${c.theoretical_hrs}</td>
              <td class="px-4 py-3.5 font-mono text-xs tabular-nums text-[#171B24] text-center" dir="ltr">${c.practical_hrs}</td>
              <td class="px-4 py-3.5 font-mono text-xs font-semibold tabular-nums text-[#171B24] text-center" dir="ltr">${c.total_hrs}</td>
              <td class="px-4 py-3.5 font-mono text-xs font-semibold tabular-nums text-[#1D356B] text-center" dir="ltr">${c.ects}</td>
              <td class="px-4 py-3.5 font-mono text-xs tabular-nums text-[#475063] text-center" dir="ltr">${c.workload_hrs}</td>
            </tr>
          `;
        })
        .join('');

      const mobileCardsHtml = items
        .map((c) => {
          const localizedTitle =
            state.lang === 'ku' ? c.title_ku : state.lang === 'ar' ? c.title_ar : c.title_en;
          const typeLabel = c.subject_type === 'Core' ? dict.type_core : dict.type_request;
          return `
            <div class="border-b border-[#E5E1D8] p-4 last:border-b-0">
              <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span class="font-mono font-semibold text-[#1D356B]" dir="ltr">${escapeHtml(c.code)}</span>
                <span class="text-[#5B6476]">${formatBidiHtml(typeLabel)} · <bdi dir="ltr">${escapeHtml(c.language)}</bdi></span>
              </div>
              <div class="mt-1.5 text-sm font-bold text-[#171B24]">${formatBidiHtml(localizedTitle)}</div>
              ${state.lang !== 'en' ? `<div class="mt-0.5 text-xs text-[#5B6476]" dir="ltr">${escapeHtml(c.title_en)}</div>` : ''}
              <div class="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-[#FAF8F5] p-2.5 text-center">
                <div>
                  <div class="text-[10px] text-[#5B6476]">${formatBidiHtml(dict.col_theo)}</div>
                  <div class="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#171B24]" dir="ltr">${c.theoretical_hrs}</div>
                </div>
                <div>
                  <div class="text-[10px] text-[#5B6476]">${formatBidiHtml(dict.col_prac)}</div>
                  <div class="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#171B24]" dir="ltr">${c.practical_hrs}</div>
                </div>
                <div>
                  <div class="text-[10px] text-[#5B6476]">${formatBidiHtml(dict.col_ects)}</div>
                  <div class="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#1D356B]" dir="ltr">${c.ects}</div>
                </div>
                <div>
                  <div class="text-[10px] text-[#5B6476]">${formatBidiHtml(dict.col_workload)}</div>
                  <div class="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#171B24]" dir="ltr">${c.workload_hrs}</div>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div class="overflow-hidden rounded-2xl border border-[#E5E1D8] bg-white">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E1D8] bg-[#F3F0EA]/70 px-4 py-3.5 sm:px-5">
            <h3 class="text-sm font-bold text-[#1D356B] sm:text-base">${formatBidiHtml(dict.sem_labels[sem])}</h3>
            <div class="font-mono text-xs font-medium tabular-nums text-[#475063]" dir="ltr">
              ${semEcts} ECTS · ${semWl} hrs · ${semWeekly} hrs/wk
            </div>
          </div>

          <!-- Mobile & Small Tablet Card View (No Horizontal Overflow) -->
          <div class="md:hidden">
            ${mobileCardsHtml}
            <div class="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E1D8] bg-[#FAF8F5] px-4 py-3 text-xs font-semibold text-[#171B24]">
              <span>${escapeHtml(dict.sem_labels[sem])}</span>
              <span class="font-mono tabular-nums text-[#1D356B]" dir="ltr">${semTheo}T / ${semPrac}P · ${semEcts} ECTS · ${semWl}h</span>
            </div>
          </div>

          <!-- Desktop & Large Tablet Academic Table -->
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full text-start border-collapse">
              <thead>
                <tr class="border-b border-[#E5E1D8] bg-[#FAF8F5] text-xs font-semibold text-[#5B6476]">
                  <th class="px-4 py-3 text-start">${escapeHtml(dict.col_no)}</th>
                  <th class="px-4 py-3 text-start">${escapeHtml(dict.col_code)}</th>
                  <th class="px-4 py-3 text-start">${escapeHtml(dict.col_module)}</th>
                  <th class="px-4 py-3 text-start">${escapeHtml(dict.col_type)}</th>
                  <th class="px-4 py-3 text-start">${escapeHtml(dict.col_lang)}</th>
                  <th class="px-4 py-3 text-center">${escapeHtml(dict.col_theo)}</th>
                  <th class="px-4 py-3 text-center">${escapeHtml(dict.col_prac)}</th>
                  <th class="px-4 py-3 text-center">${escapeHtml(dict.col_total)}</th>
                  <th class="px-4 py-3 text-center">${escapeHtml(dict.col_ects)}</th>
                  <th class="px-4 py-3 text-center">${escapeHtml(dict.col_workload)}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="bg-[#FAF8F5] font-semibold text-[#171B24]">
                  <td colspan="5" class="px-4 py-3 text-xs text-[#475063]">${escapeHtml(dict.sem_labels[sem])}</td>
                  <td class="px-4 py-3 font-mono text-xs tabular-nums text-center">${semTheo}</td>
                  <td class="px-4 py-3 font-mono text-xs tabular-nums text-center">${semPrac}</td>
                  <td class="px-4 py-3 font-mono text-xs tabular-nums text-center">${semWeekly}</td>
                  <td class="px-4 py-3 font-mono text-xs tabular-nums text-center text-[#1D356B]">${semEcts}</td>
                  <td class="px-4 py-3 font-mono text-xs tabular-nums text-center">${semWl}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderStaff() {
  const container = document.getElementById('staff-container');
  const dict = translations[state.lang];

  if (!state.staff.length) return;

  const heads = state.staff.filter((s) => s.role_key === 'head');
  const lecturers = state.staff.filter((s) => s.role_key !== 'head');

  const renderCard = (member, isHead = false) => {
    const roleLabel =
      member.role_key === 'head'
        ? dict.role_head
        : member.role_key === 'doctor'
          ? dict.role_doctor
          : dict.role_lecturer;
    const displayName =
      state.lang === 'ku'
        ? member.name_ku || member.name
        : state.lang === 'ar'
          ? member.name_ar || member.name
          : member.name_en || member.name;

    const avatarHtml = member.photo_url
      ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(displayName)}" class="h-14 w-14 shrink-0 rounded-full bg-[#F4F3EF] object-cover object-top border border-[#E5E1D8] sm:h-16 sm:w-16" referrerPolicy="no-referrer" />`
      : `<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#D4CFC4] ${isHead ? 'bg-[#1D356B] text-white' : 'bg-[#F3F0EA] text-[#1D356B]'} text-sm font-bold sm:h-16 sm:w-16 sm:text-base">${escapeHtml(getInitials(displayName))}</div>`;

    return `
      <button
        type="button"
        data-staff-id="${member.id}"
        class="staff-card group flex min-h-[84px] w-full items-center gap-3.5 rounded-2xl border ${isHead ? 'border-[#1D356B]/30 bg-[#FAF8F5]' : 'border-[#E5E1D8] bg-white'} p-4 text-start transition-colors hover:border-[#1D356B] cursor-pointer sm:gap-4 sm:p-5"
      >
        ${avatarHtml}
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold ${isHead ? 'text-[#9A7424]' : 'text-[#5B6476]'}">${escapeHtml(roleLabel)}</div>
          <h3 class="mt-0.5 text-sm font-bold leading-snug text-[#171B24] group-hover:text-[#1D356B] sm:text-base">${escapeHtml(displayName)}</h3>
        </div>
      </button>
    `;
  };

  let html = '';
  if (heads.length > 0) {
    html += `
      <div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          ${heads.map((h) => renderCard(h, true)).join('')}
        </div>
      </div>
    `;
  }
  if (lecturers.length > 0) {
    html += `
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        ${lecturers.map((l) => renderCard(l, false)).join('')}
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.staff-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = String(card.getAttribute('data-staff-id') || '');
      const member = state.staff.find((s) => String(s.id) === id);
      if (member) openStaffModal(member);
    });
  });
}

function openStaffModal(member) {
  const dict = translations[state.lang];
  const roleLabel =
    member.role_key === 'head'
      ? dict.role_head
      : member.role_key === 'doctor'
        ? dict.role_doctor
        : dict.role_lecturer;
  const displayName =
    state.lang === 'ku'
      ? member.name_ku || member.name
      : state.lang === 'ar'
        ? member.name_ar || member.name
        : member.name_en || member.name;

  const avatarHtml = member.photo_url
    ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(displayName)}" class="h-20 w-20 shrink-0 rounded-full bg-[#F4F3EF] object-cover object-top border border-[#E5E1D8]" referrerPolicy="no-referrer" />`
    : `<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1D356B] text-xl font-bold text-white">${escapeHtml(getInitials(displayName))}</div>`;

  const emailAddr = member.email || member.academic_email || '';

  document.getElementById('staff-modal-content').innerHTML = `
    <div class="flex items-center gap-4 pe-10">
      ${avatarHtml}
      <div class="min-w-0">
        <div class="text-xs font-semibold text-[#9A7424]">${escapeHtml(roleLabel)}</div>
        <h3 class="mt-1 text-lg font-bold leading-snug text-[#171B24] sm:text-xl">${escapeHtml(displayName)}</h3>
      </div>
    </div>
    <dl class="mt-6 border-y border-[#E5E1D8] text-sm">
      <div class="flex flex-wrap items-center justify-between gap-2 py-3.5">
        <dt class="text-[#5B6476]">${escapeHtml(dict.staff_email_label)}</dt>
        <dd class="font-mono text-xs font-semibold text-[#1D356B] sm:text-sm" dir="ltr">${escapeHtml(emailAddr)}</dd>
      </div>
    </dl>
  `;

  openModal('staff-modal');
}

function getNewsCategoryLabel(cat) {
  const dict = translations[state.lang];
  if (cat === 'event') return dict.cat_event;
  if (cat === 'notice') return dict.cat_notice;
  return dict.cat_announcement;
}

function resolveNewsImage(item) {
  if (item && item.image_url && String(item.image_url).trim()) {
    return item.image_url;
  }
  return IMAGE_MAP[item?.image_key] || seminarImg;
}

function makeSnippet(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 165) return clean;
  return `${clean.slice(0, 162)}...`;
}

function renderNews() {
  const grid = document.getElementById('news-grid');
  const dict = translations[state.lang];

  if (!state.news) return;

  if (state.news.length === 0) {
    grid.innerHTML = `<div class="col-span-full rounded-2xl border border-[#E5E1D8] bg-white px-6 py-12 text-center text-sm text-[#5B6476]">${escapeHtml(dict.news_empty)}</div>`;
    return;
  }

  grid.innerHTML = state.news
    .map((item) => {
      const title =
        state.lang === 'ku' ? item.title_ku : state.lang === 'ar' ? item.title_ar : item.title_en;
      const rawSummary =
        state.lang === 'ku'
          ? item.summary_ku || makeSnippet(item.body_ku)
          : state.lang === 'ar'
            ? item.summary_ar || makeSnippet(item.body_ar)
            : item.summary_en || makeSnippet(item.body_en);
      const imgSrc = escapeHtml(resolveNewsImage(item));
      const catLabel = getNewsCategoryLabel(item.category);

      return `
        <article class="flex flex-col overflow-hidden rounded-2xl border border-[#E5E1D8] bg-white transition-colors hover:border-[#1D356B]">
          <div class="flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-[#E5E1D8] bg-white">
            <img src="${imgSrc}" alt="${escapeHtml(title)}" class="h-full w-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div class="flex flex-1 flex-col justify-between p-5">
            <div>
              <div class="flex items-center gap-2 text-xs text-[#5B6476]">
                <span class="font-semibold text-[#9A7424]">${formatBidiHtml(catLabel)}</span>
                <span aria-hidden="true">·</span>
                <time class="font-mono tabular-nums" dir="ltr">${escapeHtml(item.published_at)}</time>
              </div>
              <h3 class="mt-2.5 text-lg font-bold leading-snug text-[#171B24]">${formatBidiHtml(title)}</h3>
              <p class="mt-2 text-sm leading-relaxed text-[#475063]">${formatBidiHtml(rawSummary)}</p>
            </div>
            <div class="mt-5 border-t border-[#E5E1D8] pt-3.5">
              <button type="button" data-news-id="${escapeHtml(String(item.id))}" class="read-news-btn text-xs font-semibold text-[#1D356B] hover:underline cursor-pointer">
                ${formatBidiHtml(dict.news_read_more)}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('.read-news-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = String(btn.getAttribute('data-news-id') || '');
      const item = state.news.find((n) => String(n.id) === id);
      if (item) openNewsModal(item);
    });
  });
}

function openNewsModal(item) {
  const title =
    state.lang === 'ku' ? item.title_ku : state.lang === 'ar' ? item.title_ar : item.title_en;
  const body =
    state.lang === 'ku' ? item.body_ku : state.lang === 'ar' ? item.body_ar : item.body_en;
  const imgSrc = escapeHtml(resolveNewsImage(item));
  const catLabel = getNewsCategoryLabel(item.category);

  document.getElementById('news-modal-content').innerHTML = `
    <div class="flex items-center gap-2 text-xs text-[#5B6476]">
      <span class="font-semibold text-[#9A7424]">${formatBidiHtml(catLabel)}</span>
      <span aria-hidden="true">·</span>
      <time class="font-mono tabular-nums" dir="ltr">${escapeHtml(item.published_at)}</time>
    </div>
    <h3 class="mt-2 text-2xl font-bold leading-snug text-[#171B24]">${formatBidiHtml(title)}</h3>
    <div class="mt-5 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl border border-[#E5E1D8] bg-white">
      <img src="${imgSrc}" alt="${escapeHtml(title)}" class="h-full w-full object-contain" referrerPolicy="no-referrer" />
    </div>
    <p class="mt-6 text-base leading-[1.85] text-[#333B4D] whitespace-pre-line">${formatBidiHtml(body)}</p>
  `;

  openModal('news-modal');
}

function setUploadedNewsPreview(url) {
  const urlInput = document.getElementById('news-image-url');
  const wrap = document.getElementById('news-image-preview-wrap');
  const img = document.getElementById('news-image-preview');
  if (!urlInput || !wrap || !img) return;
  urlInput.value = url || '';
  if (url) {
    img.src = url;
    wrap.classList.remove('hidden');
    wrap.classList.add('flex');
  } else {
    img.src = '';
    wrap.classList.add('hidden');
    wrap.classList.remove('flex');
  }
}

function setUploadStatus(msg, isError = false) {
  const el = document.getElementById('news-upload-status');
  if (!el) return;
  if (!msg) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = msg;
  el.className = `mt-2 text-xs font-medium ${isError ? 'text-red-700' : 'text-[#1D356B]'}`;
  el.classList.remove('hidden');
}

function renderAdminNewsList() {
  const listEl = document.getElementById('admin-news-list');
  if (!listEl) return;
  const dict = translations[state.lang];

  if (!state.news || state.news.length === 0) {
    listEl.innerHTML = `<div class="py-4 text-xs text-[#5B6476]">${escapeHtml(dict.news_empty)}</div>`;
    return;
  }

  listEl.innerHTML = state.news
    .map((item) => {
      const title =
        state.lang === 'ku' ? item.title_ku : state.lang === 'ar' ? item.title_ar : item.title_en;
      return `
        <div class="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <img src="${escapeHtml(resolveNewsImage(item))}" alt="" class="h-10 w-14 shrink-0 rounded-md border border-[#E5E1D8] bg-white object-contain" referrerPolicy="no-referrer" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-[#171B24]">${escapeHtml(title)}</div>
              <div class="mt-0.5 font-mono text-xs text-[#5B6476]" dir="ltr">${escapeHtml(item.published_at)} · ${escapeHtml(getNewsCategoryLabel(item.category))}</div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <button type="button" data-edit-news="${escapeHtml(String(item.id))}" class="text-xs font-semibold text-[#1D356B] hover:underline cursor-pointer">${escapeHtml(dict.admin_edit_action)}</button>
            <button type="button" data-delete-news="${escapeHtml(String(item.id))}" class="text-xs font-semibold text-red-700 hover:underline cursor-pointer">${escapeHtml(dict.admin_delete_action)}</button>
          </div>
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-edit-news]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = String(btn.getAttribute('data-edit-news') || '');
      const item = state.news.find((n) => String(n.id) === id);
      if (!item) return;
      document.getElementById('news-edit-id').value = String(item.id);
      document.getElementById('news-category').value = item.category;
      document.getElementById('news-image-key').value = item.image_key;
      setUploadedNewsPreview(item.image_url || '');
      setUploadStatus('');
      document.getElementById('news-date').value = item.published_at;
      document.getElementById('news-title-ku').value = item.title_ku;
      document.getElementById('news-title-ar').value = item.title_ar;
      document.getElementById('news-title-en').value = item.title_en;
      document.getElementById('news-body-ku').value = item.body_ku;
      document.getElementById('news-body-ar').value = item.body_ar;
      document.getElementById('news-body-en').value = item.body_en;

      document.getElementById('admin-form-heading').textContent = dict.admin_edit_heading;
      document.querySelector('#admin-save-btn span').textContent = dict.admin_update_btn;
      document.getElementById('admin-cancel-edit').classList.remove('hidden');
    });
  });

  listEl.querySelectorAll('[data-delete-news]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = String(btn.getAttribute('data-delete-news') || '');
      try {
        if (state.firebaseAdmin && auth.currentUser) {
          await deleteFirestoreNews(id);
          showAdminFeedback(dict.admin_deleted_ok, false);
          return;
        }
        const res = await fetch(`/api/news/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${state.adminToken}` },
        });
        if (res.status === 401) {
          handleAdminUnauthorized();
          return;
        }
        if (res.ok) {
          await fetchNews();
          showAdminFeedback(dict.admin_deleted_ok, false);
        }
      } catch (err) {
        showAdminFeedback(err instanceof Error ? err.message : 'Delete failed', true);
      }
    });
  });
}

function renderAdminMessages() {
  const listEl = document.getElementById('admin-messages-list');
  const countEl = document.getElementById('admin-msg-count');
  if (countEl) {
    countEl.textContent = String((state.messages || []).length);
  }
  if (!listEl) return;
  const dict = translations[state.lang];

  if (!state.messages || state.messages.length === 0) {
    listEl.innerHTML = `<div class="rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] px-4 py-8 text-center text-xs text-[#5B6476]">${escapeHtml(dict.admin_messages_empty)}</div>`;
    return;
  }

  listEl.innerHTML = state.messages
    .map((msg) => {
      const subj = msg.subject && msg.subject !== 'General Inquiry' ? msg.subject : dict.admin_msg_no_subject;
      const emailAddr = msg.email || msg.senderEmail || '';
      return `
        <article class="rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] p-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-bold text-[#171B24]">${formatBidiHtml(msg.name)}</div>
              <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5B6476]">
                <a href="mailto:${escapeHtml(emailAddr)}" class="font-mono text-[#1D356B] hover:underline" dir="ltr">${escapeHtml(emailAddr)}</a>
                <span aria-hidden="true">·</span>
                <time class="font-mono tabular-nums" dir="ltr">${escapeHtml(msg.created_at)}</time>
              </div>
            </div>
            <button
              type="button"
              data-delete-msg="${escapeHtml(String(msg.id))}"
              class="shrink-0 text-xs font-semibold text-red-700 hover:underline cursor-pointer"
            >
              ${escapeHtml(dict.admin_msg_delete)}
            </button>
          </div>
          <div class="mt-2.5 text-xs font-semibold text-[#9A7424]">${formatBidiHtml(subj)}</div>
          <p class="mt-1.5 text-sm leading-relaxed text-[#333B4D] whitespace-pre-line">${formatBidiHtml(msg.message)}</p>
        </article>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-delete-msg]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = String(btn.getAttribute('data-delete-msg') || '');
      try {
        if (state.firebaseAdmin && auth.currentUser) {
          await deleteFirestoreContactMessage(id);
          return;
        }
        const res = await fetch(`/api/contact/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${state.adminToken}` },
        });
        if (res.status === 401) {
          handleAdminUnauthorized();
          return;
        }
        if (res.ok) {
          await fetchMessages();
        }
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    });
  });
}

function setUploadedStaffPhotoPreview(url) {
  const urlInput = document.getElementById('staff-photo-url');
  const wrap = document.getElementById('staff-photo-preview-wrap');
  const img = document.getElementById('staff-photo-preview');
  if (!urlInput || !wrap || !img) return;
  urlInput.value = url || '';
  if (url) {
    img.src = url;
    wrap.classList.remove('hidden');
    wrap.classList.add('flex');
  } else {
    img.src = '';
    wrap.classList.add('hidden');
    wrap.classList.remove('flex');
  }
}

function setStaffUploadStatus(msg, isError = false) {
  const el = document.getElementById('staff-upload-status');
  if (!el) return;
  if (!msg) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = msg;
  el.className = `mt-2 text-xs font-medium ${isError ? 'text-red-700' : 'text-[#1D356B]'}`;
  el.classList.remove('hidden');
}

function showAdminStaffFeedback(msg, isError) {
  const el = document.getElementById('admin-staff-feedback');
  if (!el) return;
  el.textContent = msg;
  el.className = `rounded-lg px-3.5 py-2.5 text-xs font-medium ${
    isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
  }`;
  el.classList.remove('hidden');
}

function resetAdminStaffForm() {
  const dict = translations[state.lang];
  const form = document.getElementById('admin-staff-form');
  if (!form) return;
  form.reset();
  document.getElementById('staff-edit-id').value = '';
  setUploadedStaffPhotoPreview('');
  setStaffUploadStatus('');
  document.getElementById('admin-staff-form-heading').textContent = dict.admin_staff_add_heading;
  document.querySelector('#admin-staff-save-btn span').textContent = dict.admin_staff_save_btn;
  document.getElementById('admin-staff-cancel-edit').classList.add('hidden');
}

function renderAdminStaffList() {
  const listEl = document.getElementById('admin-staff-list');
  const countEl = document.getElementById('admin-staff-count');
  if (countEl) {
    countEl.textContent = String((state.staff || []).length);
  }
  if (!listEl) return;
  const dict = translations[state.lang];

  if (!state.staff || state.staff.length === 0) {
    listEl.innerHTML = `<div class="py-4 text-xs text-[#5B6476]">${escapeHtml(dict.admin_staff_empty)}</div>`;
    return;
  }

  listEl.innerHTML = state.staff
    .map((member) => {
      const displayName =
        state.lang === 'ku'
          ? member.name_ku || member.name
          : state.lang === 'ar'
            ? member.name_ar || member.name
            : member.name_en || member.name;
      const roleLabel =
        member.role_key === 'head'
          ? dict.role_head
          : member.role_key === 'doctor'
            ? dict.role_doctor
            : dict.role_lecturer;
      const avatarHtml = member.photo_url
        ? `<img src="${escapeHtml(member.photo_url)}" alt="" class="h-10 w-10 shrink-0 rounded-full border border-[#E5E1D8] bg-[#F4F3EF] object-cover object-top" referrerPolicy="no-referrer" />`
        : `<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D4CFC4] bg-[#F3F0EA] text-xs font-bold text-[#1D356B]">${escapeHtml(getInitials(displayName))}</div>`;

      return `
        <div class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            ${avatarHtml}
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-[#171B24]">${escapeHtml(displayName)}</div>
              <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#5B6476]">
                <span>${escapeHtml(roleLabel)}</span>
                <span aria-hidden="true">·</span>
                <span class="font-mono" dir="ltr">${escapeHtml(member.email || member.academic_email || '')}</span>
                <span aria-hidden="true">·</span>
                <span class="font-mono tabular-nums" dir="ltr">#${member.display_order}</span>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <button type="button" data-edit-staff="${escapeHtml(String(member.id))}" class="text-xs font-semibold text-[#1D356B] hover:underline cursor-pointer">${escapeHtml(dict.admin_edit_action)}</button>
            <button type="button" data-delete-staff="${escapeHtml(String(member.id))}" class="text-xs font-semibold text-red-700 hover:underline cursor-pointer">${escapeHtml(dict.admin_delete_action)}</button>
          </div>
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-edit-staff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = String(btn.getAttribute('data-edit-staff') || '');
      const member = state.staff.find((s) => String(s.id) === id);
      if (!member) return;
      document.getElementById('staff-edit-id').value = String(member.id);
      document.getElementById('staff-role').value = member.role_key || 'lecturer';
      document.getElementById('staff-email').value = member.email || member.academic_email || '';
      document.getElementById('staff-order').value = String(member.display_order || '');
      document.getElementById('staff-name-ku').value = member.name_ku || member.name || '';
      document.getElementById('staff-name-ar').value = member.name_ar || '';
      document.getElementById('staff-name-en').value = member.name_en || '';
      setUploadedStaffPhotoPreview(member.photo_url || '');
      setStaffUploadStatus('');

      document.getElementById('admin-staff-form-heading').textContent = dict.admin_staff_edit_heading;
      document.querySelector('#admin-staff-save-btn span').textContent = dict.admin_staff_update_btn;
      document.getElementById('admin-staff-cancel-edit').classList.remove('hidden');
    });
  });

  listEl.querySelectorAll('[data-delete-staff]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = String(btn.getAttribute('data-delete-staff') || '');
      try {
        if (state.firebaseAdmin && auth.currentUser) {
          await deleteFirestoreStaff(id);
          showAdminStaffFeedback(dict.admin_staff_deleted_ok, false);
          return;
        }
        const res = await fetch(`/api/staff/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${state.adminToken}` },
        });
        if (res.status === 401) {
          handleAdminUnauthorized();
          return;
        }
        if (res.ok) {
          await fetchStaff();
          showAdminStaffFeedback(dict.admin_staff_deleted_ok, false);
        }
      } catch (err) {
        showAdminStaffFeedback(err instanceof Error ? err.message : 'Delete failed', true);
      }
    });
  });
}

function switchAdminTab(tab) {
  state.adminTab = ['news', 'staff', 'messages'].includes(tab) ? tab : 'news';
  const tabs = {
    news: { btn: document.getElementById('admin-tab-news'), panel: document.getElementById('admin-panel-news') },
    staff: { btn: document.getElementById('admin-tab-staff'), panel: document.getElementById('admin-panel-staff') },
    messages: { btn: document.getElementById('admin-tab-messages'), panel: document.getElementById('admin-panel-messages') },
  };
  Object.entries(tabs).forEach(([key, pair]) => {
    const active = state.adminTab === key;
    if (pair.btn) pair.btn.classList.toggle('is-active', active);
    if (pair.panel) pair.panel.classList.toggle('hidden', !active);
  });
}

function resetAdminForm() {
  const dict = translations[state.lang];
  document.getElementById('admin-news-form').reset();
  document.getElementById('news-edit-id').value = '';
  setUploadedNewsPreview('');
  setUploadStatus('');
  document.getElementById('news-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('admin-form-heading').textContent = dict.admin_add_heading;
  document.querySelector('#admin-save-btn span').textContent = dict.admin_save_btn;
  document.getElementById('admin-cancel-edit').classList.add('hidden');
}

function showAdminFeedback(msg, isError) {
  const el = document.getElementById('admin-form-feedback');
  el.textContent = msg;
  el.className = `rounded-lg px-3.5 py-2.5 text-xs font-medium ${
    isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
  }`;
  el.classList.remove('hidden');
}

function updateAdminAuthUI(isAuthenticated) {
  const loginForm = document.getElementById('admin-login-form');
  const dashboard = document.getElementById('admin-dashboard');
  if (isAuthenticated) {
    loginForm.classList.add('hidden');
    dashboard.classList.remove('hidden');
    if (!document.getElementById('news-date').value) {
      document.getElementById('news-date').value = new Date().toISOString().slice(0, 10);
    }
    switchAdminTab(state.adminTab);
    renderAdminNewsList();
    renderAdminStaffList();
    fetchMessages();
  } else {
    loginForm.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

function handleAdminUnauthorized() {
  state.adminToken = '';
  state.firebaseAdmin = false;
  state.messages = [];
  if (state.messagesUnsub) {
    state.messagesUnsub();
    state.messagesUnsub = null;
  }
  sessionStorage.removeItem('mis_admin_token');
  signOutFirebase().catch(() => {});
  updateAdminAuthUI(false);
}

function isAdminUrl() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  return path === '/admin' || hash === '#admin';
}

function isAboutUrl() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  return path === '/project' || path === '/about' || hash === '#project' || hash === '#about-project';
}

function setPageView(pageName, targetHash = '', updateHistory = true) {
  const homeView = document.getElementById('home-view');
  const aboutView = document.getElementById('about-page-view');
  if (!homeView || !aboutView) return;

  state.page = pageName === 'about' ? 'about' : 'home';

  if (state.page === 'about') {
    homeView.classList.add('hidden');
    aboutView.classList.remove('hidden');
    if (updateHistory && window.location.hash.toLowerCase() !== '#project') {
      window.history.pushState(null, '', '#project');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    aboutView.classList.add('hidden');
    homeView.classList.remove('hidden');
    if (targetHash && targetHash !== '#top') {
      if (updateHistory && window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
      requestAnimationFrame(() => {
        const targetEl = document.querySelector(targetHash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      if (updateHistory && (window.location.hash || window.location.pathname === '/project' || window.location.pathname === '/about')) {
        window.history.pushState(null, '', '/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  document.querySelectorAll('header a[href="#project"]').forEach((link) => {
    link.classList.toggle('bg-[#1D356B]', state.page === 'about');
    link.classList.toggle('text-white', state.page === 'about');
    link.classList.toggle('border-[#1D356B]', state.page === 'about');
    link.classList.toggle('bg-white', state.page !== 'about');
    link.classList.toggle('text-[#1D356B]', state.page !== 'about');
  });
}

async function openAdmin() {
  openModal('admin-modal');
  await verifyAdminSession();
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hidden');
  modal.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('hidden');
  modal.classList.remove('modal-open');
  document.body.style.overflow = '';
  if (id === 'admin-modal' && isAdminUrl()) {
    window.history.replaceState(null, '', '/');
  }
}

async function fetchCourses() {
  try {
    const res = await fetch('/api/courses');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        state.courses = data.courses;
      }
    }
  } catch {
    // Use static INITIAL_COURSES when running on Netlify
  }
  renderCourses();
}

async function fetchStaff() {
  if (state.firebaseAdmin) return;
  try {
    const res = await fetch('/api/staff');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.staff) && data.staff.length > 0 && !state.hasFirestoreStaff) {
        state.staff = data.staff;
      }
    }
  } catch {
    // Use Firestore / INITIAL_STAFF on Netlify
  }
  renderStaff();
  renderAdminStaffList();
}

async function fetchNews() {
  if (state.firebaseAdmin) return;
  try {
    const res = await fetch('/api/news');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.news) && data.news.length > 0 && !state.hasFirestoreNews) {
        state.news = data.news;
      }
    }
  } catch {
    // Use Firestore / INITIAL_NEWS on Netlify
  }
  renderNews();
  renderAdminNewsList();
}

async function fetchMessages() {
  if (state.firebaseAdmin) {
    renderAdminMessages();
    return;
  }
  if (!state.adminToken) return;
  try {
    const res = await fetch('/api/contact', {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    if (res.status === 401) {
      handleAdminUnauthorized();
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    state.messages = data.messages || [];
    renderAdminMessages();
  } catch (err) {
    console.error('Failed to load contact messages:', err);
  }
}

async function verifyAdminSession() {
  if (state.firebaseAdmin && auth.currentUser) {
    updateAdminAuthUI(true);
    return;
  }
  if (!state.adminToken) {
    updateAdminAuthUI(false);
    return;
  }
  try {
    const res = await fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    if (res.ok) {
      updateAdminAuthUI(true);
    } else {
      handleAdminUnauthorized();
    }
  } catch {
    handleAdminUnauthorized();
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function setupEventListeners() {
  // Language switch
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.getAttribute('data-lang-btn') || 'ku';
      localStorage.setItem('mis_lang', state.lang);
      applyLanguage();
    });
  });

  // Mobile nav toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  mobileMenuBtn.addEventListener('click', () => {
    const isHidden = mobileNav.classList.toggle('hidden');
    mobileMenuBtn.setAttribute('aria-expanded', String(!isHidden));
  });
  document.querySelectorAll('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.add('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Semester tabs
  document.querySelectorAll('.semester-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.semester = tab.getAttribute('data-semester') || '1';
      renderCourses();
    });
  });

  // Course search
  document.getElementById('course-search').addEventListener('input', (e) => {
    state.courseSearch = e.target.value || '';
    renderCourses();
  });

  // Modal close handlers
  ['staff-modal', 'news-modal', 'admin-modal'].forEach((modalId) => {
    const modal = document.getElementById(modalId);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modalId);
    });
  });
  document.getElementById('close-staff-modal').addEventListener('click', () => closeModal('staff-modal'));
  document.getElementById('close-news-modal').addEventListener('click', () => closeModal('news-modal'));
  document.getElementById('close-admin-modal').addEventListener('click', () => closeModal('admin-modal'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('staff-modal');
      closeModal('news-modal');
      closeModal('admin-modal');
    }
  });

  // Standalone About Project Page & Home Section Navigation
  document.querySelectorAll('a[href="#project"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setPageView('about');
    });
  });

  const backToHomeBtn = document.getElementById('back-to-home-btn');
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
      setPageView('home', '#top');
    });
  }

  document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setPageView('home', '#top');
    });
  });

  ['#about', '#courses', '#staff', '#news', '#contact'].forEach((sectionHash) => {
    document.querySelectorAll(`a[href="${sectionHash}"]`).forEach((link) => {
      link.addEventListener('click', (e) => {
        if (state.page === 'about') {
          e.preventDefault();
          setPageView('home', sectionHash);
        }
      });
    });
  });

  // Open Admin Modal or Switch Page View via URL hash/path
  const handleUrlRouteChange = () => {
    if (isAdminUrl()) {
      openAdmin();
      return;
    }
    if (isAboutUrl()) {
      setPageView('about', '', false);
    } else if (state.page === 'about') {
      const currentHash = window.location.hash;
      setPageView('home', currentHash, false);
    }
  };

  window.addEventListener('hashchange', handleUrlRouteChange);
  window.addEventListener('popstate', handleUrlRouteChange);

  // Admin Google Login (Firebase Auth)
  const googleLoginBtn = document.getElementById('admin-google-login-btn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      const dict = translations[state.lang];
      const errEl = document.getElementById('admin-login-error');
      errEl.classList.add('hidden');
      try {
        const user = await signInWithGoogle();
        const authorized = await isCurrentUserAdmin(user);
        if (!authorized) {
          await signOutFirebase();
          errEl.textContent = dict.admin_not_authorized || 'ئەم ئیمەیڵە مۆڵەتی ئەدمینی نییە.';
          errEl.classList.remove('hidden');
          return;
        }
        state.firebaseAdmin = true;
        await ensureFirestoreSeeded();
        attachAdminMessagesListener();
        updateAdminAuthUI(true);
      } catch (err) {
        console.error('Google Sign-In error:', err);
        errEl.textContent = err?.message || 'Google login failed';
        errEl.classList.remove('hidden');
      }
    });
  }

  // Admin Password Login (Local Python backend fallback)
  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('admin-login-error');
    errEl.classList.add('hidden');
    const password = document.getElementById('admin-password').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Login failed';
        errEl.classList.remove('hidden');
        return;
      }
      state.adminToken = data.token;
      sessionStorage.setItem('mis_admin_token', data.token);
      document.getElementById('admin-password').value = '';
      updateAdminAuthUI(true);
    } catch {
      errEl.textContent = t('admin_google_btn');
      errEl.classList.remove('hidden');
    }
  });

  // Admin Logout
  document.getElementById('admin-logout-btn').addEventListener('click', () => {
    handleAdminUnauthorized();
  });

  // Admin Cancel Edit
  document.getElementById('admin-cancel-edit').addEventListener('click', () => {
    resetAdminForm();
  });

  // Admin Tabs & Refresh Messages
  document.querySelectorAll('[data-admin-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const targetTab = tabBtn.getAttribute('data-admin-tab') || 'news';
      switchAdminTab(targetTab);
      if (targetTab === 'messages') {
        fetchMessages();
      }
    });
  });
  document.getElementById('admin-refresh-messages').addEventListener('click', () => {
    fetchMessages();
  });

  // Admin News Custom Image Upload (Compressed Data URL for permanent Firestore storage)
  document.getElementById('news-image-file').addEventListener('change', async (e) => {
    const dict = translations[state.lang];
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadStatus(dict.admin_upload_err, true);
      e.target.value = '';
      return;
    }

    setUploadStatus(dict.admin_upload_uploading, false);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 1200, 0.82);
      if (state.firebaseAdmin || !state.adminToken) {
        setUploadedNewsPreview(compressedDataUrl);
        setUploadStatus(dict.admin_upload_done, false);
        return;
      }

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.adminToken}`,
        },
        body: JSON.stringify({ filename: file.name, data_url: compressedDataUrl }),
      });
      if (res.status === 401) {
        handleAdminUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setUploadedNewsPreview(compressedDataUrl);
        setUploadStatus(dict.admin_upload_done, false);
        return;
      }
      setUploadedNewsPreview(data.url);
      setUploadStatus(dict.admin_upload_done, false);
    } catch {
      try {
        const fallbackDataUrl = await compressImageToDataUrl(file, 1200, 0.82);
        setUploadedNewsPreview(fallbackDataUrl);
        setUploadStatus(dict.admin_upload_done, false);
      } catch {
        setUploadStatus(dict.admin_upload_err, true);
      }
    } finally {
      e.target.value = '';
    }
  });

  document.getElementById('news-image-clear-btn').addEventListener('click', () => {
    setUploadedNewsPreview('');
    setUploadStatus('');
  });

  // Admin Save (Create or Update) News
  document.getElementById('admin-news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dict = translations[state.lang];
    const editId = document.getElementById('news-edit-id').value;
    const payload = {
      category: document.getElementById('news-category').value,
      image_key: document.getElementById('news-image-key').value,
      image_url: document.getElementById('news-image-url').value.trim(),
      published_at: document.getElementById('news-date').value,
      title_ku: document.getElementById('news-title-ku').value.trim(),
      title_ar: document.getElementById('news-title-ar').value.trim(),
      title_en: document.getElementById('news-title-en').value.trim(),
      body_ku: document.getElementById('news-body-ku').value.trim(),
      body_ar: document.getElementById('news-body-ar').value.trim(),
      body_en: document.getElementById('news-body-en').value.trim(),
    };

    if (state.firebaseAdmin && auth.currentUser) {
      try {
        await saveFirestoreNews(editId || '', payload);
        resetAdminForm();
        showAdminFeedback(dict.admin_saved_ok, false);
      } catch (err) {
        showAdminFeedback(err?.message || 'Failed to save to Firestore', true);
      }
      return;
    }

    const url = editId ? `/api/news/${editId}` : '/api/news';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      handleAdminUnauthorized();
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      showAdminFeedback(data.error || 'Failed to save', true);
      return;
    }

    resetAdminForm();
    await fetchNews();
    showAdminFeedback(dict.admin_saved_ok, false);
  });

  // Admin Staff Cancel Edit
  document.getElementById('admin-staff-cancel-edit').addEventListener('click', () => {
    resetAdminStaffForm();
  });

  // Admin Staff Custom Photo Upload (Compressed Data URL for permanent Firestore storage)
  document.getElementById('staff-photo-file').addEventListener('change', async (e) => {
    const dict = translations[state.lang];
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setStaffUploadStatus(dict.admin_upload_err, true);
      e.target.value = '';
      return;
    }

    setStaffUploadStatus(dict.admin_upload_uploading, false);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 900, 0.82);
      if (state.firebaseAdmin || !state.adminToken) {
        setUploadedStaffPhotoPreview(compressedDataUrl);
        setStaffUploadStatus(dict.admin_upload_done, false);
        return;
      }

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.adminToken}`,
        },
        body: JSON.stringify({ folder: 'staff', filename: file.name, data_url: compressedDataUrl }),
      });
      if (res.status === 401) {
        handleAdminUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setUploadedStaffPhotoPreview(compressedDataUrl);
        setStaffUploadStatus(dict.admin_upload_done, false);
        return;
      }
      setUploadedStaffPhotoPreview(data.url);
      setStaffUploadStatus(dict.admin_upload_done, false);
    } catch {
      try {
        const fallbackDataUrl = await compressImageToDataUrl(file, 900, 0.82);
        setUploadedStaffPhotoPreview(fallbackDataUrl);
        setStaffUploadStatus(dict.admin_upload_done, false);
      } catch {
        setStaffUploadStatus(dict.admin_upload_err, true);
      }
    } finally {
      e.target.value = '';
    }
  });

  document.getElementById('staff-photo-clear-btn').addEventListener('click', () => {
    setUploadedStaffPhotoPreview('');
    setStaffUploadStatus('');
  });

  // Admin Save (Create or Update) Staff Member
  document.getElementById('admin-staff-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dict = translations[state.lang];
    const editId = document.getElementById('staff-edit-id').value;
    const orderVal = Number(document.getElementById('staff-order').value);
    const payload = {
      role_key: document.getElementById('staff-role').value,
      email: document.getElementById('staff-email').value.trim(),
      display_order: Number.isFinite(orderVal) && orderVal > 0 ? orderVal : 0,
      name_ku: document.getElementById('staff-name-ku').value.trim(),
      name_ar: document.getElementById('staff-name-ar').value.trim(),
      name_en: document.getElementById('staff-name-en').value.trim(),
      photo_url: document.getElementById('staff-photo-url').value.trim(),
    };

    if (state.firebaseAdmin && auth.currentUser) {
      try {
        await saveFirestoreStaff(editId || '', payload, state.staff.length + 1);
        resetAdminStaffForm();
        showAdminStaffFeedback(dict.admin_staff_saved_ok, false);
      } catch (err) {
        showAdminStaffFeedback(err?.message || 'Failed to save to Firestore', true);
      }
      return;
    }

    const url = editId ? `/api/staff/${editId}` : '/api/staff';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      handleAdminUnauthorized();
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      showAdminStaffFeedback(data.error || 'Failed to save', true);
      return;
    }

    resetAdminStaffForm();
    await fetchStaff();
    showAdminStaffFeedback(dict.admin_staff_saved_ok, false);
  });

  // Contact Form Submission (Saves directly to Firebase Firestore + optional local API)
  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dict = translations[state.lang];
    const feedback = document.getElementById('contact-feedback');
    const submitBtn = document.getElementById('contact-submit-btn');

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || message.length < 5) {
      feedback.textContent = dict.form_err_required;
      feedback.className = 'rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700';
      feedback.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = dict.form_sending;

    try {
      let savedToFirestore = false;
      try {
        await createFirestoreContactMessage({ name, email, subject, message });
        savedToFirestore = true;
      } catch (fsErr) {
        console.warn('Firestore contact save warning:', fsErr);
      }

      try {
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message }),
        });
      } catch {
        // Ignore when running on static Netlify host
      }

      if (savedToFirestore) {
        document.getElementById('contact-form').reset();
        feedback.textContent = dict.form_success;
        feedback.className = 'rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800';
        feedback.classList.remove('hidden');
      } else {
        feedback.textContent = dict.error_retry;
        feedback.className = 'rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700';
        feedback.classList.remove('hidden');
      }
    } catch {
      feedback.textContent = dict.error_retry;
      feedback.className = 'rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700';
      feedback.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = dict.form_submit;
    }
  });
}

function attachAdminMessagesListener() {
  if (state.messagesUnsub) {
    state.messagesUnsub();
    state.messagesUnsub = null;
  }
  state.messagesUnsub = onSnapshot(
    collection(db, 'messages'),
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      items.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      state.messages = items;
      renderAdminMessages();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    }
  );
}

function setupFirebaseListeners() {
  // Real-time News listener from Firestore
  onSnapshot(
    collection(db, 'news'),
    (snapshot) => {
      if (!snapshot.empty) {
        state.hasFirestoreNews = true;
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        items.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
        state.news = items;
        renderNews();
        renderAdminNewsList();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'news');
    }
  );

  // Real-time Staff listener from Firestore
  onSnapshot(
    collection(db, 'staff'),
    (snapshot) => {
      if (!snapshot.empty) {
        state.hasFirestoreStaff = true;
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            email: data.academic_email || data.email || '',
          };
        });
        items.sort((a, b) => Number(a.display_order || 99) - Number(b.display_order || 99));
        state.staff = items;
        renderStaff();
        renderAdminStaffList();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    }
  );

  // Firebase Auth listener for persistent Admin session
  onAuthStateChanged(auth, async (user) => {
    if (user && (await isCurrentUserAdmin(user))) {
      state.firebaseAdmin = true;
      try {
        await ensureFirestoreSeeded();
      } catch (seedErr) {
        console.warn('Firestore initial seed warning:', seedErr);
      }
      attachAdminMessagesListener();
      updateAdminAuthUI(true);
    } else if (!state.adminToken) {
      state.firebaseAdmin = false;
      if (state.messagesUnsub) {
        state.messagesUnsub();
        state.messagesUnsub = null;
      }
      updateAdminAuthUI(false);
    }
  });
}

async function init() {
  // Bind static generated assets
  document.getElementById('hero-image').src = heroVisualImg;
  document.getElementById('about-image').src = aboutMisDeskImg;

  setupEventListeners();
  applyLanguage();
  renderCourses();
  renderStaff();
  renderNews();
  setupFirebaseListeners();

  if (isAboutUrl()) {
    setPageView('about', '', false);
  }
  if (isAdminUrl()) {
    openAdmin();
  }

  try {
    await Promise.all([fetchCourses(), fetchStaff(), fetchNews()]);
  } catch (err) {
    console.error('Initialization fetch error:', err);
  }
}

init();
