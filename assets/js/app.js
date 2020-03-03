async function getBalance(uAddress) {
	var web3 = new Web3(ethereum);
	var ethBal = await web3.eth.getBalance(ethereum.selectedAddress);
	ethBal = web3.utils.fromWei(ethBal.toString(),'ether');
	$('#ethSBal').html(Number(ethBal).toFixed(3));
	var daiBal = await getDaiBalance(ethereum.selectedAddress);
	var daiBal = web3.utils.fromWei(daiBal.toString(), 'ether');
	var b = Number(daiBal).toFixed(3);
	$('#daiSBal').text(b);
}

async function commit(project) {
	var web3 = new Web3(ethereum);
	var myContract = new web3.eth.Contract(abi,project.contract_address);
	return new Promise((resolve, reject) => {
		myContract.methods.commit().send({from: ethereum.selectedAddress})
		.on('confirmation', (confirmationNumber) => {
			$('#confirmationBlock').html(confirmationNumber);
			if (confirmationNumber === 10) {
				$.ajax({
					url: '/user/invoice/'+project.id+'/confirm',
					type : 'POST',
					data : {
						'numberOfWords' : 10
					},
					dataType:'json',
					headers: {
						'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
					},
					success : function(data) {
						location.reload();
					},
					error : function(request,error)
					{
						alert("Request: "+JSON.stringify(request));
					}
				}).done(function () {
					$('#statusOfConfirmation').html('<i>Pending</i>');
					location.reload();
				});
				resolve()
			}
		})
		.on('error', (error) => {
			location.reload();
			alert(error);
			reject(error)
		})
	});
}

async function approvalStatus(cAddress) {
	console.log(cAddress);
	var n = await checkNetwork();
	var daiCAddress = n.daiCAddress;
	var daiContract  = new web3.eth.Contract(daiABI,daiCAddress);
	pAmount = web3.utils.toWei(pAmount.toString(), 'wei');
	var proContract = new web3.eth.Contract(abi,cAddress);
	var status;
	await proContract.methods.status().call({
		from: ethereum.selectedAddress
	},function (err,res) {
		status = res;
	});
	if(status == 0){
		$('.circle-btn').html('Yet to Approve by Buyer');
		return false;
	}else if(status == 1){
		$('.circle-btn').removeAttr('disabled');
		var bal = await daiContract.methods.allowance(ethereum.selectedAddress,cAddress).call({
			from: ethereum.selectedAddress
		},function (err,res) {
			console.log(res);
			if(res >= web3.utils.toWei(pAmount.toString(), 'ether')){
				$('.circle-btn').addClass('buy-now');
				$('.circle-btn').removeClass('approval-btn');
				$('.circle-btn').removeClass('sold-btn')
				$('.circle-btn').html('Buy Now<br><span class="askingAmt">'+(aAmount).toFixed(3)+'</span>');
				$('.investedAmount').html('0 Dai');
			}else{
				$('.circle-btn').removeClass('sold-btn');
				$('.circle-btn').addClass('approval-btn');
				$('.circle-btn').html('Unlock Dai<br><span class="askingAmt">'+ Number(pAmount).toFixed(3)+'</span>');
				$('.investedAmount').html('0 Dai');
			}
			return true;
		});
	}else if(status == 2){
		$('#apprAlertModal').removeClass('hide');
		$('#apprAlertModal').text('Invoice is bought by someone please dont approve the DAI tokens');
		$('.circle-btn').html('Bought<br><span class="askingAmt">'+(aAmount).toFixed(3)+'</span>');
		$('.circle-btn').attr('disabled','true');
		$('.investedAmount').html((aAmount).toFixed(3)+' Dai');
		$('.circle-btn').addClass('sold-btn')
		$('.circle-btn').removeClass('redeem-btn');
		$('.circle-btn').removeClass('buy-now');
		$('.circle-btn').removeClass('approval-btn');
		$('#apprDai').attr('disabled','true');
	} else if(status == 3){
		$('#apprAlertModal').removeClass('hide');
		$('#apprAlertModal').text('Invoice is already settled, Please dont approve DAI tokens');
		$('.circle-btn').html('Redeem');
		$('.circle-btn').removeAttr('disabled');
		$('.circle-btn').removeClass('sold-btn')
		$('.circle-btn').removeClass('buy-now');
		$('.circle-btn').removeClass('approval-btn');
		$('.circle-btn').addClass('redeem-btn');
		$('.investedAmount').html((aAmount).toFixed(3)+' Dai');
		$('#apprDai').attr('disabled','true');
	}
	return true;
}

