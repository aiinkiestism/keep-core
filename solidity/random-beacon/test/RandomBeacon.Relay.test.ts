/* eslint-disable @typescript-eslint/no-unused-expressions */

import { ethers, waffle, helpers, getUnnamedAccounts } from "hardhat"
import { expect } from "chai"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import type { Address } from "hardhat-deploy/types"
import blsData from "./data/bls"
import { to1e18 } from "./functions"
import { constants, randomBeaconDeployment } from "./fixtures"
import { createGroup } from "./utils/groups"
import type {
  RandomBeacon,
  RandomBeaconStub,
  TestToken,
  RelayStub,
  SortitionPoolStub,
  StakingStub,
} from "../typechain"
import { registerOperators, Operator, OperatorID } from "./utils/sortitionpool"

const { time } = helpers
const { mineBlocks } = time
const ZERO_ADDRESS = ethers.constants.AddressZero

const fixture = async () => {
  const SortitionPoolStub = await ethers.getContractFactory("SortitionPoolStub")
  const sortitionPoolStub: SortitionPoolStub = await SortitionPoolStub.deploy()
  const deployment = await randomBeaconDeployment(sortitionPoolStub)

  const signers = await registerOperators(
    deployment.sortitionPool as SortitionPoolStub,
    (await getUnnamedAccounts()).slice(0, constants.groupSize)
  )

  return {
    randomBeacon: deployment.randomBeacon as RandomBeacon,
    sortitionPool: deployment.sortitionPool as SortitionPoolStub,
    testToken: deployment.testToken as TestToken,
    staking: deployment.stakingStub as StakingStub,
    relayStub: (await (
      await ethers.getContractFactory("RelayStub")
    ).deploy()) as RelayStub,
    signers,
  }
}

