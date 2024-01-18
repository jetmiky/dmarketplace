// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DMarketPlace {

  address public owner;
  uint public MARKET_FEE = 10 wei;

  struct Product {
    uint id;
    address owner;
    string name;
    string category;
    string img;
    uint price;
    uint stock;
    uint8 rating;
  }

  struct Order {
    uint id;
    uint timestamp;
    Product product;
  }

  Product[] public products;
  mapping (address => Order[]) orders;
  
  event Post(address owner, uint id, string name, uint price);
  event Buy(address buyer, uint orderId, uint productId); 

  constructor() {
    owner = msg.sender;
  }

  modifier onlyOwner {
    require(msg.sender == owner, "Operation is not permitted!");
    _;
  }

  function post(string memory _name, string memory _category, string memory _img, uint _price, uint _quantity) public {
    uint id = products.length;

    Product memory product = Product({
      id: id,
      owner: msg.sender,
      name: _name,
      category: _category,
      img: _img,
      price: _price,
      stock: _quantity,
      rating: 0
    });

    products.push(product);
    emit Post(msg.sender, id, _name, _price);
  }

  function buy(uint _id) public payable {
    Product storage product = products[_id];

    require(product.id >= 0, "Product is not exists!");
    require(product.stock > 0, "Product is out of stock!");
    require(product.price + MARKET_FEE == msg.value, "Invalid payment amount!");

    product.stock--;
    uint orderId = orders[msg.sender].length;

    Order memory order = Order({
      id: orderId,
      timestamp: block.timestamp,
      product: product
    });

    orders[msg.sender].push(order);
    emit Buy(msg.sender, orderId, product.id);
  }

  function changeMarketFee(uint fee) public onlyOwner {
    MARKET_FEE = fee;
  }
}