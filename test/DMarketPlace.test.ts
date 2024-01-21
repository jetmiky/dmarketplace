import { expect } from "chai";
import { ethers } from "hardhat";

import { DMarketPlace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ContractTransactionResponse } from "ethers";

const convertUnits = (amount: number | bigint, units: string = "ether") => {
  return ethers.parseUnits(amount.toString(), units);
};

const PRODUCT = {
  id: 0,
  name: "Product Testing",
  category: "Clothing",
  img: "https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg",
  price: convertUnits(1, "ether"),
  stock: 10,
};

const ORDER = {
  orderId: 0,
  productId: 0,
  shipment: "Jakarta",
  rating: 5,
};

describe("DMarketPlace", () => {
  let contract: DMarketPlace;
  let administrator: SignerWithAddress;
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;

  before(async () => {
    const marketFee = convertUnits(500000, "gwei");
    const factory = await ethers.getContractFactory("DMarketPlace");

    contract = await factory.deploy(marketFee);
    [administrator, owner, buyer] = await ethers.getSigners();
  });

  describe("Deployment", () => {
    it("Set the administrator address", async () => {
      expect(await contract.owner()).to.equal(administrator.address);
    });
  });

  describe("Posting Products", () => {
    let transaction: ContractTransactionResponse;

    before(async () => {
      transaction = await contract
        .connect(owner)
        .post(
          PRODUCT.name,
          PRODUCT.category,
          PRODUCT.img,
          PRODUCT.price,
          PRODUCT.stock
        );

      await transaction.wait();
    });

    it("Added product", async () => {
      const product = await contract.products(PRODUCT.id);

      expect(product.name).to.equal(PRODUCT.name);
      expect(product.category).to.equal(PRODUCT.category);
      expect(product.img).to.equal(PRODUCT.img);
      expect(product.price).to.equal(PRODUCT.price);
      expect(product.stock).to.equal(PRODUCT.stock);
    });

    it("Emit post event", async () => {
      await expect(transaction)
        .to.emit(contract, "Post")
        .withArgs(owner.address, PRODUCT.id, PRODUCT.name, PRODUCT.price);
    });
  });

  describe("Buying Products", () => {
    let orderTransaction: ContractTransactionResponse;
    let completedTransaction: ContractTransactionResponse;
    let initialOwnerBalance: bigint;

    before(async () => {
      const fee = await contract.market_fee();
      orderTransaction = await contract
        .connect(buyer)
        .buy(ORDER.productId, ORDER.shipment, { value: PRODUCT.price + fee });

      await orderTransaction.wait();

      initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    });

    it("Added order", async () => {
      const order = await contract.orders(buyer.address, ORDER.orderId);

      expect(order.shipment).to.equal(ORDER.shipment);
      expect(order.is_completed).to.equal(false);
    });

    it("Emit buy event", async () => {
      await expect(orderTransaction)
        .to.emit(contract, "Buy")
        .withArgs(buyer.address, ORDER.orderId, ORDER.productId);
    });

    it("Complete order", async () => {
      completedTransaction = await contract
        .connect(buyer)
        .setOrderCompleted(ORDER.orderId, ORDER.rating);

      await completedTransaction.wait();

      const order = await contract.orders(buyer.address, ORDER.orderId);
      const product = await contract.products(PRODUCT.id);

      expect(order.is_completed).to.equal(true);
      expect(product.rating).to.equal(ORDER.rating);
    });

    it("Emit completed event", async () => {
      await expect(completedTransaction)
        .to.emit(contract, "Completed")
        .withArgs(owner.address, PRODUCT.id);
    });

    it("Send money to product owner", async () => {
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      expect(ownerBalance).to.equal(initialOwnerBalance + PRODUCT.price);
    });
  });

  describe("Administrations", () => {
    let initialBalance: bigint;

    before(async () => {
      initialBalance = await ethers.provider.getBalance(administrator.address);
    });

    it("Withdraw fee balance", async () => {
      const transaction = await contract.connect(administrator).withdraw();
      await transaction.wait();

      const currentBalance = await ethers.provider.getBalance(
        administrator.address
      );

      expect(currentBalance).to.be.greaterThan(initialBalance);
    });

    it("Change the market fee", async () => {
      const newFee = convertUnits(1000000, "gwei");
      const transaction = await contract
        .connect(administrator)
        .changeMarketFee(newFee);

      await transaction.wait();

      const fee = await contract.market_fee();
      expect(fee).to.equal(newFee);
    });
  });
});
