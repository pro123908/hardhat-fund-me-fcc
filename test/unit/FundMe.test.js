const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { assert, expect } = require("chai")

const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", () => {
          let fundMe
          let deployer
          let mockV3Aggregator
          let sendValue = ethers.utils.parseEther("1")

          beforeEach(async () => {
              // Getting accounts using ethers
              // const accounts = await ethers.getSigners()

              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])

              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", () => {
              it("sets the aggregator address correctly", async () => {
                  const response = await fundMe.getPriceFeed()

                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", () => {
              // it("fails if you don't send enough ETH", async () => {
              //     await expect(fundMe.fund()).to.be.revertedWith(
              //         "You need to spend more ETH"
              //     )
              // })

              it("fails if you don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't send enough!"
                  )
              })

              it("updated the amount funded data structure", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )

                  assert(response.toString(), sendValue.toString())
              })

              it("add funder to array of funders", async () => {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)

                  assert(funder, deployer)
              })
          })

          describe("withdraw", () => {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })

              it("Withdraw ETH from a single founder", async () => {
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)

                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  const txResponse = await fundMe.cheaperWithdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = txReceipt

                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("allows us to withdraw with multiple funders", async () => {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )

                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)

                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  const txResponse = await fundMe.cheaperWithdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = txReceipt

                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )

                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("only allow owner to withdraw", async () => {
                  const accounts = await ethers.getSigners()
                  const attackerAccount = accounts[1]

                  const attackerConnectedContract = await fundMe.connect(
                      attackerAccount
                  )
                  await expect(
                      attackerConnectedContract.cheaperWithdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")

                  // await expect(attackerConnectedContract.withdraw()).to.be.reverted
              })
          })
      })