describe("RandomBeacon - Relay", () => {
  const relayRequestFee = to1e18(100)

  // When determining the eligibility queue, the
  // `(blsData.groupSignature % 64) + 1` equation points member`16` as the first
  // eligible one. This is why we use that index as `submitRelayEntry` parameter.
  // The `submitter` signer represents that member too.
  const firstEligibleMemberIndex = 16
  // In the invalid entry scenario `(blsData.nextGroupSignature % 64) + 1`
  // gives 3 so that  member needs to submit the wrong relay entry.
  const invalidEntryFirstEligibleMemberIndex = 3

  let requester: SignerWithAddress
  let member3: SignerWithAddress
  let member16: SignerWithAddress
  let member17: SignerWithAddress
  let member18: SignerWithAddress
  let signers: Operator[]
  let signersIDs: OperatorID[]
  let signersAddresses: Address[]

  let randomBeacon: RandomBeacon
  let sortitionPool: SortitionPoolStub
  let testToken: TestToken
  let staking: StakingStub
  let relayStub: RelayStub

  before(async () => {
    requester = await ethers.getSigner((await getUnnamedAccounts())[1])
  })

  beforeEach("load test fixture", async () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({ randomBeacon, sortitionPool, testToken, staking, relayStub, signers } =
      await waffle.loadFixture(fixture))

    signersIDs = signers.map((signer) => signer.id)
    signersAddresses = signers.map((signer) => signer.address)

    member3 = await ethers.getSigner(
      signers[invalidEntryFirstEligibleMemberIndex - 1].address
    )
    member16 = await ethers.getSigner(
      signers[firstEligibleMemberIndex - 1].address
    )
    member17 = await ethers.getSigner(
      signers[firstEligibleMemberIndex + 1 - 1].address
    )
    member18 = await ethers.getSigner(
      signers[firstEligibleMemberIndex + 2 - 1].address
    )

    await randomBeacon.updateRelayEntryParameters(to1e18(100), 10, 5760, 0)
    // groupLifetime: 64 * 10 * 5760 + 100
    // if the group lifetime is less than 6400 it will be expired on selection.
    await randomBeacon.updateGroupCreationParameters(100, 6500)
  })

  describe("requestRelayEntry", () => {
    context("when groups exist", () => {
      beforeEach(async () => {
        await createGroup(randomBeacon as RandomBeaconStub, signers)
      })

      context("when there is no other relay entry in progress", () => {
        context("when the requester pays the relay request fee", () => {
          let tx
          let previousMaintenancePoolBalance

          beforeEach(async () => {
            previousMaintenancePoolBalance = await testToken.balanceOf(
              randomBeacon.address
            )
            await approveTestToken()
            tx = await randomBeacon
              .connect(requester)
              .requestRelayEntry(ZERO_ADDRESS)
          })

          it("should deposit relay request fee to the maintenance pool", async () => {
            const currentMaintenancePoolBalance = await testToken.balanceOf(
              randomBeacon.address
            )
            expect(
              currentMaintenancePoolBalance.sub(previousMaintenancePoolBalance)
            ).to.be.equal(relayRequestFee)
          })

          it("should emit RelayEntryRequested event", async () => {
            await expect(tx)
              .to.emit(randomBeacon, "RelayEntryRequested")
              .withArgs(1, 0, blsData.previousEntry)
          })
        })

        context("when the requester doesn't pay the relay request fee", () => {
          it("should revert", async () => {
            await expect(
              randomBeacon.connect(requester).requestRelayEntry(ZERO_ADDRESS)
            ).to.be.revertedWith("Transfer amount exceeds allowance")
          })
        })
      })

      context("when there is an other relay entry in progress", () => {
        beforeEach(async () => {
          await approveTestToken()
          await randomBeacon.connect(requester).requestRelayEntry(ZERO_ADDRESS)
        })

        it("should revert", async () => {
          await expect(
            randomBeacon.connect(requester).requestRelayEntry(ZERO_ADDRESS)
          ).to.be.revertedWith("Another relay request in progress")
        })
      })
    })

    context("when no groups exist", () => {
      it("should revert", async () => {
        await expect(
          randomBeacon.connect(requester).requestRelayEntry(ZERO_ADDRESS)
        ).to.be.revertedWith("No active groups")
      })
    })
  })

  describe("submitRelayEntry", () => {
    beforeEach(async () => {
      await createGroup(randomBeacon as RandomBeaconStub, signers)
    })

    context("when relay request is in progress", () => {
      beforeEach(async () => {
        await approveTestToken()
        await randomBeacon.connect(requester).requestRelayEntry(ZERO_ADDRESS)
      })

      context("when relay entry is not timed out", () => {
        context("when submitter index is valid", () => {
          context("when submitter is eligible", () => {
            context("when entry is valid", () => {
              context(
                "when first eligible member submits before the soft timeout",
                () => {
                  let tx: ContractTransaction

                  beforeEach(async () => {
                    tx = await randomBeacon
                      .connect(member16)
                      .submitRelayEntry(
                        firstEligibleMemberIndex,
                        blsData.groupSignature
                      )
                  })

                  it("should not remove any members from the sortition pool", async () => {
                    await expect(tx).to.not.emit(
                      sortitionPool,
                      "OperatorsRemoved"
                    )
                  })

                  it("should not slash any members", async () => {
                    await expect(tx).to.not.emit(staking, "Slashed")
                  })

                  it("should emit RelayEntrySubmitted event", async () => {
                    await expect(tx)
                      .to.emit(randomBeacon, "RelayEntrySubmitted")
                      .withArgs(1, blsData.groupSignature)
                  })

                  it("should terminate the relay request", async () => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    expect(await randomBeacon.isRelayRequestInProgress()).to.be
                      .false
                  })
                }
              )

              context(
                "when other than first eligible member submits before the soft timeout",
                () => {
                  let tx: ContractTransaction

                  beforeEach(async () => {
                    // We wait 20 blocks to make two more members eligible.
                    // The member `18` submits the result.
                    await mineBlocks(20)

                    tx = await randomBeacon
                      .connect(member18)
                      .submitRelayEntry(
                        firstEligibleMemberIndex + 2,
                        blsData.groupSignature
                      )
                  })

                  it("should remove members who did not submit from the sortition pool", async () => {
                    await expect(tx)
                      .to.emit(sortitionPool, "OperatorsRemoved")
                      .withArgs([member16.address, member17.address])
                  })

                  it("should not slash any members", async () => {
                    await expect(tx).to.not.emit(staking, "Slashed")
                  })

                  it("should emit RelayEntrySubmitted event", async () => {
                    await expect(tx)
                      .to.emit(randomBeacon, "RelayEntrySubmitted")
                      .withArgs(1, blsData.groupSignature)
                  })

                  it("should terminate the relay request", async () => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    expect(await randomBeacon.isRelayRequestInProgress()).to.be
                      .false
                  })
                }
              )

              context(
                "when first eligible member submits after the soft timeout",
                () => {
                  let tx: ContractTransaction
                  let receipt: ContractReceipt

                  beforeEach(async () => {
                    // Let's assume we want to submit the relay entry after 75%
                    // of the soft timeout period elapses. If so we need to
                    // mine the following number of blocks:
                    // `groupSize * relayEntrySubmissionEligibilityDelay +
                    // (0.75 * relayEntryHardTimeout)`. However, we need to
                    // subtract one block because the relay entry submission
                    // transaction will move the blockchain ahead by one block
                    // due to the Hardhat auto-mine feature.
                    await mineBlocks(64 * 10 + 0.75 * 5760 - 1)

                    tx = await randomBeacon
                      .connect(member16)
                      .submitRelayEntry(
                        firstEligibleMemberIndex,
                        blsData.groupSignature
                      )

                    receipt = await tx.wait()
                  })

                  it("should not remove any members from the sortition pool", async () => {
                    await expect(tx).to.not.emit(
                      sortitionPool,
                      "OperatorsRemoved"
                    )
                  })

                  it("should slash 75% of slashing amount for all members ", async () => {
                    // `relayEntrySubmissionFailureSlashingAmount = 1000e18`.
                    // 75% of the soft timeout period elapsed so we expect
                    // `750e18` to be slashed.
                    await expect(tx)
                      .to.emit(staking, "Slashed")
                      .withArgs(to1e18(750), signersAddresses)
                  })

                  it("should emit RelayEntrySubmitted event", async () => {
                    await expect(tx)
                      .to.emit(randomBeacon, "RelayEntrySubmitted")
                      .withArgs(1, blsData.groupSignature)
                  })

                  it("should terminate the relay request", async () => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    expect(await randomBeacon.isRelayRequestInProgress()).to.be
                      .false
                  })
                }
              )
            })

            context("when entry is not valid", () => {
              it("should revert", async () => {
                await expect(
                  randomBeacon
                    .connect(member3)
                    .submitRelayEntry(
                      invalidEntryFirstEligibleMemberIndex,
                      blsData.nextGroupSignature
                    )
                ).to.be.revertedWith("Invalid entry")
              })
            })
          })

          context("when submitter is not eligible", () => {
            it("should revert", async () => {
              await expect(
                randomBeacon
                  .connect(member17)
                  .submitRelayEntry(
                    firstEligibleMemberIndex + 1,
                    blsData.groupSignature
                  )
              ).to.be.revertedWith("Submitter is not eligible")
            })
          })
        })

        context("when submitter index is beyond valid range", () => {
          it("should revert", async () => {
            await expect(
              randomBeacon
                .connect(member16)
                .submitRelayEntry(0, blsData.nextGroupSignature)
            ).to.be.revertedWith("Invalid submitter index")

            await expect(
              randomBeacon
                .connect(member16)
                .submitRelayEntry(65, blsData.nextGroupSignature)
            ).to.be.revertedWith("Invalid submitter index")
          })
        })

        context(
          "when submitter index does not correspond to sender address",
          () => {
            it("should revert", async () => {
              await expect(
                randomBeacon
                  .connect(member16)
                  .submitRelayEntry(17, blsData.nextGroupSignature)
              ).to.be.revertedWith("Unexpected submitter index")
            })
          }
        )
      })

      context("when relay entry is timed out", () => {
        it("should revert", async () => {
          // groupSize * relayEntrySubmissionEligibilityDelay + relayEntryHardTimeout
          await mineBlocks(64 * 10 + 5760)

          await expect(
            randomBeacon
              .connect(member16)
              .submitRelayEntry(
                firstEligibleMemberIndex,
                blsData.nextGroupSignature
              )
          ).to.be.revertedWith("Relay request timed out")
        })
      })
    })

    context("when relay request is not in progress", () => {
      it("should revert", async () => {
        await expect(
          randomBeacon
            .connect(member16)
            .submitRelayEntry(
              firstEligibleMemberIndex,
              blsData.nextGroupSignature
            )
        ).to.be.revertedWith("No relay request in progress")
      })
    })
  })

  describe("reportRelayEntryTimeout", () => {
    beforeEach(async () => {
      await createGroup(randomBeacon, signers)

      await approveTestToken()
      await randomBeacon.connect(requester).requestRelayEntry(ZERO_ADDRESS)
    })

    context("when relay entry timed out", () => {
      context(
        "when other active groups exist after timeout is reported",
        () => {
          let tx: ContractTransaction

          beforeEach(async () => {
            // Create another group in a rough way just to have an active group
            // once the one handling the timed out request gets terminated.
            // This makes the request retry possible. That group will not
            // perform any signing so their public key can be arbitrary bytes.
            // Also, that group is created just after the relay request is
            // made to ensure it is not selected for signing the original request.
            await (randomBeacon as RandomBeaconStub).roughlyAddGroup(
              "0x01",
              signersIDs
            )

            // `groupSize * relayEntrySubmissionEligibilityDelay +
            // relayEntryHardTimeout`.
            await mineBlocks(64 * 10 + 5760)

            tx = await randomBeacon.reportRelayEntryTimeout()
          })

          it("should slash entire stakes of all group members", async () => {
            await expect(tx)
              .to.emit(staking, "Slashed")
              .withArgs(to1e18(1000), signersAddresses)
          })

          it("should terminate the group", async () => {
            const isGroupTeminated = await (
              randomBeacon as RandomBeaconStub
            ).isGroupTerminated(0)
            expect(isGroupTeminated).to.be.equal(true)
          })

          it("should emit RelayEntryTimedOut event", async () => {
            await expect(tx)
              .to.emit(randomBeacon, "RelayEntryTimedOut")
              .withArgs(1)
          })

          it("should retry current relay request", async () => {
            // We expect the same request ID because this is a retry.
            // Group ID is `1` because we take an active group from `groupsRegistry`
            // array. Group with an index `0` was terminated.
            await expect(tx)
              .to.emit(randomBeacon, "RelayEntryRequested")
              .withArgs(1, 1, blsData.previousEntry)

            expect(await randomBeacon.isRelayRequestInProgress()).to.be.true
          })
        }
      )

      context("when no active groups exist after timeout is reported", () => {
        let tx: ContractTransaction

        beforeEach(async () => {
          // `groupSize * relayEntrySubmissionEligibilityDelay +
          // relayEntryHardTimeout`.
          await mineBlocks(64 * 10 + 5760)

          tx = await randomBeacon.reportRelayEntryTimeout()
        })

        it("should slash entire stakes of all group members", async () => {
          await expect(tx)
            .to.emit(staking, "Slashed")
            .withArgs(to1e18(1000), signersAddresses)
        })

        it("should terminate the group", async () => {
          const isGroupTeminated = await (
            randomBeacon as RandomBeaconStub
          ).isGroupTerminated(0)
          expect(isGroupTeminated).to.be.equal(true)
        })

        it("should emit RelayEntryTimedOut event", async () => {
          await expect(tx)
            .to.emit(randomBeacon, "RelayEntryTimedOut")
            .withArgs(1)
        })

        it("should clean up current relay request data", async () => {
          await expect(tx).to.not.emit(randomBeacon, "RelayEntryRequested")
          expect(await randomBeacon.isRelayRequestInProgress()).to.be.false
        })
      })
    })

    context("when relay entry did not time out", () => {
      it("should revert", async () => {
        await expect(randomBeacon.reportRelayEntryTimeout()).to.be.revertedWith(
          "Relay request did not time out"
        )
      })
    })
  })

  describe("isEligible", () => {
    const testGroupSize = 8

    it("should correctly manage the eligibility queue", async () => {
      await relayStub.setCurrentRequestStartBlock()

      // At the beginning only member 8 is eligible because
      // (blsData.groupSignature % groupSize) + 1 = 8.
      await assertMembersEligible([8], testGroupSize)
      await assertMembersNotEligible([1, 2, 3, 4, 5, 6, 7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1], testGroupSize)
      await assertMembersNotEligible([2, 3, 4, 5, 6, 7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1, 2], testGroupSize)
      await assertMembersNotEligible([3, 4, 5, 6, 7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1, 2, 3], testGroupSize)
      await assertMembersNotEligible([4, 5, 6, 7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1, 2, 3, 4], testGroupSize)
      await assertMembersNotEligible([5, 6, 7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1, 2, 3, 4, 5], testGroupSize)
      await assertMembersNotEligible([6, 7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1, 2, 3, 4, 5, 6], testGroupSize)
      await assertMembersNotEligible([7], testGroupSize)

      await mineBlocks(10)

      await assertMembersEligible([8, 1, 2, 3, 4, 5, 6, 7], testGroupSize)
    })
  })

  describe("getInactiveMembers", () => {
    let members: OperatorID[]

    beforeEach(async () => {
      members = [
        signersIDs[0], // member index 1
        signersIDs[1], // member index 2
        signersIDs[2], // member index 3
        signersIDs[3], // member index 4
        signersIDs[4], // member index 5
        signersIDs[5], // member index 6
        signersIDs[6], // member index 7
        signersIDs[7], // member index 8
      ]
    })

    context("when submitter index is the first eligible index", () => {
      it("should return empty inactive members list", async () => {
        const inactiveMembers = await relayStub.getInactiveMembers(
          5,
          5,
          members
        )

        await expect(inactiveMembers.length).to.be.equal(0)
      })
    })

    context("when submitter index is bigger than first eligible index", () => {
      it("should return a proper inactive members list", async () => {
        const inactiveMembers = await relayStub.getInactiveMembers(
          8,
          5,
          members
        )

        await expect(inactiveMembers.length).to.be.equal(3)
        await expect(inactiveMembers[0]).to.be.equal(members[4])
        await expect(inactiveMembers[1]).to.be.equal(members[5])
        await expect(inactiveMembers[2]).to.be.equal(members[6])
      })
    })

    context("when submitter index is smaller than first eligible index", () => {
      it("should return a proper inactive members list", async () => {
        const inactiveMembers = await relayStub.getInactiveMembers(
          3,
          5,
          members
        )

        await expect(inactiveMembers.length).to.be.equal(6)
        await expect(inactiveMembers[0]).to.be.equal(members[4])
        await expect(inactiveMembers[1]).to.be.equal(members[5])
        await expect(inactiveMembers[2]).to.be.equal(members[6])
        await expect(inactiveMembers[3]).to.be.equal(members[7])
        await expect(inactiveMembers[4]).to.be.equal(members[0])
        await expect(inactiveMembers[5]).to.be.equal(members[1])
      })
    })
  })

  describe("getSlashingFactor", () => {
    const testGroupSize = 8

    beforeEach(async () => {
      await relayStub.setCurrentRequestStartBlock()
    })

    context("when soft timeout has not been exceeded yet", () => {
      it("should return a slashing factor equal to zero", async () => {
        // `groupSize * relayEntrySubmissionEligibilityDelay`
        await mineBlocks(8 * 10)

        expect(await relayStub.getSlashingFactor(testGroupSize)).to.be.equal(0)
      })
    })

    context("when soft timeout has been exceeded by one block", () => {
      it("should return a correct slashing factor", async () => {
        // `groupSize * relayEntrySubmissionEligibilityDelay + 1 block`
        await mineBlocks(8 * 10 + 1)

        // We are exceeded the soft timeout by `1` block so this is the
        // `submissionDelay` factor. If so we can calculate the slashing factor
        // as `(submissionDelay * 1e18) / relayEntryHardTimeout` which
        // gives `1 * 1e18 / 5760 = 173611111111111` (0.017%).
        expect(await relayStub.getSlashingFactor(testGroupSize)).to.be.equal(
          BigNumber.from("173611111111111")
        )
      })
    })

    context(
      "when soft timeout has been exceeded by the number of blocks equal to the hard timeout",
      () => {
        it("should return a correct slashing factor", async () => {
          // `groupSize * relayEntrySubmissionEligibilityDelay + relayEntryHardTimeout`
          await mineBlocks(8 * 10 + 5760)

          // We are exceeded the soft timeout by `5760` blocks so this is the
          // `submissionDelay` factor. If so we can calculate the slashing
          // factor as `(submissionDelay * 1e18) / relayEntryHardTimeout` which
          // gives `5760 * 1e18 / 5760 = 1000000000000000000` (100%).
          expect(await relayStub.getSlashingFactor(testGroupSize)).to.be.equal(
            BigNumber.from("1000000000000000000")
          )
        })
      }
    )

    context(
      "when soft timeout has been exceeded by the number of blocks bigger than the hard timeout",
      () => {
        it("should return a correct slashing factor", async () => {
          // `groupSize * relayEntrySubmissionEligibilityDelay +
          // relayEntryHardTimeout + 1 block`.
          await mineBlocks(8 * 10 + 5760 + 1)

          // We are exceeded the soft timeout by a value bigger than the
          // hard timeout. In that case the maximum value (100%) of the slashing
          // factor should be returned.
          expect(await relayStub.getSlashingFactor(testGroupSize)).to.be.equal(
            BigNumber.from("1000000000000000000")
          )
        })
      }
    )
  })

  async function approveTestToken() {
    await testToken.mint(requester.address, relayRequestFee)
    await testToken
      .connect(requester)
      .approve(randomBeacon.address, relayRequestFee)
  }

  async function assertMembersEligible(members: number[], groupSize: number) {
    for (let i = 0; i < members.length; i++) {
      expect(
        // eslint-disable-next-line no-await-in-loop,@typescript-eslint/no-unused-expressions
        await relayStub.isEligible(
          members[i],
          blsData.groupSignature,
          groupSize
        )
      ).to.be.true
    }
  }

  async function assertMembersNotEligible(
    members: number[],
    groupSize: number
  ) {
    for (let i = 0; i < members.length; i++) {
      expect(
        // eslint-disable-next-line no-await-in-loop,@typescript-eslint/no-unused-expressions
        await relayStub.isEligible(
          members[i],
          blsData.groupSignature,
          groupSize
        )
      ).to.be.false
    }
  }
})
