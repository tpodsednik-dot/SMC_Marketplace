/**
 * SMC MARKETPLACE - LOKÁLNÍ DATABÁZOVÝ ENGINE (SQLITE SCHEMA V JAVASCRIPTU)
 * Všechny obrázky jsou uloženy PŘÍMO V DATABÁZI jako Base64 kód (Data URLs).
 * Žádné externí soubory s obrázky nejsou potřeba – vše je uvnitř databáze.
 */

const DB_STORAGE_KEY = 'smc_community_marketplace_db_v8';
const SESSION_STORAGE_KEY = 'smc_community_session_user_v8';

// Vychozi obrazky (vyprazdneno pro cisty katalog bez demo dat)
const EMBEDDED_IMAGES = {};
window.EMBEDDED_IMAGES = EMBEDDED_IMAGES;

class SMCLocalDatabase {
    constructor() {
        this.apiUrl = 'https://podsednikt.endora.site/marketPlaceAPI.php';
        this.useApi = true;
        this.data = this.loadDatabase();
        this.syncWithRemoteApi();
    }

    async sendApiRequest(action, payload = {}, method = 'POST') {
        if (!this.useApi) return null;
        try {
            const url = `${this.apiUrl}?action=${encodeURIComponent(action)}`;
            const options = {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors'
            };
            if (method === 'POST') {
                options.body = JSON.stringify(payload);
            }
            const res = await fetch(url, options);
            if (!res.ok) {
                console.warn(`[SMC API] ${action} vrátil status:`, res.status);
                return null;
            }
            return await res.json();
        } catch (e) {
            console.warn(`[SMC API] Chyba při volání ${action}:`, e);
            return null;
        }
    }

    async syncWithRemoteApi() {
        if (!this.useApi) return;
        try {
            const res = await fetch(`${this.apiUrl}?action=getItems`, { method: 'GET', mode: 'cors' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.success && Array.isArray(data.items)) {
                const mappedItems = data.items.map(item => {
                    let images = [];
                    if (Array.isArray(item.images) && item.images.length > 0) {
                        images = item.images;
                    } else if (item.image_url) {
                        images = [item.image_url];
                    } else {
                        images = ['./images/tools_case.jpg'];
                    }

                    return {
                        id: Number(item.id),
                        title: item.title,
                        description: item.description,
                        category_id: item.category_id,
                        price: Number(item.price) || 0,
                        price_type: item.price_type || 'sell',
                        condition: item.condition_state || 'like_new',
                        location: item.location || 'Areál závodu',
                        images: images,
                        image_base64: images[0],
                        image_url: images[0],
                        user_id: Number(item.user_id),
                        status: item.status || 'active',
                        created_at: item.created_at,
                        views_count: Number(item.views_count) || 0,
                        publisher_name: item.publisher_name,
                        publisher_phone: item.publisher_phone,
                        publisher_email: item.publisher_email,
                        publisher_department: item.publisher_department,
                        publisher_avatar: item.publisher_avatar,
                        publisher_rating: Number(item.publisher_rating) || 5.0,
                        is_favorite: Boolean(item.is_favorite)
                    };
                });

                this.data.items = mappedItems;
                this.saveDatabase();

                window.dispatchEvent(new CustomEvent('smc_api_synced', { detail: { count: mappedItems.length } }));
                if (typeof window.loadItems === 'function') {
                    window.loadItems();
                }
                if (typeof window.loadStats === 'function') {
                    window.loadStats();
                }
                console.log(`[SMC API] Úspěšně synchronizováno ${mappedItems.length} inzerátů z MySQL na Endora.`);
            }
        } catch (err) {
            console.warn('[SMC API] Vzdálené API nedostupné, běžíme v offline režimu:', err);
        }
    }

    loadDatabase() {
        try {
            const raw = localStorage.getItem(DB_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.items && Array.isArray(parsed.items)) {
                    parsed.items.forEach(item => {
                        if (!Array.isArray(item.images) || item.images.length === 0) {
                            item.images = item.image_base64 ? [item.image_base64] : (item.image_url ? [item.image_url] : []);
                        }
                    });
                }
                return parsed;
            }
        } catch (e) {
            console.warn('Chyba při čtení localStorage, vytvářím novou databázi:', e);
        }
        return this.initDefaultDatabase();
    }

    saveDatabase() {
        try {
            localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Chyba při ukládání do localStorage:', e);
        }
    }

