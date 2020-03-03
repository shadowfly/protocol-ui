const express = require('express');
var path = require('path');
var Web3 = require('web3');
var abi = require('../abi/abi');
var web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io/v3/9815d4d19c2543ed96d17d37e2842653'));
const MetaMaskConnector = require('node-metamask');
const connector = new MetaMaskConnector({
  port: 3333, // this is the default port
  onConnect() { console.log('MetaMask client connected')}, // Function to run when MetaMask is connected (optional)
});
connector.start().then(() => {
  // Now go to http://localhost:3333 in your MetaMask enabled web browser.
  const web3 = new Web3(connector.getProvider());
  // Use web3 as you would normally do. Sign transactions in the browser.
});
const router = express.Router();


console.log(web3.eth.defaultAccount);




router.use(function (req,res,next) {
  console.log("/" + req.method);
  next();
});

router.get("/",function(req,res){
  res.sendFile(path.resolve("views/index.html"));
});

router.post("/mintTokens",function (req,res) {
	var contract = new web3.eth.Contract(abi,req.body.contract_address);
	new Promise((resolve,reject)=>{
		contract.methods.mint(req.body.mintAmount).send({
			from: req.body.uAddress
		}).on('confirmation',(confirmationCount)=>{
			res.sendStatus(200);
			resolve();
		}).on('error',(error)=>{
			res.sendStatus(400);
			reject(error);
		});
	});
});

router.post('/redeemTokens',function (req,res) {

});

module.exports = router;
