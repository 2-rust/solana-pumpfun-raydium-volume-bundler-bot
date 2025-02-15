# 🤖 Pump.Fun Volume Bot

## Overview

The **Pump.Fun, Raydium Volume & Bunder Bot** is a powerful tool designed to automate trading activities on the Pump.Fun & Raydium platform. With a suite of customizable modes for buying, selling, and wallet management, this bot provides a fully automated solution for generating volume, bundling, executing trades, and managing wallets for the purpose of optimizing token activities.

Built using **Node.js**, the bot supports advanced functionality such as interacting with **JITO** for MEV (Maximum Extractable Value) protection and enables quick and efficient token purchases and sales across multiple wallets.

## Features

- **Multiple Buying Modes**: Includes modes for generating volume, monitoring new launches, and spamming buy transactions.
- **Selling Modes**: Includes bulk sell, single wallet sell, and cleanup modes to manage your token holdings effectively.
- **Wallet Management**: Create and manage wallets, check balances, and close token accounts.
- **Transfer Modes**: Efficiently transfer SOL between wallets and consolidate token balances.
- **JITO Integration**: Optional use of JITO for MEV protection and bundle transactions for added efficiency.
- **Custom Configurations**: Adjustable settings for delays, slippage, buy/sell amounts, and more.

## Prerequisites

To run the **Pump.Fun Volume Bot**, ensure you have the following:

- **Node.js**: [Download Node.js](https://nodejs.org)
- **npm**: The Node.js package manager, which comes pre-installed with Node.js.
- **RPC & WSS URLs**: Required to connect to the blockchain.
- **Solana Wallet**: Private keys for wallet management and token transfers.
- **JITO Access** (Optional): If you plan to use JITO features, make sure you have access to the JITO BlockEngine.

## Installation

### Step 1: Install Node.js

Ensure that **Node.js** is installed on your system. If not, download and install it from the official website:

- [Download Node.js](https://nodejs.org)

### Step 2: Clone the repository

Clone this repository to your local machine:

```bash
git clone https://github.com/yourusername/pump-fun-volume-bot.git
cd pump-fun-volume-bot
## Configuration

The bot is highly configurable, allowing you to modify various settings in the `config.json` file. Below is a detailed guide for configuring the bot to suit your needs.

### `config.json`

The configuration file contains key parameters that define the bot's behavior. Here is a breakdown of each parameter:

```json
{
  "rpc": "Your RPC URL (http or https supported)",  // URL for RPC connection
  "ws": "Your WSS URL (ws or wss supported)",  // URL for WebSocket connection
  "delay": 5000,  // Delay in milliseconds between actions, leave default (5000)
  "slippage": 0.15,  // Desired slippage for buying tokens (e.g., 0.15 means 15%)
  "minBuy": 0.0001,  // Minimum buy amount for tokens
  "maxBuy": 0.1,  // Maximum buy amount for tokens
  "microBuyAmount": 0.0001,  // The small amount of SOL to use in MicroBuy mode
  "computeUnit": 100,  // Default compute unit (keep as is unless otherwise specified)
  "computeLimit": 100000,  // Default compute limit for transaction calculations
  "blockEngineUrl": "JITO BlockEngine URL",  // Choose the closest BlockEngine URL (see below)
  "jitoTipPK": "JITO Tip Private Key",  // Private key for JITO tips
  "jitoTipAmount": 0.01,  // Amount of SOL to tip JITO
  "sender": "PRIVATE KEY",  // Sender private key (wallet that distributes SOL to volume wallets)
  "devWallet": "PUBLIC KEY",  // Public key of the deployer wallet to monitor for new launches
  "useJITO": true  // Set to 'true' to use JITO for MEV protection
}
```
---
## Available Modes
### 1. Buy Modes
Gen Volume (JITO): Enter the token address (CA) and delay to generate volume using multiple wallets. The bot will bundle up to 10 wallets for buying the token until each wallet has made a purchase.

Auto Volume (JITO): Monitors the dev address (configured in the config) and automatically executes the Human Mode when a new launch is detected. This mode performs the Buy Buy Sell cycle until all wallets have completed their actions.

Human Mode (JITO): Similar to Auto Volume, but manually initiated. The bot will perform a Buy Buy Sell cycle until all wallets have bought and sold the token.

MicroBuy (SPAM): This mode continuously executes small buy transactions based on the configured amount of SOL (default: 0.0001) without using JITO protection, running indefinitely until manually stopped.

Same TX: Executes a single buy and sell transaction using the first wallet in the wallet.txt. This mode loops indefinitely until stopped.

Warmup Mode: Randomly buys and sells recently traded tokens to simulate human-like activity and avoid detection by on-chain scanners.

Stagger Mode: Executes a staggered buy cycle with a user-defined delay, looping a set number of times. Users can choose whether to use JITO in this mode.

Back to Main Menu: Return to the main menu by pressing X.

### 2. Sell Modes
Sell All (JITO): Bundles all wallets and sells 100% of the tokens in each wallet until all wallets have been sold.

Single Sell: Prompts for a token address (CA) and a wallet index. The bot will sell 100% of the tokens in the selected wallet.

Cleanup Mode: Sells all Pump.Fun tokens in all wallets, cleaning up the token balances across the wallets.

Back to Main Menu: Return to the main menu by pressing X.

### 3. Wallet Modes
Gen Wallets: Generates a specified number of wallets, storing them in the /keypairs folder along with the wallets.txt file.

Check Balances: Checks the SOL and SPL token balances of all wallets.

Close Token Accounts: Closes SPL Token Accounts for each wallet, reclaiming rent fees.

Create Profiles: Creates profiles on Pump.Fun (Username + Bio).

Back to Main Menu: Return to the main menu by pressing X.

### 4. Transfer Modes
Transfer SOL to Sub Wallets: Transfers SOL from the main wallet (sender address in the config) to all sub-wallets.

Transfer SOL from Sub Wallets: Sends SOL from all sub-wallets back to the main wallet, leaving 0.0009 SOL in each sub-wallet.

Transfer Tokens: Transfers all tokens from the sub-wallets to the wallet address specified during execution.

Quit: Quits the application.
---
### Connect

Telegram: [T-rustdev](https://t.me/T_rustdev)
