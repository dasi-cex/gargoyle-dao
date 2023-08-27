import { ethers } from "hardhat";
import { TypedEventLog } from "../typechain-types/common";

const LOCAL_TOKEN_CONTRACT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const LOCAL_DAO_CONTRACT = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const SEPOLIA_TOKEN_CONTRACT = '0x6B6f0F4532A589Ff3Ea2587FF924dc3DA6641E31';
const SEPOLIA_DAO_CONTRACT = '0x06687A267E3C87d409957B9622672e8cad1F35f7'

async function main() {

  const [firstDaoMember] = await ethers.getSigners();

  // Fetch token contract
  const token = await ethers.getContractAt("GargoyleToken", SEPOLIA_TOKEN_CONTRACT);

  // Fetch DAO contract
  const governor = await ethers.getContractAt("GargoyleDao", SEPOLIA_DAO_CONTRACT);

  // Reconstructed using Govenor.sol function propose
  const proposalId = await governor.hashProposal(
    [await token.getAddress()], 
    [0], 
    [token.interface.encodeFunctionData("mint", [firstDaoMember.address, ethers.parseEther("25000")])],
    ethers.keccak256(ethers.toUtf8Bytes("Give firstDaoMember more tokens!"))
  );

  console.log("Calculated proposal id", proposalId);

  // // FOR TESTING ONLY: wait for the 1 block voting delay
  // await ethers.provider.send("evm_mine");

  const voteTx = await governor.castVote(proposalId, 1);      
  const voteReceipt = await voteTx.wait();
  const voteLogs = voteReceipt?.logs as TypedEventLog<any>[];
  const voteCastLog = voteLogs?.find(x => x.fragment.name === 'VoteCast');
  const voter = voteCastLog?.args[0];
  console.log('Voter address from logs: ', voter);
  const weight = voteCastLog?.args[3] as bigint;
  console.log('Vote weight from logs: ', weight);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});