async function approval(cAddress,pAmount){
	var n = await checkNetwork();
	var daiCAddress = n.daiCAddress;
	var daiContract  = new web3.eth.Contract(daiABI,daiCAddress);
	pAmount = web3.utils.toWei(pAmount.toString(), 'ether');
	var proContract = new web3.eth.Contract(abi,cAddress);
	var status;
	await proContract.methods.status().call({
		from: ethereum.selectedAddress
	},function (err,res) {
		status = res;
	});
	// check the balance of the msg.sender as even if the msg.sender has less balance he can
	// approve more tokens than he holds and then while buying invoice it will throw error in
	// transaction and user wont be able to figure out easily
	if(status == 1){
		await daiContract.methods.allowance(ethereum.selectedAddress,cAddress).call({
			from: ethereum.selectedAddress
		},async (err,res) => {
			if(err){
				// $('.loader-overlay').hide();
				console.log('Error while checking the allowance for user');
				return 0;
			}
			if(res < pAmount){
				return new Promise((resolve,reject) => {
					daiContract.methods.approve(cAddress, pAmount.toString()).send({
						from: ethereum.selectedAddress
					},function (err,res) {
						if(res){
							$('#confirmationMessage').removeClass('hide');
							$('.circle-btn').attr('disabled','true');
							$('.circle-btn').html('<i class="fa fa-spinner fa-pulse fa-5x" aria-hidden="true"></i>');
						}
					}).on('confirmation', (confirmationNumber) => {
						$('#confirmationMessage').html(confirmationNumber+' of 5 Blocks confirmed');
						if(confirmationNumber === 5){
							$('#apprAlertModal').removeClass('hide');
							$('#apprAlertModal').text('Thank you for approval, Now you can buy invoice');
							$('.circle-btn').html('Buy Now');

							$('#lockLogo').removeClass('fa-lock');
							$('#lockLogo').addClass('fa-unlock');
							$('#buyApprInvoice').removeAttr('disabled');
							$('.circle-btn').removeAttr('disabled');
							$('#apprDai').attr('disabled','true');
							// $('.loader-overlay').hide();
							resolve();
						}
					}).on('error',(error)=>{
						showAlertMessage(error.message,5000);
						$('.loader-overlay').hide();
						$('.circle-btn').html('Unlock Dai');
						reject(error);
					});
				});
			}else{
				console.log('Buy now'+ status);
				$('#apprAlertModal').removeClass('hide');
				$('.loader-overlay').hide();
				$('#apprAlertModal').text('You have already approved DAI tokens for this Smart Invoice');
				$('.circle-btn').html('Buy Now');
				$('#lockLogo').removeClass('fa-lock');
				$('#lockLogo').addClass('fa-unlock');
				$('#buyApprInvoice').removeAttr('disabled');
				$('#apprDai').attr('disabled','true');
				return false;
			}
		});
	}else if(status == 2){
		console.log('Sold'+ status);
		$('#apprAlertModal').removeClass('hide');
		$('.loader-overlay').hide();
		$('#apprAlertModal').text('Invoice is bought by someone please dont approve the DAI tokens');
		$('.circle-btn').html('Sold');
		$('#apprDai').attr('disabled','true');
		return false;
	} else if(status == 3){
		console.log('Settled'+ status);
		$('#apprAlertModal').removeClass('hide');
		$('.loader-overlay').hide();
		$('#apprAlertModal').text('Invoice is already settled, Please dont approve DAI tokens');
		$('.circle-btn').html('Settled');
		$('#apprDai').attr('disabled','true');
		return false;
	}
}
async function byInvoice(pAddress,pAmount,hPid,pid){
	var projectContract = new web3.eth.Contract(abi,pAddress);
	pEAmount = web3.utils.toWei(pAmount.toString(), 'ether');
	var financiersAddress = ethereum.selectedAddress;
	var res;
	return new Promise((resolve,reject)=>{
		projectContract.methods.buyInvoice(pEAmount).send({
			from:ethereum.selectedAddress
		},function (err,result) {
			res = result; //dont remove res = result as it uses in the next confirmation call
			if(result){
				$('#confirmationMessage').removeClass('hide');
			}
			$('.circle-btn').html('<i class="fa fa-spinner fa-pulse fa-5x" aria-hidden="true"></i>');
		}).on('confirmation',(confirmationNumber)=>{
			$('#confirmationMessage').html(confirmationNumber+' of 5 Blocks confirmed');
			if(confirmationNumber === 5){
				$.ajax({
					type: 'POST',
					url: "/invoice/"+hPid+"/buy",
					data: {
						financiersAddress: financiersAddress,
						transactionHash: res,
						amount: pAmount,
					},
					headers: {
						'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
					},
					async: true,
					success: function (data) {
						if(data){
							location.reload();
						}
					}
				});
				$('.circle-btn').html('Bought');
				$('.circle-btn').attr('disabled','true');
				$('#apprDai').attr('disabled','true');
				$('.loader-overlay').hide();
				resolve()
			}
		}).on('error',(error)=>{
			$('.circle-btn').html('Buy Now');
			showAlertMessage(error.message,5000);
			reject(error);
		});
	});
}

