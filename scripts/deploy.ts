import { ethers } from "hardhat";

// TODO: Figure out how GargoyleDao isn't verifying

async function main() {

  const [firstDaoMember] = await ethers.getSigners();

  const upcomingNonce = await firstDaoMember.getNonce();
  
  // gets the address of the toekn before it is deployed
  const futureTokenAddress = ethers.getCreateAddress({
    from: firstDaoMember.address,
    nonce: upcomingNonce
  });

  console.log('future token address', futureTokenAddress);

  // Deploy token contract
  const GargoyleToken = await ethers.getContractFactory("GargoyleToken");
  const token = await GargoyleToken.deploy();
  token.waitForDeployment();

  // Deploy DAO contract with the token address (in this case the futureTokenAddress could have simply been pulled from token contract)
  const GargoyleDao = await ethers.getContractFactory("GargoyleDao");
  const governor = await GargoyleDao.deploy(futureTokenAddress);
  governor.waitForDeployment();

  const tokenAddress = await token.getAddress();
  const governorAddress = await governor.getAddress();

  console.log(
    `Token deployed to ${tokenAddress}`,
    `Governor deployed to ${governorAddress}`,
  );

  // Transfer ownership of token from firstDaoMember to the DAO
  const transferOwnershipTx = await token.transferOwnership(governorAddress);
  transferOwnershipTx.wait();

  console.log('Ownership transferred to:', governorAddress)

  // Delegate voting power of firstDaoMember's tokens to theirself
  const delegateToSelfTx = await token.delegate(firstDaoMember.address);
  delegateToSelfTx.wait();

  console.log('Ownership delegated to', firstDaoMember.address);

  const firstDaoMemberBalance = await token.balanceOf(firstDaoMember.address);

  console.log('firstDaoMember has a token balance of', ethers.formatEther(firstDaoMemberBalance));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
