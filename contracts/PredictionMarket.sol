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

    // Emitted whenever a new market is created — lets our React frontend
    // "listen" for new markets without constantly polling the blockchain
    event MarketCreated(uint256 indexed marketId, string question, address indexed creator);

    constructor() {
        // Nothing to initialize yet — marketCount defaults to 0 automatically
    }
}