async function approvalSettle(cAddress,pAmount){
	var n = await checkNetwork();
	var daiCAddress = n.daiCAddress;
	var daiContract  = new web3.eth.Contract(daiABI,daiCAddress);
	pAmount = web3.utils.toWei(pAmount.toString(), 'ether');
	var proContract = new web3.eth.Contract(abi,cAddress);
	var status;
	await proContract.methods.status().call({
		from: ethereum.selectedAddress
	},function (err,res) {
		if(err){
			showAlertMessage('You have rejected the transaction',5000);
		}
		status = res;
	});
	// check the balance of the msg.sender as even if the msg.sender has less balance he can
	// approve more tokens than he holds and then why buying invoice it will throw error in
	// transaction and user wont be able to figure out easily
	if(status == 2){
		await daiContract.methods.allowance(ethereum.selectedAddress,cAddress).call({
			from: ethereum.selectedAddress
		},async (err,res) => {
			if(res < pAmount){
				return new Promise((resolve,reject) => {
					daiContract.methods.approve(cAddress, pAmount).send({
						from: ethereum.selectedAddress
					},function(err,result){
						if(err){
							console.log(err);
							showAlertMessage('You have rejected the transaction',5000);
						}
						if(result){
							$('#apprAlertModal').removeClass('hide');
							$('#apprAlertModal').text('Thank you for approval, Now you can settle invoice');
							$('#lockLogo').removeClass('fa-lock');
							$('#lockLogo').addClass('fa-unlock');
							$('#settleApprInvoiceBtn').removeAttr('disabled');
							$('#apprDai').attr('disabled','true');
						}
					}).on('confirmation',(confirmationNumber)=>{
						$('#confirmationMessage').html(confirmationNumber+' of 5 Blocks confirmed');
						if(confirmationNumber === 5){
							resolve();
						}
					}).on('error',(error)=>{
						alert(error);
						reject(error);
					});
				});
			}else{
				$('#apprAlertModal').removeClass('hide');
				$('#apprAlertModal').text('You have already approved DAI tokens for this Smart Invoice');
				$('#lockLogo').removeClass('fa-lock');
				$('#lockLogo').addClass('fa-unlock');
				$('#settleApprInvoiceBtn').removeAttr('disabled');
				$('#apprDai').attr('disabled','true');
			}
			console.log(res);
		})
	}else if(status == 3){
		$('#apprAlertModal').removeClass('hide');
		$('#apprAlertModal').text('Invoice is already settled, Please dont approve DAI tokens');
		$('#apprDai').attr('disabled','true');
	}
}

