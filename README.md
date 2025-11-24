# Lovely - Decentralized Creator Subscription Platform

Lovely is a decentralized creator-subscription platform fully built using Sui, Walrus, and Seal, along with modern web technologies like Next.js and TypeScript. **A Web 3.0 OnlyFans/Patreon alternative!**

Lovely empowers creators to establish their own channels, set subscription prices (monthly/yearly), and publish exclusive content. Content is stored on Walrus and encrypted with Seal, ensuring privacy and security. Users can subscribe to channels or unlock individual content pieces, gaining decrypted access to premium articles, images, and videos.

## 🌟 Key Features

### For Creators

- **Create Your Channel**: Set up your own branded channel with custom avatar, bio, and pricing
- **Flexible Pricing**: Define monthly and yearly subscription rates
- **Multiple Content Types**:
  - Articles with rich text editing
  - Image galleries
  - Video collections
- **Three Access Models**:
  - **Free**: Public content accessible to everyone
  - **One-time Purchase**: Pay-per-view content with permanent access
  - **Subscription**: Recurring subscription for exclusive content
- **Content Encryption**: Automatic encryption using Seal for subscriber-only content
- **Creator Dashboard**: Manage your content, view followers, and track subscriptions

### For Users

- **Discover Creators**: Browse feeds by latest, popular, or your subscriptions
- **Flexible Subscriptions**: Choose between monthly or yearly plans
- **Follow System**: Follow your favorite creators to stay updated
- **Secure Access**: Encrypted content decryption with blockchain-verified access
- **One-time Purchases**: Buy specific content without subscribing

## 🔒 Content Encryption

Lovely uses **Seal SDK** for threshold encryption with programmable on-chain access control:

- **Subscription Content**: Encrypted with Seal, decrypted via `seal_approve` function verifying active subscription
- **One-time Content**: Encrypted with AES-GCM, decrypted with NFT-based access proof
- **Creator Control**: Creators maintain backup keys for offline content access

## 💰 Fair and Transparent Fees

Unlike centralized platforms that can change their fee structure at will:

**--Low Fee, Forever!--**

Traditional Web 2.0 platforms have repeatedly increased fees on creators:

- Patreon raised fees from 8% to 10% in 2024, with previous changes in 2017
- Substack creators face 30% cuts on Apple IAP subscriptions
- Platforms control pricing and can change terms unilaterally

**Lovely's fees are immutable and built into the smart contract**, ensuring creators never face surprise fee hikes or shifting platform policies. What you see is what you get - forever.

## 🛡️ Censorship Resistance

**--Decentralized by Design--**

- **Anyone Can Host**: Deploy your own frontend and connect to the same smart contracts
- **No Single Point of Control**: No central authority can censor content or ban creators
- **Payment Freedom**: Built on cryptocurrency - no payment processor can deny service
- **Immutable Content**: Stored on Walrus, ensuring permanent availability

While traditional platforms face payment processor censorship (Itch.io disruptions, PayPal blocking Steam), Lovely creators are protected from these risks. No payment processor can censor your content or dictate what you create and sell.

## 🏗️ Technical Stack

### Blockchain & Storage

- **Sui**: High-performance blockchain for smart contracts and transactions
- **Walrus**: Decentralized storage for content (using Quilt encoding)
- **Seal**: Threshold encryption SDK for content protection

### Frontend

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, responsive styling
- **@mysten/dapp-kit**: Sui wallet integration
- **React Query**: Data fetching and state management

### Smart Contract Modules

```
contract/sources/
├── channel.move          # Channel creation and management
├── work.move            # Content publishing (articles, images, videos)
├── subscription.move    # Subscription system
├── access_nft.move      # One-time purchase access control
├── follow.move          # Follow/unfollow system
└── seal_access.move     # Seal encryption access verification
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Sui Wallet (e.g., Sui Wallet browser extension)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/lovely.git
cd lovely
```

2. **Install web dependencies**

```bash
cd web
pnpm install
```

3. **Configure environment variables**

Create a `.env.local` file in the `web` directory:

```bash
# Sui Network
NEXT_PUBLIC_NETWORK=testnet

# Deployed Contract
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_CHANNEL_REGISTRY_ID=0x...
NEXT_PUBLIC_PACKAGE_VERSION_ID=0x...

# Walrus
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_RELAY_URL=https://walrus-testnet-relay.mystenlabs.com

```

4. **Run development server**

```bash
pnpm dev
```

Visit `http://localhost:3000`

### Deploy Smart Contracts

1. **Navigate to contract directory**

```bash
cd contract
```

2. **Build contracts**

```bash
sui move build
```

3. **Deploy to testnet**

```bash
sui client publish --gas-budget 500000000
```

4. **Update environment variables** with deployed package IDs

## 📚 Documentation

- [Sui Documentation](https://docs.sui.io)
- [Walrus SDK](https://sdk.mystenlabs.com/walrus)
- [Seal Documentation](https://seal-docs.wal.app)
- [SuiNS Integration](https://docs.suins.io/developer)

## 🎯 Use Cases

- **Content Creators**: Writers, photographers, videographers
- **Adult Content**: Decentralized OnlyFans alternative
- **Exclusive Communities**: Premium content for subscribers
- **Educational Content**: Courses and tutorials
- **Digital Art**: Exclusive artwork and behind-the-scenes content

## 🔐 Security

- **Smart Contract Audited**: Immutable fee structure and access control
- **End-to-End Encryption**: Seal threshold encryption for subscriber content
- **Non-Custodial**: Users control their wallets and assets
- **Blockchain Verified**: All transactions and access rights on-chain

## 🛣️ Roadmap

- [ ] Multi-language support (i18n)
- [ ] Creator analytics dashboard
- [ ] NFT-gated content
- [ ] Tipping system
- [ ] Content discovery algorithm improvements
- [ ] Mobile app (React Native)
- [ ] Live streaming support
- [ ] Revenue sharing for frontend hosts

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using Sui, Walrus, and Seal
- Inspired by the vision of a decentralized creator economy
- Thanks to the Sui Foundation for supporting Web3 innovation

## 📞 Contact

- Website: [lovely.wal.app](https://lovely.wal.app)

---

**Built for creators, by creators. Own your content. Own your future.** 🚀
