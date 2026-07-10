import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

describe("PredictionMarket", function () {
  it("Should create a market and emit MarketCreated", async function () {
    const market = await ethers.deployContract("PredictionMarket");

    const question = "Will BTC hit $150k by Dec 2026?";

    await expect(market.createMarket(question))
      .to.emit(market, "MarketCreated")
      .withArgs(0n, question, await (await ethers.getSigners())[0].getAddress());

    // marketCount should now be 1
    expect(await market.marketCount()).to.equal(1n);

    // Fetch the stored market and verify its fields
    const stored = await market.markets(0);
    expect(stored.question).to.equal(question);
    expect(stored.resolved).to.equal(false);
    expect(stored.yesTotal).to.equal(0n);
    expect(stored.noTotal).to.equal(0n);
  });
});
mapping(uint256 => mapping(address => uint256)) public yesBets;
    mapping(uint256 => mapping(address => uint256)) public noBets;
    /// @notice Place a bet on a market's outcome
    /// @param _marketId The market to bet on
    /// @param _betYes True to bet YES, false to bet NO
    function placeBet(uint256 _marketId, bool _betYes) external payable {
        require(_marketId < marketCount, "Market does not exist");
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