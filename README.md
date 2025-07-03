# AdIntel DAO - Decentralized Ad Intelligence Network

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: MVP](https://img.shields.io/badge/Status-MVP-blue.svg)]()
[![Vana Academy: Week 4](https://img.shields.io/badge/Vana%20Academy-Week%204-purple.svg)]()

## 🚀 Overview

AdIntel DAO transforms everyday browsing into collective market intelligence by rewarding users for contributing public advertising data through a Chrome extension. We provide small businesses with affordable competitive insights at 80% less cost than traditional tools while ensuring complete user privacy and legal compliance.

## 🎯 Key Features

- **Chrome Extension**: Passive ad detection while browsing
- **Privacy-First**: No personal data collection
- **Token Rewards**: Earn points for contributing ad data
- **Affordable Analytics**: $29/month vs $150+ for competitors
- **Legal Compliance**: Only public data, fully compliant

## 📂 Project Structure

```
ad-data-dao/
├── src/                    # Source code
│   ├── extension/         # Chrome extension files
│   ├── backend/           # Backend API (planned)
│   └── shared/            # Shared utilities
├── docs/                  # Documentation
│   ├── planning/          # Strategic planning docs
│   ├── legal/             # Legal analysis
│   └── guides/            # User guides
├── plans/                 # Business verticals
│   ├── small-advertisers/ # SMB focus
│   ├── market-research/   # Research companies
│   └── ai-companies/      # AI training data
└── scripts/               # Utility scripts
```

## 🛠️ Quick Start

### Chrome Extension (MVP)

1. Clone the repository:
   ```bash
   git clone https://github.com/Judytimer/adintel-dao.git
   cd adintel-dao
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `src/extension` folder

3. Start browsing - the extension will automatically detect ads!

### Backend Development (Coming Soon)

```bash
# Install dependencies
cd src/backend
pip install -r requirements.txt

# Run the API server
python main.py
```

## 💡 How It Works

1. **Users Install Extension**: One-click Chrome extension installation
2. **Browse Normally**: Extension detects ads automatically during regular browsing
3. **Earn Points**: 10 points per unique ad detected
4. **Access Insights**: Search competitor ads and get market intelligence

## 📊 Technical Architecture

```
User Browser          Backend            Blockchain
    |                   |                    |
Extension -----> API Server -----> Vana Network
    |                   |                    |
Ad Detector       Data Process         Token Rewards
    |                   |                    |
Storage           PostgreSQL          Smart Contract
```

## 🎯 Target Market

- **Primary**: Small businesses spending $500-5000/month on ads
- **Size**: 30M+ SMBs globally
- **Pain Point**: Can't afford $150+/month spy tools
- **Solution**: Affordable crowdsourced intelligence at $29/month

## 🚦 Roadmap

### Phase 1: MVP ✅ (Current)
- [x] Chrome extension ad detection
- [x] Local storage and points system
- [x] Privacy-compliant data extraction
- [x] Basic UI/UX

### Phase 2: Beta (Q3 2025)
- [ ] Backend API development
- [ ] Search & analytics dashboard
- [ ] Payment integration
- [ ] 1,000 active users

### Phase 3: Launch (Q4 2025)
- [ ] Vana blockchain integration
- [ ] Token economics implementation
- [ ] B2B platform features
- [ ] 10,000+ users

### Phase 4: Scale (2026)
- [ ] Mobile app
- [ ] AI-powered insights
- [ ] Global expansion
- [ ] 100,000+ users

## 📋 Legal Compliance

We take legal compliance seriously:

- ✅ Only collect publicly displayed ads
- ✅ No personal user data collection
- ✅ User consent via extension installation
- ✅ Respect platform terms of service
- ✅ DMCA compliance ready

See [Legal Analysis](docs/legal/legal_analysis_mvp.md) for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

Areas we need help:
- Chrome extension improvements
- Backend development
- UI/UX design
- Legal compliance review
- Community building

## 📞 Contact

- **Project Lead**: Judy Timer
- **Email**: yj821973181@gmail.com
- **Discord**: @JudyTimer
- **Telegram**: @judytimerremote

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Vana Academy for guidance and support
- Reddit community for market validation
- Early beta testers for feedback

---

**Note**: This project was submitted for Vana Academy Week 4. We're actively seeking collaborators and advisors to help scale this vision!

🌟 Star this repo if you believe in democratizing market intelligence!