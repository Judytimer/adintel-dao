# Vana Academy Week 4 Submission

**Project**: AdIntel DAO – Decentralized Ad Intelligence Network  
**Date**: June 29, 2025  
**Team Lead**: Shuang Jin

---

## 1. Project Title

**AdIntel DAO – Decentralized Ad Intelligence Network**

## 2. One-Liner Description

AdIntel DAO transforms everyday browsing into collective market intelligence by rewarding users for contributing public advertising data through a Chrome extension, providing small businesses with affordable competitive insights at 80% less cost than traditional tools.

## 3. Team Information

**Team Lead**: Shuang Jin  
**Role**: Full-stack Developer & Project Lead  
**Discord**: @shuangjin  
**GitHub**: github.com/shuangjin  
**Experience**: 5+ years web development, Chrome extensions (50k+ users)

Currently seeking co-founders in blockchain development and B2B marketing.

## 4. Problem Statement

### Primary Problem
Small businesses spend $200-5000/month on ads but lack competitor insights. Current spy tools cost $150-300/month - more than many SMBs' entire ad budgets.

### Key Pain Points (Reddit Research Validated)
- "I spend 2 hours daily checking competitor ads manually"
- "Facebook ads cost 3x more but I don't know if it's industry-wide"
- "Need inspiration but can't afford AdSpy"

### Market Opportunity
- 30M+ SMBs globally buying digital ads
- 25-30% of ad budget wasted on poor strategies
- $150B annual SMB digital advertising market

## 5. Dataset Description

### What We Collect
- **Public ad metadata**: Headlines, text, landing URLs
- **Platform data**: Facebook, Google, LinkedIn ads
- **NO personal data**: Zero user tracking

### Contributors & Growth
- **Target**: 10,000 Chrome extension users
- **Incentive**: Earn $5-20/month + free competitor insights
- **Initial data**: 10,000 ads (Month 1) → 100,000/month (Month 6)

## 6. Solution & Approach

### How It Works
1. **Users**: Install extension → Browse normally → Earn points
2. **Businesses**: Search competitors → View all ads → Optimize campaigns

### Key Innovations
- **Privacy-first**: No personal data collection
- **Passive earning**: No active work required
- **Instant value**: Search ads immediately
- **Legal compliance**: Only public data

## 7. MVP/Prototype Status

### ✅ Completed Chrome Extension MVP

**GitHub**: [github.com/shuangjin/adintel-dao](https://github.com/shuangjin/adintel-dao)

**Implemented Features**:
- Ad detection (Facebook, Google)
- Privacy-compliant extraction
- Points/rewards system  
- User dashboard UI
- Rate limiting (5 ads/minute)

**Technical Highlights**:
```javascript
// Privacy-first design
removePersonalData(metadata) {
  ['user_id', 'profile', 'cookies'].forEach(field => {
    delete metadata[field];
  });
}
```

## 8. Support Requirements

### Technical Needs
1. Vana smart contract best practices
2. Scaling to 1M+ daily submissions
3. Token economics guidance

### Business Needs
1. Legal templates for data DAOs
2. B2B SaaS go-to-market strategy
3. Community building tactics

## 9. Token Launch Experience

No prior experience. Seeking mentorship on:
- Token distribution models
- Regulatory compliance
- Community allocation strategies

---

## Appendices

### A. Market Validation
- Reddit research: 8 discussions analyzed
- Validated pain points: Cost (50%), Competitor monitoring (37.5%)
- Price point: $30-50/month acceptable

### B. Competition Analysis
| Competitor | Price | Our Advantage |
|------------|-------|---------------|
| AdSpy | $149/mo | 80% cheaper |
| BigSpy | $99/mo | User rewards |
| FB Ad Library | Free | Better UX + insights |

### C. Roadmap
- **Q3 2025**: 1,000 users, 50k ads
- **Q4 2025**: Vana integration, B2B launch
- **Q1 2026**: Token launch, 10k users

### D. Legal Compliance
- Public data only ✓
- No personal information ✓
- Rate limiting implemented ✓
- Compliance score: 85/100

---

**Contact**: shuang@adintel-dao.com | Discord: @shuangjin#1234

*Submitted for Vana Academy Week 4*