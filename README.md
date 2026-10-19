# 🏭 SMC Firemní Marketplace (100% HTML, CSS & JavaScript)

Moderní interní webová aplikace firemního tržiště navržená pro společnost **SMC** ve firemních barvách (SMC modrá `#005BAC`, hluboká modř a čistá bílá).

Aplikace je vytvořena **pouze v čistém HTML5, CSS3 a moderním JavaScriptu** – nevyžaduje žádný Python, Node.js ani instalaci serveru!

---

## 🚀 Jak aplikaci spustit

Stačí soubor **`index.html`** otevřít v libovolném webovém prohlížeči:
- **Dvojklikem na soubor `index.html`** ve složce projektu, nebo
- Přetažením souboru `index.html` do okna prohlížeče (Chrome, Edge, Firefox, Safari).

---

## 🔐 Přihlašovací účty pro testování

Aplikace vyžaduje přihlášení. Na úvodní přihlašovací obrazovce jsou k dispozici tlačítka pro **rychlé přihlášení na 1 kliknutí** i formulář:

| Účet | Uživatelské jméno | Heslo | Role & Oddělení |
| :--- | :--- | :--- | :--- |
| 🏢 **Firemní administrátor** | `SMC` | `1234` | Centrální sklad & Správa techniky (*Oficiální SMC*) |
| 👤 **Uživatel 1** | `user1` | `1234` | Jan Novák (*Výroba & Servis pneumatik*) |
| 👤 **Uživatel 2** | `user2` | `1234` | Petra Dvořáková (*Logistika, IT & Nákup*) |

---

## 🗄️ Lokální databáze (SQLite schéma v JavaScriptu)

Veškerá data jsou řízena relačním modulem [`js/db.js`](file:///c:/Users/POD/Desktop/SMC_Marketplace/js/db.js), který implementuje přesné relační schéma SQLite přímo v prohlížeči (s trvalým ukládáním do `localStorage`):

- **Tabulka `users`**: Uživatelé, role (`admin` / `employee`), oddělení, kontakty.
- **Tabulka `categories`**: Kategorie techniky (Pneumatika, Automatizace, Nářadí, Elektro, Kancelář, Materiál).
- **Tabulka `items`**: Nabídky (název, popis, stav, cenový model, umístění, fotografie, vazba na uživatele).
- **Tabulka `favorites`**: Vazební tabulka oblíbených položek pro každého uživatele.
- **Tabulka `inquiries`**: Interní poptávky a zprávy ke konkrétním nabídkám.

V bočním panelu účtu je navíc k dispozici tlačítko **„Stáhnout SQLite SQL skript“**, které vygeneruje standardní `.sql` soubor s `CREATE TABLE` a `INSERT` příkazy.

---

## ✨ Klíčové funkce

1. **Katalog dlaždic (dle zadání)**:
   - Úvodní fotografie s kategorií a štítkem stavu.
   - Název položky a stručný popis.
   - **Kdo nabídku zveřejnil** (avatar, jméno, oddělení, odznak *Oficiální SMC*).
   - Cenové modely (*Zdarma za odvoz*, *Pevná cena*, *Na výměnu*, *Dohodou*).
   - Umístění (např. *Hala A - Regál M-14*), počítadla zhlédnutí a vzkazů.

2. **Můj firemní účet (Boční vysouvací panel)**:
   - Informace o profilu, oddělení a kontaktech.
   - **Moje nabídky**: položky přidané přihlášeným uživatelem s možností správy stavu (*Rezervováno*, *Aktivní*, *Předáno*, *Smazat*).
   - **Oblíbené položky (❤️)**.
   - **Rychlé přepnutí účtu**: testování přepínání mezi `SMC`, `user1` a `user2`.
   - **Odhlášení**.

3. **Detail nabídky & Interní poptávkový chat**:
   - Velká fotografie, podrobnosti, kontakty.
   - Možnost zanechat vzkaz nebo poptat rezervaci přímo u inzerátu.

4. **Přidání nové nabídky**:
   - Formulář s možností nahrát vlastní fotografii z počítače **nebo** zvolit z připravených firemních ukázek.
