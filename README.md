Pump.Fun Volume Bot

CONFIG Guide (config.json):

"rpc": "Your RPC URL (http or https supported) (must support GPA (ask ur provider if unsure))",
"ws": "Your WSS URL (ws or wss supported) (must support GPA (ask ur provider if unsure))",
"delay": 5000, // leave default
"slippage" Your desired slippage for buying tokens (ex: 0.15 = 15%)
"minBuy": "Minimum buy amount (ex: 0.0001)",
"maxBuy": "Maximum buy amount (ex: 0.1)",
"microBuyAmount": "0.0001",
"computeUnit": "100 (leave default)",
"computeLimit": "100000 (leave default)",
"blockEngineUrl": "JITO BlockEngine Url (List provided below)",
"jitoTipPK": "JITO Tip Private Key (private key to pay tips from)",
"jitoTipAmount": "JITO Tip Amount (ex: 0.01)",
"sender": "PRIVATE KEY for the wallet that will distribute SOL to volume wallets",
"devWallet": "PUBLIC KEY (wallet address) of the deployer wallet to monitor for new launches"
"useJITO": true/false --> is used for human/auto mode to use JITO or regular TXs (JITO acts as mev protection)
--------------------------------------------------------------------------------------------------------------------------------

BlockEngine URLs (pick the closest to your location):
AMSTERDAM: amsterdam.mainnet.block-engine.jito.wtf
FRANKFURT: frankfurt.mainnet.block-engine.jito.wtf
NEW YORK: ny.mainnet.block-engine.jito.wtf
TOKYO: tokyo.mainnet.block-engine.jito.wtf

--------------------------------------------------------------------------------------------------------------------------------

How to run:
1. Install NodeJS (https://nodejs.org)
2. Install the required packages (npm install) inside the terminal
3. Edit the config.json file
4. Run the bot (node main.js)

--------------------------------------------------------------------------------------------------------------------------------

----------------------------------------- 1: Buy Modes -------------------------------------------
1: Gen Volume (JITO): Enter token address (CA) and delay when prompted, this mode will bundle upto 10 wallets buying the token until every wallet has bought once.

2: Auto Volume (JITO):  This mode is unique, it will monitor the dev address from the config, and once it detects a new pump.fun launch it will automatically run the new human mode for generating volume. Human mode works like so:  Buy Buy Sell| Buy Buy Sell| Buy Buy Sell| Buy Buy Sell 
until every wallet has bought & sold, then it will restart until you either close the application or crtl + c quit the application.

3: Human Mode (JITO): Enter token address (CA) and delay when prompted. Human mode works like so:  
Buy Buy Sell| Buy Buy Sell| Buy Buy Sell| Buy Buy Sell 
until every wallet has bought & sold, then it will restart until you either close the application or crtl + c quit the application.

4: MicroBuy (SPAM):  Enter token address (CA) and delay when prompted. This mode will spam buy TX's with a little amount of SOL based on the config value, without JITO indefinitly until u close the application or ctrl + c to quit. 

5: Same TX: Enter token address (CA), buy amount & delay when prompted. This mode will use THE FIRST WALLET inside wallet.txt and spam (non JITO) TX's buying & selling your token in the same TX, hit "x" and enter key to kill the infinite loop and return to main menu at any time

6: Wamrup Mode: This mode will buy & sell recently traded tokens with a random sol amount between your MIN/MAX config values to generate human like activity so scanners or on chain bozos think they're not fresh wallets. 

7: Stagger Mode: This mode will prompt user for token address, delay in MS between each buy, loops (amount of times to repeat) and use jito (Y/N), then it will execute PF buys using our on chain program, delaying each buy with the inputted delay. 

7: Back to Main Menu: Enter X to return to main menu

----------------------------------------- 2: Sell Modes -------------------------------------------
1: Sell All (JITO): This mode will bundle all the wallets and sell 100% of the tokens in each wallet until every wallet has sold.

2: Single Sell: This mode will prompt you to enter the token address (CA) and to enter the (index) of the wallet you want to sell. It will then sell 100% of tokens in that wallet

3: Cleanup Mode: This mode will bundle all the SUB wallets & sell ALL Pump.Fun tokens, essentially cleaning up ur wallets. 

4: Back to Main Menu: Enter X to return to main menu

----------------------------------------- 3: Wallet Modes -------------------------------------------

1: Gen Wallets: Generates wallets based on the amount entered when prompted, stores them in /keypairs folder along with wallets.txt

2: Check Balances: Checks the SOL & SPL Token balance of every wallet

3: Close Token Accounts: Closes SPL Token Accounts of each wallet reclaiming the rent fees

4: Create Profiles: Creates profiles on Pump.Fun (Username + Bio)

5: Back to Main Menu: Returns to main menu

----------------------------------------- 4: Transfer Modes -------------------------------------------

1: This mode will transfer SOL from ur main wallet (Sender from config file) to EVERY sub wallet you have in wallets.txt/keyapirs directory

2: This mode will send SOL from every VOLUME/SUB wallet back to the desired MAIN wallet address (NOTE 0.0009 SOL)  will remain in every wallet you will need to manually send this back if u want it

3: This mode will send 100% of the token balance in the VOLUME/SUB wallets to the wallet address you provided when running!

4: Quit:  Quits the application

--------------------------------------------------------------------------------------------------------------------------------