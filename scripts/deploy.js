// deploy.js

const hre = require("hardhat");

async function main() {
  const petAdoption = await hre.ethers.deployContract("PetAdoption");

  await petAdoption.waitForDeployment();

  console.log(`PetAdoption contract deployed to ${petAdoption.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});