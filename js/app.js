/**
 * SMC MARKETPLACE - CLIENT APPLICATION JAVASCRIPT
 * 100% Čisté HTML, CSS a JS bez závislosti na Pythonu či externím backendu.
 * Spolupracuje přímo s lokální SQLite-kompatibilní databází (js/db.js).
 */

// Application State
const state = {
    currentUser: null,
    categories: [],
    items: [],
    activeCategory: '',
    searchQuery: '',
    priceType: '',
    condition: '',
    sort: 'newest',
    onlyFavorites: false,
    onlyMyItems: false,
    currentItemDetail: null,
    activeChatBuyerId: null,
    uploadedImageDataUrl: null,
    searchDebounceTimer: null
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initKeyboardShortcuts();
    checkAuth();
});

// ==========================================================================
// AUTHENTICATION & SESSION MANAGEMENT
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

    // Update navbar user widget
    const navAvatar = document.getElementById('nav-user-avatar');
    const navName = document.getElementById('nav-user-name');
    const navRole = document.getElementById('nav-user-role');

    if (navAvatar) navAvatar.textContent = user.avatar_text || user.username.substring(0, 2).toUpperCase();
    if (navName) navName.textContent = user.name;
    if (navRole) {
        navRole.textContent = user.role === 'admin' ? 'Oficiální SMC Správce' : user.department.split('&')[0];
    }

    // Update drawer profile info
    const drawerAvatar = document.getElementById('drawer-user-avatar');
    const drawerName = document.getElementById('drawer-user-name');
    const drawerRoleBadge = document.getElementById('drawer-user-role-badge');
    const drawerDept = document.getElementById('drawer-user-department');
    const drawerEmail = document.getElementById('drawer-user-email');
    const drawerPhone = document.getElementById('drawer-user-phone');

    if (drawerAvatar) drawerAvatar.textContent = user.avatar_text || user.username.substring(0, 2).toUpperCase();
    if (drawerName) drawerName.textContent = user.name;
    if (drawerRoleBadge) {
        drawerRoleBadge.textContent = user.role === 'admin' ? 'Firemní Administrátor (SMC)' : 'Zaměstnanec SMC';
    }
    if (drawerDept) drawerDept.textContent = user.department;
    if (drawerEmail) drawerEmail.textContent = user.email || 'marketplace@smc.cz';
    if (drawerPhone) drawerPhone.textContent = user.phone || '+420 541 424 611';
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
        showToast(`Vítejte zpět v SMC Marketplace, ${result.user.name}!`, 'success');
        loadInitialData();
    } else {
        if (errorBanner) {
            errorBanner.textContent = result.error || 'Neplatné přihlašovací údaje.';
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
    const statReserved = document.getElementById('stat-reserved');
    const statUsers = document.getElementById('stat-users');

    if (statActive) statActive.textContent = data.active_items;
    if (statFree) statFree.textContent = data.free_items;
    if (statReserved) statReserved.textContent = data.reserved_items;
    if (statUsers) statUsers.textContent = data.total_users;
}

function loadCategories() {
    state.categories = window.smcDb.getCategories();
    const container = document.getElementById('categories-bar');
    if (!container) return;

    container.innerHTML = `
        <button class="category-pill ${state.activeCategory === '' ? 'active' : ''}" data-category="" onclick="filterCategory('')">
            <i class="fa-solid fa-border-all"></i> Všechny nabídky
        </button>
    `;

    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-pill ${state.activeCategory === cat.id ? 'active' : ''}`;
        btn.onclick = () => filterCategory(cat.id);
        btn.innerHTML = `
            <i class="fa-solid ${cat.icon}"></i>
            <span>${cat.name}</span>
            <span class="category-count">${cat.items_count}</span>
        `;
        container.appendChild(btn);
    });
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
// RENDER ITEMS (DLAŽDICE KATALOGU DLE ZADÁNÍ)
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

function createItemCard(item) {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.onclick = (e) => {
        if (e.target.closest('.card-fav-btn')) return;
        openItemDetail(item.id);
    };

    // Price badge rendering
    let priceHtml = '';
    if (item.price_type === 'free') {
        priceHtml = `<div class="card-price-badge price-free"><i class="fa-solid fa-gift"></i> Zdarma za odvoz</div>`;
    } else if (item.price_type === 'swap') {
        priceHtml = `<div class="card-price-badge price-swap"><i class="fa-solid fa-repeat"></i> Na výměnu</div>`;
    } else if (item.price_type === 'negotiable') {
        priceHtml = `<div class="card-price-badge"><i class="fa-solid fa-handshake"></i> Dohodou</div>`;
    } else {
        priceHtml = `<div class="card-price-badge">${formatPrice(item.price)}</div>`;
    }

    // Status tag rendering
    let statusTag = '';
    if (item.status === 'reserved') {
        statusTag = `<span class="card-status-tag status-reserved"><i class="fa-solid fa-clock"></i> Rezervováno</span>`;
    } else if (item.status === 'sold') {
        statusTag = `<span class="card-status-tag status-sold"><i class="fa-solid fa-check"></i> Předáno</span>`;
    } else {
        statusTag = `<span class="card-status-tag status-active"><i class="fa-solid fa-circle-check"></i> Aktivní</span>`;
    }

    // Publisher styling (SMC corporate account gets special verified design)
    const isOfficialSMC = item.username.toLowerCase() === 'smc';
    const publisherAvatarClass = isOfficialSMC ? 'publisher-avatar-circle is-smc' : 'publisher-avatar-circle';
    const publisherOfficialBadge = isOfficialSMC ? `<span class="official-smc-badge"><i class="fa-solid fa-shield-check"></i> Oficiální SMC</span>` : '';

    const isFav = item.is_favorite ? 'favorited' : '';

    card.innerHTML = `
        <!-- Úvodní obrázek (Cover image) -->
        <div class="card-media">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='./images/smc_valve_cylinder.jpg'">
            <div class="card-badges-top">
                <span class="card-category-tag">${escapeHtml(item.category_name)}</span>
                ${statusTag}
            </div>
            <button class="card-fav-btn ${isFav}" title="${item.is_favorite ? 'Odebrat z oblíbených' : 'Uložit do oblíbených'}" onclick="toggleFavoriteItem(${item.id}, event)">
                <i class="fa-solid fa-heart"></i>
            </button>
            ${priceHtml}
        </div>

        <!-- Tělo dlaždice s názvem a kdo nabídku zveřejnil -->
        <div class="card-body">
            <!-- Název itemu -->
            <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
            <p class="card-desc">${escapeHtml(item.description)}</p>

            <!-- Kdo nabídku zveřejnil (Publisher Section) -->
            <div class="card-publisher-box">
                <div class="${publisherAvatarClass}">
                    ${isOfficialSMC ? '<i class="fa-solid fa-building"></i>' : escapeHtml(item.publisher_avatar || item.username.substring(0, 2).toUpperCase())}
                </div>
                <div class="publisher-details">
                    <span class="publisher-meta-caption">Zveřejnil:</span>
                    <div class="publisher-name-line">
                        <span class="publisher-name">${escapeHtml(item.publisher_name)}</span>
                        ${publisherOfficialBadge}
                    </div>
                    <span class="publisher-dept">${escapeHtml(item.publisher_department)}</span>
                </div>
            </div>

            <!-- Spodní lišta dlaždice -->
            <div class="card-meta-footer">
                <span class="card-location" title="${escapeHtml(item.location)}">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location)}
                </span>
                <div class="card-stats-info">
                    <span title="Počet zhlédnutí"><i class="fa-solid fa-eye"></i> ${item.views_count}</span>
                    <span title="Dotazy a zájem"><i class="fa-solid fa-comment"></i> ${item.inquiries_count}</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

