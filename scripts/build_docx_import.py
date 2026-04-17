import argparse
import json
import os
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


DOCS = [
    {
        "filename": "15 خبر  سياحه وطيران.docx",
        "category": "سياحة وطيران",
        "titles": [
            "نمو حذر لقطاع السياحة العالمي في 2026 وسط مخاوف من التوترات الجيوسياسية وضغوط التضخم.",
            "مستقبل السياحة العالمية في 2026 بين تحديات الجيوسياسة وسحر التجربة الرمضانية في مصر",
            "مصر تتصدر المشهد الفندقي العالمي بـ 14 فندقاً ضمن الأفضل دولياً وتستهدف مليون سائح في 2026",
            "بدء إصدار تأشيرات الحج السياحي لعام 2026: ميكنة شاملة وتسجيل إلكتروني لضمان راحة الحجاج.",
            "بدءاً من 15 مارس: نقل رحلات «إير كايرو» الدولية للصالة الموسمية بمطار القاهرة",
            "مصر ممر آمن للملاحة العالمية وسط اضطرابات جوية غير مسبوقة وخسائر مليارية بالمنطقة.",
            "تغير خريطة السياحة الروسية: مصر وتركيا وتايلاند البديل الآمن لدبي ودول الخليج في 2026.",
            "الغرف السياحية: تعزيز الحوار بين الحكومة والقطاع الخاص لدعم الاستثمار.",
            "اتحاد الغرف السياحية: الحوار المباشر مع الحكومة ركيزة أساسية لدعم الاستثمار ومعالجة تحديات القطاع",
            "المجال الجوي المصري صمام أمان للملاحة العالمية وسط زلزال جوي يضرب الشرق الأوسط.",
            "القاهرة ضمن أفضل 50 مدينة في العالم لعام 2026 وفقاً لتصنيف \"تايم آوت\" البريطانية.",
            "انطلاق الدورة الـ60 لبورصة برلين السياحية \"ITB Berlin\" بمشاركة مصرية واسعة",
            "مصر تشارك في افتتاح معرض «القدر في النجوم» ببرلين لاستعراض 4000 عام من التاريخ الفلكي",
            "غرفة السياحة تحذر: تصاعد التوترات الإقليمية يهدد استقرار رحلات الحج والعمرة وحركة الطيران",
            "وزير الاستثمار السلوفاكي من شوارع الغردقة: المدينة جوهرة عالمية وبيئة مثالية للاستثمار.",
        ],
    },
    {
        "filename": "اخبار الاقتصاد.docx",
        "category": "اقتصاد",
        "titles": [
            "توقعات بانخفاض التضخم في مصر إلى 11.7% خلال يناير 2026",
            "\"الفوائض تتحقق والدين يتراجع.. و«كجوك» يكشف خطة مصر لجذب المستثمرين\"",
            "مخاوف الفائدة وتقييمات الذكاء الاصطناعي تهز أسواق آسيا في ختام أسبوع متقلب",
            "ارتفاع أسعار الذهب في مصر.. وعيار 21 يسجل 5350 جنيهًا والجنيه الذهب يقفز إلى 42.8 ألف",
            "أسعار الفاكهة اليوم في سوق العبور.. البرتقال يتألق والمانجو تحافظ على ارتفاعها",
            "\"حكماء الاقتصاد\": لا انتعاش مرتقب لألمانيا في 2026.. والنمو أقل من التوقعات الحكومية",
            "بريطانيا: ضبط التهريب عبر التفتيش الأممي ينعكس على أمن التجارة في البحر الأحمر",
            "رغم خفض الفائدة… لماذا تصرّ مصر على إبقاء عوائد الدين مرتفعة؟ السر يكمن في \"الأموال الساخنة\"!",
            "اندفاع تاريخي نحو المعادن.. الذهب يتجاوز 5100 دولار والفضة تقفز أكثر من 50% منذ بداية 2026",
            "قطرة ثمنها ثروة.. لماذا يتجاوز سعر بعض السوائل قيمة الذهب والماس؟",
            "اليابان تلوّح بالتدخل لوقف المضاربات في سوق الصرف مع هبوط الين وارتفاع الضغوط الاقتصادية",
            "مصر تتصدر الكوميسا استثماريًا.. 46.6 مليار دولار تقود تدفقات التكتل إلى مستوى قياسي",
            "قفزة تاريخية لعوائد السندات البريطانية وسط مخاوف التضخم والطاقة",
        ],
    },
    {
        "filename": "تراثنا.docx",
        "category": "أصل الحكاية",
        "titles": [
            "بأيدٍ مصرية.. افتتاح مقبرتين أثريتين لأول مرة بالبر الغربي في الأقصر بعد ترميمهما",
            "«إحياء الماضي لتوثيق المستقبل».. متحف الحضارة يطلق الموسم الرابع من مبادرة «طبلية مصر»",
            "المتحف المصري الكبير.. أيقونة القرن الحادي والعشرين وحارس أسرار الفراعنة",
            "بإرادة مصرية \"المستحيل ليس في قاموسنا\".. قصة العبقري أحمد حسين ونقل تمثال رمسيس واقفاً",
            "انتصار للمذاق المصري.. اليونسكو تُدرج «الكشري» رسميًا على قائمة التراث العالمي",
        ],
    },
    {
        "filename": "المستقبل الرقمي.docx",
        "category": "عين التقنية",
        "titles": [
            "\"عقلٌ بلا جسد\".. كيف تحول خيال \"دارتموث\" إلى محرك يحكم العالم؟",
            "الذكاء الذي غيّر كل شيء",
            "Gemini يقود تحولًا جديدًا في سباق الذكاء الاصطناعي العالمي",
            "Sora: الزلزال الرقمي الذي أعدم المستحيل وأربك حسابات هوليوود",
            "من الأمان إلى الصدارة.. كيف صعد Claude بين عمالقة الذكاء الاصطناعي؟",
        ],
    },
    {
        "filename": "المستقبل الرقمى.docx",
        "category": "عين التقنية",
        "titles": [
            "\"سيف الظلام\" يضرب آيفون: أداة اختراق صامتة تهدد 270 مليون مستخدم!",
            "وداعاً للأثر الرقمي: واتساب يطلق ميزة \"التدمير الذاتي\" فور القراءة!",
            "وداعاً للبطاريات.. الروبوت \"WANDER\" يغزو الكواكب بطاقة الرياح!",
            "بسبب \"ركضة\" صباحية.. تطبيق رياضي يفشي أخطر أسرار البحرية الفرنسية!",
            "ناقوس خطر من برلين: \"ماكينة الوظائف\" الألمانية تتوقف.. والذكاء الاصطناعى هو البديل!",
        ],
    },
    {
        "filename": "المستند (7).docx",
        "category": "ثقافة",
        "titles": [
            "ديفيد زالاي يقتنص جائزة البوكر العالمية 2026 برواية \"لحم\"",
            "مستقبل الابداع الادبى فى ميزان الذكاء الاصطناعي",
            "\"الموت هو الحاكم\".. لوحة مسّت إمبراطور ألمانيا تعود إلى برلين",
            "لوحة عند بوابة الخلود للفنان الهواندي فان جوخ",
            "تنقيط القرآن.. القصة الكاملة وتأثيره على شكل اللغة العربية؟",
            "حسين حمودة: الثقافة دورها محوري فى حماية الهوية",
            "تعاون ثقافي بين \"سميثسونيان\" الأميركية والعلا السعودية",
        ],
    },
    {
        "filename": "الاخبار العالميه.docx",
        "category": "عالمي",
        "titles": [
            "عقدة الـ 150 مقاتلاً.. ضغوط أمريكية لإخراج عناصر حماس من \"أنفاق غزة\" تصطدم برفض اليمين الإسرائيلي",
            "\"طهران تحت حصار الجفاف\".. بزشكيان يلوح بـ \"إخلاء العاصمة\" والعد التنازلي ينتهي في نوفمبر",
            "موسكو: \"فوبيا\" الرد العالمي تكبل بروكسل عن مصادرة الأصول الروسية",
            "زاخاروفا تفتح النار: كييف تحول ملف \"الأطفال\" إلى ورقة لابتزاز الغرب مالياً",
            "أردوغان يعلن فك شفرة \"كارثة الحدود\".. العثور على الصندوق الأسود وانتشال ضحايا الطائرة المنكوبة",
            "\"فخ العشرة روبلات\".. عبوة مفخخة داخل \"غلاف هدية\" تبتر أصابع طفل في ضواحي موسكو",
            "\"سفاري الموت\" في سراييفو.. القضاء الإيطالي يفتح الصندوق الأسود لـ \"سياحة القنص\" ضد الأطفال",
            "اغتيال في المقبرة\".. موسكو تعلن إحباط مخطط أوكراني استهدف مسؤولاً رفيعاً",
            "شرق المتوسط تحت مجهر الزلازل.. هزة تضرب قبالة سواحل تركيا ونشاط متلاحق في قبرص",
            "حصيلة \"مؤلمة\" في سومطرة.. ضحايا فيضانات إندونيسيا يتجاوزون الـ 300 وسط حصار \"العزلة الرقمية\"",
            "بقرار \"مفاجئ\".. ترامب يمنح عفواً شاملاً لرئيس هندوراس السابق المحكوم بـ",
            "رحلة التخرج تتحول إلى مأساة.. كولومبيا تفجع بسقوط حافلة طلاب في منحدر سحيق",
            "واشنطن تشهر سلاح \"الإجراءات المضادة\": هل تشتعل حرب الخدمات بين ترامب والاتحاد الأوروبي؟",
            "كارني يمتص \"غضب الرسوم\" بتمسك صارم باتفاقية \"USMCA\" ورفض الاتفاقيات مع الصين",
            "استدعاء ذاكرة كوفيد\".. تايلاند تستنفر أنظمتها الصحية لمواجهة شبح \"نيباه\"",
        ],
    },
    {
        "filename": "DOC-20260323-WA0025..docx",
        "category": "مقالات",
        "titles": [
            "نايكي: عندما تتحول الرياضة إلى أسلوب حياة",
            "القراءة... سِحرٌ يُعيد ترتيب الفوضى في عقولنا",
            "\"عادات خارج حدود العقل: ماذا تكشف غرائب الشعوب عن الإنسان؟\"",
            "🧠 تعفّن الدماغ الرقمي: كيف يُسلبنا الإنترنت عقولنا؟",
            "اللاوعي الجمعي… \"لغة البشر الخفية\"",
            "حين تصبح الشاشة أقرب من القلب",
            "النسخة التي لا يراها أحد",
            "لماذا نفكر أكثر مما ينبغي؟",
            "\"الذكاء الاصطناعي… العقل الجديد للبشرية\"",
            "الساعة البيولوجية… توقيت الحياة الخفي",
        ],
    },
]


WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
ARABIC_DIACRITICS = re.compile(r"[\u064b-\u065f\u0670\u06d6-\u06ed]")
TITLE_PREFIX = re.compile(r"^(?:[0-9٠-٩]+[\.\-،: ]*)?(?:عنوان[:： ]*)?", re.IGNORECASE)
KEEP_CHARS = re.compile(r"[^\w\u0600-\u06FF ]+", re.UNICODE)


def normalize_for_match(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = text.replace("\u200f", " ").replace("\u200e", " ").replace("\ufeff", " ")
    text = ARABIC_DIACRITICS.sub("", text)
    text = TITLE_PREFIX.sub("", text.strip())
    text = (
        text.replace("أ", "ا")
        .replace("إ", "ا")
        .replace("آ", "ا")
        .replace("ى", "ي")
        .replace("ؤ", "و")
        .replace("ئ", "ي")
        .replace("ة", "ه")
    )
    text = KEEP_CHARS.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def read_docx_paragraphs(path: Path):
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    for index, paragraph in enumerate(root.findall(".//w:body/w:p", WORD_NS)):
        chunks = [node.text or "" for node in paragraph.findall(".//w:t", WORD_NS)]
        text = re.sub(r"\s+", " ", "".join(chunks)).strip()
        if text:
            paragraphs.append({"index": index, "text": text})
    return paragraphs


def find_title_positions(paragraphs, titles):
    positions = []
    cursor = 0
    for title in titles:
        normalized_title = normalize_for_match(title)
        found = None
        for idx in range(cursor, len(paragraphs)):
            normalized_paragraph = normalize_for_match(paragraphs[idx]["text"])
            if not normalized_paragraph:
                continue
            if (
                normalized_paragraph == normalized_title
                or normalized_paragraph.startswith(normalized_title)
                or normalized_title.startswith(normalized_paragraph)
                or normalized_title in normalized_paragraph
                or normalized_paragraph in normalized_title
            ):
                found = idx
                break
        if found is None:
            print(f"[warn] title not found: {title}", file=sys.stderr)
            continue
        positions.append((title, found))
        cursor = found + 1
    return positions


def build_articles(source_dir: Path):
    articles = []
    seen = set()
    for doc in DOCS:
        path = source_dir / doc["filename"]
        if not path.exists():
            print(f"[warn] file not found: {path}", file=sys.stderr)
            continue

        paragraphs = read_docx_paragraphs(path)
        positions = find_title_positions(paragraphs, doc["titles"])
        for article_index, (title, paragraph_index) in enumerate(positions):
            next_start = positions[article_index + 1][1] if article_index + 1 < len(positions) else len(paragraphs)
            body = [
                paragraph["text"]
                for paragraph in paragraphs[paragraph_index + 1 : next_start]
                if paragraph["text"].strip()
            ]
            content = "\n\n".join(body).strip()
            if not content:
                print(f"[warn] empty content skipped: {title}", file=sys.stderr)
                continue

            title_key = normalize_for_match(title)
            if title_key in seen:
                print(f"[warn] duplicate title skipped: {title}", file=sys.stderr)
                continue
            seen.add(title_key)

            articles.append(
                {
                    "title": TITLE_PREFIX.sub("", title).strip(),
                    "content": content,
                    "category": doc["category"],
                    "sourceFile": doc["filename"],
                }
            )
    return articles


def main():
    parser = argparse.ArgumentParser(description="Build a JSON payload from Word news files.")
    parser.add_argument(
        "--source-dir",
        default=str(Path.home() / "Downloads"),
        help="Directory that contains the source .docx files.",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parent / "generated" / "news-import.json"),
        help="Where the generated JSON should be written.",
    )
    args = parser.parse_args()

    source_dir = Path(os.path.expandvars(args.source_dir)).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    articles = build_articles(source_dir)
    payload = {
        "count": len(articles),
        "articles": articles,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {len(articles)} articles -> {output_path}")


if __name__ == "__main__":
    main()
