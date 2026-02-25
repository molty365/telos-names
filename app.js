// App State
let state = {
    session: null,
    connected: false,
    account: null,
    activeBids: [],
    myBids: [],
    currentBidData: null
};

// Constants
const TELOS_RPC = 'https://mainnet.telos.net/v1';
const BACKUP_RPC = 'https://rpc.telos.net/v1';
const EOSIO_CONTRACT = 'eosio';

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    await loadActiveBids();
    setInterval(updateTimers, 1000);
    setInterval(refreshActiveBids, 30000); // Refresh every 30 seconds
});

// UI Initialization
function initializeUI() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Wallet connection
    document.getElementById('connectWallet').addEventListener('click', connectWallet);

    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', searchName);
    document.getElementById('nameSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchName();
    });

    // Bid history search
    document.getElementById('historySearchBtn').addEventListener('click', searchBidHistory);
    document.getElementById('historySearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBidHistory();
    });

    // Refresh bids
    document.getElementById('refreshBids').addEventListener('click', refreshActiveBids);

    // Modal controls
    document.querySelector('.modal-close').addEventListener('click', closeBidModal);
    document.getElementById('overlay').addEventListener('click', closeBidModal);
    document.getElementById('submitBid').addEventListener('click', submitBid);

    // Modal bid amount input
    document.getElementById('bidAmount').addEventListener('input', validateBidAmount);
}

// Wallet Connection (Anchor Link)
let anchorLink = null;

function initAnchorLink() {
    const transport = new AnchorLinkBrowserTransport();
    anchorLink = new AnchorLink({
        transport,
        chains: [{
            chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11',
            nodeUrl: TELOS_RPC
        }]
    });
}

async function connectWallet() {
    try {
        showStatus('Connecting to wallet...', 'info');
        
        if (!anchorLink) initAnchorLink();
        
        const identity = await anchorLink.login('telosnames');
        
        state.session = identity.session;
        state.connected = true;
        state.account = String(identity.session.auth.actor);
        
        updateWalletUI();
        await loadMyBids();
        showStatus('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Wallet connection failed:', error);
        if (error.message && error.message.includes('cancel')) {
            showStatus('Wallet connection cancelled', 'info');
        } else {
            showStatus('Failed to connect wallet. Please try again.', 'error');
        }
    }
}

async function disconnectWallet() {
    if (anchorLink && state.session) {
        await anchorLink.removeSession('telosnames', state.session.auth);
    }
    
    state.session = null;
    state.connected = false;
    state.account = null;
    state.myBids = [];
    
    updateWalletUI();
    renderMyBids();
    showStatus('Wallet disconnected', 'info');
}

function updateWalletUI() {
    const connectBtn = document.getElementById('connectWallet');
    const walletText = document.getElementById('walletText');
    
    if (state.connected && state.account) {
        walletText.textContent = `${state.account}`;
        connectBtn.onclick = disconnectWallet;
        connectBtn.classList.add('connected');
    } else {
        walletText.textContent = 'Connect Wallet';
        connectBtn.onclick = connectWallet;
        connectBtn.classList.remove('connected');
    }
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content sections
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    // Load data if needed
    if (tabName === 'mybids' && state.connected) {
        loadMyBids();
    }
}