async function settleInvoice(pAddress,pid) {
	var pContract = new web3.eth.Contract(abi,pAddress);
	var hPid = btoa(pid);
	await pContract.methods.settle().send({
		from:ethereum.selectedAddress
	},function (err,result) {
		if(result){
			$.ajax({
				type: 'POST',
				url: "/invoice/"+hPid+"/settle",
				data: {
					transactionHash: result
				},
				headers: {
					'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
				},
				success: function (data) {
					if(data){
						location.reload();
					}
				}
			});
		}else{
			$('#apprAlertModal').removeClass('hide');
			$('#apprAlertModal').text('You have rejected the settlement');
			console.log('User has rejected the tranasction');
		}
	});
	console.log(pContract);
}

async function getContractAdderss(project,hash) {
	await web3.eth.getTransactionReceipt(hash,function (err,res) {
		//console.log(res);
		if(res){
			contract_address = res.contractAddress;
			$.ajax({
				url:'/project/'+project.id+'/update/contractAddress',
				type:'POST',
				data: {contract_address},
				headers: {
					'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
				},
				success: function (data) {
					console.log(data.project);
					commit(data.project);
				}
			})
		}else{
			userInvoiceError();
			$('#alertBuyerInv').html('Sorry! We coudnt find valid transaction hash, this seems not a valid Invoice');
		}
	});
}


async function getInvTokenBalance(cAddress) {
	var pContract = new web3.eth.Contract(abi,cAddress);
	var uAddress = ethereum.selectedAddress;
	await pContract.methods.balanceOf(uAddress).call({
		from: ethereum.selectedAddress
	},function (err,res) {
		if(res){
			pAmount = web3.utils.fromWei(res.toString(), 'ether');
			if(pAmount >0 ){
				$('input[name="invToken"]').val(pAmount);
				$('input[name="invToken"]').attr('max',pAmount);
				$('.lockLogo').removeClass('fa-lock');
				$('.lockLogo').addClass('fa-unlock');
				$('#redeemTokenBtn').removeAttr('disabled');
			}else{
				$('input[name="invToken"]').val(0);
				$('#redeemTokenBtn').attr('disabled','true');
			}
		}
	});
}
async function redeemInvToken(cAddress,amount) {
	var pContract = new web3.eth.Contract(abi,cAddress);
	pAmount = web3.utils.toWei(amount.toString(), 'ether');
	return new Promise((resolve,reject)=>{
		pContract.methods.redeemInvTokens(pAmount).send({
			from: ethereum.selectedAddress
		}).on('confirmation',(confirmationNumber)=>{
			console.log('transaction is confirmed');
			if(confirmationNumber === 10){
				resolve();
			}
		}).on('error',(error)=>{
			location.reload();
			alert(error);
			reject(error);
		});
	});
}

async function getDaiBalance(uAddress){
	var n = await checkNetwork();
	if(n.networkId == 1){
		var daiCAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
	}else if(n.networkId == 42){
		var daiCAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
	}else{
		return 0;
	}
	var daiContract  = new web3.eth.Contract(daiABI,daiCAddress);
	return await daiContract.methods.balanceOf(uAddress).call({
		from: ethereum.selectedAddress
	});
}

function GetNetwork(networkId,daiCAddress) {
  // `this` is the instance which is currently being created
  this.networkId =  networkId;
  this.daiCAddress = daiCAddress;
  // No need to return, but you can use `return this;` if you want
}

async function checkNetwork() {
	n = ethereum.networkVersion;
	var network;
	if(n == 1){
		network = new GetNetwork(1,'0x6B175474E89094C44Da98b954EedeAC495271d0F');
		console.log('You are conneceted to mainnet');
	}else if(n == 3){
		network = new GetNetwork(3,'');
		networkInfo('Note: You are currently connected to the Ropsten Testnet');
	}else if(n == 42){
		network = new GetNetwork(42,'0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa');
		networkInfo('Note: You are currently connected to the Kovan Testnet');
	}else if(n == 4){
		network = new GetNetwork(4,'');
		networkInfo('Note: You are currently connected to the Rinkeby Testnet');
	}else if(n == 5){
		network = new GetNetwork(5,'');
		networkInfo('Note: You are currently connected to the Goerli Testnet');
	}else{
		network = new GetNetwork(0,'');
		networkInfo('Note: You are currently connected to the RPC Testnet');
	}
	return network;
}

function test(arg) {
	console.log(arg);
}
