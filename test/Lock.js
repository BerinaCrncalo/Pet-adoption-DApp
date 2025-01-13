const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Adoption", function () {
  // Fixture to deploy the contract with predefined settings
  async function deployAdoptionFixture() {
    const ADOPTION_FEE = ethers.utils.parseEther("0.1"); // 0.1 ETH adoption fee
    const ADOPTION_PERIOD = 30 * 24 * 60 * 60; // 30 days lock period

    const unlockTime = (await time.latest()) + ADOPTION_PERIOD;

    const [owner, adopter] = await ethers.getSigners();

    const Adoption = await ethers.getContractFactory("Adoption");
    const adoption = await Adoption.deploy(unlockTime, ADOPTION_FEE);

    return { adoption, unlockTime, ADOPTION_FEE, owner, adopter };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { adoption, unlockTime } = await loadFixture(deployAdoptionFixture);

      expect(await adoption.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right adoption fee", async function () {
      const { adoption, ADOPTION_FEE } = await loadFixture(
        deployAdoptionFixture
      );

      expect(await adoption.adoptionFee()).to.equal(ADOPTION_FEE);
    });

    it("Should set the right owner", async function () {
      const { adoption, owner } = await loadFixture(deployAdoptionFixture);

      expect(await adoption.owner()).to.equal(owner.address);
    });
  });

  describe("Adopting Pets", function () {
    it("Should revert if insufficient fee is sent", async function () {
      const { adoption, adopter } = await loadFixture(deployAdoptionFixture);

      await expect(
        adoption.connect(adopter).adoptPet({ value: ethers.utils.parseEther("0.05") }) // Less than the required fee
      ).to.be.revertedWith("Insufficient adoption fee");
    });

    it("Should allow adopting a pet with the correct fee", async function () {
      const { adoption, adopter, ADOPTION_FEE } = await loadFixture(
        deployAdoptionFixture
      );

      await expect(
        adoption.connect(adopter).adoptPet({ value: ADOPTION_FEE })
      ).to.emit(adoption, "PetAdopted");
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert if called too soon", async function () {
        const { adoption } = await loadFixture(deployAdoptionFixture);

        await expect(adoption.withdrawFunds()).to.be.revertedWith(
          "Funds are locked"
        );
      });

      it("Should revert if called by someone other than the owner", async function () {
        const { adoption, unlockTime, adopter } = await loadFixture(
          deployAdoptionFixture
        );

        await time.increaseTo(unlockTime);

        await expect(
          adoption.connect(adopter).withdrawFunds()
        ).to.be.revertedWith("Only the owner can withdraw");
      });

      it("Should allow withdrawal after the unlockTime", async function () {
        const { adoption, unlockTime } = await loadFixture(
          deployAdoptionFixture
        );

        await time.increaseTo(unlockTime);

        await expect(adoption.withdrawFunds()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit a withdrawal event", async function () {
        const { adoption, unlockTime } = await loadFixture(deployAdoptionFixture);

        await time.increaseTo(unlockTime);

        await expect(adoption.withdrawFunds())
          .to.emit(adoption, "FundsWithdrawn")
          .withArgs(anyValue); // We accept any value as the withdrawal amount
      });
    });

    describe("Transfers", function () {
      it("Should transfer funds to the owner", async function () {
        const { adoption, unlockTime, owner } = await loadFixture(
          deployAdoptionFixture
        );

        const balanceBefore = await ethers.provider.getBalance(owner.address);

        await time.increaseTo(unlockTime);
        await adoption.withdrawFunds();

        const balanceAfter = await ethers.provider.getBalance(owner.address);

        expect(balanceAfter).to.be.gt(balanceBefore); // Owner balance increased
      });
    });
  });
});