    initDefaultDatabase() {
        const initialDb = {
            community_codes: ['ZAVOD2026', 'SMC450', 'KOMUNITA', 'HALA1', 'VYROBA', 'SMC_OFFICIAL'],
            users: [
                {
                    id: 1,
                    username: 'michal',
                    password: '1234',
                    name: 'Michal Kováč',
                    display_name: 'Michal (Směna B - Montáž)',
                    role: 'user',
                    department: 'Směna B • Montážní hala',
                    location: 'Bytča & okolí',
                    email: 'michal.kovac.privat@gmail.com',
                    phone: '+421 905 123 456',
                    avatar_text: 'MK',
                    rating: 4.9,
                    rating_count: 14,
                    registered_at: '2026-01-15T09:30:00Z',
                    bio: 'Zaměstnanec montáže, ve volném čase rád kutilstvím a opravuji jízdní kola.'
                },
                {
                    id: 2,
                    username: 'lucia',
                    password: '1234',
                    name: 'Lucie Molnárová',
                    display_name: 'Lucie (Logistika & Sklad)',
                    role: 'user',
                    department: 'Denní směna • Logistika a příjem',
                    location: 'Žilina - Vlčince',
                    email: 'lucia.molnarova77@azet.sk',
                    phone: '+421 911 234 567',
                    avatar_text: 'LM',
                    rating: 5.0,
                    rating_count: 8,
                    registered_at: '2026-02-01T14:20:00Z',
                    bio: 'Maminka dvou dětí, posílám dál věci po dcerce a nabízím bio ovoce z vlastního sadu.'
                },
                {
                    id: 3,
                    username: 'peter_mod',
                    password: '1234',
                    name: 'Petr Varga',
                    display_name: 'Petr Varga (Správce komunity)',
                    role: 'moderator',
                    department: 'Údržba strojů • Závodní výbor',
                    location: 'Kysucké Nové Mesto',
                    email: 'peter.varga.komunita@centrum.sk',
                    phone: '+421 908 345 678',
                    avatar_text: 'PV',
                    rating: 4.8,
                    rating_count: 22,
                    registered_at: '2025-11-10T08:00:00Z',
                    bio: 'Dobrovolný moderátor naší zaměstnanecké komunity. Záleží mi na férovém a přátelském prostředí.'
                },
                {
                    id: 4,
                    username: 'smc',
                    password: '1234',
                    name: 'SMC Průmyslová Správa',
                    display_name: 'Oficiální prodej SMC (Vyřazené vybavení)',
                    role: 'official_smc',
                    is_official: true,
                    department: 'Správa majetku & Technická údržba závodu',
                    location: 'Areál závodu SMC • Výdejna expedice / Vrátnice',
                    email: 'odprodej.vybaveni@smc.cz',
                    phone: '+421 41 500 1234 (klapka 210)',
                    avatar_text: 'SMC',
                    rating: 5.0,
                    rating_count: 48,
                    registered_at: '2025-01-01T08:00:00Z',
                    bio: 'Oficiální firemní účet společnosti SMC pro odprodej a darování vyřazeného, plně funkčního nebo modernizovaného vybavení závodu pro zaměstnance (kancelářský nábytek, měřicí technika, servisní nářadí, IT monitory). Veškeré zboží má protokol o vyřazení.'
                },
                {
                    id: 5,
                    username: 'admin',
                    password: '1234',
                    name: 'Hlavní Administrátor',
                    display_name: 'Hlavní Administrátor (Správce)',
                    role: 'admin',
                    department: 'Správa komunity & Bezpečnost závodu',
                    location: 'Centrála závodu SMC',
                    email: 'admin.komunita@smc.cz',
                    phone: '+421 900 111 222',
                    avatar_text: 'ADM',
                    rating: 5.0,
                    rating_count: 50,
                    registered_at: '2024-01-01T08:00:00Z',
                    bio: 'Hlavní administrátor komunitního tržiště. Správa uživatelských účtů, moderace obsahu a audit transakcí.'
                },
                {
                    id: 6,
                    username: 'tomas_n',
                    password: '1234',
                    name: 'Tomáš Novák',
                    display_name: 'Tomáš Novák (Montáž A)',
                    role: 'user',
                    department: 'Montážní linka A',
                    location: 'Bytča',
                    email: 'tomas.novak@gmail.com',
                    phone: '+421 902 111 222',
                    avatar_text: 'TN',
                    rating: 4.8,
                    rating_count: 11,
                    registered_at: '2026-02-10T10:00:00Z',
                    bio: 'Technik montážní linky A.'
                },
                {
                    id: 7,
                    username: 'zuzka_h',
                    password: '1234',
                    name: 'Zuzana Horváthová',
                    display_name: 'Zuzana Horváthová (QA)',
                    role: 'user',
                    department: 'Kontrola kvality (QA)',
                    location: 'Žilina',
                    email: 'zuzana.h@azet.sk',
                    phone: '+421 903 222 333',
                    avatar_text: 'ZH',
                    rating: 4.9,
                    rating_count: 15,
                    registered_at: '2026-02-12T08:30:00Z',
                    bio: 'Inspektorka jakosti.'
                },
                {
                    id: 8,
                    username: 'martin_k',
                    password: '1234',
                    name: 'Martin Kříž',
                    display_name: 'Martin Kříž (CNC)',
                    role: 'user',
                    department: 'CNC Frézování & Soustružení',
                    location: 'Kysucké Nové Mesto',
                    email: 'martin.kriz@centrum.sk',
                    phone: '+421 904 333 444',
                    avatar_text: 'MK',
                    rating: 5.0,
                    rating_count: 9,
                    registered_at: '2026-01-20T11:15:00Z',
                    bio: 'CNC operátor a kutil.'
                },
                {
                    id: 9,
                    username: 'jana_d',
                    password: '1234',
                    name: 'Jana Dvořáková',
                    display_name: 'Jana Dvořáková (HR)',
                    role: 'user',
                    department: 'Personální & HR oddělení',
                    location: 'Považská Bystrica',
                    email: 'jana.dvorakova@post.sk',
                    phone: '+421 905 444 555',
                    avatar_text: 'JD',
                    rating: 4.7,
                    rating_count: 6,
                    registered_at: '2026-01-25T14:00:00Z',
                    bio: 'HR koordinátorka.'
                },
                {
                    id: 10,
                    username: 'david_p',
                    password: '1234',
                    name: 'David Procházka',
                    display_name: 'David Procházka (Elektro)',
                    role: 'user',
                    department: 'Elektroúdržba & Automatizace',
                    location: 'Žilina',
                    email: 'david.p@gmail.com',
                    phone: '+421 906 555 666',
                    avatar_text: 'DP',
                    rating: 4.9,
                    rating_count: 18,
                    registered_at: '2026-02-05T09:45:00Z',
                    bio: 'Elektromechanik MaR.'
                },
                {
                    id: 11,
                    username: 'katka_c',
                    password: '1234',
                    name: 'Kateřina Černá',
                    display_name: 'Kateřina Černá (Finance)',
                    role: 'user',
                    department: 'Finanční účtárna závodu',
                    location: 'Bytča',
                    email: 'katerina.cerna@azet.sk',
                    phone: '+421 907 666 777',
                    avatar_text: 'KC',
                    rating: 5.0,
                    rating_count: 12,
                    registered_at: '2026-01-18T13:20:00Z',
                    bio: 'Účetní závodu.'
                },
                {
                    id: 12,
                    username: 'jakub_n',
                    password: '1234',
                    name: 'Jakub Němec',
                    display_name: 'Jakub Němec (Lisovna)',
                    role: 'user',
                    department: 'Směna C • Lisovna plechů',
                    location: 'Čadca',
                    email: 'jakub.nemec@gmail.com',
                    phone: '+421 908 777 888',
                    avatar_text: 'JN',
                    rating: 4.6,
                    rating_count: 8,
                    registered_at: '2026-02-14T07:50:00Z',
                    bio: 'Seřizovač lisů.'
                },
                {
                    id: 13,
                    username: 'veronika_p',
                    password: '1234',
                    name: 'Veronika Pospíšilová',
                    display_name: 'Veronika Pospíšilová (Logistika)',
                    role: 'user',
                    department: 'Vstupní a výstupní logistika',
                    location: 'Martin',
                    email: 'veronika.p@centrum.sk',
                    phone: '+421 909 888 999',
                    avatar_text: 'VP',
                    rating: 4.8,
                    rating_count: 14,
                    registered_at: '2026-01-29T16:10:00Z',
                    bio: 'Disponentka dopravy.'
                },
                {
                    id: 14,
                    username: 'jan_pokorny',
                    password: '1234',
                    name: 'Jan Pokorný',
                    display_name: 'Jan Pokorný (Moderátor • Nástrojárna)',
                    role: 'moderator',
                    department: 'Nástrojárna & Formy',
                    location: 'Žilina',
                    email: 'jan.pokorny.mod@centrum.sk',
                    phone: '+421 910 999 000',
                    avatar_text: 'JP',
                    rating: 4.9,
                    rating_count: 25,
                    registered_at: '2025-12-01T08:00:00Z',
                    bio: 'Mistr nástrojárny a dobrovolný moderátor komunity.'
                },
                {
                    id: 15,
                    username: 'misa_m',
                    password: '1234',
                    name: 'Michaela Marešová',
                    display_name: 'Michaela Marešová (Expedice)',
                    role: 'user',
                    department: 'Balení a expedice výrobků',
                    location: 'Rajec',
                    email: 'michaela.m@azet.sk',
                    phone: '+421 911 000 111',
                    avatar_text: 'MM',
                    rating: 5.0,
                    rating_count: 10,
                    registered_at: '2026-02-02T12:00:00Z',
                    bio: 'Pracovnice expedice.'
                },
                {
                    id: 16,
                    username: 'jiri_v',
                    password: '1234',
                    name: 'Jiří Veselý',
                    display_name: 'Jiří Veselý (Robotika)',
                    role: 'user',
                    department: 'Robotika & Pneumatické linky',
                    location: 'Bytča',
                    email: 'jiri.vesely@gmail.com',
                    phone: '+421 912 111 222',
                    avatar_text: 'JV',
                    rating: 4.7,
                    rating_count: 7,
                    registered_at: '2026-02-08T15:30:00Z',
                    bio: 'Robotik SMC linek.'
                },
                {
                    id: 17,
                    username: 'lenka_r',
                    password: '1234',
                    name: 'Lenka Růžičková',
                    display_name: 'Lenka Růžičková (BOZP)',
                    role: 'user',
                    department: 'Bezpečnost práce BOZP & PO',
                    location: 'Žilina',
                    email: 'lenka.r@post.sk',
                    phone: '+421 913 222 333',
                    avatar_text: 'LR',
                    rating: 5.0,
                    rating_count: 16,
                    registered_at: '2026-01-10T10:20:00Z',
                    bio: 'Bezpečnostní technička.'
                },
                {
                    id: 18,
                    username: 'radek_j',
                    password: '1234',
                    name: 'Radek Jelínek',
                    display_name: 'Radek Jelínek (Sklad)',
                    role: 'user',
                    department: 'Sklad surovin a polotovarů',
                    location: 'Považská Bystrica',
                    email: 'radek.j@azet.sk',
                    phone: '+421 914 333 444',
                    avatar_text: 'RJ',
                    rating: 4.5,
                    rating_count: 5,
                    registered_at: '2026-02-15T09:10:00Z',
                    bio: 'Skladník.'
                },
                {
                    id: 19,
                    username: 'simona_s',
                    password: '1234',
                    name: 'Simona Sedláčková',
                    display_name: 'Simona Sedláčková (R&D)',
                    role: 'user',
                    department: 'Technologický vývoj & R&D',
                    location: 'Žilina',
                    email: 'simona.s@gmail.com',
                    phone: '+421 915 444 555',
                    avatar_text: 'SS',
                    rating: 4.9,
                    rating_count: 13,
                    registered_at: '2026-01-22T14:45:00Z',
                    bio: 'Vývojová inženýrka.'
                },
                {
                    id: 20,
                    username: 'filip_m',
                    password: '1234',
                    name: 'Filip Mach',
                    display_name: 'Filip Mach (Údržba)',
                    role: 'user',
                    department: 'Údržba kompresorových stanic',
                    location: 'Kysucké Nové Mesto',
                    email: 'filip.mach@centrum.sk',
                    phone: '+421 916 555 666',
                    avatar_text: 'FM',
                    rating: 4.8,
                    rating_count: 12,
                    registered_at: '2026-01-30T11:00:00Z',
                    bio: 'Servisní mechanik.'
                },
                {
                    id: 21,
                    username: 'bara_u',
                    password: '1234',
                    name: 'Barbora Urbanová',
                    display_name: 'Barbora Urbanová (Montáž)',
                    role: 'user',
                    department: 'Denní směna • Montáž ventilů',
                    location: 'Bytča',
                    email: 'barbora.u@gmail.com',
                    phone: '+421 917 666 777',
                    avatar_text: 'BU',
                    rating: 4.9,
                    rating_count: 9,
                    registered_at: '2026-02-03T08:15:00Z',
                    bio: 'Montážní technička.'
                },
                {
                    id: 22,
                    username: 'lukas_h',
                    password: '1234',
                    name: 'Lukáš Holub',
                    display_name: 'Lukáš Holub (Zkušebna)',
                    role: 'user',
                    department: 'Technická zkušebna výrobků',
                    location: 'Žilina',
                    email: 'lukas.h@azet.sk',
                    phone: '+421 918 777 888',
                    avatar_text: 'LH',
                    rating: 4.6,
                    rating_count: 7,
                    registered_at: '2026-02-11T13:40:00Z',
                    bio: 'Testovací technik.'
                },
                {
                    id: 23,
                    username: 'marketa_k',
                    password: '1234',
                    name: 'Markéta Králová',
                    display_name: 'Markéta Králová (Dispečink)',
                    role: 'user',
                    department: 'Plánování výroby & Dispečink',
                    location: 'Martin',
                    email: 'marketa.k@post.sk',
                    phone: '+421 919 888 999',
                    avatar_text: 'MK',
                    rating: 5.0,
                    rating_count: 17,
                    registered_at: '2026-01-14T10:00:00Z',
                    bio: 'Plánovačka výroby.'
                },
                {
                    id: 24,
                    username: 'petr_simek',
                    password: '1234',
                    name: 'Petr Šimek',
                    display_name: 'Petr Šimek (Zámečník)',
                    role: 'user',
                    department: 'Zámečnická dílna závodu',
                    location: 'Čadca',
                    email: 'petr.simek@gmail.com',
                    phone: '+421 920 999 000',
                    avatar_text: 'PS',
                    rating: 4.8,
                    rating_count: 11,
                    registered_at: '2026-01-28T09:25:00Z',
                    bio: 'Zámečník údržby.'
                },
                {
                    id: 25,
                    username: 'eva_b',
                    password: '1234',
                    name: 'Eva Benešová',
                    display_name: 'Eva Benešová (Recepce)',
                    role: 'user',
                    department: 'Recepce & Správa budov',
                    location: 'Žilina',
                    email: 'eva.benesova@azet.sk',
                    phone: '+421 921 000 111',
                    avatar_text: 'EB',
                    rating: 4.9,
                    rating_count: 14,
                    registered_at: '2026-02-06T08:50:00Z',
                    bio: 'Recepční centrály.'
                },
                {
                    id: 26,
                    username: 'daniel_f',
                    password: '1234',
                    name: 'Daniel Fiala',
                    display_name: 'Daniel Fiala (ISO)',
                    role: 'user',
                    department: 'Řízení jakosti ISO & Audity',
                    location: 'Bytča',
                    email: 'daniel.f@gmail.com',
                    phone: '+421 922 111 222',
                    avatar_text: 'DF',
                    rating: 4.7,
                    rating_count: 8,
                    registered_at: '2026-02-09T14:15:00Z',
                    bio: 'Auditor kvality.'
                },
                {
                    id: 27,
                    username: 'tereza_m',
                    password: '1234',
                    name: 'Tereza Malá',
                    display_name: 'Tereza Malá (Laboratoř)',
                    role: 'user',
                    department: 'Laboratoř metalografie',
                    location: 'Žilina',
                    email: 'tereza.m@centrum.sk',
                    phone: '+421 923 222 333',
                    avatar_text: 'TM',
                    rating: 5.0,
                    rating_count: 19,
                    registered_at: '2026-01-16T11:30:00Z',
                    bio: 'Laborantka.'
                },
                {
                    id: 28,
                    username: 'roman_k',
                    password: '1234',
                    name: 'Roman Kolář',
                    display_name: 'Roman Kolář (Lakovna)',
                    role: 'user',
                    department: 'Lakovna & Práškové lakování',
                    location: 'Považská Bystrica',
                    email: 'roman.k@azet.sk',
                    phone: '+421 924 333 444',
                    avatar_text: 'RK',
                    rating: 4.4,
                    rating_count: 6,
                    registered_at: '2026-02-13T16:00:00Z',
                    bio: 'Laktař.'
                },
                {
                    id: 29,
                    username: 'monika_v',
                    password: '1234',
                    name: 'Monika Vlčková',
                    display_name: 'Monika Vlčková (Stravování)',
                    role: 'user',
                    department: 'Závodní jídelna & Stravování',
                    location: 'Kysucké Nové Mesto',
                    email: 'monika.v@post.sk',
                    phone: '+421 925 444 555',
                    avatar_text: 'MV',
                    rating: 4.9,
                    rating_count: 22,
                    registered_at: '2026-01-19T07:40:00Z',
                    bio: 'Vedoucí jídelny.'
                },
                {
                    id: 30,
                    username: 'patrik_b',
                    password: '1234',
                    name: 'Patrik Bartoš',
                    display_name: 'Patrik Bartoš (Montáž A)',
                    role: 'user',
                    department: 'Směna A • Montáž pístů',
                    location: 'Bytča',
                    email: 'patrik.b@gmail.com',
                    phone: '+421 926 555 666',
                    avatar_text: 'PB',
                    rating: 4.8,
                    rating_count: 10,
                    registered_at: '2026-02-04T12:20:00Z',
                    bio: 'Operátor montáže.'
                },
                {
                    id: 31,
                    username: 'alena_s',
                    password: '1234',
                    name: 'Alena Štěpánková',
                    display_name: 'Alena Štěpánková (Sanitace)',
                    role: 'user',
                    department: 'Úklid & Sanitace provozu',
                    location: 'Žilina',
                    email: 'alena.s@azet.sk',
                    phone: '+421 927 666 777',
                    avatar_text: 'AS',
                    rating: 5.0,
                    rating_count: 15,
                    registered_at: '2026-01-24T15:10:00Z',
                    bio: 'Pracovnice úklidu.'
                },
                {
                    id: 32,
                    username: 'richard_b',
                    password: '1234',
                    name: 'Richard Blažek',
                    display_name: 'Richard Blažek (Moderátor • IT)',
                    role: 'moderator',
                    department: 'IT podpora & Správa sítě závodu',
                    location: 'Žilina',
                    email: 'richard.blazek.mod@centrum.sk',
                    phone: '+421 928 777 888',
                    avatar_text: 'RB',
                    rating: 4.9,
                    rating_count: 28,
                    registered_at: '2025-10-15T09:00:00Z',
                    bio: 'Síťový administrátor a moderátor komunitního trhu.'
                },
                {
                    id: 33,
                    username: 'petra_h',
                    password: '1234',
                    name: 'Petra Háková',
                    display_name: 'Petra Háková (Kantýna)',
                    role: 'user',
                    department: 'Podniková prodejna a kantýna',
                    location: 'Rajec',
                    email: 'petra.h@gmail.com',
                    phone: '+421 929 888 999',
                    avatar_text: 'PH',
                    rating: 4.8,
                    rating_count: 13,
                    registered_at: '2026-02-07T10:45:00Z',
                    bio: 'Vedoucí kantýny.'
                },
                {
                    id: 34,
                    username: 'robert_k',
                    password: '1234',
                    name: 'Robert Kopecký',
                    display_name: 'Robert Kopecký (Svařovna)',
                    role: 'user',
                    department: 'Svařovna & Robotické buňky',
                    location: 'Čadca',
                    email: 'robert.k@azet.sk',
                    phone: '+421 930 999 000',
                    avatar_text: 'RK',
                    rating: 4.6,
                    rating_count: 8,
                    registered_at: '2026-01-27T13:00:00Z',
                    bio: 'Svářeč robotických linek.'
                },
                {
                    id: 35,
                    username: 'ivana_s',
                    password: '1234',
                    name: 'Ivana Soukupová',
                    display_name: 'Ivana Soukupová (Nákup)',
                    role: 'user',
                    department: 'Nákup materiálu a subdodávky',
                    location: 'Martin',
                    email: 'ivana.s@post.sk',
                    phone: '+421 931 000 111',
                    avatar_text: 'IS',
                    rating: 5.0,
                    rating_count: 20,
                    registered_at: '2026-01-12T08:30:00Z',
                    bio: 'Nákupčí komponentů.'
                },
                {
                    id: 36,
                    username: 'ondrej_t',
                    password: '1234',
                    name: 'Ondřej Tichý',
                    display_name: 'Ondřej Tichý (Výdejna nářadí)',
                    role: 'user',
                    department: 'Výdej nářadí a přípravků',
                    location: 'Bytča',
                    email: 'ondrej.t@gmail.com',
                    phone: '+421 932 111 222',
                    avatar_text: 'OT',
                    rating: 4.7,
                    rating_count: 9,
                    registered_at: '2026-02-16T11:20:00Z',
                    bio: 'Správce výdejny.'
                },
                {
                    id: 37,
                    username: 'gabriela_b',
                    password: '1234',
                    name: 'Gabriela Beranová',
                    display_name: 'Gabriela Beranová (Elektromontáž)',
                    role: 'user',
                    department: 'Montáž elektropohonů',
                    location: 'Žilina',
                    email: 'gabriela.b@centrum.sk',
                    phone: '+421 933 222 333',
                    avatar_text: 'GB',
                    rating: 4.9,
                    rating_count: 11,
                    registered_at: '2026-01-23T14:10:00Z',
                    bio: 'Elektromontérka.'
                },
                {
                    id: 38,
                    username: 'stanislav_s',
                    password: '1234',
                    name: 'Stanislav Strnad',
                    display_name: 'Stanislav Strnad (Energetika)',
                    role: 'user',
                    department: 'Energetika závodu & Kotelna',
                    location: 'Považská Bystrica',
                    email: 'stanislav.s@azet.sk',
                    phone: '+421 934 333 444',
                    avatar_text: 'SS',
                    rating: 4.8,
                    rating_count: 16,
                    registered_at: '2026-01-17T09:15:00Z',
                    bio: 'Energetik.'
                },
                {
                    id: 39,
                    username: 'kristyna_h',
                    password: '1234',
                    name: 'Kristýna Horáková',
                    display_name: 'Kristýna Horáková (Konstrukce)',
                    role: 'user',
                    department: 'Konstrukce přípravků & CAD',
                    location: 'Žilina',
                    email: 'kristyna.h@gmail.com',
                    phone: '+421 935 444 555',
                    avatar_text: 'KH',
                    rating: 5.0,
                    rating_count: 14,
                    registered_at: '2026-02-01T15:45:00Z',
                    bio: 'Konstruktérka.'
                },
                {
                    id: 40,
                    username: 'vladimir_p',
                    password: '1234',
                    name: 'Vladimír Pešek',
                    display_name: 'Vladimír Pešek (NDT)',
                    role: 'user',
                    department: 'Kontrola svarů & NDT testování',
                    location: 'Kysucké Nové Mesto',
                    email: 'vladimir.p@post.sk',
                    phone: '+421 936 555 666',
                    avatar_text: 'VP',
                    rating: 4.5,
                    rating_count: 6,
                    registered_at: '2026-02-17T08:00:00Z',
                    bio: 'NDT defektoskop.'
                },
                {
                    id: 41,
                    username: 'adela_v',
                    password: '1234',
                    name: 'Adéla Vávrová',
                    display_name: 'Adéla Vávrová (Ekologie)',
                    role: 'user',
                    department: 'Ekologie závodu & Odpady',
                    location: 'Bytča',
                    email: 'adela.v@azet.sk',
                    phone: '+421 937 666 777',
                    avatar_text: 'AV',
                    rating: 4.9,
                    rating_count: 12,
                    registered_at: '2026-01-21T12:35:00Z',
                    bio: 'Ekoložka.'
                },
                {
                    id: 42,
                    username: 'jaroslav_d',
                    password: '1234',
                    name: 'Jaroslav Dušek',
                    display_name: 'Jaroslav Dušek (Prototypy)',
                    role: 'user',
                    department: 'Prototypová dílna SMC',
                    location: 'Žilina',
                    email: 'jaroslav.d@gmail.com',
                    phone: '+421 938 777 888',
                    avatar_text: 'JD',
                    rating: 5.0,
                    rating_count: 21,
                    registered_at: '2026-01-11T10:50:00Z',
                    bio: 'Modelář a prototypář.'
                },
                {
                    id: 43,
                    username: 'nikola_s',
                    password: '1234',
                    name: 'Nikola Šťastná',
                    display_name: 'Nikola Šťastná (Metrologie)',
                    role: 'user',
                    department: 'Metrologie & Kalibrace měřidel',
                    location: 'Martin',
                    email: 'nikola.s@centrum.sk',
                    phone: '+421 939 888 999',
                    avatar_text: 'NS',
                    rating: 4.8,
                    rating_count: 10,
                    registered_at: '2026-02-18T14:00:00Z',
                    bio: 'Metrologička.'
                },
                {
                    id: 44,
                    username: 'ales_m',
                    password: '1234',
                    name: 'Aleš Matoušek',
                    display_name: 'Aleš Matoušek (Logistika VZV)',
                    role: 'user',
                    department: 'Vysokozdvižné vozíky & Manipulace',
                    location: 'Čadca',
                    email: 'ales.m@azet.sk',
                    phone: '+421 940 999 000',
                    avatar_text: 'AM',
                    rating: 4.6,
                    rating_count: 7,
                    registered_at: '2026-01-26T07:30:00Z',
                    bio: 'Řidič VZV.'
                },
                {
                    id: 45,
                    username: 'eliska_s',
                    password: '1234',
                    name: 'Eliška Sýkorová',
                    display_name: 'Eliška Sýkorová (Těsnost)',
                    role: 'user',
                    department: 'Směna B • Testování těsnosti ventilů',
                    location: 'Žilina',
                    email: 'eliska.s@gmail.com',
                    phone: '+421 941 000 111',
                    avatar_text: 'ES',
                    rating: 4.9,
                    rating_count: 15,
                    registered_at: '2026-02-05T13:15:00Z',
                    bio: 'Testerka.'
                },
                {
                    id: 46,
                    username: 'milan_k',
                    password: '1234',
                    name: 'Milan Kmenta',
                    display_name: 'Milan Kmenta (Sklad ND)',
                    role: 'user',
                    department: 'Centrální sklad náhradních dílů',
                    location: 'Bytča',
                    email: 'milan.k@post.sk',
                    phone: '+421 942 111 222',
                    avatar_text: 'MK',
                    rating: 4.7,
                    rating_count: 8,
                    registered_at: '2026-02-15T16:40:00Z',
                    bio: 'Skladník ND.'
                },
                {
                    id: 47,
                    username: 'denisa_r',
                    password: '1234',
                    name: 'Denisa Říhová',
                    display_name: 'Denisa Říhová (Školení)',
                    role: 'user',
                    department: 'Školení zaměstnanců & BOZP',
                    location: 'Považská Bystrica',
                    email: 'denisa.r@azet.sk',
                    phone: '+421 943 222 333',
                    avatar_text: 'DR',
                    rating: 5.0,
                    rating_count: 18,
                    registered_at: '2026-01-13T09:00:00Z',
                    bio: 'Lektorka školení.'
                },
                {
                    id: 48,
                    username: 'vit_ch',
                    password: '1234',
                    name: 'Vít Chrudimský',
                    display_name: 'Vít Chrudimský (Zakladače)',
                    role: 'user',
                    department: 'Automatizované zakladače',
                    location: 'Žilina',
                    email: 'vit.ch@gmail.com',
                    phone: '+421 944 333 444',
                    avatar_text: 'VC',
                    rating: 4.8,
                    rating_count: 11,
                    registered_at: '2026-02-12T11:45:00Z',
                    bio: 'Technik zakladačů.'
                },
                {
                    id: 49,
                    username: 'kamila_t',
                    password: '1234',
                    name: 'Kamila Trojanová',
                    display_name: 'Kamila Trojanová (Vstupní kontrola)',
                    role: 'user',
                    department: 'Vstupní kontrola komponentů',
                    location: 'Kysucké Nové Mesto',
                    email: 'kamila.t@centrum.sk',
                    phone: '+421 945 444 555',
                    avatar_text: 'KT',
                    rating: 4.9,
                    rating_count: 13,
                    registered_at: '2026-01-31T14:20:00Z',
                    bio: 'Kontrolorka vstupního materiálu.'
                },
                {
                    id: 50,
                    username: 'boris_v',
                    password: '1234',
                    name: 'Boris Valenta',
                    display_name: 'Boris Valenta (Hydraulika)',
                    role: 'user',
                    department: 'Údržba hydrauliky a chlazení',
                    location: 'Rajec',
                    email: 'boris.v@post.sk',
                    phone: '+421 946 555 666',
                    avatar_text: 'BV',
                    rating: 4.7,
                    rating_count: 9,
                    registered_at: '2026-02-10T15:00:00Z',
                    bio: 'Hydraulik.'
                },
                {
                    id: 51,
                    username: 'dagmar_l',
                    password: '1234',
                    name: 'Dagmar Lukešová',
                    display_name: 'Dagmar Lukešová (Mzdy)',
                    role: 'user',
                    department: 'Evidence smluv a mezd',
                    location: 'Martin',
                    email: 'dagmar.l@azet.sk',
                    phone: '+421 947 666 777',
                    avatar_text: 'DL',
                    rating: 5.0,
                    rating_count: 23,
                    registered_at: '2026-01-15T08:15:00Z',
                    bio: 'Mzdová účetní.'
                },
                {
                    id: 52,
                    username: 'erik_z',
                    password: '1234',
                    name: 'Erik Žáček',
                    display_name: 'Erik Žáček (Laser)',
                    role: 'user',
                    department: 'Laserové řezání & Značení',
                    location: 'Bytča',
                    email: 'erik.z@gmail.com',
                    phone: '+421 948 777 888',
                    avatar_text: 'EZ',
                    rating: 4.8,
                    rating_count: 10,
                    registered_at: '2026-02-08T10:30:00Z',
                    bio: 'Laserový operátor.'
                },
                {
                    id: 53,
                    username: 'sabina_h',
                    password: '1234',
                    name: 'Sabina Hrušková',
                    display_name: 'Sabina Hrušková (Montáž 2)',
                    role: 'user',
                    department: 'Montážní hala 2 • Denní směna',
                    location: 'Žilina',
                    email: 'sabina.h@centrum.sk',
                    phone: '+421 949 888 999',
                    avatar_text: 'SH',
                    rating: 4.9,
                    rating_count: 14,
                    registered_at: '2026-01-20T12:00:00Z',
                    bio: 'Operátorka montáže 2.'
                },
                {
                    id: 54,
                    username: 'smc_repas',
                    password: '1234',
                    name: 'SMC Servis & Repas Centrum',
                    display_name: 'SMC Servis & Repase (Firma)',
                    role: 'official_smc',
                    is_official: true,
                    department: 'Správa repasovaného vybavení SMC',
                    location: 'Areál závodu SMC • Hala D (Výdej nářadí)',
                    email: 'repase@smc.cz',
                    phone: '+421 41 500 5678',
                    avatar_text: 'REP',
                    rating: 5.0,
                    rating_count: 32,
                    registered_at: '2025-06-01T08:00:00Z',
                    bio: 'Oficiální firemní účet SMC pro repase, náhradní díly a renovované servisní přípravky.'
                },
                {
                    id: 55,
                    username: 'vojtech_z',
                    password: '1234',
                    name: 'Vojtěch Zeman',
                    display_name: 'Vojtěch Zeman (Expedice C)',
                    role: 'user',
                    department: 'Směna C • Expedice hotových výrobků',
                    location: 'Žilina',
                    email: 'vojtech.z@gmail.com',
                    phone: '+421 950 000 111',
                    avatar_text: 'VZ',
                    rating: 4.8,
                    rating_count: 12,
                    registered_at: '2026-02-19T07:15:00Z',
                    bio: 'Expedient hotových pneumatických válců.'
                }
            ],
            categories: [
                { id: 'home_garden', name: 'Domov, byt & zahrada', icon: 'fa-house-chimney-window', badge_color: '#16A34A' },
                { id: 'tools_workshop', name: 'Dílna, stavba & nářadí', icon: 'fa-screwdriver-wrench', badge_color: '#D97706' },
                { id: 'auto_moto', name: 'Auto-moto & pneumatiky', icon: 'fa-car', badge_color: '#0284C7' },
                { id: 'sport_leisure', name: 'Sport, kola & turistika', icon: 'fa-person-biking', badge_color: '#7C3AED' },
                { id: 'kids_family', name: 'Děti, kočárky & hračky', icon: 'fa-baby-carriage', badge_color: '#EC4899' },
                { id: 'electronics', name: 'Elektronika & smart home', icon: 'fa-tv', badge_color: '#2563EB' },
                { id: 'produce_food', name: 'Zahrada & domácí přebytky', icon: 'fa-apple-whole', badge_color: '#EA580C' }
            ],
            items: [],
            favorites: [],
            inquiries: [],
            reports: [],
            reviews: [],
            audit_logs: [
                {
                    id: 1,
                    user_id: 5,
                    action: 'system_init',
                    target_type: 'system',
                    target_id: 1,
                    details: 'Inicializace administrátorského rozhraní SMC komunitního tržiště.',
                    timestamp: new Date().toISOString()
                }
            ]
        };
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initialDb));
        return initialDb;
    }

    resetDatabase() {
        localStorage.removeItem(DB_STORAGE_KEY);
        this.data = this.initDefaultDatabase();
        return this.data;
    }

    // --- AUTH, MEMBERSHIP & SESSION ---

    login(username, password) {
        const query = username.trim().toLowerCase();
        const user = this.data.users.find(
            u => (u.username.toLowerCase() === query || (u.username === 'smc' && query === 'smc_official')) && u.password === password.trim()
        );
        if (!user) {
            return { success: false, error: 'Neplatné přihlašovací jméno nebo heslo. Pro testování použijte heslo: 1234' };
        }
        if (user.is_banned) {
            return { success: false, error: 'Tento účet byl pozastaven administrátorem pro porušení pravidel komunity.' };
        }
        const sessionUser = { ...user };
        delete sessionUser.password;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
        return { success: true, user: sessionUser };
    }

    register(userData) {
        if (!userData.username || !userData.password || !userData.name) {
            return { success: false, error: 'Vyplňte prosím všechna povinná pole (jméno, přihlašovací jméno a heslo).' };
        }

        const enteredCode = (userData.community_code || '').trim().toUpperCase();
        if (!this.data.community_codes.includes(enteredCode)) {
            return {
                success: false,
                error: 'Neplatný kód komunity. Přístup je vyhrazen pro zaměstnance závodu. Kód najdete na nástěnce v šatnách / jídelně (např. ZAVOD2026).'
            };
        }

        const exists = this.data.users.some(u => u.username.toLowerCase() === userData.username.trim().toLowerCase());
        if (exists) {
            return { success: false, error: 'Toto uživatelské jméno je již obsazené. Zvolte si prosím jiné.' };
        }

        const nextId = this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
        const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ZK';

        const newUser = {
            id: nextId,
            username: userData.username.trim().toLowerCase(),
            password: userData.password.trim(),
            name: userData.name.trim(),
            display_name: userData.name.trim(),
            role: 'user',
            department: userData.department || 'Zaměstnanec závodu',
            location: userData.location || 'Bytča / Žilina',
            email: userData.email || '',
            phone: userData.phone || '',
            avatar_text: initials,
            rating: 5.0,
            rating_count: 0,
            rules_accepted: false,
            registered_at: new Date().toISOString(),
            bio: 'Člen zaměstnanecké komunity.'
        };

        this.data.users.push(newUser);
        this.addAuditLog(newUser.id, 'user_register', 'user', newUser.id, `Registrace nového člena komunity přes kód ${enteredCode}`);
        this.saveDatabase();

        const sessionUser = { ...newUser };
        delete sessionUser.password;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));

        return { success: true, user: sessionUser, message: 'Registrace byla úspěšná! Vítejte v komunitě.' };
    }

    getCurrentUser() {
        try {
            const raw = localStorage.getItem(SESSION_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    setCurrentUser(user) {
        try {
            if (user) {
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(SESSION_STORAGE_KEY);
            }
        } catch (e) {
            console.error('Chyba při ukládání session do localStorage:', e);
        }
    }

    logout() {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    // --- CATEGORIES & STATS ---

    getCategories() {
        return this.data.categories.map(cat => {
            const count = this.data.items.filter(
                i => i.category_id === cat.id && i.status === 'active'
            ).length;
            return { ...cat, items_count: count };
        });
    }

    getStats() {
        const active = this.data.items.filter(i => i.status === 'active').length;
        const reserved = this.data.items.filter(i => i.status === 'reserved').length;
        const free = this.data.items.filter(i => i.price_type === 'free' && i.status === 'active').length;
        const totalCompleted = this.data.items.filter(i => i.status === 'completed' || i.status === 'sold').length;
        const usersCount = this.data.users.length;
        const pendingReports = (this.data.reports || []).filter(r => r.status === 'pending').length;

        return {
            active_items: active,
            reserved_items: reserved,
            free_items: free,
            completed_items: totalCompleted,
            total_users: usersCount,
            pending_reports: pendingReports
        };
    }

    // --- ITEMS (JOIN QUERIES) ---

    getItems(filters = {}, currentUserId = null) {
        let results = this.data.items.map(item => {
            const publisher = this.data.users.find(u => u.id === item.user_id) || {};
            const category = this.data.categories.find(c => c.id === item.category_id) || {};
            const isFav = currentUserId ? this.data.favorites.some(f => f.user_id === currentUserId && f.item_id === item.id) : false;
            const inqCount = 0;

            const isOfficial = Boolean(publisher.is_official || (publisher.username && publisher.username.toLowerCase() === 'smc') || publisher.role === 'official_smc');

            return {
                ...item,
                image_url: item.image_base64 || item.image_url,
                username: publisher.username || '',
                publisher_name: publisher.display_name || publisher.name || 'Člen komunity',
                publisher_role: publisher.role || 'user',
                publisher_department: publisher.department || 'Zaměstnanec závodu',
                publisher_avatar: publisher.avatar_text || 'ZK',
                publisher_rating: publisher.rating || 5.0,
                publisher_rating_count: publisher.rating_count || 0,
                is_official: isOfficial,
                category_name: category.name || item.category_id,
                category_color: category.badge_color || '#005BAC',
                is_favorite: isFav ? 1 : 0,
                inquiries_count: inqCount
            };
        });

        results = results.filter(i => {
            if (i.status === 'removed_by_moderator') return false;
            if (i.status === 'deleted') {
                return Boolean(filters.only_favorites && i.is_favorite === 1);
            }
            return true;
        });

        if (filters.category) {
            results = results.filter(i => i.category_id === filters.category);
        }

        if (filters.price_type) {
            results = results.filter(i => i.price_type === filters.price_type);
        }

        if (filters.condition) {
            results = results.filter(i => i.condition === filters.condition);
        }

        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            results = results.filter(i =>
                (i.title && i.title.toLowerCase().includes(q)) ||
                (i.description && i.description.toLowerCase().includes(q)) ||
                (i.location && i.location.toLowerCase().includes(q)) ||
                (i.publisher_name && i.publisher_name.toLowerCase().includes(q))
            );
        }

        if (filters.user_id) {
            results = results.filter(i => i.user_id === Number(filters.user_id));
        }

        if (filters.only_favorites) {
            results = results.filter(i => i.is_favorite === 1);
        }

        const sort = filters.sort || 'newest';
        if (sort === 'price_asc') {
            results.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sort === 'price_desc') {
            results.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (sort === 'views') {
            results.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        } else {
            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        return results;
    }

    getItemById(itemId, currentUserId = null) {
        const item = this.data.items.find(i => i.id === Number(itemId));
        if (!item) return null;

        item.views_count = (item.views_count || 0) + 1;
        this.saveDatabase();

        const publisher = this.data.users.find(u => u.id === item.user_id) || {};
        const category = this.data.categories.find(c => c.id === item.category_id) || {};
        const isFav = currentUserId ? this.data.favorites.some(f => f.user_id === currentUserId && f.item_id === item.id) : false;

        const currentUser = currentUserId ? this.data.users.find(u => u.id === currentUserId) : null;
        const isSeller = currentUser ? (currentUser.id === item.user_id || currentUser.role === 'moderator' || currentUser.role === 'admin' || currentUser.role === 'official_smc') : false;
        const isOfficial = Boolean(publisher.is_official || (publisher.username && publisher.username.toLowerCase() === 'smc') || publisher.role === 'official_smc');

        const publisherReviews = (this.data.reviews || []).filter(r => r.target_user_id === item.user_id);

        return {
            ...item,
            image_url: item.image_base64 || item.image_url,
            username: publisher.username || '',
            publisher_name: publisher.display_name || publisher.name || 'NeznĂˇmĂ˝ ÄŤlen',
            publisher_role: publisher.role || 'user',
            publisher_department: publisher.department || 'ZamÄ›stnanec zĂˇvodu',
            publisher_email: publisher.email || '',
            publisher_phone: publisher.phone || '',
            publisher_avatar: publisher.avatar_text || 'ZK',
            publisher_rating: publisher.rating || 5.0,
            publisher_rating_count: publisher.rating_count || 0,
            publisher_reviews: publisherReviews,
            is_official: isOfficial,
            category_name: category.name || item.category_id,
            category_color: category.badge_color || '#005BAC',
            is_favorite: isFav ? 1 : 0,
            is_seller: isSeller,
            buyer_threads: [],
            my_thread: [],
            inquiries_count: 0,
            total_inquiries_count: 0
        };
    }

    createItem(itemData, currentUserId) {
        if (!currentUserId) return { success: false, error: 'Pro vytvoření nabídky musíte být přihlášeni.' };

        const nextId = this.data.items.length > 0 ? Math.max(...this.data.items.map(i => i.id)) + 1 : 1;

        const newItem = {
            id: nextId,
            title: itemData.title.trim(),
            description: itemData.description.trim(),
            category_id: itemData.category_id,
            price: Number(itemData.price) || 0,
            price_type: itemData.price_type || 'sell',
            condition: itemData.condition || 'like_new',
            location: itemData.location.trim(),
            image_base64: itemData.image_base64 || EMBEDDED_IMAGES.tools_case,
            user_id: currentUserId,
            status: 'active',
            created_at: new Date().toISOString(),
            views_count: 0
        };

        if (newItem.price_type === 'free' || newItem.price_type === 'swap') {
            newItem.price = 0;
        }

        this.data.items.unshift(newItem);
        this.addAuditLog(currentUserId, 'item_create', 'item', newItem.id, `Přidání nabídky: ${newItem.title}`);
        this.saveDatabase();

        // Odeslání do vzdálené MySQL databáze přes API
        this.sendApiRequest('createItem', {
            user_id: currentUserId,
            category_id: newItem.category_id,
            title: newItem.title,
            description: newItem.description,
            price: newItem.price,
            price_type: newItem.price_type,
            condition: newItem.condition,
            location: newItem.location,
            images: itemData.images || (itemData.image_base64 ? [itemData.image_base64] : [])
        }).then(apiRes => {
            if (apiRes && apiRes.success && apiRes.item_id) {
                newItem.id = Number(apiRes.item_id);
                this.saveDatabase();
            }
        });

        return { success: true, item_id: newItem.id, message: 'Nabídka byla úspěšně zveřejněna v komunitě!' };
    }

    updateItem(itemId, itemData, currentUserId) {
        if (!currentUserId) return { success: false, error: 'Pro úpravu nabídky musíte být přihlášeni.' };

        const item = this.data.items.find(i => i.id === Number(itemId));
        if (!item) return { success: false, error: 'Nabídka nebyla nalezena.' };

        const currentUser = this.data.users.find(u => u.id === currentUserId);
        const isOwner = item.user_id === currentUserId;
        const isMod = currentUser && (currentUser.role === 'moderator' || currentUser.role === 'admin' || currentUser.role === 'official_smc');

        if (!isOwner && !isMod) {
            return { success: false, error: 'Nemáte oprávnění upravovat tuto nabídku.' };
        }

        if (itemData.title !== undefined) item.title = itemData.title.trim();
        if (itemData.description !== undefined) item.description = itemData.description.trim();
        if (itemData.category_id !== undefined) item.category_id = itemData.category_id;
        if (itemData.price_type !== undefined) item.price_type = itemData.price_type;
        if (itemData.condition !== undefined) item.condition = itemData.condition;
        if (itemData.location !== undefined) item.location = itemData.location.trim();

        if (itemData.price !== undefined) {
            item.price = Number(itemData.price) || 0;
        }
        if (item.price_type === 'free' || item.price_type === 'swap') {
            item.price = 0;
        }

        if (itemData.images && Array.isArray(itemData.images)) {
            item.images = itemData.images;
            item.image_base64 = itemData.images[0] || '';
            item.image_url = itemData.images[0] || '';
        } else if (itemData.image_base64) {
            item.image_base64 = itemData.image_base64;
            item.image_url = itemData.image_base64;
            item.images = [itemData.image_base64];
        }

        item.updated_at = new Date().toISOString();

        this.addAuditLog(currentUserId, 'item_update', 'item', item.id, `Úprava nabídky: ${item.title}`);
        this.saveDatabase();

        // Odeslání do vzdálené MySQL databáze přes API
        this.sendApiRequest('updateItem', {
            id: item.id,
            user_id: currentUserId,
            title: item.title,
            description: item.description,
            category_id: item.category_id,
            price: item.price,
            price_type: item.price_type,
            condition: item.condition,
            location: item.location,
            images: item.images
        });

        return { success: true, item_id: item.id, message: 'Nabídka byla úspěšně upravena!' };
    }

    updateItemStatus(itemId, newStatus, currentUserId) {
        const item = this.data.items.find(i => i.id === Number(itemId));
        if (!item) return { success: false, error: 'Nabídka nebyla nalezena.' };

        const currentUser = this.data.users.find(u => u.id === currentUserId);
        const isOwner = item.user_id === currentUserId;
        const isMod = currentUser && (currentUser.role === 'moderator' || currentUser.role === 'admin' || currentUser.role === 'official_smc');

        if (!isOwner && !isMod) {
            return { success: false, error: 'Nemáte oprávnění spravovat tuto nabídku.' };
        }

        item.status = newStatus;
        this.addAuditLog(currentUserId, 'item_status_change', 'item', item.id, `Změna stavu nabídky na: ${newStatus}`);
        this.saveDatabase();

        // Odeslání do vzdálené MySQL databáze přes API
        this.sendApiRequest('updateItemStatus', {
            id: item.id,
            user_id: currentUserId,
            status: newStatus
        });

        let msg = 'Stav nabídky byl úspěšně upraven.';
        if (newStatus === 'reserved') msg = 'Nabídka byla označena jako rezervovaná.';
        if (newStatus === 'active') msg = 'Nabídka je opět aktivní pro všechny.';
        if (newStatus === 'sold' || newStatus === 'completed') msg = 'Obchod byl úspěšně dokončen.';

        return { success: true, message: msg };
    }

    endItem(itemId, currentUserId) {
        return this.deleteItem(itemId, currentUserId);
    }

    deleteItem(itemId, currentUserId) {
        const item = this.data.items.find(i => i.id === Number(itemId));
        if (!item) return { success: false, error: 'Nabídka nebyla nalezena.' };

        const currentUser = this.data.users.find(u => u.id === currentUserId);
        const isOwner = item.user_id === currentUserId;
        const isMod = currentUser && (currentUser.role === 'moderator' || currentUser.role === 'admin' || currentUser.role === 'official_smc');

        if (!isOwner && !isMod) {
            return { success: false, error: 'Nemáte oprávnění ukončit nebo smazat tuto nabídku.' };
        }

        item.status = 'deleted';
        item.deleted_at = new Date().toISOString();
        this.addAuditLog(currentUserId, 'item_delete', 'item', item.id, `Ukončení/smazání nabídky: ${item.title}`);
        this.saveDatabase();

        // Odeslání do vzdálené MySQL databáze přes API
        this.sendApiRequest('endItem', {
            id: item.id,
            user_id: currentUserId
        });

        return { success: true, message: 'Nabídka byla úspěšně ukončena a smazána.' };
    }

    // --- FAVORITES ---

    toggleFavorite(itemId, currentUserId) {
        if (!currentUserId) return { success: false, error: 'Pro přidání do oblíbených se přihlaste.' };

        const index = this.data.favorites.findIndex(
            f => f.user_id === currentUserId && f.item_id === Number(itemId)
        );

        let isFav = false;
        if (index >= 0) {
            this.data.favorites.splice(index, 1);
            isFav = false;
        } else {
            this.data.favorites.push({ user_id: currentUserId, item_id: Number(itemId) });
            isFav = true;
        }

        this.saveDatabase();

        // Odeslání do vzdálené MySQL databáze přes API
        this.sendApiRequest('toggleFavorite', {
            item_id: Number(itemId),
            user_id: currentUserId
        });
        return {
            success: true,
            is_favorite: isFav,
            message: isFav ? 'Uloženo do oblíbených' : 'Odebráno z oblíbených'
        };
    }

    // --- REVIEWS & REPUTATION (FR-11) ---

    addReview(targetUserId, reviewerId, itemId, rating, comment) {
        if (!this.data.reviews) this.data.reviews = [];

        const nextId = this.data.reviews.length > 0 ? Math.max(...this.data.reviews.map(r => r.id)) + 1 : 1;
        const item = this.data.items.find(i => i.id === Number(itemId));

        const review = {
            id: nextId,
            item_id: Number(itemId),
            reviewer_id: Number(reviewerId),
            target_user_id: Number(targetUserId),
            rating: Math.min(5, Math.max(1, Number(rating) || 5)),
            comment: (comment || '').trim(),
            transaction_type: item ? item.price_type : 'sell',
            created_at: new Date().toISOString()
        };

        this.data.reviews.push(review);

        const userReviews = this.data.reviews.filter(r => r.target_user_id === Number(targetUserId));
        const avg = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;

        const targetUser = this.data.users.find(u => u.id === Number(targetUserId));
        if (targetUser) {
            targetUser.rating = Math.round(avg * 10) / 10;
            targetUser.rating_count = userReviews.length;
        }

        this.addAuditLog(reviewerId, 'add_review', 'user', targetUserId, `Hodnocení ${rating} hvězdiček uživateli`);
        this.saveDatabase();

        return { success: true, review };
    }

    getUserReviews(userId) {
        const reviews = (this.data.reviews || []).filter(r => r.target_user_id === Number(userId));
        return reviews.map(r => {
            const reviewer = this.data.users.find(u => u.id === r.reviewer_id) || {};
            return {
                ...r,
                reviewer_name: reviewer.display_name || reviewer.name || 'Kolega',
                reviewer_avatar: reviewer.avatar_text || 'ZK'
            };
        });
    }

    // --- REPORTING & MODERATION (FR-12, FR-13, FR-14, NFR-06) ---

    reportItem(itemId, reason, details, reporterId) {
        if (!reporterId) return { success: false, error: 'Pro nahlášení inzerátu se musíte přihlásit.' };

        const item = this.data.items.find(i => i.id === Number(itemId));
        if (!item) return { success: false, error: 'Položka nebyla nalezena.' };

        if (!this.data.reports) this.data.reports = [];
        const nextId = this.data.reports.length > 0 ? Math.max(...this.data.reports.map(r => r.id)) + 1 : 1;

        const report = {
            id: nextId,
            item_id: Number(itemId),
            reporter_id: Number(reporterId),
            reason: reason,
            details: (details || '').trim(),
            status: 'pending',
            action_taken: null,
            moderator_reason: null,
            created_at: new Date().toISOString()
        };

        this.data.reports.push(report);
        this.addAuditLog(reporterId, 'report_create', 'report', report.id, `Nahlášení inzerátu #${itemId} z důvodu: ${reason}`);
        this.saveDatabase();

        // Odeslání do vzdálené MySQL databáze přes API
        this.sendApiRequest('reportItem', {
            item_id: Number(itemId),
            reporter_id: Number(reporterId),
            reason: reason,
            details: details
        });

        return { success: true, message: 'Inzerát byl nahlášen a odeslán moderátorům komunity k prověření.' };
    }

    getReports(statusFilter = null) {
        let reports = this.data.reports || [];
        if (statusFilter) {
            reports = reports.filter(r => r.status === statusFilter);
        }

        return reports.map(r => {
            const item = this.data.items.find(i => i.id === r.item_id) || {};
            const reporter = this.data.users.find(u => u.id === r.reporter_id) || {};
            const seller = this.data.users.find(u => u.id === item.user_id) || {};
            return {
                ...r,
                item_title: item.title || 'Smazaný inzerát',
                item_status: item.status || 'unknown',
                seller_name: seller.display_name || seller.name || 'Neznámý',
                reporter_name: reporter.display_name || reporter.name || 'Anonymní člen'
            };
        });
    }

    resolveReport(reportId, action, moderatorId, comment = '') {
        const report = (this.data.reports || []).find(r => r.id === Number(reportId));
        if (!report) return { success: false, error: 'Nahlášení nebylo nalezeno.' };

        const item = this.data.items.find(i => i.id === report.item_id);

        report.status = 'resolved';
        report.action_taken = action;
        report.moderator_id = moderatorId;
        report.moderator_reason = comment;
        report.resolved_at = new Date().toISOString();

        if (action === 'item_removed' && item) {
            item.status = 'removed_by_moderator';
            this.addAuditLog(moderatorId, 'moderation_remove_item', 'item', item.id, `Moderátor odstranil inzerát #${item.id}`);
        } else {
            this.addAuditLog(moderatorId, 'moderation_dismiss_report', 'report', report.id, `Moderátor zamítl report #${report.id} jako neopodstatněný`);
        }

        this.saveDatabase();
        return { success: true, message: action === 'item_removed' ? 'Inzerát byl stažen z komunity.' : 'Nahlášení bylo zamítnuto a inzerát ponechán.' };
    }

    // --- AUDIT LOGS (NFR-06) ---

    addAuditLog(userId, action, targetType, targetId, details) {
        if (!this.data.audit_logs) this.data.audit_logs = [];
        const nextId = this.data.audit_logs.length > 0 ? Math.max(...this.data.audit_logs.map(a => a.id)) + 1 : 1;

        this.data.audit_logs.push({
            id: nextId,
            user_id: userId,
            action,
            target_type: targetType,
            target_id: targetId,
            details,
            timestamp: new Date().toISOString()
        });
    }

    getAuditLogs() {
        return (this.data.audit_logs || []).slice().reverse();
    }

    // --- GDPR DATA EXPORT & RIGHT TO ERASURE (FR-16) ---

    exportGdprData(userId) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return null;

        const myItems = this.data.items.filter(i => i.user_id === Number(userId));
        const myReviewsGiven = (this.data.reviews || []).filter(r => r.reviewer_id === Number(userId));
        const myReviewsReceived = (this.data.reviews || []).filter(r => r.target_user_id === Number(userId));
        const myFavorites = (this.data.favorites || []).filter(f => f.user_id === Number(userId));

        const exportData = {
            export_timestamp: new Date().toISOString(),
            regulation: "GDPR (General Data Protection Regulation) - Article 15 & 20",
            profile: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                phone: user.phone,
                department: user.department,
                location: user.location,
                rating: user.rating,
                registered_at: user.registered_at
            },
            my_listings: myItems,
            my_favorites: myFavorites,
            reviews_given: myReviewsGiven,
            reviews_received: myReviewsReceived
        };

        return JSON.stringify(exportData, null, 2);
    }

    deleteAccount(userId) {
        const userIndex = this.data.users.findIndex(u => u.id === Number(userId));
        if (userIndex === -1) return { success: false, error: 'Uživatel nebyl nalezen.' };

        const user = this.data.users[userIndex];

        this.data.items.forEach(item => {
            if (item.user_id === Number(userId)) {
                item.status = 'deleted';
                item.title = '[Smazáno uživatelem podle GDPR]';
                item.description = '';
            }
        });

        this.data.favorites = (this.data.favorites || []).filter(f => f.user_id !== Number(userId));
        this.data.users.splice(userIndex, 1);

        this.addAuditLog(userId, 'user_gdpr_delete', 'user', userId, `Účet uživatele ${user.username} byl trvale smazán na základě GDPR`);
        this.saveDatabase();
        this.logout();

        return { success: true, message: 'Váš účet a všechny související inzeráty byly trvale smazány v souladu s GDPR.' };
    }

    // --- USER MANAGEMENT & CORPORATE ACCOUNTS (ADMIN ONLY) ---

    getAllUsers(roleFilter = '', searchQuery = '') {
        let users = this.data.users.map(u => {
            const userItems = this.data.items.filter(i => i.user_id === u.id && i.status !== 'deleted');
            const activeItems = userItems.filter(i => i.status === 'active');
            return {
                id: u.id,
                username: u.username,
                name: u.name,
                display_name: u.display_name || u.name,
                role: u.role || 'user',
                department: u.department || 'Zaměstnanec',
                location: u.location || '',
                email: u.email || '',
                phone: u.phone || '',
                avatar_text: u.avatar_text || u.name.substring(0, 2).toUpperCase(),
                rating: u.rating || 5.0,
                rating_count: u.rating_count || 0,
                registered_at: u.registered_at,
                is_banned: Boolean(u.is_banned),
                is_official: Boolean(u.is_official || u.role === 'official_smc' || u.username === 'smc'),
                items_count: userItems.length,
                active_items_count: activeItems.length
            };
        });

        if (roleFilter) {
            if (roleFilter === 'user') {
                users = users.filter(u => u.role === 'user' && !u.is_official);
            } else if (roleFilter === 'moderator') {
                users = users.filter(u => u.role === 'moderator');
            } else if (roleFilter === 'official_smc') {
                users = users.filter(u => u.is_official || u.role === 'official_smc');
            } else if (roleFilter === 'admin') {
                users = users.filter(u => u.role === 'admin');
            }
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            users = users.filter(u =>
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.username && u.username.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.department && u.department.toLowerCase().includes(q))
            );
        }

        return users;
    }

    updateUserRole(userId, newRole, adminId) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return { success: false, error: 'Uživatel nebyl nalezen.' };
        if (user.role === 'admin') return { success: false, error: 'Roli hlavního administrátora nelze měnit.' };

        const oldRole = user.role;
        user.role = newRole;
        this.addAuditLog(adminId, 'user_role_change', 'user', user.id, `Změna role uživatele ${user.name} z ${oldRole} na ${newRole}`);
        this.saveDatabase();

        const roleText = newRole === 'moderator' ? 'moderátora' : 'běžného člena';
        return { success: true, message: `Role uživatele ${user.name} byla úspěšně změněna na ${roleText}.` };
    }

    updateUserPassword(userId, newPassword, adminId) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return { success: false, error: 'Uživatel nebyl nalezen.' };
        if (!newPassword || newPassword.trim().length < 3) {
            return { success: false, error: 'Heslo musí mít alespoň 3 znaky.' };
        }

        user.password = newPassword.trim();
        this.addAuditLog(adminId, 'user_password_change', 'user', user.id, `Administrátor změnil heslo uživatele ${user.name}`);
        this.saveDatabase();

        return { success: true, message: `Heslo pro uživatele ${user.name} bylo úspěšně změněno.` };
    }

    createCompanyAccount(companyData, adminId) {
        if (!companyData.name || !companyData.username || !companyData.password) {
            return { success: false, error: 'Vyplňte prosím název, přihlašovací jméno i heslo.' };
        }

        const usernameQuery = companyData.username.trim().toLowerCase();
        if (this.data.users.some(u => u.username.toLowerCase() === usernameQuery)) {
            return { success: false, error: 'Toto přihlašovací jméno je již obsazené.' };
        }

        const nextId = this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
        const initials = companyData.name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase() || 'SMC';

        const newCompany = {
            id: nextId,
            username: usernameQuery,
            password: companyData.password.trim(),
            name: companyData.name.trim(),
            display_name: `${companyData.name.trim()} (Firma)`,
            role: 'official_smc',
            is_official: true,
            department: companyData.department || 'Správa majetku & Technická údržba závodu',
            location: companyData.location || 'Areál závodu SMC • Výdejna expedice / Vrátnice',
            email: companyData.email || 'odprodej@smc.cz',
            phone: companyData.phone || '+421 41 500 1234',
            avatar_text: initials,
            rating: 5.0,
            rating_count: 0,
            registered_at: new Date().toISOString(),
            bio: companyData.bio || 'Oficiální firemní účet SMC pro odprodej a darování vyřazeného vybavení.'
        };

        this.data.users.push(newCompany);
        this.addAuditLog(adminId, 'company_account_create', 'user', newCompany.id, `Vytvoření nového firemního účtu SMC: ${newCompany.name}`);
        this.saveDatabase();

        return { success: true, user: newCompany, message: `Nový firemní účet "${newCompany.name}" byl úspěšně vytvořen!` };
    }

    toggleUserBan(userId, adminId) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return { success: false, error: 'Uživatel nebyl nalezen.' };
        if (user.role === 'admin') return { success: false, error: 'Hlavního administrátora nelze zablokovat.' };

        user.is_banned = !user.is_banned;
        this.addAuditLog(adminId, 'user_ban_toggle', 'user', user.id, `Změna stavu blokování uživatele ${user.name}: ${user.is_banned ? 'blokován' : 'aktivní'}`);
        this.saveDatabase();

        const msg = user.is_banned ? `Účet uživatele ${user.name} byl zablokován.` : `Účet uživatele ${user.name} byl odblokován.`;
        return { success: true, is_banned: user.is_banned, message: msg };
    }

    getUserProfileWithItems(userId) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return null;

        const items = this.getItems({ user_id: Number(userId) });
        const reviews = this.getUserReviews(Number(userId));

        return {
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                display_name: user.display_name || user.name,
                role: user.role,
                is_official: Boolean(user.is_official || user.role === 'official_smc'),
                department: user.department,
                location: user.location,
                email: user.email,
                phone: user.phone,
                avatar_text: user.avatar_text,
                rating: user.rating,
                rating_count: user.rating_count,
                rules_accepted: Boolean(user.rules_accepted),
                registered_at: user.registered_at,
                bio: user.bio,
                is_banned: Boolean(user.is_banned)
            },
            items,
            reviews
        };
    }

    updateUserProfile(userId, contactData) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return { success: false, error: 'Uživatel nebyl nalezen.' };

        if (contactData.email !== undefined) {
            user.email = contactData.email.trim();
        }

        if (contactData.phone !== undefined) {
            let rawPhone = contactData.phone.trim();
            if (rawPhone) {
                let digits = rawPhone.replace(/[^\d]/g, '');
                if (digits.startsWith('420')) digits = digits.substring(3);
                else if (digits.startsWith('421')) digits = digits.substring(3);
                user.phone = digits ? `+420 ${digits.replace(/(\d{3})(?=\d)/g, '$1 ')}`.trim() : '';
            } else {
                user.phone = '';
            }
        }

        const curr = this.getCurrentUser();
        if (curr && curr.id === user.id) {
            curr.email = user.email;
            curr.phone = user.phone;
            this.setCurrentUser(curr);
        }

        this.addAuditLog(userId, 'profile_contact_update', 'user', user.id, `Aktualizace kontaktu: Tel ${user.phone}, E-mail ${user.email}`);
        this.saveDatabase();

        // Odeslání do MySQL přes API
        this.sendApiRequest('updateProfile', {
            user_id: user.id,
            email: user.email,
            phone: user.phone
        });

        return { success: true, user, message: 'Kontaktní údaje byly úspěšně uloženy.' };
    }

    acceptCommunityRules(userId) {
        const user = this.data.users.find(u => u.id === Number(userId));
        if (!user) return { success: false, error: 'Uživatel nebyl nalezen.' };

        user.rules_accepted = true;

        const curr = this.getCurrentUser();
        if (curr && curr.id === user.id) {
            curr.rules_accepted = true;
            this.setCurrentUser(curr);
        }

        this.addAuditLog(userId, 'rules_accepted', 'user', user.id, 'Potvrzení pravidel a GDPR');
        this.saveDatabase();

        // Odeslání do MySQL přes API
        this.sendApiRequest('acceptRules', { user_id: user.id });

        return { success: true, message: 'Pravidla byla úspěšně potvrzena.' };
    }
}

// Global initialization
window.smcDb = new SMCLocalDatabase();
