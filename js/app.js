/**
 * KOMUNITNÍ TRH ZAMĚSTNANCŮ - CLIENT APPLICATION JAVASCRIPT
 * 100% Čisté HTML, CSS a Vanilla JS bez závislosti na externím backendu.
 * Plná implementácia zadania Mario Jakubec (ver. 1.0, 12. 10. 2026).
 * Spolupracuje přímo s lokální SQLite-kompatibilní databází (js/db.js).
 */

// Application State
const state = {
    currentUser: null,
    categories: [],
    items: [],
    activeCategory: '',
    searchQuery: '',
    priceType: '', // 'sell', 'buy', 'swap', 'free', 'lend', 'rent'
    condition: '',
    sort: 'newest',
    onlyFavorites: false,
    onlyMyItems: false,
    currentItemDetail: null,
    activeChatBuyerId: null,
    uploadedImageDataUrl: null,
    searchDebounceTimer: null,
    currentModFilter: 'pending',
    adminViewMode: 'dashboard',
    userManagePerPage: 10,
    userManageCurrentPage: 1,
    userManageTotalPages: 1
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initKeyboardShortcuts();
    checkAuth();
});

// ==========================================================================
// AUTHENTICATION, REGISTRATION & SESSION MANAGEMENT (FR-01, FR-02, FR-03)
// ==========================================================================

function checkAuth() {
    const user = window.smcDb.getCurrentUser();
    if (user) {
        setUserSession(user);
        hideAuthModal();
        loadInitialData();
    } else {
        showAuthModal();
    }
}

function setUserSession(user) {
    state.currentUser = user;
    const isAdmin = user && user.role === 'admin';

    // 1. Update Navbar Profile Widget
    const navAvatar = document.getElementById('nav-user-avatar');
    const navName = document.getElementById('nav-user-name');
    const navRole = document.getElementById('nav-user-role');

    if (navAvatar) {
        if (isAdmin) {
            navAvatar.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
            navAvatar.style.background = 'linear-gradient(135deg, #4f46e5, #312e81)';
        } else if (user.username === 'smc' || user.role === 'official_smc') {
            navAvatar.innerHTML = '<i class="fa-solid fa-building"></i>';
            navAvatar.style.background = 'linear-gradient(135deg, #005BAC, #002D59)';
        } else {
            navAvatar.textContent = user.avatar_text || user.username.substring(0, 2).toUpperCase();
            navAvatar.style.background = 'linear-gradient(135deg, var(--smc-blue-primary), #003366)';
        }
    }
    if (navName) navName.textContent = user.name;
    if (navRole) {
        if (isAdmin) {
            navRole.textContent = '🛡️ Hlavní Administrátor';
        } else if (user.username === 'smc' || user.role === 'official_smc') {
            navRole.textContent = '🏢 Oficiální prodejce SMC';
        } else if (user.role === 'moderator') {
            navRole.textContent = 'Moderátor komunity';
        } else {
            navRole.textContent = user.department ? user.department.split('&')[0].trim() : 'Člen komunity';
        }
    }

    // 2. Show / Hide Moderation Button for Moderators & Admins (FR-13)
    const modBtn = document.getElementById('nav-mod-btn');
    const modCount = document.getElementById('nav-mod-count');
    const isMod = user.role === 'moderator' || user.role === 'admin' || user.role === 'official_smc';

    if (modBtn) {
        modBtn.style.display = isMod ? 'inline-flex' : 'none';
    }

    const stats = window.smcDb.getStats();
    if (modCount && isMod) {
        modCount.textContent = stats.pending_reports || '0';
    }

    // 3. Admin-specific navigation & view routing
    const adminDashboardPanel = document.getElementById('admin-dashboard-panel');
    const heroBannerSection = document.getElementById('hero-banner-section');
    const marketplaceWrapper = document.getElementById('marketplace-content-wrapper');
    const adminMarketplaceBanner = document.getElementById('admin-marketplace-banner');
    const navAdminDashBtn = document.getElementById('nav-admin-dashboard-btn');
    const navAdminUsersBtn = document.getElementById('nav-admin-users-btn');

    // Update badges on admin action cards
    const adminBadgeReports = document.getElementById('admin-badge-reports-count');
    const adminBadgeUsers = document.getElementById('admin-badge-users-count');
    const adminBadgeItems = document.getElementById('admin-badge-items-count');
    if (adminBadgeReports) adminBadgeReports.textContent = `${stats.pending_reports || 0} hlášení`;
    if (adminBadgeUsers) adminBadgeUsers.textContent = `${stats.total_users || 0} zaměstnanců`;
    if (adminBadgeItems) adminBadgeItems.textContent = `${stats.active_items || 0} aktivních`;

    if (isAdmin) {
        if (navAdminUsersBtn) navAdminUsersBtn.style.display = 'inline-flex';

        if (state.adminViewMode === 'dashboard') {
            if (adminDashboardPanel) adminDashboardPanel.style.display = 'block';
            if (heroBannerSection) heroBannerSection.style.display = 'none';
            if (marketplaceWrapper) marketplaceWrapper.style.display = 'none';
            if (adminMarketplaceBanner) adminMarketplaceBanner.style.display = 'none';
            if (navAdminDashBtn) navAdminDashBtn.style.display = 'none';
        } else {
            if (adminDashboardPanel) adminDashboardPanel.style.display = 'none';
            if (heroBannerSection) heroBannerSection.style.display = 'block';
            if (marketplaceWrapper) marketplaceWrapper.style.display = 'block';
            if (adminMarketplaceBanner) adminMarketplaceBanner.style.display = 'flex';
            if (navAdminDashBtn) navAdminDashBtn.style.display = 'inline-flex';
        }
    } else {
        if (adminDashboardPanel) adminDashboardPanel.style.display = 'none';
        if (adminMarketplaceBanner) adminMarketplaceBanner.style.display = 'none';
        if (navAdminDashBtn) navAdminDashBtn.style.display = 'none';
        if (navAdminUsersBtn) navAdminUsersBtn.style.display = 'none';
        if (heroBannerSection) heroBannerSection.style.display = 'block';
        if (marketplaceWrapper) marketplaceWrapper.style.display = 'block';
    }

    // 4. Update Drawer Profile Information (FR-04, FR-11)
    const drawerAvatar = document.getElementById('drawer-user-avatar');
    const drawerName = document.getElementById('drawer-user-name');
    const drawerRoleBadge = document.getElementById('drawer-user-role-badge');
    const drawerRating = document.getElementById('drawer-user-rating');
    const drawerRatingCount = document.getElementById('drawer-user-rating-count');
    const drawerDept = document.getElementById('drawer-user-department');
    const drawerLocation = document.getElementById('drawer-user-location');
    const drawerEmail = document.getElementById('drawer-user-email');
    const drawerPhone = document.getElementById('drawer-user-phone');

    if (drawerAvatar) {
        if (isAdmin) {
            drawerAvatar.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
            drawerAvatar.style.background = 'linear-gradient(135deg, #4f46e5, #312e81)';
        } else if (user.username === 'smc' || user.role === 'official_smc') {
            drawerAvatar.innerHTML = '<i class="fa-solid fa-building"></i>';
            drawerAvatar.style.background = 'linear-gradient(135deg, #005BAC, #002D59)';
        } else {
            drawerAvatar.textContent = user.avatar_text || user.username.substring(0, 2).toUpperCase();
            drawerAvatar.style.background = 'linear-gradient(135deg, var(--smc-blue-primary), #003366)';
        }
    }
    if (drawerName) drawerName.textContent = user.name;
    if (drawerRoleBadge) {
        if (isAdmin) {
            drawerRoleBadge.textContent = '🛡️ Hlavní Administrátor komunity';
            drawerRoleBadge.style.background = '#ede9fe';
            drawerRoleBadge.style.color = '#4f46e5';
        } else if (user.username === 'smc' || user.role === 'official_smc') {
            drawerRoleBadge.textContent = '🏢 Oficiální správce vyřazeného majetku SMC';
            drawerRoleBadge.style.background = 'linear-gradient(135deg, #005BAC, #0284c7)';
            drawerRoleBadge.style.color = '#ffffff';
        } else if (user.role === 'moderator') {
            drawerRoleBadge.textContent = '🛡️ Správce & Moderátor komunity';
            drawerRoleBadge.style.background = '#FEE2E2';
            drawerRoleBadge.style.color = '#B91C1C';
        } else {
            drawerRoleBadge.textContent = 'Ověřený člen komunity';
            drawerRoleBadge.style.background = '#E0F2FE';
            drawerRoleBadge.style.color = '#0369A1';
        }
    }

    if (drawerRating) drawerRating.textContent = Number(user.rating || 5.0).toFixed(1);
    if (drawerRatingCount) drawerRatingCount.textContent = user.reviews_count || 0;
    if (drawerDept) drawerDept.textContent = user.department || 'Výroba a montáž';
    if (drawerLocation) drawerLocation.textContent = user.location || 'Bytča / Žilina';
    if (drawerEmail) drawerEmail.textContent = user.email || 'kontakt@zamestnanec.cz';
    if (drawerPhone) drawerPhone.textContent = user.phone || '+421 900 000 000';
}

function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');
    const quickLoginSection = document.getElementById('quick-login-section');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    if (loginError) loginError.style.display = 'none';
    if (registerError) registerError.style.display = 'none';

    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (tabLoginBtn) tabLoginBtn.classList.add('active');
        if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
        if (quickLoginSection) quickLoginSection.style.display = 'block';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabLoginBtn) tabLoginBtn.classList.remove('active');
        if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
        if (quickLoginSection) quickLoginSection.style.display = 'none';
    }
}

function handleManualLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    performLogin(username, password);
}

function quickLogin(username, password) {
    const userField = document.getElementById('login-username');
    const passField = document.getElementById('login-password');
    if (userField) userField.value = username;
    if (passField) passField.value = password;

    performLogin(username, password);
}

function performLogin(username, password) {
    const errorBanner = document.getElementById('login-error');
    if (errorBanner) errorBanner.style.display = 'none';

    const result = window.smcDb.login(username, password);

    if (result.success && result.user) {
        setUserSession(result.user);
        hideAuthModal();
        showToast(`Vítejte v komunitním trhu, ${result.user.name}!`, 'success');
        loadInitialData();
    } else {
        if (errorBanner) {
            errorBanner.textContent = result.error || 'Neplatné přihlašovací jméno nebo heslo.';
            errorBanner.style.display = 'block';
        }
    }
}

