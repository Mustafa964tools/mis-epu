export const INITIAL_COURSES = [
  { id: 1, semester: 1, item_no: 1, code: 'KUR101', title_en: 'Kurdology', title_ku: 'کوردۆلۆجی', title_ar: 'الكوردولوجيا', theoretical_hrs: 3, practical_hrs: 0, total_hrs: 3, ects: 5, workload_hrs: 125, subject_type: 'Request', language: 'Kurdish' },
  { id: 2, semester: 1, item_no: 2, code: 'ENS102', title_en: 'English Skills / 1', title_ku: 'کارامەییەکانی ئینگلیزی 1', title_ar: 'مهارات اللغة الإنجليزية 1', theoretical_hrs: 2, practical_hrs: 2, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Request', language: 'English' },
  { id: 3, semester: 1, item_no: 3, code: 'COE103', title_en: 'Computer Essentials', title_ku: 'بنەماکانی کۆمپیوتەر', title_ar: 'أساسيات الحاسوب', theoretical_hrs: 0, practical_hrs: 3, total_hrs: 3, ects: 4, workload_hrs: 100, subject_type: 'Request', language: 'English' },
  { id: 4, semester: 1, item_no: 4, code: 'BAP104', title_en: 'Business Administration Principles', title_ku: 'بنەماکانی کارگێڕیی کار', title_ar: 'مبادئ إدارة الأعمال', theoretical_hrs: 2, practical_hrs: 3, total_hrs: 5, ects: 8, workload_hrs: 200, subject_type: 'Core', language: 'Kurdish / English' },
  { id: 5, semester: 1, item_no: 5, code: 'STP105', title_en: 'Statistics Principles', title_ku: 'بنەماکانی ئامار', title_ar: 'مبادئ الإحصاء', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 7, workload_hrs: 175, subject_type: 'Core', language: 'English' },

  { id: 6, semester: 2, item_no: 1, code: 'ENS201', title_en: 'English Skills / 2', title_ku: 'کارامەییەکانی ئینگلیزی 2', title_ar: 'مهارات اللغة الإنجليزية 2', theoretical_hrs: 1, practical_hrs: 1, total_hrs: 2, ects: 4, workload_hrs: 100, subject_type: 'Request', language: 'English' },
  { id: 7, semester: 2, item_no: 2, code: 'ISM202', title_en: 'Information System Management', title_ku: 'بەڕێوەبردنی سیستەمی زانیاری', title_ar: 'إدارة نظم المعلومات', theoretical_hrs: 2, practical_hrs: 3, total_hrs: 5, ects: 8, workload_hrs: 200, subject_type: 'Core', language: 'English' },
  { id: 8, semester: 2, item_no: 3, code: 'PRF203', title_en: 'Programming Fundamentals / C++', title_ku: 'بنەماکانی پڕۆگرامسازی (C++)', title_ar: 'أساسيات البرمجة (C++)', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 9, semester: 2, item_no: 4, code: 'MAP204', title_en: 'Marketing Principles', title_ku: 'بنەماکانی بازاڕگەری', title_ar: 'مبادئ التسويق', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 10, semester: 2, item_no: 5, code: 'WED205', title_en: 'Web Design', title_ku: 'دیزاینی وێب', title_ar: 'تصميم الويب', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },

  { id: 11, semester: 3, item_no: 1, code: 'HRM301', title_en: 'HRM', title_ku: 'بەڕێوەبردنی سەرچاوە مرۆییەکان', title_ar: 'إدارة الموارد البشرية', theoretical_hrs: 2, practical_hrs: 2, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'Kurdish / English' },
  { id: 12, semester: 3, item_no: 2, code: 'ELB302', title_en: 'English Language for Business / 1', title_ku: 'زمانی ئینگلیزی بۆ کار 1', title_ar: 'اللغة الإنجليزية للأعمال 1', theoretical_hrs: 2, practical_hrs: 2, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 13, semester: 3, item_no: 3, code: 'ADP303', title_en: 'Advanced Programming / C++', title_ku: 'پڕۆگرامسازیی پێشکەوتوو (C++)', title_ar: 'البرمجة المتقدمة (C++)', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 14, semester: 3, item_no: 4, code: 'DAT304', title_en: 'Database', title_ku: 'داتابەیس', title_ar: 'قواعد البيانات', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 15, semester: 3, item_no: 5, code: 'WEB305', title_en: 'Web Development', title_ku: 'گەشەپێدانی وێب', title_ar: 'تطوير الويب', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },

  { id: 16, semester: 4, item_no: 1, code: 'MAS401', title_en: 'Management Statistics', title_ku: 'ئاماری کارگێڕی', title_ar: 'الإحصاء الإداري', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 17, semester: 4, item_no: 2, code: 'ELB402', title_en: 'English Language for Business / 2', title_ku: 'زمانی ئینگلیزی بۆ کار 2', title_ar: 'اللغة الإنجليزية للأعمال 2', theoretical_hrs: 2, practical_hrs: 2, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 18, semester: 4, item_no: 3, code: 'KNM403', title_en: 'Knowledge Management', title_ku: 'بەڕێوەبردنی زانست', title_ar: 'إدارة المعرفة', theoretical_hrs: 2, practical_hrs: 2, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'Kurdish / English / Arabic' },
  { id: 19, semester: 4, item_no: 4, code: 'BCN404', title_en: 'Business Communication & Network', title_ku: 'پەیوەندیی کار و تۆڕەکان', title_ar: 'اتصالات الأعمال والشبكات', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
  { id: 20, semester: 4, item_no: 5, code: 'ADD405', title_en: 'Advanced Database', title_ku: 'داتابەیسی پێشکەوتوو', title_ar: 'قواعد البيانات المتقدمة', theoretical_hrs: 1, practical_hrs: 3, total_hrs: 4, ects: 6, workload_hrs: 150, subject_type: 'Core', language: 'English' },
];

export const INITIAL_STAFF = [
  { id: 'staff_1', name: 'گەیلان غازی حەمشین', name_ku: 'گەیلان غازی حەمشین', name_ar: 'كيلان غازي حمشين', name_en: 'Gaylan Ghazi Hamshin', role_key: 'head', email: 'gaylan.hamshin@epu.edu.iq', academic_email: 'gaylan.hamshin@epu.edu.iq', photo_url: '/assets/staff/gaylan.jpg', display_order: 1 },
  { id: 'staff_2', name: 'فاتیمە ڕەمەزان ئیسماعیل', name_ku: 'فاتیمە ڕەمەزان ئیسماعیل', name_ar: 'فاطمة رمضان إسماعيل', name_en: 'Fatimah Ramadhan Ismael', role_key: 'lecturer', email: 'fatimah.ismael@epu.edu.iq', academic_email: 'fatimah.ismael@epu.edu.iq', photo_url: '/assets/staff/fatimah.jpg', display_order: 2 },
  { id: 'staff_3', name: 'هاوژین کەمال عومەر', name_ku: 'هاوژین کەمال عومەر', name_ar: 'هاوجين كمال عمر', name_en: 'Hawzhin Kamal Omar', role_key: 'lecturer', email: 'hawzhin.omar@epu.edu.iq', academic_email: 'hawzhin.omar@epu.edu.iq', photo_url: '/assets/staff/hawzhin.jpg', display_order: 3 },
  { id: 'staff_4', name: 'عەلی حەسەن حوسێن', name_ku: 'عەلی حەسەن حوسێن', name_ar: 'علي حسن حسين', name_en: 'Ali Hasan Hussin', role_key: 'lecturer', email: 'ali.hussien@epu.edu.iq', academic_email: 'ali.hussien@epu.edu.iq', photo_url: '/assets/staff/ali.jpg', display_order: 4 },
  { id: 'staff_5', name: 'سالم یاسین حەسیب', name_ku: 'سالم یاسین حەسیب', name_ar: 'سالم ياسين حسيب', name_en: 'Salim Yasin Hasib', role_key: 'lecturer', email: 'salim.haseeb@epu.edu.iq', academic_email: 'salim.haseeb@epu.edu.iq', photo_url: '/assets/staff/salim.jpg', display_order: 5 },
  { id: 'staff_6', name: 'هاوکار خەتاب ڕەحمان', name_ku: 'هاوکار خەتاب ڕەحمان', name_ar: 'هاوكار خطاب رحمان', name_en: 'Hawkar Khatab Rahman', role_key: 'doctor', email: 'hawkar.rahman@epu.edu.iq', academic_email: 'hawkar.rahman@epu.edu.iq', photo_url: '/assets/staff/hawkar.jpg', display_order: 6 },
  { id: 'staff_7', name: 'سەمیر تەلعەت بیلال', name_ku: 'سەمیر تەلعەت بیلال', name_ar: 'سمير طلعت بلال', name_en: 'Samir Talat Bilal', role_key: 'lecturer', email: 'samir.bilal@epu.edu.iq', academic_email: 'samir.bilal@epu.edu.iq', photo_url: '/assets/staff/samir.jpg', display_order: 7 },
  { id: 'staff_8', name: 'ئەسما تۆفیق حەمەد', name_ku: 'ئەسما تۆفیق حەمەد', name_ar: 'أسماء توفيق حمد', name_en: 'Asmaa Tofiq Hamad', role_key: 'lecturer', email: 'asma.hamad@epu.edu.iq', academic_email: 'asma.hamad@epu.edu.iq', photo_url: '/assets/staff/asmaa.jpg', display_order: 8 },
  { id: 'staff_9', name: 'شیاو ڕەشید ئەبوبەکر', name_ku: 'شیاو ڕەشید ئەبوبەکر', name_ar: 'شياو رشيد أبوبكر', name_en: 'Sheyaw Rasheed Abubaker', role_key: 'lecturer', email: 'sheyaw.abubaker@epu.edu.iq', academic_email: 'sheyaw.abubaker@epu.edu.iq', photo_url: '/assets/staff/sheyaw.jpg', display_order: 9 },
  { id: 'staff_10', name: 'بەهرە محەمەد شەریف ڕەشید', name_ku: 'بەهرە محەمەد شەریف ڕەشید', name_ar: 'بهرة محمد شريف رشيد', name_en: 'Bahra Mohamed Sharif Rashid', role_key: 'lecturer', email: 'bahra.rashid@epu.edu.iq', academic_email: 'bahra.rashid@epu.edu.iq', photo_url: '/assets/staff/bahra.jpg', display_order: 10 },
  { id: 'staff_11', name: 'ئاورینگ محەمەد موحیەددین', name_ku: 'ئاورینگ محەمەد موحیەددین', name_ar: 'آورينك محمد محيي الدين', name_en: 'Awrng Muhammad Muhyadden', role_key: 'doctor', email: 'awrng.muhyadden@epu.edu.iq', academic_email: 'awrng.muhyadden@epu.edu.iq', photo_url: '/assets/staff/awrng.jpg', display_order: 11 },
  { id: 'staff_12', name: 'سەیران عەبدولڕەزاق ئەحمەد', name_ku: 'سەیران عەبدولڕەزاق ئەحمەد', name_ar: 'سيران عبدالرزاق أحمد', name_en: 'Sayran Alabdulrazaq Ahmad', role_key: 'lecturer', email: 'sayran.ahmad@epu.edu.iq', academic_email: 'sayran.ahmad@epu.edu.iq', photo_url: '/assets/staff/sayran.jpg', display_order: 12 },
  { id: 'staff_13', name: 'ژیان ئیبراهیم عومەر', name_ku: 'ژیان ئیبراهیم عومەر', name_ar: 'جيان إبراهيم عمر', name_en: 'Zhian Ibrahim Omar', role_key: 'lecturer', email: 'zhian.omer@epu.edu.iq', academic_email: 'zhian.omer@epu.edu.iq', photo_url: '/assets/staff/zhian.jpg', display_order: 13 },
  { id: 'staff_14', name: 'ڕێباز بەهرام مستەفا', name_ku: 'ڕێباز بەهرام مستەفا', name_ar: 'ريباز بهرام مصطفى', name_en: 'Rebaz Bahram Mustafa', role_key: 'lecturer', email: 'rebaz.mustafa@epu.edu.iq', academic_email: 'rebaz.mustafa@epu.edu.iq', photo_url: '/assets/staff/rebaz.jpg', display_order: 14 },
  { id: 'staff_15', name: 'شەهلا هێمن ئیسماعیل', name_ku: 'شەهلا هێمن ئیسماعیل', name_ar: 'شهلا هيمن إسماعيل', name_en: 'Shahla Hemn Ismail', role_key: 'lecturer', email: 'shahla.ismail@epu.edu.iq', academic_email: 'shahla.ismail@epu.edu.iq', photo_url: '/assets/staff/shahla.jpg', display_order: 15 },
  { id: 'staff_16', name: 'فەرهاد سەدیق محەمەد', name_ku: 'فەرهاد سەدیق محەمەد', name_ar: 'فرهاد صديق محمد', name_en: 'Farhad Sadeeq Muhammad', role_key: 'doctor', email: 'farhad.muhamad@epu.edu.iq', academic_email: 'farhad.muhamad@epu.edu.iq', photo_url: '/assets/staff/farhad.jpg', display_order: 16 },
  { id: 'staff_17', name: 'ئیمان سەردار قادر', name_ku: 'ئیمان سەردار قادر', name_ar: 'إيمان سردار قادر', name_en: 'Iman Sardar Qadir', role_key: 'lecturer', email: 'iman.qadir@epu.edu.iq', academic_email: 'iman.qadir@epu.edu.iq', photo_url: '/assets/staff/iman.jpg', display_order: 17 },
];

export const INITIAL_NEWS = [
  {
    id: 'news_dr_hawkar_phd',
    category: 'announcement',
    title_ku: 'پیرۆزبایی بەشی سیستەمی زانیاری کارگێڕی لە دکتۆر هاوکار خەتاب',
    title_ar: 'قسم نظم المعلومات الإدارية يهنئ الدكتور هاوكار خطاب بمناسبة مناقشة رسالة الدكتوراه',
    title_en: 'Management Information Systems Department Congratulates Dr. Hawkar Khattab on Successful PhD Defense',
    summary_ku: 'بەشی سیستەمی زانیاری کارگێڕی پیرۆزبایی لە مامۆستای بەڕێز (دکتۆر هاوکار خطاب) دەکات بە بۆنەی سەرکەوتووانە تاوتوێکردنی تێزی دکتۆراکەیان لە بواری کارگێڕیدا.',
    summary_ar: 'يهنئ قسم نظم المعلومات الإدارية الأستاذ الفاضل (الدكتور هاوكار خطاب) بمناسبة المناقشة الناجحة لرسالة الدكتوراه الخاصة به في مجال الإدارة.',
    summary_en: 'The Management Information Systems Department congratulates the esteemed lecturer (Dr. Hawkar Khattab) on the successful defense of his PhD thesis in the field of Administration.',
    body_ku:
      'بەشی سیستەمی زانیاری کارگێڕی پیرۆزبایی لە مامۆستای بەڕێز (دکتۆر هاوکار خطاب) دەکات بە بۆنەی سەرکەوتووانە تاوتوێکردنی تێزی دکتۆراکەیان بە ناونیشانی:\n(The Influence of Servant Leadership on Proactive Work Behavior through the Mediating Role of Organizational Agility: A Study of Private Hospitals in Iraqi Kurdistan Region) لە بوارى کارگێڕیدا.\nگەرمترین پیرۆزبایی ئاراستەی مامۆستای هێژا (دکتۆر هاوکار خطاب) دەکەین، هیوای سەرکەوتن و پێشکەوتنی بەردەوامی لە ژیانی ئەکادیمی و زانستیدا بۆ دەخوازین. هەمیشە سەرکەوتوو بن لە خزمەتکردن بە زانست و دەرچووانی بەشەکەمان.',
    body_ar:
      'يهنئ قسم نظم المعلومات الإدارية الأستاذ الفاضل (الدكتور هاوكار خطاب) بمناسبة المناقشة الناجحة لرسالة الدكتوراه الخاصة به والتي تحمل عنوان:\n(The Influence of Servant Leadership on Proactive Work Behavior through the Mediating Role of Organizational Agility: A Study of Private Hospitals in Iraqi Kurdistan Region) في مجال الإدارة.\nنتقدم بأحر التهاني للأستاذ القدير (الدكتور هاوكار خطاب)، متمنين له دوام التوفيق والنجاح والتقدم المستمر في مسيرته الأكاديمية والعلمية. نتمنى له النجاح الدائم في خدمة العلم وخريجي قسمنا.',
    body_en:
      'The Management Information Systems Department congratulates the esteemed lecturer (Dr. Hawkar Khattab) on the successful defense of his PhD thesis titled:\n(The Influence of Servant Leadership on Proactive Work Behavior through the Mediating Role of Organizational Agility: A Study of Private Hospitals in Iraqi Kurdistan Region) in the field of Administration.\nWe extend our warmest congratulations to the respected lecturer (Dr. Hawkar Khattab), wishing him continued success and progress in his academic and scientific career. May he always be successful in serving science and the graduates of our department.',
    image_key: 'seminar',
    image_url: '/assets/news/dr_hawkar_phd.jpg',
    published_at: '2026-11-15',
  },
  {
    id: 'news_barzan_trip',
    category: 'event',
    title_ku: 'بەشی سیستەمی زانیاری کارگێڕی گەشتێکی زانستییان بۆ دەڤەری بارزان ئەنجامدا',
    title_ar: 'قسم نظم المعلومات الإدارية يجري رحلة علمية إلى منطقة بارزان',
    title_en: 'Management Information Systems Department Conducts a Scientific Trip to Barzan Region',
    summary_ku: 'لەژێر چاودێری بەڕێز پ.ی.د. سەرسام خلیل شوانی ڕاگری پەیمانگە، بەشی سیستەمی زانیاری کارگێڕی گەشتێکی زانستییان ئەنجامدا بۆ دەڤەری بارزان و مەزاری نەمران بۆ قوتابیانی بەیانیان و ئێواران.',
    summary_ar: 'تحت إشراف السيد عميد المعهد أ.م.د. سرسام خليل شواني، أجرى قسم نظم المعلومات الإدارية رحلة علمية إلى منطقة بارزان ومزار الخالدين لطلبة الدراسات الصباحية والمسائية.',
    summary_en: "Under the supervision of the Institute's Dean, Assist. Prof. Dr. Sarsam Khalil Shawani, the Management Information Systems Department organized a scientific trip to the Barzan region and the Memorial of the Immortals.",
    body_ku:
      'ڕۆژی یەک شەممە 15ی شوباتی 2026 لەژێر چاودێری بەڕێز پ.ی.د. سەرسام خلیل شوانی ڕاگری پەیمانگە، بەشی سیستەمی زانیاری کارگێڕی، گەشتێکی زانستییان ئەنجامدا بۆ دەڤەری بارزان و مەزاری نەمران بۆ قوتابیانی بەیانیان و ئێواران. لەلایەن بەڕێز شێخ خەڵات بارزانی نوێنەری سەرۆک بارزانی پێشوازییان لێکرا، بە ئامادەبوونی سەرۆک بەش م. گیلان غازی حمشین و م. بەختیار عبدالرزاق بڕیاردەری بەش و هەر یەک لە مامۆستایان م. هاوکار خطاب و م. بەهرە محمد و م. سمیر طلعت و م. ئیمان سردار گەشتەکە ئەنجامدرا.',
    body_ar:
      'في يوم الأحد 15 شباط 2026، وتحت إشراف السيد عميد المعهد أ.م.د. سرسام خليل شواني، أجرى قسم نظم المعلومات الإدارية رحلة علمية إلى منطقة بارزان ومزار الخالدين لطلبة الدراسات الصباحية والمسائية. وقد تم استقبالهم من قبل السيد الشيخ خلات بارزاني ممثل الرئيس بارزاني. جرت الرحلة بحضور رئيس القسم أ. كيلان غازي حمشين، ومقرر القسم أ. بختيار عبدالرزاق، وكل من الأساتذة: أ. هاوكار خطاب، أ. بهرة محمد، أ. سمير طلعت، وأ. إيمان سردار.',
    body_en:
      "On Sunday, February 15, 2026, under the supervision of the Institute's Dean, Assist. Prof. Dr. Sarsam Khalil Shawani, the Management Information Systems Department organized a scientific trip to the Barzan region and the Memorial of the Immortals for both morning and evening shift students. They were welcomed by Sheikh Khalat Barzani, the representative of President Barzani. The trip took place in the presence of the Head of the Department, Lect. Gelan Ghazi Hamsheen, the Department Rapporteur, Lect. Bakhtiar Abdulrazaq, and lecturers Hawkar Khattab, Bahra Mohammed, Samir Talaat, and Eman Sardar.",
    image_key: 'campus',
    image_url: '/assets/news/barzan_scientific_trip.jpg',
    published_at: '2026-02-15',
  },
];
