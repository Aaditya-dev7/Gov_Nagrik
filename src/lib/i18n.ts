import { useEffect, useState } from 'react'

export type Lang = 'en' | 'hi' | 'mr'

type Dict = Record<string, string>

const dictionaries: Record<Lang, Dict> = {
  en: {
    'lang.english': 'English',
    'lang.hindi': 'Hindi',
    'lang.marathi': 'Marathi',

    'common.language': 'Language',
    'common.search_reports': 'Search reports...',
    'common.notifications': 'Notifications',
    'common.no_notifications': 'No notifications',
    'common.open': 'Open',
    'common.request': 'Request',
    'common.dept': 'Dept',

    'role.admin': 'Admin',
    'role.officer': 'Officer',

    'page.dashboard': 'Dashboard',
    'page.reports': 'Reports',
    'page.map': 'Map',
    'page.heatmap': 'Heatmap',
    'page.users': 'Users',
    'page.departments': 'Departments',
    'page.officers': 'Officers',
    'page.settings': 'Settings',
    'page.profile': 'Profile',

    'dashboard.admin_portal': 'Admin Portal',
    'dashboard.officer_portal': 'Officer Portal',

    'dashboard.total_reports': 'Total Reports',
    'dashboard.pending': 'Pending',
    'dashboard.in_progress': 'In Progress',
    'dashboard.resolved': 'Resolved',
    'dashboard.urgent': 'Urgent',

    'dashboard.filter.all': 'All',
    'dashboard.filter.pending': 'Pending',
    'dashboard.filter.in_progress': 'In Progress',
    'dashboard.filter.resolved': 'Resolved',
    'dashboard.filter.urgent': 'Urgent',

    'dashboard.recent_reports': 'Recent Reports',
    'dashboard.assigned_to_me': 'Assigned to Me',
    'dashboard.view_all': 'View All',
    'dashboard.no_reports_yet': 'No reports yet',
    'dashboard.no_assigned_reports': 'No reports assigned to you',
    'dashboard.recent_alerts': 'Recent Alerts',
    'dashboard.no_new_alerts': 'No new alerts',

    'reports.filters': 'Filters',
    'reports.clear': 'Clear',
    'reports.status': 'Status',
    'reports.priority': 'Priority',
    'reports.category': 'Category',
    'reports.all_categories': 'All Categories',
    'reports.table': 'Table',
    'reports.cards': 'Cards',
    'reports.sort.newest': 'Newest First',
    'reports.sort.oldest': 'Oldest First',
    'reports.sort.priority': 'High Priority First',
    'reports.showing': 'Showing',
    'reports.of': 'of',
    'reports.no_reports_found': 'No reports found',
    'reports.try_adjust': 'Try adjusting your filters or search criteria',

    'auth.logout': 'Logout',
  },
  hi: {
    'lang.english': 'अंग्रेज़ी',
    'lang.hindi': 'हिंदी',
    'lang.marathi': 'मराठी',

    'common.language': 'भाषा',
    'common.search_reports': 'रिपोर्ट्स खोजें...',
    'common.notifications': 'सूचनाएँ',
    'common.no_notifications': 'कोई सूचना नहीं',
    'common.open': 'खोलें',
    'common.request': 'अनुरोध',
    'common.dept': 'विभाग',

    'role.admin': 'एडमिन',
    'role.officer': 'ऑफिसर',

    'page.dashboard': 'डैशबोर्ड',
    'page.reports': 'रिपोर्ट्स',
    'page.map': 'मैप',
    'page.heatmap': 'हीटमैप',
    'page.users': 'यूज़र्स',
    'page.departments': 'विभाग',
    'page.officers': 'ऑफिसर्स',
    'page.settings': 'सेटिंग्स',
    'page.profile': 'प्रोफाइल',

    'dashboard.admin_portal': 'एडमिन पोर्टल',
    'dashboard.officer_portal': 'ऑफिसर पोर्टल',

    'dashboard.total_reports': 'कुल रिपोर्ट्स',
    'dashboard.pending': 'लंबित',
    'dashboard.in_progress': 'प्रगति में',
    'dashboard.resolved': 'सुलझी',
    'dashboard.urgent': 'अति-आवश्यक',

    'dashboard.filter.all': 'सभी',
    'dashboard.filter.pending': 'लंबित',
    'dashboard.filter.in_progress': 'प्रगति में',
    'dashboard.filter.resolved': 'सुलझी',
    'dashboard.filter.urgent': 'अति-आवश्यक',

    'dashboard.recent_reports': 'हाल की रिपोर्ट्स',
    'dashboard.assigned_to_me': 'मेरे लिए असाइन',
    'dashboard.view_all': 'सब देखें',
    'dashboard.no_reports_yet': 'अभी कोई रिपोर्ट नहीं',
    'dashboard.no_assigned_reports': 'आपको कोई रिपोर्ट असाइन नहीं',
    'dashboard.recent_alerts': 'हाल की अलर्ट्स',
    'dashboard.no_new_alerts': 'कोई नया अलर्ट नहीं',

    'reports.filters': 'फ़िल्टर्स',
    'reports.clear': 'हटाएं',
    'reports.status': 'स्थिति',
    'reports.priority': 'प्राथमिकता',
    'reports.category': 'श्रेणी',
    'reports.all_categories': 'सभी श्रेणियाँ',
    'reports.table': 'टेबल',
    'reports.cards': 'कार्ड्स',
    'reports.sort.newest': 'नवीनतम पहले',
    'reports.sort.oldest': 'पुराने पहले',
    'reports.sort.priority': 'उच्च प्राथमिकता पहले',
    'reports.showing': 'दिखा रहे हैं',
    'reports.of': 'में से',
    'reports.no_reports_found': 'कोई रिपोर्ट नहीं मिली',
    'reports.try_adjust': 'फ़िल्टर या खोज बदलकर देखें',

    'auth.logout': 'लॉगआउट',
  },
  mr: {
    'lang.english': 'इंग्रजी',
    'lang.hindi': 'हिंदी',
    'lang.marathi': 'मराठी',

    'common.language': 'भाषा',
    'common.search_reports': 'रिपोर्ट्स शोधा...',
    'common.notifications': 'सूचना',
    'common.no_notifications': 'सूचना नाहीत',
    'common.open': 'उघडा',
    'common.request': 'विनंती',
    'common.dept': 'विभाग',

    'role.admin': 'अॅडमिन',
    'role.officer': 'ऑफिसर',

    'page.dashboard': 'डॅशबोर्ड',
    'page.reports': 'रिपोर्ट्स',
    'page.map': 'नकाशा',
    'page.heatmap': 'हीटमॅप',
    'page.users': 'युजर्स',
    'page.departments': 'विभाग',
    'page.officers': 'ऑफिसर्स',
    'page.settings': 'सेटिंग्स',
    'page.profile': 'प्रोफाइल',

    'dashboard.admin_portal': 'अॅडमिन पोर्टल',
    'dashboard.officer_portal': 'ऑफिसर पोर्टल',

    'dashboard.total_reports': 'एकूण रिपोर्ट्स',
    'dashboard.pending': 'प्रलंबित',
    'dashboard.in_progress': 'प्रगतीत',
    'dashboard.resolved': 'सोडवले',
    'dashboard.urgent': 'तातडीचे',

    'dashboard.filter.all': 'सर्व',
    'dashboard.filter.pending': 'प्रलंबित',
    'dashboard.filter.in_progress': 'प्रगतीत',
    'dashboard.filter.resolved': 'सोडवले',
    'dashboard.filter.urgent': 'तातडीचे',

    'dashboard.recent_reports': 'अलीकडील रिपोर्ट्स',
    'dashboard.assigned_to_me': 'माझ्याकडे असाइन',
    'dashboard.view_all': 'सर्व पहा',
    'dashboard.no_reports_yet': 'अजून रिपोर्ट नाहीत',
    'dashboard.no_assigned_reports': 'तुमच्याकडे रिपोर्ट असाइन नाहीत',
    'dashboard.recent_alerts': 'अलीकडील अलर्ट्स',
    'dashboard.no_new_alerts': 'नवे अलर्ट नाहीत',

    'reports.filters': 'फिल्टर्स',
    'reports.clear': 'काढा',
    'reports.status': 'स्थिती',
    'reports.priority': 'प्राधान्य',
    'reports.category': 'श्रेणी',
    'reports.all_categories': 'सर्व श्रेण्या',
    'reports.table': 'टेबल',
    'reports.cards': 'कार्ड्स',
    'reports.sort.newest': 'नवीन आधी',
    'reports.sort.oldest': 'जुने आधी',
    'reports.sort.priority': 'उच्च प्राधान्य आधी',
    'reports.showing': 'दाखवत आहे',
    'reports.of': 'पैकी',
    'reports.no_reports_found': 'रिपोर्ट्स सापडले नाहीत',
    'reports.try_adjust': 'फिल्टर/शोध बदलून पहा',

    'auth.logout': 'लॉगआउट',
  },
}

function safeLang(v: unknown): Lang {
  return v === 'hi' || v === 'mr' || v === 'en' ? v : 'en'
}

export function getLang(): Lang {
  try {
    return safeLang(localStorage.getItem('nagrikGPT_lang'))
  } catch {
    return 'en'
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem('nagrikGPT_lang', lang)
  } catch {}
  try {
    window.dispatchEvent(new Event('nagrikGPT_lang_change'))
  } catch {}
}

export function t(key: string, fallback?: string): string {
  const lang = getLang()
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? fallback ?? key
}

export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>(() => getLang())
  useEffect(() => {
    const onChange = () => setLangState(getLang())
    window.addEventListener('storage', onChange)
    window.addEventListener('nagrikGPT_lang_change', onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('nagrikGPT_lang_change', onChange)
    }
  }, [])
  return lang
}
