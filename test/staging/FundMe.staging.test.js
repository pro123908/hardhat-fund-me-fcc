const { assert } = require("chai")
const { ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", () => {
          let fundMe
          let deployer
          const sendValue = ethers.utils.parseEther("0.1")

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              fundMe = await ethers.getContract("FundMe", deployer)
          })

          it("it allows people to fund and withdraw", async () => {
              await fundMe.fund({ value: sendValue })
              await fundMe.cheaperWithdraw()

              const endingBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )

              console.log("endingBalnce = ", endingBalance.toString())

              assert.equal(endingBalance.toString(), "0")
          })
      })
