import { ms } from "./malay";
export type Language = "en" | "ar" | "ms";
// Keep copy in dictionaries so additional languages can be added without changing components.
const ar: Record<string, string> = {
  "Fixed location": "موقع ثابت",
  "Current location": "الموقع الحالي",
  "✓ You are facing the Qibla": "✓ أنت باتجاه القبلة",
  "≈ Near Qibla · accuracy unverified":
    "≈ قريب من اتجاه القبلة · الدقة غير مؤكدة",
  "Bearing from true north": "الاتجاه من الشمال الحقيقي",
  "North is shown at the top in this fallback view. Align north using a reliable external compass.":
    "يظهر الشمال في أعلى هذا العرض البديل. حدد الشمال باستخدام بوصلة خارجية موثوقة.",
  "Alignment is approximate even with calibrated sensors. Nearby magnets, cases, cars, and electronics can distort sensors. This view is designed for a flat phone in portrait orientation. For a fixed home city while travelling, this bearing belongs to that city, not your physical position.":
    "المحاذاة تقريبية حتى بعد معايرة المستشعرات. قد تؤثر المغناطيسات والأغطية والسيارات والأجهزة الإلكترونية القريبة في دقتها. أمسك الهاتف بشكل مسطح وفي الوضع العمودي. عند اختيار مدينة ثابتة أثناء السفر، يكون اتجاه القبلة خاصاً بتلك المدينة وليس بموقعك الفعلي.",
  "Tap Start live compass, allow motion and location, then hold your phone flat in portrait.":
    "اضغط على تشغيل البوصلة، واسمح بالوصول إلى الحركة والموقع، ثم أمسك الهاتف بشكل مسطح وفي الوضع العمودي.",
  "Checking compass access…": "جارٍ التحقق من إمكانية الوصول إلى البوصلة…",
  "The live compass needs HTTPS. The calculated geographic bearing is available below.":
    "تحتاج البوصلة المباشرة إلى اتصال HTTPS آمن. الاتجاه الجغرافي المحسوب متاح أدناه.",
  "This browser has no compass access. Use the geographic bearing below.":
    "لا يدعم هذا المتصفح الوصول إلى البوصلة. استخدم الاتجاه الجغرافي أدناه.",
  "Motion permission was denied. Enable Motion & Orientation Access in Safari or use the geographic bearing.":
    "تم رفض إذن الحركة. فعّل الوصول إلى الحركة والاتجاه في سفاري أو استخدم الاتجاه الجغرافي.",
  "Location is unavailable. True-north correction needs your physical coordinates.":
    "الموقع غير متاح. يتطلب تصحيح الشمال الحقيقي إحداثيات موقعك الفعلي.",
  "Hold your phone flat in portrait and slowly turn. Your GPS is used locally to correct magnetic north; your selected prayer city stays unchanged.":
    "أمسك الهاتف بشكل مسطح وفي الوضع العمودي ثم استدر ببطء. يُستخدم موقعك محلياً لتصحيح الشمال المغناطيسي؛ وتبقى مدينة الصلاة المختارة دون تغيير.",
  "Compass permission or location was unavailable. Use the geographic bearing below.":
    "إذن البوصلة أو الموقع غير متاح. استخدم الاتجاه الجغرافي أدناه.",
  "Rotate your phone to portrait and hold it flat.":
    "ضع الهاتف في الوضع العمودي وأمسكه بشكل مسطح.",
  "Hold your phone flat. An absolute compass reading is required; relative orientation alone cannot find north.":
    "أمسك الهاتف بشكل مسطح. يلزم توفر قراءة مطلقة للبوصلة؛ الاتجاه النسبي وحده لا يحدد الشمال.",
  "True-north estimate · Keep away from magnets and metal.":
    "تقدير الشمال الحقيقي · ابتعد عن المغناطيسات والمعادن.",
  "Heading accuracy is uncertain. Calibrate with a figure eight, keep the phone flat, and compare with an independent compass.":
    "دقة الاتجاه غير مؤكدة. حرّك الهاتف على شكل الرقم 8 للمعايرة، ثم أمسكه بشكل مسطح وقارن الاتجاه ببوصلة مستقلة.",
  "No compass reading is available. Check location services or use the geographic bearing.":
    "لا تتوفر قراءة للبوصلة. تحقق من خدمات الموقع أو استخدم الاتجاه الجغرافي.",
  "This device has no usable magnetometer. Use the geographic bearing below.":
    "لا يحتوي هذا الجهاز على مستشعر مغناطيسي قابل للاستخدام. استخدم الاتجاه الجغرافي أدناه.",
  "Heading permission was denied. Use the geographic bearing below.":
    "تم رفض إذن تحديد الاتجاه. استخدم الاتجاه الجغرافي أدناه.",
  "Compass unavailable. Use the geographic bearing.":
    "البوصلة غير متاحة. استخدم الاتجاه الجغرافي.",
  "Location permission denied. Use the geographic bearing below.":
    "تم رفض إذن الموقع. استخدم الاتجاه الجغرافي أدناه.",
  "Location could not be determined. Use the geographic bearing below.":
    "تعذر تحديد الموقع. استخدم الاتجاه الجغرافي أدناه.",
  "Location request timed out. Use the geographic bearing below.":
    "انتهت مهلة تحديد الموقع. استخدم الاتجاه الجغرافي أدناه.",
  Times: "المواقيت",
  "Previous day": "اليوم السابق",
  "Next day": "اليوم التالي",
  Today: "اليوم",
  Home: "الرئيسية",
  "Prayer Times": "مواقيت الصلاة",
  Qibla: "القبلة",
  Settings: "الإعدادات",
  "Assalamu alaikum": "السلام عليكم",
  "Prayer times": "مواقيت الصلاة",
  "Welcome to Bangi": "مرحباً بك في بانغي",
  "Choose your location": "اختر موقعك",
  "Change location": "تغيير الموقع",
  "Today’s rhythm": "صلوات اليوم",
  "Find your direction": "اعرف اتجاهك",
  "Open Qibla ↗": "القبلة ↗",
  "Personalize Bangi": "تخصيص بانغي",
  "Calculation settings": "إعدادات الحساب",
  "A space that feels like you": "مساحتك الخاصة",
  "Language & calendar": "اللغة والتقويم",
  "Show Arabic prayer names": "إظهار أسماء الصلوات بالعربية",
  "Interface language": "لغة الواجهة",
  "Calendar display": "عرض التقويم",
  "About Bangi": "عن بانغي",
  "Open device permission settings": "أذونات الجهاز",
  "Turn toward Makkah": "توجه نحو مكة",
  "Start live compass": "تشغيل البوصلة",
  "Select a location": "اختر موقعاً",
  "Your day, guided by prayer.": "يومك على هدي الصلاة",
  "BANGI · A MOMENT OF PEACE": "بانغي · لحظة سكينة",
  "QIBLA · FIND YOUR STILLNESS": "القبلة · وجهتك إلى السكينة",
  "Location & region  ↗": "الموقع والمنطقة ↗",
  "Prayer calculation  ↗": "حساب الصلاة ↗",
  "Prayer reminders  ↗": "تذكيرات الصلاة ↗",
  "Appearance, colors & typography  ↗": "المظهر والألوان والخط ↗",
  "Make it yours": "صممه كما تحب",
  Appearance: "المظهر",
  "Text size": "حجم النص",
  light: "فاتح",
  dark: "داكن",
  system: "النظام",
  Small: "صغير",
  Medium: "متوسط",
  Large: "كبير",
  compact: "مختصر",
  cards: "بطاقات",
  Dismiss: "إغلاق",
  "Where do you pray?": "أين تصلي؟",
  "Use current location": "استخدم موقعي الحالي",
  "Recent places": "الأماكن الأخيرة",
  "A considered calculation": "حساب دقيق للصلاة",
  "Calculation method": "طريقة الحساب",
  "High-latitude rule": "قاعدة خطوط العرض العليا",
  "Hanafi Asr (double shadow)": "العصر الحنفي (ضعف الظل)",
  "A gentle invitation": "دعوة لطيفة للصلاة",
  "Enable prayer notifications": "تفعيل تذكيرات الصلاة",
  "Curated beginnings": "لوحات ألوان مختارة",
  "Your live palette preview": "معاينة الألوان المباشرة",
  "A moment of peace": "لحظة سكينة",
  "Save both palettes": "حفظ لوحتي الألوان",
  "Export both palettes to JSON": "تصدير الألوان بصيغة JSON",
  "Validate and import JSON": "التحقق من الألوان واستيرادها",
  "Play system notification sound": "تشغيل صوت إشعار النظام",
  "Vibrate (Android channel)": "اهتزاز (أندرويد)",
  "Choose up to four reminder times": "اختر حتى أربعة تذكيرات",
  "Add custom reminder": "إضافة تذكير مخصص",
  "Clear selected reminders": "مسح التذكيرات المختارة",
  both: "كلاهما",
  gregorian: "ميلادي",
  hijri: "هجري",
  "Up next": "الصلاة القادمة",
  "Current prayer": "الصلاة الحالية",
  "Obligatory prayer": "صلاة مفروضة",
  "Sunrise · not an obligatory prayer": "الشروق · ليس صلاة مفروضة",
};
export function translate(text: string, language: Language): string {
  const dictionary =
    language === "ar" ? ar : language === "ms" ? ms : undefined;
  if (!dictionary) return text;
  if (dictionary[text]) return dictionary[text];
  if (language === "ms") {
    const turn = text.match(/^Turn (\d+)° (clockwise|counterclockwise)$/);
    if (turn)
      return `Pusing ${turn[1]}° ${turn[2] === "clockwise" ? "mengikut arah jam" : "melawan arah jam"}`;
    const heading = text.match(/^Device heading: (\d+)° true north$/);
    if (heading) return `Arah peranti: ${heading[1]}° dari utara sebenar`;
    const prayer = text.match(
      /^(fajr|dhuhr|asr|maghrib|isha|sunrise) reminders enabled$/i,
    );
    if (prayer) return `Aktifkan peringatan ${ms[prayer[1].toLowerCase()]}`;
    const before = text.match(/^(\d+) (?:minutes|min) before$/);
    if (before) return `${before[1]} minit sebelum`;
  }
  return text;
}
export const prayerLabel = (name: string, language: Language) =>
  language === "ar"
    ? {
        fajr: "الفجر",
        dhuhr: "الظهر",
        asr: "العصر",
        maghrib: "المغرب",
        isha: "العشاء",
        sunrise: "الشروق",
      }[name] || name
    : language === "en"
      ? name[0].toUpperCase() + name.slice(1)
      : translate(name, language);
export const dateLocale = (language: Language) =>
  language === "ar" ? "ar-SA" : language === "ms" ? "ms-MY" : "en-GB";