function handleRegistration(e) {
    e.preventDefault();
    const errorBanner = document.getElementById('register-error');
    if (errorBanner) errorBanner.style.display = 'none';

    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const location = document.getElementById('reg-location').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const communityCode = document.getElementById('reg-community-code').value.trim().toUpperCase();
    const termsCheck = document.getElementById('reg-terms-check').checked;

    if (!termsCheck) {
        if (errorBanner) {
            errorBanner.textContent = 'Pro registraci musíte potvrdit souhlas s pravidly komunity a předáním mimo směnu.';
            errorBanner.style.display = 'block';
        }
        return;
    }

    const result = window.smcDb.register({
        name,
        username,
        email,
        phone: email.startsWith('+') ? email : '',
        location: location || 'Závod a okolie',
        password,
        community_code: communityCode
    });

    if (result.success && result.user) {
        setUserSession(result.user);
        hideAuthModal();
        showToast(`Registrace úspěšná! Kód komunity ověřen. Vítejte, ${result.user.name}!`, 'success');
        loadInitialData();
    } else {
        if (errorBanner) {
            errorBanner.textContent = result.error || 'Chyba registrace. Zkontrolujte kód komunity.';
            errorBanner.style.display = 'block';
        }
    }
}

function switchUserAccount(username, password) {
    closeUserDrawer();
    performLogin(username, password);
}

function handleLogout() {
    window.smcDb.logout();
    state.currentUser = null;
    closeUserDrawer();
    showAuthModal();
    showToast('Byli jste úspěšně odhlášeni.', 'info');
}

// ==========================================================================
// DATA LOADING & INITIALIZATION
// ==========================================================================

function loadInitialData() {
    loadCategories();
    loadStats();
    loadItems();
}

function loadStats() {
    const data = window.smcDb.getStats();
    const statActive = document.getElementById('stat-active');
    const statFree = document.getElementById('stat-free');
    const statCompleted = document.getElementById('stat-completed');
    const statUsers = document.getElementById('stat-users');
    const modCount = document.getElementById('nav-mod-count');

    if (statActive) statActive.textContent = data.active_items;
    if (statFree) statFree.textContent = data.free_items;
    if (statCompleted) statCompleted.textContent = data.completed_items;
    if (statUsers) statUsers.textContent = data.total_users;

    if (modCount && state.currentUser && (state.currentUser.role === 'moderator' || state.currentUser.role === 'admin')) {
        modCount.textContent = data.pending_reports || '0';
    }
}

function loadCategories() {
    state.categories = window.smcDb.getCategories();
    const select = document.getElementById('filter-category');
    if (select) {
        select.innerHTML = '<option value="">Všechny kategorie</option>' +
            state.categories.map(cat => `<option value="${cat.id}">${cat.name} (${cat.items_count})</option>`).join('');
        select.value = state.activeCategory || '';
    }
}

function loadItems() {
    const grid = document.getElementById('items-grid');
    const emptyState = document.getElementById('empty-state');
    const countBadge = document.getElementById('items-count-badge');

    const filters = {
        category: state.activeCategory,
        search: state.searchQuery,
        price_type: state.priceType,
        condition: state.condition,
        sort: state.sort,
        only_favorites: state.onlyFavorites,
        user_id: (state.onlyMyItems && state.currentUser) ? state.currentUser.id : null
    };

    const currentUserId = state.currentUser ? state.currentUser.id : null;
    state.items = window.smcDb.getItems(filters, currentUserId);

    renderItems(state.items);
    updateFilterChips();

    if (countBadge) {
        const count = state.items.length;
        countBadge.textContent = `${count} ${pluralizeItems(count)}`;
    }

    if (state.items.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (grid) grid.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    }
}

// ==========================================================================
// RENDER ITEMS (DLAŽDICE 6 TYPOV PONÚK SO SPOĽAHLIVOSŤOU KOLEGOV)
// ==========================================================================

function renderItems(items) {
    const grid = document.getElementById('items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    items.forEach(item => {
        const card = createItemCard(item);
        grid.appendChild(card);
    });
}

function getOfferBadgeInfo(priceType, price) {
    switch (priceType) {
        case 'sell':
            return {
                className: 'badge-offer-sell',
                icon: 'fa-tags',
                text: 'Prodám',
                priceText: price && Number(price) > 0 ? formatPrice(price) : 'Cena dohodou'
            };
        case 'buy':
            return {
                className: 'badge-offer-buy',
                icon: 'fa-hand-holding-dollar',
                text: 'Koupím / Sháním',
                priceText: price && Number(price) > 0 ? `do ${formatPrice(price)}` : 'Dopyt'
            };
        case 'swap':
            return {
                className: 'badge-offer-swap',
                icon: 'fa-repeat',
                text: 'Vyměním',
                priceText: 'Výměna za jinou věc'
            };
        case 'free':
            return {
                className: 'badge-offer-free',
                icon: 'fa-gift',
                text: 'Daruji',
                priceText: 'Zdarma za odvoz'
            };
        case 'lend':
            return {
                className: 'badge-offer-lend',
                icon: 'fa-hand-holding-hand',
                text: 'Půjčím',
                priceText: price && Number(price) > 0 ? `${formatPrice(price)} / zapůjčení` : 'Bezplatné zapožičanie'
            };
        case 'rent':
            return {
                className: 'badge-offer-rent',
                icon: 'fa-key',
                text: 'Pronajmu',
                priceText: price && Number(price) > 0 ? `${formatPrice(price)} / období` : 'Cena dohodou'
            };
        default:
            return {
                className: 'badge-offer-sell',
                icon: 'fa-tag',
                text: 'Nabídka',
                priceText: formatPrice(price)
            };
    }
}

