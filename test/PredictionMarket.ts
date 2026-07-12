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