// ==========================================================================
// ITEM DETAIL MODAL & INQUIRIES
// ==========================================================================

function openItemDetail(itemId) {
    const currentUserId = state.currentUser ? state.currentUser.id : null;
    const item = window.smcDb.getItemById(itemId, currentUserId);

    if (!item) {
        showToast('Položka nebyla nalezena.', 'error');
        return;
    }

    state.currentItemDetail = item;
    // Set active buyer chat tab: if threads exist, pick first buyer or keep current if valid
    if (item.is_seller) {
        if (!state.activeChatBuyerId || !(item.buyer_threads && item.buyer_threads.some(t => t.buyer_id === state.activeChatBuyerId))) {
            state.activeChatBuyerId = (item.buyer_threads && item.buyer_threads.length > 0) ? item.buyer_threads[0].buyer_id : null;
        }
    } else {
        state.activeChatBuyerId = state.currentUser ? state.currentUser.id : null;
    }

    // Image & badges
    const img = document.getElementById('detail-img');
    img.src = item.image_url;
    img.onerror = () => { img.src = './images/smc_valve_cylinder.jpg'; };

    const catBadge = document.getElementById('detail-category-badge');
    catBadge.textContent = item.category_name;

    const statusBadge = document.getElementById('detail-status-badge');
    if (item.status === 'reserved') {
        statusBadge.className = 'badge status-reserved';
        statusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Rezervováno';
    } else if (item.status === 'sold') {
        statusBadge.className = 'badge status-sold';
        statusBadge.innerHTML = '<i class="fa-solid fa-check"></i> Předáno';
    } else {
        statusBadge.className = 'badge status-active';
        statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aktivní nabídka';
    }

    // Title & Favorite button
    document.getElementById('detail-title').textContent = item.title;
    const favBtn = document.getElementById('detail-fav-btn');
    if (item.is_favorite) {
        favBtn.classList.add('favorited');
    } else {
        favBtn.classList.remove('favorited');
    }

    // Price, condition, location
    const priceEl = document.getElementById('detail-price');
    if (item.price_type === 'free') {
        priceEl.innerHTML = '<span style="color: #059669;"><i class="fa-solid fa-gift"></i> Zdarma za odvoz</span>';
    } else if (item.price_type === 'swap') {
        priceEl.innerHTML = '<span style="color: #7c3aed;"><i class="fa-solid fa-repeat"></i> Na výměnu</span>';
    } else if (item.price_type === 'negotiable') {
        priceEl.innerHTML = '<span><i class="fa-solid fa-handshake"></i> Cena dohodou</span>';
    } else {
        priceEl.textContent = formatPrice(item.price);
    }

    document.getElementById('detail-condition').innerHTML = `<i class="fa-solid fa-shield-halved"></i> Stav: <strong>${formatCondition(item.condition)}</strong>`;
    document.getElementById('detail-location').textContent = item.location;

    // Publisher card
    const isOfficial = item.username.toLowerCase() === 'smc';
    const pubAvatar = document.getElementById('detail-publisher-avatar');
    if (isOfficial) {
        pubAvatar.innerHTML = '<i class="fa-solid fa-building"></i>';
        pubAvatar.style.background = 'linear-gradient(135deg, #005BAC, #003366)';
    } else {
        pubAvatar.textContent = item.publisher_avatar || item.username.substring(0, 2).toUpperCase();
        pubAvatar.style.background = '#0284c7';
    }

    document.getElementById('detail-publisher-name').innerHTML = `${escapeHtml(item.publisher_name)} ${isOfficial ? '<span class="official-smc-badge"><i class="fa-solid fa-shield-check"></i> Oficiální</span>' : ''}`;
    document.getElementById('detail-publisher-dept').textContent = item.publisher_department;

    // Direct contact shortcuts
    const contactsContainer = document.getElementById('detail-publisher-contacts');
    contactsContainer.innerHTML = '';
    if (item.publisher_email) {
        contactsContainer.innerHTML += `
            <a href="mailto:${escapeHtml(item.publisher_email)}?subject=Zájem o nabídku na SMC Marketplace: ${encodeURIComponent(item.title)}" class="btn btn-sm btn-outline" title="Napsat e-mail">
                <i class="fa-solid fa-envelope"></i> E-mail
            </a>
        `;
    }
    if (item.publisher_phone) {
        contactsContainer.innerHTML += `
            <a href="tel:${escapeHtml(item.publisher_phone)}" class="btn btn-sm btn-outline" title="Zavolat">
                <i class="fa-solid fa-phone"></i> Volat
            </a>
        `;
    }

    // Description
    document.getElementById('detail-desc').textContent = item.description;

    // Private inquiries / chat
    renderPrivateChat(item);

    // Owner Toolbar
    const ownerTools = document.getElementById('detail-owner-tools');
    const isOwnerOrAdmin = state.currentUser && (state.currentUser.id === item.user_id || state.currentUser.role === 'admin');
    if (isOwnerOrAdmin) {
        ownerTools.style.display = 'block';

        const reserveBtn = document.getElementById('mark-reserved-btn');
        const activeBtn = document.getElementById('mark-active-btn');
        const soldBtn = document.getElementById('mark-sold-btn');

        if (item.status === 'active') {
            reserveBtn.style.display = 'inline-flex';
            activeBtn.style.display = 'none';
            soldBtn.style.display = 'inline-flex';
        } else if (item.status === 'reserved') {
            reserveBtn.style.display = 'none';
            activeBtn.style.display = 'inline-flex';
            soldBtn.style.display = 'inline-flex';
        } else {
            reserveBtn.style.display = 'none';
            activeBtn.style.display = 'inline-flex';
            soldBtn.style.display = 'none';
        }
    } else {
        ownerTools.style.display = 'none';
    }

    const modal = document.getElementById('detail-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    state.currentItemDetail = null;
    state.activeChatBuyerId = null;
}

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
            headerContainer.innerHTML = `
                <h4><i class="fa-solid fa-lock"></i> Soukromý chat k položce</h4>
            `;
        }
        if (list) {
            list.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fa-solid fa-lock" style="font-size: 1.8rem; color: var(--text-muted); margin-bottom: 8px;"></i>
                    <p style="color: var(--text-secondary); margin-bottom: 10px;">Pro zobrazení soukromého chatu se prosím přihlaste.</p>
                    <button type="button" class="btn btn-sm btn-primary" onclick="openLoginModal()">Přihlásit se</button>
                </div>
            `;
        }
        if (form) form.style.display = 'none';
        return;
    }

    if (form) form.style.display = 'block';

    if (item.is_seller) {
        // --- PRODÁVAJÍCÍ REŽIM ---
        const buyerThreads = item.buyer_threads || [];
        if (countBadge) countBadge.textContent = buyerThreads.length;

        if (headerContainer) {
            headerContainer.innerHTML = `
                <div class="chat-header-flex">
                    <div class="chat-header-title">
                        <h4><i class="fa-solid fa-comments"></i> Zájemci o položku a chaty (${buyerThreads.length})</h4>
                        <span class="seller-mode-pill"><i class="fa-solid fa-user-tag"></i> Vaše nabídka (Prodávající)</span>
                    </div>
                    <p class="chat-subtitle">Zde vidíte všechny zájemce o vaši nabídku. Každý kolega má svůj vlastní soukromý chat.</p>
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
                            O tuto nabídku zatím nikdo nenapsal. Jakmile se objeví zájemce, jeho soukromý chat najdete zde.
                        </p>
                    </div>
                `;
            }
            if (form) form.style.display = 'none';
            return;
        }

        // We have buyer threads
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

        if (input) {
            input.placeholder = `Odpovědět zájemci (${currentThread.buyer_name})...`;
        }
        if (submitBtn) {
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Odpovědět`;
        }

    } else {
        // --- ZÁJEMCE (BUYER) REŽIM ---
        if (buyersPanel) buyersPanel.style.display = 'none';
        if (activeChatInfoBar) activeChatInfoBar.style.display = 'none';

        const myMessages = item.my_thread || [];
        if (countBadge) countBadge.textContent = myMessages.length;

        if (headerContainer) {
            headerContainer.innerHTML = `
                <div class="chat-header-flex">
                    <div class="chat-header-title">
                        <h4><i class="fa-solid fa-lock" style="color: var(--smc-blue-primary);"></i> Soukromý chat s prodávajícím</h4>
                        <span class="private-badge"><i class="fa-solid fa-shield-halved"></i> Pouze vy a prodejce</span>
                    </div>
                    <p class="chat-subtitle">Tento chat je soukromý. Vaše zprávy uvidí výhradně <strong>${escapeHtml(item.publisher_name)}</strong> (${escapeHtml(item.publisher_department)}). Ostatní kolegové konverzaci nevidí.</p>
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
                            Napište prodejci soukromou zprávu. Můžete se domluvit na předání, vyzkoušení nebo rezervaci.
                        </p>
                    </div>
                `;
            }
        } else {
            if (list) {
                renderMessageStream(myMessages, item, list);
            }
        }

        if (input) {
            input.placeholder = `Napište soukromou zprávu prodejci (${item.publisher_name})...`;
        }
        if (submitBtn) {
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Odeslat`;
        }
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
        const senderTag = msg.is_from_seller ? ' <span class="chat-seller-tag">Prodávající</span>' : '';

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
                    <div class="chat-msg-avatar">${escapeHtml(msg.sender_avatar || 'SM')}</div>
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
        
        // Refresh item detail to update inquiries data
        const updatedItem = window.smcDb.getItemById(state.currentItemDetail.id, state.currentUser.id);
        state.currentItemDetail = updatedItem;
        renderPrivateChat(updatedItem);
        loadItems();
    } else {
        showToast(result.error || 'Chyba při odesílání.', 'error');
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
        showToast(result.error || 'Chyba změny stavu.', 'error');
    }
}

function deleteCurrentItem() {
    if (!state.currentItemDetail || !state.currentUser) return;
    if (!confirm(`Opravdu chcete smazat nabídku "${state.currentItemDetail.title}"?`)) return;

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
    btn.classList.toggle('favorited');
}

// ==========================================================================
// USER DRAWER ("MŮJ ÚČET", OBLÍBENÉ, MOJE NABÍDKY)
// ==========================================================================

function toggleUserDrawer() {
    const drawer = document.getElementById('user-drawer');
    const backdrop = document.getElementById('user-drawer-backdrop');

    if (drawer.classList.contains('active')) {
        closeUserDrawer();
    } else {
        drawer.classList.add('active');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchDrawerTab('my-items');
    }
}

function closeUserDrawer() {
    const drawer = document.getElementById('user-drawer');
    const backdrop = document.getElementById('user-drawer-backdrop');
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

function openUserDrawerTab(tabId) {
    const drawer = document.getElementById('user-drawer');
    const backdrop = document.getElementById('user-drawer-backdrop');
    drawer.classList.add('active');
    backdrop.classList.add('active');
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
    }
}

function loadDrawerMyItems() {
    const container = document.getElementById('drawer-my-items-list');
    if (!state.currentUser) return;

    const items = window.smcDb.getItems({ user_id: state.currentUser.id }, state.currentUser.id);

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
                <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 8px;"></i>
                <p>Zatím jste nevytvořili žádnou nabídku.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="drawer-item-row" onclick="closeUserDrawer(); openItemDetail(${item.id});">
            <img src="${escapeHtml(item.image_url)}" class="drawer-item-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='./images/smc_valve_cylinder.jpg'">
            <div class="drawer-item-info">
                <div class="drawer-item-title">${escapeHtml(item.title)}</div>
                <div class="drawer-item-meta">
                    <span class="card-status-tag status-${item.status}">${item.status === 'active' ? 'Aktivní' : (item.status === 'reserved' ? 'Rezervováno' : 'Předáno')}</span>
                    <span>${item.price_type === 'free' ? 'Zdarma' : (item.price_type === 'swap' ? 'Výměna' : formatPrice(item.price))}</span>
                </div>
                <div class="drawer-item-actions">
                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); closeUserDrawer(); openItemDetail(${item.id});">
                        <i class="fa-solid fa-pen-to-square"></i> Spravovat
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadDrawerFavorites() {
    const container = document.getElementById('drawer-favorites-list');
    if (!state.currentUser) return;

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

    container.innerHTML = items.map(item => `
        <div class="drawer-item-row" onclick="closeUserDrawer(); openItemDetail(${item.id});">
            <img src="${escapeHtml(item.image_url)}" class="drawer-item-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='./images/smc_valve_cylinder.jpg'">
            <div class="drawer-item-info">
                <div class="drawer-item-title">${escapeHtml(item.title)}</div>
                <div class="drawer-item-meta">
                    <span>${item.price_type === 'free' ? 'Zdarma' : formatPrice(item.price)}</span>
                    <span>•</span>
                    <span>${escapeHtml(item.publisher_name)}</span>
                </div>
            </div>
            <button class="btn btn-sm btn-danger-outline" title="Odebrat" onclick="event.stopPropagation(); removeFavoriteAndRefreshDrawer(${item.id});">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function removeFavoriteAndRefreshDrawer(itemId) {
    toggleFavoriteItem(itemId);
    loadDrawerFavorites();
}

function downloadSQLiteDump() {
    const sql = window.smcDb.exportSQLiteDump();
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smc_marketplace_${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SQLite SQL skript byl stažen!', 'success');
}

// ==========================================================================
// NEW ITEM MODAL (PŘIDÁNÍ NABÍDKY S PODPOROU OBRÁZKŮ)
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
    togglePriceInput('free');
}

function closeNewItemModal() {
    const modal = document.getElementById('new-item-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function togglePriceInput(priceType) {
    const priceGroup = document.getElementById('price-amount-group');
    if (priceType === 'fixed') {
        priceGroup.style.display = 'block';
    } else {
        priceGroup.style.display = 'none';
    }
}

function selectPresetImage(presetKey, buttonElement) {
    document.getElementById('new-image-file').value = '';
    document.getElementById('file-chosen-name').style.display = 'none';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    buttonElement.classList.add('selected');

    // Retrieve base64 string directly from embedded database assets
    const base64Code = (window.EMBEDDED_IMAGES && window.EMBEDDED_IMAGES[presetKey]) 
        ? window.EMBEDDED_IMAGES[presetKey] 
        : presetKey;

    state.uploadedImageDataUrl = base64Code;
    document.getElementById('selected-preset-image').value = presetKey;
}

function handleImageFileUpload(input) {
    const file = input.files[0];
    const nameLabel = document.getElementById('file-chosen-name');

    if (file) {
        nameLabel.textContent = `Vybráno: ${file.name} (převádím na Base64 do DB...)`;
        nameLabel.style.display = 'inline-block';

        // Clear preset selection
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('selected-preset-image').value = '';

        // Read and compress image locally into an optimized Base64 data URL
        compressImageFileToBase64(file, 640, 480, 0.78)
            .then(base64Data => {
                state.uploadedImageDataUrl = base64Data;
                nameLabel.textContent = `Připraveno v Base64: ${file.name} (~${Math.round(base64Data.length / 1024)} KB)`;
            })
            .catch(err => {
                console.error('Chyba při převodu obrázku na Base64:', err);
                // Fallback to simple reader
                const reader = new FileReader();
                reader.onload = (e) => {
                    state.uploadedImageDataUrl = e.target.result;
                };
                reader.readAsDataURL(file);
            });
    } else {
        nameLabel.style.display = 'none';
        state.uploadedImageDataUrl = null;
    }
}

// Client-side Canvas Image Compression helper (produces crisp Base64 strings)
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
    const category_id = formData.get('category_id') || 'pneumatics';
    const price_type = formData.get('price_type') || 'free';
    const price = formData.get('price') || 0;
    const condition = formData.get('condition') || 'like_new';
    const location = formData.get('location') || '';

    // Determine Base64 image
    let imageBase64 = state.uploadedImageDataUrl;
    if (!imageBase64) {
        const presetKey = formData.get('preset_image');
        if (presetKey && window.EMBEDDED_IMAGES && window.EMBEDDED_IMAGES[presetKey]) {
            imageBase64 = window.EMBEDDED_IMAGES[presetKey];
        } else {
            imageBase64 = window.EMBEDDED_IMAGES.smc_valve_cylinder;
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

// ==========================================================================
// SEARCH & FILTERING CONTROLS
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
    }, 280);
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
    state.activeCategory = catId;

    document.querySelectorAll('.category-pill').forEach(btn => {
        if (btn.getAttribute('data-category') === catId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    loadItems();
}

function applyFilters() {
    state.priceType = document.getElementById('filter-price-type').value;
    state.condition = document.getElementById('filter-condition').value;
    state.sort = document.getElementById('sort-select').value;
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
    document.getElementById('filter-price-type').value = '';
    document.getElementById('filter-condition').value = '';
    document.getElementById('sort-select').value = 'newest';
    document.getElementById('toggle-favorites-btn').classList.remove('active');
    document.getElementById('toggle-my-items-btn').classList.remove('active');

    document.querySelectorAll('.category-pill').forEach(btn => {
        if (btn.getAttribute('data-category') === '') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

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
        if (e.key === 'Escape') {
            const detailModal = document.getElementById('detail-modal');
            const newItemModal = document.getElementById('new-item-modal');
            const drawer = document.getElementById('user-drawer');

            if (detailModal && detailModal.classList.contains('active')) closeDetailModal();
            if (newItemModal && newItemModal.classList.contains('active')) closeNewItemModal();
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
    if (!amount || amount === 0) return 'Zdarma za odvoz';
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
}

function formatCondition(condition) {
    switch (condition) {
        case 'new': return 'Nové / Nerozbalené';
        case 'like_new': return 'Jako nové';
        case 'used': return 'Použité funkční';
        case 'spares': return 'Na náhradní díly';
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
    if (count === 1) return 'položka';
    if (count >= 2 && count <= 4) return 'položky';
    return 'položek';
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}