function createItemCard(item) {
    const isOfficialSMC = Boolean(item.is_official || (item.username && item.username.toLowerCase() === 'smc') || item.user_id === 4);

    const card = document.createElement('article');
    card.className = isOfficialSMC ? 'item-card is-official-smc' : 'item-card';
    card.onclick = (e) => {
        if (e.target.closest('.card-fav-btn')) return;
        openItemDetail(item.id);
    };

    const offerInfo = getOfferBadgeInfo(item.price_type, item.price);

    // Status tag
    let statusTag = '';
    if (item.status === 'reserved') {
        statusTag = `<span class="card-status-tag status-reserved"><i class="fa-solid fa-clock"></i> Rezervováno</span>`;
    } else if (item.status === 'sold') {
        statusTag = `<span class="card-status-tag status-sold"><i class="fa-solid fa-check"></i> Dokončeno</span>`;
    } else {
        statusTag = `<span class="card-status-tag status-active"><i class="fa-solid fa-circle-check"></i> Aktivní</span>`;
    }

    const isFav = item.is_favorite ? 'favorited' : '';
    const ratingDisplay = item.publisher_rating ? Number(item.publisher_rating).toFixed(1) : '5.0';

    const officialTopBadge = isOfficialSMC 
        ? `<span class="official-smc-badge"><i class="fa-solid fa-building-circle-check"></i> SMC Odprodej</span>` 
        : '';

    const publisherAvatarHtml = isOfficialSMC
        ? `<div class="publisher-avatar-circle" style="background: linear-gradient(135deg, #005BAC, #002D59); color: #fff; box-shadow: 0 2px 6px rgba(0,91,172,0.3);"><i class="fa-solid fa-building"></i></div>`
        : `<div class="publisher-avatar-circle">${escapeHtml(item.publisher_avatar || item.username.substring(0, 2).toUpperCase())}</div>`;

    const publisherNameHtml = isOfficialSMC
        ? `<div class="publisher-name-line">
               <span class="publisher-name">${escapeHtml(item.publisher_name)}</span>
               <span class="official-smc-badge"><i class="fa-solid fa-certificate"></i> Garantované</span>
           </div>`
        : `<div class="publisher-name-line">
               <span class="publisher-name">${escapeHtml(item.publisher_name)}</span>
               <span class="user-rating-pill" title="Hodnocení spolehlivosti: ${ratingDisplay} z 5 hvězdiček">
                   <i class="fa-solid fa-star"></i> ${ratingDisplay}
               </span>
           </div>`;

    card.innerHTML = `
        <!-- Úvodný obrázok & Odznaky typu ponuky -->
        <div class="card-media">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='./images/tools_case.jpg'">
            <div class="card-badges-top">
                ${officialTopBadge}
                <span class="card-category-tag">${escapeHtml(item.category_name)}</span>
                ${statusTag}
            </div>
            <button class="card-fav-btn ${isFav}" title="${item.is_favorite ? 'Odebrat z oblíbených' : 'Uložit do oblíbených'}" onclick="toggleFavoriteItem(${item.id}, event)">
                <i class="fa-solid fa-heart"></i>
            </button>
            <div class="card-price-badge ${offerInfo.className}">
                <i class="fa-solid ${offerInfo.icon}"></i> ${escapeHtml(offerInfo.text)}: ${escapeHtml(offerInfo.priceText)}
            </div>
        </div>

        <!-- Telo dlaždice s názvom a informáciami o overenom kolegovi / SMC -->
        <div class="card-body">
            <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
            <p class="card-desc">${escapeHtml(item.description)}</p>

            <!-- Kto ponuku zverejnil (Reputácia kolegu alebo Oficiálne SMC) -->
            <div class="card-publisher-box">
                ${publisherAvatarHtml}
                <div class="publisher-details">
                    <span class="publisher-meta-caption">${isOfficialSMC ? 'Oficiální firemní nabídka:' : 'Nabízí kolega:'}</span>
                    ${publisherNameHtml}
                    <span class="publisher-dept">${escapeHtml(item.publisher_department)}</span>
                </div>
            </div>

            <!-- Spodná lišta s lokalitou a štatistikou záujmu -->
            <div class="card-meta-footer">
                <span class="card-location" title="${escapeHtml(item.location)}">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location)}
                </span>
                <div class="card-stats-info">
                    <span title="Počet zobrazení nabídky"><i class="fa-solid fa-eye"></i> ${item.views_count}</span>
                    <span title="Počet zájemců v chatu"><i class="fa-solid fa-comments"></i> ${item.inquiries_count}</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

// ==========================================================================
// ITEM DETAIL MODAL & INQUIRIES (FR-08, FR-11, FR-15)
// ==========================================================================

function openItemDetail(itemId) {
    const currentUserId = state.currentUser ? state.currentUser.id : null;
    const item = window.smcDb.getItemById(itemId, currentUserId);

    if (!item) {
        showToast('Nabídka nebyla nalezena.', 'error');
        return;
    }

    state.currentItemDetail = item;

    // Chat thread setup
    if (item.is_seller) {
        if (!state.activeChatBuyerId || !(item.buyer_threads && item.buyer_threads.some(t => t.buyer_id === state.activeChatBuyerId))) {
            state.activeChatBuyerId = (item.buyer_threads && item.buyer_threads.length > 0) ? item.buyer_threads[0].buyer_id : null;
        }
    } else {
        state.activeChatBuyerId = state.currentUser ? state.currentUser.id : null;
    }

    // Image & Badges
    const img = document.getElementById('detail-img');
    img.src = item.image_url;
    img.onerror = () => { img.src = './images/tools_case.jpg'; };

    const offerInfo = getOfferBadgeInfo(item.price_type, item.price);
    const offerBadge = document.getElementById('detail-offer-badge');
    if (offerBadge) {
        offerBadge.className = `badge ${offerInfo.className}`;
        offerBadge.innerHTML = `<i class="fa-solid ${offerInfo.icon}"></i> ${escapeHtml(offerInfo.text)}`;
    }

    const catBadge = document.getElementById('detail-category-badge');
    if (catBadge) catBadge.textContent = item.category_name;

    const statusBadge = document.getElementById('detail-status-badge');
    if (statusBadge) {
        if (item.status === 'reserved') {
            statusBadge.className = 'badge status-reserved';
            statusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Rezervováno';
        } else if (item.status === 'sold') {
            statusBadge.className = 'badge status-sold';
            statusBadge.innerHTML = '<i class="fa-solid fa-check"></i> Dokončeno';
        } else {
            statusBadge.className = 'badge status-active';
            statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aktivní nabídka';
        }
    }

    // Title & Favorite button
    document.getElementById('detail-title').textContent = item.title;
    const favBtn = document.getElementById('detail-fav-btn');
    if (favBtn) {
        if (item.is_favorite) favBtn.classList.add('favorited');
        else favBtn.classList.remove('favorited');
    }

    // Price, Condition, Location
    const priceEl = document.getElementById('detail-price');
    if (priceEl) {
        priceEl.innerHTML = `<span style="font-weight: 700; font-size: 1.3rem;">${escapeHtml(offerInfo.priceText)}</span>`;
    }

    const conditionEl = document.getElementById('detail-condition');
    if (conditionEl) {
        conditionEl.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Stav: <strong>${formatCondition(item.condition)}</strong>`;
    }

    const locEl = document.getElementById('detail-location');
    if (locEl) locEl.textContent = item.location;

    const isOfficialSMC = Boolean(item.is_official || (item.username && item.username.toLowerCase() === 'smc') || item.user_id === 4);

    // Publisher info & Reputation (FR-04, FR-11)
    const pubAvatar = document.getElementById('detail-publisher-avatar');
    if (pubAvatar) {
        if (isOfficialSMC) {
            pubAvatar.innerHTML = '<i class="fa-solid fa-building"></i>';
            pubAvatar.style.background = 'linear-gradient(135deg, #005BAC, #002D59)';
        } else {
            pubAvatar.textContent = item.publisher_avatar || item.username.substring(0, 2).toUpperCase();
            pubAvatar.style.background = '#0284c7';
        }
    }

    const pubName = document.getElementById('detail-publisher-name');
    if (pubName) {
        if (isOfficialSMC) {
            pubName.innerHTML = `${escapeHtml(item.publisher_name)} <span class="official-smc-badge"><i class="fa-solid fa-certificate"></i> Garantovaný stav firmy</span>`;
        } else {
            pubName.textContent = item.publisher_name;
        }
    }

    const pubRatingNum = document.getElementById('detail-publisher-rating-num');
    const pubReviewsCount = document.getElementById('detail-publisher-reviews-count');
    if (pubRatingNum) pubRatingNum.textContent = Number(item.publisher_rating || 5.0).toFixed(1);
    if (pubReviewsCount) pubReviewsCount.textContent = item.publisher_reviews_count || 0;

    const pubDept = document.getElementById('detail-publisher-dept');
    if (pubDept) {
        if (isOfficialSMC) {
            pubDept.textContent = `${item.publisher_department} • Odběrné místo: ${item.location}`;
        } else {
            pubDept.textContent = `${item.publisher_department} • Bydliště: ${item.location}`;
        }
    }

    // Contact buttons (E-mail & Phone - FR-02)
    const contactsContainer = document.getElementById('detail-publisher-contacts');
    if (contactsContainer) {
        contactsContainer.innerHTML = '';
        if (item.publisher_email) {
            contactsContainer.innerHTML += `
                <a href="mailto:${escapeHtml(item.publisher_email)}?subject=Zájem o nabídku v komunitním trhu: ${encodeURIComponent(item.title)}" class="btn btn-sm btn-outline" title="Napsat soukromý e-mail">
                    <i class="fa-solid fa-envelope"></i> E-mail
                </a>
            `;
        }
        if (item.publisher_phone) {
            contactsContainer.innerHTML += `
                <a href="tel:${escapeHtml(item.publisher_phone)}" class="btn btn-sm btn-outline" title="Zavolat kolegovi">
                    <i class="fa-solid fa-phone"></i> Volat
                </a>
            `;
        }
    }

    // Description
    const descEl = document.getElementById('detail-desc');
    if (descEl) descEl.textContent = item.description;

    // Private inquiries / chat
    renderPrivateChat(item);

    // Owner Toolbar (FR-06, FR-10, FR-11)
    const ownerTools = document.getElementById('detail-owner-tools');
    const isOwnerOrAdmin = state.currentUser && (state.currentUser.id === item.user_id || state.currentUser.role === 'admin' || state.currentUser.role === 'moderator');
    if (ownerTools) {
        if (isOwnerOrAdmin) {
            ownerTools.style.display = 'block';

            const reserveBtn = document.getElementById('mark-reserved-btn');
            const activeBtn = document.getElementById('mark-active-btn');
            const completeBtn = document.getElementById('mark-complete-btn');

            if (item.status === 'active') {
                if (reserveBtn) reserveBtn.style.display = 'inline-flex';
                if (activeBtn) activeBtn.style.display = 'none';
                if (completeBtn) completeBtn.style.display = 'inline-flex';
            } else if (item.status === 'reserved') {
                if (reserveBtn) reserveBtn.style.display = 'none';
                if (activeBtn) activeBtn.style.display = 'inline-flex';
                if (completeBtn) completeBtn.style.display = 'inline-flex';
            } else {
                if (reserveBtn) reserveBtn.style.display = 'none';
                if (activeBtn) activeBtn.style.display = 'inline-flex';
                if (completeBtn) completeBtn.style.display = 'none';
            }
        } else {
            ownerTools.style.display = 'none';
        }
    }

    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    state.currentItemDetail = null;
    state.activeChatBuyerId = null;
}

// ==========================================================================
// PRIVATE IN-APP CHAT (FR-08 - SÚKROMNÉ DOHODY ZÁUJEMCOV A PREDAJCU)
// ==========================================================================

