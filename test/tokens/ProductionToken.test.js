const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductionToken", function () {
  let ProductionToken;
  let token;
  let owner, treasury, user1, user2, newTreasury;

  const NAME = "ChainArb Utility Token";
  const SYMBOL = "CARB";
  const INITIAL_SUPPLY = ethers.parseEther("400000000"); // 400M
  const MAX_SUPPLY = ethers.parseEther("1000000000");    // 1B

  beforeEach(async function () {
    [owner, treasury, user1, user2, newTreasury] = await ethers.getSigners();

    ProductionToken = await ethers.getContractFactory("ProductionToken");
    token = await ProductionToken.deploy(NAME, SYMBOL, owner.address, treasury.address);
    await token.waitForDeployment();
  });

  describe("Deployment & Initialization", function () {
    it("should set the correct name, symbol, and decimals", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
      expect(await token.decimals()).to.equal(18);
    });

    it("should mint INITIAL_SUPPLY to the owner", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("should set the correct treasury address", async function () {
      expect(await token.treasury()).to.equal(treasury.address);
    });

    it("should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("should revert deployment if owner is address(0)", async function () {
      await expect(
        ProductionToken.deploy(NAME, SYMBOL, ethers.ZeroAddress, treasury.address)
      ).to.be.revertedWithCustomError(token, "OwnableInvalidOwner");
    });

    it("should revert deployment if treasury is address(0)", async function () {
      await expect(
        ProductionToken.deploy(NAME, SYMBOL, owner.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });
  });

  describe("Minting & Supply Cap", function () {
    it("should allow owner to mint tokens within MAX_SUPPLY", async function () {
      const mintAmount = ethers.parseEther("1000000");
      await expect(token.mint(user1.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, mintAmount, INITIAL_SUPPLY + mintAmount);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("should calculate remainingMintable and isMaxSupplyReached accurately", async function () {
      const remainingBefore = await token.remainingMintable();
      expect(remainingBefore).to.equal(MAX_SUPPLY - INITIAL_SUPPLY);
      expect(await token.isMaxSupplyReached()).to.equal(false);

      // Mint all remaining tokens to hit cap
      await token.mint(owner.address, remainingBefore);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
      expect(await token.remainingMintable()).to.equal(0);
      expect(await token.isMaxSupplyReached()).to.equal(true);
    });

    it("should revert if minting exceeds MAX_SUPPLY", async function () {
      const remaining = await token.remainingMintable();
      const excessAmount = remaining + ethers.parseEther("1");

      await expect(token.mint(user1.address, excessAmount))
        .to.be.revertedWithCustomError(token, "ExceedsMaxSupply")
        .withArgs(excessAmount, remaining);
    });

    it("should revert if minting to address(0)", async function () {
      await expect(
        token.mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("should revert if minting zero amount", async function () {
      await expect(
        token.mint(user1.address, 0)
      ).to.be.revertedWithCustomError(token, "ZeroAmount");
    });

    it("should revert if non-owner attempts to mint", async function () {
      await expect(
        token.connect(user1).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning (ERC20Burnable)", function () {
    it("should allow a holder to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("10000");
      await token.burn(burnAmount);

      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("should allow an approved spender to burn tokens on behalf of holder", async function () {
      const burnAmount = ethers.parseEther("5000");
      await token.approve(user1.address, burnAmount);

      await token.connect(user1).burnFrom(owner.address, burnAmount);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
      expect(await token.allowance(owner.address, user1.address)).to.equal(0);
    });
  });

  describe("Treasury Management", function () {
    it("should allow owner to update the treasury address", async function () {
      await expect(token.setTreasury(newTreasury.address))
        .to.emit(token, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury.address);

      expect(await token.treasury()).to.equal(newTreasury.address);
    });

    it("should revert if setting treasury to address(0)", async function () {
      await expect(
        token.setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("should revert if non-owner attempts to update treasury", async function () {
      await expect(
        token.connect(user1).setTreasury(newTreasury.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Two-Step Ownership Transfer (Ownable2Step)", function () {
    it("should require two steps to transfer contract ownership", async function () {
      // Step 1: Owner initiates transfer
      await token.transferOwnership(user1.address);
      expect(await token.owner()).to.equal(owner.address);
      expect(await token.pendingOwner()).to.equal(user1.address);

      // Step 2: New owner accepts
      await token.connect(user1).acceptOwnership();
      expect(await token.owner()).to.equal(user1.address);
      expect(await token.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("should revert if non-pending owner tries to accept ownership", async function () {
      await token.transferOwnership(user1.address);
      await expect(
        token.connect(user2).acceptOwnership()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("EIP-2612 Permit Support", function () {
    it("should support permit for signature-based approval", async function () {
      const [signer] = await ethers.getSigners();
      const spender = user1.address;
      const value = ethers.parseEther("1000");
      const nonce = await token.nonces(signer.address);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const domain = {
        name: NAME,
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const values = {
        owner: signer.address,
        spender: spender,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await signer.signTypedData(domain, types, values);
      const sig = ethers.Signature.from(signature);

      // Execute permit from any account (e.g. user2 as relayer)
      await token.connect(user2).permit(
        signer.address,
        spender,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s
      );

      expect(await token.allowance(signer.address, spender)).to.equal(value);
    });
  });
});
