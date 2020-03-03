function userInvoiceError() {
	$('.loader-overlay').hide();
	$('#alertBuyerInv').removeClass('hide');
	$('.invoiceConfirmationModal').modal('hide');
}
function loaderOverlay() {
	$('.loader-overlay').show();
	$('.overlay-loader-image').after('<div class="text-center alert alert-info"><h3>It may take a while!</h3><p>Please wait... your request is processed. Please do not refresh or reload the page.</p><p><span id="confirmationBlock">0</span> Of 10 blocks cofirmed</p><br></div>');
}

function showAlertMessage(msg,interval) {
	$('.loader-overlay').hide();
	$('#alertAllInvoice').removeClass('hide');
	setInterval(function () {
		$('#alertAllInvoice').addClass('hide');
	},interval);
	$('#alertAllInvoice').html(msg);
}

function networkInfo(msg) {
	$('#networkInfo').removeClass('hide');
	$('#networkInfo').html(msg);
}
