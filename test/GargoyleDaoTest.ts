import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
import { ethers } from "hardhat";
import { TypedEventLog } from "../typechain-types/common";

describe("GargoyleDao", function () {
  async function deployFixture() {
    const [firstDaoMember, otherAccount] = await ethers.getSigners();

    const upcomingNonce = await firstDaoMember.getNonce();
  
    // gets the address of the toekn before it is deployed
    const futureTokenAddress = ethers.getCreateAddress({
      from: firstDaoMember.address,
      nonce: upcomingNonce
    });

    // Deploy token contract
    const GargoyleToken = await ethers.getContractFactory("GargoyleToken");
    const token = await GargoyleToken.deploy();
    token.waitForDeployment();

    // Deploy DAO contract with the token address (in this case the futureTokenAddress could have simply been pulled from token contract)
    const GargoyleDao = await ethers.getContractFactory("GargoyleDao");
    const governor = await GargoyleDao.deploy(futureTokenAddress);
    governor.waitForDeployment();

    const governorAddress = await governor.getAddress();

    // Transfer ownership of DAO to the governer contract
    const transferOwnershipTx = await token.transferOwnership(governorAddress);
    transferOwnershipTx.wait();

    // Delegate owner tokens to themselves
    const delegateToOwnerTx = await token.delegate(firstDaoMember.address);
    delegateToOwnerTx.wait();

    return { governor, token, firstDaoMember, otherAccount };
  }

  it("should provide the firstDaoMember with a starting balance", async () => {
    const { token, firstDaoMember } = await loadFixture(deployFixture);

    const balance = await token.balanceOf(firstDaoMember.address);
    expect(balance.toString()).equals(ethers.parseEther("10000").toString());
  });

  describe("after proposing", () => {
    async function afterProposingFixture() {
      const deployValues = await deployFixture();
      const { governor, token, firstDaoMember } = deployValues;

      const proposalTx = await governor.propose(
        [await token.getAddress()],
        [0],
        [token.interface.encodeFunctionData("mint", [firstDaoMember.address, ethers.parseEther("25000")])],
        "Give firstDaoMember more tokens!"
      );

      // Reconstructed using Govenor.sol function propose
      const calculatedProposalId = await governor.hashProposal(
        [await token.getAddress()], 
        [0], 
        [token.interface.encodeFunctionData("mint", [firstDaoMember.address, ethers.parseEther("25000")])],
        ethers.keccak256(ethers.toUtf8Bytes("Give firstDaoMember more tokens!"))
      );

      console.log("Calculated proposal id", calculatedProposalId);

 
      const proposalReceipt = await proposalTx.wait();

      const proposalLogs = proposalReceipt?.logs as TypedEventLog<any>[];
      const proposalCreatedLog = proposalLogs?.find(x => x.fragment.name === 'ProposalCreated');
      const proposalId = proposalCreatedLog?.args[0]; // Proposal ID is the first arg in the event, see Governor.sol "emit ProposalCreated(...)"
      console.log('Found this proposalId', proposalId);

      // wait for the 1 block voting delay
      await ethers.provider.send("evm_mine");
      
      return { ...deployValues, proposalId, proposalTx } 
    }
    
    it("should emit ProposalCreated event and set the initial state of the proposal", async () => {
      const { governor, token, proposalTx, proposalId } = await loadFixture(afterProposingFixture);
      await expect(proposalTx).to.emit(governor, "ProposalCreated");
      const state = await governor.state(proposalId);
      expect(state).equals(ethers.parseUnits("0", 0));

    });
    
    describe("after voting", () => {
      async function afterVotingFixture() {
        const proposingValues = await afterProposingFixture();
        const { governor, proposalId } = proposingValues;
        
        const voteTx = await governor.castVote(proposalId, 1);      
        const voteReceipt = await voteTx.wait();
        const voteLogs = voteReceipt?.logs as TypedEventLog<any>[];
        const voteCastLog = voteLogs?.find(x => x.fragment.name === 'VoteCast');
        
        // wait for the 1 block voting period
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");

        return { ...proposingValues, voteCastLog }
      }

      it("should have set the vote", async () => {
        const { voteCastLog, firstDaoMember } = await loadFixture(afterVotingFixture);

        const logArgs = voteCastLog?.args;
        console.log('Log args:', logArgs);

        const voter = voteCastLog?.args[0];
        console.log('Voter address from logs: ', voter);
        const weight = voteCastLog?.args[3] as bigint;
        console.log('Vote weight from logs: ', weight);
        expect(voter).equals(firstDaoMember.address);
        expect(weight.toString()).equals(ethers.parseEther("10000").toString());

      });

      it("should allow executing the proposal", async () => {
        const { governor, token, firstDaoMember } = await loadFixture(afterVotingFixture);

        await governor.execute(
          [await token.getAddress()],
          [0],
          [token.interface.encodeFunctionData("mint", [firstDaoMember.address, ethers.parseEther("25000")])],
          ethers.keccak256(ethers.toUtf8Bytes("Give firstDaoMember more tokens!"))
        );

        const balance = await token.balanceOf(firstDaoMember.address);
        assert.equal(balance.toString(), ethers.parseEther("35000").toString());
      });
    });
  });
});