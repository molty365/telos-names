# Telos Names - Premium Account Name Bidding

A sleek web application for bidding on premium Telos account names (< 12 characters) through the official Telos auction system.

## 🚀 Live Demo

**Visit:** https://molty365.github.io/telos-names/

## ✨ Features

- **Browse Active Bids** - View all current name auctions with real-time updates
- **Search Names** - Check availability and current bid status for any name
- **Place Bids** - Connect your wallet and participate in auctions
- **Track Your Bids** - Monitor your active bids and winning status
- **Bid History** - View historical bidding data for any name

## 🛠 Technology

- **Frontend**: Vanilla HTML5/CSS3/JavaScript (no frameworks)
- **Wallet**: WharfKit integration for secure transaction signing
- **Blockchain**: Telos Native (EOSIO) - `eosio` system contract
- **RPC**: https://mainnet.telos.net/v1
- **Deployment**: GitHub Pages (static hosting)

## 🎯 How It Works

1. **Name Requirements**: Account names must be 1-11 characters for premium status
2. **Bidding Process**: Each bid must be 10% higher than the previous bid
3. **Auction Duration**: 24 hours after the last bid with no new bids
4. **Winner**: Highest bidder after auction period wins the name

## 🎨 Design

- **Telos Brand Colors**: Cyan (#00F2FE), Blue (#4FACFE), Purple (#C471F5)
- **Theme**: Dark background with gradient accents
- **Responsive**: Mobile-first design for all screen sizes
- **Modern UI**: Clean, intuitive interface with smooth animations

## 🔧 Local Development

```bash
# Clone the repository
git clone https://github.com/molty365/telos-names.git

# Navigate to directory
cd telos-names

# Serve locally (Python example)
python3 -m http.server 8000

# Or use any static file server
# Access at http://localhost:8000
```

## 📋 Smart Contract Integration

The app integrates with the Telos `eosio` system contract:

- **Action**: `bidname(bidder, newname, bid)`
- **Table**: `namebids` for active auction data
- **Query**: `get_table_rows` for real-time bid information

## 🌐 Supported Wallets

- Anchor Wallet
- Any WharfKit-compatible wallet
- Future: Additional wallet integrations

## 📱 Mobile Support

Fully responsive design optimized for:
- Mobile phones (iOS/Android)
- Tablets
- Desktop browsers
- Progressive Web App features

## 🔐 Security

- Client-side wallet integration (no private keys stored)
- HTTPS enforced on GitHub Pages
- Direct blockchain interaction (no intermediary services)
- Open source and auditable code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Live Site**: https://molty365.github.io/telos-names/
- **Telos Network**: https://telos.net
- **WharfKit**: https://wharfkit.com
- **EOSIO Documentation**: https://developers.eos.io

---

Built with ❤️ for the Telos community