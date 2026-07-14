// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PredictionMarket
/// @notice A simple binary (YES/NO) prediction market
contract PredictionMarket {
    struct Market {
        string question;      // What are we predicting?
        address creator;      // Who created this market
        bool resolved;        // Has this market been settled?
        bool outcome;         // Final result: true = YES won, false = NO won
        uint256 yesTotal;     // Total ETH staked on YES
        uint256 noTotal;      // Total ETH staked on NO
    }

    // marketId => Market data
    mapping(uint256 => Market) public markets;

    // Keeps track of how many markets exist, doubles as the next market ID
    uint256 public marketCount;
    mapping(uint256 => mapping(address => uint256)) public yesBets;
    mapping(uint256 => mapping(address => uint256)) public noBets;

    modifier marketExists(uint256 _marketId) {
        require(_marketId < marketCount, "Market does not exist");
        _;
    }

    // Emitted whenever a new market is created — lets our React frontend
    // "listen" for new markets without constantly polling the blockchain
    event MarketCreated(uint256 indexed marketId, string question, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool betYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimant, uint256 amount);

    constructor() {
        // Nothing to initialize yet — marketCount defaults to 0 automatically
    }
    /// @notice Creates a new prediction market
    /// @param _question The question this market is predicting
    /// @return marketId The ID of the newly created market
    function createMarket(string calldata _question) external returns (uint256) {
        uint256 marketId = marketCount;

        markets[marketId] = Market({
            question: _question,
            creator: msg.sender,
            resolved: false,
            outcome: false,
            yesTotal: 0,
            noTotal: 0
        });

        marketCount++;

        emit MarketCreated(marketId, _question, msg.sender);

        return marketId;
    }
    /// @notice Place a bet on a market's outcome
    /// @param _marketId The market to bet on
    /// @param _betYes True to bet YES, false to bet NO
    function placeBet(uint256 _marketId, bool _betYes) external payable marketExists(_marketId) {
        require(msg.value > 0, "Bet amount must be greater than zero");

        Market storage market = markets[_marketId];
        require(!market.resolved, "Market already resolved");

        if (_betYes) {
            yesBets[_marketId][msg.sender] += msg.value;
            market.yesTotal += msg.value;
        } else {
            noBets[_marketId][msg.sender] += msg.value;
            market.noTotal += msg.value;
        }

        emit BetPlaced(_marketId, msg.sender, _betYes, msg.value);
    }
    /// @notice Resolves a market with the final outcome — only the creator can call this
    /// @param _marketId The market to resolve
    /// @param _outcome True if YES won, false if NO won
    function resolveMarket(uint256 _marketId, bool _outcome) external marketExists(_marketId) {
        Market storage market = markets[_marketId];

        require(msg.sender == market.creator, "Only the creator can resolve this market");
        require(!market.resolved, "Market already resolved");

        market.resolved = true;
        market.outcome = _outcome;

        emit MarketResolved(_marketId, _outcome);
    }
    /// @notice Claims winnings for a resolved market
    /// @param _marketId The market to claim winnings from
    function claimWinnings(uint256 _marketId) external marketExists(_marketId) {
        Market storage market = markets[_marketId];

        // ---- CHECKS ----
        require(market.resolved, "Market not resolved yet");

        uint256 winningStake = market.outcome ? yesBets[_marketId][msg.sender] : noBets[_marketId][msg.sender];
        require(winningStake > 0, "No winnings to claim");

        uint256 winningPool = market.outcome ? market.yesTotal : market.noTotal;
        uint256 losingPool = market.outcome ? market.noTotal : market.yesTotal;

        // ---- EFFECTS ----
        // Zero out the user's stake BEFORE sending ETH — this is what stops reentrancy
        if (market.outcome) {
            yesBets[_marketId][msg.sender] = 0;
        } else {
            noBets[_marketId][msg.sender] = 0;
        }

        uint256 payout = winningStake + (winningStake * losingPool) / winningPool;

        // ---- INTERACTIONS ----
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "ETH transfer failed");

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }
}