function renderPrivateChat(item) {
    const headerContainer = document.getElementById('inquiries-header-container');
    const buyersPanel = document.getElementById('seller-buyers-panel');
    const buyersTabsList = document.getElementById('buyers-tabs-list');
    const activeChatInfoBar = document.getElementById('active-chat-info-bar');
    const list = document.getElementById('detail-inquiries-list');
    const form = document.getElementById('inquiry-form');
    const input = document.getElementById('inquiry-input');
    const submitBtn = document.getElementById('inquiry-submit-btn');
    const countBadge = document.getElementById('detail-inquiry-count');

    if (!state.currentUser) {
        if (buyersPanel) buyersPanel.style.display = 'none';
        if (activeChatInfoBar) activeChatInfoBar.style.display = 'none';
        if (countBadge) countBadge.textContent = '0';
        if (headerContainer) {
            headerContainer.innerHTML = `<h4><i class="fa-solid fa-lock"></i> Soukromý chat k nabídce</h4>`;
        }
        if (list) {
            list.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fa-solid fa-lock" style="font-size: 1.8rem; color: var(--text-muted); margin-bottom: 8px;"></i>
                    <p style="color: var(--text-secondary); margin-bottom: 10px;">Pro zobrazení soukromého chatu se prosím přihlaste.</p>
                    <button type="button" class="btn btn-sm btn-primary" onclick="showAuthModal()">Přihlásit se</button>
                </div>
            `;
        }
        if (form) form.style.display = 'none';
        return;
    }

    if (form) form.style.display = 'block';

    if (item.is_seller) {
        // --- SELLER MODE ---
        const buyerThreads = item.buyer_threads || [];
        if (countBadge) countBadge.textContent = buyerThreads.length;

        if (headerContainer) {
            headerContainer.innerHTML = `
                <div class="chat-header-flex">
                    <div class="chat-header-title">
                        <h4><i class="fa-solid fa-comments"></i> Zájemci o nabídku (${buyerThreads.length})</h4>
                        <span class="seller-mode-pill"><i class="fa-solid fa-user-tag"></i> Vaše nabídka</span>
                    </div>
                    <p class="chat-subtitle">Zde vidíte kolegy, kteří reagovali. Každý má svůj vlastní oddělený soukromý chat.</p>
                </div>
            `;
        }

        if (buyerThreads.length === 0) {
            if (buyersPanel) buyersPanel.style.display = 'none';
            if (activeChatInfoBar) activeChatInfoBar.style.display = 'none';
            if (list) {
                list.innerHTML = `
                    <div class="chat-empty-state">
                        <i class="fa-regular fa-comment-dots" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 8px;"></i>
                        <strong style="display:block; color: var(--text-primary); margin-bottom: 4px;">Zatím žádný zájemce</strong>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
                            O tuto nabídku zatím nikdo nenapsal. Jakmile kolega projeví zájem, jeho chat se zobrazí zde.
                        </p>
                    </div>
                `;
            }
            if (form) form.style.display = 'none';
            return;
        }

        if (buyersPanel) buyersPanel.style.display = 'block';

        if (!state.activeChatBuyerId || !buyerThreads.some(t => t.buyer_id === state.activeChatBuyerId)) {
            state.activeChatBuyerId = buyerThreads[0].buyer_id;
        }

        if (buyersTabsList) {
            buyersTabsList.innerHTML = buyerThreads.map(b => {
                const isSelected = b.buyer_id === state.activeChatBuyerId;
                return `
                    <button type="button" class="buyer-tab-btn ${isSelected ? 'active' : ''}" onclick="selectBuyerChat(${b.buyer_id})">
                        <span class="buyer-tab-avatar">${escapeHtml(b.buyer_avatar)}</span>
                        <div class="buyer-tab-text">
                            <span class="buyer-tab-name">${escapeHtml(b.buyer_name)}</span>
                            <span class="buyer-tab-dept">${escapeHtml(b.buyer_department)}</span>
                        </div>
                        <span class="buyer-msg-count" title="${b.messages.length} zpráv">${b.messages.length}</span>
                    </button>
                `;
            }).join('');
        }

        const currentThread = buyerThreads.find(t => t.buyer_id === state.activeChatBuyerId) || buyerThreads[0];

        if (activeChatInfoBar) {
            activeChatInfoBar.style.display = 'flex';
            activeChatInfoBar.innerHTML = `
                <div class="active-chat-meta">
                    <span class="active-chat-indicator"><i class="fa-solid fa-circle"></i></span>
                    <span>Chat se zájemcem: <strong>${escapeHtml(currentThread.buyer_name)}</strong> <small>(${escapeHtml(currentThread.buyer_department)})</small></span>
                </div>
                <div class="active-chat-contacts">
                    ${currentThread.buyer_email ? `<a href="mailto:${escapeHtml(currentThread.buyer_email)}" class="chat-contact-btn" title="E-mail: ${escapeHtml(currentThread.buyer_email)}"><i class="fa-solid fa-envelope"></i> E-mail</a>` : ''}
                    ${currentThread.buyer_phone ? `<a href="tel:${escapeHtml(currentThread.buyer_phone)}" class="chat-contact-btn" title="Telefon: ${escapeHtml(currentThread.buyer_phone)}"><i class="fa-solid fa-phone"></i> Volat</a>` : ''}
                </div>
            `;
        }

        if (list) {
            renderMessageStream(currentThread.messages, item, list);
        }

        if (input) input.placeholder = `Odpovědět zájemci (${currentThread.buyer_name})...`;
        if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Odpovědět`;

    } else {
        // --- BUYER MODE ---
        if (buyersPanel) buyersPanel.style.display = 'none';
        if (activeChatInfoBar) activeChatInfoBar.style.display = 'none';

        const myMessages = item.my_thread || [];
        if (countBadge) countBadge.textContent = myMessages.length;

        if (headerContainer) {
            headerContainer.innerHTML = `
                <div class="chat-header-flex">
                    <div class="chat-header-title">
                        <h4><i class="fa-solid fa-lock" style="color: var(--smc-blue-primary);"></i> Soukromý chat s kolegou</h4>
                        <span class="private-badge"><i class="fa-solid fa-shield-halved"></i> Pouze vy a ${escapeHtml(item.publisher_name)}</span>
                    </div>
                    <p class="chat-subtitle">Tento chat je soukromý. Vaše zprávy vidí výhradně <strong>${escapeHtml(item.publisher_name)}</strong> (${escapeHtml(item.publisher_department)}). Ostatní kolegové konverzaci nevidí.</p>
                </div>
            `;
        }

        if (myMessages.length === 0) {
            if (list) {
                list.innerHTML = `
                    <div class="chat-empty-state">
                        <i class="fa-regular fa-paper-plane" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 8px;"></i>
                        <strong style="display:block; color: var(--text-primary); margin-bottom: 4px;">Máte zájem o tuto nabídku?</strong>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
                            Napište kolegovi soukromou zprávu. Domluvte se na bezpečném místě předání a čase výhradně <strong>mimo pracovní dobu</strong>.
                        </p>
                    </div>
                `;
            }
        } else {
            if (list) {
                renderMessageStream(myMessages, item, list);
            }
        }

        if (input) input.placeholder = `Napište soukromou zprávu pro ${item.publisher_name}...`;
        if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Odeslat`;
    }
}

function renderMessageStream(messages, item, container) {
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty-state" style="padding: 14px;">
                <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">Zatím žádné zprávy v této konverzaci.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isMine = state.currentUser && msg.sender_id === state.currentUser.id;
        const senderTag = msg.is_from_seller ? ' <span class="chat-seller-tag">Autor nabídky</span>' : '';

        if (isMine) {
            return `
                <div class="chat-message outgoing">
                    <div class="chat-msg-body">
                        <div class="chat-msg-meta">
                            <span class="chat-msg-time">${formatDate(msg.created_at)}</span>
                            <span class="chat-msg-author">Vy</span>
                        </div>
                        <div class="chat-bubble outgoing-bubble">${escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="chat-message incoming">
                    <div class="chat-msg-avatar">${escapeHtml(msg.sender_avatar || 'KO')}</div>
                    <div class="chat-msg-body">
                        <div class="chat-msg-meta">
                            <span class="chat-msg-author">${escapeHtml(msg.sender_name)}${senderTag}</span>
                            <span class="chat-msg-time">${formatDate(msg.created_at)}</span>
                        </div>
                        <div class="chat-bubble incoming-bubble">${escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        }
    }).join('');

    container.scrollTop = container.scrollHeight;
}

function selectBuyerChat(buyerId) {
    state.activeChatBuyerId = Number(buyerId);
    if (state.currentItemDetail) {
        renderPrivateChat(state.currentItemDetail);
    }
}

function submitInquiry(e) {
    e.preventDefault();
    if (!state.currentItemDetail || !state.currentUser) return;

    const input = document.getElementById('inquiry-input');
    const message = input.value.trim();
    if (!message) return;

    const isSeller = state.currentItemDetail.is_seller;
    const targetBuyerId = isSeller ? state.activeChatBuyerId : state.currentUser.id;

    if (isSeller && !targetBuyerId) {
        showToast('Není vybrán žádný zájemce, kterému chcete odpovědět.', 'error');
        return;
    }

    const result = window.smcDb.addInquiry(
        state.currentItemDetail.id,
        message,
        state.currentUser.id,
        targetBuyerId
    );

    if (result.success) {
        input.value = '';
        showToast('Zpráva byla odeslána!', 'success');

        const updatedItem = window.smcDb.getItemById(state.currentItemDetail.id, state.currentUser.id);
        state.currentItemDetail = updatedItem;
        renderPrivateChat(updatedItem);
        loadItems();
    } else {
        showToast(result.error || 'Chyba při odesílání zprávy.', 'error');
    }
}

function changeCurrentItemStatus(status) {
    if (!state.currentItemDetail || !state.currentUser) return;

    const result = window.smcDb.updateItemStatus(state.currentItemDetail.id, status, state.currentUser.id);
    if (result.success) {
        showToast(result.message, 'success');
        openItemDetail(state.currentItemDetail.id);
        loadItems();
        loadStats();
    } else {
        showToast(result.error || 'Chyba při změně stavu.', 'error');
    }
}

function deleteCurrentItem() {
    if (!state.currentItemDetail || !state.currentUser) return;
    if (!confirm(`Opravdu chcete natrvalo smazat nabídku "${state.currentItemDetail.title}"?`)) return;

    const result = window.smcDb.deleteItem(state.currentItemDetail.id, state.currentUser.id);
    if (result.success) {
        showToast(result.message, 'success');
        closeDetailModal();
        loadItems();
        loadStats();
    } else {
        showToast(result.error || 'Chyba při mazání nabídky.', 'error');
    }
}

// ==========================================================================
// TRANSACTION COMPLETION & REVIEWS (FR-10, FR-11)
// ==========================================================================

function openCompleteTransactionModal() {
    if (!state.currentItemDetail || !state.currentUser) return;

    const modal = document.getElementById('complete-transaction-modal');
    if (!modal) return;

    const buyerSelect = document.getElementById('completion-buyer-select');
    if (buyerSelect) {
        buyerSelect.innerHTML = '<option value="">Vyberte zájemce z chatu (nebo nechte prázdné)...</option>';
        const threads = state.currentItemDetail.buyer_threads || [];
        threads.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.buyer_id;
            opt.textContent = `${t.buyer_name} (${t.buyer_department || 'Kolega'})`;
            buyerSelect.appendChild(opt);
        });
        if (state.activeChatBuyerId) {
            buyerSelect.value = state.activeChatBuyerId;
        }
    }

    // Set default outcome based on item price_type
    const outcomeSelect = document.getElementById('completion-outcome');
    if (outcomeSelect && state.currentItemDetail) {
        const type = state.currentItemDetail.price_type;
        if (type === 'sell') outcomeSelect.value = 'sold';
        else if (type === 'buy') outcomeSelect.value = 'bought';
        else if (type === 'swap') outcomeSelect.value = 'swapped';
        else if (type === 'free') outcomeSelect.value = 'given';
        else if (type === 'lend') outcomeSelect.value = 'lent';
        else if (type === 'rent') outcomeSelect.value = 'rented';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCompleteTransactionModal() {
    const modal = document.getElementById('complete-transaction-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function submitTransactionCompletion(e) {
    e.preventDefault();
    if (!state.currentItemDetail || !state.currentUser) return;

    const outcome = document.getElementById('completion-outcome').value;
    const buyerId = document.getElementById('completion-buyer-select').value;
    const comment = document.getElementById('completion-comment').value.trim();

    // Find checked rating
    let rating = 5;
    const ratingRadio = document.querySelector('input[name="rating"]:checked');
    if (ratingRadio) rating = Number(ratingRadio.value);

    // 1. Mark item as sold / completed
    const result = window.smcDb.updateItemStatus(state.currentItemDetail.id, 'sold', state.currentUser.id);

    // 2. Add review if buyer was chosen
    if (buyerId) {
        window.smcDb.addReview(
            Number(buyerId),
            state.currentUser.id,
            state.currentItemDetail.id,
            rating,
            comment || 'Úspěšné a korektní předání v souladu s pravidly.'
        );
    }

    closeCompleteTransactionModal();
    closeDetailModal();
    loadItems();
    loadStats();
    showToast('Transakce byla úspěšně dokončena a zaznamenána!', 'success');
}

// ==========================================================================
// REPORTING & MODERATION SYSTEM (FR-12, FR-13, FR-14, NFR-06)
// ==========================================================================

function openReportModalCurrentDetail() {
    if (!state.currentUser) {
        showToast('Pro nahlášení nabídky se musíte přihlásit.', 'error');
        return;
    }
    if (!state.currentItemDetail) return;

    const modal = document.getElementById('report-modal');
    const inputItemId = document.getElementById('report-item-id');
    const form = document.getElementById('report-form');

    if (inputItemId) inputItemId.value = state.currentItemDetail.id;
    if (form) form.reset();

    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeReportModal() {
    const modal = document.getElementById('report-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function submitReport(e) {
    e.preventDefault();
    if (!state.currentUser) return;

    const itemId = document.getElementById('report-item-id').value;
    const reason = document.getElementById('report-reason').value;
    const details = document.getElementById('report-details').value.trim();

    const result = window.smcDb.reportItem(
        Number(itemId),
        reason,
        details,
        state.currentUser.id
    );

    if (result.success) {
        closeReportModal();
        showToast(result.message, 'success');
        loadStats();
    } else {
        showToast(result.error || 'Chyba při odesílání nahlášení.', 'error');
    }
}

function openModerationModal() {
    if (!state.currentUser || (state.currentUser.role !== 'moderator' && state.currentUser.role !== 'admin')) {
        showToast('Přístup mají pouze pověření moderátoři komunity.', 'error');
        return;
    }

    const modal = document.getElementById('moderation-modal');
    if (!modal) return;

    filterModerationList('pending');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModerationModal() {
    const modal = document.getElementById('moderation-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function filterModerationList(filter) {
    state.currentModFilter = filter;
    const pendingBtn = document.getElementById('mod-filter-pending-btn');
    const allBtn = document.getElementById('mod-filter-all-btn');
    const tbody = document.getElementById('moderation-queue-tbody');

    if (pendingBtn && allBtn) {
        if (filter === 'pending') {
            pendingBtn.className = 'btn btn-sm btn-primary';
            allBtn.className = 'btn btn-sm btn-outline';
        } else {
            pendingBtn.className = 'btn btn-sm btn-outline';
            allBtn.className = 'btn btn-sm btn-primary';
        }
    }

    if (!tbody) return;

    const reports = window.smcDb.getReports(filter === 'all' ? null : 'pending');

    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
                    <i class="fa-solid fa-check-circle" style="font-size: 1.5rem; color: #10B981; margin-bottom: 6px; display: block;"></i>
                    Všechna nahlášení jsou vyřízena. Žádné čekající případy v moderačním centru!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reports.map(r => {
        let reasonLabel = r.reason;
        if (r.reason === 'prohibited_items') reasonLabel = '⛔ Zakázané zboží';
        else if (r.reason === 'company_property') reasonLabel = '🏭 Majetek firmy';
        else if (r.reason === 'worktime_violation') reasonLabel = '⏰ Obchod v práci';
        else if (r.reason === 'unauthorized_commercial') reasonLabel = '🏢 Komerční bazar';
        else if (r.reason === 'fraud_misleading') reasonLabel = '⚠️ Zavádění / klamání';

        const isPending = r.status === 'pending';
        const statusBadge = isPending
            ? `<span class="badge" style="background: #FEF3C7; color: #92400E;"><i class="fa-solid fa-clock"></i> Čeká na prověření</span>`
            : `<span class="badge" style="background: #E0E7FF; color: #3730A3;"><i class="fa-solid fa-check"></i> Vyřízeno (${r.resolution || 'vyřešeno'})</span>`;

        let actionBtns = '';
        if (isPending) {
            actionBtns = `
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-outline" onclick="handleModerationAction(${r.id}, 'dismissed')" title="Nahlášení je neopodstatněné, ponechat nabídku">
                        <i class="fa-solid fa-check"></i> Ponechat (Zamítnout report)
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="handleModerationAction(${r.id}, 'item_removed')" title="Skrýt a odstranit nabídku z komunity">
                        <i class="fa-solid fa-ban"></i> Odstranit inzerát
                    </button>
                </div>
            `;
        } else {
            actionBtns = `<span style="font-size: 0.8rem; color: var(--text-muted);">Ukončeno dne ${formatDate(r.resolved_at)}</span>`;
        }

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(r.item_title)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Autor nabídky: ${escapeHtml(r.seller_name)}</div>
                    <button class="btn btn-sm btn-outline" style="margin-top: 4px; font-size: 0.72rem; padding: 2px 6px;" onclick="closeModerationModal(); openItemDetail(${r.item_id});">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Zobrazit inzerát
                    </button>
                </td>
                <td>
                    <strong>${escapeHtml(r.reporter_name)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(r.created_at)}</div>
                </td>
                <td>
                    <span style="font-weight: 600; font-size: 0.82rem; color: #B91C1C;">${reasonLabel}</span>
                    <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(r.details)}</p>
                </td>
                <td>${statusBadge}</td>
                <td>${actionBtns}</td>
            </tr>
        `;
    }).join('');
}

function handleModerationAction(reportId, action) {
    if (!state.currentUser) return;

    const result = window.smcDb.resolveReport(reportId, action, state.currentUser.id);
    if (result.success) {
        showToast(result.message, 'success');
        filterModerationList(state.currentModFilter);
        loadItems();
        loadStats();
    } else {
        showToast(result.error || 'Chyba moderátorského zásahu.', 'error');
    }
}

// ==========================================================================
// COMMUNITY GUIDELINES MODAL
// ==========================================================================

function openGuidelinesModal() {
    const modal = document.getElementById('guidelines-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeGuidelinesModal() {
    const modal = document.getElementById('guidelines-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==========================================================================
// FAVORITES TOGGLE
// ==========================================================================

function toggleFavoriteItem(itemId, e) {
    if (e) e.stopPropagation();
    if (!state.currentUser) {
        showToast('Pro uložení do oblíbených se prosím přihlaste.', 'error');
        return;
    }

    const result = window.smcDb.toggleFavorite(itemId, state.currentUser.id);
    if (result.success) {
        showToast(result.message, 'info');

        const item = state.items.find(i => i.id === itemId);
        if (item) item.is_favorite = result.is_favorite ? 1 : 0;

        renderItems(state.items);

        if (state.onlyFavorites) {
            loadItems();
        }
    }
}

function toggleFavoriteCurrentDetail() {
    if (!state.currentItemDetail) return;
    const btn = document.getElementById('detail-fav-btn');
    toggleFavoriteItem(state.currentItemDetail.id);
    if (btn) btn.classList.toggle('favorited');
}

// ==========================================================================
// USER DRAWER ("MÔJ PROFIL", MOJE PONUKY, GDPR EXPORT A VÝMAZ - FR-16)
// ==========================================================================

function toggleUserDrawer() {
    const drawer = document.getElementById('user-drawer');
    const backdrop = document.getElementById('user-drawer-backdrop');

    if (drawer && drawer.classList.contains('active')) {
        closeUserDrawer();
    } else {
        if (drawer) drawer.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchDrawerTab('my-items');
    }
}

function closeUserDrawer() {
    const drawer = document.getElementById('user-drawer');
    const backdrop = document.getElementById('user-drawer-backdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

function openUserDrawerTab(tabId) {
    const drawer = document.getElementById('user-drawer');
    const backdrop = document.getElementById('user-drawer-backdrop');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchDrawerTab(tabId);
}

function switchDrawerTab(tabId) {
    document.querySelectorAll('.drawer-tab').forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    document.querySelectorAll('.drawer-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    const targetPane = document.getElementById(`drawer-tab-${tabId}`);
    if (targetPane) targetPane.classList.add('active');

    if (tabId === 'my-items') {
        loadDrawerMyItems();
    } else if (tabId === 'favorites') {
        loadDrawerFavorites();
    } else if (tabId === 'profile') {
        loadDrawerProfileReviews();
    }
}

function loadDrawerMyItems() {
    const container = document.getElementById('drawer-my-items-list');
    if (!state.currentUser || !container) return;

    const items = window.smcDb.getItems({ user_id: state.currentUser.id }, state.currentUser.id);

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
                <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 8px;"></i>
                <p>Zatím jste nezveřejnili žádnou nabídku.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const offerInfo = getOfferBadgeInfo(item.price_type, item.price);
        return `
            <div class="drawer-item-row" onclick="closeUserDrawer(); openItemDetail(${item.id});">
                <img src="${escapeHtml(item.image_url)}" class="drawer-item-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='./images/tools_case.jpg'">
                <div class="drawer-item-info">
                    <div class="drawer-item-title">${escapeHtml(item.title)}</div>
                    <div class="drawer-item-meta">
                        <span class="card-status-tag status-${item.status}">${item.status === 'active' ? 'Aktivní' : (item.status === 'reserved' ? 'Rezervováno' : 'Dokončeno')}</span>
                        <span>${escapeHtml(offerInfo.text)} • ${escapeHtml(offerInfo.priceText)}</span>
                    </div>
                    <div class="drawer-item-actions">
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); closeUserDrawer(); openItemDetail(${item.id});">
                            <i class="fa-solid fa-pen-to-square"></i> Spravovat nabídku
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadDrawerFavorites() {
    const container = document.getElementById('drawer-favorites-list');
    if (!state.currentUser || !container) return;

    const items = window.smcDb.getItems({ only_favorites: true }, state.currentUser.id);

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
                <i class="fa-regular fa-heart" style="font-size: 2rem; margin-bottom: 8px;"></i>
                <p>Nemáte zatím žádné uložené oblíbené položky.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const offerInfo = getOfferBadgeInfo(item.price_type, item.price);
        return `
            <div class="drawer-item-row" onclick="closeUserDrawer(); openItemDetail(${item.id});">
                <img src="${escapeHtml(item.image_url)}" class="drawer-item-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='./images/tools_case.jpg'">
                <div class="drawer-item-info">
                    <div class="drawer-item-title">${escapeHtml(item.title)}</div>
                    <div class="drawer-item-meta">
                        <span>${escapeHtml(offerInfo.priceText)}</span>
                        <span>•</span>
                        <span>${escapeHtml(item.publisher_name)}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-danger-outline" title="Odebrat" onclick="event.stopPropagation(); removeFavoriteAndRefreshDrawer(${item.id});">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

function loadDrawerProfileReviews() {
    const container = document.getElementById('drawer-reviews-list');
    if (!state.currentUser || !container) return;

    const reviews = window.smcDb.getUserReviews(state.currentUser.id);

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 6px 0;">Zatím jste neobdrželi žádná slovní hodnocení od kolegů.</p>
        `;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong>${escapeHtml(r.reviewer_name)}</strong>
                <span class="user-rating-pill" style="font-size: 0.72rem; padding: 1px 6px;">
                    <i class="fa-solid fa-star"></i> ${r.rating}
                </span>
            </div>
            <p style="margin: 0; color: var(--text-secondary);">${escapeHtml(r.comment)}</p>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">${formatDate(r.created_at)}</div>
        </div>
    `).join('');
}

function removeFavoriteAndRefreshDrawer(itemId) {
    toggleFavoriteItem(itemId);
    loadDrawerFavorites();
}

function handleExportGdpr() {
    if (!state.currentUser) return;
    const jsonStr = window.smcDb.exportGdprData(state.currentUser.id);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `komunitni_trh_gdpr_export_${state.currentUser.username}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('GDPR export vašich údajů byl úspěšně stažen!', 'success');
}

function handleDeleteAccount() {
    if (!state.currentUser) return;
    const confirmed = confirm(
        `Opravdu chcete natrvalo smazat váš účet (${state.currentUser.name}) a všechny vaše inzeráty a data v souladu s GDPR?\nTento krok je nevratný.`
    );
    if (!confirmed) return;

    const result = window.smcDb.deleteAccount(state.currentUser.id);
    if (result.success) {
        closeUserDrawer();
        showAuthModal();
        showToast(result.message, 'success');
    } else {
        showToast(result.error || 'Chyba při výmazu účtu.', 'error');
    }
}

// ==========================================================================
// NEW ITEM MODAL (PRIDANIE PONUKY: 6 TYPOV PONÚK - FR-05)
// ==========================================================================

function openNewItemModal() {
    const modal = document.getElementById('new-item-modal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const form = document.getElementById('new-item-form');
    if (form) form.reset();

    state.uploadedImageDataUrl = null;
    const selectedPreset = document.getElementById('selected-preset-image');
    if (selectedPreset) selectedPreset.value = '';

    const chosenName = document.getElementById('file-chosen-name');
    if (chosenName) chosenName.style.display = 'none';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    togglePriceInput('sell');

    if (state.currentUser && (state.currentUser.username === 'smc' || state.currentUser.role === 'official_smc')) {
        const locInput = document.getElementById('new-location');
        if (locInput) locInput.value = 'Areál závodu SMC • Výdejna expedice / Vrátnice';
    }
}

function closeNewItemModal() {
    const modal = document.getElementById('new-item-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function togglePriceInput(priceType) {
    const priceGroup = document.getElementById('price-amount-group');
    if (!priceGroup) return;

    if (priceType === 'sell' || priceType === 'lend' || priceType === 'rent') {
        priceGroup.style.display = 'block';
    } else {
        priceGroup.style.display = 'none';
    }
}

function selectPresetImage(presetKey, buttonElement) {
    const fileInput = document.getElementById('new-image-file');
    if (fileInput) fileInput.value = '';
    const chosenName = document.getElementById('file-chosen-name');
    if (chosenName) chosenName.style.display = 'none';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    if (buttonElement) buttonElement.classList.add('selected');

    const base64Code = (window.EMBEDDED_IMAGES && window.EMBEDDED_IMAGES[presetKey]) 
        ? window.EMBEDDED_IMAGES[presetKey] 
        : presetKey;

    state.uploadedImageDataUrl = base64Code;
    const presetHidden = document.getElementById('selected-preset-image');
    if (presetHidden) presetHidden.value = presetKey;
}

function handleImageFileUpload(input) {
    const file = input.files[0];
    const nameLabel = document.getElementById('file-chosen-name');

    if (file) {
        if (nameLabel) {
            nameLabel.textContent = `Vybráno: ${file.name} (optimalizuji fotografii...)`;
            nameLabel.style.display = 'inline-block';
        }

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
        const presetHidden = document.getElementById('selected-preset-image');
        if (presetHidden) presetHidden.value = '';

        compressImageFileToBase64(file, 640, 480, 0.78)
            .then(base64Data => {
                state.uploadedImageDataUrl = base64Data;
                if (nameLabel) {
                    nameLabel.textContent = `Připraveno: ${file.name} (~${Math.round(base64Data.length / 1024)} KB)`;
                }
            })
            .catch(err => {
                console.error('Chyba při zpracování obrázku:', err);
                const reader = new FileReader();
                reader.onload = (e) => {
                    state.uploadedImageDataUrl = e.target.result;
                };
                reader.readAsDataURL(file);
            });
    } else {
        if (nameLabel) nameLabel.style.display = 'none';
        state.uploadedImageDataUrl = null;
    }
}

function compressImageFileToBase64(file, maxWidth = 640, maxHeight = 480, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function submitNewItem(e) {
    e.preventDefault();
    if (!state.currentUser) return;

    const form = document.getElementById('new-item-form');
    const formData = new FormData(form);

    const title = formData.get('title') || '';
    const description = formData.get('description') || '';
    const category_id = formData.get('category_id') || 'home_garden';
    const price_type = formData.get('price_type') || 'sell';
    const price = (priceTypeIsFreeOrSwap(price_type)) ? 0 : (formData.get('price') || 0);
    const condition = formData.get('condition') || 'like_new';
    const location = formData.get('location') || '';

    // Determine Base64 image
    let imageBase64 = state.uploadedImageDataUrl;
    if (!imageBase64) {
        const presetKey = formData.get('preset_image');
        if (presetKey && window.EMBEDDED_IMAGES && window.EMBEDDED_IMAGES[presetKey]) {
            imageBase64 = window.EMBEDDED_IMAGES[presetKey];
        } else {
            imageBase64 = window.EMBEDDED_IMAGES ? window.EMBEDDED_IMAGES.tools_case : './images/tools_case.jpg';
        }
    }

    const result = window.smcDb.createItem({
        title,
        description,
        category_id,
        price_type,
        price,
        condition,
        location,
        image_base64: imageBase64
    }, state.currentUser.id);

    if (result.success) {
        showToast(result.message, 'success');
        closeNewItemModal();
        loadItems();
        loadStats();
        if (result.item_id) {
            openItemDetail(result.item_id);
        }
    } else {
        showToast(result.error || 'Chyba při ukládání nabídky.', 'error');
    }
}

function priceTypeIsFreeOrSwap(priceType) {
    return priceType === 'free' || priceType === 'swap' || priceType === 'buy';
}

// ==========================================================================
// SEARCH & FILTERING CONTROLS (FR-07)
// ==========================================================================

function debounceSearch() {
    clearTimeout(state.searchDebounceTimer);
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');

    if (input.value.trim().length > 0) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }

    state.searchDebounceTimer = setTimeout(() => {
        state.searchQuery = input.value.trim();
        loadItems();
    }, 250);
}

function clearSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    input.value = '';
    clearBtn.style.display = 'none';
    state.searchQuery = '';
    loadItems();
}

function filterCategory(catId) {
    state.activeCategory = catId || '';
    const select = document.getElementById('filter-category');
    if (select) select.value = state.activeCategory;
    loadItems();
}

function applyFilters() {
    state.priceType = document.getElementById('filter-price-type').value;
    state.condition = document.getElementById('filter-condition').value;
    state.sort = document.getElementById('sort-select').value;
    const catSelect = document.getElementById('filter-category');
    if (catSelect) state.activeCategory = catSelect.value;
    loadItems();
}

function toggleFavoritesFilter() {
    state.onlyFavorites = !state.onlyFavorites;
    const btn = document.getElementById('toggle-favorites-btn');
    if (state.onlyFavorites) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    loadItems();
}

function toggleMyItemsFilter() {
    state.onlyMyItems = !state.onlyMyItems;
    const btn = document.getElementById('toggle-my-items-btn');
    if (state.onlyMyItems) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    loadItems();
}

function resetAllFilters() {
    state.activeCategory = '';
    state.searchQuery = '';
    state.priceType = '';
    state.condition = '';
    state.sort = 'newest';
    state.onlyFavorites = false;
    state.onlyMyItems = false;

    document.getElementById('search-input').value = '';
    document.getElementById('clear-search-btn').style.display = 'none';
    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = '';
    document.getElementById('filter-price-type').value = '';
    document.getElementById('filter-condition').value = '';
    document.getElementById('sort-select').value = 'newest';
    document.getElementById('toggle-favorites-btn').classList.remove('active');
    document.getElementById('toggle-my-items-btn').classList.remove('active');

    loadItems();
}

function resetFiltersAndHome() {
    resetAllFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateFilterChips() {
    const container = document.getElementById('active-filter-chips');
    if (!container) return;
    container.innerHTML = '';

    if (state.searchQuery) {
        container.appendChild(createFilterChip(`Hledání: "${state.searchQuery}"`, () => clearSearch()));
    }
    if (state.activeCategory) {
        const cat = state.categories.find(c => c.id === state.activeCategory);
        const name = cat ? cat.name : state.activeCategory;
        container.appendChild(createFilterChip(`Kategorie: ${name}`, () => filterCategory('')));
    }
    if (state.priceType) {
        const labelMap = {
            sell: 'Typ: Prodám',
            buy: 'Typ: Koupím / Sháním',
            swap: 'Typ: Vyměním',
            free: 'Typ: Daruji za odvoz',
            lend: 'Typ: Půjčím',
            rent: 'Typ: Pronajmu'
        };
        container.appendChild(createFilterChip(labelMap[state.priceType] || state.priceType, () => {
            document.getElementById('filter-price-type').value = '';
            applyFilters();
        }));
    }
    if (state.onlyFavorites) {
        container.appendChild(createFilterChip('Pouze oblíbené ❤️', () => toggleFavoritesFilter()));
    }
    if (state.onlyMyItems) {
        container.appendChild(createFilterChip('Moje nabídky 📦', () => toggleMyItemsFilter()));
    }
}

function createFilterChip(text, onRemove) {
    const chip = document.createElement('div');
    chip.className = 'filter-tag-chip';
    chip.innerHTML = `
        <span>${escapeHtml(text)}</span>
        <button type="button" title="Odebrat filtr"><i class="fa-solid fa-xmark"></i></button>
    `;
    chip.querySelector('button').onclick = onRemove;
    return chip;
}

// ==========================================================================
// UTILITY FUNCTIONS & KEYBOARD SHORTCUTS
// ==========================================================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        // Keyboard Arrow Navigation for User Management Modal ("budu jezdit šipkama")
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const userManageModal = document.getElementById('user-management-modal');
            if (userManageModal && userManageModal.classList.contains('active')) {
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    if (e.key === 'ArrowLeft') {
                        navigateUserPage(-1);
                    } else if (e.key === 'ArrowRight') {
                        navigateUserPage(1);
                    }
                }
            }
        }
        if (e.key === 'Escape') {
            const detailModal = document.getElementById('detail-modal');
            const newItemModal = document.getElementById('new-item-modal');
            const reportModal = document.getElementById('report-modal');
            const guidelinesModal = document.getElementById('guidelines-modal');
            const completeModal = document.getElementById('complete-transaction-modal');
            const modModal = document.getElementById('moderation-modal');
            const drawer = document.getElementById('user-drawer');

            if (detailModal && detailModal.classList.contains('active')) closeDetailModal();
            if (newItemModal && newItemModal.classList.contains('active')) closeNewItemModal();
            if (reportModal && reportModal.classList.contains('active')) closeReportModal();
            if (guidelinesModal && guidelinesModal.classList.contains('active')) closeGuidelinesModal();
            if (completeModal && completeModal.classList.contains('active')) closeCompleteTransactionModal();
            if (modModal && modModal.classList.contains('active')) closeModerationModal();
            const userManageModal = document.getElementById('user-management-modal');
            if (userManageModal && userManageModal.classList.contains('active')) closeUserManagementModal();
            const createCompanyModal = document.getElementById('create-company-modal');
            if (createCompanyModal && createCompanyModal.classList.contains('active')) closeCreateCompanyModal();
            const changePwdModal = document.getElementById('change-password-modal');
            if (changePwdModal && changePwdModal.classList.contains('active')) closeChangePasswordModal();
            const userProfileModal = document.getElementById('user-profile-modal');
            if (userProfileModal && userProfileModal.classList.contains('active')) closeUserProfileModal();
            if (drawer && drawer.classList.contains('active')) closeUserDrawer();
        }
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatPrice(amount) {
    if (!amount || Number(amount) === 0) return 'Zdarma za odvoz';
    return `${Number(amount)} €`;
}

function formatCondition(condition) {
    switch (condition) {
        case 'new': return 'Nové / Nerozbalené';
        case 'like_new': return 'Jako nové (minimálně použité)';
        case 'used': return 'Použité (plně funkční)';
        case 'spares': return 'Na náhradní díly / opravu';
        default: return condition;
    }
}

function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return isoString;
    }
}

function pluralizeItems(count) {
    if (count === 1) return 'nabídka';
    if (count >= 2 && count <= 4) return 'nabídky';
    return 'nabídek';
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ==========================================================================
// ADMIN DASHBOARD & MARKETPLACE ROUTING
// ==========================================================================

function switchToAdminDashboard() {
    state.adminViewMode = 'dashboard';
    if (state.currentUser) {
        setUserSession(state.currentUser);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchToMarketplaceView() {
    state.adminViewMode = 'marketplace';
    if (state.currentUser) {
        setUserSession(state.currentUser);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// USER MANAGEMENT & CORPORATE ACCOUNTS (ADMIN ONLY)
// ==========================================================================

function openUserManagementModal() {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
        showToast('Tato sekce je vyhrazena pouze pro administrátory.', 'error');
        return;
    }
    const modal = document.getElementById('user-management-modal');
    if (!modal) return;

    state.userManageCurrentPage = 1;

    const searchInput = document.getElementById('manage-user-search');
    if (searchInput) searchInput.value = '';
    const roleFilter = document.getElementById('manage-user-role-filter');
    if (roleFilter) roleFilter.value = '';
    const perPageSelect = document.getElementById('manage-user-per-page');
    if (perPageSelect) perPageSelect.value = String(state.userManagePerPage || 10);

    renderUserManagementList();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUserManagementModal() {
    const modal = document.getElementById('user-management-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function resetUserPageAndRender() {
    state.userManageCurrentPage = 1;
    renderUserManagementList();
}

function changeUserPageSize(val) {
    state.userManagePerPage = parseInt(val, 10) || 10;
    state.userManageCurrentPage = 1;
    renderUserManagementList();
}

function navigateUserPage(direction) {
    goToUserPage(state.userManageCurrentPage + direction);
}

function goToUserPage(targetPage) {
    const totalP = state.userManageTotalPages || 1;
    const page = Math.max(1, Math.min(targetPage, totalP));
    if (page !== state.userManageCurrentPage) {
        state.userManageCurrentPage = page;
        renderUserManagementList();
        // Scroll the table container smoothly to top when switching page
        const tableContainer = document.querySelector('.user-manage-table-container');
        if (tableContainer) tableContainer.scrollTop = 0;
    }
}

function renderUserManagementList() {
    const tbody = document.getElementById('user-manage-tbody');
    const totalCountEl = document.getElementById('user-manage-total-count');
    const paginationInfoEl = document.getElementById('user-pagination-info');
    const paginationPagesEl = document.getElementById('user-pagination-pages');
    const prevBtn = document.getElementById('user-page-prev');
    const nextBtn = document.getElementById('user-page-next');
    if (!tbody) return;

    const search = document.getElementById('manage-user-search')?.value || '';
    const roleFilter = document.getElementById('manage-user-role-filter')?.value || '';

    const allUsers = window.smcDb.getAllUsers(roleFilter, search);
    const totalCount = allUsers.length;

    // Calculate pagination slices
    const perPage = state.userManagePerPage || 10;
    state.userManageTotalPages = Math.max(1, Math.ceil(totalCount / perPage));

    if (state.userManageCurrentPage > state.userManageTotalPages) {
        state.userManageCurrentPage = state.userManageTotalPages;
    }
    if (state.userManageCurrentPage < 1) {
        state.userManageCurrentPage = 1;
    }

    const startIndex = (state.userManageCurrentPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalCount);
    const pageUsers = allUsers.slice(startIndex, endIndex);

    if (totalCountEl) {
        totalCountEl.textContent = `Celkem v databázi: ${totalCount} zaměstnanců`;
    }

    if (paginationInfoEl) {
        if (totalCount === 0) {
            paginationInfoEl.textContent = '0 nalezených uživatelů';
        } else {
            paginationInfoEl.textContent = `Zobrazeno ${startIndex + 1}–${endIndex} z celkem ${totalCount} uživatelů (Strana ${state.userManageCurrentPage} z ${state.userManageTotalPages})`;
        }
    }

    if (prevBtn) {
        prevBtn.disabled = state.userManageCurrentPage <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = state.userManageCurrentPage >= state.userManageTotalPages;
    }

    // Render numbered page buttons
    if (paginationPagesEl) {
        paginationPagesEl.innerHTML = '';
        const totalP = state.userManageTotalPages;
        const currP = state.userManageCurrentPage;

        let pagesToShow = [];
        if (totalP <= 7) {
            for (let i = 1; i <= totalP; i++) pagesToShow.push(i);
        } else {
            pagesToShow.push(1);
            if (currP > 3) pagesToShow.push('...');
            const start = Math.max(2, currP - 1);
            const end = Math.min(totalP - 1, currP + 1);
            for (let i = start; i <= end; i++) {
                if (!pagesToShow.includes(i)) pagesToShow.push(i);
            }
            if (currP < totalP - 2) pagesToShow.push('...');
            if (!pagesToShow.includes(totalP)) pagesToShow.push(totalP);
        }

        pagesToShow.forEach(p => {
            if (p === '...') {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 4px';
                dots.style.color = 'var(--text-muted)';
                dots.style.fontSize = '0.82rem';
                paginationPagesEl.appendChild(dots);
            } else {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `page-num-btn ${p === currP ? 'active' : ''}`;
                btn.textContent = p;
                btn.title = `Přejít na stranu ${p}`;
                btn.onclick = () => goToUserPage(p);
                paginationPagesEl.appendChild(btn);
            }
        });
    }

    if (totalCount === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);"><i class="fa-solid fa-user-slash" style="font-size: 1.6rem; margin-bottom: 8px; display: block;"></i>Žádní uživatelé neodpovídají zadaným kritériím vyhledávání.</td></tr>`;
        return;
    }

    tbody.innerHTML = pageUsers.map(u => {
        let roleBadgeHtml = '';
        if (u.role === 'admin') {
            roleBadgeHtml = '<span class="role-badge role-admin"><i class="fa-solid fa-shield-halved"></i> Administrátor</span>';
        } else if (u.is_official || u.role === 'official_smc') {
            roleBadgeHtml = '<span class="role-badge role-smc"><i class="fa-solid fa-building"></i> Firemní účet SMC</span>';
        } else if (u.role === 'moderator') {
            roleBadgeHtml = '<span class="role-badge role-moderator"><i class="fa-solid fa-shield-halved"></i> Moderátor</span>';
        } else {
            roleBadgeHtml = '<span class="role-badge role-user"><i class="fa-solid fa-user"></i> Běžný uživatel</span>';
        }

        const bannedBadge = u.is_banned ? '<span class="status-badge-banned">Blokován</span>' : '';
        const isCurrentAdmin = state.currentUser && state.currentUser.id === u.id;

        // Moderator toggle action button (with prompt confirmation)
        let modBtnHtml = '';
        if (u.role !== 'admin' && !u.is_official) {
            if (u.role === 'moderator') {
                modBtnHtml = `<button type="button" class="btn-table-action btn-mod-demote" onclick="handleToggleModerator(${u.id}, false, '${escapeAttr(u.name)}')" title="Odebrat moderátorská práva">
                    <i class="fa-solid fa-user-minus"></i> Odebrat moderátora
                </button>`;
            } else {
                modBtnHtml = `<button type="button" class="btn-table-action btn-mod-promote" onclick="handleToggleModerator(${u.id}, true, '${escapeAttr(u.name)}')" title="Udělit moderátorská práva">
                    <i class="fa-solid fa-user-shield"></i> Udělit moderátora
                </button>`;
            }
        }

        // Ban button
        let banBtnHtml = '';
        if (u.role !== 'admin' && !isCurrentAdmin) {
            banBtnHtml = `<button type="button" class="btn-table-action btn-ban" onclick="handleToggleBan(${u.id}, '${escapeAttr(u.name)}')">
                <i class="fa-solid ${u.is_banned ? 'fa-unlock' : 'fa-ban'}"></i> ${u.is_banned ? 'Odblokovat' : 'Zablokovat'}
            </button>`;
        }

        return `
            <tr>
                <td>
                    <div class="user-cell-wrap">
                        <div class="user-table-avatar ${u.role === 'admin' ? 'is-admin' : ''} ${u.is_official ? 'is-smc' : ''}">
                            ${u.is_official ? '<i class="fa-solid fa-building"></i>' : (u.avatar_text || u.name.substring(0,2).toUpperCase())}
                        </div>
                        <div>
                            <div class="user-name-title">
                                ${escapeHtml(u.name)}
                                ${bannedBadge}
                            </div>
                            <div class="user-sub-info">@${escapeHtml(u.username)} • ${escapeHtml(u.email || u.phone || '')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(u.department || 'Zaměstnanec')}</div>
                    <div class="user-sub-info"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(u.location || 'Areál závodu')}</div>
                </td>
                <td>
                    ${roleBadgeHtml}
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${u.active_items_count} aktivních</div>
                    <div class="user-sub-info">${u.items_count} celkem</div>
                </td>
                <td>
                    <div class="action-buttons-wrap">
                        <button type="button" class="btn-table-action" onclick="openUserProfileModal(${u.id})" title="Zobrazit profil a inzeráty uživatele">
                            <i class="fa-solid fa-address-card"></i> Profil & inzeráty
                        </button>
                        ${modBtnHtml}
                        <button type="button" class="btn-table-action btn-pwd" onclick="openChangePasswordModal(${u.id}, '${escapeAttr(u.name)}')" title="Změnit heslo">
                            <i class="fa-solid fa-key"></i> Změnit heslo
                        </button>
                        ${banBtnHtml}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function handleToggleModerator(userId, makeModerator, userName) {
    const question = makeModerator
        ? `Opravdu si přejete uživateli "${userName}" udělit roli moderátora komunity?\n\nZíská tím přístup do moderačního centra a možnost prověřovat a mazat nahlášené inzeráty.`
        : `Opravdu si přejete uživateli "${userName}" odebrat roli moderátora komunity?\n\nUživatel bude převeden zpět na běžného člena a ztratí přístup do moderačního centra.`;

    if (!confirm(question)) {
        return;
    }

    const newRole = makeModerator ? 'moderator' : 'user';
    const res = window.smcDb.updateUserRole(userId, newRole, state.currentUser.id);
    if (res.success) {
        showToast(res.message, 'success');
        renderUserManagementList();
        loadStats();
    } else {
        showToast(res.error, 'error');
    }
}

function handleToggleBan(userId, userName) {
    const res = window.smcDb.toggleUserBan(userId, state.currentUser.id);
    if (res.success) {
        showToast(res.message, 'info');
        renderUserManagementList();
    } else {
        showToast(res.error, 'error');
    }
}

function openChangePasswordModal(userId, userName) {
    const modal = document.getElementById('change-password-modal');
    if (!modal) return;

    document.getElementById('change-pwd-user-id').value = userId;
    const descEl = document.getElementById('change-pwd-user-desc');
    if (descEl) descEl.textContent = `Nastavení nového přístupového hesla pro uživatele ${userName}.`;

    const input = document.getElementById('change-pwd-new-password');
    if (input) input.value = '';

    const err = document.getElementById('change-pwd-error');
    if (err) err.style.display = 'none';

    modal.classList.add('active');
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.classList.remove('active');
}

function submitChangePassword(e) {
    e.preventDefault();
    const userId = document.getElementById('change-pwd-user-id').value;
    const newPwd = document.getElementById('change-pwd-new-password').value;

    const res = window.smcDb.updateUserPassword(userId, newPwd, state.currentUser.id);
    if (res.success) {
        showToast(res.message, 'success');
        closeChangePasswordModal();
    } else {
        const err = document.getElementById('change-pwd-error');
        if (err) {
            err.textContent = res.error;
            err.style.display = 'block';
        }
    }
}

function openCreateCompanyModal() {
    const modal = document.getElementById('create-company-modal');
    if (!modal) return;

    const form = document.getElementById('create-company-form');
    if (form) form.reset();
    document.getElementById('company-password').value = '1234';

    const err = document.getElementById('create-company-error');
    if (err) err.style.display = 'none';

    modal.classList.add('active');
}

function closeCreateCompanyModal() {
    const modal = document.getElementById('create-company-modal');
    if (modal) modal.classList.remove('active');
}

function submitCreateCompany(e) {
    e.preventDefault();
    const companyData = {
        name: document.getElementById('company-name').value,
        username: document.getElementById('company-username').value,
        password: document.getElementById('company-password').value,
        email: document.getElementById('company-email').value,
        phone: document.getElementById('company-phone').value,
        department: document.getElementById('company-department').value,
        location: document.getElementById('company-location').value,
        bio: document.getElementById('company-bio').value
    };

    const res = window.smcDb.createCompanyAccount(companyData, state.currentUser.id);
    if (res.success) {
        showToast(res.message, 'success');
        closeCreateCompanyModal();
        renderUserManagementList();
        loadStats();
    } else {
        const err = document.getElementById('create-company-error');
        if (err) {
            err.textContent = res.error;
            err.style.display = 'block';
        }
    }
}

function openUserProfileModal(userId) {
    const data = window.smcDb.getUserProfileWithItems(userId);
    if (!data) {
        showToast('Uživatel nebyl nalezen.', 'error');
        return;
    }

    const { user, items, reviews } = data;
    const modal = document.getElementById('user-profile-modal');
    if (!modal) return;

    const avatarEl = document.getElementById('profile-modal-avatar');
    if (avatarEl) {
        if (user.is_official) {
            avatarEl.innerHTML = '<i class="fa-solid fa-building"></i>';
            avatarEl.style.background = 'linear-gradient(135deg, #005BAC, #002D59)';
        } else if (user.role === 'admin') {
            avatarEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
            avatarEl.style.background = 'linear-gradient(135deg, #4f46e5, #312e81)';
        } else {
            avatarEl.textContent = user.avatar_text || user.name.substring(0, 2).toUpperCase();
            avatarEl.style.background = 'linear-gradient(135deg, var(--smc-blue-primary), #002d59)';
        }
    }

    document.getElementById('profile-modal-name').textContent = user.name;
    document.getElementById('profile-modal-username').textContent = `@${user.username}`;
    document.getElementById('profile-modal-dept').textContent = user.department || 'Zaměstnanec';
    document.getElementById('profile-modal-location').textContent = user.location || 'Areál závodu';
    document.getElementById('profile-modal-email').textContent = user.email || 'Nezadáno';
    document.getElementById('profile-modal-phone').textContent = user.phone || 'Nezadáno';
    document.getElementById('profile-modal-reg-date').textContent = new Date(user.registered_at).toLocaleDateString('cs-CZ');

    const roleBadge = document.getElementById('profile-modal-role-badge');
    if (roleBadge) {
        if (user.role === 'admin') {
            roleBadge.textContent = 'Hlavní Administrátor';
            roleBadge.className = 'role-badge role-admin';
        } else if (user.is_official) {
            roleBadge.textContent = 'Firemní účet SMC';
            roleBadge.className = 'role-badge role-smc';
        } else if (user.role === 'moderator') {
            roleBadge.textContent = 'Moderátor komunity';
            roleBadge.className = 'role-badge role-moderator';
        } else {
            roleBadge.textContent = 'Běžný uživatel';
            roleBadge.className = 'role-badge role-user';
        }
    }

    const ratingPill = document.getElementById('profile-modal-rating-pill');
    if (ratingPill) {
        ratingPill.innerHTML = `<i class="fa-solid fa-star"></i> ${Number(user.rating || 5.0).toFixed(1)} (${reviews ? reviews.length : 0})`;
    }

    const itemsCountEl = document.getElementById('profile-modal-items-count');
    if (itemsCountEl) itemsCountEl.textContent = items.length;

    const itemsGrid = document.getElementById('profile-modal-items-grid');
    if (itemsGrid) {
        if (items.length === 0) {
            itemsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">Tento uživatel zatím nemá zveřejněné žádné inzeráty.</p>';
        } else {
            itemsGrid.innerHTML = items.map(it => {
                const img = it.images && it.images.length > 0 ? it.images[0] : '';
                const offerInfo = getOfferBadgeInfo(it.price_type, it.price);
                return `
                    <div class="profile-item-mini-card" onclick="closeUserProfileModal(); openItemDetail(${it.id});">
                        <img class="mini-card-thumb" src="${img}" alt="${escapeHtml(it.title)}" onerror="this.src='./images/tools_case.jpg'">
                        <div class="mini-card-body">
                            <span class="badge ${offerInfo.className}" style="font-size: 0.68rem; margin-bottom: 4px; align-self: flex-start;">
                                <i class="fa-solid ${offerInfo.icon}"></i> ${escapeHtml(offerInfo.text)}
                            </span>
                            <h4>${escapeHtml(it.title)}</h4>
                            <div class="mini-card-price">${escapeHtml(offerInfo.priceText)}</div>
                            <button type="button" class="btn btn-sm btn-outline btn-block" style="font-size: 0.75rem; margin-top: auto;">
                                <i class="fa-solid fa-eye"></i> Detail
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    modal.classList.add('active');
}

function closeUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.classList.remove('active');
}

