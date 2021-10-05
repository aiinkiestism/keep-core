import { ethers, waffle, helpers } from "hardhat"
import { expect } from "chai"

import { constants, testDeployment } from "./helpers/fixtures"

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import type { RandomBeacon } from "../typechain"

const { mineBlocks } = helpers.time

describe("RandomBeacon contract", function () {
  const dkgTimeout: number =
    constants.timeDKG +
    constants.groupSize * constants.dkgSubmissionEligibilityDelay

  const groupPublicKey: string = ethers.utils.hexValue(blsData.groupPubKey)

  let signer1: SignerWithAddress
  let signer2: SignerWithAddress
  let signer3: SignerWithAddress

  let randomBeacon: RandomBeacon

  before(async function () {
    ;[signer1, signer2, signer3] = await ethers.getSigners()
  })

  beforeEach("load test fixture", async function () {
    const contracts = await waffle.loadFixture(testDeployment)

    randomBeacon = contracts.randomBeacon as RandomBeacon
  })

  describe("genesis function call", async function () {
    let tx: ContractTransaction

    beforeEach("run genesis", async () => {
      tx = await randomBeacon.genesis()
    })

    it("emits DkgStarted event", async function () {
      await expect(tx)
        .to.emit(randomBeacon, "DkgStarted")
        .withArgs(
          await randomBeacon.GENESIS_SEED(),
          await randomBeacon.GROUP_SIZE(),
            await randomBeacon.dkgSubmissionEligibilityDelay()
        )
    })

    it("sets values", async function () {
      const dkgData = await randomBeacon.dkg()

      expect(dkgData.seed).to.eq(await randomBeacon.GENESIS_SEED())
      expect(dkgData.groupSize).to.eq(await randomBeacon.GROUP_SIZE())
        expect(dkgData.dkgSubmissionEligibilityDelay).to.eq(
          await randomBeacon.dkgSubmissionEligibilityDelay()
        )
        expect(dkgData.startBlock).to.be.eq(tx.blockNumber)
      })
    })

    context("with genesis in progress", async function () {
      beforeEach("run genesis", async () => {
        await randomBeacon.genesis()
      })

      it("returns false", async function () {
        // TODO: It should return a dedicated error from RandomBeacon contract.
        await expect(randomBeacon.genesis()).to.be.revertedWith(
          "InvalidInProgressState(false, true)"
        )
      })

      // TODO: add more tests when more scenarios are covered.
    })

    context("with genesis already completed", async function () {
      // TODO: Add tests
    })
  })

  describe("isDkgInProgress function call", async function () {
    context("with initial contract state", async function () {
      it("returns false", async function () {
        expect(await randomBeacon.isDkgInProgress()).to.be.false
      })
    })

    context("when genesis dkg started", async function () {
      beforeEach("run genesis", async () => {
        await randomBeacon.genesis()
      })

      it("returns false", async function () {
        expect(await randomBeacon.isDkgInProgress()).to.be.true
      })

      context("when dkg timeout was notified", async function () {
        beforeEach("notify dkg timeout", async () => {
          await mineBlocks(dkgTimeout)

          await randomBeacon.notifyDkgTimeout()
        })

        it("returns false", async function () {
          expect(await randomBeacon.isDkgInProgress()).to.be.false
        })
      })
    })
  })

  describe("notifyDkgTimeout function call", async function () {
    context("with group creation in progress", async function () {
      let seed: BigNumber

      beforeEach("run genesis", async () => {
        await randomBeacon.genesis()
        seed = (await randomBeacon.dkg()).seed
      })

      context("with group creation not timed out", async function () {
        it("reverts with NotTimedOut error", async function () {
          const expectedTimeout = (await randomBeacon.dkg()).startBlock
            .add(dkgTimeout)
            .add(1)

          const latestBlock = await mineBlocks(dkgTimeout - 1)

          await expect(randomBeacon.notifyDkgTimeout()).to.be.revertedWith(
            `NotTimedOut(${expectedTimeout}, ${latestBlock + 1})`
          )
        })
      })

      context("with group creation timed out", async function () {
        let tx: ContractTransaction

        beforeEach("notify dkg timeout", async () => {
          await mineBlocks(dkgTimeout)
          tx = await randomBeacon.notifyDkgTimeout()
        })

        it("emits an event", async function () {
          await expect(tx).to.emit(randomBeacon, "DkgTimedOut").withArgs(seed)
        })

        it("cleans up dkg data", async function () {
          await assertDkgCleanData(randomBeacon)
        })
      })
    })

    context("with group creation not in progress", async function () {
      it("reverts with InvalidState error", async function () {
        await expect(randomBeacon.notifyDkgTimeout()).to.be.revertedWith(
          "InvalidInProgressState(true, false)"
        )
      })
    })
  })

  describe("submitDkgResult function call", async function () {
    context("with initial contract state", async function () {
      it("reverts with InvalidInProgressState error", async function () {
        await expect(randomBeacon.submitDkgResult()).to.be.revertedWith(
          "InvalidInProgressState(true, false)"
        )
      })
    })

    context("with group creation in progress", async function () {
      beforeEach("run genesis", async () => {
        await randomBeacon.genesis()
      })

      context("with group creation not timed out", async function () {
        beforeEach("increase time", async () => {
          await mineBlocks(constants.timeDKG)
        })

        it("cleans up dkg data", async function () {
          await randomBeacon.submitDkgResult()

          // TODO: This test will be enhanced to clean up only after all DKG
          // results were submitted.
          await assertDkgCleanData(randomBeacon)
        })
      })

      context("with group creation timed out", async function () {
        beforeEach("increase time", async () => {
          await increaseTime(await randomBeacon.DKG_TIMEOUT())
        })

        context("with timeout not notified", async function () {
          it("cleans up dkg data", async function () {
            await randomBeacon.submitDkgResult()

            // TODO: This test will be enhanced to clean up only after all DKG
            // results were submitted.
            await assertDkgCleanData(randomBeacon)
          })
        })

        context("with timeout notified", async function () {
          beforeEach("notify dkg timeout", async () => {
            await randomBeacon.notifyDkgTimeout()
          })

          it("reverts with InvalidInProgressState error", async function () {
            await expect(randomBeacon.submitDkgResult()).to.be.revertedWith(
              "InvalidInProgressState(true, false)"
            )
          })
        })
      })
    })
  })
})

async function assertDkgCleanData(randomBeacon: RandomBeacon) {
  const dkgData = await randomBeacon.dkg()

  expect(dkgData.seed).to.eq(0)
  expect(dkgData.groupSize).to.eq(0)
  expect(dkgData.startBlock).to.eq(0)
  expect(dkgData.dkgSubmissionEligibilityDelay).to.eq(0)
}
