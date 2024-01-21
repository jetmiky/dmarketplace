// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DMarketPlace {

  address public owner;
  uint public MARKET_FEE = 500000 gwei;
  uint public fee_balance;

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
    string shipment;
    bool is_completed;
  }

  Product[] public products;
  mapping (address => Order[]) public orders;
  
  event Post(address owner, uint id, string name, uint price);
  event Buy(address buyer, uint orderId, uint productId); 
  event Completed(address owner, uint productId);

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

  function buy(uint _id, string memory _shipment) public payable {
    Product storage product = products[_id];

    require(product.id >= 0, "Product is not exists!");
    require(product.stock > 0, "Product is out of stock!");
    require(product.price + MARKET_FEE == msg.value, "Invalid payment amount!");

    product.stock--;
    fee_balance += MARKET_FEE;
    uint orderId = orders[msg.sender].length;

    Order memory order = Order({
      id: orderId,
      timestamp: block.timestamp,
      product: product,
      shipment: _shipment,
      is_completed: false
    });

    orders[msg.sender].push(order);
    emit Buy(msg.sender, orderId, product.id);
  }

  function setOrderCompleted(uint _orderId, uint8 rating) public {
    Order storage order = orders[msg.sender][_orderId];

    require(order.id >= 0, "Order is not exists!");
    order.is_completed = true;
    
    Product memory product = order.product;
    product.rating = rating;

    sendPayment(product.owner, product.price);
  }

  function sendPayment(address _productOwner, uint _amount) private {
    (bool sent, ) = _productOwner.call{value: _amount}("");
    require(sent, "Failed to send order payment");
  }

  function withdraw() public onlyOwner {
    uint balance = fee_balance;
    fee_balance = 0;

    sendPayment(owner, balance);
  }

  function changeMarketFee(uint fee) public onlyOwner {
    MARKET_FEE = fee;
  }
}