// Data Fetching
async function fetchFromRPC(endpoint, body) {
    const rpcs = [TELOS_RPC, BACKUP_RPC];
    
    for (const rpc of rpcs) {
        try {
            const response = await fetch(`${rpc}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) continue;
            return await response.json();
        } catch (error) {
            console.warn(`RPC ${rpc} failed:`, error);
        }
    }
    
    throw new Error('All RPC endpoints failed');
}

async function loadActiveBids() {
    try {
        let allRows = [];
        let more = true;
        let lowerBound = '';
        
        while (more) {
            const result = await fetchFromRPC('chain/get_table_rows', {
                json: true,
                code: EOSIO_CONTRACT,
                scope: EOSIO_CONTRACT,
                table: 'namebids',
                limit: 500,
                lower_bound: lowerBound
            });
            
            const rows = result.rows || [];
            if (rows.length === 0) break;
            
            // Avoid duplicates when paginating
            if (lowerBound && rows.length > 0 && rows[0].newname === lowerBound) {
                rows.shift();
            }
            
            allRows = allRows.concat(rows);
            more = result.more;
            if (rows.length > 0) {
                lowerBound = rows[rows.length - 1].newname;
            }
        }

        state.activeBids = allRows;
        renderActiveBids();
    } catch (error) {
        console.error('Failed to load active bids:', error);
        showStatus('Failed to load bids. Please try again.', 'error');
        renderError('activeBids', 'Failed to load active bids');
    }
}

async function loadMyBids() {
    if (!state.connected) return;
    
    try {
        // Filter active bids for current user
        state.myBids = state.activeBids.filter(bid => 
            bid.high_bidder === state.account
        );
        renderMyBids();
    } catch (error) {
        console.error('Failed to load my bids:', error);
        renderError('myBidsList', 'Failed to load your bids');
    }
}

async function refreshActiveBids() {
    document.getElementById('refreshBids').disabled = true;
    await loadActiveBids();
    if (state.connected) {
        await loadMyBids();
    }
    document.getElementById('refreshBids').disabled = false;
}

// Name Search
async function searchName() {
    const nameInput = document.getElementById('nameSearch');
    const name = nameInput.value.trim().toLowerCase();
    const resultDiv = document.getElementById('searchResult');
    
    if (!name || name.length > 11) {
        showStatus('Name must be 1-11 characters', 'error');
        return;
    }

    try {
        resultDiv.innerHTML = '<div class="loading">Searching...</div>';
        resultDiv.classList.add('show');

        // Check if account exists
        let accountExists = false;
        try {
            await fetchFromRPC('chain/get_account', { account_name: name });
            accountExists = true;
        } catch {
            // Account doesn't exist
        }

        // Check if there's an active bid
        const bidData = state.activeBids.find(bid => bid.newname === name);

        let resultHTML = '';
        
        if (accountExists) {
            resultHTML = `
                <div class="text-warning">
                    <strong>${name}</strong> - Account already exists
                </div>
            `;
        } else if (bidData) {
            const timeLeft = getTimeRemaining(bidData.last_bid_time);
            resultHTML = `
                <div class="bid-card">
                    <div class="bid-name">${bidData.newname}</div>
                    <div class="bid-amount">Current bid: ${formatBidAmount(bidData.high_bid)}</div>
                    <div class="bid-time">Time left: ${timeLeft}</div>
                    <div class="bid-actions">
                        <button class="btn btn-primary" onclick="openBidModal('${bidData.newname}')">
                            Place Bid
                        </button>
                    </div>
                </div>
            `;
        } else {
            resultHTML = `
                <div class="text-success">
                    <strong>${name}</strong> - Available for bidding!
                    <button class="btn btn-primary" onclick="openBidModal('${name}')" style="margin-left: 1rem;">
                        Start Bidding
                    </button>
                </div>
            `;
        }

        resultDiv.innerHTML = resultHTML;
    } catch (error) {
        console.error('Search failed:', error);
        resultDiv.innerHTML = '<div class="text-error">Search failed. Please try again.</div>';
    }
}

// Bid History
async function searchBidHistory() {
    const nameInput = document.getElementById('historySearch');
    const name = nameInput.value.trim().toLowerCase();
    const historyDiv = document.getElementById('bidHistory');
    
    if (!name) {
        showStatus('Please enter a name', 'error');
        return;
    }

    try {
        historyDiv.innerHTML = '<div class="loading">Loading bid history...</div>';

        // For now, show current bid data if available
        // In a full implementation, you'd query historical data
        const currentBid = state.activeBids.find(bid => bid.newname === name);
        
        let historyHTML = '';
        
        if (currentBid) {
            historyHTML = `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-name">${currentBid.newname}</span>
                        <span>${formatBidAmount(currentBid.high_bid)}</span>
                    </div>
                    <div class="history-details">
                        Bidder: ${currentBid.high_bidder}<br>
                        Last bid: ${new Date(currentBid.last_bid_time + 'Z').toLocaleString()}
                    </div>
                </div>
            `;
        } else {
            historyHTML = '<div class="empty-state">No bid history found for this name</div>';
        }

        historyDiv.innerHTML = historyHTML;
    } catch (error) {
        console.error('History search failed:', error);
        historyDiv.innerHTML = '<div class="text-error">Failed to load bid history</div>';
    }
}

// Bidding
function openBidModal(name) {
    if (!state.connected) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const modal = document.getElementById('bidModal');
    const overlay = document.getElementById('overlay');
    const nameDisplay = document.getElementById('modalNameDisplay');
    
    nameDisplay.textContent = name;
    
    // Find current bid data
    const bidData = state.activeBids.find(bid => bid.newname === name);
    state.currentBidData = bidData;
    
    updateBidModalInfo(bidData);
    
    modal.classList.add('show');
    overlay.classList.add('show');
    
    // Focus bid input
    document.getElementById('bidAmount').focus();
}

function updateBidModalInfo(bidData) {
    const currentBidEl = document.getElementById('currentBid');
    const minimumBidEl = document.getElementById('minimumBid');
    const timeRemainingEl = document.getElementById('timeRemaining');
    const bidAmountInput = document.getElementById('bidAmount');
    
    if (bidData) {
        const currentBid = Math.abs(bidData.high_bid) / 10000;
        const minimumBid = Math.ceil(currentBid * 1.1 * 10000) / 10000; // 10% higher, rounded
        
        currentBidEl.textContent = formatBidAmount(bidData.high_bid);
        minimumBidEl.textContent = `${minimumBid.toFixed(4)} TLOS`;
        timeRemainingEl.textContent = getTimeRemaining(bidData.last_bid_time);
        
        bidAmountInput.min = minimumBid;
        bidAmountInput.value = minimumBid.toFixed(4);
    } else {
        // New bid
        currentBidEl.textContent = 'None';
        minimumBidEl.textContent = '10.0000 TLOS';
        timeRemainingEl.textContent = '24 hours (after first bid)';
        
        bidAmountInput.min = 10;
        bidAmountInput.value = '10.0000';
    }
}

function validateBidAmount() {
    const input = document.getElementById('bidAmount');
    const submitBtn = document.getElementById('submitBid');
    const value = parseFloat(input.value);
    const minValue = parseFloat(input.min);
    
    if (value >= minValue) {
        submitBtn.disabled = false;
        input.style.borderColor = '';
    } else {
        submitBtn.disabled = true;
        input.style.borderColor = 'var(--error)';
    }
}

async function submitBid() {
    if (!state.session) {
        showStatus('Wallet not connected', 'error');
        return;
    }

    const nameDisplay = document.getElementById('modalNameDisplay');
    const bidAmountInput = document.getElementById('bidAmount');
    const submitBtn = document.getElementById('submitBid');
    
    const name = nameDisplay.textContent;
    const amount = parseFloat(bidAmountInput.value);
    
    if (!amount || amount < parseFloat(bidAmountInput.min)) {
        showStatus('Invalid bid amount', 'error');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Placing Bid...';
        
        const actions = [{
            account: EOSIO_CONTRACT,
            name: 'bidname',
            authorization: [{
                actor: state.account,
                permission: 'active'
            }],
            data: {
                bidder: state.account,
                newname: name,
                bid: `${amount.toFixed(4)} TLOS`
            }
        }];

        const result = await state.session.transact({ actions }, { broadcast: true });
        
        showStatus('Bid placed successfully!', 'success');
        closeBidModal();
        
        // Refresh data after short delay
        setTimeout(() => {
            refreshActiveBids();
        }, 2000);
        
    } catch (error) {
        console.error('Bid failed:', error);
        showStatus(error.message || 'Failed to place bid', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Bid';
    }
}

function closeBidModal() {
    const modal = document.getElementById('bidModal');
    const overlay = document.getElementById('overlay');
    
    modal.classList.remove('show');
    overlay.classList.remove('show');
    
    state.currentBidData = null;
    
    // Reset form
    document.getElementById('bidAmount').value = '';
    document.getElementById('submitBid').disabled = false;
}

// Rendering Functions
function formatBidAmount(highBid) {
    // high_bid is an integer in units of 0.0001 TLOS
    // Negative means auction was claimed/ended
    const raw = typeof highBid === 'number' ? highBid : parseInt(highBid);
    const amount = Math.abs(raw) / 10000;
    return `${amount.toFixed(4)} TLOS`;
}

function isBidClaimed(highBid) {
    const raw = typeof highBid === 'number' ? highBid : parseInt(highBid);
    return raw < 0;
}

function renderActiveBids() {
    const container = document.getElementById('activeBids');
    
    if (!state.activeBids.length) {
        container.innerHTML = '<div class="empty-state">No active bids found</div>';
        return;
    }

    // Sort: active auctions first, then by bid amount descending
    const sorted = [...state.activeBids].sort((a, b) => {
        const aClaimed = isBidClaimed(a.high_bid);
        const bClaimed = isBidClaimed(b.high_bid);
        if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;
        return Math.abs(b.high_bid) - Math.abs(a.high_bid);
    });

    const html = sorted.map(bid => {
        const timeLeft = getTimeRemaining(bid.last_bid_time);
        const claimed = isBidClaimed(bid.high_bid);
        const isMyBid = state.connected && bid.high_bidder === state.account;
        const statusClass = claimed ? 'claimed' : '';
        
        return `
            <div class="bid-card ${isMyBid ? 'my-bid' : ''} ${statusClass}">
                <div class="bid-name">${bid.newname}</div>
                <div class="bid-amount">${formatBidAmount(bid.high_bid)}</div>
                <div class="bid-time">${claimed ? 'Claimed' : `Time left: ${timeLeft}`}</div>
                <div class="bid-time text-muted">Bidder: ${bid.high_bidder || 'unknown'}</div>
                <div class="bid-actions">
                    ${state.connected && !claimed ? `
                        <button class="btn btn-primary" onclick="openBidModal('${bid.newname}')">
                            ${isMyBid ? 'Increase Bid' : 'Place Bid'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function renderMyBids() {
    const container = document.getElementById('myBidsList');
    
    if (!state.connected) {
        container.innerHTML = '<div class="empty-state">Connect your wallet to see your bids</div>';
        return;
    }
    
    if (!state.myBids.length) {
        container.innerHTML = '<div class="empty-state">You have no active bids</div>';
        return;
    }

    const html = state.myBids.map(bid => {
        const timeLeft = getTimeRemaining(bid.last_bid_time);
        const isWinning = timeLeft === 'Auction ended';
        
        return `
            <div class="bid-card my-bid">
                <div class="bid-name">${bid.newname}</div>
                <div class="bid-amount">${formatBidAmount(bid.high_bid)}</div>
                <div class="bid-time ${isWinning ? 'text-success' : ''}">
                    ${isWinning ? 'Won!' : `Time left: ${timeLeft}`}
                </div>
                <div class="bid-actions">
                    ${!isWinning ? `
                        <button class="btn btn-primary" onclick="openBidModal('${bid.newname}')">
                            Increase Bid
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function renderError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="error-state">${message}</div>`;
}

// Utility Functions
function formatTLOS(amount) {
    if (typeof amount === 'string') return amount;
    return `${amount.toFixed(4)} TLOS`;
}

function getTimeRemaining(lastBidTime) {
    const bidTime = new Date(lastBidTime + 'Z');
    const endTime = new Date(bidTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const now = new Date();
    const remaining = endTime.getTime() - now.getTime();
    
    if (remaining <= 0) {
        return 'Auction ended';
    }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

function updateTimers() {
    // Update time remaining displays
    document.querySelectorAll('.bid-time').forEach(el => {
        if (el.textContent.includes('Time left:')) {
            const bidCard = el.closest('.bid-card');
            const nameEl = bidCard.querySelector('.bid-name');
            if (nameEl) {
                const name = nameEl.textContent;
                const bidData = state.activeBids.find(bid => bid.newname === name);
                if (bidData) {
                    const timeLeft = getTimeRemaining(bidData.last_bid_time);
                    el.textContent = `Time left: ${timeLeft}`;
                    
                    if (timeLeft === 'Auction ended') {
                        el.classList.add('text-warning');
                    }
                }
            }
        }
    });

    // Update modal if open
    if (state.currentBidData) {
        const timeRemainingEl = document.getElementById('timeRemaining');
        if (timeRemainingEl) {
            timeRemainingEl.textContent = getTimeRemaining(state.currentBidData.last_bid_time);
        }
    }
}

function showStatus(message, type = 'info') {
    const container = document.getElementById('statusContainer');
    const statusEl = document.createElement('div');
    statusEl.className = `status-message status-${type}`;
    statusEl.textContent = message;
    
    container.appendChild(statusEl);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (statusEl.parentNode) {
            statusEl.parentNode.removeChild(statusEl);
        }
    }, 5000);
    
    // Make it clickable to dismiss
    statusEl.addEventListener('click', () => {
        if (statusEl.parentNode) {
            statusEl.parentNode.removeChild(statusEl);
        }
    });
}

// Add CSS for my-bid styling
const style = document.createElement('style');
style.textContent = `
.my-bid {
    border-color: var(--telos-cyan) !important;
    background: linear-gradient(135deg, var(--bg-secondary), rgba(0, 242, 254, 0.05)) !important;
}

.connected {
    background: var(--gradient-secondary) !important;
}
`;
document.head.appendChild(style);