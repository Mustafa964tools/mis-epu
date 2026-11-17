"""
MIS Department Web Application — Erbil Technical Administration Institute (EPU)
Backend powered by PyFrame (Python 3.10) + SQLite3.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime
from pathlib import Path

from pyframe import PyFrame, Request, jsonify

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "mis_department.db"
NEWS_UPLOAD_DIR = BASE_DIR.parent / "public" / "assets" / "news"
STAFF_UPLOAD_DIR = BASE_DIR.parent / "public" / "assets" / "staff"
ADMIN_PASSWORD = os.environ.get("MIS_ADMIN_PASSWORD", "epu2026")
SECRET_KEY = os.environ.get("MIS_SECRET_KEY", "epu-etai-mis-2026-secret").encode("utf-8")

app = PyFrame(__name__)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_admin_token() -> str:
    expires_at = int(time.time()) + 60 * 60 * 12  # 12 hours
    payload = f"admin:{expires_at}"
    sig = hmac.new(SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_admin_token(auth_header: str) -> bool:
    if not auth_header.startswith("Bearer "):
        return False
    token = auth_header[7:].strip()
    parts = token.split(":")
    if len(parts) != 3:
        return False
    role, exp_str, sig = parts
    if role != "admin":
        return False
    try:
        if int(exp_str) < int(time.time()):
            return False
    except ValueError:
        return False
    expected = hmac.new(SECRET_KEY, f"{role}:{exp_str}".encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected)


def init_db() -> None:
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            semester INTEGER NOT NULL,
            item_no INTEGER NOT NULL,
            code TEXT NOT NULL UNIQUE,
            title_en TEXT NOT NULL,
            title_ku TEXT NOT NULL,
            title_ar TEXT NOT NULL,
            theoretical_hrs INTEGER NOT NULL,
            practical_hrs INTEGER NOT NULL,
            total_hrs INTEGER NOT NULL,
            ects INTEGER NOT NULL,
            workload_hrs INTEGER NOT NULL,
            subject_type TEXT NOT NULL,
            language TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_ku TEXT NOT NULL DEFAULT '',
            name_ar TEXT NOT NULL DEFAULT '',
            name_en TEXT NOT NULL DEFAULT '',
            role_key TEXT NOT NULL,
            specialty_ku TEXT NOT NULL,
            specialty_ar TEXT NOT NULL,
            specialty_en TEXT NOT NULL,
            email TEXT NOT NULL,
            office_hours TEXT NOT NULL,
            photo_url TEXT DEFAULT '',
            display_order INTEGER NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title_ku TEXT NOT NULL,
            title_ar TEXT NOT NULL,
            title_en TEXT NOT NULL,
            summary_ku TEXT NOT NULL,
            summary_ar TEXT NOT NULL,
            summary_en TEXT NOT NULL,
            body_ku TEXT NOT NULL,
            body_ar TEXT NOT NULL,
            body_en TEXT NOT NULL,
            image_key TEXT NOT NULL DEFAULT 'seminar',
            image_url TEXT NOT NULL DEFAULT '',
            published_at TEXT NOT NULL
        )
        """
    )

    news_cols = {row["name"] for row in cur.execute("PRAGMA table_info(news)").fetchall()}
    if "image_url" not in news_cols:
        cur.execute("ALTER TABLE news ADD COLUMN image_url TEXT NOT NULL DEFAULT ''")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    # Seed official 20 modules across 4 semesters (Bologna Process)
    cur.execute("SELECT COUNT(*) FROM courses")
    if cur.fetchone()[0] == 0:
        courses_seed = [
            # First Semester
            (1, 1, "KUR101", "Kurdology", "کوردۆلۆجی", "الكوردولوجيا", 3, 0, 3, 5, 125, "Request", "Kurdish"),
            (1, 2, "ENS102", "English Skills / 1", "کارامەییەکانی ئینگلیزی 1", "مهارات اللغة الإنجليزية 1", 2, 2, 4, 6, 150, "Request", "English"),
            (1, 3, "COE103", "Computer Essentials", "بنەماکانی کۆمپیوتەر", "أساسيات الحاسوب", 0, 3, 3, 4, 100, "Request", "English"),
            (1, 4, "BAP104", "Business Administration Principles", "بنەماکانی کارگێڕیی کار", "مبادئ إدارة الأعمال", 2, 3, 5, 8, 200, "Core", "Kurdish / English"),
            (1, 5, "STP105", "Statistics Principles", "بنەماکانی ئامار", "مبادئ الإحصاء", 1, 3, 4, 7, 175, "Core", "English"),
            # Second Semester
            (2, 1, "ENS201", "English Skills / 2", "کارامەییەکانی ئینگلیزی 2", "مهارات اللغة الإنجليزية 2", 1, 1, 2, 4, 100, "Request", "English"),
            (2, 2, "ISM202", "Information System Management", "بەڕێوەبردنی سیستەمی زانیاری", "إدارة نظم المعلومات", 2, 3, 5, 8, 200, "Core", "English"),
            (2, 3, "PRF203", "Programming Fundamentals / C++", "بنەماکانی پڕۆگرامسازی (C++)", "أساسيات البرمجة (C++)", 1, 3, 4, 6, 150, "Core", "English"),
            (2, 4, "MAP204", "Marketing Principles", "بنەماکانی بازاڕگەری", "مبادئ التسويق", 1, 3, 4, 6, 150, "Core", "English"),
            (2, 5, "WED205", "Web Design", "دیزاینی وێب", "تصميم الويب", 1, 3, 4, 6, 150, "Core", "English"),
            # Third Semester
            (3, 1, "HRM301", "HRM", "بەڕێوەبردنی سەرچاوە مرۆییەکان", "إدارة الموارد البشرية", 2, 2, 4, 6, 150, "Core", "Kurdish / English"),
            (3, 2, "ELB302", "English Language for Business / 1", "زمانی ئینگلیزی بۆ کار 1", "اللغة الإنجليزية للأعمال 1", 2, 2, 4, 6, 150, "Core", "English"),
            (3, 3, "ADP303", "Advanced Programming / C++", "پڕۆگرامسازیی پێشکەوتوو (C++)", "البرمجة المتقدمة (C++)", 1, 3, 4, 6, 150, "Core", "English"),
            (3, 4, "DAT304", "Database", "داتابەیس", "قواعد البيانات", 1, 3, 4, 6, 150, "Core", "English"),
            (3, 5, "WEB305", "Web Development", "گەشەپێدانی وێب", "تطوير الويب", 1, 3, 4, 6, 150, "Core", "English"),
            # Fourth Semester
            (4, 1, "MAS401", "Management Statistics", "ئاماری کارگێڕی", "الإحصاء الإداري", 1, 3, 4, 6, 150, "Core", "English"),
            (4, 2, "ELB402", "English Language for Business / 2", "زمانی ئینگلیزی بۆ کار 2", "اللغة الإنجليزية للأعمال 2", 2, 2, 4, 6, 150, "Core", "English"),
            (4, 3, "KNM403", "Knowledge Management", "بەڕێوەبردنی زانست", "إدارة المعرفة", 2, 2, 4, 6, 150, "Core", "Kurdish / English / Arabic"),
            (4, 4, "BCN404", "Business Communication & Network", "پەیوەندیی کار و تۆڕەکان", "اتصالات الأعمال والشبكات", 1, 3, 4, 6, 150, "Core", "English"),
            (4, 5, "ADD405", "Advanced Database", "داتابەیسی پێشکەوتوو", "قواعد البيانات المتقدمة", 1, 3, 4, 6, 150, "Core", "English"),
        ]
        cur.executemany(
            """
            INSERT INTO courses (
                semester, item_no, code, title_en, title_ku, title_ar,
                theoretical_hrs, practical_hrs, total_hrs, ects, workload_hrs,
                subject_type, language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            courses_seed,
        )

    # Ensure name_ku, name_ar, name_en columns exist on older SQLite DBs
    staff_cols = {row["name"] for row in cur.execute("PRAGMA table_info(staff)").fetchall()}
    for col_name in ("name_ku", "name_ar", "name_en"):
        if col_name not in staff_cols:
            cur.execute(f"ALTER TABLE staff ADD COLUMN {col_name} TEXT NOT NULL DEFAULT ''")

    canonical_staff = [
        ("گەیلان غازی حەمشین", "گەیلان غازی حەمشین", "كيلان غازي حمشين", "Gaylan Ghazi Hamshin", "head", "بەڕێوەبردنی سیستەمی زانیاری و شیکارکاری", "إدارة نظم المعلومات والتحليل", "Management Information Systems", "gaylan.hamshin@epu.edu.iq", "Sun - Thu · 09:00 - 13:00", "/assets/staff/gaylan.jpg", 1),
        ("فاتیمە ڕەمەزان ئیسماعیل", "فاتیمە ڕەمەزان ئیسماعیل", "فاطمة رمضان إسماعيل", "Fatimah Ramadhan Ismael", "lecturer", "سیستەمی زانیاری کارگێڕی", "نظم المعلومات الإدارية", "Information Systems", "fatimah.ismael@epu.edu.iq", "Sun - Wed · 10:00 - 12:30", "/assets/staff/fatimah.jpg", 2),
        ("هاوژین کەمال عومەر", "هاوژین کەمال عومەر", "هاوجين كمال عمر", "Hawzhin Kamal Omar", "lecturer", "گەشەپێدانی وێب و دیزاین", "تطوير وتصميم الويب", "Web Design & Development", "hawzhin.omar@epu.edu.iq", "Mon - Thu · 09:30 - 12:00", "/assets/staff/hawzhin.jpg", 3),
        ("عەلی حەسەن حوسێن", "عەلی حەسەن حوسێن", "علي حسن حسين", "Ali Hasan Hussin", "lecturer", "داتابەیس و سیستەمی داتا", "قواعد البيانات ونظم البيانات", "Database Systems", "ali.hussien@epu.edu.iq", "Sun - Tue · 10:00 - 13:00", "/assets/staff/ali.jpg", 4),
        ("سالم یاسین حەسیب", "سالم یاسین حەسیب", "سالم ياسين حسيب", "Salim Yasin Hasib", "lecturer", "پڕۆگرامسازی و ئەلگۆریتم", "البرمجة والخوارزميات", "Programming Fundamentals", "salim.haseeb@epu.edu.iq", "Mon - Wed · 09:00 - 12:00", "/assets/staff/salim.jpg", 5),
        ("هاوکار خەتاب ڕەحمان", "هاوکار خەتاب ڕەحمان", "هاوكار خطاب رحمان", "Hawkar Khatab Rahman", "doctor", "تۆڕەکانی کۆمپیوتەر و پەیوەندی", "شبكات الحاسوب والاتصالات", "Computer Networks", "hawkar.rahman@epu.edu.iq", "Sun - Thu · 11:00 - 13:30", "/assets/staff/hawkar.jpg", 6),
        ("سەمیر تەلعەت بیلال", "سەمیر تەلعەت بیلال", "سمير طلعت بلال", "Samir Talat Bilal", "lecturer", "ئامار و شیکردنەوەی کارگێڕی", "الإحصاء والتحليل الإداري", "Management Statistics", "samir.bilal@epu.edu.iq", "Tue - Thu · 09:00 - 12:00", "/assets/staff/samir.jpg", 7),
        ("ئەسما تۆفیق حەمەد", "ئەسما تۆفیق حەمەد", "أسماء توفيق حمد", "Asmaa Tofiq Hamad", "lecturer", "کارگێڕیی کار و سەرچاوە مرۆییەکان", "إدارة الأعمال والموارد البشرية", "Business & HR Management", "asma.hamad@epu.edu.iq", "Sun - Wed · 09:30 - 12:30", "/assets/staff/asmaa.jpg", 8),
        ("شیاو ڕەشید ئەبوبەکر", "شیاو ڕەشید ئەبوبەکر", "شياو رشيد أبوبكر", "Sheyaw Rasheed Abubaker", "lecturer", "بەڕێوەبردنی زانست و کارگێڕی", "إدارة المعرفة والإدارة", "Knowledge Management", "sheyaw.abubaker@epu.edu.iq", "Mon - Thu · 10:00 - 12:30", "/assets/staff/sheyaw.jpg", 9),
        ("بەهرە محەمەد شەریف ڕەشید", "بەهرە محەمەد شەریف ڕەشید", "بهرة محمد شريف رشيد", "Bahra Mohamed Sharif Rashid", "lecturer", "بنەماکانی کارگێڕی و بازاڕگەری", "مبادئ الإدارة والتسويق", "Marketing & Administration", "bahra.rashid@epu.edu.iq", "Sun - Tue · 09:00 - 11:30", "/assets/staff/bahra.jpg", 10),
        ("ئاورینگ محەمەد موحیەددین", "ئاورینگ محەمەد موحیەددین", "آورينك محمد محيي الدين", "Awrng Muhammad Muhyadden", "doctor", "کارامەییەکانی کۆمپیوتەر و ئای تی", "مهارات الحاسوب وتكنولوجيا المعلومات", "Computer Essentials & IT", "awrng.muhyadden@epu.edu.iq", "Wed - Thu · 10:00 - 13:00", "/assets/staff/awrng.jpg", 11),
        ("سەیران عەبدولڕەزاق ئەحمەد", "سەیران عەبدولڕەزاق ئەحمەد", "سيران عبدالرزاق أحمد", "Sayran Alabdulrazaq Ahmad", "lecturer", "زمانی ئینگلیزی بۆ کار", "اللغة الإنجليزية للأعمال", "Business English", "sayran.ahmad@epu.edu.iq", "Sun - Wed · 10:30 - 13:00", "/assets/staff/sayran.jpg", 12),
        ("ژیان ئیبراهیم عومەر", "ژیان ئیبراهیم عومەر", "جيان إبراهيم عمر", "Zhian Ibrahim Omar", "lecturer", "کۆمپیوتەر و سیستەمی ئۆفیس", "الحاسوب وأنظمة المكاتب", "Office & Information Systems", "zhian.omer@epu.edu.iq", "Mon - Thu · 09:00 - 11:30", "/assets/staff/zhian.jpg", 13),
        ("ڕێباز بەهرام مستەفا", "ڕێباز بەهرام مستەفا", "ريباز بهرام مصطفى", "Rebaz Bahram Mustafa", "lecturer", "ئەندازیاری سۆفتوێر و وێب", "هندسة البرمجيات والويب", "Software & Web Engineering", "rebaz.mustafa@epu.edu.iq", "Sun - Thu · 10:00 - 12:30", "/assets/staff/rebaz.jpg", 14),
        ("شەهلا هێمن ئیسماعیل", "شەهلا هێمن ئیسماعیل", "شهلا هيمن إسماعيل", "Shahla Hemn Ismail", "lecturer", "سیستەمی زانیاری و کارگێڕی", "نظم المعلومات والإدارة", "Information Systems & Management", "shahla.ismail@epu.edu.iq", "Sun - Wed · 09:30 - 12:00", "/assets/staff/shahla.jpg", 15),
        ("فەرهاد سەدیق محەمەد", "فەرهاد سەدیق محەمەد", "فرهاد صديق محمد", "Farhad Sadeeq Muhammad", "doctor", "سیستەمی کارگێڕی و تەکنەلۆژیای زانیاری", "النظم الإدارية وتكنولوجيا المعلومات", "Administrative Systems & IT", "farhad.muhamad@epu.edu.iq", "Mon - Thu · 10:00 - 13:00", "/assets/staff/farhad.jpg", 16),
        ("ئیمان سەردار قادر", "ئیمان سەردار قادر", "إيمان سردار قادر", "Iman Sardar Qadir", "lecturer", "سیستەمی زانیاری کارگێڕی", "نظم المعلومات الإدارية", "Management Information Systems", "iman.qadir@epu.edu.iq", "Sun - Thu · 09:30 - 12:30", "/assets/staff/iman.jpg", 17),
    ]

    # Seed department staff members
    cur.execute("SELECT COUNT(*) FROM staff")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            """
            INSERT INTO staff (
                name, name_ku, name_ar, name_en, role_key,
                specialty_ku, specialty_ar, specialty_en,
                email, office_hours, photo_url, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            canonical_staff,
        )

    # Remove legacy placeholder seed news items if present
    cur.execute(
        """
        DELETE FROM news
        WHERE title_en IN (
            'Bologna Process Guidelines & Semester Course Registration',
            'Web Development Course Projects Using Python Frameworks',
            'Preparation for Second-Year Summer Internship Program'
        )
        """
    )

    # Seed official department news items if not already present
    canonical_news = [
        (
            "announcement",
            "پیرۆزبایی بەشی سیستەمی زانیاری کارگێڕی لە دکتۆر هاوکار خەتاب",
            "قسم نظم المعلومات الإدارية يهنئ الدكتور هاوكار خطاب بمناسبة مناقشة رسالة الدكتوراه",
            "Management Information Systems Department Congratulates Dr. Hawkar Khattab on Successful PhD Defense",
            "بەشی سیستەمی زانیاری کارگێڕی پیرۆزبایی لە مامۆستای بەڕێز (دکتۆر هاوکار خطاب) دەکات بە بۆنەی سەرکەوتووانە تاوتوێکردنی تێزی دکتۆراکەیان لە بواری کارگێڕیدا.",
            "يهنئ قسم نظم المعلومات الإدارية الأستاذ الفاضل (الدكتور هاوكار خطاب) بمناسبة المناقشة الناجحة لرسالة الدكتوراه الخاصة به في مجال الإدارة.",
            "The Management Information Systems Department congratulates the esteemed lecturer (Dr. Hawkar Khattab) on the successful defense of his PhD thesis in the field of Administration.",
            "بەشی سیستەمی زانیاری کارگێڕی پیرۆزبایی لە مامۆستای بەڕێز (دکتۆر هاوکار خطاب) دەکات بە بۆنەی سەرکەوتووانە تاوتوێکردنی تێزی دکتۆراکەیان بە ناونیشانی:\n(The Influence of Servant Leadership on Proactive Work Behavior through the Mediating Role of Organizational Agility: A Study of Private Hospitals in Iraqi Kurdistan Region) لە بوارى کارگێڕیدا.\nگەرمترین پیرۆزبایی ئاراستەی مامۆستای هێژا (دکتۆر هاوکار خطاب) دەکەین، هیوای سەرکەوتن و پێشکەوتنی بەردەوامی لە ژیانی ئەکادیمی و زانستیدا بۆ دەخوازین. هەمیشە سەرکەوتوو بن لە خزمەتکردن بە زانست و دەرچووانی بەشەکەمان.",
            "يهنئ قسم نظم المعلومات الإدارية الأستاذ الفاضل (الدكتور هاوكار خطاب) بمناسبة المناقشة الناجحة لرسالة الدكتوراه الخاصة به والتي تحمل عنوان:\n(The Influence of Servant Leadership on Proactive Work Behavior through the Mediating Role of Organizational Agility: A Study of Private Hospitals in Iraqi Kurdistan Region) في مجال الإدارة.\nنتقدم بأحر التهاني للأستاذ القدير (الدكتور هاوكار خطاب)، متمنين له دوام التوفيق والنجاح والتقدم المستمر في مسيرته الأكاديمية والعلمية. نتمنى له النجاح الدائم في خدمة العلم وخريجي قسمنا.",
            "The Management Information Systems Department congratulates the esteemed lecturer (Dr. Hawkar Khattab) on the successful defense of his PhD thesis titled:\n(The Influence of Servant Leadership on Proactive Work Behavior through the Mediating Role of Organizational Agility: A Study of Private Hospitals in Iraqi Kurdistan Region) in the field of Administration.\nWe extend our warmest congratulations to the respected lecturer (Dr. Hawkar Khattab), wishing him continued success and progress in his academic and scientific career. May he always be successful in serving science and the graduates of our department.",
            "seminar",
            "/assets/news/dr_hawkar_phd.jpg",
            "2026-11-15",
        ),
        (
            "event",
            "بەشی سیستەمی زانیاری کارگێڕی گەشتێکی زانستییان بۆ دەڤەری بارزان ئەنجامدا",
            "قسم نظم المعلومات الإدارية يجري رحلة علمية إلى منطقة بارزان",
            "Management Information Systems Department Conducts a Scientific Trip to Barzan Region",
            "لەژێر چاودێری بەڕێز پ.ی.د. سەرسام خلیل شوانی ڕاگری پەیمانگە، بەشی سیستەمی زانیاری کارگێڕی گەشتێکی زانستییان ئەنجامدا بۆ دەڤەری بارزان و مەزاری نەمران بۆ قوتابیانی بەیانیان و ئێواران.",
            "تحت إشراف السيد عميد المعهد أ.م.د. سرسام خليل شواني، أجرى قسم نظم المعلومات الإدارية رحلة علمية إلى منطقة بارزان ومزار الخالدين لطلبة الدراسات الصباحية والمسائية.",
            "Under the supervision of the Institute's Dean, Assist. Prof. Dr. Sarsam Khalil Shawani, the Management Information Systems Department organized a scientific trip to the Barzan region and the Memorial of the Immortals.",
            "ڕۆژی یەک شەممە 15ی شوباتی 2026 لەژێر چاودێری بەڕێز پ.ی.د. سەرسام خلیل شوانی ڕاگری پەیمانگە، بەشی سیستەمی زانیاری کارگێڕی، گەشتێکی زانستییان ئەنجامدا بۆ دەڤەری بارزان و مەزاری نەمران بۆ قوتابیانی بەیانیان و ئێواران. لەلایەن بەڕێز شێخ خەڵات بارزانی نوێنەری سەرۆک بارزانی پێشوازییان لێکرا، بە ئامادەبوونی سەرۆک بەش م. گیلان غازی حمشین و م. بەختیار عبدالرزاق بڕیاردەری بەش و هەر یەک لە مامۆستایان م. هاوکار خطاب و م. بەهرە محمد و م. سمیر طلعت و م. ئیمان سردار گەشتەکە ئەنجامدرا.",
            "في يوم الأحد 15 شباط 2026، وتحت إشراف السيد عميد المعهد أ.م.د. سرسام خليل شواني، أجرى قسم نظم المعلومات الإدارية رحلة علمية إلى منطقة بارزان ومزار الخالدين لطلبة الدراسات الصباحية والمسائية. وقد تم استقبالهم من قبل السيد الشيخ خلات بارزاني ممثل الرئيس بارزاني. جرت الرحلة بحضور رئيس القسم أ. كيلان غازي حمشين، ومقرر القسم أ. بختيار عبدالرزاق، وكل من الأساتذة: أ. هاوكار خطاب، أ. بهرة محمد، أ. سمير طلعت، وأ. إيمان سردار.",
            "On Sunday, February 15, 2026, under the supervision of the Institute's Dean, Assist. Prof. Dr. Sarsam Khalil Shawani, the Management Information Systems Department organized a scientific trip to the Barzan region and the Memorial of the Immortals for both morning and evening shift students. They were welcomed by Sheikh Khalat Barzani, the representative of President Barzani. The trip took place in the presence of the Head of the Department, Lect. Gelan Ghazi Hamsheen, the Department Rapporteur, Lect. Bakhtiar Abdulrazaq, and lecturers Hawkar Khattab, Bahra Mohammed, Samir Talaat, and Eman Sardar.",
            "campus",
            "/assets/news/barzan_scientific_trip.jpg",
            "2026-02-15",
        ),
    ]
    for item in canonical_news:
        existing_news = cur.execute("SELECT id FROM news WHERE image_url = ?", (item[11],)).fetchone()
        if existing_news is None:
            cur.execute(
                """
                INSERT INTO news (
                    category, title_ku, title_ar, title_en,
                    summary_ku, summary_ar, summary_en,
                    body_ku, body_ar, body_en,
                    image_key, image_url, published_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                item,
            )

    # Normalize any previously seeded rows in existing SQLite DB
    digit_trans = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")

    def normalize_text(val: str) -> str:
        if not val:
            return val
        out = val.translate(digit_trans)
        out = out.replace("سیستەمی زانیارییەکانی کارگێڕی", "سیستەمی زانیاری کارگێڕی")
        out = out.replace("سیستەمی زانیاریی کارگێڕی", "سیستەمی زانیاری کارگێڕی")
        out = out.replace("بنکەدراوەی", "داتابەیسی")
        out = out.replace("بنکەدراوە", "داتابەیس")
        out = out.replace("4 سیمستەر", "چوار سیمستەر")
        out = out.replace("سیمستەری 1", "سیمستەری یەکەم")
        out = out.replace("سیمستەری 2", "سیمستەری دووەم")
        out = out.replace("سیمستەری 3", "سیمستەری سێیەم")
        out = out.replace("سیمستەری 4", "سیمستەری چوارەم")
        out = out.replace("للفصول 4", "للفصول الأربعة")
        out = out.replace("4 فصول دراسية", "أربعة فصول دراسية")
        out = out.replace("الفصل 1", "الفصل الأول")
        out = out.replace("الفصل 2", "الفصل الثاني")
        out = out.replace("الفصل 3", "الفصل الثالث")
        out = out.replace("الفصل 4", "الفصل الرابع")
        out = out.replace("all 4 Bologna semesters", "all four Bologna semesters")
        out = out.replace("(4 semesters,", "(four semesters,")
        return out

    for row in cur.execute("SELECT id, title_ku, title_ar FROM courses").fetchall():
        cur.execute(
            "UPDATE courses SET title_ku = ?, title_ar = ? WHERE id = ?",
            (normalize_text(row["title_ku"]), normalize_text(row["title_ar"]), row["id"]),
        )
    for row in cur.execute("SELECT id, specialty_ku, specialty_ar FROM staff").fetchall():
        cur.execute(
            "UPDATE staff SET specialty_ku = ?, specialty_ar = ? WHERE id = ?",
            (normalize_text(row["specialty_ku"]), normalize_text(row["specialty_ar"]), row["id"]),
        )
    for row in cur.execute("SELECT id, title_ku, title_ar, title_en, summary_ku, summary_ar, summary_en, body_ku, body_ar, body_en FROM news").fetchall():
        cur.execute(
            """
            UPDATE news SET
                title_ku = ?, title_ar = ?, title_en = ?,
                summary_ku = ?, summary_ar = ?, summary_en = ?,
                body_ku = ?, body_ar = ?, body_en = ?
            WHERE id = ?
            """,
            (
                normalize_text(row["title_ku"]),
                normalize_text(row["title_ar"]),
                normalize_text(row["title_en"]),
                normalize_text(row["summary_ku"]),
                normalize_text(row["summary_ar"]),
                normalize_text(row["summary_en"]),
                normalize_text(row["body_ku"]),
                normalize_text(row["body_ar"]),
                normalize_text(row["body_en"]),
                row["id"],
            ),
        )

    # Backfill empty trilingual columns on legacy DBs without overwriting admin edits
    for member in canonical_staff:
        _name, name_ku, name_ar, name_en, _role_key, _sp_ku, _sp_ar, _sp_en, _email, _hours, _photo, order_idx = member
        existing = cur.execute(
            "SELECT id, name_ku, name_ar, name_en FROM staff WHERE display_order = ?",
            (order_idx,),
        ).fetchone()
        if existing is not None and (not existing["name_ku"] or not existing["name_ar"] or not existing["name_en"]):
            cur.execute(
                "UPDATE staff SET name_ku = COALESCE(NULLIF(name_ku, ''), ?), name_ar = COALESCE(NULLIF(name_ar, ''), ?), name_en = COALESCE(NULLIF(name_en, ''), ?) WHERE id = ?",
                (name_ku, name_ar, name_en, existing["id"]),
            )

    conn.commit()
    conn.close()


@app.route("/api/health", methods=["GET"])
def health(_req: Request):
    return jsonify({"status": "ok", "engine": "Python 3.10 + PyFrame + SQLite3"})


@app.route("/api/courses", methods=["GET"])
def get_courses(req: Request):
    semester_filter = req.arg("semester", "").strip()
    conn = get_db()
    cur = conn.cursor()
    if semester_filter in {"1", "2", "3", "4"}:
        cur.execute(
            "SELECT * FROM courses WHERE semester = ? ORDER BY semester ASC, item_no ASC",
            (int(semester_filter),),
        )
    else:
        cur.execute("SELECT * FROM courses ORDER BY semester ASC, item_no ASC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"courses": rows})


@app.route("/api/staff", methods=["GET"])
def get_staff(_req: Request):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM staff ORDER BY display_order ASC, id ASC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"staff": rows})


@app.route("/api/news", methods=["GET"])
def get_news(_req: Request):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM news ORDER BY published_at DESC, id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"news": rows})


@app.route("/api/admin/login", methods=["POST"])
def admin_login(req: Request):
    data = req.json()
    password = str(data.get("password", "")).strip()
    if not hmac.compare_digest(password, ADMIN_PASSWORD):
        return jsonify({"error": "وشەی نهێنی هەڵەیە / كلمة المرور غير صحيحة / Invalid password"}, status=401)
    return jsonify({"token": create_admin_token(), "role": "admin"})


@app.route("/api/admin/verify", methods=["GET"])
def admin_verify(req: Request):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"valid": False}, status=401)
    return jsonify({"valid": True})


def sanitize_image_url(raw_url: object, folder: str = "news") -> str:
    url = str(raw_url or "").strip()
    if not url:
        return ""
    prefix = f"/assets/{folder}/"
    pattern = rf"^/assets/{re.escape(folder)}/[A-Za-z0-9_.-]+$"
    if url.startswith(prefix) and ".." not in url and re.match(pattern, url):
        return url
    return ""


@app.route("/api/admin/upload-image", methods=["POST"])
def upload_news_image(req: Request):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)

    data = req.json()
    folder = str(data.get("folder", "news")).strip().lower()
    if folder not in {"news", "staff"}:
        folder = "news"
    target_dir = STAFF_UPLOAD_DIR if folder == "staff" else NEWS_UPLOAD_DIR

    data_url = str(data.get("data_url", "")).strip()
    match = re.match(r"^data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$", data_url)
    if not match:
        return jsonify({"error": "Invalid image format. Only JPG, PNG, and WebP are supported."}, status=400)

    mime_ext = match.group(1).lower()
    raw_b64 = re.sub(r"\s+", "", match.group(2))
    try:
        img_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception:
        return jsonify({"error": "Corrupt base64 image payload"}, status=400)

    if len(img_bytes) == 0 or len(img_bytes) > 5 * 1024 * 1024:
        return jsonify({"error": "Image size must be under 5 MB"}, status=400)

    # Validate magic bytes against declared image type
    ext = ""
    if img_bytes.startswith(b"\xff\xd8\xff"):
        ext = "jpg"
    elif img_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        ext = "png"
    elif len(img_bytes) >= 12 and img_bytes[:4] == b"RIFF" and img_bytes[8:12] == b"WEBP":
        ext = "webp"
    else:
        return jsonify({"error": f"Uploaded file bytes do not match valid image ({mime_ext})"}, status=400)

    target_dir.mkdir(parents=True, exist_ok=True)
    out_name = f"{folder}_{int(time.time())}_{secrets.token_hex(4)}.{ext}"
    (target_dir / out_name).write_bytes(img_bytes)
    return jsonify({"url": f"/assets/{folder}/{out_name}"}, status=201)


@app.route("/api/news", methods=["POST"])
def create_news(req: Request):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)

    data = req.json()
    title_ku = str(data.get("title_ku", "")).strip()
    title_ar = str(data.get("title_ar", "")).strip()
    title_en = str(data.get("title_en", "")).strip()
    primary_title = title_ku or title_ar or title_en
    if not primary_title:
        return jsonify({"error": "ناونیشانی هەواڵ پێویستە / Title is required"}, status=400)

    body_ku = str(data.get("body_ku", "")).strip()
    body_ar = str(data.get("body_ar", "")).strip()
    body_en = str(data.get("body_en", "")).strip()
    primary_body = body_ku or body_ar or body_en
    if not primary_body:
        return jsonify({"error": "ناوەڕۆکی هەواڵ پێویستە / Content is required"}, status=400)

    summary_ku = str(data.get("summary_ku", "")).strip() or (body_ku or primary_body)[:150]
    summary_ar = str(data.get("summary_ar", "")).strip() or (body_ar or primary_body)[:150]
    summary_en = str(data.get("summary_en", "")).strip() or (body_en or primary_body)[:150]

    category = str(data.get("category", "announcement")).strip()
    if category not in {"announcement", "event", "notice"}:
        category = "announcement"

    image_key = str(data.get("image_key", "seminar")).strip()
    if image_key not in {"seminar", "lab", "campus", "hero"}:
        image_key = "seminar"

    image_url = sanitize_image_url(data.get("image_url", ""))
    published_at = str(data.get("published_at", "")).strip() or datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO news (
            category, title_ku, title_ar, title_en,
            summary_ku, summary_ar, summary_en,
            body_ku, body_ar, body_en,
            image_key, image_url, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            category,
            title_ku or primary_title,
            title_ar or primary_title,
            title_en or primary_title,
            summary_ku,
            summary_ar,
            summary_en,
            body_ku or primary_body,
            body_ar or primary_body,
            body_en or primary_body,
            image_key,
            image_url,
            published_at,
        ),
    )
    new_id = cur.lastrowid
    conn.commit()
    cur.execute("SELECT * FROM news WHERE id = ?", (new_id,))
    created = dict(cur.fetchone())
    conn.close()
    return jsonify({"item": created}, status=201)


@app.route("/api/news/<int:news_id>", methods=["PUT"])
def update_news(req: Request, news_id: int):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)

    data = req.json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM news WHERE id = ?", (news_id,))
    existing = cur.fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "News item not found"}, status=404)

    title_ku = str(data.get("title_ku", "")).strip()
    title_ar = str(data.get("title_ar", "")).strip()
    title_en = str(data.get("title_en", "")).strip()
    primary_title = title_ku or title_ar or title_en or existing["title_ku"]

    body_ku = str(data.get("body_ku", "")).strip()
    body_ar = str(data.get("body_ar", "")).strip()
    body_en = str(data.get("body_en", "")).strip()
    primary_body = body_ku or body_ar or body_en or existing["body_ku"]

    summary_ku = str(data.get("summary_ku", "")).strip() or (body_ku or primary_body)[:150]
    summary_ar = str(data.get("summary_ar", "")).strip() or (body_ar or primary_body)[:150]
    summary_en = str(data.get("summary_en", "")).strip() or (body_en or primary_body)[:150]

    category = str(data.get("category", existing["category"])).strip()
    if category not in {"announcement", "event", "notice"}:
        category = existing["category"]

    image_key = str(data.get("image_key", existing["image_key"])).strip()
    if image_key not in {"seminar", "lab", "campus", "hero"}:
        image_key = existing["image_key"]

    image_url = sanitize_image_url(data.get("image_url")) if "image_url" in data else existing["image_url"]
    published_at = str(data.get("published_at", existing["published_at"])).strip() or existing["published_at"]

    cur.execute(
        """
        UPDATE news SET
            category = ?, title_ku = ?, title_ar = ?, title_en = ?,
            summary_ku = ?, summary_ar = ?, summary_en = ?,
            body_ku = ?, body_ar = ?, body_en = ?,
            image_key = ?, image_url = ?, published_at = ?
        WHERE id = ?
        """,
        (
            category,
            title_ku or primary_title,
            title_ar or primary_title,
            title_en or primary_title,
            summary_ku,
            summary_ar,
            summary_en,
            body_ku or primary_body,
            body_ar or primary_body,
            body_en or primary_body,
            image_key,
            image_url,
            published_at,
            news_id,
        ),
    )
    conn.commit()
    cur.execute("SELECT * FROM news WHERE id = ?", (news_id,))
    updated = dict(cur.fetchone())
    conn.close()
    return jsonify({"item": updated})


@app.route("/api/news/<int:news_id>", methods=["DELETE"])
def delete_news(req: Request, news_id: int):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)

    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM news WHERE id = ?", (news_id,))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    if deleted == 0:
        return jsonify({"error": "News item not found"}, status=404)
    return jsonify({"deleted": True, "id": news_id})


@app.route("/api/contact", methods=["POST"])
def submit_contact(req: Request):
    data = req.json()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    subject = str(data.get("subject", "")).strip()
    message = str(data.get("message", "")).strip()

    if len(name) < 2:
        return jsonify({"error": "ناو پێویستە / Name is required"}, status=400)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "ئیمەیڵ دروست نییە / Valid email is required"}, status=400)
    if len(message) < 5:
        return jsonify({"error": "تکایە پەیامەکەت بنووسە / Message is too short"}, status=400)

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (name, email, subject or "General Inquiry", message, created_at),
    )
    msg_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": msg_id, "created_at": created_at}, status=201)


@app.route("/api/contact", methods=["GET"])
def get_contact_messages(req: Request):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM contact_messages ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"messages": rows})


@app.route("/api/contact/<int:msg_id>", methods=["DELETE"])
def delete_contact_message(req: Request, msg_id: int):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM contact_messages WHERE id = ?", (msg_id,))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    if deleted == 0:
        return jsonify({"error": "Message not found"}, status=404)
    return jsonify({"deleted": True, "id": msg_id})


@app.route("/api/staff", methods=["POST"])
def create_staff(req: Request):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)

    data = req.json()
    name_ku = str(data.get("name_ku", "")).strip()
    name_ar = str(data.get("name_ar", "")).strip()
    name_en = str(data.get("name_en", "")).strip()
    primary_name = name_ku or name_ar or name_en
    if not primary_name:
        return jsonify({"error": "ناوی مامۆستا پێویستە / Staff name is required"}, status=400)

    role_key = str(data.get("role_key", "lecturer")).strip()
    if role_key not in {"head", "doctor", "lecturer"}:
        role_key = "lecturer"

    email = str(data.get("email", "")).strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "ئیمەیڵ دروست نییە / Valid academic email is required"}, status=400)

    photo_url = sanitize_image_url(data.get("photo_url", ""), folder="staff")

    conn = get_db()
    cur = conn.cursor()
    try:
        display_order = int(data.get("display_order") or 0)
    except (TypeError, ValueError):
        display_order = 0
    if display_order <= 0:
        max_row = cur.execute("SELECT COALESCE(MAX(display_order), 0) FROM staff").fetchone()
        display_order = int(max_row[0]) + 1

    cur.execute(
        """
        INSERT INTO staff (
            name, name_ku, name_ar, name_en, role_key,
            specialty_ku, specialty_ar, specialty_en,
            email, office_hours, photo_url, display_order
        ) VALUES (?, ?, ?, ?, ?, '', '', '', ?, '', ?, ?)
        """,
        (
            name_ku or primary_name,
            name_ku or primary_name,
            name_ar or primary_name,
            name_en or primary_name,
            role_key,
            email,
            photo_url,
            display_order,
        ),
    )
    new_id = cur.lastrowid
    conn.commit()
    created = dict(cur.execute("SELECT * FROM staff WHERE id = ?", (new_id,)).fetchone())
    conn.close()
    return jsonify({"member": created}, status=201)


@app.route("/api/staff/<int:staff_id>", methods=["PUT"])
def update_staff(req: Request, staff_id: int):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)

    data = req.json()
    conn = get_db()
    cur = conn.cursor()
    existing = cur.execute("SELECT * FROM staff WHERE id = ?", (staff_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "Staff member not found"}, status=404)

    name_ku = str(data.get("name_ku", "")).strip()
    name_ar = str(data.get("name_ar", "")).strip()
    name_en = str(data.get("name_en", "")).strip()
    primary_name = name_ku or name_ar or name_en or existing["name_ku"] or existing["name"]

    role_key = str(data.get("role_key", existing["role_key"])).strip()
    if role_key not in {"head", "doctor", "lecturer"}:
        role_key = existing["role_key"]

    email = str(data.get("email", existing["email"])).strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        conn.close()
        return jsonify({"error": "ئیمەیڵ دروست نییە / Valid academic email is required"}, status=400)

    photo_url = (
        sanitize_image_url(data.get("photo_url"), folder="staff")
        if "photo_url" in data
        else existing["photo_url"]
    )
    try:
        display_order = int(data.get("display_order") or existing["display_order"])
    except (TypeError, ValueError):
        display_order = existing["display_order"]
    if display_order <= 0:
        display_order = existing["display_order"]

    cur.execute(
        """
        UPDATE staff SET
            name = ?, name_ku = ?, name_ar = ?, name_en = ?,
            role_key = ?, email = ?, photo_url = ?, display_order = ?
        WHERE id = ?
        """,
        (
            name_ku or primary_name,
            name_ku or primary_name,
            name_ar or primary_name,
            name_en or primary_name,
            role_key,
            email,
            photo_url,
            display_order,
            staff_id,
        ),
    )
    conn.commit()
    updated = dict(cur.execute("SELECT * FROM staff WHERE id = ?", (staff_id,)).fetchone())
    conn.close()
    return jsonify({"member": updated})


@app.route("/api/staff/<int:staff_id>", methods=["DELETE"])
def delete_staff(req: Request, staff_id: int):
    if not verify_admin_token(req.headers.get("authorization", "")):
        return jsonify({"error": "Unauthorized"}, status=401)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM staff WHERE id = ?", (staff_id,))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    if deleted == 0:
        return jsonify({"error": "Staff member not found"}, status=404)
    return jsonify({"deleted": True, "id": staff_id})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PYTHON_PORT", "5001"))
    app.run(host="127.0.0.1", port=port)
