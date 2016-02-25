


/**
 * it is designed for the Billing App
 * it saves a single order which contain all the data of the bill
 *
 * the order will be started on the BILL_STARTED Event instead of the ORDER_STARTED event which was used in the QSR APP
 */

var EventEmitter = require('events').EventEmitter;
var Util = require('../util/Util');
var PriceUtil = require('touchpoint-components/util/PriceUtil');

var BillStore = Util.merge({

	_order: null, //we just save one order in this store
	_customer: null, //the customer(s) of the order
	_mailForReceipt: null,
	_receiptMailSent: false, // if the receipt was sent via mail this flag will be set to true
	_rewardValues: null,
	_table: null,
	_numberOfCovers: null,
	_rewardApplied: false, //save weather or not an offer was applied
	_appliedCoupon: null, //the applied coupon
	_payment_id: null,
	_franchisor: null, //the franchisor object from the api which holds some information for the calulation of loyalty points
	_feedbackTemplate: null, //the feedbackTemplate object from the api which holds some information for the feedback metrics

	//if there is no external pos we dont show openTickets in menu // currently we will focus on shops with them
	_hasExternalPOS: false,

	//if customer feedback is turned off we dont show feedback related view components
	_hasLoyaltyFeedback: false,

	//in case we have a pos ticket the bill was started with we save it here for further use
	//otherwise it will stay null
	_posTicket: null,

	//when the tip should be calulated from the subtotal without tax this flag can be set to false
	_tipWithTax: true,

	/** configuration */
	config: {
		/** API stub to register events on */
		apiStub: null
	},

	_splits: [],	//an array to hold the different bill parts for a splitt bill transaction
					// each split is an object like:
					// {
					// 		subtotal: 1000, //amount in cent
					// 		gratuity: 100, //amount in cent
					// 		gratuityRate: 0, //rate as relation (20% would be 0.2)
					// 		payed: false
					// }
	_numberOfBills: null, //save the number of bills that will be saved in the splits array (for easier access)
	_currentBill: null,
	_splitsPayed: 0,
	_payedSubtotal: 0,
	_payedGratuity: 0,
	_payedWithRewards: 0,
	_payedWithOffers: 0,

	_cashToPay: 0, // indicates how much money has to be paid in cash
	_collectedCash: 0,
	_cardToPay: 0, // indicates the sum that has to be payed with card

	_gratuity: 0, //we use our own value since orders can have a gruity when restarted
	_gratuityRate: 0, //we use our own value since orders can have a gruity when restarted

	_deviceActivated: false, // indicates the activation state of the device

	_initialLoggedIn: false, //flag to check if an waiter has logged in at least once before (to trigger actions that should happen only the first time)
	_currentOrderAvailable: false,

	_processingTicketGroup: false, //indicator for group processing - to be sure we know that special stuff is going on
	_currentGroupOrderIndex: null, //save the index of the order from a ticket group that we are currently processing
	_groupedOrders: [], //once an order was started from a ticket group we save it here for further use
						//key will be the ticket_id,
	_groupCashToPay: 0, //we save the cash amount for the whole group so we can use it when collectiong cash for all of the orders at once

	/**
	 * Adopt configuration and register on API stub.
	 * @param  {Object} config configuration file
	 *     example:
	 *         {
	 *             apiStub: myAPIStub,
	 *         }
	 *
	 */
	initialize: function(config) {
		this.config = Util.merge(this.config, config);

		//only if a ApiStub is used
		if (this.config.apiStub) {
			this.config.apiStub.on('BILL_STARTED', this.onBillStarted.bind(this));
			this.config.apiStub.on('BILL_RESTARTED', this.onBillRestarted.bind(this));
			this.config.apiStub.on('BILL_CANCELED', this.onBillCanceled.bind(this));			
			this.config.apiStub.on('BILLS_CANCELED', this.onBillsCanceled.bind(this));			
			this.config.apiStub.on('BILL_CLOSED', this.onBillClosed.bind(this));
			this.config.apiStub.on('CASH_COLLECTED', this.onCashCollected.bind(this)); //this is the callback for the final screen where the collected cash amoutn will be entered by the waiter - is triggered by the adjust_cash_collected squib from the API_stub
			this.config.apiStub.on('ORDER_PAYMENT_COLLECTED_CARD', this.onPaymentCollectedCard.bind(this));
			this.config.apiStub.on('ORDER_PAYMENT_COLLECTED_CASH', this.onPaymentCollectedCash.bind(this));
			this.config.apiStub.on('ORDER_PAYMENT_REFUNDED', this.onPaymentRefund.bind(this));
			this.config.apiStub.on('ORDER_PAYMENT_SIGNATURE_SAVED', this.onSignatureSaved.bind(this));
			this.config.apiStub.on('LOYATLY_RECORDED', this.onLoyaltyRecorded.bind(this));
			this.config.apiStub.on('GRATUITY_ADDED', this.onGratuityAdded.bind(this));
			this.config.apiStub.on('DEVICE_ACTIVATED', this.onDeviceActivated.bind(this));
			this.config.apiStub.on('OFFER_APPLIED', this.onOfferApplied.bind(this));
			this.config.apiStub.on('LOGIN_DONE', this.onLoggedIn.bind(this));
			this.config.apiStub.on('RECEIPT_MAIL_SENT', this.onReceiptMailSent.bind(this));
			this.config.apiStub.on('BILLS_STARTED', this.onGroupedBillStarted.bind(this));
			this.config.apiStub.on('BILLS_CLOSED', this.onGroupedBillClosed.bind(this));
			this.config.apiStub.on('CASH_COLLECTED_MULTIPLE_ORDERS', this.onGroupedBillCashCollected.bind(this));

		}
	},

	/**
	 * resets all internal properties to make sure we can start over again cleanly
	 */
	reset: function(){
		this._order = null;
		this._customer = null;
		this._mailForReceipt = null;
		this._receiptMailSent = false;
		this._table = null;
		this._numberOfCovers = null;
		this._numberOfBills = null;
		this._currentBill = null;
		this._splits = [];
		this._splitsPayed = 0;
		this._payedSubtotal = 0;
		this._payedGratuity = 0;
		this._rewardApplied = false;
		this._appliedCoupon = null;
		this._payment_id = null;
		this._cashToPay = 0;
		this._collectedCash = 0;
		this._cardToPay = 0;
		this._payedWithRewards = 0;
		this._payedWithOffers = 0;
		this._posTicket = null;
		this._gratuity = 0;
		this._gratuityRate = 0;
	},

	resetGroup: function() {
		this._groupedOrders = [];
		this._currentGroupOrderIndex = null;
		this._processingTicketGroup = false;
		this._groupCashToPay = 0;
	},

	resetSplit: function () {
		this._customer = null;
		this._rewardApplied = false;
		this._appliedCoupon = null;
		this._payment_id = null;
	},

	onDeviceActivated: function() {
		this.emit('DEVICE_ACTIVATED');
	},

	/**
	 * function will create a new bill
	 * the answer will trigger the BILL_STARTED event
	 *
	 * @param  {Number} amount            the total amount of the bill in cents
	 * @param  {Number} table             the number/id of the table
	 * @param  {number} numberOfCustomers the number of Covers that will be payed with the bill
	 */
	startBill: function (amount, table, numberOfCustomers){
		this.reset();
		this.config.apiStub.startBill(amount, table, numberOfCustomers);
		this._table = table;
		this._numberOfCovers = numberOfCustomers;
	},

	/**
	 * close a bill after processing is done
	 * @param  {string} order_id
	 */
	closeBill: function (order_id) {
		this.config.apiStub.closeBill(order_id);
	},

	onBillClosed: function (res) {
		this.clearState();
		if (res.errors) {
			this.emit('BILL_CLOSED_ERROR', res);
		} else {
			this.emit('BILL_CLOSED', res);
		}
	},

	/**
	 * cancel the bill
	 * @param  {String} reservation_id the reservation id from the order/bill to cancel
	 */
	cancelBill: function (reservation_id) {
		this.config.apiStub.cancelBill(reservation_id);
	},

	onBillCanceled: function (res) {
		this.clearState();
		if (res.errors) {
			this.emit('BILL_CANCELED_ERROR', res);
		} else {
			this.emit('BILL_CANCELED', res);
		}
	},

	/**
	 * cancel the multiple bills
	 * @param  {Array} array of reservation_ids
	 */
	cancelBills: function (reservationIds) {
		this.config.apiStub.cancelBills(reservationIds);
	},

	onBillsCanceled: function (res) {
		this.clearState();
		if (res.errors) {
			this.emit('BILLS_CANCELED_ERROR', res);
		} else {
			this.emit('BILLS_CANCELED', res);
		}
	},

	/**
	 * 
	 * @param  {Object} ticket object in form
	 * {
	 * 		ticket_id: {String},
	 * 		table:{Number},
	 * 		covers: {Number},
	 * 		totals: {
	 * 			tax: {Number}, //value in cents
	 * 			sub_total: {Number}, //value in cents
	 * 			total: {Number} //value in cents
	 * 		}
	 * }
	 */
	startBillFromTicket: function (ticket) {
		this.reset();
		this.config.apiStub.startBillFromTicket(ticket.ticket_id);
		this._table = ticket.table;
		this._numberOfCovers = ticket.covers;
	},

	/**
	 * save a list of grouped tickets for further processing 
	 * @param  {Array} groupedTickets  
	 */
	setGroupedTickets: function (groupedTickets) {

		var ticket_ids = [];
		for (var i = 0; i < groupedTickets.length; i++) {
			ticket_ids.push(groupedTickets[i].ticket_id); 
		}

		this.config.apiStub.startBillFromTickets(ticket_ids);
		this._processingTicketGroup = true;
	},

	onGroupedBillStarted: function (res) {

		if (res.errors) {
			this.emit('BILLS_STARTED_ERROR', res);
			return;
		}

		this._groupedOrders = res.order;
		this._currentGroupOrderIndex = 0;

		this.emit('BILLS_STARTED', res);
	},

	/**
	 * collect the cash for a whole order group at once
	 * @param  {Number} amount
	 */
	collectCashGroupedOrders: function(amount) {
		var order_ids = [];
		this._groupedOrders.forEach(function(groupedOrder) {		
			// only add the order to the list if it has a payment without card object
			var hasCashPayment = false;
			groupedOrder.payments.forEach(function(payment) {
				if (!payment.card) {
					hasCashPayment = true;
				}
			});
			if (groupedOrder.payments.length === 0 || hasCashPayment) {
				order_ids.push(groupedOrder.order_id); 
			}
		});

		this.config.apiStub.collectCashMultipleOrders(amount, order_ids);
	},

	onGroupedBillCashCollected: function (res) {
		this.emit('CASH_COLLECTED_MULTIPLE_ORDERS', res);
	},

	closeGroupedOrders: function () {

		var order_ids = [];
		for (var i = 0; i < this._groupedOrders.length; i++) {
			order_ids.push(this._groupedOrders[i].order_id); 
		}

		this.config.apiStub.closeBills(order_ids);
			
	},

	onGroupedBillClosed: function (res) {

		if (res.errors) {
			this.emit('BILLS_CLOSED_ERROR', res);
			return;
		}

		this.emit('BILLS_CLOSED', res);
	},

	getCurrentGroupOrderIndex: function() {
		return this._currentGroupOrderIndex;
	},

	setNextGroupOrderIndex: function() {
		let orders = this.getGroupedOrders();

		for (var i = 0; i < orders.length; i++) {
			if (orders[i].pos_ticket && 
				orders[i].order_id !== this._order.order_id &&
				orders[i].pos_ticket.status < Util.TicketStatus.STATUS_PAID) {
				this._currentGroupOrderIndex = i;
				return;
			}
		}
		this._currentGroupOrderIndex = -1;
	},

	getOutstandingGroupOrders: function() {
		let orders = this.getGroupedOrders();
		let outstanding = [];

		for (var i = 0; i < orders.length; i++) {
			if (orders[i].pos_ticket && 
				orders[i].order_id !== this._order.order_id &&
				orders[i].pos_ticket.status < Util.TicketStatus.STATUS_PAID) {
				outstanding.push(orders[i]);
			}
		}
		return outstanding;
	},

	getGroupedOrders: function () {
		return this._groupedOrders;
	},

	isProcessingTicketGroup: function () {
		return this._processingTicketGroup;
	},

	isFinalGroupOrder: function () {
		return this._currentGroupOrderIndex === -1;
		// return !(this._currentGroupOrderIndex < this._groupedOrders.length);
	},

	_updateGroupedOrders: function(order) {
		for (var i = 0; i < this._groupedOrders.length; i++) {
			if (this._groupedOrders[i].order_id === order.order_id) {
				this.setNextGroupOrderIndex();
				this._groupedOrders[i] = order;
			}
		}
	},

	/**
	 * start one of the grouped tickets
	 * @param  {Number} index   index the ticket has in array returned from getGroupedTickets
	 * @return {bool} 			true if a new order was started
	 */
	startBillFromGroupedTickets: function (index) {
		this.reset();

		var currentOrder = this._groupedOrders[index || this._currentGroupOrderIndex]; 
		if(currentOrder){
			this._order = currentOrder;
			this.setNextGroupOrderIndex();
			return true;	
		}else{
			return false;
		}
	},

	getTicket: function () {
		var result = null;
		if(this._order.pos_ticket){
			result = this._order.pos_ticket;
		}
		return result;
	},

	getTickets: function() {
		let orders = [];
		let tickets = [];

		if (this.isProcessingTicketGroup()) {
			orders = this.getGroupedOrders();
		} else if (this._order){
			orders = [this._order];
		}
		
		orders.forEach(function(order) {
			if (order.pos_ticket) {
				tickets.push(order.pos_ticket);
			}
		});
		return tickets;
	},

	onBillStarted: function (res) {

		if (res.errors) {
			this.emit('BILL_STARTED_ERROR', res);
			return;
		}

		this._order = res.order;

		this.emit('BILL_STARTED', res);
	},

	/**
	 * Returns the total due without gratuity
	 * @return {String} subtotal
	 */
	getBillSubtotal: function(){
		if(this._order){
			return parseInt(this._order.total_due);
		}

		return '';
	},

	/**
	 * return the remaining subtotal
	 * @return {Number} [description]
	 */
	getRemainingSubtotal: function(){
		if(this._order){
			return Math.round(this._order.total_due - this._payedSubtotal);
		}
		return 0;
	},

	/**
	 * Returns the remaining subtotal in split bills
	 * @return {Number} remaining due
	 */
	getBillRemaining: function(){
		var remaining = 0;
		this._splits.forEach(function(split) {
			if (!split.payed) {
				remaining += parseInt(split.subtotal);
			}
		});
		return remaining;
	},

	setBillSubtotal: function(subtotal) {
		//if we are in a split bill we also update the splits
		if(this.isSplitBill() && !this.isFinalSplitBill() && this._currentBill !== null){

			//if somebody wants to pay more than the open bill amount we set it to the max automaticly
			if(this._order.total_due - this._payedSubtotal < subtotal){
				subtotal = this._order.total_due - this._payedSubtotal;
			}

			this._splits[this._currentBill].subtotal = subtotal;

			var remaining = this._order.total_due - this._payedSubtotal - subtotal;
			var otherOpenBills = this._numberOfBills - this._splitsPayed - 1;
			var lastOpenBill = null;
			var remainingPerOpenBill = Math.floor(remaining / otherOpenBills);
			var rest = remaining - (remainingPerOpenBill * otherOpenBills);

			for (var i = this._numberOfBills - 1; i >= 0; i--) {
				//we update all bills that are not payed already but the current bill
				if(i !== this._currentBill && !this._splits[i].payed){
					lastOpenBill = i;
					this._splits[i].subtotal = remainingPerOpenBill;
				}
			}

			this._splits[lastOpenBill].subtotal += rest;

			this._fixGratuityInSplits();
		}

	},

	/**
	 * returns the tax set for the bill
	 * splits the tax propotionaly in splits
	 * @return {Number} tax in cents
	 */
	_getTax: function () {
		if(this.getTicket()) {
			var totalTax = this.getTicket().totals.tax;
			
			if(this.isSplitBill()){
				var propotion = this.getCurrentSubtotal() / this.getBillSubtotal();
				return Math.round(totalTax * propotion);
			}

			return totalTax;
		}

		return 0;
	},

	/**
	 * when the bill amount is changed and in a split the other splits have to recalulate their gratuity according to their gratuity rate
	 * this will happen here
	 */
	_fixGratuityInSplits: function () {
		for (var i = this._splits.length - 1; i >= 0; i--) {
			if(!this._splits[i].payed){
				this._splits[i].gratuity = this._calculateGratuityOfGratuityRate(this._splits[i].subtotal, this._splits[i].gratuityRate);
			}
		}
	},

	/**
	 * sets the number of bills that have to be created in a splitt bill transaction
	 * @param {Number} numberOfBills   the number of bills
	 */
	setSplittedBills: function(numberOfBills){
		this._numberOfBills = parseInt(numberOfBills);

		var splittedAmount = this.getSplittedBillAmount();

		//lets reset the splits before we go on
		this._splits = [];

		for (var i = numberOfBills - 1; i >= 0; i--) {
			this._splits.push({
				subtotal: splittedAmount,
				payed: false,
				gratuity: 0,
				gratuityRate: 0
			});
		}

		if(numberOfBills > 1){
			//lets make sure we have no rest that is missing and we can put it on top the last bill
			var rest = this.getBillTotal() - this.getSplittedBillAmount() * this._numberOfBills;
			this._splits[numberOfBills - 1].subtotal += rest;
		}
	},

	/**
	 * sets the index to the bill we are currently processing
	 * @param {Number} the index of the bill in the bill arrays u get in getSplittedBills()
	 */
	setCurrentBill: function (index){
		this._currentBill = index;
		//reset the customer - so a new one can log in to pay and use his offers ...
		this.resetSplit();
	},

	/**
	 * unseting the current bill if taking back the selection
	 * this might be important for example for the isFinalSplitBill method
	 */
	unsetCurrentBill: function () {
		this._currentBill = null;
	},

	/**
	 * in a splitt bill use case get the amount of the current bill
	 * @return {Number} [description]
	 */
	getCurrentBillTotal: function(){

		if(this._currentBill !== null){
			return parseInt(this._splits[this._currentBill].subtotal) + parseInt(this._splits[this._currentBill].gratuity) - this.getCurrentCuponAmount();
		}

		return '';
	},

	/**
	 * in a splitt bill use case get card used to make last payment
	 * @return {Object} A card used to make a payment
	 */
	getCurrentBillCard: function(){

		if(this._currentBill !== null){
			return this._splits[this._currentBill].card;
		}

		return null;
	},

	getOrder: function() {
		return this._order;
	},

	/**
	 * getter for the creation time of the current order
	 * @return {Number} timestamp of the order
	 */
	getOrderTime: function(){
		return this._order.cr_date;
	},

	getCovers: function() {
		return this._numberOfCovers;
	},


	/**
	 * the gratuity rate of the current split bill
	 * @return {Number} the gratuity rate as absolute relation (e.g. it returns 0.01 which means 1%)
	 */
	getCurrentGratuityRate: function(){
		if(this._currentBill !== null){
			return this._splits[this._currentBill].gratuityRate;
		}

		return '';
	},


	getCurrentSubtotal: function () {
		if(this._currentBill !== null){
			return this._splits[this._currentBill].subtotal;
		}

		return 0;
	},

	getCurrentGratuity: function () {
		if(this._currentBill !== null){
			return this._splits[this._currentBill].gratuity;
		}

		return 0;
	},

	/**
	 * if an cupon was applied to a split this will return the amount of its value or 0 if no cupon was applies
	 * @return {Number}  the amount
	 */
	getCurrentCuponAmount: function () {
		if(this._currentBill !== null){
			if( this._splits[this._currentBill].coupon){
				return parseInt(this._splits[this._currentBill].coupon.amount);
			}
		}

		return 0;
	},

	/**
	 * if an cupon was applied to a this will return the amount of its value or 0 if no cupon was applies
	 * @return {Number}  the amount
	 */
	getCuponAmount: function () {
		if(this._appliedCoupon){
			return parseInt(this._appliedCoupon.amount);
		}

		return 0;
	},


	getCurrentBill: function() {
		return this._currentBill;
	},

	/**
	 * returns the average value that has to be paid in each bill
	 * @return {[type]} [description]
	 */
	getSplittedBillAmount: function(){
		return Math.floor(this.getBillTotal() / this._numberOfBills);
	},

	/**
	 * returns an array of bills
	 * @return {Array} 		an Array of Bills like e.g. {subtotal: 1010,
	 *                      							 payed: false,
	 *                      							 gratuity: 230}
	 */
	getSplittedBills: function() {
		return this._splits;
	},

	/**
	 * return the bills as an array even in single pay case
	 * objects of this array have the following strucutre:
	 *  * {
	 * 	subtotal: 1200,
	 * 	gratuity: 230,
	 * 	gratuityRate: 0.3,
	 * 	card: {
	 * 		logo: 'VISA',
	 * 		accountNumber: '*****4567'
	 * 	},
	 * 	coupon: {
	 * 		amount: 100,
	 * 		reward_id: 5 //optional: present for offers
	 * 	}
	 * }
	 * @return {Array} An Array of Bills
	 */
	//@TODO check me for usage i think i can be deleted
	getBills: function() {
		if(this.isSplitBill()){

			var payedSplits = [];
			this.getSplittedBills().forEach(function(split) {
				if (split.payed) {
					payedSplits.push(Util.clone(split));
				}
			});

			return payedSplits;
		}else{
			var order = Util.clone(this._order);
			order.coupon = this.getAppliedCoupon();
			order.gratuity = this._gratuity;
			return [order];
		}
	},

	getNumberOfSplitsPayed: function() {
		return this._splitsPayed;
	},

	/**
	 * returns true if we are in a splitt bill
	 * @return {Boolean} u have 3 guesses ^^
	 */
	isSplitBill: function() {
		return this._splits.length !== 0;
	},

	/**
	 * returns true if we are in a splitt bill AND one of the splits is currently selected
	 * @return {Boolean} 
	 */
	isProcessingSplit: function() {
		return this.isSplitBill() && this.getCurrentBill() !== null;
	},

	/**
	 * returns a true if the current bill is the last bill in the split bill payment
	 * @return {Boolean} see desc
	 */
	isFinalSplitBill: function() {

		if(!this.isSplitBill() || this._currentBill === null){
			return false;
		}


		//if the bills are totaly payed we also asume we are in the final step
		//this of cause can only happen after payment
		if(parseInt(this._payedSubtotal) === parseInt(this._order.total_due)){
			return true;
		}

		//if the current bill is payed we have to count in a different way
		if(this._splits[this._currentBill].payed){
			return this._splitsPayed >= this._splits.length;
		}else{
			return this._splitsPayed >= this._splits.length - 1;
		}


	},

	/**
	 * instead of returning the preset gratuity this returns the actually gratuity payed this can be different in splits where everybody can change his part of the grautity
	 */
	getPayedGratuity: function() {
		var gratuity = 0;

		if(this.isSplitBill()){
			this._splits.forEach(function(split) {
				if (split.payed) {
					gratuity += parseInt(split.gratuity);
				}
			});
		}else{
			gratuity = this.getGratuity();
		}

		return gratuity;
	},

	/**
	 * Returns the total due including gratuity
	 * @return {Number} total due
	 */
	getBillTotal: function(){

		if(this._order){

			return parseInt(this._order.total_due) + parseInt(this._gratuity || 0) - parseInt(this._payedWithOffers) - parseInt(this._payedWithRewards);
		}
		return '';
	},

	/**
	 * last card used to pay
	 * @return {Object} last card used to pay
	 */
	getBillCard: function(){

		if(this._order){

			return this._order.card;
		}
		return null;
	},

	/**
	 * Returns the value, that hast to be payed including gratuity and coupons
	 * @return {Number} payed total
	 */
	getPayedTotal: function() {
		return parseInt(this.getBillSubtotal()) + parseInt(this.getPayedGratuity()) - parseInt(this.getAppliedOffersAmount()) - parseInt(this.getAppliedRewardsAmount());
	},

	getLoyaltyPointsEarned: function(){

		if(this._rewardValues && this._rewardValues.points){
			return this._rewardValues.points;
		}

		return '';
	},

	/**
	 * get the number of the table  for the actual bill
	 * @return {Number} table number
	 */
	getBillTableNumber: function() {
		return this._table;
	},

	/**
	 * Sets gratuity and gratuity rate based on total due
	 * if a split bill is started by setSplittedBills(numberOfSplits) also the grautuity of each split is calulated for further use
	 * @param {Number} gratuityRate  the gratuity rate as relation (if u want to pass 11% gratuityRate should be 0.11)
	 */
	setGratuityRate: function(gratuityRate) {

		if (this._order && gratuityRate >= 0) {
			this._gratuityRate = gratuityRate;
			this._gratuity = this._calculateGratuityOfGratuityRate(this._order.total_due, this._gratuityRate);
		}

		//if we are in a split bill we also update the splits
		if(this.isSplitBill()){
			for (var i = this._splits.length - 1; i >= 0; i--) {
				this._splits[i].gratuity = this._calculateGratuityOfGratuityRate(this._splits[i].subtotal, gratuityRate);
				this._splits[i].gratuityRate = gratuityRate;
			}
		}
	},


	/**
	 * calculates the gratuity by a given gratuity rate and a subtotal
	 * @param  {Number} subtotal     subtotal in cents
	 * @param  {Number} gratuityRate rate as float (0.22 equlas 22%)
	 * @return {Number}              gratuity in cent
	 */
	_calculateGratuityOfGratuityRate: function (subtotal, gratuityRate) {
		if(this.getTicket() && !this.hasTipWithTax()){
			var subtotalWihtoutTax = subtotal - this._getTax();
			return PriceUtil.calculateValueOfRate(subtotalWihtoutTax, gratuityRate);
		}else{
			return PriceUtil.calculateValueOfRate(subtotal, gratuityRate);
		}
		
	},

	/**
	 * calculates the gratuity by a given gratuity rate and a subtotal
	 * @param  {Number} subtotal     subtotal in cents
	 * @param  {Number} gratuity 	 gratuity in cent
	 * @return {Number}              rate as float (0.22 equlas 22%)
	 */	
	_calculateGratuityRateOfGratuity: function (subtotal, gratuity) {
		if(this.getTicket() && !this.hasTipWithTax()){
			var subtotalWihtoutTax = subtotal - this._getTax();
			return PriceUtil.calculateRateOfValue(subtotalWihtoutTax, gratuity);
		}else{
			return PriceUtil.calculateRateOfValue(subtotal, gratuity);
		}
	},

	/**
	 * Returns the gratuityrate of the order
	 * @return {Number} gratuityrate
	 */
	getGratuityRate: function() {
		if (this._order) {
			return this._gratuityRate || 0;
		}
		return 0;
	},

	getGratuity: function() {
		if (this._order) {
			return parseInt(this._gratuity) || 0;
		}
		return 0;
	},

	/**
	 * sets the gratuity of the current split in a split bill use case
	 * @param {[type]} gratuity [description]
	 */
	setCurrentGratuity: function (gratuity){

		if(this._currentBill !== null){

			this._splits[this._currentBill].gratuity = gratuity;
			this._splits[this._currentBill].gratuityRate = this._calculateGratuityRateOfGratuity(this._splits[this._currentBill].subtotal , gratuity);
		}
	},

	setCurrentGratuityRate: function (gratuityRate){

		if(this._currentBill !== null && !isNaN(this._gratuity)){
			var newGratuity = this._calculateGratuityOfGratuityRate(this._splits[this._currentBill].subtotal, gratuityRate);
			var newgratuityRate = gratuityRate;

			this._splits[this._currentBill].gratuity = newGratuity;
			this._splits[this._currentBill].gratuityRate = newgratuityRate;
		}
	},

	/**
	 * sets the Gratuity for an order, if we are in a split bill wich was started with setSplittedBills(number) also the gratuity of the splits will be calulated for further use
	 * @param {Number} gratuity  the gratuity in cents
	 */
	setGratuity: function(gratuity) {
		
		if (this._order) {
			this._gratuity = gratuity;
			this._gratuityRate = this._calculateGratuityRateOfGratuity(this._order.total_due, this._gratuity);
		}

		if(this.isSplitBill()){

			for (var i = this._splits.length - 1; i >= 0; i--) {
				this._splits[i].gratuity = this._calculateGratuityOfGratuityRate(this._splits[i].subtotal, this._gratuityRate);
				this._splits[i].gratuityRate = this._gratuityRate;
			}
		}

	},

	/**
	 * sends the gratuity that was set via setGratuityRate to the server so the bill data will be updated there
	 *
	 * THIS METHOD DOES NOTHING CURRENTLY - THE GRATUITY WILL BE SENT ON PAYMENT
	 */
	sendGratuity: function() {
		//this.config.apiStub.setGratuity(this._order.order_id ,this.getGratuity());

		//we just skip the stuff
		this.onGratuityAdded();
	},

	/**
	 * Callback for adding gratuity on server.
	 * @param {Object} res Server response
	 */
	onGratuityAdded: function(res) {
		this.emit('GRATUITY_ADDED', res);
	},

	/**
	 * get the ballnce of the current customer if there is one ^^
	 * @return {Number} the ballence
	 */
	getLoyaltyPointsBalance: function(){

		if(this._rewardValues){
			return this._rewardValues.balance;
		}

		return '';
	},

	/**
	 * calulates the split id to use for API calls
	 * takes in account which split is currently selected & if there are payments (means splits) in older iterations in case of bill restarting
	 * @return {Number} 
	 */
	_getSplitId: function () {
		//in bill restart case lets check for splitids in the existing payments
		var splitOffset = 0;
		this._order.payments.forEach(function(payment) {
			if (parseInt(payment.split_id) <= splitOffset) {
				splitOffset = parseInt(payment.split_id) + 1;
			}
		});

		//if we are in a splitcase we make sure we take this into account too
		var currentSplitId = this._currentBill || 0;

		return currentSplitId + splitOffset;
	},

	/**
	 * tells teh box that the given bill was payed in cash
	 */
	payCash: function(){
		var splitId = this._getSplitId();
		if(this.isSplitBill() && this._currentBill !== null){
			this.config.apiStub.payCash(this._order.order_id, this._splits[this._currentBill].subtotal - this.getCurrentCuponAmount(), this._splits[this._currentBill].gratuity, splitId);
		} else {
			this.config.apiStub.payCash(this._order.order_id,this._order.total_due - this.getCuponAmount(),this._gratuity, splitId);
		}
	},

	refundPayment: function(payment_id, amount) {
		this.config.apiStub.refundPayment(this._order.order_id, payment_id, amount);
	},

	onPaymentRefund: function(res) {
		if (res.errors) {
			this.emit('ORDER_REFUNDING_FAILED', res.errors);
		}

		this.emit('ORDER_PAYMENT_REFUNDED', res);
	},

	getCashToPay: function() {
		return this._cashToPay;
	},

	getGroupCashToPay: function () {
		return this._groupCashToPay;
	},

	getAppliedOffersAmount: function () {
		return this._payedWithOffers;
	},

	getAppliedRewardsAmount: function () {
		return this._payedWithRewards;
	},


	setCollectedCash: function(cash) {
		this._collectedCash = cash;
		this.config.apiStub.collectCash(cash,this._order.order_id);
	},

	getCollectedCash: function() {
		return this._collectedCash;
	},

	/**
	 * pays the current bill / split with credit card
	 * update the sum that has to be payed with cash
	 * @param {String} raw_data the data fetched from the credit card reader
	 */
	processPayment: function(raw_data) {
		var order_id, amount, gratuity, allow_partial;
		var split_id = this._getSplitId();
		if(this.isSplitBill() && this._currentBill !== null){
			order_id = this._order.order_id;
			amount = this._splits[this._currentBill].subtotal - this.getCurrentCuponAmount();
			gratuity = this._splits[this._currentBill].gratuity;
		}else{
			order_id = this._order.order_id;
			amount = this._order.total_due - this.getCuponAmount();
			gratuity = this._gratuity;
		}
		allow_partial = false;

		this.config.apiStub.processPayment(order_id, amount, gratuity, raw_data, split_id, allow_partial);
	},

	saveSignature: function(signature) {
		if (this._payment_id !== null) {
			this.config.apiStub.processPaymentSignature(this._order.order_id, this._payment_id, signature);
		}
	},

	onSignatureSaved: function(res) {
		if (res.errors) {
			this.emit('ORDER_PAYMENT_SIGNATURE_ERROR', res);
		} else {
			this.emit('ORDER_PAYMENT_SIGNATURE_SAVED', res);
		}
	},

	/**
	 * Returns the value that has to be payed with card for the whole order
	 * @return {Number}
	 */
	getCardToPay: function() {
		return this._cardToPay;
	},

	/**
	 * updates all the data that needs to be updated when a split is payed
	 */
	_updateSplit: function() {
		if(!this._splits[this._currentBill].payed){
			this._splitsPayed ++;
		}
		this._splits[this._currentBill].payed = true;
		this._payedSubtotal += parseInt(this._splits[this._currentBill].subtotal - this.getCurrentCuponAmount());
		this._payedGratuity += parseInt(this._splits[this._currentBill].gratuity);
	},

	/**
	 * pay a part of the bill with reward points
	 * @param  {int} amount   the amount of cents/rewardpoints that will be paid
	 * recalculates the split or bill subtotal when an offer was applied
	 * @param  {int} amount    the amount in cents
	 */
	_calulateRewardAmount: function(amount){
		if(this.isSplitBill() && this._currentBill !== null){
			if(this._splits[this._currentBill].subtotal < amount){
				return;
			}

			this._payedSubtotal += parseInt(amount);
		}
	},

   /**
	 * checks wich type of Coupon we have and applies it to the offer
	 * @param  {Object} Coupon   an Coupon that was previously fetched by getCoupons
	 */
	applyCoupon: function(coupon){

		var split_id = this._getSplitId();

		if(coupon.reward_id === undefined){
			this.config.apiStub.applyRewardPoints(this._order.order_id,coupon.amount,this._customer.base,split_id);
			this._payedWithRewards += parseInt(coupon.amount);
		}else{
			this.config.apiStub.applyOffer(this._order.order_id,this._customer.base,coupon.reward_id,split_id);
			this._payedWithOffers += parseInt(coupon.amount);
		}

		if(this._splits[this._currentBill]){
			this._splits[this._currentBill].coupon = coupon;
		}

		this._calulateRewardAmount(coupon.amount);
		this.setAppliedCoupon(coupon);
	},

	/**
	 * set the coupon that is applied to the bill or current split
	 * @param {Object} coupon coupons returned by the from the getCoupons method
	 */
	setAppliedCoupon: function(coupon) {
		this._rewardApplied = true;
		this._appliedCoupon = coupon;
	},

	getAppliedCoupon: function() {
		return this._appliedCoupon;
	},

	/**
	 * returns all reward point Coupons and offers in one array
	 * @return {Array}  see getOffers and getRewardPointCoupons methods
	 */
	getCoupons: function() {
		return this.getOffers().concat(this.getRewardPointCoupons());
	},

	/**
	 * returns all offers for the logged in customer that can be applied
	 * @return {Array} of Coupons like
	 *                          {
	 *                              amount: 200,
	 *                              reward_id: 12,
	 *                              name: '$2 Discount',
	 *                              description: 'on bill $2 or more',
	 *                              end_comps: {
	 *                                  timestamp: Date.now() + 1000 * 60 * 60 * 24 * 3
	 *                              }
	 *                          }
	 */
	getOffers: function() {
		if(this._customer && this._customer.order_offers){

			if(this.isSplitBill()){
				return this.getOffersForSplit();
			}else{
				return this._customer.order_offers;
			}
		}

		return [];
	},

	/**
	 * filters the offers for the current split (only call this in a split)
	 * it filters all the offer coupons that are to large for the split an shows only the apllicable coupons
	 * @return {Array} of Coupons like
	 *                          {
	 *                              amount: 200,
	 *                              reward_id: 12,
	 *                              name: '$2 Discount',
	 *                              description: 'on bill $2 or more',
	 *                              end_comps: {
	 *                                  timestamp: Date.now() + 1000 * 60 * 60 * 24 * 3
	 *                              }
	 *                          }
	 */
	getOffersForSplit: function () {

		var result = [];

		for (var i = 0; i < this._customer.order_offers.length; i++) {
			if(this._customer.order_offers[i].min_bill_amount <= this._splits[this._currentBill].subtotal){
				result.push(this._customer.order_offers[i]);
			}
		}

		return result;
	},

	/**
	 * returns a coupon that the user can earn sometime in the futur (usually its shown in as "disabled" if no couponis available)
	 * @return {Object} th coupon:
	 *                          {
	 *                              amount: 200,
	 *                              name: '$2 Discount',
	 *                              description: 'on bill $2 or more',
	 *                              end_comps: {
	 *                                  timestamp: Date.now() + 1000 * 60 * 60 * 24 * 3
	 *                              }
	 *                          }
	 */
	getDefaultCoupon: function() {
		var amount = 200; //this should be the same as the minimal amount from getRewardPointCoupons

		return {
			amount: amount,
			name: '$' + amount / 100 + ' Discount',
			description: 'on bill $' + amount / 100 + ' or more'

		};
	},

	/**
	 * returns the biggest rewardpoint coupon that is available with the current balance (regardless of the currents bill size)
	 * @return {Object} th coupon:
	 *                          {
	 *                              amount: 200,
	 *                              name: '$2 Discount',
	 *                              description: 'on bill $2 or more',
	 *                              end_comps: {
	 *                                  timestamp: Date.now() + 1000 * 60 * 60 * 24 * 3
	 *                              }
	 *                          }
	 */
	getMaxRewardPointCoupon: function () {

		var minAmount = 200;

		if(this._rewardValues.balance < minAmount){
			return null;
		}

		var amount = minAmount; //if u change this make sure getDefaultCoupon returns the same coupon
		var step = 300;

		while (this._rewardValues.balance >= amount + step) {

			amount += step;

			if(amount >= step * 10){
				step = step * 10;
			}//here some steps are hardcoded to have round values
			else if(amount >= 2000 && step < 1000){
				step = 1000;
			}else if(amount >= 500 && step < 500){
				step = 500;
			}
		}

		return {
			amount: amount,
			name: '$' + amount / 100 + ' Discount',
			description: 'on bill $' + amount / 100 + ' or more'
		};
	},

	/**
	 * calculates a number of reward point Coupons that are applicable to the current bill
	 * @return {Array}  with an Coupon Objects like:
	 *                      	{
	 *				        		amount: 200,
	 *								name: '$2 Discount',
	 *								description: 'on bill $2 or more',
	 *								end_comps: {
	 *									timestamp: Date.now() + 1000 * 60 * 60 * 24 * 3
	 *								}
	 *							}
	 */
	getRewardPointCoupons: function() {

		if(this._customer == null){
			return [];
		}

		var Coupons = [];

		var amount = 200; //if u change this make sure getDefaultCoupon returns the same coupon
		var step = 300;

		while (this._rewardValues.balance >= amount) {

			Coupons.push({
				amount: amount,
				name: '$' + amount / 100 + ' Discount',
				description: 'on bill $' + amount / 100 + ' or more'
			});

			amount += step;

			if(amount >= step * 10){
				step = step * 10;
			}//here some steps are hardcoded to have round values
			else if(amount >= 2000 && step < 1000){
				step = 1000;
			}else if(amount >= 500 && step < 500){
				step = 500;
			}
		}

		return Coupons;
	},

	/**
	 * on a bill (or split) the discount on a feature bill will be calulated
	 * @return {Number} discount in cent
	 */
	getRewardAmount: function() {

		var subtotal;

		if(this.isSplitBill()){
			subtotal = this.getCurrentSubtotal();
		}else{
			subtotal = this.getBillSubtotal();
		}

		return Math.floor(Math.floor(subtotal * parseFloat(this._franchisor.loyalty_points_for_purchase_factor)) * parseFloat(this._franchisor.loyalty_points_price_factor));

	},


    onOfferApplied: function (res) {
		if (res.errors) {
			this.emit('OFFER_APPLIED_ERROR', res);
		} else {
			this.emit('OFFER_APPLIED', res);
		}
    },

	isLoggedIn: function () {
		return this._customer !== null;
	},

	getPhoneNumber: function() {
		return this.isLoggedIn() && this._customer.phone;
	},

	rewardPointsApplied: function() {
		return this._rewardApplied;
	},

	isBillPayed: function() {
		return this.getRemainingSubtotal() === 0;
	},

	/**
	 * Callback for regtistering card payments collection on server.
	 * @param {Object} res Server response
	 */
	onPaymentCollectedCard: function(res){

		// If there is an errors array, payment failed before attempting to process.
		if (res.errors !== undefined || res.response === undefined) {
			this.emit('ORDER_PAYMENT_FAILED', res);
			return;
		}

		// creditCardResponse is a CreditPaymentResponse (see: http://c1.tp-devel.com/admin/apidocs/class_credit_payment_response.html) 
		// it will only be found on responses for credit payments
		var creditCardResponse = res.response;

		if (creditCardResponse.status === Util.CreditPaymentResponse.STATUS_FAILED) {
			this.emit('ORDER_PAYMENT_FAILED', {errors: [creditCardResponse.msg]});
			return;
		}

		this._payment_id = creditCardResponse.payment_id;

		if (this.isSplitBill() && this._currentBill !== null){
			this._updateSplit();
			this._splits[this._currentBill].card = creditCardResponse.payment.card;
			this._splits[this._currentBill].partial_approval = creditCardResponse.payment.partial_approval;
		} else {
			this._payedSubtotal = parseInt(this._order.total_due);
			this._order.card = creditCardResponse.payment.card;
			this._order.partial_approval = creditCardResponse.payment.partial_approval;
		}

		// need to use how much was actually collected in case
		// of a partial approval
		this._cardToPay += creditCardResponse.payment.amount;

		// lets update the payments of orders and tickets to indicate its payment state
		this._updateGroupedOrderPayments(creditCardResponse.order);
		this._updateTicketPayments(creditCardResponse.order.pos_ticket);


		this.emit('ORDER_PAYMENT_COLLECTED', creditCardResponse);
	},

	/**
	 * Callback for regtistering payments collection on server.
	 * @param {Object} res Server response
	 */
	onPaymentCollectedCash: function(res){

		// If there is an errors array, payment failed before attempting to process.
		if (res.errors !== undefined) {
			this.emit('ORDER_PAYMENT_FAILED', res);
			return;
		}

		this._payment_id = res.payment_id;

		var cashToPay = 0;
		if (this.isSplitBill() && this._currentBill !== null){
			this._updateSplit();
			cashToPay = this.getCurrentBillTotal();
		} else {
			this._payedSubtotal = parseInt(this._order.total_due);
			cashToPay = this.getBillTotal();
		}
		this._cashToPay += cashToPay;

		if(this.isProcessingTicketGroup()){
			this._groupCashToPay += cashToPay;
		}

		// lets update the payments of orders and tickets to indicate its payment state
		this._updateGroupedOrderPayments(res.order);
		this._updateTicketPayments(res.order.pos_ticket);
		

		this.emit('ORDER_PAYMENT_COLLECTED', res);
	},

	/**
	 * we need to update the payments of group orders to determine if we should include it later for group pay cash adjustments
	 * @param  {Object} order
	 */
	_updateGroupedOrderPayments(order) {
		var groupedOrders = this.getGroupedOrders();
		groupedOrders.forEach(function(groupedOrder) {
			if (groupedOrder.order_id === order.order_id) {
				groupedOrder.payments = order.payments;
			}
		});
	},

	_updateTicketPayments(pos_ticket) {
		if (pos_ticket) {
			var tickets = this.getTickets();
			tickets.forEach(function(ticket) {
				if (ticket.ticket_id === pos_ticket.ticket_id) {
					ticket.status = pos_ticket.status;
					ticket.payments = pos_ticket.payments;
					ticket.has_cash = pos_ticket.has_cash;
					ticket.has_credit = pos_ticket.has_credit;
				}
			});
		}
	},

	//--------------------------------------------------------------------------------------------------------------------------------
	//from here on we handle the loyalty reward things
	//maybe it would be a better idea to create e seperate store for it
	//for now we decided to leave everything here - if somebody looses the overview - shout and well change it
	//--------------------------------------------------------------------------------------------------------------------------------

	/**
	 * @return {Object}		an feedback object with most values 0 or null but with the names of the metrics see: http://c1.tp-devel.com/admin/apidocs/class_loyalty_feedback.html
	 */
	getFeedbackTemplate: function() {
		return Util.clone(this._feedbackTemplate);
	},

	/**
	 * returns customer feedback to the box for an visit -- the asset_id of the visit will be passed as get param and added to the few automaticly
	 * - used in loyaltyPhonoe/LoyaltyPhone related to a "visit"
	 * @param  {Object} payload    optional: object with addidtional information for the call
	 */
	giveFeedback: function(payload) {
		this.config.apiStub.giveFeedback({
											o: this._order.order_id,
											payment_id: this._payment_id
										},
										payload);
	},


	/**
	 * record the visit of a customer who gave (or will give) feedback to earn reward points
	 * the customer is identified by his phone number
	 * @param  {String} phoneNumber the phonenumber Oo
	 */
	recordLoyalty: function(phoneNumber){
		if(this._payment_id !== null){
			this.config.apiStub.recordLoyalty(2,phoneNumber,this._order.order_id,this._payment_id);
		}else{
			this.config.apiStub.recordLoyalty(2,phoneNumber,this._order.order_id);
		}
	},

	onLoyaltyRecorded: function(res){

		if (res.errors) {
			this.emit('LOYATLY_RECORDED_ERROR', res);
			return;
		}
		this._customer = res.customer;
		this._rewardValues = res.values;

		this.emit('LOYATLY_RECORDED', res);
	},

	setMailForReceipt: function(mail) {
		this._mailForReceipt = mail;
	},

	getMailForReceipt: function() {
		return this._mailForReceipt;
	},

	/**
	 * This function can send the receipt of the actual order and payment by passing a mail address.
	 * @param  {String} mail
	 */
	sendReceiptMail: function(mail) {
		this._receiptMailSent = false;
		this.config.apiStub.sendReceiptMail(mail, this._order.order_id, this._payment_id);
	},

	onReceiptMailSent: function(res) {

		if (res.errors) {
			this.emit('RECEIPT_MAIL_ERROR', res);
			return;
		}
		this._receiptMailSent = true;
		this._mailForReceipt = null;
		this.emit('RECEIPT_MAIL_SENT', res);
	},

	getReceiptMailSent: function() {
		return this._receiptMailSent;
	},

	login: function(pin) {
		this.config.apiStub.login(pin);
	},

	onLoggedIn: function(res) {

		var currentOrderClosed = false;

		if (res.errors) {
			this.emit('LOGIN_ERROR', res);
		} else {
			this._franchisor = res.franchisor;
			this._feedbackTemplate = res.feedback_template;
			this._hasExternalPOS = res.location.has_external_pos;
			this._tipWithTax = res.location.calculate_tip_with_tax;
			this._hasLoyaltyFeedback = res.franchisor.loyalty_feedback_on;
			
			if (this._initialLoggedIn === false) {
				this._currentOrderAvailable = this._checkForOpenOrder(res);
				this._initialLoggedIn = true;
			}

			currentOrderClosed = this._isCurrentOrderClosed(res);

			// we throw an error event the current order was closed from the pos, login done otherwise
			if (this._initialLoggedIn === true && currentOrderClosed) {
				this.emit('EXTERNAL_PAYMENT_CURRENT_ORDER');
			}
			
			this.emit('LOGIN_DONE', res);
		}
	},

	/**
	 * We check if currentOrder is present and has the same id as the stored order 
	 * @param  {Object} res object returned by apiStub.login
	 * @return {Boolean} true if open order is present, false otherwise
	 */
	_checkForOpenOrder: function(res) {
		var storedOrder = this.getStoredOrder();
		if (storedOrder && res && res.curr_order && res.curr_order.order_id === storedOrder.order_id) {
			return true;
		}

		//handle multiple folio case
		if(storedOrder && res && res.curr_order && typeof res.curr_order === 'object') {
			for (var i = 0; i < res.curr_order.length; i++) {
				if(res.curr_order[i] && res.curr_order[i].order_id && res.curr_order[i].order_id === storedOrder.order_id){
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * Returns true if res.curr_order is not set or mod_date is different to this._order
	 * @param  {Object} res - object returned by apiStub.login
	 * @return {Boolean} true if this order was paid at an external pos
	 */
	_isCurrentOrderClosed: function(res) {
		return res.curr_order === undefined || this._order !== null && this._order.mod_date < res.curr_order.mod_date;
	},

	hasCurrentOrder: function() {
		return this._currentOrderAvailable;
	},

	hasExternalPOS: function() {
		return this._hasExternalPOS;
	},

	hasTipWithTax: function () {
		return this._tipWithTax;
	},

	hasLoyaltyFeedback: function() {
		return this._hasLoyaltyFeedback;
	},
	/**
	 * returns weather the loyatly programm is turned on or off in the admin panel
	 * @return {bool} 
	 */
	showLoyalty: function() {
		return parseInt(this._franchisor.loyalty_type) === Util.LoyaltyType.TYPE_POINTS;
	},

	onCashCollected: function(res) {
		if (res.errors) {
			this.emit('CASH_COLLECTED_ERROR', res);
		} else {
			this.emit('CASH_COLLECTED', res);
		}
	},

	restartBill: function(ticketId) {
		let bill = this._order;

		// check for an order inside the group if in multi bill flow
		if (this.isProcessingTicketGroup()) {
			let orders = this.getGroupedOrders();
			orders.forEach(function(order) {
				if (order.pos_ticket && order.pos_ticket.ticket_id === ticketId) {
					bill = order;
				}
			});
		} 
		this.config.apiStub.restartBill(bill.order_id);
	},

	onBillRestarted: function (res) {
		this.reset();
		
		
		if (res.errors) {
			this.emit('BILL_STARTED_ERROR', res);
			return;
		}

		//lets set the values that would otherwise be set by us in a normal bill start
		this._numberOfCovers = parseInt(res.order.pos_ticket.covers); 
		this._table = parseInt(res.order.pos_ticket.table);


		//now set the things we normaly set when we got an response on bill start
		this._order = res.order;

		if (this.isProcessingTicketGroup()) {
			this._updateGroupedOrders(res.order);
		}

		this.emit('BILL_STARTED', res);
	},

	hasNoPayments: function() {
		return this.getCashToPay() === 0 && this.getCardToPay() === 0;
	},

	/**
	 * Saves stringified bill values to localStorage
	 */
	exportState: function() {
		//check toJSON method   see: https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior  
		localStorage.billState = JSON.stringify(this);
	},

	getStoredOrder: function() {
		var billState = null;
		var order = null;
		try {
			billState = JSON.parse(localStorage.billState);
			order = billState._order;
			return order;
		} catch(e) {
			return null;
		}		
	},

	/**
	 * Restores the state saved in localStorage
	 * @return {Boolean} - true if import was successful, false otherwise
	 */
	importState: function() {

		if (!localStorage.billState) {
			return false;
		}

		try {
			var state = JSON.parse(localStorage.billState);
			Object.keys(this.toJSON()).forEach(function(orderKey) {
				if (state[orderKey] !== undefined) {
					this[orderKey] = state[orderKey];
				}
			}.bind(this));
		} catch(e) {
			return false;
		}

		this._currentOrderAvailable = false;

		return true;
	},

	clearState: function() {
		this._currentOrderAvailable = false;
		delete localStorage.billState;
	},

	/**
	 * We want to get a trimmed version of the billstore on JSON.stringify so we have more control over what will be saved as string
	 * @return {Object} a representation of what will be saved of this object
	 */
	toJSON: function() {
		return {
			_order: this._order, 
			_customer: this._customer,
			_mailForReceipt: this._mailForReceipt,
			_receiptMailSent: this._receiptMailSent, 
			_rewardValues: this._rewardValues,
			_table: this._table,
			_numberOfCovers: this._numberOfCovers,
			_rewardApplied: this._rewardApplied, 
			_appliedCoupon: this._appliedCoupon,
			_payment_id: this._payment_id,
			_franchisor: this._franchisor,
			_splits: this._splits,

			_numberOfBills: this._numberOfBills, 
			_currentBill: this._currentBill,
			_splitsPayed: this._splitsPayed,
			_payedSubtotal: this._payedSubtotal,
			_payedGratuity: this._payedGratuity,
			_payedWithRewards: this._payedWithRewards,
			_payedWithOffers: this._payedWithOffers,

			_cashToPay: this._cashToPay, 
			_collectedCash: this._collectedCash,
			_cardToPay: this._cardToPay,
			_posTicket: this._posTicket,

			_gratuity: this._gratuity,
			_gratuityRate: this._gratuityRate,

			_processingTicketGroup: this._processingTicketGroup, 
			_currentGroupOrderIndex: this._currentGroupOrderIndex, 
			_groupedOrders: this._groupedOrders,
			_groupCashToPay: this._groupCashToPay
		};
	}

}, EventEmitter.prototype);

module.exports = BillStore;
