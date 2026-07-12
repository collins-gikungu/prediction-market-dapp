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

describe("placeBet", function () {
    it("Should accept a YES bet and update balances correctly", async function () {
      const market = await ethers.deployContract("PredictionMarket");
      const [owner] = await ethers.getSigners();

      await market.createMarket("Will BTC hit $150k by Dec 2026?");

      const betAmount = ethers.parseEther("0.1"); // 0.1 ETH, in wei

      await expect(market.placeBet(0, true, { value: betAmount }))
        .to.emit(market, "BetPlaced")
        .withArgs(0n, owner.address, true, betAmount);

      // Individual stake tracked correctly
      expect(await market.yesBets(0, owner.address)).to.equal(betAmount);

      // Market total updated
      const stored = await market.markets(0);
      expect(stored.yesTotal).to.equal(betAmount);

      // Contract actually holds the ETH
      const contractAddress = await market.getAddress();
      expect(await ethers.provider.getBalance(contractAddress)).to.equal(betAmount);
    });

    it("Should track two different users betting on opposite sides", async function () {
      const market = await ethers.deployContract("PredictionMarket");
      const [owner, otherUser] = await ethers.getSigners();

      await market.createMarket("Will ETH flip BTC?");

      const yesAmount = ethers.parseEther("0.2");
      const noAmount = ethers.parseEther("0.05");

      await market.connect(owner).placeBet(0, true, { value: yesAmount });
      await market.connect(otherUser).placeBet(0, false, { value: noAmount });

      expect(await market.yesBets(0, owner.address)).to.equal(yesAmount);
      expect(await market.noBets(0, otherUser.address)).to.equal(noAmount);

      const stored = await market.markets(0);
      expect(stored.yesTotal).to.equal(yesAmount);
      expect(stored.noTotal).to.equal(noAmount);
    });

    it("Should revert if bet amount is zero", async function () {
      const market = await ethers.deployContract("PredictionMarket");
      await market.createMarket("Zero bet test");

      await expect(
        market.placeBet(0, true, { value: 0 })
      ).to.be.revertedWith("Bet amount must be greater than zero");
    });

    it("Should revert if market does not exist", async function () {
      const market = await ethers.deployContract("PredictionMarket");

      await expect(
        market.placeBet(999, true, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Market does not exist");
    });
  });